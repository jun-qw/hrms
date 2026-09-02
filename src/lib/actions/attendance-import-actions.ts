'use server';

/**
 * 근태 일괄 등록.
 *
 * 근태기록에는 사원번호가 없고 휴대폰 번호가 필수 항목입니다. 그래서 직원을
 * 찾는 열쇠는 휴대폰 번호입니다. 번호 표기가 제각각이라 숫자만 남긴 형태로
 * 대조합니다.
 *
 * 미리보기와 저장이 같은 함수를 씁니다. 화면에서 확인한 결과와 실제 저장되는
 * 내용이 갈라지면 확인의 의미가 없기 때문입니다.
 */
import { and, eq, inArray, or } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { normalizePhone } from '@/lib/attendance/import-parse';
import { recordAudit } from './audit';

const HR_ROLES = ['admin', 'hr_manager'];

async function assertHr(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session || !HR_ROLES.includes(session.role)) throw new Error('forbidden');
}

export interface ImportRow {
  /** 원본 줄 번호 — 화면에서 어느 줄이 틀렸는지 짚어 주기 위해 필요합니다. */
  line: number;
  phone: string;
  /** 자료에 적힌 이름. 대조용이며 직원을 찾는 데는 쓰지 않습니다. */
  name?: string | null;
  date: string;
  workHours: number | null;
  overtimeHours: number | null;
  status: string | null;
  note?: string | null;
}

export type RowVerdict = 'new' | 'update' | 'same' | 'error';

export interface ResolvedRow {
  line: number;
  verdict: RowVerdict;
  reason?: string;
  employeeId?: string;
  employeeName?: string;
  employeeNumber?: string;
  /** 자료의 이름과 시스템의 이름이 다를 때. 저장은 하되 눈에 띄게 합니다. */
  nameMismatch?: string;
  date: string;
  phone: string;
  workHours: number | null;
  overtimeHours: number | null;
  status: string;
}

export interface ImportPreview {
  ok: boolean;
  rows: ResolvedRow[];
  summary: {
    total: number;
    신규: number;
    수정: number;
    동일: number;
    오류: number;
    /** 어느 직원에게도 붙지 않은 번호 */
    미매칭번호: string[];
    /** 마감된 달이라 건드릴 수 없는 날짜 */
    마감월: string[];
  };
  saved?: number;
}

interface Candidate {
  id: string;
  name: string;
  employee_number: string;
}

/**
 * 휴대폰 번호로 직원을 찾고, 줄마다 어떻게 될지 판정합니다.
 *
 * `commit`이 false면 아무것도 쓰지 않습니다.
 */
