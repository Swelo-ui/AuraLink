import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../components/SocketProvider';
import { useAuthStore } from '../store/authStore';
import { Send, FileText, Paperclip, Calendar, X, Mic, MicOff, Settings as SettingsIcon, Volume2, VolumeX, EyeOff, Clock, Sparkles, Plus } from 'lucide-react';
import clsx from 'clsx';
import SyncNotes from '../components/SyncNotes';
import SmartVault, { FileIcon, getFileType } from '../components/SmartVault';
import SharedTimetable from '../components/SharedTimetable';
import { motion, AnimatePresence } from 'motion/react';
import ActionMojiAvatar from '../components/ActionMojiAvatar';
import { supabase } from '../lib/supabaseClient';
import { getAuraBotResponse } from '../lib/aurabot';
import { playPopSound, playReceiveSound } from '../lib/audio';
import { tgUploadFile, tgGetFileUrl } from '../lib/telegram';

export interface Message {
  id?: string;
  sender_id?: string;
  senderId?: string;
  receiver_id?: string;
  receiverId?: string;
  content: string;
  created_at?: string;
  createdAt?: string;
  isVirtual?: boolean;
  type?: string;
  fileUrl?: string | null;
  timestamp?: string | number;
}

const STATUS_LABELS: Record<string, string> = {
  offline: '⚫ Offline',
  idle: '💤 Idle',
  online: '🟢 Online',
  typing: '✏️ Typing...',
  reading_chat: '👀 Reading chat',
  browsing_files: '📂 Browsing files',
  viewing_notes: '📝 Viewing notes',
  timetable_open: '📅 Checking timetable',
  thinking: '💭 Thinking...',
  happy: '😄 Happy',
  sad: '😢 Sad',
  angry: '😡 Angry',
  confused: '😕 Confused',
  surprised: '😲 Surprised',
  partying: '🎉 Partying!',
  heart_eyes: '🥰 Loving it',
  starry_eyes: '🤩 Amazed',
  cool: '😎 Cool',
  crying: '😭 Crying',
  magic: '✨ Feeling magical',
  searching: '🔍 Searching...',
  writing_code: '💻 Writing code',
  uploading: '⬆️ Uploading...',
  reading_book: '📖 Reading',
  celebrating: '🎊 Celebrating!',
  playing_games: '🎮 Playing games',
  listening_music: '🎵 Listening to music',
  sleepy: '😴 Sleepy',
};

