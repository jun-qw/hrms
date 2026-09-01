import type { GridColumn } from './types';

const NUMBER = new Intl.NumberFormat('ko-KR');

/** How a raw column value is shown when the column has no custom cell. */
export function formatValue<T>(column: GridColumn<T>, raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '';
  if (column.type === 'money' || column.type === 'number') {
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? NUMBER.format(n) : String(raw);
  }
  return String(raw);
}

/** Numbers and dates line up on the right; everything else reads left. */
export function alignOf<T>(column: GridColumn<T>): 'left' | 'center' | 'right' {
  if (column.align) return column.align;
  return column.type === 'number' || column.type === 'money' ? 'right' : 'left';
}

export function isNumeric<T>(column: GridColumn<T>): boolean {
  return column.type === 'number' || column.type === 'money';
}

/** Comparator used for sorting; keeps numbers numeric and blanks last. */
export function compareValues(a: unknown, b: unknown): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'ko');
}
