'use server';

/**
 * 소속 이력 (employee_assignments) — 발령의 결과를 기간으로 기록합니다.
 *
 * 한 직원의 구간은 겹치지 않습니다. 새 구간을 열면 직전 구간이 그 전날로 닫힙니다.
 * `employees`의 부서·직급·직책 컬럼은 오늘 유효한 구간의 사본일 뿐이고, 진짜 기록은
 * 여기입니다. 그래야 "3월 조직도", "그때 직급으로 급여 재계산", "경력증명서"가
 * 전부 같은 자료에서 나옵니다.
 */
import { and, asc, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import type { EmployeeAssignment } from '@/types';
import { toApp } from './mappers';

const HR_ROLES = ['admin', 'hr_manager'];

async function assertHrWrite(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session || !HR_ROLES.includes(session.role)) throw new Error('forbidden');
}

/** 로컬 기준 오늘 (YYYY-MM-DD). DB의 date 컬럼과 같은 방식으로 비교합니다. */
function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayBefore(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function fetchAssignments(employeeId?: string): Promise<EmployeeAssignment[]> {
  try {
    const rows = employeeId
      ? await db
          .select()
          .from(schema.employeeAssignments)
          .where(eq(schema.employeeAssignments.employeeId, employeeId))
          .orderBy(desc(schema.employeeAssignments.effectiveFrom))
      : await db
          .select()
          .from(schema.employeeAssignments)
          .orderBy(
            asc(schema.employeeAssignments.employeeId),
            asc(schema.employeeAssignments.effectiveFrom),
          );
    return rows.map((r) => toApp<EmployeeAssignment>(r));
  } catch (err) {
    console.error('fetchAssignments failed:', err);
    return [];
  }
}

/**
 * 특정 날짜에 유효했던 소속 — 전 직원분.
 *
 * 시점 조직도, 소급 급여 재계산, 특정일 기준 인력현황이 모두 이 한 함수를 씁니다.
 */
export async function fetchAssignmentsAsOf(date: string): Promise<EmployeeAssignment[]> {
  try {
    const rows = await db
      .select()
      .from(schema.employeeAssignments)
      .where(
        and(
          lte(schema.employeeAssignments.effectiveFrom, date),
          or(
            isNull(schema.employeeAssignments.effectiveTo),
            gte(schema.employeeAssignments.effectiveTo, date),
          ),
        ),
      )
      .orderBy(asc(schema.employeeAssignments.employeeId));
    return rows.map((r) => toApp<EmployeeAssignment>(r));
  } catch (err) {
    console.error('fetchAssignmentsAsOf failed:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export interface NewAssignment {
  employeeId: string;
  effectiveFrom: string;
  departmentId?: string | null;
  positionRankId?: string | null;
  positionTitleId?: string | null;
  workplaceId?: string | null;
  appointmentId?: string | null;
  reason?: string | null;
}

/**
 * 새 소속 구간을 엽니다.
 *
 * 발령일이 앞으로의 날짜여도 그대로 기록하고, `employees`의 현재값은 건드리지
 * 않습니다. 그 날짜가 되면 `syncCurrentAssignments()`가 옮겨 담습니다 — 미리
 * 등록한 발령이 오늘 조직도를 바꿔 버리지 않도록 하기 위해서입니다.
 */
export async function createAssignment(input: NewAssignment): Promise<EmployeeAssignment | null> {
  try {
    await assertHrWrite();

    // 같은 직원의, 새 발령일 이후까지 열려 있는 구간을 하루 전으로 닫습니다.
    await db
      .update(schema.employeeAssignments)
      .set({ effectiveTo: dayBefore(input.effectiveFrom) })
      .where(
        and(
          eq(schema.employeeAssignments.employeeId, input.employeeId),
          lte(schema.employeeAssignments.effectiveFrom, input.effectiveFrom),
          or(
            isNull(schema.employeeAssignments.effectiveTo),
            gte(schema.employeeAssignments.effectiveTo, input.effectiveFrom),
          ),
        ),
      );

    const [row] = await db
      .insert(schema.employeeAssignments)
      .values({
        employeeId: input.employeeId,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: null,
        departmentId: input.departmentId ?? null,
        positionRankId: input.positionRankId ?? null,
        positionTitleId: input.positionTitleId ?? null,
        workplaceId: input.workplaceId ?? null,
        appointmentId: input.appointmentId ?? null,
        reason: input.reason ?? null,
      })
      .returning();

    await syncCurrentAssignments(input.employeeId);
    return row ? toApp<EmployeeAssignment>(row) : null;
  } catch (err) {
    console.error('createAssignment failed:', err);
    return null;
  }
}

/**
 * 소속 구간을 지우고 직전 구간을 다시 엽니다. 잘못 등록한 발령을 되돌릴 때 씁니다.
 */
export async function deleteAssignment(id: string): Promise<boolean> {
  try {
    await assertHrWrite();
    const [target] = await db
      .select()
      .from(schema.employeeAssignments)
      .where(eq(schema.employeeAssignments.id, id));
    if (!target) return false;

    await db.delete(schema.employeeAssignments).where(eq(schema.employeeAssignments.id, id));

    // 직전 구간의 종료일을, 지운 구간이 덮고 있던 끝까지 늘립니다.
    const [previous] = await db
      .select()
      .from(schema.employeeAssignments)
      .where(
        and(
          eq(schema.employeeAssignments.employeeId, target.employeeId),
          lte(schema.employeeAssignments.effectiveFrom, target.effectiveFrom),
        ),
      )
      .orderBy(desc(schema.employeeAssignments.effectiveFrom))
      .limit(1);

    if (previous) {
      await db
        .update(schema.employeeAssignments)
        .set({ effectiveTo: target.effectiveTo })
        .where(eq(schema.employeeAssignments.id, previous.id));
    }

    await syncCurrentAssignments(target.employeeId);
    return true;
  } catch (err) {
    console.error('deleteAssignment failed:', err);
    return false;
  }
}

/**
 * `employees`의 부서·직급·직책을 오늘 유효한 구간에 맞춥니다.
 *
 * 미래 발령이 그 날짜에 저절로 반영되게 하는 장치입니다. 별도 스케줄러 없이
 * 자료를 읽을 때마다 한 번 맞추는 방식이라, 온프레미스 설치에 크론을 추가로
 * 걸 필요가 없습니다. 값이 이미 같은 직원은 UPDATE하지 않습니다.
 */
export async function syncCurrentAssignments(employeeId?: string): Promise<number> {
  try {
    const now = today();
    const scope = employeeId
      ? and(
          eq(schema.employeeAssignments.employeeId, employeeId),
          lte(schema.employeeAssignments.effectiveFrom, now),
          or(
            isNull(schema.employeeAssignments.effectiveTo),
            gte(schema.employeeAssignments.effectiveTo, now),
          ),
        )
      : and(
          lte(schema.employeeAssignments.effectiveFrom, now),
          or(
            isNull(schema.employeeAssignments.effectiveTo),
            gte(schema.employeeAssignments.effectiveTo, now),
          ),
        );

    const current = await db.select().from(schema.employeeAssignments).where(scope);
    if (current.length === 0) return 0;

    const targets = employeeId
      ? await db.select().from(schema.employees).where(eq(schema.employees.id, employeeId))
      : await db.select().from(schema.employees);
    const byId = new Map(targets.map((e) => [e.id, e]));

    let changed = 0;
    for (const assignment of current) {
      const employee = byId.get(assignment.employeeId);
      if (!employee) continue;
      if (
        employee.departmentId === assignment.departmentId &&
        employee.positionRankId === assignment.positionRankId &&
        employee.positionTitleId === assignment.positionTitleId &&
        employee.workplaceId === (assignment.workplaceId ?? employee.workplaceId)
      ) {
        continue;
      }
      await db
        .update(schema.employees)
        .set({
          departmentId: assignment.departmentId,
          positionRankId: assignment.positionRankId,
          positionTitleId: assignment.positionTitleId,
          workplaceId: assignment.workplaceId ?? employee.workplaceId,
          updatedAt: new Date(),
        })
        .where(eq(schema.employees.id, assignment.employeeId));
      changed += 1;
    }
    return changed;
  } catch (err) {
    console.error('syncCurrentAssignments failed:', err);
    return 0;
  }
}

/**
 * 아직 도래하지 않은 발령 — 대시보드의 "예정된 발령"과 인력대장 배지에 씁니다.
 */
export async function fetchPendingAssignments(): Promise<EmployeeAssignment[]> {
  try {
    const rows = await db
      .select()
      .from(schema.employeeAssignments)
      .where(sql`${schema.employeeAssignments.effectiveFrom} > ${today()}`)
      .orderBy(asc(schema.employeeAssignments.effectiveFrom));
    return rows.map((r) => toApp<EmployeeAssignment>(r));
  } catch (err) {
    console.error('fetchPendingAssignments failed:', err);
    return [];
  }
}