export async function importAttendanceRows(
  rows: ImportRow[],
  commit: boolean,
): Promise<ImportPreview> {
  const empty: ImportPreview = {
    ok: false,
    rows: [],
    summary: { total: 0, 신규: 0, 수정: 0, 동일: 0, 오류: 0, 미매칭번호: [], 마감월: [] },
  };

  try {
    await assertHr();
    if (rows.length === 0) return { ...empty, ok: true };

    // ── 직원 찾기 ────────────────────────────────────────────────────────
    const employees = await db
      .select({
        id: schema.employees.id,
        name: schema.employees.name,
        phone: schema.employees.phone,
        employee_number: schema.employees.employeeNumber,
        status: schema.employees.status,
      })
      .from(schema.employees);

    const byPhone = new Map<string, Candidate[]>();
    for (const e of employees) {
      const key = normalizePhone(e.phone);
      if (!key) continue;
      const list = byPhone.get(key) ?? [];
      list.push({ id: e.id, name: e.name, employee_number: e.employee_number ?? '' });
      byPhone.set(key, list);
    }

    // ── 마감된 달은 건드리지 않습니다 ────────────────────────────────────
    const closeouts = await db.select().from(schema.attendanceCloseouts);
    // 마감 테이블에는 상태 컬럼이 없습니다. 행이 있으면 그 달은 마감된 것입니다
    // (마감 해제는 행을 지웁니다).
    const closed = new Set(
      closeouts.map((c) => `${c.year}-${String(c.month).padStart(2, '0')}`),
    );

    // ── 이미 있는 기록 ───────────────────────────────────────────────────
    const ids = [...new Set([...byPhone.values()].flat().map((c) => c.id))];
    const existing = ids.length
      ? await db.select().from(schema.attendances).where(inArray(schema.attendances.employeeId, ids))
      : [];
    const existingBy = new Map(existing.map((r) => [`${r.employeeId}|${r.date}`, r]));

    const resolved: ResolvedRow[] = [];
    const unmatched = new Set<string>();
    const closedMonths = new Set<string>();
    const seen = new Set<string>();

    for (const row of rows) {
      const key = normalizePhone(row.phone);
      const base = {
        line: row.line,
        date: row.date,
        phone: row.phone,
        workHours: row.workHours,
        overtimeHours: row.overtimeHours,
        status: row.status ?? 'normal',
      };

      if (!key) { resolved.push({ ...base, verdict: 'error', reason: '휴대폰 번호가 비어 있습니다.' }); continue; }
      if (!row.date) { resolved.push({ ...base, verdict: 'error', reason: '날짜를 읽을 수 없습니다.' }); continue; }

      const found = byPhone.get(key);
      if (!found || found.length === 0) {
        unmatched.add(row.phone);
        resolved.push({ ...base, verdict: 'error', reason: '이 번호를 쓰는 직원이 없습니다.' });
        continue;
      }
      if (found.length > 1) {
        // 같은 번호를 두 사람이 쓰면 누구 근태인지 판정할 수 없습니다.
        resolved.push({
          ...base,
          verdict: 'error',
          reason: `번호가 겹칩니다 — ${found.map((f) => f.name).join(', ')}. 사원정보에서 먼저 정리하세요.`,
        });
        continue;
      }

      const emp = found[0];
      const month = row.date.slice(0, 7);
      if (closed.has(month)) {
        closedMonths.add(month);
        resolved.push({
          ...base, verdict: 'error', employeeId: emp.id, employeeName: emp.name,
          reason: `${month} 은 마감되었습니다. 마감을 풀고 다시 넣으세요.`,
        });
        continue;
      }

      const dedupe = `${emp.id}|${row.date}`;
      if (seen.has(dedupe)) {
        resolved.push({
          ...base, verdict: 'error', employeeId: emp.id, employeeName: emp.name,
          reason: '같은 사람의 같은 날짜가 자료 안에 두 번 있습니다.',
        });
        continue;
      }
      seen.add(dedupe);

      const prev = existingBy.get(dedupe);
      const nextHours = row.workHours;
      const nextOt = row.overtimeHours ?? 0;
      const nextStatus = row.status ?? 'normal';

      let verdict: RowVerdict = 'new';
      if (prev) {
        const same =
          Number(prev.workHours ?? 0) === Number(nextHours ?? 0) &&
          Number(prev.overtimeHours ?? 0) === Number(nextOt) &&
          (prev.status ?? 'normal') === nextStatus;
        verdict = same ? 'same' : 'update';
      }

      resolved.push({
        ...base,
        verdict,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeNumber: emp.employee_number,
        nameMismatch:
          row.name && row.name.trim() && row.name.trim() !== emp.name ? row.name.trim() : undefined,
        status: nextStatus,
      });
    }

    const summary = {
      total: resolved.length,
      신규: resolved.filter((r) => r.verdict === 'new').length,
      수정: resolved.filter((r) => r.verdict === 'update').length,
      동일: resolved.filter((r) => r.verdict === 'same').length,
      오류: resolved.filter((r) => r.verdict === 'error').length,
      미매칭번호: [...unmatched],
      마감월: [...closedMonths],
    };

    if (!commit) return { ok: true, rows: resolved, summary };

    // ── 저장 ─────────────────────────────────────────────────────────────
    // 틀린 줄은 건너뛰고 멀쩡한 줄만 넣습니다. 하나 틀렸다고 전부 되돌리면
    // 담당자가 200줄에서 오타 한 곳을 찾아 다시 붙여넣어야 합니다.
    //
    // 한 줄에 질의 하나씩 보내면 한 달치 100명이 2,500줄이라 수십 초가 걸립니다.
    // 일괄 등록이라는 기능이 한 줄씩 도는 건 말이 안 되므로 묶어서 보냅니다.
    const valuesOf = (r: ResolvedRow) => ({
      workHours: r.workHours === null ? null : String(r.workHours),
      overtimeHours: String(r.overtimeHours ?? 0),
      status: r.status as (typeof schema.attendances.status.enumValues)[number],
    });

    const toInsert = resolved.filter((r) => r.verdict === 'new' && r.employeeId);
    const toUpdate = resolved.filter((r) => r.verdict === 'update' && r.employeeId);

    const CHUNK = 500;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      await db.insert(schema.attendances).values(
        toInsert.slice(i, i + CHUNK).map((r) => ({
          employeeId: r.employeeId!,
          date: r.date,
          ...valuesOf(r),
        })),
      );
    }

    // 수정은 값이 줄마다 달라 묶기 어렵습니다. 대신 같은 값끼리 모아
    // 한 번에 처리합니다 — 한 달치를 다시 넣으면 대부분 값이 같습니다.
    const groups = new Map<string, { ids: string[]; dates: string[]; row: ResolvedRow }>();
    for (const r of toUpdate) {
      const v = valuesOf(r);
      const key = `${v.workHours}|${v.overtimeHours}|${v.status}`;
      const g = groups.get(key) ?? { ids: [], dates: [], row: r };
      g.ids.push(r.employeeId!);
      g.dates.push(r.date);
      groups.set(key, g);
    }
    for (const g of groups.values()) {
      // 짝(직원, 날짜)이 많아도 한 번에 걸도록 OR 로 묶습니다.
      await db
        .update(schema.attendances)
        .set(valuesOf(g.row))
        .where(
          or(
            ...g.ids.map((id, i) =>
              and(
                eq(schema.attendances.employeeId, id),
                eq(schema.attendances.date, g.dates[i]),
              ),
            ),
          ),
        );
    }

    const saved = toInsert.length + toUpdate.length;
    await recordAudit({
      action: 'import', targetType: 'attendance',
      targetLabel: `근태 일괄 등록 ${saved}건`,
      details: { inserted: toInsert.length, updated: toUpdate.length, errors: summary.오류 },
    });
    return { ok: true, rows: resolved, summary, saved };
  } catch (err) {
    console.error('importAttendanceRows failed:', err);
    return empty;
  }
}

