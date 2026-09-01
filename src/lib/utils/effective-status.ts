export type EffectiveStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

/**
 * Calculate the effective status based on is_active flag and date range.
 * - active: is_active=true AND from <= today <= to
 * - scheduled: is_active=true AND from > today
 * - expired: is_active=true AND to < today
 * - inactive: is_active=false
 */
export function getEffectiveStatus(
  is_active: boolean,
  effective_from: string | null,
  effective_to: string | null,
): EffectiveStatus {
  if (!is_active) return 'inactive';

  const today = new Date().toISOString().split('T')[0];

  if (effective_from && effective_from > today) return 'scheduled';
  if (effective_to && effective_to < today) return 'expired';

  return 'active';
}

export const EFFECTIVE_STATUS_LABELS: Record<EffectiveStatus, string> = {
  active: '사용중',
  scheduled: '예정',
  expired: '만료',
  inactive: '미사용',
};

export const EFFECTIVE_STATUS_VARIANT: Record<
  EffectiveStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  active: 'default',
  scheduled: 'outline',
  expired: 'secondary',
  inactive: 'destructive',
};

/**
 * Check if an entity is currently effective (usable).
 */
export function isCurrentlyEffective(
  is_active: boolean,
  effective_from: string | null,
  effective_to: string | null,
): boolean {
  return getEffectiveStatus(is_active, effective_from, effective_to) === 'active';
}
