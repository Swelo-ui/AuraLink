import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Search, UserPlus, LogOut, Check, Clock, Settings, X, Bell, BookOpen, Monitor } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { useSocket } from './SocketProvider';
import { supabase } from '../lib/supabaseClient';
import ActionMojiAvatar from './ActionMojiAvatar';

export default function Sidebar({ connections, onRefresh, isLoading = false, className }: { connections: any[], onRefresh: () => void, isLoading?: boolean, className?: string }) {
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

    if (window.matchMedia('(display-mode: standalone)').matches) {
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
    if (isInstalled) { setInstallHint('App is already installed.'); return; }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') { setDeferredPrompt(null); setInstallHint('Installing...'); }
      else { setInstallHint('Install cancelled. You can try again.'); }
      return;
    }
    setInstallHint('Install prompt not ready. In Chrome, tap menu → Add to Home screen.');
  };

  const toggleNotifications = async () => {
    const newVal = !notificationsEnabled;
    setNotificationsEnabled(newVal);
    localStorage.setItem('aura_notifications', newVal.toString());

    if (newVal && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'denied') {
        alert('Notifications are blocked. Please allow them in site settings.');
        return;
      }
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
          if (subscription && user?.id) {
            const subData = subscription.toJSON();
            await supabase.from('push_subscriptions').upsert({
              user_id: user.id,
              endpoint: subData.endpoint as string,
              auth: subData.keys?.auth as string,
              p256dh: subData.keys?.p256dh as string,
            } as any, { onConflict: 'endpoint' });
          }
        }
      } catch (e) { console.error('Push subscription failed:', e); }
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

  const marvelAvatars = [
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=IronMan&backgroundColor=ffdfbf',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Spiderman&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=CaptainAmerica&backgroundColor=c0aede',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Thor&backgroundColor=d1d4f9',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Hulk&backgroundColor=ffd5dc',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=BlackWidow&backgroundColor=ffdfbf',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=BlackPanther&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Strange&backgroundColor=c0aede',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Wolverine&backgroundColor=d1d4f9',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Deadpool&backgroundColor=ffd5dc',
  ];
  const animeAvatars = [
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Naruto&backgroundColor=ffdfbf',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Goku&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Luffy&backgroundColor=c0aede',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Sasuke&backgroundColor=d1d4f9',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Vegeta&backgroundColor=ffd5dc',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Itachi&backgroundColor=ffdfbf',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Gojo&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Sukuna&backgroundColor=c0aede',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Zoro&backgroundColor=d1d4f9',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Eren&backgroundColor=ffd5dc',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Mikasa&hair=short&hairColor=2c3e50',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Levi&hair=short&hairColor=2c3e50'
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = search.trim();
    if (!query) return setResults([]);
    const { data } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .ilike('username', `%${query}%`)
      .neq('id', user?.id ?? '')
      .limit(15);
    if (data) setResults(data);
  };

  const fetchDiscoverUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .neq('id', user?.id ?? '')
      .limit(20);
    if (data) setAllUsers(data);
    setShowDiscover(true);
  };

  const addFriend = async (targetUserId: string) => {
    if (!user?.id) return;
    const { data: existing } = await supabase
      .from('connections')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${user.id})`)
      .single();
    if (existing) {
      navigate(`/dashboard/c/${existing.id}`);
      setSearch(''); setResults([]);
      return;
    }
    const { data } = await supabase.from('connections').insert([
      { user1_id: user.id, user2_id: targetUserId, status: 'pending' }
    ]).select().single();
    if (data) navigate(`/dashboard/c/${data.id}`);
    setSearch(''); setResults([]);
  };

  const acceptFriend = async (id: string) => {
    await supabase.from('connections').update({ status: 'accepted' }).eq('id', id);
    onRefresh();
  };

  const rejectFriend = async (id: string) => {
    await supabase.from('connections').delete().eq('id', id);
    onRefresh();
    navigate('/dashboard');
  };

  return (
    <div className={clsx("w-full md:w-80 bg-aura-panel flex-col h-full shrink-0 flex border-r border-aura-border/50", className)}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-aura-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-aura-primary/20 shrink-0">
            <img src="/auralink-logo.png" alt="AuraLink" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-white font-bold text-lg tracking-tight">AuraLink</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={fetchDiscoverUsers} className="p-2.5 text-aura-lavender/50 hover:text-aura-primary hover:bg-aura-primary/10 transition-all rounded-xl" title="Discover">
            <UserPlus size={18} />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 text-aura-lavender/50 hover:text-aura-primary hover:bg-aura-primary/10 transition-all rounded-xl" title="Settings">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Profile Quick View */}
      <div className="px-5 py-3 border-b border-aura-border/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-aura-surface flex items-center justify-center ring-2 ring-aura-primary/20">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-base">{user?.username[0].toUpperCase()}</span>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full status-online" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{user?.username}</p>
            <p className="text-[11px] text-aura-teal font-medium">Online</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <form onSubmit={handleSearch} className="relative" autoComplete="off">
          <div className="absolute overflow-hidden w-[1px] h-[1px] -left-[1000px] pointer-events-none" aria-hidden="true">
            <input type="text" name="fake_un" autoComplete="username" tabIndex={-1} />
            <input type="password" name="fake_pw" autoComplete="current-password" tabIndex={-1} />
          </div>
          <input
            type="text"
            name={`aura_search_${Math.random().toString(36).substring(7)}`}
            placeholder="Search people..."
            className="w-full bg-aura-navy/60 border border-aura-border/50 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-aura-primary/50 focus:ring-2 focus:ring-aura-primary/10 transition-all placeholder:text-aura-lavender/30"
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
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-aura-lavender/40" />
          {search && (
            <button type="button" onClick={() => { setSearch(''); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-aura-lavender/40 hover:text-white">
              <X size={14} />
            </button>
          )}
        </form>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="mx-4 mb-3 bg-aura-surface rounded-xl p-3 flex flex-col gap-2 border border-aura-primary/15 shadow-lg animate-fade-in-up">
          <p className="text-[10px] text-aura-primary uppercase tracking-widest px-1 font-bold">Search Results</p>
          <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-none">
            {results.map(r => (
              <div key={r.id} className="flex items-center justify-between p-2.5 hover:bg-aura-primary/5 rounded-lg transition-colors group">
                <div className="flex items-center gap-2.5">
                  <ActionMojiAvatar state="idle" username={r.username} avatarUrl={r.avatar_url} size="xs" showStatusRing={false} />
                  <span className="text-sm font-medium text-white">{r.username}</span>
                </div>
                <button onClick={() => addFriend(r.id)} className="p-2 bg-aura-primary text-white rounded-lg shadow-sm hover:shadow-md hover:shadow-aura-primary/20 active:scale-95 transition-all">
                  <UserPlus size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connections List */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4 scrollbar-none">
        {/* Personal Space */}
        <div className="mb-3 mt-1">
          <button
            onClick={() => navigate('/dashboard/personal')}
            className={clsx(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all card-interactive",
              location.pathname === '/dashboard/personal'
                ? "bg-aura-primary/10 border border-aura-primary/25 shadow-sm shadow-aura-primary/10"
                : "bg-aura-surface/50 border border-transparent hover:bg-aura-surface hover:border-aura-border/50"
            )}
          >
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white shrink-0 shadow-sm">
              <BookOpen size={18} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold text-sm text-white">Personal Space</p>
              <p className="text-[11px] text-aura-primary-light font-medium">Notes · Timetable · Vault</p>
            </div>
          </button>
        </div>

        {/* Friend Requests */}
        {connections.some(c => c.status === 'pending' && (c.user2_id === user?.id || c.user2?.id === user?.id)) && (
          <div className="mb-4">
            <p className="text-[11px] text-aura-primary uppercase tracking-wider px-2 mb-2 font-bold flex items-center gap-1.5">
              <Bell size={11} className="animate-bounce" /> Requests
            </p>
            <div className="space-y-1.5">
              {connections.filter(c => c.status === 'pending' && (c.user2_id === user?.id || c.user2?.id === user?.id)).map(conn => {
                const partner = conn.user1;
                return (
                  <div key={conn.id} className="flex items-center justify-between p-3 bg-aura-surface/80 rounded-xl border border-aura-primary/15">
                    <div className="flex items-center gap-2.5">
                      <ActionMojiAvatar state="offline" username={partner?.username || 'User'} avatarUrl={partner?.avatarUrl || partner?.avatar_url} size="xs" showStatusRing={false} />
                      <span className="text-sm font-medium text-white">{partner?.username}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => rejectFriend(conn.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><X size={16} /></button>
                      <button onClick={() => acceptFriend(conn.id)} className="p-2 text-aura-teal hover:bg-aura-teal/10 rounded-lg transition-colors"><Check size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-[11px] text-aura-lavender/40 uppercase tracking-wider px-2 mb-2 font-semibold">Chats</p>
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
                  "flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer card-interactive",
                  conn.id === connectionId
                    ? "bg-aura-primary/10 border border-aura-primary/20"
                    : "hover:bg-aura-surface/60 border border-transparent",
                  isPending && !canAccept && "opacity-60"
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="shrink-0">
                    <ActionMojiAvatar
                      state={isPending ? 'offline' : status}
                      username={partner.username}
                      avatarUrl={partner.avatarUrl || partner.avatar_url}
                      size="sm"
                      showStatusRing={!isPending && status !== 'offline'}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 truncate">
                      <span className="truncate">{partner.username}</span>
                      {isAuraBot && <span className="text-[9px] bg-aura-primary/15 text-aura-primary-light px-1.5 py-0.5 rounded-md font-bold shrink-0">AI</span>}
                    </h3>
                    {isPending ? (
                      <span className={clsx("text-[11px] flex items-center gap-1", canAccept ? "text-aura-primary font-semibold" : "text-aura-warning")}>
                        <Clock size={10} /> {canAccept ? 'New Request' : 'Pending'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-aura-lavender/40 truncate block font-medium">
                        {status === 'typing' ? 'Typing...' : status === 'reading_chat' ? 'Reading chat' : status === 'browsing_files' ? 'In vault' : status === 'viewing_notes' ? 'Editing notes' : status === 'timetable_open' ? 'Viewing timetable' : status}
                      </span>
                    )}
                  </div>
                </div>
                {canAccept && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); rejectFriend(conn.id); }} className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" title="Reject"><X size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); acceptFriend(conn.id); }} className="w-8 h-8 rounded-full bg-aura-primary/15 text-aura-primary flex items-center justify-center hover:bg-aura-primary hover:text-white transition-colors" title="Accept"><Check size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Discover Card */}
        {connections.length < 5 && !search && (
          <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-aura-primary/10 to-aura-pink/5 border border-aura-primary/15 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-aura-primary/5 rounded-full blur-2xl" />
            <h4 className="text-white font-bold text-sm mb-1 relative z-10">Find Friends</h4>
            <p className="text-aura-lavender/50 text-[11px] mb-3 relative z-10">Connect with other people on AuraLink.</p>
            <button
              onClick={fetchDiscoverUsers}
              className="w-full py-2.5 gradient-primary text-white rounded-xl text-xs font-bold shadow-md shadow-aura-primary/20 active:scale-95 transition-all relative z-10"
            >
              Explore People
            </button>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-aura-panel w-full max-w-md rounded-t-3xl md:rounded-2xl border border-aura-border/50 shadow-2xl overflow-hidden flex flex-col max-h-[85dvh]">
            <div className="p-4 border-b border-aura-border/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings size={18} className="text-aura-primary" /> Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 text-aura-lavender/50 hover:text-white hover:bg-aura-surface rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-5 scrollbar-none">
              {/* Profile */}
              <div>
                <h3 className="text-[11px] font-bold text-aura-lavender/40 uppercase tracking-wider mb-3">Account</h3>
                {isEditing ? (
                  <div className="space-y-4 bg-aura-surface p-4 rounded-xl border border-aura-primary/20">
                    <div>
                      <label className="text-[11px] text-aura-lavender/50 font-medium mb-1.5 block">Username</label>
                      <input value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-aura-navy border border-aura-border rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-aura-primary focus:ring-2 focus:ring-aura-primary/10 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] text-aura-lavender/50 font-medium mb-2 block">Choose Avatar</label>
                      <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto p-1 scrollbar-none">
                        {[...marvelAvatars, ...animeAvatars].map((url, i) => (
                          <button key={i} onClick={() => setNewAvatar(url)} className={clsx("w-10 h-10 rounded-lg border-2 transition-all overflow-hidden", newAvatar === url ? "border-aura-primary scale-110 shadow-md shadow-aura-primary/20" : "border-transparent hover:border-aura-border")}>
                            <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setIsEditing(false)} className="flex-1 text-xs text-aura-lavender/50 py-2.5 hover:text-white transition-colors rounded-xl border border-aura-border">Cancel</button>
                      <button onClick={handleUpdateProfile} className="flex-1 gradient-primary text-white text-xs py-2.5 rounded-xl font-bold shadow-sm">Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-aura-surface p-3.5 rounded-xl border border-aura-border/50">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-aura-primary/20 flex items-center justify-center ring-2 ring-aura-primary/20">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-lg">{user?.username[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm">{user?.username}</p>
                      <p className="text-[11px] text-aura-lavender/40">Free Tier</p>
                    </div>
                    <button onClick={() => { setIsEditing(true); setNewUsername(user?.username || ''); setNewAvatar(user?.avatarUrl || ''); }} className="text-xs bg-aura-surface hover:bg-aura-border text-aura-lavender/70 hover:text-white px-3 py-2 rounded-lg transition-colors border border-aura-border/50 font-medium">Edit</button>
                  </div>
                )}
              </div>

              {/* Preferences */}
              <div>
                <h3 className="text-[11px] font-bold text-aura-lavender/40 uppercase tracking-wider mb-3">Preferences</h3>
                <div className="space-y-2">
                  <button onClick={toggleFocusMode} className={clsx("w-full flex items-center justify-between p-3.5 rounded-xl border transition-all", focusMode ? "bg-aura-primary/8 border-aura-primary/20" : "bg-aura-surface border-aura-border/50 hover:border-aura-border")}>
                    <div className="flex items-center gap-3 text-white"><BookOpen size={18} className={focusMode ? "text-aura-primary" : "text-aura-lavender/40"} /><span className="text-sm font-medium">Focus Mode</span></div>
                    <span className={clsx("text-[11px] font-semibold px-2 py-0.5 rounded-md", focusMode ? "bg-aura-primary/15 text-aura-primary" : "text-aura-lavender/40")}>{focusMode ? "On" : "Off"}</span>
                  </button>
                  <button onClick={toggleNotifications} className={clsx("w-full flex items-center justify-between p-3.5 rounded-xl border transition-all", notificationsEnabled ? "bg-aura-surface border-aura-border/50 hover:border-aura-border" : "bg-red-500/5 border-red-500/20")}>
                    <div className="flex items-center gap-3 text-white"><Bell size={18} className={notificationsEnabled ? "text-aura-teal" : "text-red-400"} /><span className="text-sm font-medium">Notifications</span></div>
                    <span className={clsx("text-[11px] font-semibold px-2 py-0.5 rounded-md", notificationsEnabled ? "bg-aura-teal/10 text-aura-teal" : "bg-red-500/10 text-red-400")}>{notificationsEnabled ? "On" : "Muted"}</span>
                  </button>
                  <button onClick={handleInstallApp} className="w-full flex items-center justify-between p-3.5 bg-aura-surface hover:border-aura-border rounded-xl border border-aura-border/50 transition-all">
                    <div className="flex items-center gap-3 text-white"><Monitor size={18} className="text-aura-pink" /><span className="text-sm font-medium">Install App</span></div>
                    <span className="text-[11px] text-aura-lavender/40 font-medium">{isInstalled ? "Installed" : "PWA"}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-aura-border/50">
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/8 hover:bg-red-500/15 text-red-400 font-semibold rounded-xl transition-colors border border-red-500/15 text-sm">
                <LogOut size={16} /> Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discover Modal */}
      {showDiscover && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-aura-panel w-full max-w-md rounded-t-3xl md:rounded-2xl border border-aura-border/50 shadow-2xl overflow-hidden flex flex-col max-h-[80dvh]">
            <div className="p-4 border-b border-aura-border/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus size={18} className="text-aura-teal" /> Discover People</h2>
              <button onClick={() => setShowDiscover(false)} className="p-2 text-aura-lavender/50 hover:text-white hover:bg-aura-surface rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-2 scrollbar-none">
              {allUsers.length === 0 ? (
                <p className="text-center text-aura-lavender/40 py-8 text-sm">No other users found yet.</p>
              ) : (
                allUsers.map(u => {
                  const existingConn = connections.find(c => (c.user1_id === u.id || c.user2_id === u.id) && !c.isVirtual);
                  return (
                    <div key={u.id} className="flex items-center gap-3 bg-aura-surface p-3 rounded-xl border border-aura-border/50">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ActionMojiAvatar state="offline" username={u.username} avatarUrl={u.avatarUrl || u.avatar_url} size="xs" showStatusRing={false} />
                        <span className="text-white font-medium text-sm truncate">{u.username}</span>
                      </div>
                      <div className="shrink-0">
                        {existingConn ? (
                          <span className="text-[11px] text-aura-lavender/40 px-3 py-1.5 bg-aura-navy/50 rounded-lg font-medium">
                            {existingConn.status === 'pending' ? 'Pending' : 'Connected'}
                          </span>
                        ) : (
                          <button onClick={() => { addFriend(u.id); setShowDiscover(false); }} className="text-[11px] gradient-primary text-white px-3 py-1.5 rounded-lg font-bold active:scale-95 transition-all shadow-sm">
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
