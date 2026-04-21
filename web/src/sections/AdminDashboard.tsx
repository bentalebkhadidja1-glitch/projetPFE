import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/services/socket';
import { toast } from 'sonner';
import type { User, Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard, Users, CheckSquare, Settings, LogOut, Plus, Search,
  MoreVertical, Trash2, UserCheck, UserX, Briefcase, Calendar, TrendingUp,
  CheckCircle2, Moon, Sun, FileText, CheckCircle, XCircle, Eye, ArrowLeft,
  ShieldCheck, ShieldX, MessageSquare, Send, Bell,
} from 'lucide-react';
import { fr } from 'date-fns/locale/fr';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegistrationRequest {
  id: number;
  firstName: string;
  lastName: string;
  nin: string;
  email: string;
  dob: string;
  commune: string;
  address: string;
  status: 'pending' | 'validated' | 'rejected';
  rejectionReason?: string;
  reg: {
    firstName: string | null;
    lastName: string | null;
    nin: string | null;
    dob: string | null;
    commune: string | null;
  };
}

interface ChatMessage {
  id: number;
  from: 'citizen' | 'agent';
  text: string;
  time: string;
  read: boolean;
}

interface CitizenChat {
  citizenId: number;
  citizenName: string;
  citizenEmail: string;
  messages: ChatMessage[];
}

interface MunicipalAgentDashboardProps {
  user: User;
  onLogout: () => void;
  isDark: boolean;
  toggleDarkMode: () => void;
  employees: {
    employees: User[];
    addEmployee: (employee: Omit<User, 'id'>) => User;
    updateEmployee: (id: string, updates: Partial<User>) => void;
    deleteEmployee: (id: string) => void;
    toggleEmployeeStatus: (id: string) => void;
  };
  tasks: {
    tasks: Task[];
    addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Task;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    completeTask: (id: string) => void;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICES = [
  {
    id: 'civil', name: 'Civil Status', nameFr: 'État Civil', color: 'bg-blue-500',
    keywords: ['fiche_residence','fiche de residence','certificat_residence','certificat de residence','acte_naissance','acte de naissance','certificat_mariage','certificat de mariage','etat civil','état civil'],
  },
  {
    id: 'autorisation', name: 'Road Occupancy Permit', nameFr: 'Autorisation de voirie', color: 'bg-green-500',
    keywords: ['autorisation de voirie','voirie','road occupancy'],
  },
];

const SERVICE_LABELS: Record<string, { en: string; fr: string }> = {
  'fiche de residence':     { en: 'Civil status', fr: 'État civil' },
  'certificat de residence':{ en: 'Civil status', fr: 'État civil' },
  'acte de naissance':      { en: 'Civil status', fr: 'État civil' },
  'certificat de mariage':  { en: 'Civil status', fr: 'État civil' },
  'autorisation de voirie': { en: 'Autorisation de voirie', fr: 'Autorisation de voirie' },
};

const POSITION_LABELS: Record<string, { en: string; fr: string }> = {
  'fiche_residence':        { en: 'Residence Form',        fr: 'Fiche de résidence' },
  'certificat_residence':   { en: 'Residence Certificate', fr: 'Certificat de résidence' },
  'acte_naissance':         { en: 'Birth Certificate',     fr: 'Acte de naissance' },
  'certificat_mariage':     { en: 'Marriage Certificate',  fr: 'Certificat de mariage' },
  'autorisation de voirie': { en: 'Road Occupancy Permit', fr: 'Autorisation de voirie' },
};

export function MunicipalAgentDashboard({ user, onLogout, employees, tasks, isDark, toggleDarkMode }: MunicipalAgentDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newEmployeeService, setNewEmployeeService] = useState<string>('État civil');
  const [newEmployeePosition, setNewEmployeePosition] = useState<string>('Fiche de résidence');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const { t, language } = useLanguage();

  // ── Validation state ──────────────────────────────────────────────────────
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [validationView, setValidationView] = useState<'table' | 'detail'>('table');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [requestSearch, setRequestSearch] = useState('');

  // ── Chat state with Socket.IO ────────────────────────────────────────────
  const [chats, setChats] = useState<CitizenChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const unreadCount = chats.reduce((acc, c) => acc + c.messages.filter((m) => !m.read && m.from === 'citizen').length, 0);
  const activeChat = chats.find((c) => c.citizenId === activeChatId) ?? null;

  // ── Fetch registration requests from PostgreSQL ───────────────────────────
  useEffect(() => {
    fetch('http://localhost:5000/api/validations')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setRequests)
      .catch((err) => {
        console.error('Fetch error:', err);
        toast.error(language === 'fr' ? 'Erreur chargement demandes' : 'Failed to load requests');
      });
  }, []);

