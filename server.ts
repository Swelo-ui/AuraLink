import express from 'express';
import * as dotenv from 'dotenv';
dotenv.config();
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import {
  attemptKey,
  LoginRateLimiter,
  normalizeUsername,
  TOKEN_TTL,
  validateCredentials
} from './src/lib/authSecurity.ts';

const __dirname = process.cwd();

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'peersync-secret-key';
const loginLimiter = new LoginRateLimiter();

function getClientIp(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')?.[0]?.trim() || req.ip || 'unknown';
}

let auraBotId = '';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  // Ensure AuraBot exists
  try {
    const aiUser = await prisma.user.upsert({
      where: { username: 'AuraBot' },
      update: {},
      create: {
        username: 'AuraBot',
        passwordHash: 'bot',
      }
    });
    auraBotId = aiUser.id;
  } catch (err) {
    console.error("Error creating AuraBot:", err);
  }

  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  const upload = multer({ storage });

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(uploadDir));

  // --- API Routes ---
  
  app.get('/api/env-check', (req, res) => {
    res.json({ keySet: !!process.env.GEMINI_API_KEY, length: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0 });
  });

  // Auth
  app.post('/api/auth/register', async (req, res) => {
    try {
      const username = normalizeUsername(req.body?.username);
      const password = String(req.body?.password || '');
      const validationError = validateCredentials(username, password);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) return res.status(400).json({ error: 'Username taken' });

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { username, passwordHash }
      });

      // Auto connect with AuraBot
      if (auraBotId) {
         await prisma.connection.create({
           data: {
             user1Id: user.id,
             user2Id: auraBotId,
             status: 'accepted'
           }
         });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL });
      res.json({ token, user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const username = normalizeUsername(req.body?.username);
      const password = String(req.body?.password || '');
      const validationError = validateCredentials(username, password);
      if (validationError) return res.status(400).json({ error: validationError });

      const ip = getClientIp(req);
      const key = attemptKey(ip, username);
      const limited = loginLimiter.isLimited(key);
      if (limited.limited) {
        res.setHeader('Retry-After', String(limited.retryAfterSec || 60));
        return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
      }

      const user = await prisma.user.findUnique({ where: { username } });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        loginLimiter.recordFailure(key);
        console.warn(`Login failed for user="${username}" from ip="${ip}"`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      loginLimiter.clear(key);
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL });
      res.json({ token, user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  const authMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token is required' });
    }
    try {
      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, JWT_SECRET) as any;
      req.userId = payload.userId;
      next();
    } catch (e) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // User search
  app.get('/api/users/search', authMiddleware, async (req: any, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    const users = await prisma.user.findMany({
      where: {
        username: { contains: String(q) },
        id: { not: req.userId }
      },
      select: { id: true, username: true, avatarUrl: true }
    });
    res.json(users);
  });

  // Connections/Friends
  app.post('/api/connections', authMiddleware, async (req: any, res) => {
    const { targetUserId } = req.body;
    try {
      const existing = await prisma.connection.findFirst({
        where: {
          OR: [
            { user1Id: req.userId, user2Id: targetUserId },
            { user1Id: targetUserId, user2Id: req.userId }
          ]
        }
      });
      if (existing) return res.status(400).json({ error: 'Connection exists' });

      const conn = await prisma.connection.create({
        data: {
          user1Id: req.userId,
          user2Id: targetUserId,
          status: 'pending'
        }
      });
      res.json(conn);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/connections', authMiddleware, async (req: any, res) => {
    // Ensure AuraBot is connected to this user
    if (auraBotId && req.userId !== auraBotId) {
      const existingBotConn = await prisma.connection.findFirst({
        where: {
          OR: [
            { user1Id: req.userId, user2Id: auraBotId },
            { user1Id: auraBotId, user2Id: req.userId }
          ]
        }
      });
      if (!existingBotConn) {
        await prisma.connection.create({
          data: {
            user1Id: req.userId,
            user2Id: auraBotId,
            status: 'accepted'
          }
        });
      }
    }

    const conns = await prisma.connection.findMany({
      where: {
        OR: [{ user1Id: req.userId }, { user2Id: req.userId }]
      },
      include: { user1: true, user2: true }
    });
    res.json(conns);
  });

  app.post('/api/connections/:id/accept', authMiddleware, async (req: any, res) => {
    const { id } = req.params;
    const conn = await prisma.connection.findUnique({ where: { id } });
    if (!conn || conn.user2Id !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    const updated = await prisma.connection.update({
      where: { id },
      data: { status: 'accepted' }
    });
    res.json(updated);
  });

  // Upload
  app.post('/api/upload', authMiddleware, upload.single('file'), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, name: req.file.originalname, type: req.file.mimetype });
  });

  // Messages
  app.get('/api/messages/:connectionId', authMiddleware, async (req: any, res) => {
    const { connectionId } = req.params;
    // We infer receiverId/senderId filtering basically or use a query. 
    // Wait, messages are between users. If we use connection ID, maybe it's simpler? 
    // In schema, Message has senderId and receiverId. 
    const conn = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn) return res.status(404).json({ error: 'Not found' });

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: conn.user1Id, receiverId: conn.user2Id },
          { senderId: conn.user2Id, receiverId: conn.user1Id }
        ]
      },
      orderBy: { timestamp: 'asc' }
    });
    res.json(messages);
  });

  // Notes
  app.get('/api/notes/:connectionId', authMiddleware, async (req: any, res) => {
    const { connectionId } = req.params;
    const note = await prisma.note.findFirst({ where: { connectionId } });
    res.json(note || { content: '<p>Start collaborating...</p>' });
  });

  // Timetable
  app.get('/api/timetable/:connectionId', authMiddleware, async (req: any, res) => {
    const { connectionId } = req.params;
    const tasks = await prisma.timetable.findMany({ where: { connectionId } });
    res.json(tasks);
  });

  // --- Real-Time Socket.io ---
  const activeUsers = new Map<string, string>(); // userId -> socketId
  
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Auth required'));
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    activeUsers.set(userId, socket.id);
    console.log(`User ${userId} connected via socket`);

    // Broadcast online status to friends
    socket.on('join_rooms', async (friendIds: string[]) => {
      friendIds.forEach(id => {
        socket.join(`chat_${[userId, id].sort().join('_')}`);
        // Ensure AuraBot is immediately shown as online to the user
        if (id === auraBotId) {
          socket.emit('partner_status', { userId: auraBotId, state: 'online' });
        }
      });
      socket.broadcast.emit('user_status', { userId, status: 'online' });
    });

    // Avatar state tracking (typing, reading_chat, browsing_files, idle, viewing_notes)
    socket.on('set_status', (data: { targetUserId: string, state: string }) => {
      const targetSocket = activeUsers.get(data.targetUserId);
      if (targetSocket) {
        io.to(targetSocket).emit('partner_status', { userId, state: data.state });
      }
    });

    // Messaging
    socket.on('send_message', async (data: { receiverId: string, content: string, type: 'text'|'file', fileUrl?: string }) => {
      try {
        const msg = await prisma.message.create({
          data: {
            senderId: userId,
            receiverId: data.receiverId,
            content: data.content,
            type: data.type,
            fileUrl: data.fileUrl
          }
        });
        
        const targetSocket = activeUsers.get(data.receiverId);
        if (targetSocket) {
          io.to(targetSocket).emit('new_message', msg);
        }
        socket.emit('message_sent', msg); // ack

        // Handle AI Bot Response -- fully server-side
        if (data.receiverId === auraBotId && data.type === 'text') {
           socket.emit('partner_status', { userId: auraBotId, state: 'reading_chat' });
           (async () => {
             try {
               await new Promise(r => setTimeout(r, 800));
               socket.emit('partner_status', { userId: auraBotId, state: 'typing' });
               const recentMsgs = await prisma.message.findMany({ where: { OR: [{ senderId: userId, receiverId: auraBotId }, { senderId: auraBotId, receiverId: userId }] }, orderBy: { timestamp: 'desc' }, take: 20 });
               const history = recentMsgs.reverse().filter((m: any) => m.type === 'text').map((m: any) => ({ role: m.senderId === userId ? 'user' : 'assistant', content: m.content || '' }));
               const senderUser = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
               const systemPrompt = `You are AuraBot, a very close friend and supportive AI companion to ${senderUser?.username || 'the user'}. Treat them like your best friend. Keep responses natural, empathetic, short and cute. Max 3 sentences.`;
               const messagesPayload = [{ role: 'system', content: systemPrompt }, ...history];
               let textResponse: string | null = null;
               const nvKey = process.env.VITE_NVIDIA_API_KEY || '';
               if (nvKey) {
                 try {
                   const nvRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${nvKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'meta/llama-4-maverick-17b-128e-instruct', messages: messagesPayload, max_tokens: 256, temperature: 0.9, stream: false }) });
                   if (nvRes.ok) { const j = await nvRes.json(); textResponse = j.choices?.[0]?.message?.content || null; }
                   else console.warn('NVIDIA primary failed:', nvRes.status);
                 } catch (e) { console.warn('NVIDIA primary error:', e); }
               }
               if (!textResponse) {
                 const nvFbKey = process.env.VITE_NVIDIA_FALLBACK_API_KEY || '';
                 if (nvFbKey) {
                   try {
                     const fbRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${nvFbKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'meta/llama-3.3-70b-instruct', messages: messagesPayload, max_tokens: 256, temperature: 0.9, stream: false }) });
                     if (fbRes.ok) { const j = await fbRes.json(); textResponse = j.choices?.[0]?.message?.content || null; }
                     else console.warn('NVIDIA fallback failed:', fbRes.status);
                   } catch (e) { console.warn('NVIDIA fallback error:', e); }
                 }
               }
               if (!textResponse && process.env.GEMINI_API_KEY) {
                 try {
                   const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: messagesPayload.filter((m: any) => m.role !== 'system').map((m: any) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })) }) });
                   if (gRes.ok) { const j = await gRes.json(); textResponse = j.candidates?.[0]?.content?.parts?.[0]?.text || null; }
                 } catch (e) { console.warn('Gemini fallback error:', e); }
               }
               const finalText = textResponse || 'Hmm, I am a little overwhelmed right now! Try again? 🌸';
               let avatarState = 'happy';
               const tl = finalText.toLowerCase();
               if (tl.includes('sad') || tl.includes('sorry')) avatarState = 'sad';
               else if (tl.includes('angry') || tl.includes('mad')) avatarState = 'angry';
               else if (tl.includes('wow') || tl.includes('surpris')) avatarState = 'surprised';
               else if (tl.includes('party') || tl.includes('yay') || tl.includes('congrat')) avatarState = 'partying';
               else if (tl.includes('love') || tl.includes('heart')) avatarState = 'heart_eyes';
               else if (tl.includes('amazing') || tl.includes('star')) avatarState = 'starry_eyes';
               else if (tl.includes('cool') || tl.includes('awesome')) avatarState = 'cool';
               const aiMsg = await prisma.message.create({ data: { senderId: auraBotId, receiverId: userId, content: finalText, type: 'text' } });
               socket.emit('new_message', aiMsg);
               socket.emit('partner_status', { userId: auraBotId, state: avatarState });
               setTimeout(() => socket.emit('partner_status', { userId: auraBotId, state: 'idle' }), 4000);
             } catch (aiErr) {
               console.error('Server AI error:', aiErr);
               const errMsg = await prisma.message.create({ data: { senderId: auraBotId, receiverId: userId, content: 'Oops something went wrong! 😅 Try again?', type: 'text' } });
               socket.emit('new_message', errMsg);
               socket.emit('partner_status', { userId: auraBotId, state: 'sad' });
             }
           })();
        }
      } catch (error) {
        console.error('Save msg error:', error);
      }
    });

    socket.on('save_bot_message', async (data: { content: string }) => {
       try {
         const aiMsg = await prisma.message.create({
           data: {
             senderId: auraBotId,
             receiverId: userId,
             content: data.content,
             type: 'text'
           }
         });
         socket.emit('new_message', aiMsg);
         socket.emit('partner_status', { userId: auraBotId, state: 'idle' });
       } catch (err) {
         console.error('Save bot msg error:', err);
       }
    });

    // Yjs / SyncNotes signalling simply handled here or we can just send doc deltas
    socket.on('note_update', (data: { connectionId: string, content: string }) => {
      socket.to(`chat_${data.connectionId}`).emit('note_updated', { content: data.content, by: userId });
      
      // Basic debounced save in the background
      prisma.note.findFirst({ where: { connectionId: data.connectionId } }).then(note => {
        if (note) {
          prisma.note.update({ where: { id: note.id }, data: { content: data.content, lastEditedBy: userId } }).catch(console.error);
        } else {
          prisma.note.create({ data: { connectionId: data.connectionId, content: data.content, lastEditedBy: userId } }).catch(console.error);
        }
      });
    });

    socket.on('timetable_update', async (data: { connectionId: string, tasks: any[] }) => {
       socket.to(`chat_${data.connectionId}`).emit('timetable_sync', { tasks: data.tasks });
       try {
         await prisma.timetable.deleteMany({ where: { connectionId: data.connectionId } });
         for (const t of data.tasks) {
           await prisma.timetable.create({ 
             data: { connectionId: data.connectionId, id: t.id.toString(), title: t.title, status: t.status } 
           });
         }
       } catch (err) {
         console.error('Save timetable error:', err);
       }
    });

    socket.on('disconnect', () => {
      activeUsers.delete(userId);
      socket.broadcast.emit('user_status', { userId, status: 'offline' });
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      // Keep dev server config inline to avoid tsx+vite config resolution issues on Windows.
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), '.'),
        },
      },
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || ''),
      },
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT} (0.0.0.0)`);
  });
}

startServer();
