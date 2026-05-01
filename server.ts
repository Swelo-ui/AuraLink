import express from 'express';
import * as dotenv from 'dotenv';
dotenv.config();
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'peersync-secret-key';

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

  app.use(express.json());
  app.use('/uploads', express.static(uploadDir));

  // --- API Routes ---
  
  app.get('/api/env-check', (req, res) => {
    res.json({ keySet: !!process.env.GEMINI_API_KEY, length: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0 });
  });

  // Auth
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
      
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

      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username } });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username } });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  const authMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
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

        // Handle AI Bot Response Request
        if (data.receiverId === auraBotId && data.type === 'text') {
           socket.emit('partner_status', { userId: auraBotId, state: 'reading_chat' });
           
           setTimeout(() => {
             socket.emit('partner_status', { userId: auraBotId, state: 'typing' });
             socket.emit('request_bot_generation', { content: data.content });
           }, 1000);
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
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT} (0.0.0.0)`);
  });
}

startServer();
