'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEmployeeStore } from '@/lib/stores/employee-store';

const pathLabels: Record<string, string> = {
  organization: '조직도',
  departments: '부서',
  employees: '인력대장',
  roster: '노동자명부',
  pipeline: '입퇴사 진행',
  retirement: '퇴직 관리',
  'workplace-assignment': '사업장 배정',
  'record-card': '인사기록카드',
  certificates: '증명서',
  employment: '재직증명서',
  career: '경력증명서',
  new: '등록',
  edit: '수정',
  attendance: '근태·휴가',
  register: '대장',
  import: '근태 일괄등록',
  monthly: '월별현황',
  leave: '휴가',
  admin: '마감',
  payroll: '급여',
  salaries: '급여 기준',
  calculate: '급여계산',
  dashboard: '급여대장',
  payslip: '급여명세서',
  appointments: '인사발령',
  approval: '전자결재',
  contracts: '전자계약',
  'audit-log': '감사로그',
  insurance: '4대보험',
  'year-end-tax': '연말정산',
  severance: '퇴직금',
  settings: '설정',
  'data-import': '데이터 가져오기',
  my: '마이페이지',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 경로 표시.
 *
 * 12px 먹색 글씨에 빗금 구분 — 디자인 시안의 crumbs. 사원 id 같은 식별자
 * 구간은 저장소에서 이름을 찾아 보여 줍니다. 주소창의 uuid를 그대로 찍으면
 * 사람이 읽을 수 없습니다.
 */
export function Breadcrumb() {
  const pathname = usePathname();
  const employees = useEmployeeStore((s) => s.employees);
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const labelOf = (segment: string, index: number) => {
    if (pathLabels[segment]) return pathLabels[segment];
    if (UUID.test(segment) && segments[index - 1] === 'employees') {
      return employees.find((e) => e.id === segment)?.name ?? '사원';
    }
    return segment;
  };

  return (
    <nav className="mb-2 flex flex-wrap items-center text-[12px] tracking-[0.02em] text-ink-500">
      <Link href="/" className="transition-colors hover:text-ink-900">
        홈
      </Link>
      {segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/');
        const label = labelOf(segment, index);
        const isLast = index === segments.length - 1;

        return (
          <span key={href} className="flex items-center">
            <span className="px-1.5 text-ink-300">/</span>
            {isLast ? (
              <span className="text-ink-800">{label}</span>
            ) : (
              <Link href={href} className="transition-colors hover:text-ink-900">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
