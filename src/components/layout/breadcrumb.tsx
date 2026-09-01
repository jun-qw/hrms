'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const pathLabels: Record<string, string> = {
  organization: '조직도',
  departments: '부서',
  employees: '인사정보',
  new: '등록',
  edit: '수정',
  attendance: '근태관리',
  monthly: '월별현황',
  leave: '휴가관리',
  admin: '관리',
  payroll: '급여관리',
  calculate: '급여계산',
  payslip: '급여명세서',
  appointments: '인사발령',
  approval: '전자결재',
  contracts: '전자계약',
  recruitment: '채용관리',
  training: '교육관리',
  evaluation: '평가관리',
  'audit-log': '감사로그',
  insurance: '4대보험',
  'year-end-tax': '연말정산',
  severance: '퇴직금',
  settings: '설정',
  my: '마이페이지',
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link href="/" className="hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/');
        const label = pathLabels[segment] || segment;
        const isLast = index === segments.length - 1;

        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
