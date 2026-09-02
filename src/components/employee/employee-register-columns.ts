import type { GridColumn, GridOption } from '@/components/grid/types';
import { JOB_CLASS_LABEL, PAY_METHOD_LABEL, type Employee } from '@/types';

/**
 * 인력대장 열 정의와 프리셋.
 *
 * 한 벌의 정의가 화면·정렬·필터·편집·붙여넣기·엑셀 출력을 모두 담당합니다.
 * 프리셋은 "무엇을 보고 싶은가"만 고르는 장치라, 담당자가 열을 하나씩
 * 켜고 끄지 않아도 자료 요청 목적에 맞는 대장이 바로 나옵니다.
 */

export const EMPLOYMENT_TYPE_OPTIONS: GridOption[] = [
  { value: 'regular', label: '정규직' },
  { value: 'contract', label: '계약직' },
  { value: 'parttime', label: '단시간' },
  { value: 'intern', label: '인턴' },
];

export const STATUS_OPTIONS: GridOption[] = [
  { value: 'active', label: '재직' },
  { value: 'on_leave', label: '휴직' },
  { value: 'resigned', label: '퇴직' },
  { value: 'retired', label: '정년퇴직' },
];

export const JOB_CLASS_OPTIONS: GridOption[] = Object.entries(JOB_CLASS_LABEL).map(
  ([value, label]) => ({ value, label }),
);

export const PAY_METHOD_OPTIONS: GridOption[] = Object.entries(PAY_METHOD_LABEL).map(
  ([value, label]) => ({ value, label }),
);

export const GENDER_OPTIONS: GridOption[] = [
  { value: 'M', label: '남' },
  { value: 'F', label: '여' },
];

/** 열 구성 프리셋 — 이름과, 그 프리셋에서 보여줄 열 id 목록. */
export interface RegisterPreset {
  id: string;
  name: string;
  hint: string;
  columns: string[];
}

const BASE = ['employee_number', 'name', 'department', 'job_class', 'rank', 'title', 'employment_type', 'hire_date', 'service', 'status'];

