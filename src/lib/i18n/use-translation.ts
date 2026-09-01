'use client';

import { useSettingsStore } from '@/lib/stores/settings-store';
import { ko } from './dictionaries/ko';
import { en } from './dictionaries/en';
import type { Locale, TranslationKey, Dictionary } from './types';

const DICTIONARIES: Record<Locale, Dictionary> = { ko, en };

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
  }
  return out;
}

export function useT() {
  const locale = useSettingsStore((s) => s.display.locale);
  const t = (key: TranslationKey, vars?: Record<string, string | number>): string => {
    const value = DICTIONARIES[locale][key] ?? DICTIONARIES.ko[key];
    if (value === undefined) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[i18n] missing translation key: ${key}`);
      }
      return key;
    }
    return interpolate(value, vars);
  };
  return { t, locale };
}
