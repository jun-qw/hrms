'use server';

/**
 * Server actions for the leave module (types, balances, requests, adjustments,
 * annual-leave usage plans and promotion alerts).
 *
 * The client stores (`leave-store`, `leave-plan-store`) hydrate from
 * fetchLeaveData() and mirror every mutation through these actions.
 *
 * App types use snake_case fields with numbers/ISO strings; the DB layer uses
 * camelCase Drizzle columns where `numeric` is a string and timestamps are
 * Date objects — the helpers below bridge the two on top of the shared mappers.
 */
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { toApp, toDb, camelToSnake } from './mappers';
import type {
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  LeaveBalanceAdjustment,
} from '@/types';
import type { LeaveUsagePlan, LeavePromotionAlert } from '@/lib/stores/leave-plan-store';

// ---------------------------------------------------------------------------
// Auth guards
// ---------------------------------------------------------------------------

const HR_ROLES = ['admin', 'hr_manager'];

async function assertRead(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
}

async function assertHrWrite(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session || !HR_ROLES.includes(session.role)) throw new Error('forbidden');
}

/** HR roles may write any record; employees only rows tied to their own id. */
async function assertRecordWrite(employeeId: string | undefined | null): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
  if (HR_ROLES.includes(session.role)) return;
  if (employeeId && session.employeeId === employeeId) return;
  throw new Error('forbidden');
}

// ---------------------------------------------------------------------------
// Leave-specific field conversion
// ---------------------------------------------------------------------------

// numeric(4,1) columns: strings on the wire, numbers in the app types.
const NUMERIC_FIELDS = new Set([
  'max_days',
  'total_days',
  'used_days',
  'remaining_days',
  'days',
  'adjustment_days',
  'total_planned_days',
]);

// timestamptz columns whose app-side value is an ISO string.
const TIMESTAMP_FIELDS = new Set([
  'submitted_at',
  'reviewed_at',
  'sent_at',
  'acknowledged_at',
  'responded_at',
]);

// Nested/derived app-side fields that must never reach the DB layer.
const APP_ONLY_FIELDS = new Set(['leave_type', 'employee']);

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

/**
 * toDb() plus leave-module specifics: numeric columns are stringified,
 * leave-only timestamps become Date objects and nested app fields are dropped.
 * `drop` removes DB columns that must not be written (e.g. generated columns).
 */
function toLeaveDb(
  patch: Record<string, unknown>,
  opts?: { dropId?: boolean; drop?: string[] },
): Record<string, unknown> {
  const source: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (APP_ONLY_FIELDS.has(k)) continue;
    source[k] = v;
  }
  const out = toDb(source, { dropId: opts?.dropId });
  for (const [k, v] of Object.entries(out)) {
    const snake = camelToSnake(k);
    if (NUMERIC_FIELDS.has(snake)) {
      if (typeof v === 'number') out[k] = String(v);
    } else if (TIMESTAMP_FIELDS.has(snake) && typeof v === 'string') {
      out[k] = new Date(v);
    }
  }
  for (const key of opts?.drop ?? []) delete out[key];
  return out;
}

// `leave_balances.remaining_days` is a generated column — Postgres rejects any
// INSERT/UPDATE that mentions it.
const BALANCE_GENERATED = ['remainingDays'];

function toBalanceDb(
  patch: Record<string, unknown>,
  opts?: { dropId?: boolean },
): Record<string, unknown> {
  return toLeaveDb(patch, { dropId: opts?.dropId, drop: BALANCE_GENERATED });
}

// --- Row -> app mappers -----------------------------------------------------

function rowToLeaveType(row: Record<string, unknown>): LeaveType {
  const r = toApp<Record<string, unknown>>(row);
  return {
    id: r.id as string,
    name: r.name as string,
    code: r.code as string,
    is_paid: r.is_paid !== false,
    max_days: nullableNum(r.max_days),
    is_active: r.is_active !== false,
  };
}

