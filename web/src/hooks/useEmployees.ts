import { useState, useCallback } from 'react';
import type { User } from '@/types';

const INITIAL_EMPLOYEES: User[] = [
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
    position: 'Fiche de Résidence',
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
    service: 'Technical Service',
    position: 'Autorisation de voirie',
    phone: '+213 555 010 107',
    joinDate: '2023-02-15',
    status: 'active',
  },
  
];

export function useEmployees() {
  const [employees, setEmployees] = useState<User[]>(INITIAL_EMPLOYEES);

  const addEmployee = useCallback((employee: Omit<User, 'id'>) => {
    const newEmployee: User = {
      ...employee,
      id: Math.random().toString(36).substr(2, 9),
    };
    setEmployees((prev) => [...prev, newEmployee]);
    return newEmployee;
  }, []);

  const updateEmployee = useCallback((id: string, updates: Partial<User>) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, ...updates } : emp))
    );
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
  }, []);

  const getEmployeeById = useCallback(
    (id: string) => {
      return employees.find((emp) => emp.id === id);
    },
    [employees]
  );

  const getEmployeesByService = useCallback(
    (service: string) => {
      return employees.filter((emp) => emp.service === service);
    },
    [employees]
  );

  const toggleEmployeeStatus = useCallback((id: string) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id
          ? { ...emp, status: emp.status === 'active' ? 'inactive' : 'active' }
          : emp
      )
    );
  }, []);

  return {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeById,
    getEmployeesByService,
    toggleEmployeeStatus,
  };
}
