import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabaseClient';

interface SocketContextType {
  socket: any | null; // using any for the Supabase Realtime channel
  partnerStatus: { [userId: string]: string };
  setPartnerStatus: (userId: string, status: string) => void;
  channelReady: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, partnerStatus: {}, setPartnerStatus: () => { }, channelReady: false });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<any | null>(null);
  const [partnerStatus, setPartnerStatusMap] = useState<{ [userId: string]: string }>({});
  const [channelReady, setChannelReady] = useState<boolean>(false);
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

    // Handle join events - when a user enters the presence channel
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (import.meta.env.DEV) {
        console.log('[Presence Event]', 'join', { key, newPresences });
        console.log('[Presence State]', channel.presenceState());
      }

      if (newPresences && newPresences.length > 0) {
        const latest: any = newPresences[0];
        const userId = key;
        const status = latest.status || 'online';

        if (import.meta.env.DEV) {
          console.log('[Partner Status Updated]', userId, status);
        }

        setPartnerStatusMap(prev => {
          if (prev[userId] === status) return prev;
          return { ...prev, [userId]: status };
        });
      }
    });

    // Handle leave events - when a user exits the presence channel
    channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (import.meta.env.DEV) {
        console.log('[Presence Event]', 'leave', { key });
        console.log('[Presence State]', channel.presenceState());
      }

      const userId = key;

      if (import.meta.env.DEV) {
        console.log('[Partner Status Updated]', userId, 'offline');
      }

      setPartnerStatusMap(prev => {
        if (prev[userId] === 'offline') return prev;
        return { ...prev, [userId]: 'offline' };
      });
    });

    // Handle sync events - periodic synchronization of all presence state
    channel.on('presence', { event: 'sync' }, () => {
      const newState = channel.presenceState();

      // Development logging to verify presence state structure
      if (import.meta.env.DEV) {
        console.log('[Presence Event]', 'sync', newState);
        console.log('[Presence State]', newState);
      }

      setPartnerStatusMap(prev => {
        const nextMap: { [userId: string]: string } = { ...prev };

        // Mark all currently present users with their latest status
        for (const [key, stateArray] of Object.entries(newState)) {
          // Add null checks for stateArray
          if (!stateArray || !Array.isArray(stateArray) || stateArray.length === 0) {
            continue;
          }

          const latest: any = stateArray[0];

          // Add null check for latest and use default status of 'online' if latest.status is undefined
          if (!latest) {
            continue;
          }

          const status = latest.status || 'online';

          // Verify key is correctly used to index partnerStatus (key should be user ID string)
          if (typeof key === 'string' && key.length > 0) {
            nextMap[key] = status;

            if (import.meta.env.DEV) {
              console.log('[Partner Status Updated]', key, status);
            }
          }
        }

        // If a user was previously tracked but is no longer in presence state, mark them offline
        for (const key of Object.keys(prev)) {
          if (!newState[key]) {
            nextMap[key] = 'offline';

            if (import.meta.env.DEV) {
              console.log('[Partner Status Updated]', key, 'offline');
            }
          }
        }

        return nextMap;
      });
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setChannelReady(true);
        try {
          await channel.track({ status: 'online' });
        } catch (e) {
          console.error('[Track Error]', e);
          // Retry once after a short delay for transient network issues
          setTimeout(async () => {
            try {
              if (channel.state === 'joined') {
                await channel.track({ status: 'online' });
              }
            } catch (retryError) {
              console.error('[Track Retry Error]', retryError);
            }
          }, 1000);
        }
      }
    });

    // Provide the channel as the "socket" so other components can emit/on
    setSocket(channel);

    return () => {
      setChannelReady(false);
      supabase.removeChannel(channel);
    };
  }, [token, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, partnerStatus, setPartnerStatus, channelReady }}>
      {children}
    </SocketContext.Provider>
  );
}
