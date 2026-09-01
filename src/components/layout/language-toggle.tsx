'use client';

import { useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useT } from '@/lib/i18n/use-translation';
import type { Locale } from '@/lib/i18n/types';

const LOCALE_COOKIE = 'HRMS_LOCALE';

export function LanguageToggle() {
  const { t, locale } = useT();
  const updateDisplay = useSettingsStore((s) => s.updateDisplay);
  const router = useRouter();

  // Keeps the legacy store-based i18n and the next-intl cookie locale in
  // sync until every page is migrated to next-intl.
  const setLocale = (next: Locale) => {
    updateDisplay({ locale: next });
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 h-9 px-2.5">
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium">
            {locale === 'ko' ? t('language.label.ko') : t('language.label.en')}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setLocale('en')}
          className={locale === 'en' ? 'font-semibold' : ''}
        >
          {t('language.english')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale('ko')}
          className={locale === 'ko' ? 'font-semibold' : ''}
        >
          {t('language.korean')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
