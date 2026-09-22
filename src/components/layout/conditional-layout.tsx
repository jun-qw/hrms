'use client';

import { usePathname } from 'next/navigation';
import { TopBar } from '@/components/layout/topbar';
import { HelpWorkflow } from '@/components/layout/help-workflow';
import { CommandPalette } from '@/components/layout/command-palette';
import { DisplaySettingsApplier } from '@/components/layout/display-settings-applier';
import { PageViewTracker } from '@/components/layout/page-view-tracker';

const BARE_PATHS = ['/login'];

/**
 * 가장자리까지 쓰는 화면 — 인력대장 워크스페이스처럼 세 칸 패널이 화면
 * 전체를 채우는 곳은 바깥 여백을 두지 않습니다.
 */
const FULL_BLEED_PATHS = ['/employees'];

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_PATHS.includes(pathname);

  if (isBare) {
    return <>{children}</>;
  }

  const fullBleed = FULL_BLEED_PATHS.includes(pathname);

  return (
    <>
      <DisplaySettingsApplier />
      <PageViewTracker />
      <TopBar />
      <main className={fullBleed ? undefined : 'min-h-[calc(100vh-3.5rem)] px-7 py-6'}>
        {children}
      </main>
      <CommandPalette />
      <HelpWorkflow />
    </>
  );
}
