'use client';

import Link from 'next/link';
import { ChevronDown, ClipboardList, Maximize2, Pencil, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusPill, employeeStatusTone } from '@/components/ui/status-pill';
import { avatarColor, initials } from '@/lib/utils/avatar';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ResidentNumberField } from '@/components/employee/resident-number-field';
import { EmployeeAssignmentHistory } from '@/components/employee/employee-assignment-history';
import { EmployeeFilesTab } from '@/components/employee/employee-files-tab';
import EmployeePayrollTab from '@/components/employee/employee-payroll-tab';
import { JOB_CLASS_LABEL, PAY_METHOD_LABEL, type Employee } from '@/types';

export type DetailTab = 'info' | 'assign' | 'history' | 'family' | 'pay' | 'docs';

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'info', label: '기본정보' },
  { id: 'assign', label: '소속 이력' },
  { id: 'history', label: '경력·학력·자격' },
  { id: 'family', label: '가족' },
  { id: 'pay', label: '급여' },
  { id: 'docs', label: '사진·서류' },
];

const fmtWon = (n: number) => `${new Intl.NumberFormat('ko-KR').format(n)}원`;

function yearsSince(date: string): string {
  const years = (Date.now() - Date.parse(date)) / (365.25 * 86_400_000);
  return years < 0 ? '예정' : `${years.toFixed(1)}년`;
}

/**
 * 사원카드 패널 — 워크스페이스 오른쪽 칸.
 *
 * 위에 큰 아바타와 이름·직급·소속·입사·상태(히어로), 그 아래 탭. 편집은
 * 전체 화면 사원카드(/employees/[id])에서 하고, 여기서는 읽고 급여·서류처럼
 * 자주 오가는 것만 바로 다룹니다.
 */
