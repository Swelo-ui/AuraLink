import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Search, UserPlus, LogOut, Check, Clock, Settings, X, Bell, Palette, Shield, Download, BookOpen, Monitor } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { useSocket } from './SocketProvider';
import { supabase } from '../lib/supabaseClient';
import ActionMojiAvatar from './ActionMojiAvatar';

export default function Sidebar({ connections, onRefresh, className }: { connections: any[], onRefresh: () => void, className?: string }) {
  const { user, logout } = useAuthStore();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(localStorage.getItem('aura_notifications') !== 'false');
  const [focusMode, setFocusMode] = useState(localStorage.getItem('aura_focus') === 'true');
  const navigate = useNavigate();
  const location = useLocation();
  const { id: connectionId } = useParams();
  const { partnerStatus } = useSocket();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installHint, setInstallHint] = useState('');
  const [showDiscover, setShowDiscover] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [newAvatar, setNewAvatar] = useState(user?.avatarUrl || '');

  useEffect(() => {
    const handler = (e: any) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallHint('Install is ready on this device.');
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallHint('App installed successfully.');
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onInstalled);
    
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('PWA: App is already in standalone mode');
      setIsInstalled(true);
      setInstallHint('Already installed.');
    } else {
      setInstallHint('If prompt is not ready, use Chrome menu: Add to Home screen.');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (isInstalled) {
      setInstallHint('App is already installed on this device.');
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setInstallHint('Installing...');
      } else {
        setInstallHint('Install cancelled. You can try again.');
      }
      return;
    }
    setInstallHint('Install prompt not ready yet. In Android Chrome, tap menu (3 dots) -> Add to Home screen.');
  };

  const toggleNotifications = async () => {
    const newVal = !notificationsEnabled;
    
    // Optimistically update UI
    setNotificationsEnabled(newVal);
    localStorage.setItem('aura_notifications', newVal.toString());

    if (newVal && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        await Notification.requestPermission();
      }
      
      if (Notification.permission === 'denied') {
        alert('Notifications are blocked by your browser. Please allow them in site settings to receive background alerts.');
        return; // Don't try to subscribe to push
      }
      
      // Subscribe to Web Push
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          let subscription = await registration.pushManager.getSubscription();
          if (!subscription && import.meta.env.VITE_VAPID_PUBLIC_KEY) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
            });
          }
          
          // Save to DB
          if (subscription && user?.id) {
            const subData = subscription.toJSON();
            await supabase.from('push_subscriptions').upsert({
              user_id: user.id,
              endpoint: subData.endpoint,
              auth: subData.keys?.auth,
              p256dh: subData.keys?.p256dh,
            }, { onConflict: 'endpoint' });
          }
        }
      } catch (e) {
        console.error('Push subscription failed:', e);
      }
    }
  };

  const toggleFocusMode = () => {
    const newVal = !focusMode;
    setFocusMode(newVal);
    localStorage.setItem('aura_focus', newVal.toString());
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
  };

  const handleUpdateProfile = async () => {
    if (!user?.id || !newUsername) return;
    
    const { error } = await supabase
      .from('users')
      .update({ username: newUsername, avatar_url: newAvatar })
      .eq('id', user.id);
    
    if (!error) {
      const updatedUser = { ...user, username: newUsername, avatarUrl: newAvatar };
      useAuthStore.getState().setAuth(localStorage.getItem('token') || '', updatedUser);
      setIsEditing(false);
      onRefresh();
    }
  };

  const girlAvatars = [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Aria&hairColor=9a3300',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&hairColor=2c1b18',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe&hairColor=4a312c',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Maya&hairColor=724133',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Elena&hairColor=d1ad70',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Chloe&hairColor=e8d1a1',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Sofia&hairColor=4a312c',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Ivy&hairColor=241c11',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Ruby&hairColor=9a3300',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Lily&hairColor=f1ff5e'
  ];
  const boyAvatars = [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&hairColor=2c1b18',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Max&hairColor=4a312c',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Finn&hairColor=724133',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Sam&hairColor=d1ad70',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Noah&hairColor=241c11',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Jake&hairColor=9a3300',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Toby&hairColor=2c1b18',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo&hairColor=4a312c',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Luke&hairColor=724133',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex&hairColor=d1ad70'
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = search.trim();
    if (!query) return setResults([]);
    
    const { data, error } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .ilike('username', `%${query}%`)
      .neq('id', user?.id)
      .limit(15);
      
    if (data) setResults(data);
  };

  const fetchDiscoverUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .neq('id', user?.id)
      .limit(20);
    
    if (data) setAllUsers(data);
    setShowDiscover(true);
  };

  const addFriend = async (targetUserId: string) => {
    if (!user?.id) return;
    
    // Check if connection already exists in either direction
    const { data: existing } = await supabase
      .from('connections')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${user.id})`)
      .single();

    if (existing) {
      navigate(`/dashboard/c/${existing.id}`);
      setSearch('');
      setResults([]);
      return;
    }

    const { data, error } = await supabase.from('connections').insert([
      { user1_id: user.id, user2_id: targetUserId, status: 'pending' }
    ]).select().single();
    
    if (data) {
      navigate(`/dashboard/c/${data.id}`);
    }
    
    setSearch('');
    setResults([]);
  };

  const acceptFriend = async (id: string) => {
    await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', id);
    onRefresh();
  };

  const rejectFriend = async (id: string) => {
    await supabase
      .from('connections')
      .delete()
      .eq('id', id);
    onRefresh();
    navigate('/dashboard');
  };

  return (
    <div className={clsx("w-full md:w-80 bg-aura-panel border-r border-aura-border flex-col h-full shrink-0 flex", className)}>
      <div className="p-4 border-b border-aura-border flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(155,89,182,0.12) 0%, rgba(236,72,153,0.08) 100%)' }}>
        <div className="flex items-center gap-2.5">
          {/* Kawaii icon */}
          <img src="/auralink-icon.jpeg" alt="AuraLink" className="w-9 h-9 object-contain mix-blend-screen shrink-0" />
          {/* Brand text logo */}
          <img src="/auralink-logo.jpeg" alt="AuraLink" className="h-7 object-contain mix-blend-screen" style={{ filter: 'brightness(1.1) drop-shadow(0 1px 6px rgba(155,89,182,0.5))' }} />
        </div>
      </div>
      <div className="p-4 border-b border-aura-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-aura-primary flex items-center justify-center border border-white/10">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-lg">{user?.username[0].toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2 className="text-white font-medium">{user?.username}</h2>
            <span className="text-xs text-aura-teal">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={fetchDiscoverUsers} className="p-2 text-aura-teal hover:text-white transition-colors" title="Discover Friends">
            <UserPlus size={18} />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 text-aura-lavender/50 hover:text-white transition-colors" title="Settings">
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <form onSubmit={handleSearch} className="relative" autoComplete="off">
          {/* Aggressive Honeypot: Using zero-size absolute container with non-display:none to trick detectors */}
          <div className="absolute overflow-hidden w-[1px] h-[1px] -left-[1000px] pointer-events-none" aria-hidden="true">
            <input type="text" name="fake_un" autoComplete="username" tabIndex={-1} />
            <input type="password" name="fake_pw" autoComplete="current-password" tabIndex={-1} />
          </div>
          
          <input 
            type="text" 
            name={`aura_search_${Math.random().toString(36).substring(7)}`}
            placeholder="Search users..." 
            className="w-full bg-aura-navy border border-aura-border rounded-xl pl-10 pr-10 py-2.5 flex-1 text-sm text-white focus:outline-none focus:border-aura-primary transition-all shadow-inner"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoComplete="new-password"
            inputMode="search"
            autoCorrect="off"
            spellCheck="false"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
          />
          <Search size={16} className="absolute left-3 top-3 text-aura-lavender/40" />
          {search && (
            <button 
              type="button" 
              onClick={() => { setSearch(''); setResults([]); }}
              className="absolute right-3 top-3 text-aura-lavender/40 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </form>
      </div>

      {results.length > 0 && (
        <div className="mx-4 mb-4 bg-aura-navy/80 backdrop-blur-sm rounded-xl p-3 flex flex-col gap-2 border border-aura-primary/20 shadow-xl animate-in zoom-in-95 duration-200">
          <p className="text-[10px] text-aura-primary uppercase tracking-widest px-1 font-black">Found on AuraLink</p>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {results.map(r => (
              <div key={r.id} className="flex items-center justify-between p-2 hover:bg-aura-primary/10 rounded-lg transition-colors border border-transparent hover:border-aura-primary/10 group">
                <div className="flex items-center gap-2">
                  <ActionMojiAvatar 
                    state="idle" 
                    username={r.username} 
                    avatarUrl={r.avatar_url} 
                    size="xs" 
                    showStatusRing={false}
                  />
                  <span className="text-sm font-semibold text-white group-hover:text-aura-primary transition-colors">{r.username}</span>
                </div>
                <button onClick={() => addFriend(r.id)} className="bg-aura-primary text-white p-1.5 rounded-lg shadow-lg shadow-aura-primary/20 hover:scale-110 active:scale-95 transition-all">
                  <UserPlus size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {/* Personal Space */}
        <div className="mb-4 mt-4 px-2">
          <button 
            onClick={() => navigate('/dashboard/personal')}
            className={clsx(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all border",
              location.pathname === '/dashboard/personal' 
                ? "bg-aura-primary/10 border-aura-primary/30 text-white" 
                : "bg-aura-navy border-aura-border text-aura-lavender/70 hover:bg-aura-border hover:text-white"
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-aura-primary flex items-center justify-center text-white shrink-0">
              <Shield size={16} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm text-white">Personal Space</p>
              <p className="text-[10px] uppercase tracking-widest text-aura-primary">Private Area</p>
            </div>
          </button>
        </div>

        {/* Friend Requests Section */}
        {connections.some(c => c.status === 'pending' && (c.user2_id === user?.id || c.user2?.id === user?.id)) && (
          <div className="mb-6">
            <p className="text-xs text-aura-teal uppercase tracking-widest px-2 mb-2 font-bold flex items-center gap-2">
              <Bell size={12} className="animate-bounce" /> Friend Requests
            </p>
            <div className="space-y-1">
              {connections.filter(c => c.status === 'pending' && (c.user2_id === user?.id || c.user2?.id === user?.id)).map(conn => {
                const partner = conn.user1;
                return (
                  <div key={conn.id} className="flex items-center justify-between p-3 bg-aura-primary/5 rounded-xl border border-aura-primary/20">
                    <div className="flex items-center gap-3">
                      <ActionMojiAvatar
                        state="offline"
                        username={partner?.username || 'User'}
                        avatarUrl={partner?.avatarUrl || partner?.avatar_url}
                        size="xs"
                        showStatusRing={false}
                      />
                      <span className="text-sm font-medium text-white">{partner?.username}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => rejectFriend(conn.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"><X size={16} /></button>
                      <button onClick={() => acceptFriend(conn.id)} className="p-1.5 text-aura-teal hover:bg-aura-teal/10 rounded-lg"><Check size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-aura-lavender/40 uppercase tracking-widest px-2 mb-2 font-semibold">Connections</p>
        <div className="space-y-1">
          {connections.map(conn => {
            const user1Id = conn.user1Id ?? conn.user1_id;
            const user2Id = conn.user2Id ?? conn.user2_id;
            const isUser1 = user1Id === user?.id;
            const partner = isUser1 ? conn.user2 : conn.user1;
            if (!partner) return null;
            const isPending = conn.status === 'pending';
            const canAccept = isPending && !isUser1;
            const isAuraBot = partner.username === 'AuraBot';
            const status = partnerStatus[partner.id] || (isAuraBot ? 'online' : 'offline');
            
            return (
              <div 
                key={conn.id} 
                onClick={() => navigate(`/dashboard/c/${conn.id}`)}
                className={clsx(
                  "flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer group",
                  conn.id === connectionId ? "bg-aura-primary/10 border-aura-primary/20" : "hover:bg-aura-navy active:scale-[0.98]",
                  isPending && !canAccept && "opacity-70"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    <ActionMojiAvatar 
                      state={isPending ? 'offline' : status} 
                      username={partner.username} 
                      avatarUrl={partner.avatarUrl || partner.avatar_url}
                      size="sm" 
                      showStatusRing={!isPending && status !== 'offline'}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white flex items-center gap-2">
                      {partner.username}
                      {isAuraBot && <span className="text-[10px] bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded-full">AI</span>}
                    </h3>
                    {isPending ? (
                      <span className={clsx("text-xs flex items-center gap-1", canAccept ? "text-aura-primary font-bold animate-pulse" : "text-orange-400")}>
                        <Clock size={12}/> {canAccept ? 'New Request' : 'Pending'}
                      </span>
                    ) : (
                      <span className="text-xs text-aura-lavender/50 truncate w-24 block">
                        {status === 'typing' ? 'Typing...' : status === 'reading_chat' ? 'Reading chat' : status === 'browsing_files' ? 'In vault' : status === 'viewing_notes' ? 'Editing notes' : status === 'timetable_open' ? 'Viewing timetable' : status}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {canAccept && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); rejectFriend(conn.id); }} 
                        className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                        title="Reject"
                      >
                        <X size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); acceptFriend(conn.id); }} 
                        className="w-8 h-8 rounded-full bg-aura-primary/20 text-aura-primary flex items-center justify-center hover:bg-aura-primary hover:text-white transition-colors"
                        title="Accept"
                      >
                        <Check size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Discover More Card */}
        {connections.length < 5 && !search && (
          <div className="mx-4 mt-6 p-4 rounded-2xl bg-gradient-to-br from-aura-primary/20 to-aura-pink/20 border border-white/10 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all" />
            <h4 className="text-white font-bold text-sm mb-1 relative z-10">Expand your Aura</h4>
            <p className="text-aura-lavender/60 text-[11px] mb-3 relative z-10">Connect with other people on the ecosystem.</p>
            <button 
              onClick={fetchDiscoverUsers}
              className="w-full py-2 bg-white text-aura-navy rounded-xl text-xs font-black shadow-lg hover:shadow-white/20 active:scale-95 transition-all relative z-10"
            >
              EXPLORE PEOPLE
            </button>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-aura-panel w-full max-w-md rounded-2xl border border-aura-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-aura-border flex items-center justify-between bg-aura-navy/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings size={20} className="text-aura-primary" /> Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-1.5 text-aura-lavender/50 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-6">
              {/* Profile Section */}
              <div>
                <h3 className="text-xs font-bold text-aura-lavender/50 uppercase tracking-wider mb-3">Account</h3>
                {isEditing ? (
                  <div className="space-y-4 bg-aura-navy p-4 rounded-xl border border-aura-primary/30">
                    <div>
                      <label className="text-[10px] text-aura-lavender/50 uppercase mb-1 block">Username</label>
                      <input 
                        value={newUsername} 
                        onChange={e => setNewUsername(e.target.value)}
                        className="w-full bg-aura-panel border border-aura-border rounded-lg px-3 py-2 text-white text-sm focus:border-aura-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-aura-lavender/50 uppercase mb-2 block">Choose Avatar</label>
                      <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto p-1">
                        {[...girlAvatars, ...boyAvatars].map((url, i) => (
                          <button 
                            key={i} 
                            onClick={() => setNewAvatar(url)}
                            className={clsx("w-10 h-10 rounded-lg border-2 transition-all overflow-hidden", newAvatar === url ? "border-aura-primary scale-110" : "border-transparent hover:border-white/20")}
                          >
                            <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => setIsEditing(false)} className="flex-1 text-xs text-aura-lavender/50 py-2 hover:text-white transition-colors">Cancel</button>
                      <button onClick={handleUpdateProfile} className="flex-1 bg-aura-primary text-white text-xs py-2 rounded-lg font-bold">Save Changes</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 bg-aura-navy p-3 rounded-xl border border-aura-border">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-aura-primary flex items-center justify-center border border-white/10">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-xl">{user?.username[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{user?.username}</p>
                      <p className="text-xs text-aura-lavender/50">Free Tier Member</p>
                    </div>
                    <button onClick={() => { setIsEditing(true); setNewUsername(user?.username || ''); setNewAvatar(user?.avatarUrl || ''); }} className="ml-auto text-xs bg-aura-border hover:bg-white/10 text-white px-3 py-1.5 rounded-lg transition-colors">Edit</button>
                  </div>
                )}
              </div>

              {/* Preferences */}
              <div>
                <h3 className="text-xs font-bold text-aura-lavender/50 uppercase tracking-wider mb-3">Preferences</h3>
                <div className="space-y-2">
                  <button 
                    onClick={toggleFocusMode}
                    className={clsx("w-full flex items-center justify-between p-3 rounded-xl border transition-colors", focusMode ? "bg-aura-primary/10 border-aura-primary/30" : "bg-aura-navy hover:bg-aura-border border-aura-border")}
                  >
                    <div className="flex items-center gap-3 text-white"><BookOpen size={18} className={focusMode ? "text-aura-primary" : "text-gray-400"} /> Focus Mode</div>
                    <span className="text-xs font-medium text-aura-lavender/50">{focusMode ? "On" : "Off"}</span>
                  </button>
                  <button 
                    onClick={toggleNotifications}
                    className={clsx("w-full flex items-center justify-between p-3 rounded-xl border transition-colors", notificationsEnabled ? "bg-aura-navy hover:bg-aura-border border-aura-border" : "bg-red-500/10 border-red-500/30")}
                  >
                    <div className="flex items-center gap-3 text-white"><Bell size={18} className={notificationsEnabled ? "text-aura-teal" : "text-red-400"} /> Notifications</div>
                    <span className="text-xs font-medium text-aura-lavender/50">{notificationsEnabled ? "Enabled" : "Muted"}</span>
                  </button>
                  <button 
                    onClick={handleInstallApp}
                    className="w-full flex items-center justify-between p-3 bg-aura-navy hover:bg-aura-border rounded-xl border border-aura-border transition-colors"
                  >
                    <div className="flex items-center gap-3 text-white"><Monitor size={18} className="text-pink-400" /> Install App</div>
                    <span className="text-xs text-aura-lavender/50 text-right max-w-[120px] truncate">{isInstalled ? "Installed" : "PWA"}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-aura-border bg-aura-navy/50">
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl transition-colors border border-red-500/20">
                <LogOut size={18} /> Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discover Modal */}
      {showDiscover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-aura-panel w-full max-w-md rounded-2xl border border-aura-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-aura-border flex items-center justify-between bg-aura-navy/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus size={20} className="text-aura-teal" /> Discover People</h2>
              <button onClick={() => setShowDiscover(false)} className="p-1.5 text-aura-lavender/50 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
              {allUsers.length === 0 ? (
                <p className="text-center text-aura-lavender/40 py-8">No other users found yet.</p>
              ) : (
                allUsers.map(u => {
                  const existingConn = connections.find(c => 
                    (c.user1_id === u.id || c.user2_id === u.id) && !c.isVirtual
                  );
                  return (
                    <div key={u.id} className="flex items-center gap-3 bg-aura-navy p-3 rounded-xl border border-aura-border">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="shrink-0">
                          <ActionMojiAvatar
                            state="offline"
                            username={u.username}
                            avatarUrl={u.avatarUrl || u.avatar_url}
                            size="xs"
                            showStatusRing={false}
                          />
                        </div>
                        <span className="text-white font-medium truncate min-w-0">{u.username}</span>
                      </div>
                      <div className="shrink-0 ml-2">
                        {existingConn ? (
                          <span className="text-xs text-aura-lavender/40 whitespace-nowrap px-3 py-1 bg-white/5 rounded-lg block">
                            {existingConn.status === 'pending' ? 'Pending' : 'Connected'}
                          </span>
                        ) : (
                          <button 
                            onClick={() => { addFriend(u.id); setShowDiscover(false); }}
                            className="text-xs bg-aura-primary hover:bg-aura-primary/80 text-white whitespace-nowrap px-3 py-1.5 rounded-lg transition-colors font-semibold active:scale-95"
                          >
                            Add Friend
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-4 border-t border-aura-border bg-aura-navy/50 text-center">
              <p className="text-[10px] text-aura-lavender/40 uppercase tracking-widest">Connect with other AuraLink users</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
