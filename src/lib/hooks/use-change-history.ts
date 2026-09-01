'use client';

import { useCallback } from 'react';
import { useChangeHistoryStore } from '@/lib/stores/change-history-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import type {
  ChangeHistoryEntityType,
  ChangeHistoryActionType,
  FieldChange,
} from '@/types';

export function useChangeHistory() {
  const addEntry = useChangeHistoryStore((s) => s.addEntry);
  const session = useAuthStore((s) => s.session);

  const recordChange = useCallback(
    (
      entity_type: ChangeHistoryEntityType,
      entity_id: string,
      entity_label: string,
      action: ChangeHistoryActionType,
      changes: FieldChange[],
    ) => {
      addEntry({
        entity_type,
        entity_id,
        entity_label,
        action,
        changes,
        changed_by: session?.user_id ?? 'system',
        changed_by_name: session?.user_name ?? '시스템',
      });
    },
    [addEntry, session],
  );

  return { recordChange };
}