/**
 * 휴대폰 번호가 없거나 겹치는 사람.
 *
 * 번호가 없으면 그 사람의 근태는 영영 들어오지 않습니다. 조용히 빠지면
 * 급여까지 가서야 드러나므로, 근태 가져오기 화면 위에 먼저 띄웁니다.
 */
export async function fetchPhoneGaps(): Promise<{
  missing: { id: string; name: string; employee_number: string }[];
  duplicated: { phone: string; names: string[] }[];
}> {
  try {
    await assertHr();
    const employees = await db
      .select({
        id: schema.employees.id,
        name: schema.employees.name,
        phone: schema.employees.phone,
        employee_number: schema.employees.employeeNumber,
        status: schema.employees.status,
      })
      .from(schema.employees);

    const active = employees.filter((e) => e.status !== 'resigned');
    const missing = active
      .filter((e) => !normalizePhone(e.phone))
      .map((e) => ({ id: e.id, name: e.name, employee_number: e.employee_number ?? '' }));

    const byPhone = new Map<string, string[]>();
    for (const e of active) {
      const key = normalizePhone(e.phone);
      if (!key) continue;
      byPhone.set(key, [...(byPhone.get(key) ?? []), e.name]);
    }
    const duplicated = [...byPhone.entries()]
      .filter(([, names]) => names.length > 1)
      .map(([phone, names]) => ({ phone, names }));

    return { missing, duplicated };
  } catch (err) {
    console.error('fetchPhoneGaps failed:', err);
    return { missing: [], duplicated: [] };
  }
}
