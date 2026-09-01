'use server';

/**
 * Server actions for the payroll and retirement-settlement
 * modules. The client stores (`payroll-store`, `retirement-store`,
 * hydrate from fetchPayrollData() and mirror every
 * mutation through these actions.
 *
 * App types use snake_case fields with numbers/ISO strings; the DB layer uses
 * camelCase Drizzle columns where `numeric` is a string and timestamps are
 * Date objects — the helpers below bridge the two on top of the shared mappers.
 *
 * Payroll records are stored across two tables: `payrolls` holds the header and
 * `payroll_details` the line items. `SavedPayroll.items` is split on write and
 * re-assembled on read.
 */
import { eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { toApp, toDb, camelToSnake } from './mappers';
import { PAYROLL_ITEM_LEGACY_IDS } from '@/lib/demo-data/payroll-seed';
import type {
  PayrollItemConfig,
  PayrollLineItem,
  SavedPayroll,
  PayrollStatus,
  EmployeePayrollSetting,
  RetirementSettlement,
} from '@/types';

// ---------------------------------------------------------------------------
// Auth guards
// ---------------------------------------------------------------------------

const HR_ROLES = ['admin', 'hr_manager'];

/**
 * Payroll and retirement rows are sensitive: only HR roles may
 * read the whole set, everyone else is limited to their own employee id.
 */
interface ReadScope {
  all: boolean;
  employeeId: string | null;
}

async function readScope(): Promise<ReadScope> {
  // Demo mode (no DB auth): everything is readable.
  if (process.env.AUTH_MODE !== 'db') return { all: true, employeeId: null };
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
  if (HR_ROLES.includes(session.role)) return { all: true, employeeId: null };
  return { all: false, employeeId: session.employeeId ?? null };
}

/** Writes are HR-only. */
async function assertHrWrite(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session || !HR_ROLES.includes(session.role)) throw new Error('forbidden');
}


// ---------------------------------------------------------------------------
// Payroll-specific field conversion
// ---------------------------------------------------------------------------

// numeric columns: strings on the wire, numbers in the app types.
const NUMERIC_FIELDS = new Set([
  // payroll_item_configs
  'rate_multiplier',
  'default_amount',
  // payrolls
  'base_salary',
  'total_earnings',
  'total_deductions',
  'net_pay',
  // payroll_details / employee_payroll_settings
  'amount',
  // retirement_settlements
  'base_salary_avg',
  'bonus_avg',
  'annual_leave_compensation',
  'service_years',
  'daily_avg_wage',
  'retirement_pay',
  'income_tax',
  'local_tax',
]);

// timestamptz columns whose app-side value is an ISO string and which the
// shared mapper does not already know about.
const TIMESTAMP_FIELDS = new Set(['submitted_at', 'reviewed_at']);

// Nested/derived app-side fields that must never reach the DB layer.
const APP_ONLY_FIELDS = new Set(['employee', 'payroll_item']);

function num(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(n) ? fallback : n;
}

function nullableNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(n) ? null : n;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * toDb() plus payroll-module specifics: numeric columns are stringified and
 * module-local timestamps become Date objects. `omit` removes app-side keys
 * that belong to a different table (e.g. `items` on a payroll header).
 */
