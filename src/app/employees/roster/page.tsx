'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { PrintLogo } from '@/components/shared/print-logo';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import type { Employee } from '@/types';

/**
 * 노동자명부 (근로기준법 제41조 · 시행령 제20조).
 *
 * 화면용 인력대장과 서식을 분리한 이유는 목적이 다르기 때문입니다. 대장은 담당자가
 * 보고 고치는 작업대이고, 이 화면은 근로감독·노무 실사에 그대로 제출하는 종이입니다.
 * 그래서 열이 법에서 정한 기재사항으로 고정되어 있고, 사용자가 열을 바꿀 수 없습니다.
 *
 * 기재사항: 성명 · 성별 · 생년월일 · 주소 · 이력 · 종사하는 업무 · 고용 연월일 ·
 * 계약기간 · 그 밖의 고용에 관한 사항 · 해고/퇴직 연월일과 그 사유
 */

const STATUS_LABEL: Record<string, string> = {
  active: '재직',
  on_leave: '휴직',
  resigned: '퇴직',
  retired: '정년퇴직',
};

const EMPLOYMENT_LABEL: Record<string, string> = {
  regular: '정규직',
  contract: '계약직',
  parttime: '단시간',
  intern: '인턴',
};

type Scope = 'current' | 'all';

export default function WorkerRosterPage() {
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionTitles = useEmployeeStore((s) => s.positionTitles);
  const company = useSettingsStore((s) => s.company);

  const [scope, setScope] = useState<Scope>('current');

  const rows = useMemo(() => {
    const list =
      scope === 'current'
        ? employees.filter((e) => e.status === 'active' || e.status === 'on_leave')
        : employees;
    return [...list].sort((a, b) => a.employee_number.localeCompare(b.employee_number));
  }, [employees, scope]);

  const nameOf = <T extends { id: string; name: string }>(list: T[], id: string | null) =>
    id ? (list.find((x) => x.id === id)?.name ?? '') : '';

  // 종사하는 업무 — 직원 레코드에 직무 항목이 아직 없어 부서·직책으로 갈음합니다.
  // 직무를 인사정보에 붙이면 여기부터 바뀌어야 합니다.
  const dutyOf = (e: Employee) =>
    [nameOf(departments, e.department_id), nameOf(positionTitles, e.position_title_id)]
      .filter(Boolean)
      .join(' · ');

  const printedOn = new Date().toLocaleDateString('ko-KR');

  return (
    <div>
      <div className="no-print">
        <Breadcrumb />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">노동자명부</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              근로기준법 제41조에 따른 법정 서식입니다. 기재사항이 고정되어 있어 열을 바꿀 수
              없습니다. 3년간 보존해야 합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border text-sm">
              <button
                type="button"
                className={`px-3 py-1.5 ${scope === 'current' ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setScope('current')}
              >
                재직·휴직
              </button>
              <button
                type="button"
                className={`border-l px-3 py-1.5 ${scope === 'all' ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setScope('all')}
              >
                퇴직자 포함
              </button>
            </div>
            <Link href="/employees">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                인력대장
              </Button>
            </Link>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              인쇄
            </Button>
          </div>
        </div>
      </div>

      <div className="print-area rounded-md border bg-white p-8">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">노 동 자 명 부</h2>
            <p className="mt-1 text-xs text-gray-600">
              {company.name}
              {company.business_number && ` · 사업자등록번호 ${company.business_number}`}
            </p>
            <p className="text-xs text-gray-600">
              작성일 {printedOn} · {scope === 'current' ? '재직·휴직자' : '퇴직자 포함 전체'}{' '}
              {rows.length}명
            </p>
          </div>
          <PrintLogo />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-gray-100">
                {[
                  '연번',
                  '성명',
                  '성별',
                  '생년월일',
                  '주소',
                  '종사하는 업무',
                  '고용 연월일',
                  '고용형태',
                  '계약기간',
                  '퇴직 연월일',
                  '퇴직 사유',
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap border border-gray-400 px-2 py-1.5 font-semibold text-gray-800"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="border border-gray-400 px-2 py-8 text-center text-gray-500">
                    해당하는 인원이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((e, i) => (
                  <tr key={e.id}>
                    <td className="border border-gray-400 px-2 py-1 text-center tabular-nums">{i + 1}</td>
                    <td className="whitespace-nowrap border border-gray-400 px-2 py-1 font-medium">{e.name}</td>
                    <td className="border border-gray-400 px-2 py-1 text-center">
                      {e.gender === 'M' ? '남' : e.gender === 'F' ? '여' : ''}
                    </td>
                    <td className="whitespace-nowrap border border-gray-400 px-2 py-1 text-center tabular-nums">
                      {e.birth_date ?? ''}
                    </td>
                    <td className="border border-gray-400 px-2 py-1">
                      {[e.address, e.address_detail].filter(Boolean).join(' ')}
                    </td>
                    <td className="border border-gray-400 px-2 py-1">{dutyOf(e)}</td>
                    <td className="whitespace-nowrap border border-gray-400 px-2 py-1 text-center tabular-nums">
                      {e.hire_date}
                    </td>
                    <td className="whitespace-nowrap border border-gray-400 px-2 py-1 text-center">
                      {EMPLOYMENT_LABEL[e.employment_type] ?? e.employment_type}
                    </td>
                    <td className="whitespace-nowrap border border-gray-400 px-2 py-1 text-center tabular-nums">
                      {e.arrangement_start_date && e.arrangement_end_date
                        ? `${e.arrangement_start_date} ~ ${e.arrangement_end_date}`
                        : e.employment_type === 'regular'
                          ? '기간의 정함 없음'
                          : ''}
                    </td>
                    <td className="whitespace-nowrap border border-gray-400 px-2 py-1 text-center tabular-nums">
                      {e.resignation_date ?? ''}
                    </td>
                    <td className="border border-gray-400 px-2 py-1">
                      {e.resignation_date ? (STATUS_LABEL[e.status] ?? '') : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[10px] leading-relaxed text-gray-500">
          근로기준법 제41조(근로자의 명부) 및 같은 법 시행령 제20조에 따라 작성합니다.
          같은 법 제42조에 따라 근로자 명부와 계약에 관한 서류는 3년간 보존해야 합니다.
        </p>
      </div>
    </div>
  );
}
