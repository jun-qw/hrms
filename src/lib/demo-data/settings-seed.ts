// Default configuration collections for a fresh installation.
// Written to the database by scripts/seed.ts — the runtime settings store
// reads them from the DB, never from here.
import type {
  WorkSchedule,
  Holiday,
  ApprovalTemplate,
  CondolenceLeaveRule,
  Workplace,
  AttendanceTypeConfig,
} from '@/types';

export const defaultWorkSchedules: WorkSchedule[] = [
  {
    id: 'ws-1',
    name: '기본 고정근무 (07:00~16:00)',
    type: 'fixed',
    start_time: '07:00',
    end_time: '16:00',
    core_start_time: null,
    core_end_time: null,
    break_minutes: 60,
    weekly_hours: 40,
    is_default: true,
    is_active: true,
    effective_from: null,
    effective_to: null,
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ws-2',
    name: '유연근무제 (06:00~08:00 출근)',
    type: 'staggered',
    start_time: '07:00',
    end_time: '16:00',
    core_start_time: '08:00',
    core_end_time: '15:00',
    break_minutes: 60,
    weekly_hours: 40,
    is_default: false,
    is_active: true,
    effective_from: null,
    effective_to: null,
    settings: { earliest_start: '06:00', latest_start: '08:00', earliest_end: '15:00', latest_end: '17:00' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ws-3',
    name: '선택적 근로시간제',
    type: 'selective',
    start_time: '07:00',
    end_time: '16:00',
    core_start_time: '09:00',
    core_end_time: '15:00',
    break_minutes: 60,
    weekly_hours: 40,
    is_default: false,
    is_active: true,
    effective_from: null,
    effective_to: null,
    settings: { settlement_period: '1month' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const defaultCondolenceRules: CondolenceLeaveRule[] = [
  { id: 'cl-1', event_name: '본인 결혼', days: 5, is_paid: true, is_active: true, created_at: '', updated_at: '' },
  { id: 'cl-2', event_name: '자녀 결혼', days: 1, is_paid: true, is_active: true, created_at: '', updated_at: '' },
  { id: 'cl-3', event_name: '부모 사망', days: 5, is_paid: true, is_active: true, created_at: '', updated_at: '' },
  { id: 'cl-4', event_name: '배우자 사망', days: 5, is_paid: true, is_active: true, created_at: '', updated_at: '' },
  { id: 'cl-5', event_name: '자녀 사망', days: 5, is_paid: true, is_active: true, created_at: '', updated_at: '' },
  { id: 'cl-6', event_name: '배우자 부모 사망', days: 3, is_paid: true, is_active: true, created_at: '', updated_at: '' },
  { id: 'cl-7', event_name: '조부모 사망', days: 3, is_paid: true, is_active: true, created_at: '', updated_at: '' },
  { id: 'cl-8', event_name: '형제자매 사망', days: 3, is_paid: true, is_active: true, created_at: '', updated_at: '' },
  { id: 'cl-9', event_name: '배우자 조부모 사망', days: 1, is_paid: true, is_active: true, created_at: '', updated_at: '' },
  { id: 'cl-10', event_name: '배우자 형제자매 사망', days: 1, is_paid: true, is_active: true, created_at: '', updated_at: '' },
];

export const defaultHolidays: Holiday[] = [
  { id: 'h-1', date: '2026-01-01', name: '신정', type: 'legal', is_active: true, created_at: '' },
  { id: 'h-2', date: '2026-02-16', name: '설날 전날', type: 'legal', is_active: true, created_at: '' },
  { id: 'h-3', date: '2026-02-17', name: '설날', type: 'legal', is_active: true, created_at: '' },
  { id: 'h-4', date: '2026-02-18', name: '설날 다음날', type: 'legal', is_active: true, created_at: '' },
  { id: 'h-5', date: '2026-03-01', name: '삼일절', type: 'legal', is_active: true, created_at: '' },
  { id: 'h-6', date: '2026-05-05', name: '어린이날', type: 'legal', is_active: true, created_at: '' },
  { id: 'h-7', date: '2026-05-24', name: '부처님오신날', type: 'legal', is_active: true, created_at: '' },
  { id: 'h-8', date: '2026-06-06', name: '현충일', type: 'legal', is_active: true, created_at: '' },
  { id: 'h-9', date: '2026-08-15', name: '광복절', type: 'legal', is_active: true, created_at: '' },
  { id: 'h-10', date: '2026-09-24', name: '추석 전날', type: 'legal', is_active: true, created_at: '' },
  { id: 'h-11', date: '2026-09-25', name: '추석', type: 'legal', is_active: true, created_at: '' },
  { id: 'h-12', date: '2026-09-26', name: '추석 다음날', type: 'legal', is_active: true, created_at: '' },
  { id: 'h-13', date: '2026-10-03', name: '개천절', type: 'legal', is_active: true, created_at: '' },
  { id: 'h-14', date: '2026-10-09', name: '한글날', type: 'legal', is_active: true, created_at: '' },
  { id: 'h-15', date: '2026-12-25', name: '크리스마스', type: 'legal', is_active: true, created_at: '' },
];

export const defaultApprovalTemplates: ApprovalTemplate[] = [
  { id: 'at-1', name: '휴가 결재', document_type: 'leave', steps: [{ step: 1, role: 'dept_manager' }, { step: 2, role: 'hr_manager' }], is_active: true, created_at: '', updated_at: '' },
  { id: 'at-2', name: '경비 결재', document_type: 'expense', steps: [{ step: 1, role: 'dept_manager' }, { step: 2, role: 'hr_manager' }, { step: 3, role: 'admin' }], is_active: true, created_at: '', updated_at: '' },
  { id: 'at-3', name: '인사발령 결재', document_type: 'appointment', steps: [{ step: 1, role: 'hr_manager' }, { step: 2, role: 'admin' }], is_active: true, created_at: '', updated_at: '' },
];

export const defaultAttendanceTypes: AttendanceTypeConfig[] = [
  // 근무 (work)
  { id: 'at-01', code: 'office', label: '사무실 출근', category: 'work', is_active: true, effective_from: null, effective_to: null, requires_approval: false, requires_location: false, requires_purpose: false, counts_as_work: true, deduct_leave: false, default_hours: 8, sort_order: 1, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-02', code: 'remote', label: '재택근무', category: 'work', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: true, deduct_leave: false, default_hours: 8, sort_order: 2, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-03', code: 'field_work', label: '외근', category: 'work', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 3, is_system: true, created_at: '', updated_at: '' },
  // 출장 (trip)
  { id: 'at-10', code: 'domestic_trip', label: '국내출장(일반)', category: 'trip', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 8, sort_order: 10, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-11', code: 'domestic_trip_as', label: '국내출장(A/S)', category: 'trip', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 10, sort_order: 11, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-12', code: 'overseas_trip', label: '해외출장(일반)', category: 'trip', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 10, sort_order: 12, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-13', code: 'overseas_trip_as', label: '해외출장(A/S)', category: 'trip', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 10, sort_order: 13, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-14', code: 'boarding', label: '승선', category: 'trip', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 14, is_system: true, created_at: '', updated_at: '' },
  // 파견/연수 (special)
  { id: 'at-20', code: 'dispatch_domestic', label: '국내파견', category: 'special', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 8, sort_order: 20, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-21', code: 'dispatch_overseas', label: '해외파견', category: 'special', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 8, sort_order: 21, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-22', code: 'training', label: '교육', category: 'special', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 8, sort_order: 22, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-23', code: 'research_domestic', label: '연구TEST(국내)', category: 'special', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 10, sort_order: 23, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-24', code: 'research_overseas', label: '연구TEST(해외)', category: 'special', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 10, sort_order: 24, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-25', code: 'overseas_corp', label: '현지법인', category: 'special', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 25, is_system: false, created_at: '', updated_at: '' },
  // 휴가/휴직 (leave)
  { id: 'at-30', code: 'annual_leave', label: '연차', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: true, default_hours: 8, sort_order: 30, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-31', code: 'half_day', label: '반차', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: true, default_hours: 4, sort_order: 31, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-32', code: 'group_annual', label: '단체연차', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: false, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: true, default_hours: 8, sort_order: 32, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-33', code: 'substitute_leave', label: '대체휴무(일반)', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: false, default_hours: 8, sort_order: 33, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-34', code: 'substitute_leave_as', label: '대체휴무(A/S)', category: 'leave', is_active: false, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: false, default_hours: 8, sort_order: 34, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-35', code: 'sick_leave', label: '병가', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: false, default_hours: 8, sort_order: 35, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-36', code: 'condolence', label: '경조사', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: false, default_hours: 0, sort_order: 36, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-37', code: 'maternity', label: '출산휴가', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: false, default_hours: 8, sort_order: 37, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-38', code: 'childcare', label: '육아휴직', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: false, default_hours: 8, sort_order: 38, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-39', code: 'childcare_short', label: '육아기근로시간단축', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 39, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-40', code: 'infertility', label: '난임휴가', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: false, default_hours: 0, sort_order: 40, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-41', code: 'prenatal', label: '태아검진', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: false, default_hours: 0, sort_order: 41, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-42', code: 'pregnancy_short', label: '임신기근로시간단축', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 42, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-43', code: 'child_care_leave', label: '자녀돌봄휴가(8h)', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: true, default_hours: 8, sort_order: 43, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-44', code: 'child_care_half', label: '자녀돌봄휴가(4h)', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: true, default_hours: 4, sort_order: 44, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-45', code: 'birthday_early', label: '생일자조기퇴근', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: true, default_hours: 4, sort_order: 45, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-46', code: 'leave_generic', label: '휴가', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: false, default_hours: 8, sort_order: 46, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-47', code: 'leave_of_absence', label: '휴직', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: false, default_hours: 8, sort_order: 47, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-48', code: 'unused_annual', label: '연차미사용', category: 'leave', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: true, default_hours: 0, sort_order: 48, is_system: false, created_at: '', updated_at: '' },
  // 의무/공가 (special)
  { id: 'at-50', code: 'military_reserve', label: '예비군', category: 'special', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: false, default_hours: 8, sort_order: 50, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-51', code: 'civil_defense', label: '민방위', category: 'special', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: false, default_hours: 0, sort_order: 51, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-52', code: 'quarantine', label: '자가격리', category: 'special', is_active: true, effective_from: null, effective_to: null, requires_approval: false, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: false, default_hours: 0, sort_order: 52, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-53', code: 'drill', label: '훈련', category: 'special', is_active: false, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: false, default_hours: 0, sort_order: 53, is_system: false, created_at: '', updated_at: '' },
  // 근태이상 (absence)
  { id: 'at-60', code: 'late', label: '지각', category: 'absence', is_active: true, effective_from: null, effective_to: null, requires_approval: false, requires_location: false, requires_purpose: false, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 60, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-61', code: 'early_leave', label: '조퇴', category: 'absence', is_active: true, effective_from: null, effective_to: null, requires_approval: false, requires_location: false, requires_purpose: false, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 61, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-62', code: 'outing', label: '외출', category: 'absence', is_active: true, effective_from: null, effective_to: null, requires_approval: false, requires_location: false, requires_purpose: false, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 62, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-63', code: 'absent', label: '결근', category: 'absence', is_active: true, effective_from: null, effective_to: null, requires_approval: false, requires_location: false, requires_purpose: false, counts_as_work: false, deduct_leave: false, default_hours: 0, sort_order: 63, is_system: true, created_at: '', updated_at: '' },
  // 직무구분 (work)
  { id: 'at-70', code: 'research_a', label: '연구/시험직무(A)', category: 'work', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 70, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-71', code: 'as_commissioning_a', label: 'AS/시운전 직무(A)', category: 'work', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 71, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-72', code: 'construction_b', label: '설치/공사/감리직무(A)', category: 'work', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 72, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-73', code: 'safety_b', label: '안전관리직무(B)', category: 'work', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 73, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-74', code: 'quality_b', label: '품질검사직무(B)', category: 'work', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 74, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-75', code: 'sales_c', label: '영업직무(C)', category: 'work', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 75, is_system: false, created_at: '', updated_at: '' },
  { id: 'at-76', code: 'admin_c', label: '관리/기타직무(C)', category: 'work', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: true, requires_purpose: true, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 76, is_system: false, created_at: '', updated_at: '' },
  // 연장근로 (overtime)
  { id: 'at-80', code: 'overtime', label: '잔업(연장근로)', category: 'overtime', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 80, is_system: true, created_at: '', updated_at: '' },
  { id: 'at-81', code: 'special_work', label: '특근', category: 'overtime', is_active: true, effective_from: null, effective_to: null, requires_approval: true, requires_location: false, requires_purpose: false, counts_as_work: true, deduct_leave: false, default_hours: 0, sort_order: 81, is_system: true, created_at: '', updated_at: '' },
];

export const now = new Date().toISOString();
export const wpDefault = {
  use_custom_work_hours: false, start_time: '07:00', end_time: '16:00',
  break_minutes: 60, weekly_hours: 40, late_grace_minutes: 5,
};

export const defaultWorkplaces: Workplace[] = [
  {
    id: 'wp-01',
    code: 'HQ',
    name: '본사',
    business_number: '',
    representative: '',
    address: '',
    tax_office: '',
    industry_type: '',
    business_type: '',
    is_headquarters: true,
    is_active: true,
    sort_order: 1,
    workplace_type: 'headquarters',
    country_code: 'KR',
    timezone: 'Asia/Seoul',
    currency: 'KRW',
    ...wpDefault,
    created_at: now,
    updated_at: now,
  },
];
