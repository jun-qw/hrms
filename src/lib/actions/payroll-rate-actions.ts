'use server';

/**
 * 연도별 급여 기준값 읽기·쓰기.
 *
 * 조회에 실패하거나 해당 연도 값이 없으면 기본값으로 떨어집니다. 급여 계산이
 * 기준값을 못 찾았다는 이유로 멈추면 안 되지만, 어떤 값을 썼는지는 호출한
 * 쪽에서 알 수 있어야 하므로 `source`를 같이 돌려줍니다.
 */
import { desc, eq, lte } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import {
  DEFAULT_RATE_SET,
  copyRateSetForYear,
  type PayrollRateSet,
} from '@/lib/payroll/rate-set';

async function assertHrWrite(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session || !['admin', 'hr_manager'].includes(session.role)) throw new Error('forbidden');
}

export interface ResolvedRateSet {
  rates: PayrollRateSet;
  /** exact: 그 해 값 · carried: 이전 해 값을 이어 씀 · default: 코드 기본값 */
  source: 'exact' | 'carried' | 'default';
  /** carried일 때 실제로 쓴 연도 */
  fromYear?: number;
}

/**
 * 해당 연도에 적용할 기준값.
 *
 * 그 해 값이 없으면 가장 가까운 과거 연도 값을 이어 씁니다. 새해 첫 급여를
 * 돌릴 때 기준값 등록을 깜빡했다고 계산이 막히면 곤란하고, 전년도 요율로
 * 계산해 두면 최소한 자릿수가 맞기 때문입니다. 다만 화면에는 "전년도 값을
 * 쓰고 있다"고 표시해야 담당자가 갱신을 놓치지 않습니다.
 */
export async function resolveRateSet(year: number): Promise<ResolvedRateSet> {
  try {
    const [exact] = await db
      .select()
      .from(schema.payrollRateSets)
      .where(eq(schema.payrollRateSets.year, year));
    if (exact) return { rates: exact.rates as PayrollRateSet, source: 'exact' };

    const [previous] = await db
      .select()
      .from(schema.payrollRateSets)
      .where(lte(schema.payrollRateSets.year, year))
      .orderBy(desc(schema.payrollRateSets.year))
      .limit(1);
    if (previous) {
      return {
        rates: { ...(previous.rates as PayrollRateSet), year },
        source: 'carried',
        fromYear: previous.year,
      };
    }

    return { rates: { ...DEFAULT_RATE_SET, year }, source: 'default' };
  } catch (err) {
    console.error('resolveRateSet failed:', err);
    return { rates: { ...DEFAULT_RATE_SET, year }, source: 'default' };
  }
}

export async function fetchRateSets(): Promise<PayrollRateSet[]> {
  try {
    const rows = await db
      .select()
      .from(schema.payrollRateSets)
      .orderBy(desc(schema.payrollRateSets.year));
    return rows.map((r) => r.rates as PayrollRateSet);
  } catch (err) {
    console.error('fetchRateSets failed:', err);
    return [];
  }
}

export async function saveRateSet(rates: PayrollRateSet): Promise<boolean> {
  try {
    await assertHrWrite();
    await db
      .insert(schema.payrollRateSets)
      .values({ year: rates.year, rates, note: rates.note, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.payrollRateSets.year,
        set: { rates, note: rates.note, updatedAt: new Date() },
      });
    return true;
  } catch (err) {
    console.error('saveRateSet failed:', err);
    return false;
  }
}

/** 새해 기준값을 직전 해에서 복사해 만듭니다. 숫자는 그대로, 대조는 담당자 몫. */
export async function createNextYearRateSet(year: number): Promise<PayrollRateSet | null> {
  try {
    await assertHrWrite();
    const { rates: source } = await resolveRateSet(year - 1);
    const next = copyRateSetForYear(source, year);
    const ok = await saveRateSet(next);
    return ok ? next : null;
  } catch (err) {
    console.error('createNextYearRateSet failed:', err);
    return null;
  }
}

export async function deleteRateSet(year: number): Promise<boolean> {
  try {
    await assertHrWrite();
    await db.delete(schema.payrollRateSets).where(eq(schema.payrollRateSets.year, year));
    return true;
  } catch (err) {
    console.error('deleteRateSet failed:', err);
    return false;
  }
}
