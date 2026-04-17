import { useState, useMemo } from 'react';
import type { User, Task } from '@/types';
import type { EmployeeNotification } from '@/types/citizen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { CitizenRequestModal } from '@/components/CitizenRequestModal';
import { BirthActTraitmentDialog } from '@/components/BirthActTraitmentDialog';
import { CarteSejourTraitmentDialog } from '@/components/CarteSejourTraitmentDialog';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

import {
  LayoutDashboard, CheckSquare, UserCircle, Settings, LogOut,
  Mail, Phone, Briefcase, Building, Calendar, Clock,
  CheckCircle2, Award, Bell, Moon, Sun, FileText, Search, Filter, Eye,
} from 'lucide-react';

interface EmployeeDashboardProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
  tasks: {
    tasks: Task[];
    updateTask: (id: string, updates: Partial<Task>) => void;
    completeTask: (id: string) => void;
    getTasksByEmployee: (employeeId: string) => Task[];
  };
  notifications: {
    notifications: EmployeeNotification[];
    getUnreadCount: () => number;
    markNotificationAsRead: (id: string) => void;
    markAllAsRead: () => void;
  };
}

interface TaskWithCitizen extends Task {
  citizen?: {
    firstName: string;
    lastName: string;
    email: string;
    nin: string;
    // Sarah
    wilaya?: string;
    commune?: string;
    actYear?: string;
    actNumber?: string;
    // Fatima
    cni?: string;
    cniFileUrl?: string;
    factureFileUrl?: string;
    dateNaissance?: string;
    adresse?: string;
  };
  documentStatus?: 'pending' | 'verified' | 'rejected' | 'missing';
  requestType?: string;
}

