'use server';

/**
 * 주민등록번호 열람과 저장.
 *
 * 목록 조회에는 마스킹된 값만 나갑니다. 전체를 보려면 이 액션을 따로 불러야
 * 하고, 그 호출은 감사로그에 남습니다 — "누가 언제 누구 것을 봤는가" 가
 * 남지 않으면 개인정보보호법이 요구하는 접근 통제를 지켰다고 말할 수 없습니다.
 */
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { recordAudit } from './audit';
import {
  decryptSensitive,
  encryptSensitive,
  isValidResidentNumber,
  maskStored,
} from '@/lib/security/sensitive';

/** 주민번호는 급여·연말정산 담당만 봅니다. 부서장에게도 열지 않습니다. */
const RESIDENT_ROLES = ['admin', 'hr_manager'];

async function assertResidentAccess(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session || !RESIDENT_ROLES.includes(session.role)) throw new Error('forbidden');
}

export interface RevealResult {
  ok: boolean;
  value?: string;
  reason?: string;
}

/**
 * 한 사람의 주민등록번호 전체.
 *
 * 한 번에 한 사람만 돌려줍니다. 여러 명을 한 번에 열 수 있게 하면 목록
 * 내려받기와 다를 바가 없어지고, 감사로그도 "115명 열람" 한 줄로 뭉개집니다.
 */
export async function revealResidentNumber(
  employeeId: string,
  purpose: string,
): Promise<RevealResult> {
  try {
    await assertResidentAccess();

    const [row] = await db
      .select({
        id: schema.employees.id,
        name: schema.employees.name,
        employeeNumber: schema.employees.employeeNumber,
        residentNumber: schema.employees.residentNumber,
      })
      .from(schema.employees)
      .where(eq(schema.employees.id, employeeId));

    if (!row) return { ok: false, reason: '직원을 찾을 수 없습니다.' };

    const value = decryptSensitive(row.residentNumber);
    if (!value) return { ok: false, reason: '등록된 주민등록번호가 없습니다.' };

    // 사유를 함께 남깁니다. 사유 없는 열람이 쌓이면 나중에 정당한 열람과
    // 그렇지 않은 열람을 구분할 수 없습니다.
    await recordAudit({
      action: 'reveal',
      targetType: 'employee.resident_number',
      targetId: row.id,
      targetLabel: `${row.name} (${row.employeeNumber ?? '사번없음'})`,
      details: { purpose: purpose.trim() || '(사유 미기재)' },
    });

    return { ok: true, value };
  } catch (err) {
    console.error('revealResidentNumber failed:', err);
    return { ok: false, reason: '열람 권한이 없습니다.' };
  }
}

/** 저장. 언제나 암호화해서 넣습니다. */
export async function setResidentNumber(
  employeeId: string,
  plain: string | null,
): Promise<{ ok: boolean; masked?: string | null; reason?: string }> {
  try {
    await assertResidentAccess();

    const trimmed = String(plain ?? '').trim();
    if (trimmed && !isValidResidentNumber(trimmed)) {
      return { ok: false, reason: '주민등록번호 형식이 아닙니다.' };
    }

    const [row] = await db
      .select({ name: schema.employees.name, employeeNumber: schema.employees.employeeNumber })
      .from(schema.employees)
      .where(eq(schema.employees.id, employeeId));
    if (!row) return { ok: false, reason: '직원을 찾을 수 없습니다.' };

    const encrypted = trimmed ? encryptSensitive(trimmed) : null;
    await db
      .update(schema.employees)
      .set({ residentNumber: encrypted, updatedAt: new Date() })
      .where(eq(schema.employees.id, employeeId));

    await recordAudit({
      action: 'update',
      targetType: 'employee.resident_number',
      targetId: employeeId,
      targetLabel: `${row.name} (${row.employeeNumber ?? '사번없음'})`,
      // 값 자체는 절대 남기지 않습니다. 감사로그가 곧 평문 저장소가 됩니다.
      details: { changed: trimmed ? 'set' : 'cleared' },
    });

    return { ok: true, masked: maskStored(encrypted) };
  } catch (err) {
    console.error('setResidentNumber failed:', err);
    return { ok: false, reason: '저장 권한이 없습니다.' };
  }
}

/**
 * 아직 평문으로 남아 있는 주민번호를 암호화합니다.
 *
 * 이행용입니다. 여러 번 돌려도 안전합니다 — 이미 암호문인 것은 건너뜁니다.
 */
export async function encryptExistingResidentNumbers(): Promise<{
  ok: boolean;
  encrypted: number;
  alreadyEncrypted: number;
  empty: number;
}> {
  const out = { ok: false, encrypted: 0, alreadyEncrypted: 0, empty: 0 };
  try {
    await assertResidentAccess();
    const rows = await db
      .select({ id: schema.employees.id, residentNumber: schema.employees.residentNumber })
      .from(schema.employees);

    for (const row of rows) {
      const raw = String(row.residentNumber ?? '').trim();
      if (!raw) { out.empty += 1; continue; }
      if (raw.startsWith('enc.v1.')) { out.alreadyEncrypted += 1; continue; }
      await db
        .update(schema.employees)
        .set({ residentNumber: encryptSensitive(raw) })
        .where(eq(schema.employees.id, row.id));
      out.encrypted += 1;
    }

    await recordAudit({
      action: 'update',
      targetType: 'employee.resident_number',
      targetLabel: '주민등록번호 일괄 암호화',
      details: { ...out },
    });
    return { ...out, ok: true };
  } catch (err) {
    console.error('encryptExistingResidentNumbers failed:', err);
    return out;
  }
}
