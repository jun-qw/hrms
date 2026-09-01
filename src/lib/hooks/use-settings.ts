'use client';

import { useSettingsStore } from '@/lib/stores/settings-store';

export function useSettings() {
  return useSettingsStore();
}