function getStatusLabel(status: string) {
  if (status.startsWith('typing_')) return '✏️ Typing...';
  return STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

const SENTIMENT_MAP: { states: string[]; keywords: string[] }[] = [
  { states: ['searching'], keywords: ['search', 'find', 'looking', 'dhund', 'dhundh', 'kahan', 'kidhar', 'talash', 'khoj', 'mil nahi', 'pata karo', 'dhundo', 'check'] },
  { states: ['writing_code'], keywords: ['code', 'debug', 'error', 'bug', 'coding', 'script', 'logic', 'fix', 'build', 'program', 'run kar', 'chalao', 'developer', 'hacker', 'vscode', 'terminal', 'cmd'] },
  { states: ['uploading'], keywords: ['upload', 'send file', 'attachment', 'bhej', 'bheja', 'lelo', 'document', 'share', 'daal raha', 'receive', 'photo', 'video', 'file bhej', 'pdf', 'image'] },
  { states: ['reading_book'], keywords: ['read', 'study', 'learn', 'book', 'padhai', 'padh', 'seekh', 'notes', 'exam', 'revision', 'kitaab', 'paper', 'homework', 'padhlo', 'shlok', 'gyaan'] },
  { states: ['celebrating'], keywords: ['congratulations', 'yay', 'party', 'mubarak', 'badhai', 'kamaal', 'badiya', 'jeeta', 'op', 'gg', 'booyah', 'shabaash', 'party do', 'daaru', 'masti', 'shava', 'chakde'] },
  { states: ['playing_games'], keywords: ['play', 'game', 'khel', 'pubg', 'bgmi', 'valorant', 'minecraft', 'match', 'lobby', 'push kar', 'kill', 'winner', 'chicken dinner', 'game khel', 'pc'] },
  { states: ['listening_music'], keywords: ['music', 'song', 'listen', 'gaana', 'sun', 'spotify', 'playlist', 'vibe', 'beat', 'lyrics', 'singer', 'voice note', 'audio', 'earphone', 'headphone'] },
  { states: ['angry'], keywords: ['angry', 'hate', 'stupid', 'idiot', 'shut up', 'ugh', 'mad', 'gusa', 'gussa', 'bekar', 'galat', 'pagal', 'kutta', 'bakwas', 'dimag kharab', 'hatt', 'bak', 'chup', 'ghatiya', 'sharam', 'bewakoof', 'gadha', 'badtameez', 'haramkhor', 'bewajah'] },
  { states: ['sad'], keywords: ['sad', 'depressed', 'miss', 'lonely', 'hurt', 'cry', 'crying', 'sorry', 'regret', 'fail', 'bad', 'dukhi', 'rona', 'akela', 'bura', 'udas', 'pareshan', 'ro mat', 'tension', 'dard', 'kyu kiya', 'bechara', 'afsos', 'rondu'] },
  { states: ['confused'], keywords: ['confused', 'what', 'huh', 'idk', 'unclear', 'weird', 'strange', 'why', 'how', 'lost', 'really?', '??', 'kya', 'samajh nahi', 'kaise', 'kyu', 'pata nahi', 'kuch bhi', 'hein', 'matlab', 'ye kya', 'kya hai'] },
  { states: ['surprised'], keywords: ['wow', 'omg', 'whoa', 'no way', 'seriously', 'really', 'shocking', 'unexpected', 'wait what', 'sachme', 'are waah', 'kya baat', 'gazab', 'dhamaal', 'bhayanak', 'baap re', 'hey bhagwan', 'shakal', 'look at that'] },
  { states: ['happy'], keywords: ['happy', 'great', 'awesome', 'love', 'haha', 'lol', 'fun', 'nice', 'good', 'cool', 'yes!', 'yay', 'excited', 'amazing', 'perfect', 'thanks', 'thank you', 'khush', 'acha', 'mast', 'badiya', 'sahi', 'maza', 'wah', 'super', 'ji', 'hnji', 'shukriya', 'mubarak'] },
  { states: ['heart_eyes'], keywords: ['love you', 'adore', 'crush', 'beautiful', 'gorgeous', 'cute', 'sundar', 'pyar', 'khoobsurat', 'mast lag', 'jaan', 'shona', 'babu', 'pyaara', 'sweet', 'mohabat', 'ishq', 'dil', 'i love', 'ily'] },
  { states: ['sleepy'], keywords: ['sleep', 'good night', 'gn', 'so jao', 'so raha', 'bye', 'tata', 'shubh ratri', 'nini', 'neend', 'thak gaya', 'rest', 'dream', 'sapne', 'so gaya', 'goodnight', 'sd'] },
];

function deriveMoodFromString(text: string): string | null {
  if (!text) return null;
  const lowerText = text.toLowerCase();
  for (const { states, keywords } of SENTIMENT_MAP) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      return states[0];
    }
  }
  return null;
}

const SLASH_COMMANDS = [
  { cmd: '/rename-note', desc: 'Rename a note', icon: <FileText size={14} /> },
  { cmd: '/rename-file', desc: 'Rename vault file', icon: <Paperclip size={14} /> },
  { cmd: '/analyze-file', desc: 'Analyse a file/note', icon: <Sparkles size={14} /> },
];

function deriveAvatarMoodFromMessages(msgs: any[]): string | null {
  if (msgs.length === 0) return null;
  const lastMsg = msgs[msgs.length - 1];
  return deriveMoodFromString(lastMsg.content || '');
}

