import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../components/SocketProvider';
import { useAuthStore } from '../store/authStore';
import { Send, FileText, Paperclip, Calendar, X, Mic, MicOff, Settings as SettingsIcon, Volume2, VolumeX, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import SyncNotes from '../components/SyncNotes';
import SmartVault from '../components/SmartVault';
import SharedTimetable from '../components/SharedTimetable';
import { motion, AnimatePresence } from 'motion/react';
import ActionMojiAvatar from '../components/ActionMojiAvatar';
import { supabase } from '../lib/supabaseClient';
import { getAuraBotResponse } from '../lib/aurabot';
import { playPopSound, playReceiveSound } from '../lib/audio';

// Human-readable status labels
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
};

function getStatusLabel(status: string) {
  if (status.startsWith('typing_')) return '✏️ Typing...';
  return STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

// ── Sentiment keywords ──────────────────────────────────────────────────
const SENTIMENT_MAP: { states: string[]; keywords: string[] }[] = [
  { states: ['searching'],  keywords: ['search', 'find', 'looking for', 'dhund', 'dhundh', 'kahan hai', 'kidhar hai', 'talash', 'search kar', 'khoj'] },
  { states: ['writing_code'], keywords: ['code', 'debug', 'function', 'error', 'bug', 'coding', 'script', 'logic', 'code kar', 'fix kar', 'program', 'build kar'] },
  { states: ['uploading'],  keywords: ['upload', 'send file', 'attachment', 'bhej', 'bheja', 'send kar', 'file le', 'document bhej', 'share kar', 'daal raha'] },
  { states: ['reading_book'], keywords: ['read', 'study', 'learn', 'book', 'padhai', 'padh', 'seekh', 'notes padh', 'exam', 'revision', 'kitaab', 'padhne'] },
  { states: ['celebrating'],keywords: ['congratulations', 'yay', 'woohoo', 'party', 'celebrate', 'mubarak', 'badhai', 'kamaal', 'badiya', 'jeeta', 'op', 'gg', 'booyah'] },
  { states: ['playing_games'], keywords: ['play', 'game', 'khel', 'pubg', 'bgmi', 'valorant', 'minecraft', 'khelte', 'match', 'lobby', 'push kar', 'gaming'] },
  { states: ['listening_music'], keywords: ['music', 'song', 'listen', 'gaana', 'symphony', 'gaane', 'sun', 'spotify', 'playlist', 'vibe', 'beat'] },
  { states: ['angry'],    keywords: ['angry', 'hate', 'stupid', 'idiot', 'shut up', 'ugh', 'worst', 'horrible', 'useless', 'terrible', 'rude', 'frustrated', 'annoying', 'mad', 'furious', 'damn', 'gusa', 'gussa', 'bekar', 'galat', 'pagal', 'kutta', 'bakwas'] },
  { states: ['sad'],      keywords: ['sad', 'depressed', 'unhappy', 'miss', 'lonely', 'hurt', 'cry', 'crying', 'tears', 'unfortunate', 'broken', 'lost', 'hopeless', 'sorry', 'regret', 'fail', 'bad', 'worst day', 'dukhi', 'rona', 'akela', 'bura', 'udas'] },
  { states: ['confused'], keywords: ['confused', 'what', 'huh', 'idk', 'not sure', 'don\'t understand', 'unclear', 'weird', 'strange', 'why', 'how', 'lost', 'really?', 'seriously', '??', 'kya', 'samajh nahi', 'kaise', 'kyu'] },
  { states: ['surprised'],keywords: ['wow', 'omg', 'whoa', 'no way', 'seriously', 'really', 'oh my', 'unbelievable', 'shocking', 'unexpected', 'wait what', 'sachme', 'are waah', 'kya baat'] },
  { states: ['happy'],    keywords: ['happy', 'great', 'awesome', 'love', 'haha', 'lol', 'fun', 'nice', 'good', 'cool', 'yes!', 'yay', 'excited', 'amazing', 'perfect', 'thanks', 'thank you', 'lmao', 'hehe', ':)', '😊', '❤️', '🔥', 'khush', 'acha', 'mast', 'badiya', 'sahi'] },
  { states: ['thinking'], keywords: ['hmm', 'think', 'maybe', 'perhaps', 'possibly', 'consider', 'let me', 'actually', 'well...', 'interesting', 'i guess'] },
  { states: ['heart_eyes'],keywords: ['love you', 'adore', 'crush', 'beautiful', 'gorgeous', 'cute', '❤️', '🥰', '😍', 'i like you', 'sundar', 'pyar', 'khoobsurat', 'mast lag'] },
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

function deriveAvatarMoodFromMessages(msgs: any[], myId: string): string | null {
  // Look at last 3 messages from PARTNER (not me)
  const partnerMsgs = msgs.filter(m => m.senderId !== myId).slice(-3);
  if (partnerMsgs.length === 0) return null;
  const combined = partnerMsgs.map(m => (m.content || '')).join(' ');
  return deriveMoodFromString(combined);
}

export default function ChatWorkspace({ connections }: { connections: any[] }) {
  const { id: connectionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket, partnerStatus, setPartnerStatus } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const messagesRef = useRef(messages);
  const [input, setInput] = useState('');
  const [toolTab, setToolTab] = useState<'notes' | 'vault' | 'timetable' | 'none'>('none');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [sentimentState, setSentimentState] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [chatSettings, setChatSettings] = useState(() => {
    const saved = localStorage.getItem(`chat_settings_${connectionId}`);
    return saved ? JSON.parse(saved) : { vanishMode: false, sendSound: true, receiveSound: true };
  });

  const chatSettingsRef = useRef(chatSettings);
  chatSettingsRef.current = chatSettings;

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
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setInput(prev => prev + (prev ? ' ' : '') + finalTranscript.trim());
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const conn = connections.find(c => c.id === connectionId);
  const partner = conn
    ? ((conn.user1Id ?? conn.user1_id) === user?.id ? conn.user2 : conn.user1)
    : null;
  const isVirtualBot = Boolean(conn?.isVirtual) && partner?.username === 'AuraBot';
  const virtualChatKey = user?.id ? `aurabot_chat_${user.id}` : null;

  useEffect(() => {
    return () => {
      if (chatSettingsRef.current.vanishMode && user?.id && partner?.id) {
        if (isVirtualBot && virtualChatKey) {
          localStorage.removeItem(virtualChatKey);
        } else {
          // Delete messages we received so they disappear for the partner
          supabase.from('messages').delete()
            .eq('receiver_id', user.id)
            .eq('sender_id', partner.id)
            .then();
        }
      }
    };
  }, [user?.id, partner?.id, isVirtualBot, virtualChatKey]);

  useEffect(() => {
    messagesRef.current = messages;
    // Re-derive mood when messages change
    if (user?.id) {
      const mood = deriveAvatarMoodFromMessages(messages, user.id);
      setSentimentState(mood);
    }
  }, [messages, user?.id]);

  useEffect(() => {
    if (!connectionId || !user?.id || !partner?.id || isVirtualBot) return;
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${user.id})`)
        .order('timestamp', { ascending: true });

      if (data) {
        setMessages(data.map(m => ({
          id: m.id,
          senderId: m.sender_id,
          receiverId: m.receiver_id,
          content: m.content,
          type: m.type,
          fileUrl: m.file_url,
          timestamp: m.timestamp
        })));
      }
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };
    fetchMessages();
  }, [connectionId, user?.id, partner?.id, isVirtualBot]);

  useEffect(() => {
    if (!connectionId || !user?.id || !partner?.id || isVirtualBot) return;

    // Realtime for messages
    const msgSub = supabase.channel(`messages:${connectionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as any;
        if (
          (m.sender_id === user.id && m.receiver_id === partner.id) ||
          (m.sender_id === partner.id && m.receiver_id === user.id)
        ) {
          setMessages(prev => {
             if (prev.some(p => p.id === m.id)) return prev;
             if (m.sender_id === partner.id && chatSettingsRef.current.receiveSound) {
               playReceiveSound();
             }
             return [...prev, {
                id: m.id,
                senderId: m.sender_id,
                receiverId: m.receiver_id,
                content: m.content,
                type: m.type,
                fileUrl: m.file_url,
                timestamp: m.timestamp
             }];
          });
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgSub);
    };
  }, [connectionId, user?.id, partner?.id, isVirtualBot]);

  // Virtual AuraBot bootstrap: keep bot "alive" with initial message + online status.
  useEffect(() => {
    if (!isVirtualBot || !partner?.id) return;
    setPartnerStatus(partner.id, 'online');
    setMessages((prev) => {
      if (prev.length > 0) return prev;

      if (virtualChatKey) {
        const saved = localStorage.getItem(virtualChatKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          } catch {}
        }
      }

      return [
        {
          id: `bot-welcome-${Date.now()}`,
          senderId: partner.id,
          receiverId: user?.id,
          content: 'Hi! Main AuraBot hoon 🤖 Tum jo bhi build karna chaho, chalo saath karte hain.',
          type: 'text',
          fileUrl: null,
          timestamp: new Date().toISOString(),
        },
      ];
    });
  }, [isVirtualBot, partner?.id, setPartnerStatus, user?.id, virtualChatKey]);

  useEffect(() => {
    if (!isVirtualBot || !virtualChatKey) return;
    localStorage.setItem(virtualChatKey, JSON.stringify(messages));
  }, [messages, isVirtualBot, virtualChatKey]);

  // AuraBot: reflect toolTab activity states (browsing_files, viewing_notes, timetable_open)
  useEffect(() => {
    if (!isVirtualBot || !partner?.id) return;
    // Only update to activity state if bot is not in a special transient state
    const current = partnerStatus[partner.id] || 'online';
    const transientStates = new Set(['thinking', 'typing', 'happy', 'sad', 'angry', 'confused',
      'surprised', 'heart_eyes', 'magic', 'cool', 'starry_eyes', 'partying', 'crying']);
    if (transientStates.has(current)) return; // don't override bot's active response mood
    if (toolTab === 'vault') setPartnerStatus(partner.id, 'browsing_files');
    else if (toolTab === 'notes') setPartnerStatus(partner.id, 'viewing_notes');
    else if (toolTab === 'timetable') setPartnerStatus(partner.id, 'timetable_open');
    else if (input.trim().length === 0) setPartnerStatus(partner.id, 'online');
  }, [toolTab, isVirtualBot, partner?.id, setPartnerStatus, partnerStatus, input]);

  // Status tracking — broadcast OUR status to partner
  useEffect(() => {
    if (!socket || !partner) return;

    let timeout: NodeJS.Timeout;
    const updateStatus = async (state: string) => {
      try {
        await socket.track({ status: state });
      } catch (e) {}
    };

    const handleInteraction = () => {
      clearTimeout(timeout);
      let state = 'online';
      
      if (input.trim().length > 0) {
        const inputMood = deriveMoodFromString(input);
        state = inputMood ? `typing_${inputMood}` : 'typing';
      }
      else if (toolTab === 'notes') state = 'viewing_notes';
      else if (toolTab === 'vault') state = 'browsing_files';
      else if (toolTab === 'timetable') state = 'timetable_open';
      else state = 'reading_chat';

      updateStatus(state);

      timeout = setTimeout(() => {
        updateStatus('idle');
      }, 60000);
    };

    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    handleInteraction();

    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      clearTimeout(timeout);
    };
  }, [socket, partner?.id, partner?.username, input, toolTab]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user?.id || !partner) return;
    
    const msgContent = input;
    setInput('');

    if (isVirtualBot) {
      const now = new Date().toISOString();
      const userMsg = {
        id: `local-user-${Date.now()}`,
        senderId: user.id,
        receiverId: partner.id,
        content: msgContent,
        type: 'text',
        fileUrl: null,
        timestamp: now,
      };
      setMessages(prev => {
        const next = [...prev, userMsg];
        messagesRef.current = next;
        return next;
      });
      if (chatSettings.sendSound) playPopSound();
      setPartnerStatus(partner.id, 'thinking');
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

      try {
        const llm = await getAuraBotResponse(
          user.id,
          partner.id,
          msgContent
        );

        // Step 1: show typing indicator with mood
        setPartnerStatus(partner.id, `typing_${llm.mood}`);
        await new Promise((resolve) => setTimeout(resolve, 800));

        const botMsg = {
          id: `local-bot-${Date.now()}`,
          senderId: partner.id,
          receiverId: user.id,
          content: llm.text,
          type: 'text',
          fileUrl: null,
          timestamp: new Date().toISOString(),
        };
        if (chatSettings.receiveSound) playReceiveSound();
        setMessages(prev => {
          const next = [...prev, botMsg];
          messagesRef.current = next;
          return next;
        });
        // Step 2: show final emotion for 4s, then return to activity/online
        setPartnerStatus(partner.id, llm.mood || 'happy');
        setTimeout(() => {
          const tab = toolTab;
          if (tab === 'vault') setPartnerStatus(partner.id, 'browsing_files');
          else if (tab === 'notes') setPartnerStatus(partner.id, 'viewing_notes');
          else if (tab === 'timetable') setPartnerStatus(partner.id, 'timetable_open');
          else setPartnerStatus(partner.id, 'online');
        }, 4000);
      } catch (err: any) {
        setMessages(prev => [
          ...prev,
          {
            id: `local-bot-error-${Date.now()}`,
            senderId: partner.id,
            receiverId: user.id,
            content: `AuraBot response error: ${err?.message || 'Unknown error'}`,
            type: 'text',
            fileUrl: null,
            timestamp: new Date().toISOString(),
          },
        ]);
        setPartnerStatus(partner.id, 'confused');
        setTimeout(() => setPartnerStatus(partner.id, 'online'), 3000);
      }
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      return;
    }
    
    const { data } = await supabase.from('messages').insert([{
      sender_id: user.id,
      receiver_id: partner.id,
      content: msgContent,
      type: 'text'
    }]).select().single();
    
    if (data) {
      if (chatSettings.sendSound) playPopSound();
      setMessages(prev => [...prev, {
        id: data.id,
        senderId: data.sender_id,
        receiverId: data.receiver_id,
        content: data.content,
        type: data.type,
        fileUrl: data.file_url,
        timestamp: data.timestamp
      }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || !partner) return;
    if (isVirtualBot) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath);

      const { data } = await supabase.from('messages').insert([{
        sender_id: user.id,
        receiver_id: partner.id,
        content: file.name,
        type: 'file',
        file_url: publicUrl
      }]).select().single();

      if (data) {
        setMessages(prev => [...prev, {
          id: data.id,
          senderId: data.sender_id,
          receiverId: data.receiver_id,
          content: data.content,
          type: data.type,
          fileUrl: data.file_url,
          timestamp: data.timestamp
        }]);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!partner) return null;

  const currentPartnerStatus = partnerStatus[partner.id] || (partner.username === 'AuraBot' ? 'online' : 'offline');

  // ── Avatar Mood Resolution (priority ladder) ──
  // 1. Bot transient states (thinking, typing_X, happy, etc.) — highest priority
  // 2. Activity states (browsing_files, viewing_notes, timetable_open) — what they are doing
  // 3. Sentiment from recent messages — emotional memory
  // 4. online / reading_chat / idle / offline — baseline

  const isPartnerTyping = currentPartnerStatus.startsWith('typing');
  const partnerTypingMood = currentPartnerStatus.startsWith('typing_')
    ? currentPartnerStatus.replace('typing_', '')
    : null;

  const activityStates = new Set(['browsing_files', 'viewing_notes', 'timetable_open', 'offline', 'idle']);
  const botTransientStates = new Set(['thinking', 'happy', 'sad', 'angry', 'confused', 'surprised',
    'heart_eyes', 'magic', 'cool', 'starry_eyes', 'partying', 'crying']);

  let avatarMood: string;

  if (botTransientStates.has(currentPartnerStatus)) {
    // Bot is showing emotion/action — show it directly
    avatarMood = currentPartnerStatus;
  } else if (partnerTypingMood) {
    // Partner typing with detected emotion
    avatarMood = partnerTypingMood;
  } else if (isPartnerTyping) {
    // Partner just typing (no detected mood)
    avatarMood = 'typing';
  } else if (activityStates.has(currentPartnerStatus)) {
    // Partner doing an activity — show task emoji
    avatarMood = currentPartnerStatus;
  } else if (sentimentState && (currentPartnerStatus === 'online' || currentPartnerStatus === 'reading_chat')) {
    // Partner online, show emotional memory from recent messages
    avatarMood = sentimentState;
  } else {
    avatarMood = currentPartnerStatus; // online / reading_chat / offline
  }

  return (
    <div className="flex w-full h-full bg-aura-navy relative overflow-hidden">
      {/* Chat Area */}
      <div className={clsx("flex flex-col h-full transition-all duration-300 relative",
        toolTab === 'none' ? "w-full lg:w-3/4 mx-auto border-r border-aura-border" : "hidden md:flex md:w-1/2 border-r border-aura-border")}>

        {/* Header */}
        <div className="h-[60px] sm:h-[72px] flex items-center justify-between px-2 sm:px-4 border-b border-aura-border bg-aura-panel/95 backdrop-blur-md shadow-sm z-20 shrink-0 overflow-visible gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-4 min-w-0 flex-1">
             <button
              onClick={() => navigate('/dashboard')}
              className="md:hidden p-1.5 sm:p-2.5 -ml-1 text-aura-lavender/70 hover:text-white active:bg-aura-border rounded-full transition-all shrink-0"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
             </button>
             <div className="relative shrink-0">
                <div className={clsx("w-8 h-8 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-inner", partner?.username === 'AuraBot' ? "bg-gradient-to-br from-pink-500 to-aura-primary" : "bg-aura-border")}>
                  {partner.username[0].toUpperCase()}
                </div>
                {currentPartnerStatus !== 'offline' && <span className="absolute bottom-0 right-0 block w-2.5 h-2.5 sm:w-3 sm:h-3 bg-aura-teal rounded-full border-2 border-aura-panel shadow-sm"></span>}
             </div>
             <div className="min-w-0 flex-1 flex flex-col justify-center">
               <h3 className="text-white font-bold flex items-center gap-1.5 text-[14px] sm:text-lg truncate leading-tight">
                 <span className="truncate">{partner.username}</span>
                 {partner?.username === 'AuraBot' && <span className="hidden sm:inline-block text-[9px] sm:text-[10px] bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-black border border-pink-500/20">AI</span>}
               </h3>
               <p className="text-[9px] sm:text-xs text-aura-lavender/50 truncate font-medium tracking-wide leading-tight">
                  {getStatusLabel(currentPartnerStatus)}
               </p>
             </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* ── ActionMoji ── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={avatarMood}
                initial={{ opacity: 0, scale: 0.7, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 4 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="flex-shrink-0 flex items-center justify-center overflow-visible self-center w-8 sm:w-12 h-8 sm:h-12"
                title={getStatusLabel(avatarMood)}
              >
                {/* Scale wrapper: 80px avatar shrunk to fit */}
                <div className="w-[80px] h-[80px] scale-[0.45] sm:scale-[0.6] origin-center">
                  <ActionMojiAvatar 
                    state={avatarMood} 
                    username={partner.username} 
                    showStatusRing={false}
                    showStatus={false}
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Tool Toggles */}
            <div className="flex items-center gap-0.5 sm:gap-2 bg-aura-navy/50 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-aura-border/50">
              <button
                onClick={() => setToolTab(toolTab === 'notes' ? 'none' : 'notes')}
                className={clsx("p-1.5 sm:p-2.5 rounded-md sm:rounded-lg transition-all active:scale-90", toolTab === 'notes' ? "bg-aura-primary text-white shadow-lg shadow-aura-primary/30" : "text-aura-lavender/50 hover:text-white")}
                title="SyncNotes"
              >
                <FileText className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </button>
              <button
                onClick={() => setToolTab(toolTab === 'vault' ? 'none' : 'vault')}
                className={clsx("p-1.5 sm:p-2.5 rounded-md sm:rounded-lg transition-all active:scale-90", toolTab === 'vault' ? "bg-aura-primary text-white shadow-lg shadow-aura-primary/30" : "text-aura-lavender/50 hover:text-white")}
                title="SmartVault"
              >
                <Paperclip className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </button>
              <button
                onClick={() => setToolTab(toolTab === 'timetable' ? 'none' : 'timetable')}
                className={clsx("p-1.5 sm:p-2.5 rounded-md sm:rounded-lg transition-all active:scale-90", toolTab === 'timetable' ? "bg-aura-pink text-white shadow-lg shadow-aura-pink/30" : "text-aura-lavender/50 hover:text-white")}
                title="Shared Timetable"
              >
                <Calendar className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-1.5 sm:p-2.5 rounded-md sm:rounded-lg transition-all active:scale-90 text-aura-lavender/50 hover:text-white"
                title="Chat Settings"
              >
                <SettingsIcon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-4 bg-aura-navy scroll-smooth" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(30, 30, 50, 0.4) 0%, transparent 100%)' }}>

          {messages.map((m, i) => {
            const isMe = m.senderId === user?.id;
            return (
              <div key={i} className={clsx("flex flex-col max-w-[85%] sm:max-w-[75%]", isMe ? "ml-auto items-end" : "mr-auto items-start animate-in slide-in-from-left-2 duration-300")}>
                <div className={clsx("px-4 py-2.5 rounded-2xl shadow-sm", isMe ? "bg-aura-primary text-white rounded-br-none" : "bg-aura-panel text-white rounded-bl-none border border-aura-border")}>
                  {m.type === 'text' && <p className="text-[14px] sm:text-[15px] leading-relaxed">{m.content}</p>}
                  {m.type === 'file' && (
                    <a href={m.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:opacity-80 transition-opacity py-1">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <Paperclip size={18} />
                      </div>
                      <span className="text-sm font-medium truncate max-w-[150px] sm:max-w-xs">{m.content}</span>
                    </a>
                  )}
                </div>
                <span className="text-[10px] text-aura-lavender/40 mt-1.5 font-medium px-1 uppercase tracking-tighter">
                  {(() => {
                    const d = new Date(m.timestamp);
                    const isToday = new Date().toDateString() === d.toDateString();
                    const time = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const day = d.toLocaleDateString([], { weekday: 'short' });
                    return `${time} • ${isToday ? 'Today' : day}`;
                  })()}
                </span>
              </div>
            )
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Settings Modal */}
        {showSettings && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-aura-panel w-full max-w-sm rounded-2xl border border-aura-border shadow-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-aura-border flex items-center justify-between bg-aura-navy/50">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <SettingsIcon size={20} className="text-aura-primary" /> Chat Settings
                </h2>
                <button onClick={() => setShowSettings(false)} className="p-1.5 text-aura-lavender/50 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {/* Vanish Mode */}
                <div className="flex items-center justify-between bg-aura-navy p-3 rounded-xl border border-aura-border">
                  <div className="flex items-center gap-3 text-white">
                    <EyeOff size={18} className="text-pink-400" />
                    <div>
                      <p className="text-sm font-medium">Vanish Mode</p>
                      <p className="text-[10px] text-aura-lavender/50">Delete chats after viewing when you leave</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={chatSettings.vanishMode} onChange={e => setChatSettings({...chatSettings, vanishMode: e.target.checked})} />
                    <div className="w-9 h-5 bg-aura-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-aura-primary"></div>
                  </label>
                </div>

                {/* Send Sound */}
                <div className="flex items-center justify-between bg-aura-navy p-3 rounded-xl border border-aura-border">
                  <div className="flex items-center gap-3 text-white">
                    <Volume2 size={18} className="text-aura-teal" />
                    <p className="text-sm font-medium">Send Sound</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={chatSettings.sendSound} onChange={e => setChatSettings({...chatSettings, sendSound: e.target.checked})} />
                    <div className="w-9 h-5 bg-aura-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-aura-teal"></div>
                  </label>
                </div>

                {/* Receive Sound */}
                <div className="flex items-center justify-between bg-aura-navy p-3 rounded-xl border border-aura-border">
                  <div className="flex items-center gap-3 text-white">
                    <VolumeX size={18} className="text-blue-400" />
                    <p className="text-sm font-medium">Receive Sound</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={chatSettings.receiveSound} onChange={e => setChatSettings({...chatSettings, receiveSound: e.target.checked})} />
                    <div className="w-9 h-5 bg-aura-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-400"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="bg-aura-panel border-t border-aura-border shrink-0 px-3 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))]">
          <form onSubmit={sendMessage} autoComplete="off" className="flex items-center gap-2 relative">
            {/* Aggressive Honeypot: Using zero-size absolute container with non-display:none to trick detectors */}
            <div className="absolute overflow-hidden w-[1px] h-[1px] -left-[1000px] pointer-events-none" aria-hidden="true">
              <input type="text" name="fake_un" autoComplete="username" tabIndex={-1} />
              <input type="password" name="fake_pw" autoComplete="current-password" tabIndex={-1} />
            </div>
            <label className="p-2.5 text-aura-lavender/50 hover:text-white cursor-pointer transition-colors bg-aura-navy rounded-xl hover:bg-aura-border shrink-0 border border-aura-border/50">
              <Paperclip size={19} />
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
            <input
              type="text"
              name={`aura_msg_${Math.random().toString(36).substring(7)}`}
              placeholder="Message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
              data-lpignore="true"
              data-1p-ignore="true"
              inputMode="text"
              role="presentation"
              className="flex-1 min-w-0 bg-aura-navy border border-aura-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-aura-primary transition-colors text-[15px]"
            />
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-xl shrink-0 border transition-colors ${isListening ? 'bg-red-500 border-red-400 text-white animate-pulse' : 'bg-aura-navy border-aura-border text-aura-lavender/50 hover:text-white'}`}
              title="Voice Typing"
            >
              {isListening ? <Mic size={19} /> : <MicOff size={19} />}
            </button>
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 bg-aura-primary text-white rounded-xl shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-90 transition-all"
            >
              <Send size={19} />
            </button>
          </form>
        </div>
      </div>

      {/* Tools Area / Split View */}
      <AnimatePresence>
        {toolTab !== 'none' && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full md:w-1/2 flex flex-col h-full bg-aura-panel border-l border-aura-border absolute md:relative z-[30] inset-0 md:inset-auto shadow-2xl md:shadow-none"
          >
            <div className="h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 border-b border-aura-border shrink-0 bg-aura-panel/95 backdrop-blur-md z-10 shadow-sm">
              <h2 className="text-white font-bold flex items-center gap-3 text-[15px] sm:text-lg">
                {toolTab === 'notes' && <div className="p-2 bg-aura-primary/10 rounded-lg"><FileText size={20} className="text-aura-primary" /></div>}
                {toolTab === 'vault' && <div className="p-2 bg-aura-primary/10 rounded-lg"><Paperclip size={20} className="text-aura-primary" /></div>}
                {toolTab === 'timetable' && <div className="p-2 bg-aura-pink/10 rounded-lg"><Calendar size={20} className="text-aura-pink" /></div>}
                <span>
                  {toolTab === 'notes' && 'SyncNotes'}
                  {toolTab === 'vault' && 'SmartVault'}
                  {toolTab === 'timetable' && 'Shared Timetable'}
                </span>
              </h2>
              <button
                onClick={() => setToolTab('none')}
                className="p-2.5 text-aura-lavender/50 hover:text-white transition-all bg-aura-navy hover:bg-aura-border rounded-xl active:scale-90 border border-aura-border/50"
              >
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative bg-aura-navy/20">
              {toolTab === 'notes' && (
                <SyncNotes connectionId={isVirtualBot ? undefined : connectionId} partner={isVirtualBot ? undefined : partner} />
              )}
              {toolTab === 'vault' && (
                <SmartVault
                  connectionId={isVirtualBot ? '' : (connectionId || '')}
                  messages={messages}
                  partner={isVirtualBot ? null : partner}
                  isPersonal={isVirtualBot}
                />
              )}
              {toolTab === 'timetable' && (
                <SharedTimetable connectionId={isVirtualBot ? undefined : connectionId} partner={isVirtualBot ? undefined : partner} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
