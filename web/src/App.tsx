import { useState, useEffect } from 'react';
import { LoginPage } from '@/sections/LoginPage';
import { MunicipalAgentDashboard } from '@/sections/AdminDashboard';
import { EmployeeDashboard } from '@/sections/EmployeeDashboard';
import { useRealRequests } from '@/hooks/useRealRequests';
import { useAdminData } from '@/hooks/useAdminData';
import { useNotifications } from '@/hooks/useNotifications';
import { Toaster } from '@/components/ui/sonner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { API_BASE_URL } from '@/lib/apiBase';
import { useSocket } from '@/hooks/useSocket';

export type Vue = 'connexion' | 'municipal_agent' | 'employe';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Municipal_Agent' | 'employee';
  service: string;
  position: string;
  phone: string;
  joinDate: string;
}

function App() {
  const [vueActuelle, setVueActuelle] = useState<Vue>('connexion');
  const [user, setUser] = useState<User | null>(null);
  const { isDark, toggleDarkMode } = useDarkMode();
  
  // Socket.IO connection
  const { notifications: socketNotifications, sendNotification } = useSocket(
    user?.id || '', 
    user?.role || ''
  );

  // Log socket notifications
  useEffect(() => {
    if (socketNotifications.length > 0) {
      console.log('New notification via Socket:', socketNotifications[0]);
    }
  }, [socketNotifications]);

  useEffect(() => {
    fetch("http://localhost:5000/")
      .then(res => res.text())
      .then(data => console.log("BACKEND RESPONSE:", data))
      .catch(err => console.error("ERROR:", err));
  }, []);
  
  const { requests, loading, getTasksByEmployee } = useRealRequests(user?.id || '');
  const { employees: adminEmployees, loading: adminLoading } = useAdminData(vueActuelle === 'municipal_agent');
  const notificationsState = useNotifications(user?.id || '', user?.service || '');

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Try employee login
      const empResponse = await fetch(`${API_BASE_URL}/requests/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (empResponse.ok) {
        const data = await empResponse.json();
        setUser({
          id: data.employee.id,
          email: data.employee.email,
          firstName: data.employee.name.split(' ')[0] || '',
          lastName: data.employee.name.split(' ')[1] || '',
          role: 'employee',
          service: data.employee.service,
          position: data.employee.service,
          phone: '',
          joinDate: new Date().toISOString(),
        });
        setVueActuelle('employe');
        return true;
      }
      
      // Try admin login
      const adminResponse = await fetch(`${API_BASE_URL}/municipal_agent/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (adminResponse.ok) {
        const data = await adminResponse.json();
        setUser({
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          role: 'Municipal_Agent',
          service: data.user.service,
          position: data.user.position,
          phone: data.user.phone,
          joinDate: data.user.joinDate,
        });
        setVueActuelle('municipal_agent');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setVueActuelle('connexion');
  };

  const updateUser = (updatedUser: User) => setUser(updatedUser);
  
  const isLoading = (vueActuelle === 'employe' && loading) || (vueActuelle === 'municipal_agent' && adminLoading);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Chargement...</p>
        </div>
      </div>
    );
  }

  // Render current view
  switch (vueActuelle) {
    case 'connexion':
      return (
        <>
          <LoginPage
            onLogin={login as any}
            isDark={isDark}
            toggleDarkMode={toggleDarkMode}
          />
          <Toaster />
        </>
      );
      
    case 'municipal_agent':
      return (
        <>
          <MunicipalAgentDashboard
            user={user as any}
            onLogout={logout}
            employees={{ 
              employees: adminEmployees, 
              getEmployeeById: (id: string) => adminEmployees.find((e: any) => e._id === id || e.id === id)
            } as any}
            tasks={{ tasks: requests, updateTask: () => {}, completeTask: () => {}, getTasksByEmployee } as any}
            isDark={isDark}
            toggleDarkMode={toggleDarkMode}
          />
          <Toaster />
        </>
      );
      
    case 'employe':
      return (
        <>
          <EmployeeDashboard
            user={user as any}
            onLogout={logout}
            onUpdateUser={updateUser as any}
            tasks={{ tasks: requests, updateTask: () => {}, completeTask: () => {}, getTasksByEmployee } as any}
            isDark={isDark}
            toggleDarkMode={toggleDarkMode}
            notifications={notificationsState as any}
          />
          <Toaster />
        </>
      );
      
    default:
      return (
        <>
          <LoginPage onLogin={login as any} isDark={isDark} toggleDarkMode={toggleDarkMode} />
          <Toaster />
        </>
      );
  }
}

export default App;