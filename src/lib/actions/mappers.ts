// Shared app <-> db field mappers for server actions.
// App types use snake_case string-dated fields; Drizzle rows use camelCase
// with Date objects and numeric-as-string values.

const NUMERIC_FIELDS = new Set(['base_salary', 'base_amount', 'work_hours', 'overtime_hours']);

// App-side ISO datetime strings that map to Drizzle timestamp columns
// (which expect Date objects on insert/update).
const TIMESTAMP_FIELDS = new Set([
  'clock_in',
  'clock_out',
  'closed_at',
  'completed_at',
  'acted_at',
  'paid_at',
  'started_at',
  'resolved_at',
  'scheduled_at',
]);

// Nested/derived app-side fields that must never reach the DB layer
const APP_ONLY_FIELDS = new Set([
  'department',
  'position_rank',
  'position_title',
  'workplace',
  'children',
  'employees',
  'employee',
]);

export function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function toApp<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = camelToSnake(k);
    if (v instanceof Date) out[key] = v.toISOString();
    else if (NUMERIC_FIELDS.has(key) && typeof v === 'string') out[key] = Number(v);
    else out[key] = v;
  }
  return out as T;
}

export function toDb(
  patch: Record<string, unknown>,
  opts?: { dropId?: boolean },
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || APP_ONLY_FIELDS.has(k)) continue;
    if (k === 'created_at' || k === 'updated_at') continue; // DB-managed
    if (opts?.dropId && k === 'id') continue;
    const key = snakeToCamel(k);
    // Forms submit '' for empty optional fields; Postgres rejects '' for
    // date/uuid columns, so store NULL instead.
    if (v === '') out[key] = null;
    else if (TIMESTAMP_FIELDS.has(k) && typeof v === 'string') out[key] = new Date(v);
    else out[key] = NUMERIC_FIELDS.has(k) && typeof v === 'number' ? String(v) : v;
  }
  return out;
}
