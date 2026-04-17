import { useState } from 'react';
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
import { toast } from 'sonner';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Settings,
  LogOut,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  UserCheck,
  UserX,
  Briefcase,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Moon,
  Sun,
} from 'lucide-react';

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

const SERVICES = [
  { id: 'civil', name: 'Civil Status', nameFr: 'État Civil', color: 'bg-blue-500' },
  { id: 'autorisation', name: ' Right-of-way permit', nameFr: 'autorisation de voirie', color: 'bg-green-500' },
];

export function MunicipalAgentDashboard({ user, onLogout, employees, tasks, isDark, toggleDarkMode }: MunicipalAgentDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newEmployeeService, setNewEmployeeService] = useState<string>('État civil');
  const [newEmployeePosition, setNewEmployeePosition] = useState<string>('Fiche de Résidence');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const { t, language } = useLanguage();

  const totalEmployees = employees.employees.filter((e) => e.role !== 'Municipal_Agent').length;
  const activeEmployees = employees.employees.filter((e) => e.role !== 'Municipal_Agent' && e.status === 'active').length;
  const totalTasks = tasks.tasks.length;
  const completedTasks = tasks.tasks.filter((t) => t.status === 'completed').length;

  const filteredEmployees = employees.employees.filter(
    (emp) =>
      emp.role !== 'Municipal_Agent' &&
      (emp.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.service && emp.service.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const allRealEmployees = employees.employees.filter((e) => e.role !== 'Municipal_Agent');

  const employeesByService = SERVICES.map((service) => ({
    ...service,
    employees: allRealEmployees.filter(
      (emp) =>
        emp.service?.toLowerCase().includes(service.name.toLowerCase()) ||
        emp.service?.toLowerCase().includes(service.nameFr.toLowerCase()) ||
        emp.position?.toLowerCase().includes(service.name.toLowerCase()) ||
        emp.position?.toLowerCase().includes(service.nameFr.toLowerCase())
    ),
  }));

  const handleAddEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const service = newEmployeeService || (formData.get('service') as string) || 'État civil';
    const position = newEmployeePosition || (formData.get('poste') as string) || 'Fiche de résidence';
    const newEmployee = {
      email: formData.get('email') as string,
      password: 'employee123',
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      role: 'employee' as const,
      service,
      position,
      phone: formData.get('phone') as string,
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active' as const,
    };
    employees.addEmployee(newEmployee);
    setIsAddEmployeeOpen(false);
    setNewEmployeeService('État civil');
    setNewEmployeePosition('Fiche de résidence');
    toast.success(language === 'fr' ? 'Employé ajouté avec succès' : 'Employee added successfully');
  };

  const handleAddTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTask = {
      title: formData.get('title') as string,
      assignedTo: formData.get('assignedTo') as string,
      assignedBy: user.id,
      status: 'pending' as const,
    };
    tasks.addTask(newTask);
    setIsAddTaskOpen(false);
    toast.success(language === 'fr' ? 'Tâche assignée avec succès' : 'Task assigned successfully');
  };

  const handleDeleteEmployee = (id: string) => {
    employees.deleteEmployee(id);
    toast.success(language === 'fr' ? 'Employé supprimé avec succès' : 'Employee deleted successfully');
  };

  const handleToggleStatus = (id: string) => {
    employees.toggleEmployeeStatus(id);
    toast.success(language === 'fr' ? "Statut de l'employé mis à jour" : 'Employee status updated');
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTabTitle = () => {
    const titles: Record<string, { fr: string; en: string }> = {
      dashboard: { fr: 'Aperçu du tableau de bord', en: 'Dashboard Overview' },
      employees: { fr: 'Gestion des employés', en: 'Employee Management' },
      tasks: { fr: 'Gestion des tâches', en: 'Task Management' },
      settings: { fr: 'Paramètres', en: 'Settings' },
    };
    return titles[activeTab]?.[language] ?? activeTab;
  };

  const CompactEmployeeCard = ({ employee }: { employee: User }) => (
    <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:shadow-md transition-shadow">
      <Avatar className="w-8 h-8">
        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
          {employee.firstName?.[0]}{employee.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate dark:text-white">{employee.firstName} {employee.lastName}</p>
        <p className="text-xs text-slate-500 truncate">{employee.service}</p>
      </div>
      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
    </div>
  );

  const SidebarItem = ({ icon: Icon, label, value, badge }: { icon: React.ElementType; label: string; value: string; badge?: number }) => (
    <button
      onClick={() => setActiveTab(value)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
        activeTab === value
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <span className="font-medium">{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <Badge variant={activeTab === value ? 'secondary' : 'destructive'} className="text-xs">
          {badge}
        </Badge>
      )}
    </button>
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
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'fr' ? "Panneau Agent Municipal" : 'Municipal Agent Panel'}
              </p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            <SidebarItem icon={LayoutDashboard} label={t('dashboard')} value="dashboard" />
            <SidebarItem icon={Users} label={t('employees')} value="employees" />
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
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            {t('logout')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{getTabTitle()}</h1>
              <p className="text-slate-500 dark:text-slate-400">
                {language === 'fr' ? `Bienvenue, ${user.firstName} !` : `Welcome, ${user.firstName}!`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Button variant="outline" size="icon" onClick={toggleDarkMode}>
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <div className="text-right">
                <p className="text-sm font-medium dark:text-white">
                  {new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">

          {/* ── Dashboard Tab ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {language === 'fr' ? 'Total des employés' : 'Total Employees'}
                    </CardTitle>
                    <Users className="w-4 h-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold dark:text-white">{totalEmployees}</div>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {activeEmployees} {language === 'fr' ? 'actifs' : 'active'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {language === 'fr' ? 'Total des tâches' : 'Total Tasks'}
                    </CardTitle>
                    <CheckSquare className="w-4 h-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold dark:text-white">{totalTasks}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {language === 'fr' ? 'Pour tous les employés' : 'For all employees'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {t('completed')}
                    </CardTitle>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold dark:text-white">{completedTasks}</div>
                    <p className="text-xs text-green-600 mt-1">
                      {Math.round((completedTasks / totalTasks) * 100) || 0}% {language === 'fr' ? "taux d'achèvement" : 'completion rate'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Service Cards */}
              <div>
                <h2 className="text-lg font-semibold dark:text-white mb-3">
                  {language === 'fr' ? 'Services' : 'Services'}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {employeesByService.map((service) => (
                    <Card
                      key={service.id}
                      className={`cursor-pointer transition-all dark:bg-slate-800 dark:border-slate-700 ${
                        selectedService === service.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedService(service.id === selectedService ? null : service.id)}
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${service.color}`}></div>
                          <CardTitle className="text-sm dark:text-white">
                            {language === 'en' ? service.name : service.nameFr}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-xs text-slate-500">
                          {service.employees.length} {language === 'en' ? 'employees' : 'employés'}
                        </p>
                        {selectedService === service.id && service.employees.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {service.employees.map((emp) => (
                              <CompactEmployeeCard key={emp.id} employee={emp} />
                            ))}
                          </div>
                        )}
                        {selectedService === service.id && service.employees.length === 0 && (
                          <p className="text-xs text-slate-400 mt-2 italic">
                            {language === 'fr' ? 'Aucun employé assigné' : 'No employees assigned'}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Employees Tab ── */}
          {activeTab === 'employees' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="relative w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder={language === 'fr' ? 'Rechercher des employés...' : 'Search employees...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('addEmployee')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg dark:bg-slate-800">
                    <DialogHeader>
                      <DialogTitle className="dark:text-white">
                        {language === 'fr' ? 'Ajouter un nouvel employé' : 'Add New Employee'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddEmployee} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">{t('firstName')}</Label>
                          <Input id="firstName" name="firstName" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">{t('lastName')}</Label>
                          <Input id="lastName" name="lastName" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t('email')}</Label>
                        <Input id="email" name="email" type="email" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('phone')}</Label>
                        <Input id="phone" name="phone" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service">{t('service')}</Label>
                        <Select name="service" required value={newEmployeeService} onValueChange={setNewEmployeeService}>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'fr' ? 'Sélectionner un service' : 'Select a service'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="État civil">État civil</SelectItem>
                            <SelectItem value="Autorisation de voirie">Autorisation de voirie</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="poste">{language === 'fr' ? 'Poste' : 'Position'}</Label>
                        <Select name="poste" required value={newEmployeePosition} onValueChange={setNewEmployeePosition}>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'fr' ? 'Sélectionner un poste' : 'Select a position'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Acte de naissance">Acte de naissance</SelectItem>
                            <SelectItem value="Fiche de résidence">Fiche de résidence</SelectItem>
                            <SelectItem value="Certificat de résidence">Certificat de résidence</SelectItem>
                            <SelectItem value="Certificat de mariage">Certificat de mariage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="outline">{t('cancel')}</Button>
                        </DialogClose>
                        <Button type="submit">
                          {language === 'fr' ? "Ajouter l'employé" : 'Add Employee'}
                        </Button>
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
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((emp) => (
                        <TableRow key={emp.id} className="dark:border-slate-700">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
                                  {emp.firstName[0]}{emp.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium dark:text-white">{emp.firstName} {emp.lastName}</p>
                                <p className="text-sm text-slate-500">{emp.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="dark:text-slate-300">{emp.service ?? '—'}</TableCell>
                          <TableCell className="dark:text-slate-300">{emp.position}</TableCell>
                          <TableCell>
                            <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                              {emp.status === 'active'
                                ? (language === 'fr' ? 'actif' : 'active')
                                : (language === 'fr' ? 'inactif' : 'inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell className="dark:text-slate-300">{emp.joinDate}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleToggleStatus(emp.id)}>
                                  {emp.status === 'active' ? (
                                    <><UserX className="w-4 h-4 mr-2" />{language === 'fr' ? 'Désactiver' : 'Deactivate'}</>
                                  ) : (
                                    <><UserCheck className="w-4 h-4 mr-2" />{language === 'fr' ? 'Activer' : 'Activate'}</>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteEmployee(emp.id)} className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />{t('delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Tasks Tab ── */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold dark:text-white">{t('allRequests')}</h2>
                <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      {language === 'fr' ? 'Assigner une tâche' : 'Assign Task'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg dark:bg-slate-800">
                    <DialogHeader>
                      <DialogTitle className="dark:text-white">
                        {language === 'fr' ? 'Assigner une nouvelle tâche' : 'Assign New Task'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddTask} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">{language === 'fr' ? 'Titre de la tâche' : 'Task Title'}</Label>
                        <Input id="title" name="title" required />
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="outline">{t('cancel')}</Button>
                        </DialogClose>
                        <Button type="submit">
                          {language === 'fr' ? 'Assigner la tâche' : 'Assign Task'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {tasks.tasks.map((task) => {
                  const assignedEmployee = employees.employees.find((e) => e.id === task.assignedTo);
                  return (
                    <Card key={task.id} className="dark:bg-slate-800 dark:border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold dark:text-white">{task.title}</h3>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status === 'completed'
                                  ? t('completed')
                                  : task.status === 'in-progress'
                                  ? t('inProgress')
                                  : t('pending')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {language === 'fr' ? 'Assigné à :' : 'Assigned to:'} {assignedEmployee?.firstName} {assignedEmployee?.lastName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                              </span>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => tasks.completeTask(task.id)}>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                {language === 'fr' ? 'Marquer comme terminé' : 'Mark as completed'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => tasks.deleteTask(task.id)} className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />{t('delete')}
                              </DropdownMenuItem>
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

          {/* ── Settings Tab ── */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">
                    {language === 'fr' ? 'Paramètres Agent Municipal' : 'Municipal Agent Settings'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'fr' ? 'Gérer les paramètres de votre compte' : 'Manage your account settings'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>{t('email')}</Label>
                    <Input value={user.email} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'fr' ? 'Nom complet' : 'Full Name'}</Label>
                    <Input value={`${user.firstName} ${user.lastName}`} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('service')}</Label>
                    <Input value={user.service} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'fr' ? 'Poste' : 'Position'}</Label>
                    <Input value={user.position} disabled />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium dark:text-white">{t('logout')}</p>
                      <p className="text-sm text-slate-500">
                        {language === 'fr' ? 'Se déconnecter de votre compte' : 'Sign out of your account'}
                      </p>
                    </div>
                    <Button variant="outline" onClick={onLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('logout')}
                    </Button>
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