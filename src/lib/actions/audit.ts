import 'server-only';

/**
 * 서버에서 남기는 감사 기록.
 *
 * 감사로그 테이블은 전부터 있었지만 **기록하는 곳이 하나도 없었습니다.** 화면
 * 쪽 스토어에 쓰기 함수만 있고 부르는 데가 없어, 로그 화면은 언제나 비어
 * 있었습니다.
 *
 * 더 중요한 문제는 위치였습니다. 화면에서 기록하면 화면을 거치지 않은 호출은
 * 흔적이 남지 않습니다 — 서버 액션은 직접 부를 수 있으므로, 기록을 남기지 않는
 * 경로가 항상 존재하게 됩니다. 그래서 기록은 **서버 액션 안**에서 남깁니다.
 *
 * 기록 자체가 실패해도 원래 작업은 막지 않습니다. 감사로그를 못 써서 급여
 * 저장이 실패하면 담당자는 이유를 알 수 없고, 그 상황에서 할 수 있는 일도
 * 없습니다. 대신 서버 로그에 남깁니다.
 */
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export type AuditAction =
  | 'read'
  | 'reveal'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'import'
  | 'confirm';

export interface AuditRecord {
  action: AuditAction;
  /** 무엇에 대한 일인가 — 'employee' · 'payroll' · 'attendance' 처럼 */
  targetType: string;
  targetId?: string | null;
  /** 사람이 읽는 대상 이름. 나중에 그 행이 지워져도 무엇이었는지 남습니다. */
  targetLabel: string;
  details?: Record<string, unknown>;
}

export async function recordAudit(entry: AuditRecord): Promise<void> {
  try {
    const session = await getSession();
    await db.insert(schema.auditLogs).values({
      userId: session?.userId ?? 'system',
      userName: session?.name ?? session?.email ?? 'system',
      userRole: session?.role ?? 'system',
      actionType: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      targetLabel: entry.targetLabel,
      details: entry.details ?? null,
      sessionId: session?.userId ?? 'system',
    });
  } catch (err) {
    // 기록 실패가 업무를 막지 않게 합니다.
    console.error('recordAudit failed:', err);
  }
}
