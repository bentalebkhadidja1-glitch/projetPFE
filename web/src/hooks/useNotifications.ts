import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/apiBase';

export interface EmployeeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  requestId?: string;
  citizenName?: string;
  citizenNin?: string;
  citizenEmail?: string;
  wilaya?: string;
  commune?: string;
  citizenFirstName?: string;
  citizenLastName?: string;
  actYear?: string;
  actNumber?: string;
  position: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export function useNotifications(position: string, service?: string) {
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!position) return;
    try {
      setLoading(true);
      const url = `${API_BASE_URL}/notifications/position/${position}${service ? `?service=${encodeURIComponent(service)}` : ''}`;
      const res = await fetch(url);
      
      if (res.ok) {
        const data = await res.json();
        
        const mapped = data.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.service || 'general',
          read: n.isRead,
          createdAt: n.createdAt,
          position: n.position,
          link: '#'
        }));
        
        setNotifications(mapped);
        console.log('Notifications fetched:', mapped);
      } else {
        console.error('Failed to fetch:', res.status);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  }, [position, service]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markNotificationAsRead = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, { 
        method: 'PUT' 
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/position/${position}/read-all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const getUnreadCount = () => notifications.filter(n => !n.read).length;

  return {
    notifications,
    loading,
    getUnreadCount,
    markNotificationAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications
  };
}