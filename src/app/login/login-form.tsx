'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { BrandMark } from '@/components/layout/brand-mark';
import { loginAction } from '@/lib/auth/actions';
import type { UserRole } from '@/types';

const DEMO_ROLES: UserRole[] = ['admin', 'hr_manager', 'dept_manager', 'employee'];

interface LoginFormProps {
  mode: 'demo' | 'db';
}

export function LoginForm({ mode }: LoginFormProps) {
  const t = useTranslations('auth');
  const tRole = useTranslations('role');
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginDemo = useAuthStore((s) => s.loginDemo);
  const loginDemoByRole = useAuthStore((s) => s.loginDemoByRole);
  const setDbSession = useAuthStore((s) => s.setDbSession);
  const branding = useSettingsStore((s) => s.branding);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = searchParams.get('redirect') ?? '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'db') {
        const result = await loginAction(email, password);
        if (result.ok && result.user) {
          setDbSession(result.user);
          router.push(redirectTo);
          return;
        }
        setError(
          result.error === 'invalid_credentials'
            ? t('invalidCredentials')
            : result.error === 'inactive_account'
              ? t('inactiveAccount')
              : t('serverError'),
        );
      } else {
        if (loginDemo(email, password)) {
          router.push(redirectTo);
          return;
        }
        setError(t('invalidCredentials'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = (role: UserRole) => {
    loginDemoByRole(role);
    router.push(redirectTo);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          {branding.logo_version ? (
            <BrandMark size={48} className="mb-1" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BrandMark size={24} className="text-primary-foreground" />
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight">{branding.app_name || 'HRMS'}</h1>
          <p className="text-sm text-muted-foreground">{branding.login_tagline || t('subtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('signIn')}</CardTitle>
            <CardDescription>{t('signInDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('signIn')}
              </Button>
            </form>

            {mode === 'demo' && (
              <>
                <div className="relative">
                  <Separator />
                  <span className="absolute inset-0 -top-2 mx-auto w-fit bg-card px-2 text-xs text-muted-foreground">
                    {t('quickLoginTitle')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_ROLES.map((role) => (
                    <Button
                      key={role}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickLogin(role)}
                    >
                      {tRole(role)}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
