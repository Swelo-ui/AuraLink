import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatWorkspace from './ChatWorkspace';
import PersonalWorkspace from './PersonalWorkspace.tsx';
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
    
    // 1. Fetch real connections
    const { data: realConnections, error } = await supabase
      .from('connections')
      .select(`
        id, status, created_at,
        user1_id, user2_id,
        user1:users!connections_user1_id_fkey(id, username, avatar_url),
        user2:users!connections_user2_id_fkey(id, username, avatar_url)
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
    if (error) {
      console.error('Error fetching connections:', error);
      return;
    }

    // 2. Fetch AuraBot user
    const { data: botData } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .eq('username', 'AuraBot')
      .single();

    let finalConnections = realConnections || [];

    // 3. If AuraBot exists and not already in connections, add a virtual connection
    if (botData) {
      const hasBotConnection = realConnections?.some(conn => 
        (conn.user1_id === botData.id) || (conn.user2_id === botData.id)
      );

      if (!hasBotConnection) {
        const virtualBotConnection = {
          id: `bot-${botData.id}`,
          status: 'accepted',
          created_at: new Date().toISOString(),
          user1_id: user.id,
          user2_id: botData.id,
          user1: { id: user.id, username: user.username, avatar_url: null },
          user2: botData,
          isVirtual: true
        };
        finalConnections = [virtualBotConnection, ...finalConnections];
      }
    }

    setConnections(finalConnections);
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
