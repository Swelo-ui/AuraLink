import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatWorkspace from './ChatWorkspace';
import PersonalWorkspace from './PersonalWorkspace';
import { SocketProvider } from '../components/SocketProvider';
import clsx from 'clsx';
import { API_URL } from '../lib/utils';

export default function Dashboard() {
  const [connections, setConnections] = useState<any[]>([]);
  const location = useLocation();
  const isChat = location.pathname.startsWith('/dashboard/c/');

  const fetchConnections = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/connections`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setConnections(await res.json());
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

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