export function EmployeeDetailPanel({
  employee,
  tab,
  onTabChange,
}: {
  employee: Employee | null;
  tab: DetailTab;
  onTabChange: (t: DetailTab) => void;
}) {
  const EMPLOYEE_STATUS = useCodeMap(CODE.EMPLOYEE_STATUS);
  const EMPLOYMENT_TYPES = useCodeMap(CODE.EMPLOYMENT_TYPES);
  const GENDER_LABELS = useCodeMap(CODE.GENDER_LABELS);
  const DEGREE_LABELS = useCodeMap(CODE.DEGREE_LABELS);
  const session = useAuthStore((s) => s.session);
  const assignments = useEmployeeStore((s) => s.assignments);
  const careerHistories = useEmployeeStore((s) => s.careerHistories);
  const educationHistories = useEmployeeStore((s) => s.educationHistories);
  const certifications = useEmployeeStore((s) => s.certifications);
  const familyMembers = useEmployeeStore((s) => s.familyMembers);
  const workplaces = useSettingsStore((s) => s.workplaces);

  if (!employee) {
    return (
      <section className="flex min-h-[420px] flex-col items-center justify-center bg-card px-8 text-center" aria-label="사원 상세">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-paper font-serif text-[22px] text-ink-300">
          ?
        </div>
        <h2 className="mt-4 font-serif text-[20px] font-medium tracking-[-0.02em] text-ink-900">
          사원을 고르세요
        </h2>
        <p className="mt-1.5 max-w-[320px] text-[12.5px] leading-relaxed text-ink-500">
          왼쪽에서 부서를, 가운데에서 사람을 고르면 여기에 사원카드가 열립니다.
          목록에 초점을 두고 <kbd className="rounded border border-ink-200 px-1 font-mono text-[10.5px]">↑</kbd>{' '}
          <kbd className="rounded border border-ink-200 px-1 font-mono text-[10.5px]">↓</kbd> 로 옮기고{' '}
          <kbd className="rounded border border-ink-200 px-1 font-mono text-[10.5px]">Enter</kbd> 로 전체 화면을
          엽니다.
        </p>
      </section>
    );
  }

  const id = employee.id;
  const color = avatarColor(employee.name);
  const roleText = [employee.position_rank?.name, employee.position_title?.name].filter(Boolean).join(' · ');
  const workplace = workplaces.find((w) => w.id === employee.workplace_id);
  const canReveal = session?.role === 'admin' || session?.role === 'hr_manager';

  const myAssignments = assignments.filter((a) => a.employee_id === id);
  const career = careerHistories
    .filter((c) => c.employee_id === id)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
  const education = educationHistories
    .filter((e) => e.employee_id === id)
    .sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''));
  const certs = certifications
    .filter((c) => c.employee_id === id)
    .sort((a, b) => (b.issue_date ?? '').localeCompare(a.issue_date ?? ''));
  const family = familyMembers.filter((f) => f.employee_id === id);

  const counts: Partial<Record<DetailTab, number>> = {
    assign: myAssignments.length,
    history: career.length + education.length + certs.length,
    family: family.length,
  };

  return (
    <section className="flex min-h-0 flex-col bg-card" aria-label="사원 상세">
      {/* 히어로 */}
      <div
        className="grid grid-cols-[auto_1fr] items-center gap-5 border-b border-ink-150 px-7 pb-5 pt-6 xl:grid-cols-[auto_1fr_auto]"
        style={{
          background:
            'radial-gradient(600px 200px at 12% 0%, rgba(30,58,138,.06), transparent 70%), #ffffff',
        }}
      >
        <div
          className="grid h-[72px] w-[72px] place-items-center rounded-full font-serif text-[28px] font-semibold tracking-[-0.02em] text-white shadow-[0_6px_16px_-6px_rgba(20,18,16,.24),inset_0_0_0_1px_rgba(255,255,255,.15)]"
          style={{ background: color }}
        >
          {employee.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={employee.profile_image_url}
              alt={`${employee.name} 사진`}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials(employee.name)
          )}
        </div>
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-baseline gap-2.5 font-serif text-[28px] font-medium tracking-[-0.025em] text-ink-900">
            {employee.name}
            {employee.name_en && (
              <span className="font-sans text-[13px] font-normal text-ink-400">{employee.name_en}</span>
            )}
            {roleText && (
              <span className="rounded bg-ink-100 px-2 py-[3px] font-sans text-[13px] font-medium text-ink-500">
                {roleText}
              </span>
            )}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[12.5px] text-ink-500">
            <span>
              <b className="font-mono font-medium text-ink-800">{employee.employee_number}</b> 사번
            </span>
            <span className="text-ink-200">·</span>
            <span>{employee.department?.name ?? '부서 미배정'}</span>
            <span className="text-ink-200">·</span>
            <span>
              입사 <b className="font-mono font-medium text-ink-800">{employee.hire_date}</b>{' '}
              <span className="text-ink-400">({yearsSince(employee.hire_date)})</span>
            </span>
            <span className="text-ink-200">·</span>
            <StatusPill tone={employeeStatusTone(employee.status)}>
              {EMPLOYEE_STATUS[employee.status as keyof typeof EMPLOYEE_STATUS] ?? employee.status}
            </StatusPill>
            <span className="rounded-full border border-ink-150 bg-card px-2 py-[2px] text-[11px] text-ink-700">
              {JOB_CLASS_LABEL[employee.job_class] ?? employee.job_class}
            </span>
            <span className="rounded-full border border-ink-150 bg-card px-2 py-[2px] text-[11px] text-ink-700">
              {EMPLOYMENT_TYPES[employee.employment_type as keyof typeof EMPLOYMENT_TYPES] ?? employee.employment_type}
            </span>
          </div>
        </div>
        <div className="col-span-2 flex flex-wrap items-center gap-2 xl:col-span-1">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/employees/${id}/record-card`}>
              <ClipboardList className="h-3.5 w-3.5" />
              인사기록카드
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileText className="h-3.5 w-3.5" />
                증명서
                <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/employees/${id}/certificates/employment`}>재직증명서</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/employees/${id}/certificates/career`}>경력증명서</Link>
              </DropdownMenuItem>
              {employee.status === 'resigned' && (
                <DropdownMenuItem asChild>
                  <Link href={`/employees/${id}/certificates/retirement`}>퇴직증명서</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" asChild>
            <Link href={`/employees/${id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              수정
            </Link>
          </Button>
          <Link
            href={`/employees/${id}`}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            title="전체 화면으로 열기"
            aria-label="전체 화면으로 열기"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 overflow-x-auto border-b border-ink-150 px-7" role="tablist">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(t.id)}
              className={cn(
                '-mb-px whitespace-nowrap border-b-2 px-3.5 py-3 text-[13px] font-medium transition-colors',
                active ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-800',
              )}
            >
              {t.label}
              {counts[t.id] !== undefined && (
                <span className={cn('ml-1 font-mono text-[10.5px]', active ? 'text-ink-700' : 'text-ink-400')}>
                  {counts[t.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-7 pb-9 pt-6" role="tabpanel">
        {tab === 'info' && (
          <>
            <SectionTitle title="기본정보" href={`/employees/${id}/edit`} linkLabel="수정" />
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-ink-150 bg-ink-150 md:grid-cols-4">
              <Field k="사원번호" v={employee.employee_number} mono />
              <Field k="이메일" v={employee.email ?? '—'} />
              <Field k="휴대폰" v={employee.phone ?? '—'} mono />
              <Field
                k="생년월일"
                v={employee.birth_date ?? '—'}
                sub={employee.gender ? GENDER_LABELS[employee.gender as keyof typeof GENDER_LABELS] : undefined}
                mono
              />
              <div className="bg-card px-4 py-3 [&_p:first-child]:mb-1 [&_p:first-child]:text-[11px] [&_p:first-child]:tracking-[0.04em] [&_p:first-child]:text-ink-500">
                <ResidentNumberField employeeId={id} masked={employee.resident_number} canReveal={canReveal} />
              </div>
              <Field
                k="주소"
                v={employee.address ? `${employee.address} ${employee.address_detail ?? ''}`.trim() : '—'}
                sub={employee.zip_code ?? undefined}
                className="md:col-span-3"
              />
              <Field k="직군" v={JOB_CLASS_LABEL[employee.job_class] ?? employee.job_class} />
              <Field
                k="고용형태"
                v={EMPLOYMENT_TYPES[employee.employment_type as keyof typeof EMPLOYMENT_TYPES] ?? employee.employment_type}
              />
              <Field k="급여방식" v={PAY_METHOD_LABEL[employee.pay_method] ?? employee.pay_method} />
              <Field k="사업장" v={workplace?.name ?? '—'} />
              <Field k="은행" v={employee.bank_name ?? '—'} sub={employee.bank_account ?? undefined} />
              <Field
                k="비상연락처"
                v={
                  employee.emergency_contact_name
                    ? `${employee.emergency_contact_name}${employee.emergency_contact_relation ? ` (${employee.emergency_contact_relation})` : ''}`
                    : '—'
                }
                sub={employee.emergency_contact_phone ?? undefined}
              />
              <Field k="개인 이메일" v={employee.personal_email ?? '—'} />
              <Field k="퇴사일" v={employee.resignation_date ?? '—'} mono />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-ink-150 bg-ink-150">
              <Meta k="근속" v={yearsSince(employee.hire_date)} />
              <Meta
                k={employee.pay_method === 'hourly' ? '시급' : employee.pay_method === 'daily' ? '일급' : '기본급'}
                v={fmtWon(
                  employee.pay_method === 'hourly' || employee.pay_method === 'daily'
                    ? employee.hourly_wage
                    : employee.base_salary,
                )}
              />
              <Meta k="소속 이력" v={`${myAssignments.length}건`} />
            </div>
          </>
        )}

        {tab === 'assign' && <EmployeeAssignmentHistory employeeId={id} />}

        {tab === 'history' && (
          <div className="space-y-7">
            <div>
              <SectionTitle title={`경력 ${career.length}건`} href={`/employees/${id}#career`} linkLabel="편집" />
              <SimpleTable
                head={['회사', '부서 · 직위', '기간']}
                rows={career.map((c) => [
                  c.company_name,
                  [c.department, c.position].filter(Boolean).join(' · ') || '—',
                  `${c.start_date} ~ ${c.end_date ?? '현재'}`,
                ])}
                empty="경력이 없습니다."
              />
            </div>
            <div>
              <SectionTitle title={`학력 ${education.length}건`} href={`/employees/${id}#education`} linkLabel="편집" />
              <SimpleTable
                head={['학교', '전공 · 학위', '기간']}
                rows={education.map((e) => [
                  e.school_name,
                  [e.major, e.degree ? (DEGREE_LABELS[e.degree as keyof typeof DEGREE_LABELS] ?? e.degree) : null]
                    .filter(Boolean)
                    .join(' · ') || '—',
                  `${e.start_date ?? '—'} ~ ${e.end_date ?? (e.is_graduated ? '' : '재학')}`,
                ])}
                empty="학력이 없습니다."
              />
            </div>
            <div>
              <SectionTitle title={`자격증 ${certs.length}건`} href={`/employees/${id}#certification`} linkLabel="편집" />
              <SimpleTable
                head={['자격증', '발급기관', '취득일']}
                rows={certs.map((c) => [c.name, c.issuer ?? '—', c.issue_date ?? '—'])}
                empty="자격증이 없습니다."
              />
            </div>
          </div>
        )}

        {tab === 'family' && (
          <div>
            <SectionTitle title={`가족 ${family.length}명`} href={`/employees/${id}#family`} linkLabel="편집" />
            <SimpleTable
              head={['이름', '관계', '생년월일', '동거 · 부양']}
              rows={family.map((f) => [
                f.name,
                f.relation,
                f.birth_date ?? '—',
                [f.is_living_together ? '동거' : null, f.is_dependent ? '부양' : null].filter(Boolean).join(' · ') || '—',
              ])}
              empty="등록된 가족이 없습니다."
            />
          </div>
        )}

        {tab === 'pay' && <EmployeePayrollTab employee={employee} />}

        {tab === 'docs' && <EmployeeFilesTab employeeId={id} />}
      </div>
    </section>
  );
}

function SectionTitle({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h3 className="font-serif text-[17px] font-medium tracking-[-0.015em] text-ink-900">{title}</h3>
      {href && (
        <Link href={href} className="text-[12px] font-medium text-brand hover:underline">
          {linkLabel ?? '더 보기'}
        </Link>
      )}
    </div>
  );
}

function Field({
  k,
  v,
  sub,
  mono,
  className,
}: {
  k: string;
  v: string;
  sub?: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 bg-card px-4 py-3', className)}>
      <div className="mb-1 text-[11px] tracking-[0.04em] text-ink-500">{k}</div>
      <div className={cn('truncate text-[13.5px] font-medium text-ink-900', mono && 'font-mono')} title={v}>
        {v}
      </div>
      {sub && <div className="mt-0.5 text-[11.5px] text-ink-500">{sub}</div>}
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-card px-3 py-2.5">
      <div className="text-[10.5px] uppercase tracking-[0.06em] text-ink-500">{k}</div>
      <div className="mt-0.5 font-serif text-[18px] font-medium tracking-[-0.02em] text-ink-900">{v}</div>
    </div>
  );
}

function SimpleTable({ head, rows, empty }: { head: string[]; rows: string[][]; empty: string }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-ink-200 bg-paper-2 px-3 py-6 text-center text-[12px] text-ink-500">
        {empty}
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-[10px] border border-ink-150">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="bg-paper text-left text-[10.5px] uppercase tracking-[0.08em] text-ink-400">
            {head.map((h) => (
              <th key={h} className="px-3.5 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-ink-150">
              {r.map((c, j) => (
                <td key={j} className={cn('px-3.5 py-2.5 align-top', j === 0 ? 'font-medium text-ink-900' : 'text-ink-700')}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
