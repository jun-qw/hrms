import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { AuthGuard } from '@/components/layout/auth-guard';
import { ConditionalLayout } from '@/components/layout/conditional-layout';
import { SessionSync } from '@/components/layout/session-sync';
import { ModuleDataProvider } from '@/components/layout/module-data-provider';
import { BrandingApplier } from '@/components/layout/branding-applier';
import { getPublicBranding } from '@/lib/actions/branding-actions';
import { getSession } from '@/lib/auth/session';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/**
 * Every route is session-driven and reads the database, so nothing is
 * prerendered. This also keeps the production build independent of a live
 * database — the image is built once and points at a customer database at
 * run time.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPublicBranding();
  return {
    title: branding.appName || 'HRMS',
    description: branding.loginTagline || 'Human Resource Management System',
    icons: branding.faviconVersion
      ? { icon: `/api/branding/favicon?v=${encodeURIComponent(branding.faviconVersion)}` }
      : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const branding = await getPublicBranding();
  const session = await getSession();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider>
          <TooltipProvider>
            <SessionSync
              serverSession={
                session
                  ? {
                      userId: session.userId,
                      employeeId: session.employeeId,
                      email: session.email,
                      name: session.name,
                      role: session.role,
                    }
                  : null
              }
            />
            <BrandingApplier initial={branding} />
            <ModuleDataProvider />
            <AuthGuard>
              <ConditionalLayout>
                {children}
              </ConditionalLayout>
            </AuthGuard>
            <Toaster position="top-right" />
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
