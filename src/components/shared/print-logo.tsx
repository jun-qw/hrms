'use client';

import { useSettingsStore } from '@/lib/stores/settings-store';

/**
 * Uploaded logo for printed documents (payslips, certificates).
 *
 * Renders nothing when no logo is set or when the admin turned it off for
 * printouts, so documents fall back to the company name text.
 */
export function PrintLogo({ height = 40, className }: { height?: number; className?: string }) {
  const logoVersion = useSettingsStore((s) => s.branding.logo_version);
  const useInPrint = useSettingsStore((s) => s.branding.use_logo_in_print);
  const appName = useSettingsStore((s) => s.branding.app_name);

  if (!logoVersion || !useInPrint) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- served from a DB route, not the image pipeline
    <img
      src={`/api/branding/logo?v=${encodeURIComponent(logoVersion)}`}
      alt={appName || 'Logo'}
      className={className}
      style={{ height, maxWidth: height * 6, objectFit: 'contain', margin: '0 auto' }}
    />
  );
}
