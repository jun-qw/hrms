'use client';

import { Badge } from '@/components/ui/badge';
import {
  getEffectiveStatus,
  EFFECTIVE_STATUS_LABELS,
  EFFECTIVE_STATUS_VARIANT,
} from '@/lib/utils/effective-status';

interface EffectiveStatusBadgeProps {
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
}

export default function EffectiveStatusBadge({
  is_active,
  effective_from,
  effective_to,
}: EffectiveStatusBadgeProps) {
  const status = getEffectiveStatus(is_active, effective_from, effective_to);

  return (
    <Badge variant={EFFECTIVE_STATUS_VARIANT[status]}>
      {EFFECTIVE_STATUS_LABELS[status]}
    </Badge>
  );
}
