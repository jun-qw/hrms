'use client';

import { useCallback } from 'react';
import { useAuditLogStore } from '@/lib/stores/audit-log-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { AuditActionType } from '@/types';

export function useAuditLog() {
  const addLog = useAuditLogStore((s) => s.addLog);
  const session = useAuthStore((s) => s.session);

  // NOTE: the client IP is intentionally not recorded. It previously came from
  // an external lookup (api.ipify.org), which fails on air-gapped/intranet
  // deployments and leaks user traffic to a third party.
  const logAction = useCallback(
    (
      action_type: AuditActionType,
      target_type: string,
      target_id: string | null,
      target_label: string,
      details?: Record<string, unknown> | null
    ) => {
      if (!session) return;

      addLog({
        user_id: session.user_id,
        user_name: session.user_name,
        user_role: session.role,
        action_type,
        target_type,
        target_id,
        target_label,
        details: details ?? null,
        session_id: session.session_id,
      });
    },
    [addLog, session]
  );

  return { logAction };
}