function rowToBalance(row: Record<string, unknown>): LeaveBalance {
  const r = toApp<Record<string, unknown>>(row);
  const total = num(r.total_days);
  const used = num(r.used_days);
  return {
    id: r.id as string,
    employee_id: r.employee_id as string,
    leave_type_id: r.leave_type_id as string,
    year: num(r.year),
    total_days: total,
    used_days: used,
    remaining_days: r.remaining_days === null || r.remaining_days === undefined
      ? total - used
      : num(r.remaining_days),
  };
}

function rowToRequest(row: Record<string, unknown>): LeaveRequest {
  const r = toApp<Record<string, unknown>>(row);
  return {
    ...(r as unknown as LeaveRequest),
    days: num(r.days),
    status: (r.status ?? 'pending') as LeaveRequest['status'],
    created_at: (r.created_at as string | null) ?? new Date().toISOString(),
  };
}

function rowToAdjustment(row: Record<string, unknown>): LeaveBalanceAdjustment {
  const r = toApp<Record<string, unknown>>(row);
  return {
    ...(r as unknown as LeaveBalanceAdjustment),
    year: num(r.year),
    adjustment_days: num(r.adjustment_days),
    created_at: (r.created_at as string | null) ?? new Date().toISOString(),
  };
}

function rowToPlan(row: Record<string, unknown>): LeaveUsagePlan {
  const r = toApp<Record<string, unknown>>(row);
  return {
    ...(r as unknown as LeaveUsagePlan),
    year: num(r.year),
    total_planned_days: num(r.total_planned_days),
    monthly_plan: (r.monthly_plan ?? {}) as Record<number, number>,
    status: (r.status ?? 'draft') as LeaveUsagePlan['status'],
    created_at: (r.created_at as string | null) ?? new Date().toISOString(),
    updated_at: (r.updated_at as string | null) ?? new Date().toISOString(),
  };
}