function toPayrollDb(
  patch: Record<string, unknown>,
  opts?: { dropId?: boolean; omit?: readonly string[] },
): Record<string, unknown> {
  const source: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (APP_ONLY_FIELDS.has(k)) continue;
    if (opts?.omit?.includes(k)) continue;
    source[k] = v;
  }
  const out = toDb(source, { dropId: opts?.dropId });
  for (const [k, v] of Object.entries(out)) {
    const snake = camelToSnake(k);
    if (NUMERIC_FIELDS.has(snake)) {
      if (typeof v === 'number') out[k] = String(v);
    } else if (TIMESTAMP_FIELDS.has(snake) && typeof v === 'string' && v !== '') {
      out[k] = new Date(v);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Payroll item id translation
//
// `PayrollLineItem.item_id` carries legacy slugs ("pi-pension") that several
// screens match on, while `payroll_details.payroll_item_id` is a UUID FK into
// `payroll_item_configs`. Translate through the item `code` in both directions.
// ---------------------------------------------------------------------------

interface ItemIdMaps {
  /** legacy slug (or uuid) -> payroll_item_configs.id */
  idBySlug: Map<string, string>;
  /** payroll_item_configs.id -> legacy slug */
  slugById: Map<string, string>;
}

function buildItemIdMaps(configRows: { id: string; code: string }[]): ItemIdMaps {
  const idBySlug = new Map<string, string>();
  const slugById = new Map<string, string>();
  for (const row of configRows) {
    const slug = PAYROLL_ITEM_LEGACY_IDS[row.code];
    if (slug) {
      idBySlug.set(slug, row.id);
      slugById.set(row.id, slug);
    }
    idBySlug.set(row.id, row.id);
  }
  return { idBySlug, slugById };
}

async function loadItemIdMaps(): Promise<ItemIdMaps> {
  const rows = await db
    .select({ id: schema.payrollItemConfigs.id, code: schema.payrollItemConfigs.code })
    .from(schema.payrollItemConfigs);
  return buildItemIdMaps(rows);
}

// ---------------------------------------------------------------------------
// Row -> app mappers
// ---------------------------------------------------------------------------

function rowToItemConfig(row: Record<string, unknown>): PayrollItemConfig {
  const r = toApp<Record<string, unknown>>(row);
  return {
    id: str(r.id),
    name: str(r.name),
    code: str(r.code),
    category: (r.category === 'deduction' ? 'deduction' : 'earning'),
    calc_type: (r.calc_type ?? 'fixed') as PayrollItemConfig['calc_type'],
    is_taxable: r.is_taxable !== false,
    is_active: r.is_active !== false,
    rate_multiplier: nullableNum(r.rate_multiplier),
    formula_description: str(r.formula_description),
    default_amount: num(r.default_amount),
    sort_order: num(r.sort_order),
  };
}

function rowToLineItem(row: Record<string, unknown>, maps: ItemIdMaps): PayrollLineItem {
  const r = toApp<Record<string, unknown>>(row);
  const configId = str(r.payroll_item_id);
  return {
    item_id: (configId && maps.slugById.get(configId)) || configId || str(r.id),
    name: str(r.name),
    category: r.category === 'deduction' ? 'deduction' : 'earning',
    amount: num(r.amount),
    is_taxable: r.is_taxable !== false,
    formula: str(r.formula),
  };
}

function rowToPayroll(row: Record<string, unknown>, items: PayrollLineItem[]): SavedPayroll {
  const r = toApp<Record<string, unknown>>(row);
  return {
    id: str(r.id),
    employee_id: str(r.employee_id),
    year: num(r.year),
    month: num(r.month),
    base_salary: num(r.base_salary),
    items,
    total_earnings: num(r.total_earnings),
    total_deductions: num(r.total_deductions),
    net_pay: num(r.net_pay),
    dependents: num(r.dependents, 1),
    status: (r.status ?? 'draft') as PayrollStatus,
    created_at: str(r.created_at, new Date().toISOString()),
  };
}

function rowToEmployeeSetting(row: Record<string, unknown>): EmployeePayrollSetting {
  const r = toApp<Record<string, unknown>>(row);
  return {
    ...(r as unknown as EmployeePayrollSetting),
    amount: num(r.amount),
    category: r.category === 'deduction' ? 'deduction' : 'earning',
    is_active: r.is_active !== false,
    created_at: str(r.created_at, new Date().toISOString()),
    updated_at: str(r.updated_at, new Date().toISOString()),
  };
}

function rowToRetirement(row: Record<string, unknown>): RetirementSettlement {
  const r = toApp<Record<string, unknown>>(row);
  return {
    ...(r as unknown as RetirementSettlement),
    reason_code: (r.reason_code ?? 'other') as RetirementSettlement['reason_code'],
    base_salary_avg: num(r.base_salary_avg),
    bonus_avg: num(r.bonus_avg),
    annual_leave_compensation: num(r.annual_leave_compensation),
    service_days: num(r.service_days),
    service_years: num(r.service_years),
    daily_avg_wage: num(r.daily_avg_wage),
    retirement_pay: num(r.retirement_pay),
    income_tax: num(r.income_tax),
    local_tax: num(r.local_tax),
    net_pay: num(r.net_pay),
    status: (r.status ?? 'draft') as RetirementSettlement['status'],
    created_at: str(r.created_at, new Date().toISOString()),
    updated_at: str(r.updated_at, new Date().toISOString()),
  };
}

// ---------------------------------------------------------------------------
// Read: full module dataset
// ---------------------------------------------------------------------------

export interface PayrollModuleData {
  payrollItems: PayrollItemConfig[];
  savedPayrolls: SavedPayroll[];
  employeePayrollSettings: EmployeePayrollSetting[];
  retirementSettlements: RetirementSettlement[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Select every row for HR, or only the caller's own rows otherwise. */
async function selectScoped(
  table: any,
  employeeColumn: any,
  scope: ReadScope,
): Promise<Record<string, unknown>[]> {
  if (scope.all) return db.select().from(table);
  if (!scope.employeeId) return [];
  return db.select().from(table).where(eq(employeeColumn, scope.employeeId));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function fetchPayrollData(): Promise<PayrollModuleData | null> {
  try {
    const scope = await readScope();

    // Masters are not employee-scoped — every authenticated user needs them.
    const itemConfigRows = await db.select().from(schema.payrollItemConfigs);

    const [payrollRows, settingRows, retirementRows] = await Promise.all([
      selectScoped(schema.payrolls, schema.payrolls.employeeId, scope),
      selectScoped(
        schema.employeePayrollSettings,
        schema.employeePayrollSettings.employeeId,
        scope,
      ),
      selectScoped(schema.retirementSettlements, schema.retirementSettlements.employeeId, scope),
    ]);

    const maps = buildItemIdMaps(itemConfigRows);

    // Line items: one round trip, grouped back onto their payroll header.
    const payrollIds = payrollRows.map((r) => str(r.id)).filter(Boolean);
    let detailRows: Record<string, unknown>[] = [];
    if (payrollIds.length > 0) {
      detailRows = scope.all
        ? await db.select().from(schema.payrollDetails)
        : await db
            .select()
            .from(schema.payrollDetails)
            .where(inArray(schema.payrollDetails.payrollId, payrollIds));
    }
    const itemsByPayroll = new Map<string, PayrollLineItem[]>();
    for (const row of detailRows) {
      const key = str(row.payrollId);
      const list = itemsByPayroll.get(key);
      if (list) list.push(rowToLineItem(row, maps));
      else itemsByPayroll.set(key, [rowToLineItem(row, maps)]);
    }

    return {
      payrollItems: itemConfigRows.map(rowToItemConfig),
      savedPayrolls: payrollRows.map((r) =>
        rowToPayroll(r, itemsByPayroll.get(str(r.id)) ?? []),
      ),
      employeePayrollSettings: settingRows.map(rowToEmployeeSetting),
      retirementSettlements: retirementRows.map(rowToRetirement),
    };
  } catch (err) {
    console.error('fetchPayrollData failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Payroll item configs (급여 항목 마스터)
// ---------------------------------------------------------------------------

export async function createPayrollItemConfig(
  item: PayrollItemConfig,
): Promise<PayrollItemConfig | null> {
  try {
    await assertHrWrite();
    const values = toPayrollDb(item as unknown as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .insert(schema.payrollItemConfigs)
      .values(values as typeof schema.payrollItemConfigs.$inferInsert)
      .returning();
    return row ? rowToItemConfig(row) : null;
  } catch (err) {
    console.error('createPayrollItemConfig failed:', err);
    return null;
  }
}

export async function updatePayrollItemConfig(
  id: string,
  patch: Partial<PayrollItemConfig>,
): Promise<PayrollItemConfig | null> {
  try {
    await assertHrWrite();
    const values = toPayrollDb(patch as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .update(schema.payrollItemConfigs)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.payrollItemConfigs.id, id))
      .returning();
    return row ? rowToItemConfig(row) : null;
  } catch (err) {
    console.error('updatePayrollItemConfig failed:', err);
    return null;
  }
}

export async function deletePayrollItemConfig(id: string): Promise<boolean> {
  try {
    await assertHrWrite();
    await db.delete(schema.payrollItemConfigs).where(eq(schema.payrollItemConfigs.id, id));
    return true;
  } catch (err) {
    console.error('deletePayrollItemConfig failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Payrolls (header + line items)
// ---------------------------------------------------------------------------

/** Re-read one payroll with its line items re-assembled into `items`. */
async function readPayroll(id: string, maps: ItemIdMaps): Promise<SavedPayroll | null> {
  const [head] = await db.select().from(schema.payrolls).where(eq(schema.payrolls.id, id));
  if (!head) return null;
  const details = await db
    .select()
    .from(schema.payrollDetails)
    .where(eq(schema.payrollDetails.payrollId, id));
  return rowToPayroll(head, details.map((d) => rowToLineItem(d, maps)));
}

/**
 * Upsert a payroll for (employee, year, month): the header goes to `payrolls`,
 * the line items replace the matching `payroll_details` rows.
 */
export async function savePayroll(payroll: SavedPayroll): Promise<SavedPayroll | null> {
  try {
    await assertHrWrite();
    const maps = await loadItemIdMaps();

    const values = toPayrollDb(payroll as unknown as Record<string, unknown>, {
      dropId: true,
      omit: ['items'],
    });
    // The (employee_id, year, month) key itself must not be part of the update.
    const { employeeId: _e, year: _y, month: _m, ...updatable } = values;
    void _e;
    void _y;
    void _m;

    const [head] = await db
      .insert(schema.payrolls)
      .values(values as typeof schema.payrolls.$inferInsert)
      .onConflictDoUpdate({
        target: [schema.payrolls.employeeId, schema.payrolls.year, schema.payrolls.month],
        set: updatable,
      })
      .returning();
    if (!head) return null;

    await db.delete(schema.payrollDetails).where(eq(schema.payrollDetails.payrollId, head.id));
    if (payroll.items.length > 0) {
      await db.insert(schema.payrollDetails).values(
        payroll.items.map((item) => ({
          payrollId: head.id,
          payrollItemId: maps.idBySlug.get(item.item_id) ?? null,
          name: item.name,
          category: item.category,
          isTaxable: item.is_taxable,
          formula: item.formula,
          amount: String(Math.round(item.amount)),
        })),
      );
    }

    return rowToPayroll(head, payroll.items.map((item) => ({ ...item })));
  } catch (err) {
    console.error('savePayroll failed:', err);
    return null;
  }
}

export async function updatePayrollStatus(
  id: string,
  status: PayrollStatus,
): Promise<SavedPayroll | null> {
  try {
    await assertHrWrite();
    const [row] = await db
      .update(schema.payrolls)
      .set({ status, paidAt: status === 'paid' ? new Date() : null })
      .where(eq(schema.payrolls.id, id))
      .returning();
    if (!row) return null;
    const maps = await loadItemIdMaps();
    return readPayroll(row.id, maps);
  } catch (err) {
    console.error('updatePayrollStatus failed:', err);
    return null;
  }
}

/** Deletes the header; `payroll_details` rows cascade. */
export async function deletePayroll(id: string): Promise<boolean> {
  try {
    await assertHrWrite();
    await db.delete(schema.payrolls).where(eq(schema.payrolls.id, id));
    return true;
  } catch (err) {
    console.error('deletePayroll failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Employee payroll settings (직원별 수당 기준정보)
// ---------------------------------------------------------------------------

export async function createEmployeePayrollSetting(
  setting: EmployeePayrollSetting,
): Promise<EmployeePayrollSetting | null> {
  try {
    await assertHrWrite();
    const values = toPayrollDb(setting as unknown as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .insert(schema.employeePayrollSettings)
      .values(values as typeof schema.employeePayrollSettings.$inferInsert)
      .returning();
    return row ? rowToEmployeeSetting(row) : null;
  } catch (err) {
    console.error('createEmployeePayrollSetting failed:', err);
    return null;
  }
}

export async function updateEmployeePayrollSetting(
  id: string,
  patch: Partial<EmployeePayrollSetting>,
): Promise<EmployeePayrollSetting | null> {
  try {
    await assertHrWrite();
    const values = toPayrollDb(patch as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .update(schema.employeePayrollSettings)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.employeePayrollSettings.id, id))
      .returning();
    return row ? rowToEmployeeSetting(row) : null;
  } catch (err) {
    console.error('updateEmployeePayrollSetting failed:', err);
    return null;
  }
}

export async function deleteEmployeePayrollSetting(id: string): Promise<boolean> {
  try {
    await assertHrWrite();
    await db
      .delete(schema.employeePayrollSettings)
      .where(eq(schema.employeePayrollSettings.id, id));
    return true;
  } catch (err) {
    console.error('deleteEmployeePayrollSetting failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Retirement settlements (퇴직정산)
// ---------------------------------------------------------------------------

export async function createRetirementSettlement(
  settlement: RetirementSettlement,
): Promise<RetirementSettlement | null> {
  try {
    await assertHrWrite();
    const values = toPayrollDb(settlement as unknown as Record<string, unknown>, {
      dropId: true,
    });
    const [row] = await db
      .insert(schema.retirementSettlements)
      .values(values as typeof schema.retirementSettlements.$inferInsert)
      .returning();
    return row ? rowToRetirement(row) : null;
  } catch (err) {
    console.error('createRetirementSettlement failed:', err);
    return null;
  }
}

export async function updateRetirementSettlement(
  id: string,
  patch: Partial<RetirementSettlement>,
): Promise<RetirementSettlement | null> {
  try {
    await assertHrWrite();
    const values = toPayrollDb(patch as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .update(schema.retirementSettlements)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.retirementSettlements.id, id))
      .returning();
    return row ? rowToRetirement(row) : null;
  } catch (err) {
    console.error('updateRetirementSettlement failed:', err);
    return null;
  }
}

export async function deleteRetirementSettlement(id: string): Promise<boolean> {
  try {
    await assertHrWrite();
    await db.delete(schema.retirementSettlements).where(eq(schema.retirementSettlements.id, id));
    return true;
  } catch (err) {
    console.error('deleteRetirementSettlement failed:', err);
    return false;
  }
}
