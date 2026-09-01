'use client';

import { Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/lib/stores/settings-store';

/**
 * The customer's logo, or the default icon when none has been uploaded.
 *
 * The image is served from /api/branding/logo with a version query so a new
 * upload replaces a hard-cached one immediately.
 */
export function BrandMark({
  className,
  size = 24,
}: {
  className?: string;
  size?: number;
}) {
  const logoVersion = useSettingsStore((s) => s.branding.logo_version);
  const appName = useSettingsStore((s) => s.branding.app_name);

  if (!logoVersion) {
    return <Network className={cn('text-primary', className)} style={{ width: size, height: size }} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- served from a DB route, not the image pipeline
    <img
      src={`/api/branding/logo?v=${encodeURIComponent(logoVersion)}`}
      alt={appName || 'Logo'}
      className={cn('object-contain', className)}
      style={{ height: size, maxWidth: size * 4 }}
    />
  );
}

/** Logo plus product name, as used in the sidebar header and on the login card. */
export function BrandLockup({
  className,
  logoSize = 24,
  showName = true,
}: {
  className?: string;
  logoSize?: number;
  showName?: boolean;
}) {
  const appName = useSettingsStore((s) => s.branding.app_name);
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <BrandMark size={logoSize} />
      {showName && <span>{appName || 'HRMS'}</span>}
    </span>
  );
}