function rowToAlert(row: Record<string, unknown>): LeavePromotionAlert {
  const r = toApp<Record<string, unknown>>(row);
  return {
    ...(r as unknown as LeavePromotionAlert),
    year: num(r.year),
    alert_round: (num(r.alert_round, 1) === 2 ? 2 : 1) as 1 | 2,
    remaining_days: num(r.remaining_days),
    acknowledged: r.acknowledged === true,
    sent_at: (r.sent_at as string | null) ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Read: full module dataset
// ---------------------------------------------------------------------------

export interface LeaveModuleData {
  leaveTypes: LeaveType[];
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequest[];
  balanceAdjustments: LeaveBalanceAdjustment[];
  plans: LeaveUsagePlan[];
  alerts: LeavePromotionAlert[];
}

export async function fetchLeaveData(): Promise<LeaveModuleData | null> {
  try {
    await assertRead();
    const [types, balances, requests, adjustments, plans, alerts] = await Promise.all([
      db.select().from(schema.leaveTypes),
      db.select().from(schema.leaveBalances),
      db.select().from(schema.leaveRequests),
      db.select().from(schema.leaveBalanceAdjustments),
      db.select().from(schema.leaveUsagePlans),
      db.select().from(schema.leavePromotionAlerts),
    ]);
    return {
      leaveTypes: types.map(rowToLeaveType),
      leaveBalances: balances.map(rowToBalance),
      leaveRequests: requests.map(rowToRequest),
      balanceAdjustments: adjustments.map(rowToAdjustment),
      plans: plans.map(rowToPlan),
      alerts: alerts.map(rowToAlert),
    };
  } catch (err) {
    console.error('fetchLeaveData failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Leave types (HR only)
// ---------------------------------------------------------------------------

export async function createLeaveType(leaveType: LeaveType): Promise<LeaveType | null> {
  try {
    await assertHrWrite();
    const values = toLeaveDb(leaveType as unknown as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .insert(schema.leaveTypes)
      .values(values as typeof schema.leaveTypes.$inferInsert)
      .returning();
    return row ? rowToLeaveType(row) : null;
  } catch (err) {
    console.error('createLeaveType failed:', err);
    return null;
  }
}

export async function updateLeaveType(
  id: string,
  patch: Partial<LeaveType>,
): Promise<LeaveType | null> {
  try {
    await assertHrWrite();
    const values = toLeaveDb(patch as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .update(schema.leaveTypes)
      .set(values)
      .where(eq(schema.leaveTypes.id, id))
      .returning();
    return row ? rowToLeaveType(row) : null;
  } catch (err) {
    console.error('updateLeaveType failed:', err);
    return null;
  }
}

export async function deleteLeaveType(id: string): Promise<boolean> {
  try {
    await assertHrWrite();
    await db.delete(schema.leaveTypes).where(eq(schema.leaveTypes.id, id));
    return true;
  } catch (err) {
    console.error('deleteLeaveType failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Leave balances (HR only — balances are granted/adjusted by HR)
// ---------------------------------------------------------------------------

export async function upsertLeaveBalance(balance: LeaveBalance): Promise<LeaveBalance | null> {
  try {
    await assertHrWrite();
    const values = toBalanceDb(balance as unknown as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .insert(schema.leaveBalances)
      .values(values as typeof schema.leaveBalances.$inferInsert)
      .onConflictDoUpdate({
        target: [
          schema.leaveBalances.employeeId,
          schema.leaveBalances.leaveTypeId,
          schema.leaveBalances.year,
        ],
        set: {
          totalDays: values.totalDays as string,
          usedDays: (values.usedDays ?? '0') as string,
        },
      })
      .returning();
    return row ? rowToBalance(row) : null;
  } catch (err) {
    console.error('upsertLeaveBalance failed:', err);
    return null;
  }
}

/** Bulk grant/refresh (연차 일괄 부여). Returns the stored rows. */
export async function upsertLeaveBalances(
  balances: LeaveBalance[],
): Promise<LeaveBalance[] | null> {
  try {
    await assertHrWrite();
    const saved: LeaveBalance[] = [];
    for (const balance of balances) {
      const values = toBalanceDb(balance as unknown as Record<string, unknown>, { dropId: true });
      const [row] = await db
        .insert(schema.leaveBalances)
        .values(values as typeof schema.leaveBalances.$inferInsert)
        .onConflictDoUpdate({
          target: [
            schema.leaveBalances.employeeId,
            schema.leaveBalances.leaveTypeId,
            schema.leaveBalances.year,
          ],
          set: { totalDays: values.totalDays as string },
        })
        .returning();
      if (row) saved.push(rowToBalance(row));
    }
    return saved;
  } catch (err) {
    console.error('upsertLeaveBalances failed:', err);
    return null;
  }
}

export async function updateLeaveBalance(
  id: string,
  patch: Partial<LeaveBalance>,
): Promise<LeaveBalance | null> {
  try {
    const [existing] = await db
      .select()
      .from(schema.leaveBalances)
      .where(eq(schema.leaveBalances.id, id));
    if (!existing) return null;
    // Granting days (total_days) is HR-only; used_days moves whenever an
    // employee's own request is approved or cancelled.
    const grantsDays =
      patch.total_days !== undefined && patch.total_days !== num(existing.totalDays);
    if (grantsDays) await assertHrWrite();
    else await assertRecordWrite(existing.employeeId);

    const values = toBalanceDb(patch as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .update(schema.leaveBalances)
      .set(values)
      .where(eq(schema.leaveBalances.id, id))
      .returning();
    return row ? rowToBalance(row) : null;
  } catch (err) {
    console.error('updateLeaveBalance failed:', err);
    return null;
  }
}

export async function deleteLeaveBalance(id: string): Promise<boolean> {
  try {
    await assertHrWrite();
    await db.delete(schema.leaveBalances).where(eq(schema.leaveBalances.id, id));
    return true;
  } catch (err) {
    console.error('deleteLeaveBalance failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Balance adjustments (HR only)
// ---------------------------------------------------------------------------

export async function createBalanceAdjustment(
  adjustment: LeaveBalanceAdjustment,
): Promise<LeaveBalanceAdjustment | null> {
  try {
    await assertHrWrite();
    const values = toLeaveDb(adjustment as unknown as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .insert(schema.leaveBalanceAdjustments)
      .values(values as typeof schema.leaveBalanceAdjustments.$inferInsert)
      .returning();
    if (!row) return null;

    // Keep the matching balance in sync (remaining_days is generated).
    const [balance] = await db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.employeeId, adjustment.employee_id),
          eq(schema.leaveBalances.leaveTypeId, adjustment.leave_type_id),
          eq(schema.leaveBalances.year, adjustment.year),
        ),
      );
    if (balance) {
      await db
        .update(schema.leaveBalances)
        .set({ totalDays: String(num(balance.totalDays) + adjustment.adjustment_days) })
        .where(eq(schema.leaveBalances.id, balance.id));
    }
    return rowToAdjustment(row);
  } catch (err) {
    console.error('createBalanceAdjustment failed:', err);
    return null;
  }
}

export async function updateBalanceAdjustment(
  id: string,
  patch: Partial<LeaveBalanceAdjustment>,
): Promise<LeaveBalanceAdjustment | null> {
  try {
    await assertHrWrite();
    const values = toLeaveDb(patch as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .update(schema.leaveBalanceAdjustments)
      .set(values)
      .where(eq(schema.leaveBalanceAdjustments.id, id))
      .returning();
    return row ? rowToAdjustment(row) : null;
  } catch (err) {
    console.error('updateBalanceAdjustment failed:', err);
    return null;
  }
}

export async function deleteBalanceAdjustment(id: string): Promise<boolean> {
  try {
    await assertHrWrite();
    await db.delete(schema.leaveBalanceAdjustments).where(eq(schema.leaveBalanceAdjustments.id, id));
    return true;
  } catch (err) {
    console.error('deleteBalanceAdjustment failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Leave requests (employees may file/cancel their own; HR handles all)
// ---------------------------------------------------------------------------

export async function createLeaveRequest(request: LeaveRequest): Promise<LeaveRequest | null> {
  try {
    await assertRecordWrite(request.employee_id);
    const values = toLeaveDb(request as unknown as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .insert(schema.leaveRequests)
      .values(values as typeof schema.leaveRequests.$inferInsert)
      .returning();
    return row ? rowToRequest(row) : null;
  } catch (err) {
    console.error('createLeaveRequest failed:', err);
    return null;
  }
}

export async function updateLeaveRequest(
  id: string,
  patch: Partial<LeaveRequest>,
): Promise<LeaveRequest | null> {
  try {
    const [existing] = await db
      .select()
      .from(schema.leaveRequests)
      .where(eq(schema.leaveRequests.id, id));
    if (!existing) return null;
    // Approving/rejecting is an HR decision; the owner may only cancel.
    if (patch.status === 'approved' || patch.status === 'rejected') await assertHrWrite();
    else await assertRecordWrite(existing.employeeId);

    const values = toLeaveDb(patch as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .update(schema.leaveRequests)
      .set(values)
      .where(eq(schema.leaveRequests.id, id))
      .returning();
    return row ? rowToRequest(row) : null;
  } catch (err) {
    console.error('updateLeaveRequest failed:', err);
    return null;
  }
}

export async function deleteLeaveRequest(id: string): Promise<boolean> {
  try {
    const [existing] = await db
      .select()
      .from(schema.leaveRequests)
      .where(eq(schema.leaveRequests.id, id));
    if (!existing) return true;
    await assertRecordWrite(existing.employeeId);
    await db.delete(schema.leaveRequests).where(eq(schema.leaveRequests.id, id));
    return true;
  } catch (err) {
    console.error('deleteLeaveRequest failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Annual-leave usage plans (연차 사용계획서)
// ---------------------------------------------------------------------------

export async function createLeaveUsagePlan(plan: LeaveUsagePlan): Promise<LeaveUsagePlan | null> {
  try {
    await assertRecordWrite(plan.employee_id);
    const values = toLeaveDb(plan as unknown as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .insert(schema.leaveUsagePlans)
      .values(values as typeof schema.leaveUsagePlans.$inferInsert)
      .onConflictDoUpdate({
        target: [schema.leaveUsagePlans.employeeId, schema.leaveUsagePlans.year],
        set: { ...values, updatedAt: new Date() },
      })
      .returning();
    return row ? rowToPlan(row) : null;
  } catch (err) {
    console.error('createLeaveUsagePlan failed:', err);
    return null;
  }
}

export async function updateLeaveUsagePlan(
  id: string,
  patch: Partial<LeaveUsagePlan>,
): Promise<LeaveUsagePlan | null> {
  try {
    const [existing] = await db
      .select()
      .from(schema.leaveUsagePlans)
      .where(eq(schema.leaveUsagePlans.id, id));
    if (!existing) return null;
    // Only HR reviews a plan; the owner may edit their own draft/submission.
    if (patch.status === 'reviewed' || patch.reviewed_by !== undefined) await assertHrWrite();
    else await assertRecordWrite(existing.employeeId);

    const values = toLeaveDb(patch as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .update(schema.leaveUsagePlans)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.leaveUsagePlans.id, id))
      .returning();
    return row ? rowToPlan(row) : null;
  } catch (err) {
    console.error('updateLeaveUsagePlan failed:', err);
    return null;
  }
}

export async function deleteLeaveUsagePlan(id: string): Promise<boolean> {
  try {
    const [existing] = await db
      .select()
      .from(schema.leaveUsagePlans)
      .where(eq(schema.leaveUsagePlans.id, id));
    if (!existing) return true;
    await assertRecordWrite(existing.employeeId);
    await db.delete(schema.leaveUsagePlans).where(eq(schema.leaveUsagePlans.id, id));
    return true;
  } catch (err) {
    console.error('deleteLeaveUsagePlan failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Leave promotion alerts (연차촉진 알림)
// ---------------------------------------------------------------------------

export async function createLeavePromotionAlert(
  alert: LeavePromotionAlert,
): Promise<LeavePromotionAlert | null> {
  try {
    await assertHrWrite();
    const values = toLeaveDb(alert as unknown as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .insert(schema.leavePromotionAlerts)
      .values(values as typeof schema.leavePromotionAlerts.$inferInsert)
      .returning();
    return row ? rowToAlert(row) : null;
  } catch (err) {
    console.error('createLeavePromotionAlert failed:', err);
    return null;
  }
}

/** Bulk alert generation (1차/2차 촉진 일괄 발송). */
export async function createLeavePromotionAlerts(
  alerts: LeavePromotionAlert[],
): Promise<LeavePromotionAlert[] | null> {
  try {
    await assertHrWrite();
    if (alerts.length === 0) return [];
    const values = alerts.map(
      (a) =>
        toLeaveDb(a as unknown as Record<string, unknown>, {
          dropId: true,
        }) as typeof schema.leavePromotionAlerts.$inferInsert,
    );
    const rows = await db.insert(schema.leavePromotionAlerts).values(values).returning();
    return rows.map(rowToAlert);
  } catch (err) {
    console.error('createLeavePromotionAlerts failed:', err);
    return null;
  }
}

export async function updateLeavePromotionAlert(
  id: string,
  patch: Partial<LeavePromotionAlert>,
): Promise<LeavePromotionAlert | null> {
  try {
    const [existing] = await db
      .select()
      .from(schema.leavePromotionAlerts)
      .where(eq(schema.leavePromotionAlerts.id, id));
    if (!existing) return null;
    await assertRecordWrite(existing.employeeId);
    const values = toLeaveDb(patch as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .update(schema.leavePromotionAlerts)
      .set(values)
      .where(eq(schema.leavePromotionAlerts.id, id))
      .returning();
    return row ? rowToAlert(row) : null;
  } catch (err) {
    console.error('updateLeavePromotionAlert failed:', err);
    return null;
  }
}

export async function deleteLeavePromotionAlert(id: string): Promise<boolean> {
  try {
    await assertHrWrite();
    await db.delete(schema.leavePromotionAlerts).where(eq(schema.leavePromotionAlerts.id, id));
    return true;
  } catch (err) {
    console.error('deleteLeavePromotionAlert failed:', err);
    return false;
  }
}
