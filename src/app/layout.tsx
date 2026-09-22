import type { Metadata } from 'next';
import { Fraunces, JetBrains_Mono } from 'next/font/google';
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

/**
 * 글꼴 — 디자인 시안을 따릅니다.
 *
 * 제목은 Fraunces(세리프), 숫자·코드는 JetBrains Mono. 둘은 빌드 때 받아
 * 함께 배포하므로 사내망 PC에 인터넷이 없어도 나옵니다. 본문 Pretendard는
 * 구글 폰트에 없어 CDN에서 받고, 못 받으면 시스템 한글 글꼴로 내려갑니다.
 */
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz', 'SOFT'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
});

const PRETENDARD_CSS =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

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
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href={PRETENDARD_CSS} />
      </head>
      <body className={`${fraunces.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
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
