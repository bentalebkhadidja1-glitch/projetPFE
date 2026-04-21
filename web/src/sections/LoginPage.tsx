import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Lock, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import logoImage from '@/assets/logo.jpg';

interface LoginPageProps {
  onLogin: (email: string, password: string) => boolean | Promise<boolean>;
  isDark: boolean;
  toggleDarkMode: () => void;
}

export function LoginPage({ onLogin, isDark, toggleDarkMode }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = onLogin(email, password);
      const success = result instanceof Promise ? await result : result;
      if (!success) {
        setError(
          t('login') === 'Login'
            ? 'Invalid email or password. Is the API running on port 5000?'
            : 'Email ou mot de passe invalide. Le serveur API est-il démarré (port 5000) ?'
        );
      }
    } catch {
      setError(
        t('login') === 'Login'
          ? 'Cannot reach server. Start the backend (e.g. npm run dev in /backend) and try again.'
          : 'Impossible de joindre le serveur. Démarrez le backend (ex. npm run dev dans /backend) puis réessayez.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">

      {/* Top-right buttons: Language + Dark Mode */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSwitcher />
        <Button variant="outline" size="icon" onClick={toggleDarkMode}>
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl overflow-hidden shadow-lg mb-4">
            <img src={logoImage} alt="Logo E-Baladiya" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">BALADIYA DIGITAL</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            {t('login') === 'Login'
              ? 'Employee Management System'
              : 'Système de Gestion des Employés'}
          </p>
        </div>

        <Card className="shadow-xl border-0 dark:bg-slate-800">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold dark:text-white">{t('welcome')}</CardTitle>
            <CardDescription>
              {t('login') === 'Login'
                ? 'Enter your credentials to access your account'
                : 'Entrez vos identifiants pour accéder à votre compte'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nom@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {t('login') === 'Login' ? 'Password' : 'Mot de passe'}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={
                      t('login') === 'Login'
                        ? 'Enter your password'
                        : 'Entrez votre mot de passe'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading
                  ? t('loading')
                  : t('login') === 'Login' ? 'Sign in' : 'Se connecter'}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                {t('login') === 'Login' ? 'Demo credentials:' : 'Identifiants de démonstration :'}
              </p>
              <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                <p>
                  <span className="font-medium">
                    {t('login') === 'Login' ? 'Municipal Agent:' : 'Agent Municipal :'}
                  </span>{' '}
                  municipal_agent@gmail.com / municipalagent123
                </p>
                <p>
                  <span className="font-medium">
                    {t('login') === 'Login' ? 'Employee:' : 'Employé :'}
                  </span>{' '}
                  name@gmail.com / employee123
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8">
          © 2026 BALADIYA DIGITAL.{' '}
          {t('login') === 'Login' ? 'All rights reserved.' : 'Tous droits réservés.'}
        </p>
      </div>
    </div>
  );
}