export function EmployeeDashboard({
  user, onLogout, onUpdateUser, tasks, notifications, isDark, toggleDarkMode,
}: EmployeeDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { t, language } = useLanguage();

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sarah — Acte de naissance
  const [birthActOpen, setBirthActOpen] = useState(false);
  const [birthActTask, setBirthActTask] = useState<TaskWithCitizen | null>(null);

  // Fatima — Carte de séjour
  const [carteSejourOpen, setCarteSejourOpen] = useState(false);
  const [carteSejourTask, setCarteSejourTask] = useState<TaskWithCitizen | null>(null);

  const myTasks = tasks.getTasksByEmployee(user.id) as TaskWithCitizen[];

  const serviceLower = (user.service || '').toLowerCase();
  const positionLower = (user.position || '').toLowerCase();

  const isBirthActEmployee = serviceLower.includes('naissance') || positionLower.includes('naissance');
  const isCarteSejourEmployee = serviceLower.includes('séjour') || serviceLower.includes('sejour') ||
    positionLower.includes('séjour') || positionLower.includes('sejour');

  const showBirthActColumns = isBirthActEmployee;
  const showCarteSejourColumns = isCarteSejourEmployee;

  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return myTasks.filter((task) => {
      const c = task.citizen;
      const matchesSearch =
        c?.firstName?.toLowerCase().includes(q) ||
        c?.lastName?.toLowerCase().includes(q) ||
        c?.email?.toLowerCase().includes(q) ||
        c?.nin?.toLowerCase().includes(q) ||
        c?.wilaya?.toLowerCase().includes(q) ||
        c?.commune?.toLowerCase().includes(q) ||
        c?.actYear?.toLowerCase().includes(q) ||
        c?.actNumber?.toLowerCase().includes(q) ||
        c?.cni?.toLowerCase().includes(q) ||
        c?.dateNaissance?.toLowerCase().includes(q) ||
        task.title?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [myTasks, searchQuery, statusFilter]);

  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');
  const pendingTasks = filteredTasks.filter((t) => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in-progress');
  const unreadNotifications = notifications.getUnreadCount();

  const handleViewTask = (task: TaskWithCitizen) => {
    if (isBirthActEmployee) {
      setBirthActTask(task);
      setBirthActOpen(true);
    } else if (isCarteSejourEmployee) {
      setCarteSejourTask(task);
      setCarteSejourOpen(true);
    } else {
      handleOpenModal(task.id);
    }
  };

  const handleOpenModal = (taskId: string) => {
    setSelectedRequestId(taskId);
    setIsModalOpen(true);
  };

  const handleProcessTask = (task: TaskWithCitizen) => handleViewTask(task);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequestId(null);
  };

  const handleValidationComplete = () => {
    handleCloseModal();
    toast.success(language === 'fr' ? 'Liste des tâches mise à jour' : 'Task list updated');
  };

  const handleUpdateProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onUpdateUser({ ...user, firstName: formData.get('firstName') as string, lastName: formData.get('lastName') as string, phone: formData.get('phone') as string });
    setIsEditing(false);
    toast.success(language === 'fr' ? 'Profil mis à jour avec succès' : 'Profile updated successfully');
  };

  const SidebarItem = ({ icon: Icon, label, value, badge }: { icon: React.ElementType; label: string; value: string; badge?: number }) => (
    <button onClick={() => setActiveTab(value)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
        activeTab === value ? 'bg-primary text-primary-foreground shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <span className="font-medium">{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <Badge variant={activeTab === value ? 'secondary' : 'destructive'} className="text-xs">{badge}</Badge>
      )}
    </button>
  );

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400';
      case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400';
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'completed': return t('completed');
      case 'in-progress': return t('inProgress');
      case 'pending': return t('pending');
    }
  };

  const getDocumentStatusColor = (status?: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getDocumentStatusLabel = (status?: string) => {
    const labels: Record<string, { fr: string; en: string }> = {
      verified: { fr: 'Vérifié', en: 'Verified' },
      rejected: { fr: 'Rejeté', en: 'Rejected' },
      pending: { fr: 'En attente', en: 'Pending' },
      missing: { fr: 'Manquant', en: 'Missing' },
    };
    return labels[status || '']?.[language] ?? (language === 'fr' ? 'Non spécifié' : 'Not specified');
  };

  const getTabTitle = () => {
    const titles: Record<string, { fr: string; en: string }> = {
      dashboard: { fr: 'Mon tableau de bord', en: 'My Dashboard' },
      tasks: { fr: 'Mes tâches', en: 'My Tasks' },
      profile: { fr: 'Mon profil', en: 'My Profile' },
      settings: { fr: 'Paramètres', en: 'Settings' },
    };
    return titles[activeTab]?.[language] ?? activeTab;
  };

  const dash = (v?: string | null) =>
    v ? <span className="text-sm text-slate-700 dark:text-slate-200">{v}</span> : <span className="text-slate-400">—</span>;

  const TasksTable = ({ tasks }: { tasks: TaskWithCitizen[] }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <tr>
              {/* Sarah columns */}
              {showBirthActColumns && (
                <>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('wilaya')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('commune')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('firstName')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('lastName')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('birthActYear')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('birthActNumber')}</th>
                </>
              )}
              {/* Fatima columns */}
              {showCarteSejourColumns && (
                <>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('firstName')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('lastName')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">CNI</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    {language === 'fr' ? 'Date Naissance' : 'Birth Date'}
                  </th>
                </>
              )}
              {/* Default columns */}
              {!showBirthActColumns && !showCarteSejourColumns && (
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('citizen')}</th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('email')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('nin')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('status')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Document</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                {/* Sarah row cells */}
                {showBirthActColumns && (
                  <>
                    <td className="px-3 py-3 whitespace-nowrap">{dash(task.citizen?.wilaya)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{dash(task.citizen?.commune)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{dash(task.citizen?.firstName)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{dash(task.citizen?.lastName)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{dash(task.citizen?.actYear)}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-xs">{dash(task.citizen?.actNumber)}</td>
                  </>
                )}
                {/* Fatima row cells */}
                {showCarteSejourColumns && (
                  <>
                    <td className="px-3 py-3 whitespace-nowrap">{dash(task.citizen?.firstName)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{dash(task.citizen?.lastName)}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-xs">{dash(task.citizen?.cni)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{dash(task.citizen?.dateNaissance)}</td>
                  </>
                )}
                {/* Default row cell */}
                {!showBirthActColumns && !showCarteSejourColumns && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-primary">
                          {task.citizen?.firstName?.[0] || '?'}{task.citizen?.lastName?.[0] || '?'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {task.citizen?.firstName && task.citizen?.lastName
                          ? `${task.citizen.firstName} ${task.citizen.lastName}`
                          : <span className="text-slate-400 italic">{language === 'fr' ? 'Non assigné' : 'Unassigned'}</span>}
                      </span>
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {task.citizen?.email || <span className="text-slate-400">-</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {task.citizen?.nin
                    ? <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{task.citizen.nin}</span>
                    : <span className="text-slate-400">-</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge className={`${getStatusColor(task.status)} text-xs`}>{getStatusLabel(task.status)}</Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge className={`${getDocumentStatusColor(task.documentStatus)} text-xs`}>
                    <FileText className="w-3 h-3 mr-1" />
                    {getDocumentStatusLabel(task.documentStatus)}
                  </Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm"
                      className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      onClick={() => handleViewTask(task)}>
                      <Eye className="w-4 h-4 mr-1" />
                      {language === 'fr' ? 'Voir' : 'View'}
                    </Button>
                    {(task.status === 'pending' || task.status === 'in-progress') && (
                      <Button size="sm" onClick={() => handleProcessTask(task)} className="h-8 bg-blue-600 hover:bg-blue-700">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {t('process')}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tasks.length === 0 && (
        <div className="p-8 text-center">
          <CheckSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">{language === 'fr' ? 'Aucune tâche trouvée' : 'No tasks found'}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">BALADIYA DIGITAL</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{language === 'fr' ? 'Portail Employé' : 'Employee Portal'}</p>
            </div>
          </div>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            <SidebarItem icon={LayoutDashboard} label={t('dashboard')} value="dashboard" />
            <SidebarItem icon={CheckSquare} label={t('myTasks')} value="tasks" badge={pendingTasks.length + inProgressTasks.length} />
            <SidebarItem icon={UserCircle} label={t('profile')} value="profile" />
            <SidebarItem icon={Settings} label={t('settings')} value="settings" />
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user.firstName[0]}{user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate dark:text-white">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.position}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />{t('logout')}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
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
              <NotificationsPanel
                notifications={notifications.notifications as EmployeeNotification[]}
                unreadCount={unreadNotifications}
                onMarkAsRead={notifications.markNotificationAsRead}
                onMarkAllAsRead={notifications.markAllAsRead}
                onViewRequest={(rid) => { if (rid) handleOpenModal(rid); }}
              />
              <div className="text-right">
                <p className="text-sm font-medium dark:text-white">
                  {new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{language === 'fr' ? `Bonjour, ${user.firstName} ! 👋` : `Hello, ${user.firstName}! 👋`}</h2>
                      <p className="text-primary-foreground/80">
                        {language === 'fr' ? `Vous avez ${pendingTasks.length} dossiers en attente et ${unreadNotifications} notifications non lues.` : `You have ${pendingTasks.length} pending dossiers and ${unreadNotifications} unread notifications.`}
                      </p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                      <Award className="w-8 h-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: t('totalTasks'), value: myTasks.length, sub: language === 'fr' ? 'Assignées à vous' : 'Assigned to you', icon: <CheckSquare className="w-4 h-4 text-slate-400" />, color: 'text-slate-500' },
                  { label: t('pending'), value: pendingTasks.length, sub: t('toProcess'), icon: <Clock className="w-4 h-4 text-amber-500" />, color: 'text-amber-600' },
                  { label: t('completed'), value: completedTasks.length, sub: completedTasks.length === 0 ? (language === 'fr' ? 'Aucune tâche terminée' : 'No tasks done yet') : (language === 'fr' ? 'Bon travail !' : 'Great work!'), icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, color: 'text-green-600' },
                  { label: t('unreadMessages'), value: unreadNotifications, sub: t('unreadMessages'), icon: <Bell className="w-4 h-4 text-orange-500" />, color: 'text-orange-600' },
                ].map(({ label, value, sub, icon, color }) => (
                  <Card key={label} className="dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</CardTitle>
                      {icon}
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold dark:text-white">{value}</div>
                      <p className={`text-xs ${color} mt-1`}>{sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder={language === 'fr' ? 'Rechercher par nom, email, NIN...' : 'Search by name, email, NIN...'}
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 dark:bg-slate-900 dark:border-slate-700" />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="all">{language === 'fr' ? 'Tous les statuts' : 'All statuses'}</option>
                    <option value="pending">{t('pending')}</option>
                    <option value="in-progress">{t('inProgress')}</option>
                    <option value="completed">{t('completed')}</option>
                  </select>
                </div>
              </div>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="dark:bg-slate-800">
                  <TabsTrigger value="all" className="dark:data-[state=active]:bg-slate-700">{language === 'fr' ? 'Toutes' : 'All'} ({filteredTasks.length})</TabsTrigger>
                  <TabsTrigger value="pending" className="dark:data-[state=active]:bg-slate-700">{t('pending')} ({pendingTasks.length})</TabsTrigger>
                  <TabsTrigger value="in-progress" className="dark:data-[state=active]:bg-slate-700">{t('inProgress')} ({inProgressTasks.length})</TabsTrigger>
                  <TabsTrigger value="completed" className="dark:data-[state=active]:bg-slate-700">{t('completed')} ({completedTasks.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-6"><TasksTable tasks={filteredTasks} /></TabsContent>
                <TabsContent value="pending" className="mt-6"><TasksTable tasks={pendingTasks} /></TabsContent>
                <TabsContent value="in-progress" className="mt-6"><TasksTable tasks={inProgressTasks} /></TabsContent>
                <TabsContent value="completed" className="mt-6"><TasksTable tasks={completedTasks} /></TabsContent>
              </Tabs>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="max-w-3xl">
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="dark:text-white">{t('profile')}</CardTitle>
                      <CardDescription>{language === 'fr' ? 'Voir et gérer vos informations de profil' : 'View and manage your profile information'}</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>{isEditing ? t('cancel') : t('edit')}</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="firstName">{t('firstName')}</Label><Input id="firstName" name="firstName" defaultValue={user.firstName} required /></div>
                        <div className="space-y-2"><Label htmlFor="lastName">{t('lastName')}</Label><Input id="lastName" name="lastName" defaultValue={user.lastName} required /></div>
                      </div>
                      <div className="space-y-2"><Label htmlFor="email">{t('email')}</Label><Input id="email" value={user.email} disabled /></div>
                      <div className="space-y-2"><Label htmlFor="phone">{t('phone')}</Label><Input id="phone" name="phone" defaultValue={user.phone} required /></div>
                      <div className="space-y-2"><Label>{t('service')}</Label><Input value={user.service} disabled /></div>
                      <div className="flex gap-4">
                        <Button type="submit">{t('save')}</Button>
                        <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>{t('cancel')}</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-6">
                        <Avatar className="w-24 h-24">
                          <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-2xl font-bold dark:text-white">{user.firstName} {user.lastName}</h3>
                          <p className="text-slate-500">{user.position}</p>
                          <Badge className="mt-2">{user.service}</Badge>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          {[{ icon: Mail, label: t('email'), value: user.email }, { icon: Phone, label: t('phone'), value: user.phone }].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex items-center gap-3">
                              <Icon className="w-5 h-5 text-slate-400" />
                              <div><p className="text-sm text-slate-500">{label}</p><p className="font-medium dark:text-white">{value}</p></div>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-4">
                          {[
                            { icon: Building, label: t('service'), value: user.service },
                            { icon: Briefcase, label: language === 'fr' ? 'Poste' : 'Position', value: user.position },
                            { icon: Calendar, label: language === 'fr' ? "Date d'adhésion" : 'Join Date', value: user.joinDate },
                          ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex items-center gap-3">
                              <Icon className="w-5 h-5 text-slate-400" />
                              <div><p className="text-sm text-slate-500">{label}</p><p className="font-medium dark:text-white">{value}</p></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">{t('settings')}</CardTitle>
                  <CardDescription>{language === 'fr' ? 'Gérer vos préférences de compte' : 'Manage your account preferences'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2"><Label>{t('email')}</Label><Input value={user.email} disabled /><p className="text-sm text-slate-500">{language === 'fr' ? 'Votre email ne peut pas être modifié' : 'Your email cannot be changed'}</p></div>
                  <div className="space-y-2"><Label>{language === 'fr' ? 'Nom complet' : 'Full Name'}</Label><Input value={`${user.firstName} ${user.lastName}`} disabled /></div>
                  <div className="space-y-2"><Label>{t('service')}</Label><Input value={user.service} disabled /></div>
                  <Separator />
                  <Button variant="outline" onClick={onLogout}><LogOut className="w-4 h-4 mr-2" />{t('logout')}</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Sarah — Acte de naissance */}
      <BirthActTraitmentDialog
        open={birthActOpen}
        onOpenChange={(open) => { setBirthActOpen(open); if (!open) setBirthActTask(null); }}
        citizen={birthActTask?.citizen ?? null}
        language={language}
        onCancel={() => setBirthActTask(null)}
        onValidate={() => {}}
      />

      {/* Fatima — Carte de séjour */}
      <CarteSejourTraitmentDialog
        open={carteSejourOpen}
        onOpenChange={(open) => { setCarteSejourOpen(open); if (!open) setCarteSejourTask(null); }}
        citizen={carteSejourTask?.citizen ?? null}
        language={language}
        onCancel={() => setCarteSejourTask(null)}
        onValidate={() => {}}
      />

      {/* Other employees */}
      <CitizenRequestModal
        requestId={selectedRequestId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        position={user.position }
        onValidationComplete={handleValidationComplete}
        language={language}
      />
    </div>
  );
}