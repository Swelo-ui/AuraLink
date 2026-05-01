import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../lib/utils';

interface SocketContextType {
  socket: Socket | null;
  partnerStatus: { [userId: string]: string };
  setPartnerStatus: (userId: string, status: string) => void;
}

const SocketContext = createContext<SocketContextType>({ socket: null, partnerStatus: {}, setPartnerStatus: () => {} });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [partnerStatus, setPartnerStatusMap] = useState<{ [userId: string]: string }>({});
  const { token } = useAuthStore();

  const setPartnerStatus = useCallback((userId: string, status: string) => {
    setPartnerStatusMap(prev => {
      if (prev[userId] === status) return prev;
      return { ...prev, [userId]: status };
    });
  }, []);

  useEffect(() => {
    if (!token) return;

    // Use API_URL as the host if specified, otherwise it defaults to current origin
    const newSocket = io(API_URL || undefined, { auth: { token } });
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
    });

    newSocket.on('user_status', (data) => {
      setPartnerStatus(data.userId, data.status);
    });

    newSocket.on('partner_status', (data) => {
      setPartnerStatus(data.userId, data.state);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, partnerStatus, setPartnerStatus }}>
      {children}
    </SocketContext.Provider>
  );
}
