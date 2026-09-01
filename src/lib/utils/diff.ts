import type { FieldChange } from '@/types';

/**
 * Compare two objects and return an array of field-level changes.
 * @param oldObj - The original object
 * @param newObj - The updated object
 * @param fieldLabels - Map of field key to Korean display label
 * @returns FieldChange[] - Array of changed fields with before/after values
 */
export function computeFieldChanges(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fieldLabels: Record<string, string>,
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const [field, label] of Object.entries(fieldLabels)) {
    const before = oldObj[field];
    const after = newObj[field];

    const beforeStr = formatValue(before);
    const afterStr = formatValue(after);

    if (beforeStr !== afterStr) {
      changes.push({ field, label, before: beforeStr, after: afterStr });
    }
  }

  return changes;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (typeof value === 'number') return String(value);
  return String(value);
}
