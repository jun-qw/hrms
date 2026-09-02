'use server';

/**
 * Server actions for the attendance module (records + monthly closeouts).
 * The client store hydrates from fetchAttendanceData() and mirrors mutations
 * through these actions.
 */
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { toApp, toDb } from './mappers';
import { filterScoped, readScope } from './read-scope';
import type { Attendance } from '@/types';
import type { AttendanceCloseout } from '@/lib/stores/attendance-store';

const HR_ROLES = ['admin', 'hr_manager'];

async function assertRead(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
}

/** HR roles may write any record; employees only their own. */
async function assertRecordWrite(employeeId: string | undefined): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
  if (HR_ROLES.includes(session.role)) return;
  if (employeeId && session.employeeId === employeeId) return;
  throw new Error('forbidden');
}

async function assertHrWrite(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session || !HR_ROLES.includes(session.role)) throw new Error('forbidden');
}

export interface AttendanceModuleData {
  records: Attendance[];
  closeouts: AttendanceCloseout[];
}

export async function fetchAttendanceData(): Promise<AttendanceModuleData | null> {
  try {
    // 인사 담당이 아니면 자기 근태만 봅니다. 예전에는 로그인만 확인하고
    // 전 직원의 근태를 그대로 내려보냈습니다 — 메뉴는 감춰져 있었지만
    // 주소를 직접 치면 115명이 다 보였습니다.
    const scope = await readScope();
    const [records, closeouts] = await Promise.all([
      db.select().from(schema.attendances),
      db.select().from(schema.attendanceCloseouts),
    ]);
    return {
      records: filterScoped(scope, records, (r) => r.employeeId).map((r) => toApp<Attendance>(r)),
      closeouts: closeouts.map((r) => toApp<AttendanceCloseout>(r)),
    };
  } catch (err) {
    console.error('fetchAttendanceData failed:', err);
    return null;
  }
}

export async function createAttendance(record: Attendance): Promise<Attendance | null> {
  try {
    await assertRecordWrite(record.employee_id);
    const values = toDb(record as unknown as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .insert(schema.attendances)
      .values(values as typeof schema.attendances.$inferInsert)
      .returning();
    return toApp<Attendance>(row);
  } catch (err) {
    console.error('createAttendance failed:', err);
    return null;
  }
}

export async function updateAttendance(
  id: string,
  patch: Partial<Attendance>,
): Promise<Attendance | null> {
  try {
    const [existing] = await db
      .select()
      .from(schema.attendances)
      .where(eq(schema.attendances.id, id));
    if (!existing) return null;
    await assertRecordWrite(existing.employeeId);
    const values = toDb(patch as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .update(schema.attendances)
      .set(values)
      .where(eq(schema.attendances.id, id))
      .returning();
    return row ? toApp<Attendance>(row) : null;
  } catch (err) {
    console.error('updateAttendance failed:', err);
    return null;
  }
}

export async function closeAttendanceMonth(
  closeout: Omit<AttendanceCloseout, 'id' | 'closed_at'>,
): Promise<AttendanceCloseout | null> {
  try {
    await assertHrWrite();
    const [row] = await db
      .insert(schema.attendanceCloseouts)
      .values({
        year: closeout.year,
        month: closeout.month,
        closedBy: closeout.closed_by,
        closedByName: closeout.closed_by_name,
        note: closeout.note,
      })
      .onConflictDoNothing()
      .returning();
    return row ? toApp<AttendanceCloseout>(row) : null;
  } catch (err) {
    console.error('closeAttendanceMonth failed:', err);
    return null;
  }
}

export async function reopenAttendanceMonth(year: number, month: number): Promise<boolean> {
  try {
    await assertHrWrite();
    await db
      .delete(schema.attendanceCloseouts)
      .where(
        and(eq(schema.attendanceCloseouts.year, year), eq(schema.attendanceCloseouts.month, month)),
      );
    return true;
  } catch (err) {
    console.error('reopenAttendanceMonth failed:', err);
    return false;
  }
}
