import { useState, useCallback } from 'react';
import type { Citizen, CitizenRequest, EmployeeNotification } from '@/types/citizen';

// Sample citizens
const CITIZENS: Citizen[] = [
  {
    id: 'c1',
    firstName: 'Ahmed',
    lastName: 'Ben Ali',
    nin: '1234567890123000478',
    email: 'ahmed.Fassi@email.com',
    phone: '0555123456',
  },
  {
    id: 'c2',
    firstName: 'Samira',
    lastName: 'Trabelsi',
    nin: '9876543210987',
    email: 'samira.trabelsi@email.com',
    phone: '0555987654',
  },
  {
    id: 'c3',
    firstName: 'Aicha',
    lastName: 'Benkiran',
    nin: '7891234567890000012',
    email: 'aicha.benkiran@email.com',
    phone: '0555321654',
    wilaya: 'Mostaganem',
    commune: 'Bir El Djir',
    actYear: '1998',
    actNumber: '45821',
  },
];

// Sample requests — LINKED to employees by POSITION
const REQUESTS_INITIALES: CitizenRequest[] = [
  {
    id: 'req-1',
    citizenId: 'c1',
    citizen: CITIZENS[0],
    type: 'document',
    subject: 'Fiche de résidence',
    description: 'Demande de renouvellement',
    status: 'pending',
    assignedPosition: 'Fiche de résidence',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'req-3',
    citizenId: 'c3',
    citizen: CITIZENS[2],
    type: 'document',
    subject: 'Acte de naissance',
    description: 'Demande de copie',
    status: 'pending',
    assignedPosition: 'Acte de naissance',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'req-4',
    citizenId: 'c4',
    citizen: CITIZENS[3],
    type: 'document',
    subject: 'Certificat de mariage',
    description: 'Demande de certificat',
    status: 'pending',
    assignedPosition: 'Certificat de mariage',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Generate notifications from requests — LINKED by POSITION
const generateNotificationsFromRequests = (
  requests: CitizenRequest[]
): EmployeeNotification[] => {
  return requests.map((req) => ({
    id: `notif-${req.id}`,
    type: 'new-request' as const,
    title: 'Nouvelle demande',
    message: `${req.citizen.firstName} ${req.citizen.lastName} a soumis une demande de ${req.subject}`,
    requestId: req.id,
    citizenName: `${req.citizen.firstName} ${req.citizen.lastName}`,
    citizenNin: req.citizen.nin,
    citizenEmail: req.citizen.email,
    wilaya: req.citizen.wilaya,
    commune: req.citizen.commune,
    citizenFirstName: req.citizen.firstName,
    citizenLastName: req.citizen.lastName,
    actYear: req.citizen.actYear,
    actNumber: req.citizen.actNumber,
    position: req.assignedPosition || '',
    read: false,
    createdAt: req.createdAt,
  }));
};

export function useCitizenRequests() {
  const [requests, setRequests] = useState<CitizenRequest[]>(REQUESTS_INITIALES);
  const [notifications, setNotifications] = useState<EmployeeNotification[]>(
    generateNotificationsFromRequests(REQUESTS_INITIALES)
  );

  // Get requests for a given POSITION
  const getRequestsForPosition = useCallback(
    (position: string) => requests.filter((r) => r.assignedPosition === position),
    [requests]
  );

  // Get notifications for a given POSITION
  const getNotificationsForPosition = useCallback(
    (position: string) => notifications.filter((n) => n.position === position),
    [notifications]
  );

  // Get unread count for a given POSITION
  const getUnreadCountForPosition = useCallback(
    (position: string) =>
      notifications.filter((n) => n.position === position && !n.read).length,
    [notifications]
  );

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback((position: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.position === position ? { ...n, read: true } : n))
    );
  }, []);

  const addRequest = useCallback(
    (request: Omit<CitizenRequest, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newRequest: CitizenRequest = {
        ...request,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setRequests((prev) => [...prev, newRequest]);

      const newNotification: EmployeeNotification = {
        id: `notif-${newRequest.id}`,
        type: 'new-request',
        title: 'Nouvelle demande',
        message: `${newRequest.citizen.firstName} ${newRequest.citizen.lastName} a soumis une demande de ${newRequest.subject}`,
        requestId: newRequest.id,
        citizenName: `${newRequest.citizen.firstName} ${newRequest.citizen.lastName}`,
        citizenNin: newRequest.citizen.nin,
        citizenEmail: newRequest.citizen.email,
        wilaya: newRequest.citizen.wilaya,
        commune: newRequest.citizen.commune,
        citizenFirstName: newRequest.citizen.firstName,
        citizenLastName: newRequest.citizen.lastName,
        actYear: newRequest.citizen.actYear,
        actNumber: newRequest.citizen.actNumber,
        position: newRequest.assignedPosition || '',
        read: false,
        createdAt: newRequest.createdAt,
      };
      setNotifications((prev) => [newNotification, ...prev]);

      return newRequest;
    },
    []
  );

  return {
    requests,
    notifications,
    getRequestsForPosition,
    getNotificationsForPosition,
    getUnreadCountForPosition,
    markNotificationAsRead,
    markAllAsRead,
    addRequest,
  };
}
