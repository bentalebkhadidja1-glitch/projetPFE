import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/apiBase';

export interface Employee {
  _id: string;
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  service: string;
  position: string;
  phone: string;
  joinDate: string;
  status: string;
}

export function useAdminData() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/employees`);
      const data = await response.json();
      if (response.ok) setEmployees(data.employees || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des employés');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/all-requests`);
      const data = await response.json();
      if (response.ok) setRequests(data.requests || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/stats`);
      const data = await response.json();
      if (response.ok) setStats(data);
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchEmployees();
    fetchAllRequests();
    fetchStats();
  }, [fetchEmployees, fetchAllRequests, fetchStats]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return {
    employees,
    requests,
    stats,
    loading,
    refreshAll,
    fetchEmployees,
    fetchAllRequests,
    fetchStats,
  };
}

export default useAdminData;
