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
      const url = `${API_BASE_URL}/notifications/employee/${position}${service ? `?service=${encodeURIComponent(service)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Map backend Notification to EmployeeNotification expected by components
        const mapped = data.map((n: any) => {
          const fn = n.citizenFirstName;
          const ln = n.citizenLastName;
          const nameFromParts = fn || ln ? [fn, ln].filter(Boolean).join(' ') : '';
          return {
            id: n._id,
            title: n.title,
            message: n.message,
            type: n.type,
            read: n.isRead,
            createdAt: n.createdAt,
            employeeId: n.employeeId != null ? String(n.employeeId) : '',
            link: n.link || '#',
            requestId: n.requestId ? String(n.requestId) : undefined,
            citizenName: nameFromParts || n.citizenName,
            citizenNin: n.citizenNin,
            citizenEmail: n.citizenEmail,
            wilaya: n.wilaya,
            commune: n.commune,
            citizenFirstName: n.citizenFirstName,
            citizenLastName: n.citizenLastName,
            actYear: n.actYear,
            actNumber: n.actNumber,
          };
        });
        setNotifications(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  }, [position, service]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markNotificationAsRead = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PUT' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/employee/${position}/read-all`, {
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