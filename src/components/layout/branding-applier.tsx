'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/stores/settings-store';
import type { PublicBranding } from '@/lib/branding';
import { isValidHex, readableForeground, tint } from '@/lib/utils/color';

/**
 * Paints the customer's brand colour over the theme tokens.
 *
 * globals.css declares the palette as CSS custom properties, so overriding a
 * handful of them on :root re-colours every component — buttons, focus rings,
 * sidebar highlights and the blue accent used across dashboards — in both the
 * light and dark themes.
 *
 * `initial` comes from the server so the login screen — which has no session
 * and therefore never hydrates the settings store — is still branded.
 * Renders nothing.
 */
export function BrandingApplier({ initial }: { initial: PublicBranding }) {
  const primary = useSettingsStore((s) => s.branding.primary_color);
  const hydrated = useSettingsStore((s) => s.hydrated);

  // Seed from the server snapshot until the store loads the full settings.
  useEffect(() => {
    if (hydrated) return;
    useSettingsStore.setState((state) => ({
      branding: {
        ...state.branding,
        app_name: initial.appName,
        primary_color: initial.primaryColor,
        login_tagline: initial.loginTagline,
        logo_version: initial.logoVersion,
        favicon_version: initial.faviconVersion,
        use_logo_in_print: initial.useLogoInPrint,
      },
    }));
  }, [initial, hydrated]);

  useEffect(() => {
    const root = document.documentElement;
    const tokens = [
      '--primary',
      '--ring',
      '--sidebar-primary',
      '--sidebar-ring',
      '--accent-blue',
    ];
    const foregroundTokens = ['--primary-foreground', '--sidebar-primary-foreground'];

    if (!isValidHex(primary)) {
      // Fall back to the stylesheet defaults.
      for (const t of [...tokens, ...foregroundTokens, '--accent-blue-subtle']) {
        root.style.removeProperty(t);
      }
      return;
    }

    for (const t of tokens) root.style.setProperty(t, primary);
    const fg = readableForeground(primary);
    for (const t of foregroundTokens) root.style.setProperty(t, fg);
    root.style.setProperty('--accent-blue-subtle', tint(primary, 0.88));
  }, [primary]);

  return null;
}
