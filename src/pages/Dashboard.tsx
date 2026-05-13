import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Sidebar from '../components/Sidebar';
import { SocketProvider } from '../components/SocketProvider';
import GlobalNotificationListener from '../components/GlobalNotificationListener';
import ErrorBoundary from '../components/ErrorBoundary';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import clsx from 'clsx';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { MessageSquare } from 'lucide-react';

// Lazy load heavy workspace components
const ChatWorkspace = lazy(() => import('./ChatWorkspace'));
const PersonalWorkspace = lazy(() => import('./PersonalWorkspace'));

export default function Dashboard() {
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const isChat = location.pathname.startsWith('/dashboard/c/');
  const isPersonal = location.pathname === '/dashboard/personal';
  const hideSidebarOnMobile = isChat || isPersonal;
  const { user } = useAuthStore();

  const fetchConnections = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: realConnections, error } = await supabase
        .from('connections')
        .select(`
          id, status, created_at,
          user1_id, user2_id,
          user1:users!connections_user1_id_fkey(id, username, avatar_url),
          user2:users!connections_user2_id_fkey(id, username, avatar_url)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching connections:', error);
        return;
      }

      // Virtual AuraBot connection (always present)
      const aurabotId = '00000000-0000-0000-0000-000000000000';
      const aurabot = {
        id: `bot-${aurabotId}`,
        status: 'accepted',
        created_at: new Date().toISOString(),
        user1_id: user.id,
        user2_id: aurabotId,
        user1: { id: user.id, username: user.username, avatar_url: null },
        user2: { id: aurabotId, username: 'AuraBot', avatar_url: null },
        isVirtual: true
      };

      // Filter out any real AuraBot connections (prevent duplicates)
      const filteredReal = (realConnections || []).filter((conn: any) =>
        (conn.user1 as any)?.username !== 'AuraBot' && (conn.user2 as any)?.username !== 'AuraBot'
      );

      setConnections([aurabot, ...filteredReal]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.username]);

  useEffect(() => {
    fetchConnections();

    if (user?.id) {
      const sub = supabase
        .channel('public:connections')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
          fetchConnections();
        })
        .subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, [user?.id, fetchConnections]);

  return (
    <SocketProvider>
      <GlobalNotificationListener />
      <div className="flex w-full bg-aura-navy overflow-hidden" style={{ height: '100dvh' }}>
        {/* Sidebar */}
        <Sidebar
          connections={connections}
          onRefresh={fetchConnections}
          isLoading={isLoading}
          className={hideSidebarOnMobile ? 'hidden md:flex' : 'flex'}
        />

        {/* Main Content */}
        <main className={clsx(
          'flex-1 min-h-0 overflow-hidden bg-aura-navy',
          hideSidebarOnMobile ? 'flex' : 'hidden md:flex'
        )}>
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen message="Loading workspace..." fullScreen={false} />}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <EmptyState
                      icon={<MessageSquare size={28} className="text-aura-primary" />}
                      title="Welcome to AuraLink"
                      description="Select a conversation from the sidebar or open your personal workspace to get started."
                    />
                  }
                />
                <Route path="/c/:id" element={<ChatWorkspace connections={connections} />} />
                <Route path="/personal" element={<PersonalWorkspace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </SocketProvider>
  );
}
