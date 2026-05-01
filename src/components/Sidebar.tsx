import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Search, UserPlus, LogOut, Check, Clock, Settings, X, Bell, Palette, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useSocket } from './SocketProvider';

export default function Sidebar({ connections, onRefresh, className }: { connections: any[], onRefresh: () => void, className?: string }) {
  const { user, logout } = useAuthStore();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();
  const { partnerStatus } = useSocket();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search) return setResults([]);
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/users/search?q=${search}`, { headers: { 'Authorization': `Bearer ${token}` }});
    setResults(await res.json());
  };

  const addFriend = async (targetUserId: string) => {
    const token = localStorage.getItem('token');
    await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ targetUserId })
    });
    setSearch('');
    setResults([]);
    onRefresh();
  };

  const acceptFriend = async (id: string) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/connections/${id}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    onRefresh();
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
          <div className="w-10 h-10 rounded-full bg-aura-primary flex items-center justify-center text-white font-bold text-lg">
            {user?.username[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-white font-medium">{user?.username}</h2>
            <span className="text-xs text-aura-teal">Online</span>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2 text-aura-lavender/50 hover:text-white transition-colors" title="Settings">
          <Settings size={18} />
        </button>
      </div>

      <div className="p-4">
        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text" 
            placeholder="Find by username..." 
            className="w-full bg-aura-navy border border-aura-border rounded-lg pl-10 pr-4 py-2 flex-1 text-sm text-white focus:outline-none focus:border-aura-primary transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Search size={16} className="absolute left-3 top-2.5 text-aura-lavender/40" />
        </form>
      </div>

      {results.length > 0 && (
        <div className="mx-4 mb-4 bg-aura-navy rounded-lg p-2 flex flex-col gap-2 border border-aura-border">
          <p className="text-xs text-aura-lavender/40 uppercase tracking-widest px-2 font-semibold">Search Results</p>
          {results.map(r => (
            <div key={r.id} className="flex items-center justify-between p-2 hover:bg-aura-border rounded-md transition-colors">
              <span className="text-sm font-medium text-white">{r.username}</span>
              <button onClick={() => addFriend(r.id)} className="text-aura-primary hover:text-white p-1">
                <UserPlus size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <p className="text-xs text-aura-lavender/40 uppercase tracking-widest px-2 mb-2 mt-4 font-semibold">Connections</p>
        <div className="space-y-1">
          {connections.map(conn => {
            const isUser1 = conn.user1Id === user?.id;
            const partner = isUser1 ? conn.user2 : conn.user1;
            const isPending = conn.status === 'pending';
            const canAccept = isPending && !isUser1;
            const status = partnerStatus[partner.id] || 'offline';
            const isAuraBot = partner.username === 'AuraBot';
            
            return (
              <div 
                key={conn.id} 
                onClick={() => !isPending && navigate(`/dashboard/c/${conn.id}`)}
                className={clsx(
                  "flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer group",
                  isPending ? "bg-aura-navy/50 opacity-70" : "hover:bg-aura-navy cursor-pointer active:scale-[0.98]"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-white font-medium relative", isAuraBot ? "bg-gradient-to-br from-pink-500 to-aura-primary" : "bg-aura-border")}>
                    {partner.username[0].toUpperCase()}
                    {!isPending && status !== 'offline' && !isAuraBot && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-aura-teal border-2 border-aura-panel rounded-full"></span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white flex items-center gap-2">
                      {partner.username}
                      {isAuraBot && <span className="text-[10px] bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded-full">AI</span>}
                    </h3>
                    {isPending ? (
                      <span className="text-xs flex items-center gap-1 text-orange-400"><Clock size={12}/> Pending</span>
                    ) : (
                      <span className="text-xs text-aura-lavender/50 truncate w-24 block">
                        {status === 'typing' ? 'Typing...' : status === 'reading_chat' ? 'Reading chat' : status === 'browsing_files' ? 'In vault' : status === 'viewing_notes' ? 'Editing notes' : status === 'timetable_open' ? 'Viewing timetable' : status}
                      </span>
                    )}
                  </div>
                </div>
                {canAccept && (
                  <button onClick={(e) => { e.stopPropagation(); acceptFriend(conn.id); }} className="w-8 h-8 rounded-full bg-aura-primary/20 text-aura-primary flex items-center justify-center hover:bg-aura-primary hover:text-white transition-colors">
                    <Check size={16} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
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
                <div className="flex items-center gap-4 bg-aura-navy p-3 rounded-xl border border-aura-border">
                  <div className="w-12 h-12 rounded-full bg-aura-primary flex items-center justify-center text-white font-bold text-xl">
                    {user?.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user?.username}</p>
                    <p className="text-xs text-aura-lavender/50">Free Tier Member</p>
                  </div>
                  <button className="ml-auto text-xs bg-aura-border hover:bg-white/10 text-white px-3 py-1.5 rounded-lg transition-colors">Edit</button>
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h3 className="text-xs font-bold text-aura-lavender/50 uppercase tracking-wider mb-3">Preferences</h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center justify-between p-3 bg-aura-navy hover:bg-aura-border rounded-xl border border-aura-border transition-colors">
                    <div className="flex items-center gap-3 text-white"><Palette size={18} className="text-pink-400" /> Theme</div>
                    <span className="text-xs text-aura-lavender/50">Dark Mode</span>
                  </button>
                  <button className="w-full flex items-center justify-between p-3 bg-aura-navy hover:bg-aura-border rounded-xl border border-aura-border transition-colors">
                    <div className="flex items-center gap-3 text-white"><Bell size={18} className="text-aura-teal" /> Notifications</div>
                    <span className="text-xs text-aura-lavender/50">Enabled</span>
                  </button>
                  <button className="w-full flex items-center justify-between p-3 bg-aura-navy hover:bg-aura-border rounded-xl border border-aura-border transition-colors">
                    <div className="flex items-center gap-3 text-white"><Shield size={18} className="text-blue-400" /> Privacy</div>
                    <span className="text-xs text-aura-lavender/50">&gt;</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-aura-border bg-aura-navy/50">
              <button onClick={logout} className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl transition-colors border border-red-500/20">
                <LogOut size={18} /> Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
