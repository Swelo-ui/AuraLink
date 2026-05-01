import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabaseClient';

interface SocketContextType {
  socket: any | null; // using any for the Supabase Realtime channel
  partnerStatus: { [userId: string]: string };
  setPartnerStatus: (userId: string, status: string) => void;
}

const SocketContext = createContext<SocketContextType>({ socket: null, partnerStatus: {}, setPartnerStatus: () => {} });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<any | null>(null);
  const [partnerStatus, setPartnerStatusMap] = useState<{ [userId: string]: string }>({});
  const { token, user } = useAuthStore();

  const setPartnerStatus = useCallback((userId: string, status: string) => {
    setPartnerStatusMap(prev => {
      if (prev[userId] === status) return prev;
      return { ...prev, [userId]: status };
    });
  }, []);

  useEffect(() => {
    if (!token || !user?.id) return;

    // We use a single shared presence channel for status
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const newState = channel.presenceState();
      const newStatusMap: any = {};
      for (const [key, stateArray] of Object.entries(newState)) {
        if (stateArray.length > 0) {
          const latest: any = stateArray[0];
          newStatusMap[key] = latest.status || 'online';
        }
      }
      setPartnerStatusMap(prev => ({ ...prev, ...newStatusMap }));
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ status: 'online' });
      }
    });

    // Provide the channel as the "socket" so other components can emit/on
    setSocket(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, partnerStatus, setPartnerStatus }}>
      {children}
    </SocketContext.Provider>
  );
}
