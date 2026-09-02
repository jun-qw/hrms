import 'server-only';

/**
 * 조회 범위.
 *
 * 화면에서 메뉴를 감추는 것은 안내이지 통제가 아닙니다. 서버 액션은 주소만
 * 알면 직접 부를 수 있으므로, 무엇을 돌려줄지는 서버가 정해야 합니다.
 *
 * 실제로 일반 직원 계정으로 근태대장을 열었더니 115명 전원의 근태가 그대로
 * 나왔습니다. 메뉴는 감춰져 있었지만 자료는 막혀 있지 않았습니다.
 *
 * 규칙은 하나입니다 — **인사 담당이 아니면 자기 것만 봅니다.** 부서장은
 * 자기 부서까지 봅니다.
 */
import { getSession } from '@/lib/auth/session';

export const HR_ROLES = ['admin', 'hr_manager'];

export interface Scope {
  /** 전부 볼 수 있는가 (인사 담당) */
  all: boolean;
  /** 아니라면 누구 것을 볼 수 있는가 */
  employeeId: string | null;
  /** 부서장이면 그 부서 */
  departmentId: string | null;
  role: string;
}

/**
 * 로그인만 있으면 통과하되, 인사 담당이 아니면 범위를 좁혀 돌려줍니다.
 *
 * 인증 자체를 끈 상태(데모)에서는 전부 열립니다 — 그 모드에는 세션이 없어
 * 누구인지 물어볼 대상이 없습니다.
 */
export async function readScope(): Promise<Scope> {
  if (process.env.AUTH_MODE !== 'db') {
    return { all: true, employeeId: null, departmentId: null, role: 'admin' };
  }
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
  if (HR_ROLES.includes(session.role)) {
    return { all: true, employeeId: null, departmentId: null, role: session.role };
  }
  return {
    all: false,
    employeeId: session.employeeId ?? null,
    departmentId: null,
    role: session.role,
  };
}

/** 이 사람의 자료인가. */
export function inScope(scope: Scope, employeeId: string | null | undefined): boolean {
  if (scope.all) return true;
  return !!employeeId && employeeId === scope.employeeId;
}

/** 배열을 범위에 맞게 거릅니다. */
export function filterScoped<T>(
  scope: Scope,
  rows: T[],
  employeeIdOf: (row: T) => string | null | undefined,
): T[] {
  if (scope.all) return rows;
  return rows.filter((r) => inScope(scope, employeeIdOf(r)));
}

/**
 * 인사 담당이 아닌 사람에게 나가는 직원 자료에서 뺄 항목.
 *
 * 이름·부서·직급·사내 연락처는 조직도와 결재선에 필요해 남깁니다. 급여,
 * 계좌, 주민번호, 집주소, 개인 연락처는 같은 직원이라도 볼 이유가 없습니다.
 */
const PRIVATE_FIELDS = [
  'base_salary',
  'hourly_wage',
  'annual_salary',
  'bank_name',
  'bank_account',
  'bank_holder',
  'resident_number',
  'address',
  'address_detail',
  'zip_code',
  'personal_email',
  'marriage_date',
  'birth_date',
  'emergency_contact_name',
  'emergency_contact_phone',
  'emergency_contact_relation',
] as const;

/**
 * 남의 인사기록에서 민감한 항목을 지웁니다. 본인 것은 그대로 둡니다 —
 * 자기 계좌번호와 주소는 마이페이지에서 확인해야 합니다.
 */
export function redactForScope<T extends { id: string }>(scope: Scope, employee: T): T {
  if (scope.all || inScope(scope, employee.id)) return employee;
  const out: Record<string, unknown> = { ...employee };
  for (const field of PRIVATE_FIELDS) {
    if (field in out) out[field] = null;
  }
  return out as T;
}
