import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatWorkspace from './ChatWorkspace';
import PersonalWorkspace from './PersonalWorkspace';
import { SocketProvider } from '../components/SocketProvider';
import clsx from 'clsx';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const [connections, setConnections] = useState<any[]>([]);
  const location = useLocation();
  const isChat = location.pathname.startsWith('/dashboard/c/');
  const { user } = useAuthStore();

  const fetchConnections = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('connections')
      .select(`
        id, status, created_at,
        user1_id, user2_id,
        user1:users!connections_user1_id_fkey(id, username, avatar_url),
        user2:users!connections_user2_id_fkey(id, username, avatar_url)
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
    if (!error && data) {
      setConnections(data);
    }
  };

  useEffect(() => {
    fetchConnections();
    
    if (user?.id) {
      const sub = supabase.channel('public:connections')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
          fetchConnections();
        })
        .subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, [user?.id]);

  return (
    <SocketProvider>
      <div className="flex h-screen bg-aura-navy border-t border-aura-border">
        <Sidebar connections={connections} onRefresh={fetchConnections} className={isChat ? "hidden md:flex" : "flex"} />
        <main className={clsx("flex-1 overflow-hidden bg-[#151525]", isChat || location.pathname === '/dashboard/personal' ? "flex" : "hidden md:flex")}>
          <Routes>
            <Route path="/" element={<div className="flex-1 flex items-center justify-center text-aura-lavender/50 text-center px-4">Select a connection or your personal workspace to start</div>} />
            <Route path="/c/:id" element={<ChatWorkspace connections={connections} />} />
            <Route path="/personal" element={<PersonalWorkspace />} />
          </Routes>
        </main>
      </div>
    </SocketProvider>
  );
}
