'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/stores/settings-store';

const FONT_SIZE_CLASS: Record<string, string> = {
  small: 'font-sm',
  medium: 'font-md',
  large: 'font-lg',
};

const DENSITY_CLASS: Record<string, string> = {
  compact: 'density-compact',
  comfortable: 'density-comfortable',
  spacious: 'density-spacious',
};

export function DisplaySettingsApplier() {
  const display = useSettingsStore((s) => s.display);

  // Apply font size and density classes to <html>
  useEffect(() => {
    const html = document.documentElement;

    // Font size
    Object.values(FONT_SIZE_CLASS).forEach((cls) => html.classList.remove(cls));
    html.classList.add(FONT_SIZE_CLASS[display.font_size] ?? 'font-md');

    // Density
    Object.values(DENSITY_CLASS).forEach((cls) => html.classList.remove(cls));
    html.classList.add(DENSITY_CLASS[display.content_density] ?? 'density-comfortable');
  }, [display.font_size, display.content_density]);

  useEffect(() => {
    document.documentElement.lang = display.locale;
  }, [display.locale]);

  return null;
}