export const REGISTER_PRESETS: RegisterPreset[] = [
  { id: 'basic', name: '기본', hint: '일상 조회', columns: BASE },
  {
    id: 'contact',
    name: '연락처',
    hint: '비상연락망',
    columns: ['employee_number', 'name', 'department', 'phone', 'email', 'address', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation'],
  },
  {
    id: 'payroll',
    name: '급여',
    hint: '급여 마스터 점검',
    columns: ['employee_number', 'name', 'department', 'job_class', 'pay_method', 'base_salary', 'hourly_wage', 'bank_name', 'bank_account'],
  },
  {
    id: 'contract',
    name: '계약·수습',
    hint: '만료 관리',
    columns: ['employee_number', 'name', 'department', 'employment_type', 'hire_date', 'arrangement_start_date', 'arrangement_end_date', 'status'],
  },
  {
    id: 'turnover',
    name: '입퇴사',
    hint: '이직 현황',
    columns: ['employee_number', 'name', 'department', 'hire_date', 'service', 'resignation_date', 'status'],
  },
  {
    id: 'field',
    name: '현장직',
    hint: '시급 · 근태 연동 확인',
    columns: ['employee_number', 'name', 'department', 'job_class', 'pay_method', 'hourly_wage', 'hire_date', 'status'],
  },
  {
    id: 'roster',
    name: '노동자명부',
    hint: '근로기준법 제41조 서식',
    columns: ['name', 'gender', 'birth_date', 'address', 'department', 'title', 'hire_date', 'employment_type', 'resignation_date', 'status'],
  },
];

interface ColumnDeps {
  departmentName: (id: string | null) => string;
  rankName: (id: string | null) => string;
  titleName: (id: string | null) => string;
  departmentOptions: GridOption[];
  rankOptions: GridOption[];
  titleOptions: GridOption[];
}

/** 근속연수 — 입사일 기준, 퇴직자는 퇴직일까지. */
export function serviceYears(employee: Employee): number {
  const from = new Date(employee.hire_date);
  const to = employee.resignation_date ? new Date(employee.resignation_date) : new Date();
  if (Number.isNaN(from.getTime())) return 0;
  return Math.max(0, Math.round(((to.getTime() - from.getTime()) / 31_557_600_000) * 10) / 10);
}

const text = (input: string) => ({ ok: true as const, value: input === '' ? null : input });

const date = (input: string) => {
  if (input === '') return { ok: true as const, value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return { ok: false as const, error: '날짜는 YYYY-MM-DD 형식으로 입력하세요.' };
  }
  if (Number.isNaN(Date.parse(input))) {
    return { ok: false as const, error: '실제로 존재하지 않는 날짜입니다.' };
  }
  return { ok: true as const, value: input };
};

const money = (input: string) => {
  if (input === '') return { ok: true as const, value: 0 };
  const n = Number(input.replace(/[,\s원]/g, ''));
  if (!Number.isFinite(n)) return { ok: false as const, error: '숫자만 입력하세요.' };
  if (n < 0) return { ok: false as const, error: '금액은 0 이상이어야 합니다.' };
  return { ok: true as const, value: Math.round(n) };
};

/** 라벨로도, 코드로도 받아 주는 코드 필드 파서 (엑셀 붙여넣기 대응). */
function codeParser(options: GridOption[], label: string) {
  return (input: string) => {
    if (input === '') return { ok: true as const, value: null };
    const hit =
      options.find((o) => o.value === input) ?? options.find((o) => o.label === input);
    if (!hit) {
      return {
        ok: false as const,
        error: `${label} 값이 목록에 없습니다 (${options.map((o) => o.label).join(', ')}).`,
      };
    }
    return { ok: true as const, value: hit.value };
  };
}

export function buildRegisterColumns(deps: ColumnDeps): GridColumn<Employee>[] {
  return [
    {
      id: 'employee_number',
      header: '사번',
      width: 96,
      pinned: true,
      filter: 'text',
      value: (e) => e.employee_number,
    },
    {
      id: 'name',
      header: '성명',
      width: 96,
      pinned: true,
      filter: 'text',
      value: (e) => e.name,
      edit: { field: 'name', parse: (input) => (input ? { ok: true, value: input } : { ok: false, error: '성명은 비울 수 없습니다.' }) },
    },
    {
      id: 'department',
      header: '부서',
      width: 130,
      filter: 'select',
      options: deps.departmentOptions,
      value: (e) => deps.departmentName(e.department_id),
      edit: {
        field: 'department_id',
        control: 'select',
        parse: codeParser(deps.departmentOptions, '부서'),
      },
    },
    {
      id: 'rank',
      header: '직급',
      width: 92,
      filter: 'select',
      options: deps.rankOptions,
      value: (e) => deps.rankName(e.position_rank_id),
      edit: { field: 'position_rank_id', control: 'select', parse: codeParser(deps.rankOptions, '직급') },
    },
    {
      id: 'title',
      header: '직책',
      width: 92,
      filter: 'select',
      options: deps.titleOptions,
      value: (e) => deps.titleName(e.position_title_id),
      edit: { field: 'position_title_id', control: 'select', parse: codeParser(deps.titleOptions, '직책') },
    },
    {
      id: 'job_class',
      header: '직군',
      width: 80,
      filter: 'select',
      options: JOB_CLASS_OPTIONS,
      value: (e) => labelOf(JOB_CLASS_OPTIONS, e.job_class),
      edit: { field: 'job_class', control: 'select', parse: codeParser(JOB_CLASS_OPTIONS, '직군') },
    },
    {
      id: 'pay_method',
      header: '급여방식',
      width: 88,
      hidden: true,
      filter: 'select',
      options: PAY_METHOD_OPTIONS,
      value: (e) => labelOf(PAY_METHOD_OPTIONS, e.pay_method),
      edit: { field: 'pay_method', control: 'select', parse: codeParser(PAY_METHOD_OPTIONS, '급여방식') },
    },
    {
      id: 'employment_type',
      header: '고용형태',
      width: 92,
      filter: 'select',
      options: EMPLOYMENT_TYPE_OPTIONS,
      value: (e) => labelOf(EMPLOYMENT_TYPE_OPTIONS, e.employment_type),
      edit: {
        field: 'employment_type',
        control: 'select',
        parse: codeParser(EMPLOYMENT_TYPE_OPTIONS, '고용형태'),
      },
    },
    {
      id: 'hire_date',
      header: '입사일',
      width: 108,
      type: 'date',
      align: 'center',
      filter: 'text',
      value: (e) => e.hire_date,
      edit: { field: 'hire_date', control: 'date', parse: (input) => (input ? date(input) : { ok: false, error: '입사일은 비울 수 없습니다.' }) },
    },
    {
      id: 'service',
      header: '근속(년)',
      width: 78,
      type: 'number',
      value: (e) => serviceYears(e),
    },
    {
      id: 'status',
      header: '상태',
      width: 80,
      filter: 'select',
      options: STATUS_OPTIONS,
      value: (e) => labelOf(STATUS_OPTIONS, e.status),
      edit: { field: 'status', control: 'select', parse: codeParser(STATUS_OPTIONS, '상태') },
    },
    {
      id: 'resignation_date',
      header: '퇴사일',
      width: 108,
      type: 'date',
      align: 'center',
      hidden: true,
      value: (e) => e.resignation_date,
      edit: { field: 'resignation_date', control: 'date', parse: date },
    },

    // ── 연락처 ──
    // 근태기록에는 사원번호가 없고 휴대폰 번호로 직원을 찾습니다. 비면 그 사람의
    // 근태가 들어오지 않으므로 기본으로 보이게 두고, 비어 있으면 눈에 띄게 합니다.
    { id: 'phone', header: '휴대폰 번호', width: 128, filter: 'text', value: (e) => e.phone ?? '미등록', edit: { field: 'phone', parse: text } },
    { id: 'email', header: '회사 이메일', width: 210, hidden: true, filter: 'text', value: (e) => e.email },
    { id: 'address', header: '주소', width: 240, hidden: true, filter: 'text', value: (e) => e.address, edit: { field: 'address', parse: text } },
    { id: 'emergency_contact_name', header: '비상연락자', width: 100, hidden: true, value: (e) => e.emergency_contact_name, edit: { field: 'emergency_contact_name', parse: text } },
    { id: 'emergency_contact_phone', header: '비상연락처', width: 122, hidden: true, value: (e) => e.emergency_contact_phone, edit: { field: 'emergency_contact_phone', parse: text } },
    { id: 'emergency_contact_relation', header: '관계', width: 72, hidden: true, value: (e) => e.emergency_contact_relation, edit: { field: 'emergency_contact_relation', parse: text } },

    // ── 인적사항 ──
    {
      id: 'gender',
      header: '성별',
      width: 60,
      align: 'center',
      hidden: true,
      filter: 'select',
      options: GENDER_OPTIONS,
      value: (e) => labelOf(GENDER_OPTIONS, e.gender),
      edit: { field: 'gender', control: 'select', parse: codeParser(GENDER_OPTIONS, '성별') },
    },
    { id: 'birth_date', header: '생년월일', width: 108, type: 'date', align: 'center', hidden: true, value: (e) => e.birth_date, edit: { field: 'birth_date', control: 'date', parse: date } },

    // ── 급여 ──
    { id: 'base_salary', header: '기본급(월)', width: 116, type: 'money', total: 'sum', hidden: true, value: (e) => e.base_salary, edit: { field: 'base_salary', control: 'number', parse: money } },
    { id: 'hourly_wage', header: '시급·일급', width: 106, type: 'money', hidden: true, value: (e) => e.hourly_wage, edit: { field: 'hourly_wage', control: 'number', parse: money } },
    { id: 'bank_name', header: '은행', width: 90, hidden: true, value: (e) => e.bank_name, edit: { field: 'bank_name', parse: text } },
    { id: 'bank_account', header: '계좌번호', width: 150, hidden: true, value: (e) => e.bank_account, edit: { field: 'bank_account', parse: text } },

    // ── 근로형태 ──
    { id: 'arrangement_start_date', header: '계약 시작일', width: 108, type: 'date', align: 'center', hidden: true, value: (e) => e.arrangement_start_date, edit: { field: 'arrangement_start_date', control: 'date', parse: date } },
    { id: 'arrangement_end_date', header: '계약 종료일', width: 108, type: 'date', align: 'center', hidden: true, value: (e) => e.arrangement_end_date, edit: { field: 'arrangement_end_date', control: 'date', parse: date } },
  ];
}

function labelOf(options: GridOption[], value: string | null | undefined): string {
  if (!value) return '';
  return options.find((o) => o.value === value)?.label ?? value;
}