export default function ChatWorkspace({ connections }: { connections: any[] }) {
  const { id: connectionId } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket, partnerStatus, setPartnerStatus, channelReady } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const messagesRef = useRef(messages);
  const [input, setInput] = useState('');
  const [toolTab, setToolTab] = useState<'notes' | 'vault' | 'timetable' | 'none'>('none');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [sentimentState, setSentimentState] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [chatSettings, setChatSettings] = useState(() => {
    const saved = localStorage.getItem('aura_chat_settings');
    return saved ? JSON.parse(saved) : { vanishMode: false, sendSound: true, receiveSound: true };
  });

  const chatSettingsRef = useRef(chatSettings);
  useEffect(() => {
    chatSettingsRef.current = chatSettings;
    localStorage.setItem('aura_chat_settings', JSON.stringify(chatSettings));
  }, [chatSettings]);

  useEffect(() => {
    if (connectionId) {
      localStorage.setItem(`chat_settings_${connectionId}`, JSON.stringify(chatSettings));
    }
  }, [chatSettings, connectionId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          }
          if (finalTranscript) setInput(prev => prev + (prev ? ' ' : '') + finalTranscript.trim());
        };
        recognitionRef.current.onend = () => setIsListening(false);
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) { alert("Speech recognition not supported."); return; }
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { recognitionRef.current.start(); setIsListening(true); }
  };

  const conn = connections.find(c => c.id === connectionId);
  const partner = conn ? ((conn.user1Id ?? conn.user1_id) === user?.id ? conn.user2 : conn.user1) : null;
  const isVirtualBot = Boolean(conn?.isVirtual) && partner?.username === 'AuraBot';
  const virtualChatKey = user?.id ? `aurabot_chat_${user.id}` : null;

  useEffect(() => {
    return () => {
      if (chatSettingsRef.current.vanishMode && user?.id && partner?.id) {
        if (isVirtualBot && virtualChatKey) localStorage.removeItem(virtualChatKey);
        else supabase.from('messages').delete().eq('receiver_id', user.id).eq('sender_id', partner.id).then();
      }
    };
  }, [user?.id, partner?.id, isVirtualBot, virtualChatKey]);

  useEffect(() => {
    messagesRef.current = messages;
    if (user?.id) {
      const mood = deriveAvatarMoodFromMessages(messages);
      setSentimentState(mood);
    }
  }, [messages, user?.id]);

  useEffect(() => {
    if (!connectionId || !user?.id || !partner?.id || isVirtualBot) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${user.id})`)
        .order('timestamp', { ascending: true });
      if (data) {
        setMessages(data.map(m => ({ id: m.id, senderId: m.sender_id, receiverId: m.receiver_id, content: m.content, type: m.type, fileUrl: m.file_url, timestamp: m.timestamp, telegram_file_id: m.telegram_file_id, telegram_msg_id: m.telegram_msg_id })));
      }
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };
    fetchMessages();
  }, [connectionId, user?.id, partner?.id, isVirtualBot]);

  useEffect(() => {
    if (!connectionId || !user?.id || !partner?.id || isVirtualBot) return;
    const msgSub = supabase.channel(`messages:${connectionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as any;
        if ((m.sender_id === user.id && m.receiver_id === partner.id) || (m.sender_id === partner.id && m.receiver_id === user.id)) {
          setMessages(prev => {
            if (prev.some(p => p.id === m.id)) return prev;
            if (m.sender_id === partner.id && chatSettingsRef.current.receiveSound) playReceiveSound();
            return [...prev, { id: m.id, senderId: m.sender_id, receiverId: m.receiver_id, content: m.content, type: m.type, fileUrl: m.file_url, timestamp: m.timestamp, telegram_file_id: m.telegram_file_id, telegram_msg_id: m.telegram_msg_id }];
          });
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      }).subscribe();
    return () => { supabase.removeChannel(msgSub); };
  }, [connectionId, user?.id, partner?.id, isVirtualBot]);

  useEffect(() => {
    if (!isVirtualBot || !partner?.id) return;
    setPartnerStatus(partner.id, 'online');
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      if (virtualChatKey) {
        const saved = localStorage.getItem(virtualChatKey);
        if (saved) { try { const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length > 0) return parsed; } catch { } }
      }
      return [{ id: `bot-welcome-${Date.now()}`, senderId: partner.id, receiverId: user?.id, content: 'Hi! Main AuraBot hoon 🤖 Tum jo bhi build karna chaho, chalo saath karte hain.', type: 'text', fileUrl: null, timestamp: new Date().toISOString() }];
    });
  }, [isVirtualBot, partner?.id, setPartnerStatus, user?.id, virtualChatKey]);

  useEffect(() => {
    if (!isVirtualBot || !virtualChatKey) return;
    localStorage.setItem(virtualChatKey, JSON.stringify(messages));
  }, [messages, isVirtualBot, virtualChatKey]);

  useEffect(() => {
    if (!isVirtualBot || !partner?.id) return;
    const current = partnerStatus[partner.id] || 'online';
    const transientStates = new Set(['thinking', 'typing', 'happy', 'sad', 'angry', 'confused', 'surprised', 'heart_eyes', 'magic', 'cool', 'starry_eyes', 'partying', 'crying']);
    if (transientStates.has(current)) return;
    if (toolTab === 'vault') setPartnerStatus(partner.id, 'browsing_files');
    else if (toolTab === 'notes') setPartnerStatus(partner.id, 'viewing_notes');
    else if (toolTab === 'timetable') setPartnerStatus(partner.id, 'timetable_open');
    else if (input.trim().length === 0) setPartnerStatus(partner.id, 'online');
  }, [toolTab, isVirtualBot, partner?.id, setPartnerStatus, partnerStatus, input]);

  useEffect(() => {
    if (!socket || !partner) return;
    let timeout: NodeJS.Timeout;
    let lastTrackedState = '';
    const updateStatus = async (state: string) => {
      if (state === lastTrackedState) return;
      lastTrackedState = state;
      if (!socket || !channelReady) return;
      try { await socket.track({ status: state }); } catch (e) {
        setTimeout(async () => { try { if (socket && socket.state === 'joined') await socket.track({ status: state }); } catch { } }, 1000);
      }
    };
    let throttleTimer: any = null;
    const handleInteraction = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => { throttleTimer = null; }, 2000);
      clearTimeout(timeout);
      let state = 'online';
      if (input.trim().length > 0) { const inputMood = deriveMoodFromString(input); state = inputMood ? `typing_${inputMood}` : 'typing'; }
      else if (toolTab === 'notes') state = 'viewing_notes';
      else if (toolTab === 'vault') state = 'browsing_files';
      else if (toolTab === 'timetable') state = 'timetable_open';
      else state = 'reading_chat';
      updateStatus(state);
      timeout = setTimeout(() => { updateStatus('idle'); }, 60000);
    };
    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('scroll', handleInteraction);
    updateStatus('online');
    handleInteraction();
    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
      clearTimeout(timeout);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [socket, partner?.id, partner?.username, input, toolTab]);

  const handleBotResponse = async (userText: string, imageBase64?: string, fileUrl?: string) => {
    if (!user?.id || !partner) return;
    setPartnerStatus(partner.id, 'thinking');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    try {
      const history = messagesRef.current.slice(-15).map(m => ({ role: m.senderId === partner.id ? 'assistant' : 'user', content: m.content }));
      const llm = await getAuraBotResponse(user.id, partner.id, userText, imageBase64, fileUrl, history);
      setPartnerStatus(partner.id, `typing_${llm.mood}`);
      const delay = Math.min(2000, Math.max(800, llm.text.length * 15));
      await new Promise((resolve) => setTimeout(resolve, delay));
      const botMsg: Message = { id: `local-bot-${Date.now()}`, senderId: partner.id, receiverId: user.id, content: llm.text, type: 'text', fileUrl: null, timestamp: new Date().toISOString() };
      if (chatSettings.receiveSound) playReceiveSound();
      setMessages(prev => { const next = [...prev, botMsg]; messagesRef.current = next; return next; });
      setPartnerStatus(partner.id, llm.mood || 'happy');
      setTimeout(() => {
        const currentTab = toolTab;
        if (currentTab === 'vault') setPartnerStatus(partner.id, 'browsing_files');
        else if (currentTab === 'notes') setPartnerStatus(partner.id, 'viewing_notes');
        else if (currentTab === 'timetable') setPartnerStatus(partner.id, 'timetable_open');
        else setPartnerStatus(partner.id, 'online');
      }, 5000);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: `local-bot-error-${Date.now()}`, senderId: partner.id, receiverId: user.id, content: `AuraBot connectivity issue: ${err?.message || 'Server timeout'}`, type: 'text', fileUrl: null, timestamp: new Date().toISOString() }]);
      setPartnerStatus(partner.id, 'confused');
      setTimeout(() => setPartnerStatus(partner.id, 'online'), 3000);
    }
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = async (e?: React.FormEvent, overrideContent?: string) => {
    if (e) e.preventDefault();
    const contentToSend = overrideContent || input;
    if (!contentToSend.trim() || !user?.id || !partner) return;
    const msgContent = contentToSend;
    if (!overrideContent) setInput('');
    if (isVirtualBot) {
      const userMsg: Message = { id: `local-user-${Date.now()}`, senderId: user.id, receiverId: partner.id, content: msgContent, type: 'text', fileUrl: null, timestamp: new Date().toISOString() };
      setMessages(prev => { const next = [...prev, userMsg]; messagesRef.current = next; return next; });
      if (chatSettings.sendSound) playPopSound();
      handleBotResponse(msgContent);
      return;
    }
    const { data } = await supabase.from('messages').insert([{ sender_id: user.id, receiver_id: partner.id, content: msgContent, type: 'text' }]).select().single();
    if (data) {
      if (chatSettings.sendSound) playPopSound();
      setMessages(prev => [...prev, { id: data.id, senderId: data.sender_id, receiverId: data.receiver_id, content: data.content, type: data.type, fileUrl: data.file_url, timestamp: data.timestamp }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  useEffect(() => {
    const handleAISuggest = (e: any) => {
      const { type, content, custom, prompt } = e.detail || {};
      if (prompt) { setInput(prompt); return; }
      if (type && content) {
        let aiPrompt = "";
        switch (type) {
          case 'refine': aiPrompt = `Please professionalize and refine this text:\n\n"${content}"`; break;
          case 'todo': aiPrompt = `Create a clear checklist/todo list based on this content:\n\n"${content}"`; break;
          case 'summarize': aiPrompt = `Summarize this text concisely:\n\n"${content}"`; break;
          case 'hinglish': aiPrompt = `Rewrite this content in natural Hinglish:\n\n"${content}"`; break;
          case 'expand': aiPrompt = `Expand on these ideas:\n\n"${content}"`; break;
          case 'custom': aiPrompt = `${custom}\n\nContext:\n"${content}"`; break;
          default: aiPrompt = `Help me with this:\n\n"${content}"`;
        }
        if (isVirtualBot) {
          const userMsg: Message = { id: `local-user-ai-${Date.now()}`, senderId: user?.id, receiverId: partner?.id, content: aiPrompt, type: 'text', timestamp: new Date().toISOString() };
          setMessages(prev => { const next = [...prev, userMsg]; messagesRef.current = next; return next; });
          handleBotResponse(aiPrompt);
        } else { sendMessage(undefined, aiPrompt); }
      }
    };
    window.addEventListener('aura_ai_suggest', handleAISuggest);
    return () => window.removeEventListener('aura_ai_suggest', handleAISuggest);
  }, [isVirtualBot, partner, connectionId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || !partner) return;
    try {
      const { file_id, message_id } = await tgUploadFile(file);
      const publicUrl = await tgGetFileUrl(file_id);
      if (isVirtualBot) {
        const userMsg: Message = { id: `local-file-${Date.now()}`, senderId: user.id, receiverId: partner.id, content: file.name, type: 'file', fileUrl: publicUrl, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        await supabase.from('vault_items').insert([{ user_id: user.id, name: file.name, content: file.name, type: 'file', telegram_file_id: file_id, telegram_msg_id: message_id, file_size: file.size, folder_id: null, is_chat_file: true }]);
        let imageBase64: string | undefined;
        if (file.type.startsWith('image/')) { imageBase64 = await new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(file); }); }
        handleBotResponse(`Uploaded file: ${file.name}`, imageBase64, publicUrl);
      } else {
        const { data } = await supabase.from('messages').insert([{ sender_id: user.id, receiver_id: partner.id, content: file.name, type: 'file', file_url: publicUrl, telegram_file_id: file_id, telegram_msg_id: message_id }]).select().single();
        if (data) { setMessages(prev => [...prev, { id: data.id, senderId: data.sender_id, receiverId: data.receiver_id, content: data.content, type: data.type, fileUrl: data.file_url, timestamp: data.timestamp, telegram_file_id: data.telegram_file_id, telegram_msg_id: data.telegram_msg_id }]); }
      }
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) { console.error('[Upload Error]', err); }
    if (e.target) e.target.value = '';
  };

  const acceptFriend = async () => { if (!connectionId) return; await supabase.from('connections').update({ status: 'accepted' }).eq('id', connectionId); };
  const rejectFriend = async () => { if (!connectionId) return; await supabase.from('connections').delete().eq('id', connectionId); navigate('/dashboard'); };

  if (!partner) return null;

  const isPending = conn?.status === 'pending';
  const amIReceiver = (conn?.user2_id || conn?.user2Id) === user?.id;
  const amISender = (conn?.user1_id || conn?.user1Id) === user?.id;
  const currentPartnerStatus = partnerStatus[partner.id] || (partner.username === 'AuraBot' ? 'online' : 'offline');

  const isPartnerTyping = currentPartnerStatus.startsWith('typing');
  const partnerTypingMood = currentPartnerStatus.startsWith('typing_') ? currentPartnerStatus.replace('typing_', '') : null;
  const activityStates = new Set(['browsing_files', 'viewing_notes', 'timetable_open', 'offline', 'idle']);
  const botTransientStates = new Set(['thinking', 'happy', 'sad', 'angry', 'confused', 'surprised', 'heart_eyes', 'magic', 'cool', 'starry_eyes', 'partying', 'crying']);

  let avatarMood: string;
  if (botTransientStates.has(currentPartnerStatus)) avatarMood = currentPartnerStatus;
  else if (partnerTypingMood) avatarMood = partnerTypingMood;
  else if (isPartnerTyping) avatarMood = 'typing';
  else if (activityStates.has(currentPartnerStatus)) avatarMood = currentPartnerStatus;
  else if (sentimentState && (currentPartnerStatus === 'online' || currentPartnerStatus === 'reading_chat')) avatarMood = sentimentState;
  else avatarMood = currentPartnerStatus;

  return (
    <div className="flex w-full h-full bg-aura-navy relative overflow-hidden">
      {/* Chat Area */}
      <div className={clsx("flex flex-col h-full transition-all duration-200 relative",
        toolTab === 'none' ? "w-full" : "hidden md:flex md:w-1/2 border-r border-aura-border/50")}>

        {/* Header - Clean: back + avatar + name + actionmoji */}
        <div className="h-[60px] flex items-center px-3 border-b border-aura-border/40 bg-aura-panel/95 backdrop-blur-md z-20 shrink-0 gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="md:hidden p-2 -ml-1 text-aura-lavender/60 hover:text-white active:bg-aura-surface rounded-xl transition-all shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>

          {/* Avatar */}
          <div className="relative shrink-0">
            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden ring-2", partner?.username === 'AuraBot' ? "ring-aura-primary/30 gradient-primary" : "ring-aura-border bg-aura-surface")}>
              {partner.avatar_url ? (
                <img src={partner.avatar_url} alt={partner.username} className="w-full h-full object-cover" />
              ) : (
                partner.username[0].toUpperCase()
              )}
            </div>
            {currentPartnerStatus !== 'offline' && <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full status-online" />}
          </div>

          {/* Name + Status */}
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-bold text-[15px] flex items-center gap-2 truncate">
              <span className="truncate">{partner.username}</span>
              {partner?.username === 'AuraBot' && <span className="text-[9px] bg-aura-primary/15 text-aura-primary-light px-1.5 py-0.5 rounded-md font-bold shrink-0">AI</span>}
            </h3>
            <p className="text-[11px] text-aura-lavender/40 truncate font-medium">
              {getStatusLabel(currentPartnerStatus)}
            </p>
          </div>

          {/* ActionMoji - properly sized */}
          <div className="shrink-0 w-10 h-10 flex items-center justify-center overflow-hidden rounded-full bg-aura-surface/50 border border-aura-border/40" title={getStatusLabel(avatarMood)}>
            <div style={{ width: 80, height: 80, transform: 'scale(0.5)', transformOrigin: 'center' }}>
              <ActionMojiAvatar state={avatarMood} username={partner?.username || 'User'} avatarUrl={partner?.avatar_url || partner?.avatarUrl} showStatusRing={false} showStatus={false} />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-aura-navy scroll-smooth scrollbar-none" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.03) 0%, transparent 60%)' }}>
          {messages.map((m, i) => {
            const isMe = m.senderId === user?.id;
            return (
              <div key={i} className={clsx("flex flex-col max-w-[82%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                <div className={clsx("px-3.5 py-2.5 rounded-2xl shadow-sm", isMe ? "gradient-primary text-white rounded-br-md" : "bg-aura-surface text-white rounded-bl-md border border-aura-border/30")}>
                  {m.type === 'text' && (
                    <div className="flex flex-col">
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      {m.senderId === 'aurabot' && (
                        <button
                          onClick={() => { window.dispatchEvent(new CustomEvent('aura_note_update', { detail: { content: m.content } })); setToolTab('notes'); }}
                          className="mt-2.5 self-start flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-white/20 active:scale-95 transition-all"
                        >
                          <Sparkles size={11} /> Apply to Notes
                        </button>
                      )}
                    </div>
                  )}
                  {m.type === 'file' && (
                    <a href={m.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:opacity-80 transition-opacity py-0.5">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <FileIcon name={m.content} size={16} className="text-white" />
                      </div>
                      <span className="text-sm font-medium truncate max-w-[180px]">{m.content}</span>
                    </a>
                  )}
                </div>
                <span className="text-[10px] text-aura-lavender/30 mt-1 font-medium px-1">
                  {(() => {
                    const d = new Date(m.timestamp);
                    const isToday = new Date().toDateString() === d.toDateString();
                    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const day = d.toLocaleDateString([], { weekday: 'short' });
                    return `${time} · ${isToday ? 'Today' : day}`;
                  })()}
                </span>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Settings Modal */}
        {showSettings && (
          <div className="absolute inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-aura-panel w-full max-w-sm rounded-t-3xl md:rounded-2xl border border-aura-border/50 shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-aura-border/50 flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2"><SettingsIcon size={16} className="text-aura-primary" /> Chat Settings</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 text-aura-lavender/50 hover:text-white hover:bg-aura-surface rounded-xl transition-colors"><X size={18} /></button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between bg-aura-surface p-3.5 rounded-xl border border-aura-border/40">
                  <div className="flex items-center gap-3 text-white"><EyeOff size={16} className="text-aura-pink" /><div><p className="text-sm font-medium">Vanish Mode</p><p className="text-[10px] text-aura-lavender/40">Auto-delete on exit</p></div></div>
                  <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={chatSettings.vanishMode} onChange={e => setChatSettings({ ...chatSettings, vanishMode: e.target.checked })} /><div className="w-9 h-5 bg-aura-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-aura-primary"></div></label>
                </div>
                <div className="flex items-center justify-between bg-aura-surface p-3.5 rounded-xl border border-aura-border/40">
                  <div className="flex items-center gap-3 text-white"><Volume2 size={16} className="text-aura-teal" /><p className="text-sm font-medium">Send Sound</p></div>
                  <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={chatSettings.sendSound} onChange={e => setChatSettings({ ...chatSettings, sendSound: e.target.checked })} /><div className="w-9 h-5 bg-aura-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-aura-teal"></div></label>
                </div>
                <div className="flex items-center justify-between bg-aura-surface p-3.5 rounded-xl border border-aura-border/40">
                  <div className="flex items-center gap-3 text-white"><VolumeX size={16} className="text-aura-primary-light" /><p className="text-sm font-medium">Receive Sound</p></div>
                  <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={chatSettings.receiveSound} onChange={e => setChatSettings({ ...chatSettings, receiveSound: e.target.checked })} /><div className="w-9 h-5 bg-aura-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-aura-primary-light"></div></label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-aura-panel/95 backdrop-blur-md border-t border-aura-border/40 shrink-0 px-3 py-2.5 pb-[max(12px,env(safe-area-inset-bottom))]">
          {isPending ? (
            <div className="flex flex-col items-center gap-3 py-2 animate-fade-in-up">
              {amIReceiver ? (
                <>
                  <p className="text-aura-lavender/60 text-sm font-medium text-center">Accept request to chat with {partner.username}?</p>
                  <div className="flex items-center gap-3 w-full">
                    <button onClick={rejectFriend} className="flex-1 bg-aura-surface border border-aura-border/50 text-red-400 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-all">Reject</button>
                    <button onClick={acceptFriend} className="flex-1 gradient-primary text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-aura-primary/20 active:scale-95 transition-all">Accept</button>
                  </div>
                </>
              ) : (
                <div className="bg-aura-surface border border-aura-border/40 rounded-xl px-5 py-4 text-center w-full">
                  <Clock className="w-5 h-5 text-aura-primary mx-auto mb-2 opacity-50" />
                  <p className="text-aura-lavender/50 text-sm">Waiting for <span className="text-white font-semibold">{partner.username}</span> to accept.</p>
                </div>
              )}
            </div>
          ) : null}

          <form onSubmit={sendMessage} autoComplete="off" className={clsx("flex items-center gap-2 relative", isPending && amIReceiver && "opacity-30 pointer-events-none")}>
            <div className="hidden" aria-hidden="true"><input type="text" name="aura_chat_session" tabIndex={-1} /></div>

            {/* Plus button - opens tools menu */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowToolsMenu(!showToolsMenu)}
                className={clsx("p-2.5 rounded-xl border transition-all active:scale-90", showToolsMenu ? "bg-aura-primary text-white border-aura-primary shadow-md shadow-aura-primary/20 rotate-45" : "bg-aura-surface border-aura-border/40 text-aura-lavender/50 hover:text-white")}
              >
                <Plus size={18} />
              </button>

              {/* Tools Popup */}
              {showToolsMenu && (
                <>
                  <div className="fixed inset-0 z-[55]" onClick={() => setShowToolsMenu(false)} />
                  <div className="absolute bottom-full left-0 mb-2 w-56 bg-aura-panel border border-aura-border/50 rounded-2xl shadow-2xl overflow-hidden z-[60] animate-fade-in-up">
                    <div className="p-2 border-b border-aura-border/30">
                      <span className="text-[9px] font-bold uppercase text-aura-lavender/40 tracking-wider px-2">Tools</span>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      <button type="button" onClick={() => { setToolTab(toolTab === 'notes' ? 'none' : 'notes'); setShowToolsMenu(false); }} className={clsx("w-full flex items-center gap-3 p-2.5 rounded-xl transition-all active:scale-[0.98]", toolTab === 'notes' ? "bg-aura-primary/10 text-aura-primary" : "text-aura-lavender/60 hover:bg-aura-surface hover:text-white")}>
                        <FileText size={16} />
                        <span className="text-sm font-medium">SyncNotes</span>
                      </button>
                      <button type="button" onClick={() => { setToolTab(toolTab === 'vault' ? 'none' : 'vault'); setShowToolsMenu(false); }} className={clsx("w-full flex items-center gap-3 p-2.5 rounded-xl transition-all active:scale-[0.98]", toolTab === 'vault' ? "bg-aura-primary/10 text-aura-primary" : "text-aura-lavender/60 hover:bg-aura-surface hover:text-white")}>
                        <Paperclip size={16} />
                        <span className="text-sm font-medium">SmartVault</span>
                      </button>
                      <button type="button" onClick={() => { setToolTab(toolTab === 'timetable' ? 'none' : 'timetable'); setShowToolsMenu(false); }} className={clsx("w-full flex items-center gap-3 p-2.5 rounded-xl transition-all active:scale-[0.98]", toolTab === 'timetable' ? "bg-aura-pink/10 text-aura-pink" : "text-aura-lavender/60 hover:bg-aura-surface hover:text-white")}>
                        <Calendar size={16} />
                        <span className="text-sm font-medium">Timetable</span>
                      </button>
                      <button type="button" onClick={() => { toggleListening(); setShowToolsMenu(false); }} className={clsx("w-full flex items-center gap-3 p-2.5 rounded-xl transition-all active:scale-[0.98]", isListening ? "bg-red-500/10 text-red-400" : "text-aura-lavender/60 hover:bg-aura-surface hover:text-white")}>
                        {isListening ? <Mic size={16} /> : <MicOff size={16} />}
                        <span className="text-sm font-medium">{isListening ? 'Stop Voice' : 'Voice Input'}</span>
                      </button>
                      <label className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all active:scale-[0.98] text-aura-lavender/60 hover:bg-aura-surface hover:text-white cursor-pointer">
                        <Paperclip size={16} />
                        <span className="text-sm font-medium">Attach File</span>
                        <input type="file" className="hidden" onChange={(e) => { handleFileUpload(e); setShowToolsMenu(false); }} />
                      </label>
                      <button type="button" onClick={() => { setShowSettings(true); setShowToolsMenu(false); }} className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all active:scale-[0.98] text-aura-lavender/60 hover:bg-aura-surface hover:text-white">
                        <SettingsIcon size={16} />
                        <span className="text-sm font-medium">Chat Settings</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <input
              type="text"
              name={`aura_msg_${Math.floor(Date.now() / 1000)}`}
              placeholder="Message..."
              value={input}
              onChange={e => { setInput(e.target.value); setShowCommands(e.target.value === '/'); }}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              data-form-type="other" data-lpignore="true" data-1p-ignore="true" inputMode="text"
              className="flex-1 min-w-0 bg-aura-surface border border-aura-border/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-aura-primary/50 focus:ring-2 focus:ring-aura-primary/10 transition-all text-[15px] placeholder:text-aura-lavender/25"
            />
            {showCommands && (
              <div className="absolute bottom-full left-14 mb-2 w-56 bg-aura-panel border border-aura-border/50 rounded-xl shadow-2xl overflow-hidden animate-fade-in-up z-[60]">
                <div className="p-2 border-b border-aura-border/40"><span className="text-[10px] font-bold uppercase text-aura-lavender/40 tracking-wider px-2">Commands</span></div>
                {SLASH_COMMANDS.map((c, i) => (
                  <button key={i} type="button" onClick={() => { setInput(c.cmd + ' '); setShowCommands(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-aura-surface transition-colors text-left group">
                    <div className="p-1.5 bg-aura-primary/10 rounded-lg text-aura-primary group-hover:bg-aura-primary group-hover:text-white transition-all">{c.icon}</div>
                    <div className="min-w-0"><p className="text-xs font-semibold text-white">{c.cmd}</p><p className="text-[9px] text-aura-lavender/40 truncate">{c.desc}</p></div>
                  </button>
                ))}
              </div>
            )}
            <button type="submit" disabled={!input.trim()} className="p-2.5 gradient-primary text-white rounded-xl shrink-0 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-all shadow-sm shadow-aura-primary/20">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* Tools Panel */}
      <AnimatePresence>
        {toolTab !== 'none' && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 250 }}
            className="w-full md:w-1/2 flex flex-col h-full bg-aura-panel border-l border-aura-border/50 absolute md:relative z-[30] inset-0 md:inset-auto shadow-2xl md:shadow-none"
          >
            <div className="h-[56px] flex items-center justify-between px-4 border-b border-aura-border/40 shrink-0 bg-aura-panel/95 backdrop-blur-md z-10">
              <button onClick={() => setToolTab('none')} className="md:hidden p-2 -ml-1 text-aura-lavender/60 hover:text-white active:bg-aura-surface rounded-xl transition-all shrink-0" aria-label="Back">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <h2 className="text-white font-bold flex items-center gap-2 text-sm flex-1 min-w-0">
                {toolTab === 'notes' && <div className="p-1.5 bg-aura-primary/10 rounded-lg shrink-0"><FileText size={15} className="text-aura-primary" /></div>}
                {toolTab === 'vault' && <div className="p-1.5 bg-aura-primary/10 rounded-lg shrink-0"><Paperclip size={15} className="text-aura-primary" /></div>}
                {toolTab === 'timetable' && <div className="p-1.5 bg-aura-pink/10 rounded-lg shrink-0"><Calendar size={15} className="text-aura-pink" /></div>}
                <span className="truncate">{toolTab === 'notes' ? 'SyncNotes' : toolTab === 'vault' ? 'SmartVault' : 'Timetable'}</span>
              </h2>
              <button onClick={() => setToolTab('none')} className="hidden md:flex p-2 text-aura-lavender/40 hover:text-white transition-all bg-aura-surface hover:bg-aura-border rounded-xl active:scale-90 border border-aura-border/40 items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-visible relative bg-aura-navy/30">
              {toolTab === 'notes' && <SyncNotes connectionId={isVirtualBot ? undefined : connectionId} partner={isVirtualBot ? undefined : partner} />}
              {toolTab === 'vault' && <SmartVault connectionId={isVirtualBot ? '' : (connectionId || '')} messages={messages} partner={isVirtualBot ? null : partner} isPersonal={isVirtualBot} />}
              {toolTab === 'timetable' && <SharedTimetable connectionId={isVirtualBot ? undefined : connectionId} partner={isVirtualBot ? undefined : partner} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
