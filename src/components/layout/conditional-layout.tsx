'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { HelpWorkflow } from '@/components/layout/help-workflow';
import { CommandPalette } from '@/components/layout/command-palette';
import { DisplaySettingsApplier } from '@/components/layout/display-settings-applier';
import { PageViewTracker } from '@/components/layout/page-view-tracker';

const BARE_PATHS = ['/login'];

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_PATHS.includes(pathname);

  if (isBare) {
    return <>{children}</>;
  }

  return (
    <>
      <DisplaySettingsApplier />
      <PageViewTracker />
      <Sidebar />
      <Header />
      <main className="ml-60 mt-14 min-h-[calc(100vh-3.5rem)] p-6">
        {children}
      </main>
      <CommandPalette />
      <HelpWorkflow />
    </>
  );
}
