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

export function useAdminData(enabled = false) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/municipal_agent/employees`);
      const data = await response.json();
      if (response.ok) setEmployees(data.employees || []);
    } catch (error) {
      console.error('Erreur chargement employés:', error);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const fetchAllRequests = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/municipal_agent/all-requests`);
      const data = await response.json();
      if (response.ok) setRequests(data.requests || []);
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const fetchStats = useCallback(async () => {
    if (!enabled) return;
    try {
      const response = await fetch(`${API_BASE_URL}/municipal_agent/stats`);
      const data = await response.json();
      if (response.ok) setStats(data);
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  }, [enabled]);

  const refreshAll = useCallback(() => {
    fetchEmployees();
    fetchAllRequests();
    fetchStats();
  }, [fetchEmployees, fetchAllRequests, fetchStats]);

  useEffect(() => {
    if (enabled) refreshAll();
  }, [enabled, refreshAll]);

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
