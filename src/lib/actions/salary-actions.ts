'use server';

/**
 * 급여 이력 — 언제부터 얼마를 받았는가.
 *
 * 소속 이력과 같은 구간 구조입니다. `employees`의 금액 컬럼은 오늘 유효한
 * 구간의 사본이고, 진짜 기록은 `employee_salaries`입니다.
 *
 * 급여는 조회 자체가 민감해서, 읽기도 HR 역할로 제한합니다.
 */
import { and, asc, desc, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { recordAudit } from './audit';
import type { PayMethod } from '@/types';

const HR_ROLES = ['admin', 'hr_manager'];

async function assertHr(): Promise<string | null> {
  if (process.env.AUTH_MODE !== 'db') return null;
  const session = await getSession();
  if (!session || !HR_ROLES.includes(session.role)) throw new Error('forbidden');
  return session.name ?? session.email ?? null;
}

function dayBefore(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface SalaryRecord {
  id: string;
  employee_id: string;
  effective_from: string;
  effective_to: string | null;
  pay_method: PayMethod;
  base_salary: number;
  hourly_wage: number;
  reason: string | null;
  created_by: string | null;
}

function toApp(row: typeof schema.employeeSalaries.$inferSelect): SalaryRecord {
  return {
    id: row.id,
    employee_id: row.employeeId,
    effective_from: row.effectiveFrom,
    effective_to: row.effectiveTo,
    pay_method: row.payMethod as PayMethod,
    base_salary: Number(row.baseSalary ?? 0),
    hourly_wage: Number(row.hourlyWage ?? 0),
    reason: row.reason,
    created_by: row.createdBy,
  };
}

// ---------------------------------------------------------------------------
// 읽기
// ---------------------------------------------------------------------------

export async function fetchSalaryHistory(employeeId?: string): Promise<SalaryRecord[]> {
  try {
    await assertHr();
    const rows = employeeId
      ? await db
          .select()
          .from(schema.employeeSalaries)
          .where(eq(schema.employeeSalaries.employeeId, employeeId))
          .orderBy(desc(schema.employeeSalaries.effectiveFrom))
      : await db
          .select()
          .from(schema.employeeSalaries)
          .orderBy(
            asc(schema.employeeSalaries.employeeId),
            asc(schema.employeeSalaries.effectiveFrom),
          );
    return rows.map(toApp);
  } catch (err) {
    console.error('fetchSalaryHistory failed:', err);
    return [];
  }
}

/**
 * 특정 날짜에 유효했던 급여 — 전 직원분.
 *
 * 급여 계산이 이 함수를 씁니다. 4월에 3월분을 다시 돌려도 3월에 유효했던
 * 금액이 나와야 하기 때문입니다.
 */
export async function fetchSalariesAsOf(date: string): Promise<Record<string, SalaryRecord>> {
  try {
    await assertHr();
    const rows = await db
      .select()
      .from(schema.employeeSalaries)
      .where(
        and(
          lte(schema.employeeSalaries.effectiveFrom, date),
          or(
            isNull(schema.employeeSalaries.effectiveTo),
            gte(schema.employeeSalaries.effectiveTo, date),
          ),
        ),
      );
    return Object.fromEntries(rows.map((r) => [r.employeeId, toApp(r)]));
  } catch (err) {
    console.error('fetchSalariesAsOf failed:', err);
    return {};
  }
}

// ---------------------------------------------------------------------------
// 쓰기
// ---------------------------------------------------------------------------

export interface SalaryInput {
  employeeId: string;
  effectiveFrom: string;
  payMethod: PayMethod;
  baseSalary: number;
  hourlyWage: number;
  reason?: string | null;
}

export interface SalarySaveResult {
  ok: boolean;
  saved: number;
  failed: { employeeId: string; reason: string }[];
}

/**
 * 급여를 새로 정합니다.
 *
 * 같은 날짜에 이미 구간이 있으면 그 구간을 고칩니다 — 오타를 고치려고 같은
 * 날짜로 두 번 저장했을 때 구간이 둘로 갈라지면 안 됩니다.
 */
export async function setSalaries(inputs: SalaryInput[]): Promise<SalarySaveResult> {
  const failed: SalarySaveResult['failed'] = [];
  let saved = 0;

  try {
    const actor = await assertHr();

    for (const input of inputs) {
      try {
        const [sameDay] = await db
          .select()
          .from(schema.employeeSalaries)
          .where(
            and(
              eq(schema.employeeSalaries.employeeId, input.employeeId),
              eq(schema.employeeSalaries.effectiveFrom, input.effectiveFrom),
            ),
          );

        if (sameDay) {
          await db
            .update(schema.employeeSalaries)
            .set({
              payMethod: input.payMethod,
              baseSalary: String(Math.round(input.baseSalary)),
              hourlyWage: String(Math.round(input.hourlyWage)),
              reason: input.reason ?? sameDay.reason,
              createdBy: actor,
            })
            .where(eq(schema.employeeSalaries.id, sameDay.id));
        } else {
          // 새 발효일 이후까지 열려 있는 구간을 하루 전으로 닫습니다.
          await db
            .update(schema.employeeSalaries)
            .set({ effectiveTo: dayBefore(input.effectiveFrom) })
            .where(
              and(
                eq(schema.employeeSalaries.employeeId, input.employeeId),
                lte(schema.employeeSalaries.effectiveFrom, input.effectiveFrom),
                or(
                  isNull(schema.employeeSalaries.effectiveTo),
                  gte(schema.employeeSalaries.effectiveTo, input.effectiveFrom),
                ),
              ),
            );

          await db.insert(schema.employeeSalaries).values({
            employeeId: input.employeeId,
            effectiveFrom: input.effectiveFrom,
            effectiveTo: null,
            payMethod: input.payMethod,
            baseSalary: String(Math.round(input.baseSalary)),
            hourlyWage: String(Math.round(input.hourlyWage)),
            reason: input.reason ?? null,
            createdBy: actor,
          });
        }
        saved += 1;
      } catch (err) {
        console.error('setSalaries row failed:', err);
        failed.push({ employeeId: input.employeeId, reason: '저장 중 오류가 발생했습니다.' });
      }
    }

    await syncCurrentSalaries();
    await recordAudit({
      action: 'update', targetType: 'employee.salary',
      targetLabel: `급여 기준액 ${saved}건 저장`,
      details: { saved, failed: failed.length, effectiveFrom: inputs[0]?.effectiveFrom },
    });
    return { ok: true, saved, failed };
  } catch (err) {
    console.error('setSalaries failed:', err);
    return { ok: false, saved, failed };
  }
}

/**
 * `employees`의 금액 컬럼을 오늘 유효한 구간에 맞춥니다.
 *
 * 미래 발효 인상을 미리 등록해도 오늘 급여가 바뀌지 않게 하는 장치입니다.
 * 소속 이력과 같은 방식으로, 자료를 읽을 때마다 한 번 맞춥니다.
 */
export async function syncCurrentSalaries(): Promise<number> {
  try {
    await assertHr();
    const now = today();
    const current = await db
      .select()
      .from(schema.employeeSalaries)
      .where(
        and(
          lte(schema.employeeSalaries.effectiveFrom, now),
          or(
            isNull(schema.employeeSalaries.effectiveTo),
            gte(schema.employeeSalaries.effectiveTo, now),
          ),
        ),
      );
    if (current.length === 0) return 0;

    const employees = await db.select().from(schema.employees);
    const byId = new Map(employees.map((e) => [e.id, e]));

    let changed = 0;
    for (const row of current) {
      const e = byId.get(row.employeeId);
      if (!e) continue;
      if (
        Number(e.baseSalary ?? 0) === Number(row.baseSalary) &&
        Number(e.hourlyWage ?? 0) === Number(row.hourlyWage)
      ) {
        continue;
      }
      await db
        .update(schema.employees)
        .set({
          baseSalary: row.baseSalary,
          hourlyWage: row.hourlyWage,
          updatedAt: new Date(),
        })
        .where(eq(schema.employees.id, row.employeeId));
      changed += 1;
    }
    return changed;
  } catch (err) {
    console.error('syncCurrentSalaries failed:', err);
    return 0;
  }
}

/** 아직 도래하지 않은 인상 — 화면에 "예정"으로 표시합니다. */
export async function fetchUpcomingSalaries(): Promise<SalaryRecord[]> {
  try {
    await assertHr();
    const rows = await db
      .select()
      .from(schema.employeeSalaries)
      .where(gte(schema.employeeSalaries.effectiveFrom, today()))
      .orderBy(asc(schema.employeeSalaries.effectiveFrom));
    return rows.filter((r) => r.effectiveFrom > today()).map(toApp);
  } catch (err) {
    console.error('fetchUpcomingSalaries failed:', err);
    return [];
  }
}
