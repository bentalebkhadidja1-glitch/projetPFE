export type UserRole = 'Municipal_Agent' | 'employee';

export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  service: string;
  position: string;
  phone: string;
  joinDate: string;
  avatar?: string;
  status: 'active' | 'inactive';
}

export interface Task {
  id: string;
  title: string;
  assignedTo: string;
  assignedBy: string;
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: string;
  citizen?: {
    firstName: string;
    lastName: string;
    email: string;
    nin: string;
    // Acte de naissance (Sarah)
    wilaya?: string;
    commune?: string;
    actYear?: string;
    actNumber?: string;
    // fiche de résidence(Fatima)
    cni?: string;
    cniFileUrl?: string;
    factureFileUrl?: string;
    dateNaissance?: string;
    adresse?: string;
  };
  documentStatus?: 'pending' | 'verified' | 'rejected' | 'missing';
  requestType?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  employeeCount: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  read: boolean;
}

export type { Citizen, CitizenRequest, EmployeeNotification } from './citizen';