import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/apiBase';

export const useSocket = (userId: string, userRole: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!userId || !API_BASE_URL) return;

    const newSocket = io(API_BASE_URL, {
      transports: ['websocket'],
      query: { userId, userRole }
    });

    newSocket.on('connect', () => {
      console.log(' Socket connected!');
    });

    newSocket.on('new-notification', (notification) => {
      console.log(' New notification:', notification);
      setNotifications(prev => [notification, ...prev]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId, userRole]);

  const sendNotification = (data: any) => {
    if (socket) {
      socket.emit('send-notification', data);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return { socket, notifications, sendNotification, clearNotifications };
};