  // ── Initialize Socket.IO connection ───────────────────────────────────────
useEffect(() => {
const socket = connectSocket();
  socketRef.current = socket;

  socket.on('connect', () => {
    setIsSocketConnected(true);
    socket.emit('agent:join'); // No need to pass agentId, server gets it from JWT
    socket.emit('chat:get-conversations');
  });

  socket.on('chat:conversations', (conversations: CitizenChat[]) => {
    setChats(conversations);
  });

  socket.on('chat:new-message', (data) => {
    setChats((prev) => {
      const existing = prev.find((c) => c.citizenId === data.citizenId);
      if (existing) {
        return prev.map((c) =>
          c.citizenId === data.citizenId
            ? { ...c, messages: [...c.messages, data.message] }
            : c
        );
      }
      return [...prev, {
        citizenId: data.citizenId,
        citizenName: data.citizenName,
        citizenEmail: data.citizenEmail,
        messages: [data.message]
      }];
    });

    if (activeChatId !== data.citizenId && data.message.from === 'citizen') {
      toast.info(`New message from ${data.citizenName}`);
    }
  });

  socket.on('chat:message-sent', (data) => {
    setChats((prev) =>
      prev.map((c) =>
        c.citizenId === data.citizenId
          ? { ...c, messages: [...c.messages, data.message] }
          : c
      )
    );
  });

  return () => {
    socket.off('connect');
    socket.off('chat:conversations');
    socket.off('chat:new-message');
    socket.off('chat:message-sent');
    disconnectSocket();
  };
}, [user.id]);

  // ── Scroll chat to bottom on new message ──────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages.length]);

  // ── Mark messages read when opening chat ─────────────────────────────────
  const openChat = useCallback((citizenId: number) => {
    setActiveChatId(citizenId);
    setChats((prev) =>
      prev.map((c) =>
        c.citizenId === citizenId
          ? { ...c, messages: c.messages.map((m) => ({ ...m, read: true })) }
          : c
      )
    );
    socketRef.current?.emit('chat:mark-read', { citizenId });
  }, []);

  // ── Send message via Socket.IO ───────────────────────────────────────────
  const sendAgentMessage = useCallback(() => {
    if (!chatMessage.trim() || !activeChatId || !socketRef.current) return;
    
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageData = {
      citizenId: activeChatId,
      text: chatMessage.trim(),
      time: now,
    };

    socketRef.current.emit('chat:send-message', messageData);
    setChatMessage('');
  }, [chatMessage, activeChatId]);

  const filteredRequests = requests.filter((r) => {
    const q = requestSearch.toLowerCase();
    return r.firstName.toLowerCase().includes(q) || r.lastName.toLowerCase().includes(q) ||
           r.nin.includes(q) || r.email.toLowerCase().includes(q);
  });

