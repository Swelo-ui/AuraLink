import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../components/SocketProvider';
import { useAuthStore } from '../store/authStore';
import { Send, FileText, Paperclip, Calendar, X } from 'lucide-react';
import clsx from 'clsx';
import SyncNotes from '../components/SyncNotes';
import SmartVault from '../components/SmartVault';
import SharedTimetable from '../components/SharedTimetable';
import { motion, AnimatePresence } from 'motion/react';
import ActionMojiAvatar from '../components/ActionMojiAvatar';
import { GoogleGenAI } from '@google/genai';

export default function ChatWorkspace({ connections }: { connections: any[] }) {
  const { id: connectionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket, partnerStatus, setPartnerStatus } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const messagesRef = useRef(messages);
  const [input, setInput] = useState('');
  const [toolTab, setToolTab] = useState<'notes' | 'vault' | 'timetable' | 'none'>('notes');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const conn = connections.find(c => c.id === connectionId);
  const partner = conn ? (conn.user1Id === user?.id ? conn.user2 : conn.user1) : null;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!connectionId) return;
    const fetchMessages = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/messages/${connectionId}`, { headers: { 'Authorization': `Bearer ${token}` }});
      if(res.ok) setMessages(await res.json());
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };
    fetchMessages();
  }, [connectionId]);

  useEffect(() => {
    if (!socket || !partner) return;
    
    // Join room for this connection
    socket.emit('join_rooms', [partner.id]);

    const handleNewMessage = (msg: any) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handleBotGeneration = async (data: { content: string }) => {
      try {
        const history = messagesRef.current
          .filter(m => m.type === 'text')
          .slice(-15)
          .map(m => ({
            role: m.senderId === user?.id ? "user" : "assistant",
            content: m.content || ""
          }));

        const messagesPayload = [
          { role: "system", content: "You are AuraBot, a friendly AI collaborator on the AuraLink app for students. Keep it short and cute like a nanobanana theme." },
          ...history
        ];

        const models = [
          "tencent/hy3-preview:free",
          "minimax/minimax-m2.5:free",
          "nvidia/nemotron-3-nano-30b-a3b:free",
          "liquid/lfm-2.5-1.2b-thinking:free"
        ];

        const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || (window as any).process?.env?.OPENROUTER_API_KEY || "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";
        
        setPartnerStatus(partner.id, "thinking");
        const fetchPromises = models.map(async (model) => {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": window.location.origin, // Site URL
              "X-Title": "AuraLink" // Site Name
            },
            body: JSON.stringify({
              model,
              messages: messagesPayload
            })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          if (json.error) throw new Error(json.error.message || "API Error");
          const text = json.choices?.[0]?.message?.content;
          if (!text) throw new Error("Empty response");
          return text;
        });

        let textResponse;
        
        try {
          textResponse = await Promise.any(fetchPromises);
        } catch (openRouterErr) {
          console.warn("OpenRouter fetch failed (possibly due to API key error). Falling back to Google Gemini...", openRouterErr);
          
          try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const historyText = messagesRef.current
              .filter(m => m.type === 'text')
              .slice(-15)
              .map(m => `${m.senderId === user?.id ? "User" : "AuraBot"}: ${m.content}`)
              .join('\n');
            
            const response = await ai.models.generateContent({
               model: 'gemini-2.5-flash',
               contents: `System: You are AuraBot, a friendly AI collaborator on the AuraLink app for students. Keep it short and cute like a nanobanana theme.\n\nRecent chat history:\n${historyText || "(no history)"}\n\nPlease respond to the User's latest message.`
            });
            textResponse = response.text;
          } catch (geminiErr) {
            console.error("Gemini Fallback Error", geminiErr);
          }
        }
        
        if (textResponse) {
           socket.emit('save_bot_message', { content: textResponse });
           
           // Parse emotion from text
           let nextState = 'happy';
           const t = textResponse.toLowerCase();
           if (t.includes('sad') || t.includes('sorry')) nextState = 'sad';
           else if (t.includes('angry') || t.includes('mad')) nextState = 'angry';
           else if (t.includes('confus') || t.includes('what')) nextState = 'confused';
           else if (t.includes('wow') || t.includes('surpris')) nextState = 'surprised';
           else if (t.includes('party') || t.includes('yay') || t.includes('congrat')) nextState = 'partying';
           else if (t.includes('mind') || t.includes('blown')) nextState = 'mind_blown';
           else if (t.includes('love') || t.includes('heart')) nextState = 'heart_eyes';
           else if (t.includes('star') || t.includes('amazing')) nextState = 'starry_eyes';
           else if (t.includes('cool') || t.includes('awesome')) nextState = 'cool';
           else if (t.includes('cry') || t.includes('tear')) nextState = 'crying';
           else if (t.includes('cold') || t.includes('freez')) nextState = 'freezing';
           else if (t.includes('hot') || t.includes('sweat')) nextState = 'hot';
           else if (t.includes('run') || t.includes('fast')) nextState = 'running';
           else if (t.includes('gym') || t.includes('workout') || t.includes('lift')) nextState = 'gym';
           else if (t.includes('music') || t.includes('song')) nextState = 'listening_music';
           else if (t.includes('game') || t.includes('play')) nextState = 'playing_games';
           else if (t.includes('read') || t.includes('book')) nextState = 'reading_book';
           else if (t.includes('code') || t.includes('programm')) nextState = 'writing_code';
           else if (t.includes('coffee') || t.includes('drink')) nextState = 'coffee_break';
           else if (t.includes('magic') || t.includes('spell')) nextState = 'magic';
           else if (t.includes('ghost') || t.includes('boo')) nextState = 'ghost';
           else if (t.includes('ninja') || t.includes('stealth')) nextState = 'ninja';
           else if (t.includes('alien') || t.includes('space')) nextState = 'alien';
           else if (t.includes('robot') || t.includes('bot')) nextState = 'robot';
           else if (t.includes('detective') || t.includes('investigat')) nextState = 'detective';
           else if (t.includes('hero') || t.includes('super')) nextState = 'superhero';
           
           setPartnerStatus(partner.id, nextState);
        } else {
           socket.emit('save_bot_message', { content: "I'm having some trouble connecting to my AI core right now!" });
           setPartnerStatus(partner.id, "sad");
        }
      } catch (err) {
        console.error("AI Gen Error", err);
        socket.emit('save_bot_message', { content: "I'm having some trouble connecting to my AI core right now!" });
        setPartnerStatus(partner.id, "sad");
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleNewMessage);
    socket.on('request_bot_generation', handleBotGeneration);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_sent', handleNewMessage);
      socket.off('request_bot_generation', handleBotGeneration);
    };
  }, [socket, connectionId, partner?.id, partner?.username, user?.id]);

  // Status tracking
  useEffect(() => {
    if (!socket || !partner) return;

    let timeout: NodeJS.Timeout;
    const updateStatus = (state: string) => {
      socket.emit('set_status', { targetUserId: partner.id, state });
    };

    const handleInteraction = () => {
      clearTimeout(timeout);
      let state = 'online';
      if (input.trim().length > 0) state = 'typing';
      else if (toolTab === 'notes') state = 'viewing_notes';
      else if (toolTab === 'vault') state = 'browsing_files';
      else if (toolTab === 'timetable') state = 'timetable_open';
      else state = 'reading_chat';

      updateStatus(state);
      
      // Bot mimics interaction state dynamically
      if (partner.username === 'AuraBot') {
        let botState = state;
        if (state === 'typing') botState = 'reading_chat';
        else if (state === 'reading_chat' && messagesRef.current.length > 0) botState = 'idle';
        setPartnerStatus(partner.id, botState);
      }

      timeout = setTimeout(() => {
        updateStatus('idle');
        if (partner.username === 'AuraBot') {
          setPartnerStatus(partner.id, 'idle');
        }
      }, 60000); // idle after 1 min
    };

    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    handleInteraction();

    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      clearTimeout(timeout);
    };
  }, [socket, partner?.id, partner?.username, input, toolTab, setPartnerStatus]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket || !partner) return;
    socket.emit('send_message', { receiverId: partner.id, content: input, type: 'text' });
    setInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !partner || !socket) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if(data.url) {
        socket.emit('send_message', { 
          receiverId: partner.id, 
          content: data.name, 
          type: 'file',
          fileUrl: data.url 
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!partner) return null;

  const currentPartnerStatus = partnerStatus[partner.id] || 'offline';

  return (
    <div className="flex w-full h-full bg-aura-navy relative overflow-hidden">
      {/* Chat Area */}
      <div className={clsx("flex flex-col h-full transition-all duration-300 relative", 
        toolTab === 'none' ? "w-full lg:w-3/4 mx-auto border-r border-aura-border" : "hidden md:flex md:w-1/2 border-r border-aura-border")}>
        
        {/* Floating ActionMoji Panel */}
        <div className="absolute top-4 right-4 z-20 pointer-events-none drop-shadow-xl">
           <ActionMojiAvatar state={currentPartnerStatus} username={partner.username} />
        </div>

        {/* Header */}
        <div className="h-16 flex items-center justify-between px-2 sm:px-6 border-b border-aura-border bg-aura-panel shadow-sm z-10 shrink-0 pr-20 sm:pr-28">
          <div className="flex items-center gap-2 sm:gap-3">
             <button onClick={() => navigate('/dashboard')} className="md:hidden p-2 text-aura-lavender/50 hover:text-white transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
             </button>
             <div className="relative">
                <div className={clsx("w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-medium text-sm sm:text-base", partner?.username === 'AuraBot' ? "bg-gradient-to-br from-pink-500 to-aura-primary" : "bg-aura-border")}>
                  {partner.username[0].toUpperCase()}
                </div>
                {/* Online indicator */}
                {currentPartnerStatus !== 'offline' && <span className="absolute bottom-0 right-0 block w-2.5 h-2.5 bg-aura-teal rounded-full border-2 border-aura-panel"></span>}
             </div>
             <div className="truncate max-w-[100px] sm:max-w-[200px]">
               <h3 className="text-white font-medium flex items-center gap-2 text-sm sm:text-base truncate">
                 <span className="truncate">{partner.username}</span>
                 {partner?.username === 'AuraBot' && <span className="hidden sm:inline-block text-[10px] bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">AI Companion</span>}
               </h3>
               <p className="text-xs text-aura-lavender/50 capitalize truncate">
                  {currentPartnerStatus.replace('_', ' ')}
               </p>
             </div>
          </div>
          
          {/* Tool Toggles */}
          <div className="flex items-center gap-1 sm:gap-2 bg-aura-navy p-1 flex-wrap rounded-lg border border-aura-border mr-2">
            <button onClick={() => setToolTab(toolTab === 'notes' ? 'none' : 'notes')} className={clsx("p-1.5 sm:p-2 rounded-md transition-colors", toolTab === 'notes' ? "bg-aura-primary text-white" : "text-aura-lavender/50 hover:text-white")} title="SyncNotes">
              <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
            <button onClick={() => setToolTab(toolTab === 'vault' ? 'none' : 'vault')} className={clsx("p-1.5 sm:p-2 rounded-md transition-colors", toolTab === 'vault' ? "bg-aura-primary text-white" : "text-aura-lavender/50 hover:text-white")} title="SmartVault">
              <Paperclip size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
            <button onClick={() => setToolTab(toolTab === 'timetable' ? 'none' : 'timetable')} className={clsx("p-1.5 sm:p-2 rounded-md transition-colors", toolTab === 'timetable' ? "bg-aura-pink text-white" : "text-aura-lavender/50 hover:text-white")} title="Shared Timetable">
              <Calendar size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-aura-navy pt-24" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(30, 30, 50, 0.4) 0%, transparent 100%)' }}>
          {messages.map((m, i) => {
            const isMe = m.senderId === user?.id;
            return (
              <div key={i} className={clsx("flex flex-col max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                <div className={clsx("px-4 py-2 rounded-2xl", isMe ? "bg-aura-primary text-white rounded-br-none" : "bg-aura-panel text-white rounded-bl-none border border-aura-border")}>
                  {m.type === 'text' && <p className="text-[15px]">{m.content}</p>}
                  {m.type === 'file' && (
                    <a href={m.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline">
                      <Paperclip size={16} /> <span>{m.content}</span>
                    </a>
                  )}
                </div>
                <span className="text-[11px] text-aura-lavender/40 mt-1">{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            )
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-aura-panel border-t border-aura-border shrink-0">
          <form onSubmit={sendMessage} className="flex items-center gap-2 relative">
            <label className="p-2 text-aura-lavender/50 hover:text-white cursor-pointer transition-colors bg-aura-navy rounded-lg hover:bg-aura-border">
              <Paperclip size={20} />
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
            <input 
              type="text" 
              placeholder="Message..." 
              value={input}
              onChange={e => setInput(e.target.value)}
              className="flex-1 bg-aura-navy border border-aura-border rounded-lg pl-4 pr-16 py-3 text-white focus:outline-none focus:border-aura-primary transition-colors shadow-inner"
            />
            <button type="submit" disabled={!input.trim()} className="absolute right-2 top-1.5 p-2 bg-aura-primary text-white rounded-md disabled:opacity-50 disabled:bg-aura-border disabled:cursor-not-allowed hover:bg-aura-primary-hover transition-colors">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* Tools Area / Split View */}
      {toolTab !== 'none' && (
        <div className="w-full md:w-1/2 flex flex-col h-full bg-aura-panel border-l border-aura-border absolute md:relative z-30 md:z-auto inset-0 md:inset-auto">
          <div className="h-16 flex items-center justify-between px-6 border-b border-aura-border shrink-0 bg-aura-panel shadow-sm">
            <h2 className="text-white font-medium flex items-center gap-2">
              {toolTab === 'notes' && <><FileText size={18} className="text-aura-primary" /> SyncNotes</>}
              {toolTab === 'vault' && <><Paperclip size={18} className="text-aura-primary" /> SmartVault</>}
              {toolTab === 'timetable' && <><Calendar size={18} className="text-aura-pink" /> Shared Timetable</>}
            </h2>
            <button onClick={() => setToolTab('none')} className="p-2 -mr-2 text-aura-lavender/50 hover:text-white transition-colors bg-aura-navy hover:bg-aura-border rounded-lg">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden relative">
            {toolTab === 'notes' && connectionId && <SyncNotes connectionId={connectionId} partner={partner} />}
            {toolTab === 'vault' && connectionId && <SmartVault connectionId={connectionId} messages={messages} />}
            {toolTab === 'timetable' && connectionId && <SharedTimetable connectionId={connectionId} partner={partner} />}
          </div>
        </div>
      )}
    </div>
  );
}
