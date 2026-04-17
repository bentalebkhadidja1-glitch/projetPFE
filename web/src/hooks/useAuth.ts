import { useState, useCallback } from 'react';
import type { User } from '@/types';

const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'Municipal_Agent@gmail.com',
    password: 'Municipal_Agent123',
    firstName: 'Mohamed',
    lastName: 'Belahoili',
    role: 'Municipal_Agent',
    service: 'Municipal_Agent',
    position: 'System Administrator',
    phone: '+213 555 010 101',
    joinDate: '2020-01-01',
    status: 'active',
  },
  {
    id: '2',
    email: 'sarah@gmail.com',
    password: 'employee123',
    firstName: 'Sarah',
    lastName: 'Benali',
    role: 'employee',
    service: 'Civil Status',
    position: 'Acte de naissance',
    phone: '+213 555 010 102',
    joinDate: '2021-03-20',
    status: 'active',
  },
  {
    id: '3',
    email: 'jamel@gmail.com',
    password: 'employee123',
    firstName: 'Jamel',
    lastName: 'Ziani',
    role: 'employee',
    service: 'Civil Status',
    position: 'Certificat de résidence',
    phone: '+213 555 010 103',
    joinDate: '2021-06-10',
    status: 'active',
  },
  {
    id: '4',
    email: 'fatima@gmail.com',
    password: 'employee123',
    firstName: 'Fatima',
    lastName: 'Hamdani',
    role: 'employee',
    service: 'Civil Status',
    position: 'Fiche de résidence',
    phone: '+213 555 010 104',
    joinDate: '2022-01-05',
    status: 'active',
  },
  {
    id: '5',
    email: 'maria@gmail.com',
    password: 'employee123',
    firstName: 'Maria',
    lastName: 'Amrani',
    role: 'employee',
    service: 'Civil Status',
    position: 'Certificat de mariage',
    phone: '+213 555 010 106',
    joinDate: '2022-07-20',
    status: 'active',
  },
  {
    id: '6',
    email: 'karim@gmail.com',
    password: 'employee123',
    firstName: 'Karim',
    lastName: 'Belkacem',
    role: 'employee',
    service: 'Autorisation de voirie',
    position: 'Autorisation de voirie',
    phone: '+213 555 010 107',
    joinDate: '2023-02-15',
    status: 'active',
  },
];

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback((email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    const resolved =
      normalized === 'sarah@gmail.com'
        ? 'sarah@gmail.com'
        : normalized === 'fatima@gmail.com'
          ? 'fatima@gmail.com'
          : normalized;
    const found = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === resolved && u.password === password
    );
    if (found) {
      const { password, ...userWithoutPassword } = found;
      setUser(userWithoutPassword as User);
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  return { user, login, logout, updateUser };
}