  // ── Validate → sends activation email via backend ────────────────────────
  const handleValidate = async (id: number) => {
    try {
      await fetch(`http://localhost:3001/api/validations/${id}/validate`, { method: 'POST' });
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'validated' } : r));
      setSelectedRequest((prev) => prev ? { ...prev, status: 'validated' } : prev);
      setShowRejectInput(false);
      toast.success(language === 'fr' ? "Email d'activation envoyé" : 'Activation email sent');
    } catch {
      toast.error(language === 'fr' ? 'Erreur de validation' : 'Validation failed');
    }
  };

  // ── Reject → sends rejection email via backend ───────────────────────────
  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) {
      toast.error(language === 'fr' ? 'Veuillez entrer un motif' : 'Please enter a reason');
      return;
    }
    try {
      await fetch(`http://localhost:3001/api/validations/${id}/reject`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'rejected', rejectionReason: rejectReason } : r));
      setSelectedRequest((prev) => prev ? { ...prev, status: 'rejected', rejectionReason: rejectReason } : prev);
      setShowRejectInput(false);
      setRejectReason('');
      toast.error(language === 'fr' ? 'Demande rejetée — email envoyé' : 'Rejected — email sent');
    } catch {
      toast.error(language === 'fr' ? 'Erreur de rejet' : 'Rejection failed');
    }
  };

  const openDetail = (req: RegistrationRequest) => {
    setSelectedRequest(req); setShowRejectInput(false); setRejectReason(''); setValidationView('detail');
  };

  const isMatch = (a: string, b: string | null) => !!b && a === b;
  const allMatch = (req: RegistrationRequest) =>
    !!req.reg.nin &&
    req.firstName === req.reg.firstName && req.lastName === req.reg.lastName &&
    req.nin === req.reg.nin && req.dob === req.reg.dob &&
    req.commune === req.reg.commune;

  // ── Employee helpers ──────────────────────────────────────────────────────
  const getEmpName = (emp: any) => ({ first: emp.firstName || emp.name?.split(' ')[0] || '', last: emp.lastName || emp.name?.split(' ').slice(1).join(' ') || '' });
  const translateService = (raw: string) => { const e = SERVICE_LABELS[raw?.toLowerCase()]; return e ? e[language] : raw; };
  const translatePosition = (raw: string) => { const e = POSITION_LABELS[raw?.toLowerCase()]; return e ? e[language] : raw; };
  const isRealEmployee = (e: any) => e.role !== 'Municipal_Agent';

  const totalEmployees = employees.employees.filter(isRealEmployee).length;
  const activeEmployees = employees.employees.filter((e) => isRealEmployee(e) && e.status === 'active').length;
  const totalTasks = tasks.tasks.length;
  const completedTasks = tasks.tasks.filter((t) => t.status === 'completed').length;

  const filteredEmployees = employees.employees.filter((emp) => {
    if (!isRealEmployee(emp)) return false;
    const { first, last } = getEmpName(emp); const q = searchQuery.toLowerCase();
    return first.toLowerCase().includes(q) || last.toLowerCase().includes(q) ||
           emp.email?.toLowerCase().includes(q) || emp.service?.toLowerCase().includes(q);
  });

  const allRealEmployees = employees.employees.filter(isRealEmployee);
  const employeesByService = SERVICES.map((s) => ({
    ...s, employees: allRealEmployees.filter((emp) => {
      const sv = emp.service?.toLowerCase() ?? ''; const po = emp.position?.toLowerCase() ?? '';
      return s.keywords.some((kw) => sv.includes(kw) || po.includes(kw));
    }),
  }));

  const handleAddEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    employees.addEmployee({ email: fd.get('email') as string, password: 'employee123', firstName: fd.get('firstName') as string, lastName: fd.get('lastName') as string, role: 'employee' as const, service: newEmployeeService, position: newEmployeePosition, phone: fd.get('phone') as string, joinDate: new Date().toISOString().split('T')[0], status: 'active' as const });
    setIsAddEmployeeOpen(false); setNewEmployeeService('État civil'); setNewEmployeePosition('Fiche de résidence');
    toast.success(language === 'fr' ? 'Employé ajouté' : 'Employee added');
  };

  const handleAddTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    tasks.addTask({ title: fd.get('title') as string, assignedTo: fd.get('assignedTo') as string, assignedBy: user.id, status: 'pending' as const });
    setIsAddTaskOpen(false); toast.success(language === 'fr' ? 'Tâche assignée' : 'Task assigned');
  };

  const getStatusColor = (s: Task['status']) =>
    s === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
    s === 'in-progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
    'bg-gray-100 text-gray-700 border-gray-200';

  const getTabTitle = () => {
    const titles: Record<string, { fr: string; en: string }> = {
      dashboard: { fr: 'Aperçu du tableau de bord', en: 'Dashboard Overview' },
      employees: { fr: 'Gestion des employés', en: 'Employee Management' },
      tasks: { fr: 'Gestion des tâches', en: 'Task Management' },
      validations: { fr: 'Validation des inscriptions', en: 'Registration Validations' },
      messages: { fr: 'Messages citoyens', en: 'Citizen Messages' },
      settings: { fr: 'Paramètres', en: 'Settings' },
    };
    return titles[activeTab]?.[language] ?? activeTab;
  };

  // ── Sub-components ────────────────────────────────────────────────────────

  const CompactEmployeeCard = ({ employee }: { employee: any }) => {
    const { first, last } = getEmpName(employee);
    return (
      <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
        <Avatar className="w-8 h-8"><AvatarFallback className="text-xs bg-primary text-primary-foreground">{first[0]}{last[0]}</AvatarFallback></Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate dark:text-white">{first} {last}</p>
          <p className="text-xs text-slate-500 truncate">{employee.position || employee.service}</p>
        </div>
        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
      </div>
    );
  };

  const SidebarItem = ({ icon: Icon, label, value, badge }: { icon: React.ElementType; label: string; value: string; badge?: number }) => (
    <button
      onClick={() => { setActiveTab(value); setValidationView('table'); }}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
        activeTab === value ? 'bg-primary text-primary-foreground shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      <div className="flex items-center gap-3"><Icon className="w-5 h-5" /><span className="font-medium">{label}</span></div>
      {badge !== undefined && badge > 0 && (
        <Badge variant={activeTab === value ? 'secondary' : 'destructive'} className="text-xs">{badge}</Badge>
      )}
    </button>
  );

  const RequestStatusBadge = ({ status }: { status: RegistrationRequest['status'] }) => {
    const styles = { pending: 'bg-amber-100 text-amber-800 border-amber-200', validated: 'bg-green-100 text-green-800 border-green-200', rejected: 'bg-red-100 text-red-800 border-red-200' };
    const labels = { pending: language === 'fr' ? 'En attente' : 'Pending', validated: language === 'fr' ? 'Validé' : 'Validated', rejected: language === 'fr' ? 'Rejeté' : 'Rejected' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>{labels[status]}</span>;
  };

  const CompareRow = ({ label, citizen, registry }: { label: string; citizen: string; registry: string | null }) => {
    const match = isMatch(citizen, registry);
    const color = match ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    return (
      <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
        <div><p className="text-xs text-slate-400 mb-0.5">{label}</p><p className={`text-sm font-medium ${color}`}>{citizen}</p></div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">{label}</p>
          <p className={`text-sm font-medium ${color}`}>
            {registry ?? <span className="italic text-slate-400">{language === 'fr' ? 'Non trouvé dans le registre' : 'Not found in registry'}</span>}
          </p>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">BALADIYA DIGITAL</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{language === 'fr' ? 'Panneau Agent Municipal' : 'Municipal Agent Panel'}</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            <SidebarItem icon={LayoutDashboard} label={t('dashboard')} value="dashboard" />
            <SidebarItem icon={Users} label={t('employees')} value="employees" />
            <SidebarItem icon={ShieldCheck} label={language === 'fr' ? 'Demandes des inscriptions' : 'Registration Requests'} value="validations" badge={pendingCount} />
            <SidebarItem icon={MessageSquare} label={language === 'fr' ? 'Messagerie assistée' : 'Assisted messaging'} value="messages" badge={unreadCount} />
            <SidebarItem icon={Settings} label={t('settings')} value="settings" />
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-10 h-10"><AvatarFallback className="bg-primary text-primary-foreground">{user.firstName[0]}{user.lastName[0]}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate dark:text-white">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={onLogout}><LogOut className="w-4 h-4 mr-2" />{t('logout')}</Button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">

        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{getTabTitle()}</h1>
              <p className="text-slate-500 dark:text-slate-400">{language === 'fr' ? `Bienvenue, ${user.firstName} !` : `Welcome, ${user.firstName}!`}</p>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Button variant="outline" size="icon" onClick={toggleDarkMode}>
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <div className="text-right">
                <p className="text-sm font-medium dark:text-white">
                  {new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">

          {/* ── Dashboard ──────────────────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">

              {/* Stats cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{language === 'fr' ? 'Total des employés' : 'Total Employees'}</CardTitle>
                    <Users className="w-4 h-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold dark:text-white">{totalEmployees}</div>
                    <p className="text-xs text-green-600 flex items-center mt-1"><TrendingUp className="w-3 h-3 mr-1" />{activeEmployees} {language === 'fr' ? 'actifs' : 'active'}</p>
                  </CardContent>
                </Card>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{language === 'fr' ? 'Total des tâches' : 'Total Tasks'}</CardTitle>
                    <CheckSquare className="w-4 h-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold dark:text-white">{totalTasks}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{language === 'fr' ? 'Pour tous les employés' : 'For all employees'}</p>
                  </CardContent>
                </Card>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('completed')}</CardTitle>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold dark:text-white">{completedTasks}</div>
                    <p className="text-xs text-green-600 mt-1">{Math.round((completedTasks / totalTasks) * 100) || 0}% {language === 'fr' ? "taux d'achèvement" : 'completion rate'}</p>
                  </CardContent>
                </Card>
              </div>

              {/* ── Pending requests alert card ── */}
              {pendingCount > 0 && (
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow border-amber-200 dark:border-amber-800 dark:bg-slate-800"
                  onClick={() => { setActiveTab('validations'); setValidationView('table'); }}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium dark:text-white">
                        {pendingCount} {language === 'fr' ? "demande(s) d'inscription en attente" : 'registration request(s) awaiting review'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {language === 'fr' ? 'Cliquer pour examiner et valider' : 'Click to review and validate'}
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-slate-400" />
                  </CardContent>
                </Card>
              )}

              {/* Service Cards */}
              <div>
                <h2 className="text-lg font-semibold dark:text-white mb-3">{language === 'fr' ? 'Services' : 'Services'}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {employeesByService.map((service) => (
                    <Card
                      key={service.id}
                      className={`cursor-pointer transition-all dark:bg-slate-800 dark:border-slate-700 ${selectedService === service.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setSelectedService(service.id === selectedService ? null : service.id)}
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${service.color}`} />
                          <CardTitle className="text-sm dark:text-white">{language === 'en' ? service.name : service.nameFr}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-xs text-slate-500">{service.employees.length} {language === 'en' ? 'employees' : 'employés'}</p>
                        {selectedService === service.id && service.employees.length > 0 && (
                          <div className="mt-3 space-y-2">{service.employees.map((emp) => <CompactEmployeeCard key={emp.id} employee={emp} />)}</div>
                        )}
                        {selectedService === service.id && service.employees.length === 0 && (
                          <p className="text-xs text-slate-400 mt-2 italic">{language === 'fr' ? 'Aucun employé assigné' : 'No employees assigned'}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Employees ──────────────────────────────────────────────── */}
          {activeTab === 'employees' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="relative w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder={language === 'fr' ? 'Rechercher...' : 'Search employees...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
                  <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />{t('addEmployee')}</Button></DialogTrigger>
                  <DialogContent className="max-w-lg dark:bg-slate-800">
                    <DialogHeader><DialogTitle className="dark:text-white">{language === 'fr' ? 'Ajouter un employé' : 'Add New Employee'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddEmployee} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>{t('firstName')}</Label><Input name="firstName" required /></div>
                        <div className="space-y-2"><Label>{t('lastName')}</Label><Input name="lastName" required /></div>
                      </div>
                      <div className="space-y-2"><Label>{t('email')}</Label><Input name="email" type="email" required /></div>
                      <div className="space-y-2"><Label>{t('phone')}</Label><Input name="phone" required /></div>
                      <div className="space-y-2">
                        <Label>{t('service')}</Label>
                        <Select name="service" required value={newEmployeeService} onValueChange={setNewEmployeeService}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="État civil">État civil</SelectItem>
                            <SelectItem value="Autorisation de voirie">Autorisation de voirie</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'fr' ? 'Poste' : 'Position'}</Label>
                        <Select name="poste" required value={newEmployeePosition} onValueChange={setNewEmployeePosition}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Acte de naissance">Acte de naissance</SelectItem>
                            <SelectItem value="Fiche de résidence">Fiche de résidence</SelectItem>
                            <SelectItem value="Certificat de résidence">Certificat de résidence</SelectItem>
                            <SelectItem value="Certificat de mariage">Certificat de mariage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">{t('cancel')}</Button></DialogClose>
                        <Button type="submit">{language === 'fr' ? "Ajouter l'employé" : 'Add Employee'}</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:border-slate-700">
                        <TableHead className="dark:text-slate-400">{language === 'fr' ? 'Employé' : 'Employee'}</TableHead>
                        <TableHead className="dark:text-slate-400">{t('service')}</TableHead>
                        <TableHead className="dark:text-slate-400">{language === 'fr' ? 'Poste' : 'Position'}</TableHead>
                        <TableHead className="dark:text-slate-400">{t('status')}</TableHead>
                        <TableHead className="dark:text-slate-400">{language === 'fr' ? "Date d'adhésion" : 'Join Date'}</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((emp: any) => {
                        const { first, last } = getEmpName(emp);
                        return (
                          <TableRow key={emp.id} className="dark:border-slate-700">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8"><AvatarFallback className="bg-slate-200 text-slate-700 text-xs">{first[0]}{last[0]}</AvatarFallback></Avatar>
                                <div><p className="font-medium dark:text-white">{first} {last}</p><p className="text-sm text-slate-500">{emp.email}</p></div>
                              </div>
                            </TableCell>
                            <TableCell className="dark:text-slate-300">{translateService(emp.service) ?? '—'}</TableCell>
                            <TableCell className="dark:text-slate-300">{translatePosition(emp.position)}</TableCell>
                            <TableCell>
                              <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                                {emp.status === 'active' ? (language === 'fr' ? 'actif' : 'active') : (language === 'fr' ? 'inactif' : 'inactive')}
                              </Badge>
                            </TableCell>
                            <TableCell className="dark:text-slate-300">{emp.joinDate}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { employees.toggleEmployeeStatus(emp.id); toast.success('Status updated'); }}>
                                    {emp.status === 'active'
                                      ? <><UserX className="w-4 h-4 mr-2" />{language === 'fr' ? 'Désactiver' : 'Deactivate'}</>
                                      : <><UserCheck className="w-4 h-4 mr-2" />{language === 'fr' ? 'Activer' : 'Activate'}</>}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { employees.deleteEmployee(emp.id); toast.success('Deleted'); }} className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />{t('delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Tasks ──────────────────────────────────────────────────── */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold dark:text-white">{t('allRequests')}</h2>
                <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                  <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />{language === 'fr' ? 'Assigner une tâche' : 'Assign Task'}</Button></DialogTrigger>
                  <DialogContent className="max-w-lg dark:bg-slate-800">
                    <DialogHeader><DialogTitle className="dark:text-white">{language === 'fr' ? 'Nouvelle tâche' : 'Assign New Task'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddTask} className="space-y-4">
                      <div className="space-y-2"><Label>{language === 'fr' ? 'Titre' : 'Title'}</Label><Input name="title" required /></div>
                      <div className="space-y-2"><Label>{language === 'fr' ? 'Assigné à' : 'Assigned To'}</Label>
                        <Select name="assignedTo" required>
                          <SelectTrigger><SelectValue placeholder={language === 'fr' ? 'Sélectionner un employé' : 'Select employee'} /></SelectTrigger>
                          <SelectContent>
                            {allRealEmployees.map((emp) => {
                              const { first, last } = getEmpName(emp);
                              return <SelectItem key={emp.id} value={emp.id}>{first} {last}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">{t('cancel')}</Button></DialogClose>
                        <Button type="submit">{language === 'fr' ? 'Assigner' : 'Assign'}</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="grid gap-4">
                {tasks.tasks.map((task) => {
                  const emp = employees.employees.find((e) => e.id === task.assignedTo);
                  return (
                    <Card key={task.id} className="dark:bg-slate-800 dark:border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold dark:text-white">{task.title}</h3>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status === 'completed' ? t('completed') : task.status === 'in-progress' ? t('inProgress') : t('pending')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1"><Users className="w-4 h-4" />{language === 'fr' ? 'Assigné à :' : 'Assigned to:'} {emp?.firstName} {emp?.lastName}</span>
                              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ''}</span>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => tasks.completeTask(task.id)}><CheckCircle2 className="w-4 h-4 mr-2" />{language === 'fr' ? 'Terminer' : 'Mark completed'}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => tasks.deleteTask(task.id)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />{t('delete')}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Validations ────────────────────────────────────────────── */}
          {activeTab === 'validations' && (
            <div className="space-y-6">

              {/* TABLE VIEW */}
              {validationView === 'table' && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    {(['pending','validated','rejected'] as const).map((s) => {
                      const count = requests.filter((r) => r.status === s).length;
                      const colors = { pending:'text-amber-700 dark:text-amber-400', validated:'text-green-700 dark:text-green-400', rejected:'text-red-700 dark:text-red-400' };
                      const labels = { pending: language==='fr'?'En attente':'Pending', validated: language==='fr'?'Validés':'Validated', rejected: language==='fr'?'Rejetés':'Rejected' };
                      return (
                        <Card key={s} className="dark:bg-slate-800 dark:border-slate-700">
                          <CardContent className="p-4"><p className="text-xs text-slate-500 mb-1">{labels[s]}</p><p className={`text-2xl font-bold ${colors[s]}`}>{count}</p></CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="relative w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder={language==='fr'?'Rechercher par nom, NIN...':'Search by name, NIN...'} value={requestSearch} onChange={(e)=>setRequestSearch(e.target.value)} className="pl-10" />
                  </div>

                  <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table className="min-w-[900px]">
                          <TableHeader>
                            <TableRow className="dark:border-slate-700">
                              <TableHead className="w-[150px] dark:text-slate-400">{language==='fr'?'Nom complet':'Full name'}</TableHead>
                              <TableHead className="w-[110px] dark:text-slate-400">NIN</TableHead>
                              <TableHead className="w-[160px] dark:text-slate-400">Email</TableHead>
                              <TableHead className="w-[100px] dark:text-slate-400">{language==='fr'?'Naissance':'Date of birth'}</TableHead>
                              <TableHead className="w-[100px] dark:text-slate-400">Commune</TableHead>
                              <TableHead className="w-[150px] dark:text-slate-400">{language==='fr'?'Adresse':'Address'}</TableHead>
                              <TableHead className="w-[75px] dark:text-slate-400">CNI PDF</TableHead>
                              <TableHead className="w-[90px] dark:text-slate-400">{language==='fr'?'Statut':'Status'}</TableHead>
                              <TableHead className="w-[70px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRequests.map((req) => (
                              <TableRow key={req.id} className="dark:border-slate-700">
                                <TableCell className="font-medium dark:text-white whitespace-nowrap">{req.firstName} {req.lastName}</TableCell>
                                <TableCell className="font-mono text-xs dark:text-slate-300 whitespace-nowrap">{req.nin.substring(0,9)}…</TableCell>
                                <TableCell className="text-blue-600 dark:text-blue-400 text-xs whitespace-nowrap">{req.email}</TableCell>
                                <TableCell className="dark:text-slate-300 text-sm whitespace-nowrap">{req.dob}</TableCell>
                                <TableCell className="dark:text-slate-300 text-sm whitespace-nowrap">{req.commune}</TableCell>
                                <TableCell className="dark:text-slate-300 text-xs max-w-[150px] truncate" title={req.address}>{req.address}</TableCell>
                                <TableCell>
                                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={()=>toast.info(`Opening CNI for ${req.firstName}`)}>
                                    <FileText className="w-3 h-3" />PDF
                                  </Button>
                                </TableCell>
                                <TableCell><RequestStatusBadge status={req.status} /></TableCell>
                                <TableCell>
                                  <Button size="sm" className="h-7 px-3 text-xs gap-1 whitespace-nowrap" onClick={()=>openDetail(req)}>
                                    <Eye className="w-3 h-3" />{language==='fr'?'Voir':'View'}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* DETAIL VIEW */}
              {validationView === 'detail' && selectedRequest && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={()=>setValidationView('table')} className="gap-2"><ArrowLeft className="w-4 h-4" />{language==='fr'?'Retour':'Back'}</Button>
                    <div>
                      <h2 className="text-lg font-semibold dark:text-white">{selectedRequest.firstName} {selectedRequest.lastName}</h2>
                      <p className="text-sm text-slate-500">{selectedRequest.email}</p>
                    </div>
                    <div className="ml-auto"><RequestStatusBadge status={selectedRequest.status} /></div>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-700 rounded-lg px-4 py-2.5 flex-wrap">
                    <span className="text-xs text-slate-500 shrink-0">{language==='fr'?'Vérification auto :':'Auto-check:'}</span>
                    <code className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-0.5 text-slate-700 dark:text-slate-300">
                      SELECT * FROM Registry WHERE nin_citizen = nin_registry
                    </code>
                    <span className={`ml-auto flex items-center gap-1.5 text-xs font-medium shrink-0 ${allMatch(selectedRequest)?'text-green-700 dark:text-green-400':'text-red-600 dark:text-red-400'}`}>
                      {allMatch(selectedRequest)
                        ? <><CheckCircle className="w-4 h-4" />{language==='fr'?'Correspondance trouvée':'Match found'}</>
                        : <><XCircle className="w-4 h-4" />{language==='fr'?'Divergence détectée':'Mismatch detected'}</>}
                    </span>
                  </div>

                  <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="p-0">
                      <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-700 border-b border-slate-100 dark:border-slate-700">
                        <div className="px-6 py-3 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{language==='fr'?'Informations citoyen':'Citizen information'}</span>
                        </div>
                        <div className="px-6 py-3 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{language==='fr'?'Registre (BDD)':'Registry record (DB)'}</span>
                        </div>
                      </div>
                      <div className="px-6 py-2">
                        <CompareRow label={language==='fr'?'Nom':'Last name'} citizen={selectedRequest.lastName} registry={selectedRequest.reg.lastName} />
                        <CompareRow label={language==='fr'?'Prénom':'First name'} citizen={selectedRequest.firstName} registry={selectedRequest.reg.firstName} />
                        <CompareRow label={language==='fr'?'Date de naissance':'Date of birth'} citizen={selectedRequest.dob} registry={selectedRequest.reg.dob} />
                        <CompareRow label="NIN" citizen={selectedRequest.nin} registry={selectedRequest.reg.nin} />
                        <CompareRow label={language==='fr'?'Commune':'Commune'} citizen={selectedRequest.commune} registry={selectedRequest.reg.commune} />
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-700 border-t border-slate-100 dark:border-slate-700">
                        <div className="px-6 py-4">
                          <p className="text-xs text-slate-400 mb-2">{language==='fr'?'CNI — scan soumis':'CNI — submitted scan'}</p>
                          <div className="h-20 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center gap-2 border border-dashed border-slate-300 dark:border-slate-600">
                            <FileText className="w-5 h-5 text-slate-400" /><span className="text-xs text-slate-400">cni_scan.pdf</span>
                          </div>
                        </div>
                        <div className="px-6 py-4">
                          <p className="text-xs text-slate-400 mb-2">{language==='fr'?'CNI — copie registre':'CNI — registry copy'}</p>
                          <div className="h-20 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center gap-2 border border-dashed border-slate-300 dark:border-slate-600">
                            <FileText className="w-5 h-5 text-slate-400" /><span className="text-xs text-slate-400">cni_registry.pdf</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedRequest.status === 'pending' && (
                    <div className="space-y-3">
                      {!showRejectInput ? (
                        <div className="flex gap-4">
                          <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2" onClick={()=>handleValidate(selectedRequest.id)}>
                            <ShieldCheck className="w-4 h-4" />{language==='fr'?"Valider — envoyer email d'activation":'Validate — send activation email'}
                          </Button>
                          <Button variant="destructive" className="flex-1 gap-2" onClick={()=>setShowRejectInput(true)}>
                            <ShieldX className="w-4 h-4" />{language==='fr'?'Rejeter — envoyer email de rejet':'Reject — send rejection email'}
                          </Button>
                        </div>
                      ) : (
                        <Card className="dark:bg-slate-800 border-red-200 dark:border-red-900">
                          <CardContent className="p-4 space-y-3">
                            <p className="text-sm font-medium text-red-700 dark:text-red-400">{language==='fr'?'Motif du rejet (envoyé par email)':'Rejection reason (sent by email)'}</p>
                            <textarea
                              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-sm resize-none bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                              rows={3}
                              placeholder={language==='fr'?'Ex : Le document CNI ne correspond pas...':'e.g. ID document does not match...'}
                              value={rejectReason}
                              onChange={(e)=>setRejectReason(e.target.value)}
                            />
                            <div className="flex gap-3 justify-end">
                              <Button variant="outline" size="sm" onClick={()=>{setShowRejectInput(false);setRejectReason('');}}>{t('cancel')}</Button>
                              <Button variant="destructive" size="sm" className="gap-1" onClick={()=>handleReject(selectedRequest.id)}>
                                <XCircle className="w-3.5 h-3.5" />{language==='fr'?'Confirmer le rejet':'Confirm rejection'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {selectedRequest.status === 'rejected' && selectedRequest.rejectionReason && (
                    <Card className="border-red-200 dark:border-red-900 dark:bg-slate-800">
                      <CardContent className="p-4">
                        <p className="text-xs text-slate-400 mb-1">{language==='fr'?'Motif du rejet':'Rejection reason'}</p>
                        <p className="text-sm text-red-700 dark:text-red-400">{selectedRequest.rejectionReason}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Messages / Chat with Socket.IO ────────────────────────────────── */}
          {activeTab === 'messages' && (
            <div className="flex gap-6 h-[calc(100vh-180px)]">
              
              {/* Conversation list */}
              <div className="w-72 flex-shrink-0">
                <Card className="dark:bg-slate-800 dark:border-slate-700 h-full">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium dark:text-white">
                      {language === 'fr' ? 'Conversations' : 'Conversations'}
                    </CardTitle>
                    {/* Connection status indicator */}
                    <div 
                      className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                      title={isSocketConnected ? 'Connected' : 'Disconnected'} 
                    />
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100%-60px)]">
                      {chats.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-400">
                          {language === 'fr' ? 'Aucune conversation' : 'No conversations yet'}
                        </div>
                      ) : (
                        chats.map((chat) => {
                          const unread = chat.messages.filter((m) => !m.read && m.from === 'citizen').length;
                          const last = chat.messages[chat.messages.length - 1];
                          return (
                            <button
                              key={chat.citizenId}
                              onClick={() => openChat(chat.citizenId)}
                              className={`w-full flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                                activeChatId === chat.citizenId ? 'bg-slate-50 dark:bg-slate-700' : ''
                              }`}
                            >
                              <Avatar className="w-9 h-9 flex-shrink-0">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                  {chat.citizenName.split(' ').map((n) => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium dark:text-white truncate">{chat.citizenName}</p>
                                  {unread > 0 && (
                                    <span className="ml-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center px-1 flex-shrink-0">
                                      {unread}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  {last?.text || (language === 'fr' ? 'Nouvelle conversation' : 'New conversation')}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{last?.time}</p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Chat window */}
              <div className="flex-1">
                {!activeChat ? (
                  <Card className="dark:bg-slate-800 dark:border-slate-700 h-full flex items-center justify-center">
                    <div className="text-center text-slate-400">
                      <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">
                        {language === 'fr' ? 'Sélectionnez une conversation' : 'Select a conversation'}
                      </p>
                      {!isSocketConnected && (
                        <p className="text-xs text-red-400 mt-2">
                          {language === 'fr' ? 'Connexion en cours...' : 'Connecting...'}
                        </p>
                      )}
                    </div>
                  </Card>
                ) : (
                  <Card className="dark:bg-slate-800 dark:border-slate-700 h-full flex flex-col">
                    {/* Chat header */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {activeChat.citizenName.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium dark:text-white text-sm">{activeChat.citizenName}</p>
                        <p className="text-xs text-slate-500">{activeChat.citizenEmail}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 px-5 py-4">
                      <div className="space-y-3">
                        {activeChat.messages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.from === 'agent' ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                                msg.from === 'agent'
                                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-sm'
                              }`}
                            >
                              <p className="text-sm leading-relaxed">{msg.text}</p>
                              <p
                                className={`text-[10px] mt-1 ${
                                  msg.from === 'agent' ? 'text-primary-foreground/70 text-right' : 'text-slate-400'
                                }`}
                              >
                                {msg.time}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex gap-3">
                        <Input
                          placeholder={language === 'fr' ? 'Écrire un message...' : 'Type a message...'}
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendAgentMessage();
                            }
                          }}
                          disabled={!isSocketConnected}
                          className="flex-1"
                        />
                        <Button 
                          onClick={sendAgentMessage} 
                          disabled={!chatMessage.trim() || !isSocketConnected} 
                          size="icon"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* ── Settings ───────────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">{language==='fr'?'Paramètres Agent Municipal':'Municipal Agent Settings'}</CardTitle>
                  <CardDescription>{language==='fr'?'Gérer les paramètres de votre compte':'Manage your account settings'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2"><Label>{t('email')}</Label><Input value={user.email} disabled /></div>
                  <div className="space-y-2"><Label>{language==='fr'?'Nom complet':'Full Name'}</Label><Input value={`${user.firstName} ${user.lastName}`} disabled /></div>
                  <div className="space-y-2"><Label>{t('service')}</Label><Input value={user.service} disabled /></div>
                  <div className="space-y-2"><Label>{language==='fr'?'Poste':'Position'}</Label><Input value={user.position} disabled /></div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium dark:text-white">{t('logout')}</p>
                      <p className="text-sm text-slate-500">{language==='fr'?'Se déconnecter':'Sign out of your account'}</p>
                    </div>
                    <Button variant="outline" onClick={onLogout}><LogOut className="w-4 h-4 mr-2" />{t('logout')}</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}