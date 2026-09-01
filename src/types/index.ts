// Org chart simulation types
export type DragItemType = 'department' | 'employee';

export interface DragPayload {
  type: DragItemType;
  id: string;
  sourceDepartmentId: string;
  name: string;
}

export interface SimulationMove {
  id: string;
  timestamp: number;
  type: DragItemType;
  itemId: string;
  itemName: string;
  fromDepartmentId: string;
  fromDepartmentName: string;
  toDepartmentId: string;
  toDepartmentName: string;
}

export type UserRole = 'admin' | 'hr_manager' | 'dept_manager' | 'employee';

// Settings types
export type WorkScheduleType = 'fixed' | 'staggered' | 'selective' | 'remote' | 'flexible' | 'compressed';
export type HolidayType = 'legal' | 'substitute' | 'company';
export type UnusedLeavePolicy = 'carryover' | 'payout';

export interface WorkSchedule {
  id: string;
  name: string;
  type: WorkScheduleType;
  start_time: string;
  end_time: string;
  core_start_time: string | null;
  core_end_time: string | null;
  break_minutes: number;
  weekly_hours: number;
  is_default: boolean;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: HolidayType;
  is_active: boolean;
  created_at: string;
}

export interface CompanySetting {
  id: string;
  category: string;
  key: string;
  value: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalTemplate {
  id: string;
  name: string;
  document_type: string;
  steps: Array<{ step: number; role: string }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  category: string;
  weight: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CondolenceLeaveRule {
  id: string;
  event_name: string;
  days: number;
  is_paid: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type EmploymentType = 'regular' | 'contract' | 'parttime' | 'intern';
export type EmployeeStatus = 'active' | 'on_leave' | 'resigned' | 'retired';
export type Gender = 'M' | 'F';
export type DegreeType = 'high_school' | 'associate' | 'bachelor' | 'master' | 'doctorate';

export type AttendanceStatus = 'normal' | 'late' | 'early_leave' | 'absent' | 'holiday' | 'leave' | 'half_day' | 'quarter_day';
export type HalfDayPeriod = 'am' | 'pm';
export type LeaveTimePeriod = 'am_half' | 'pm_half' | 'am_quarter' | 'pm_quarter' | 'custom_half' | 'custom_quarter';

export type AttendanceCategory = 'work' | 'leave' | 'trip' | 'special' | 'overtime' | 'absence';

export interface AttendanceTypeConfig {
  id: string;
  code: string;
  label: string;
  category: AttendanceCategory;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  requires_approval: boolean;
  requires_location: boolean;
  requires_purpose: boolean;
  counts_as_work: boolean;
  deduct_leave: boolean;
  default_hours: number;
  sort_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PayrollStatus = 'draft' | 'confirmed' | 'paid';
export type AppointmentType = 'promotion' | 'transfer' | 'title_change' | 'hire' | 'resignation' | 'other';
export type ApprovalStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
export type ApprovalLineStatus = 'pending' | 'approved' | 'rejected';
export type JobPostingStatus = 'draft' | 'open' | 'closed' | 'cancelled';
export type ApplicantStage = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
export type InterviewType = 'phone' | 'video' | 'onsite';
export type InterviewResult = 'pass' | 'fail' | 'pending';
export type TrainingStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type EnrollmentStatus = 'enrolled' | 'completed' | 'cancelled' | 'no_show';
export type EvaluationHalf = 'H1' | 'H2' | 'annual';
export type EvaluationStatus = 'draft' | 'in_progress' | 'completed';
export type EvalItemStatus = 'draft' | 'submitted' | 'confirmed';
export type EvalType = 'self' | 'peer' | 'manager' | 'subordinate';

// Workflow types
export type WorkflowType = 'onboarding' | 'offboarding' | 'promotion' | 'transfer' | 'custom';
export type WorkflowStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type WorkflowTaskStatus = 'pending' | 'completed' | 'skipped';
export type DocumentSubmissionStatus = 'pending' | 'submitted' | 'rejected';

// Audit log types
export type AuditActionType = 'page_view' | 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'approve' | 'reject';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  action_type: AuditActionType;
  target_type: string;
  target_id: string | null;
  target_label: string;
  details: Record<string, unknown> | null;
  session_id: string;
  /** Not persisted — the audit table has no IP column and no external
   *  IP lookup is performed (air-gapped deployments / privacy). */
  ip_address?: string | null;
}

export interface AuditLogSettings {
  enabled: boolean;
  track_page_views: boolean;
  track_creates: boolean;
  track_updates: boolean;
  track_deletes: boolean;
  track_logins: boolean;
  retention_days: number;
  max_entries: number;
}

// Auth types
export interface DemoAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employee_id: string;
  department: string;
  position: string;
  password: string;
}

export interface AuthSession {
  account_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: UserRole;
  employee_id: string;
  session_id: string;
  logged_in_at: string;
  is_demo: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
  level: number;
  sort_order: number;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
  children?: Department[];
  employees?: Employee[];
}

export interface PositionRank {
  id: string;
  name: string;
  level: number;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface PositionTitle {
  id: string;
  name: string;
  level: number;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryGrade {
  id: string;
  rank_id: string;
  step: number;
  base_amount: number;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

export type JobClass = 'office' | 'field';
export type PayMethod = 'monthly' | 'annual' | 'hourly' | 'daily';

export const JOB_CLASS_LABEL: Record<JobClass, string> = {
  office: '사무직',
  field: '현장직',
};

export const PAY_METHOD_LABEL: Record<PayMethod, string> = {
  monthly: '월급제',
  annual: '연봉제',
  hourly: '시급제',
  daily: '일급제',
};

/** 직군을 고르면 따라오는 급여방식 기본값. 현장직은 통상 시급입니다. */
export const DEFAULT_PAY_METHOD: Record<JobClass, PayMethod> = {
  office: 'monthly',
  field: 'hourly',
};

export interface Employee {
  id: string;
  employee_number: string;
  name: string;
  name_en: string | null;
  email: string;
  phone: string | null;
  birth_date: string | null;
  gender: Gender | null;
  address: string | null;
  address_detail: string | null;
  zip_code: string | null;
  department_id: string | null;
  position_rank_id: string | null;
  position_title_id: string | null;
  employment_type: EmploymentType;
  /** 직군 — 고용형태·급여방식과 별개의 축입니다. */
  job_class: JobClass;
  /** 급여지급방식. 현장직은 통상 시급이지만 강제하지 않습니다. */
  pay_method: PayMethod;
  hire_date: string;
  resignation_date: string | null;
  status: EmployeeStatus;
  base_salary: number;
  /** 시급제의 시급, 일급제의 일급. 월급·연봉제에서는 0입니다. */
  hourly_wage: number;
  bank_name: string | null;
  bank_account: string | null;
  profile_image_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  workplace_id: string | null;
  work_arrangement: WorkArrangement | null;  // 근로형태 (정규/파견/현지법인)
  arrangement_start_date: string | null;     // 근로형태 시작일
  arrangement_end_date: string | null;       // 근로형태 종료일 (파견 등)
  resident_number: string | null;
  personal_email: string | null;
  marriage_date: string | null;
  created_at: string;
  updated_at: string;
  department?: Department;
  position_rank?: PositionRank;
  position_title?: PositionTitle;
  workplace?: Workplace;
}

export interface CareerHistory {
  id: string;
  employee_id: string;
  company_name: string;
  department: string | null;
  position: string | null;
  start_date: string;
  end_date: string | null;
  description: string | null;
}

export interface EducationHistory {
  id: string;
  employee_id: string;
  school_name: string;
  major: string | null;
  degree: DegreeType | null;
  start_date: string | null;
  end_date: string | null;
  is_graduated: boolean;
}

export interface Certification {
  id: string;
  employee_id: string;
  name: string;
  issuer: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  certificate_number: string | null;
}

export interface FamilyMember {
  id: string;
  employee_id: string;
  name: string;
  relation: string;
  birth_date: string | null;
  phone: string | null;
  is_dependent: boolean;
  is_living_together: boolean;
  has_income: boolean;
  medical_notes: string | null;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  work_hours: number | null;
  overtime_hours: number;
  status: AttendanceStatus;
  note: string | null;
  attendance_type?: string;
  location?: string | null;
  purpose?: string | null;
  leave_time_period?: LeaveTimePeriod | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  created_at: string;
  employee?: Employee;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  is_paid: boolean;
  max_days: number | null;
  is_active: boolean;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
  leave_type?: LeaveType;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: LeaveRequestStatus;
  approval_id: string | null;
  leave_time_period?: LeaveTimePeriod;
  custom_start_time?: string | null;
  custom_end_time?: string | null;
  created_at: string;
  employee?: Employee;
  leave_type?: LeaveType;
}

export interface LeaveBalanceAdjustment {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  adjustment_days: number;
  reason: string;
  adjusted_by: string;
  created_at: string;
}

// === 출장비 정산 ===
export type TripExpenseGrade = 'A' | 'B' | 'C';
export type TripScope = 'domestic' | 'overseas';

// 직무별 출장비 단가 기준 (HU093 기반)
export interface TripExpenseRate {
  id: string;
  job_code: string;            // 31~37 (직무 코드)
  job_name: string;             // 연구/시험, AS/시운전 등
  grade: TripExpenseGrade;      // A/B/C
  scope: TripScope;             // domestic/overseas
  daily_amount: number;         // 일비 금액
  is_active: boolean;
}

// 출장비 정산 항목
export interface TripExpenseItem {
  id: string;
  category: 'daily' | 'meal' | 'accommodation' | 'fuel' | 'other'; // 일비/식대/숙박/유류/기타
  date: string;                 // 사용 날짜
  description: string;
  amount: number;
  receipt_attached: boolean;
  receipt_name?: string | null;
}

// 출장비 정산서
export type TripExpenseSettlementStatus = 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';

export interface TripExpenseSettlement {
  id: string;
  employee_id: string;
  approval_id: string | null;   // 출장 신청 결재 ID 연결
  trip_type: string;             // 출장 유형 (business_trip_a 등)
  trip_grade: TripExpenseGrade;  // A/B/C
  trip_scope: TripScope;
  destination: string;           // 방문지역
  client: string | null;         // 방문 거래처
  start_date: string;
  end_date: string;
  trip_days: number;
  // 자동 계산 항목
  daily_allowance: number;       // 일비 합계 (단가 × 일수)
  meal_allowance: number;        // 식대 합계
  accommodation_allowance: number; // 숙박비 합계
  fuel_allowance: number;        // 유류대
  other_allowance: number;       // 기타 (예비비 등)
  // 상세
  items: TripExpenseItem[];      // 추가 정산 항목
  total_amount: number;          // 총액
  status: TripExpenseSettlementStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  review_comment: string | null;
  paid_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// 퇴직 정산
export type RetirementReasonCode = 'voluntary' | 'contract_end' | 'retirement_age' | 'layoff' | 'misconduct' | 'other';
export type RetirementSettlementStatus = 'draft' | 'confirmed' | 'paid';

export interface RetirementSettlement {
  id: string;
  employee_id: string;
  // 입력값
  hire_date: string;
  resignation_date: string;
  reason_code: RetirementReasonCode;
  reason_detail: string | null;
  // 평균임금 산정 (퇴직 직전 3개월)
  base_salary_avg: number;        // 월 평균 기본급
  bonus_avg: number;              // 월 평균 상여금 (연간 / 12)
  annual_leave_compensation: number; // 미사용 연차 수당
  // 계산 결과
  service_days: number;           // 총 근속일수
  service_years: number;          // 근속연수 (소수)
  daily_avg_wage: number;         // 1일 평균임금
  retirement_pay: number;         // 법정퇴직금 = 일평균임금 × 30 × (근속일수/365)
  income_tax: number;             // 퇴직소득세
  local_tax: number;              // 지방소득세
  net_pay: number;                // 실수령액
  // 처리
  status: RetirementSettlementStatus;
  paid_at: string | null;
  paid_by: string | null;
  paid_by_name: string | null;
  bank_name: string | null;
  bank_account: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// 사업장 유형
export type WorkplaceType =
  | 'headquarters'      // 본사
  | 'branch'            // 지사/사무소
  | 'factory'           // 공장
  | 'overseas_corp'     // 현지법인
  | 'project_site';     // 현장사무소

// 직원 근로형태 (사업장 배정에 따라 달라짐)
export type WorkArrangement =
  | 'regular'           // 정규 (본사/지사 소속)
  | 'dispatch_domestic' // 국내 파견
  | 'dispatch_overseas' // 해외 파견
  | 'overseas_corp'     // 현지법인 채용
  | 'project';          // 프로젝트 현장근무

export interface Workplace {
  id: string;
  code: string;
  name: string;
  business_number: string;
  representative: string;
  address: string;
  tax_office: string;
  industry_type: string;
  business_type: string;
  is_headquarters: boolean;
  is_active: boolean;
  sort_order: number;
  // 신규: 사업장 유형 + 근로조건
  workplace_type: WorkplaceType;
  country_code: string;          // KR, CN, US, VN 등
  timezone: string;              // Asia/Seoul, Asia/Shanghai 등
  // 사업장별 근로조건 (사용 시)
  use_custom_work_hours: boolean;
  start_time: string;            // 출근시간 (예: 09:00)
  end_time: string;              // 퇴근시간 (예: 18:00)
  break_minutes: number;         // 휴게시간(분)
  weekly_hours: number;          // 주당 근로시간
  late_grace_minutes: number;    // 지각 유예시간
  // 통화
  currency: string;              // KRW, USD, CNY 등
  created_at: string;
  updated_at: string;
}

export interface EmployeePayrollSetting {
  id: string;
  employee_id: string;
  item_code: string;
  item_name: string;
  category: 'earning' | 'deduction';
  amount: number;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollItem {
  id: string;
  name: string;
  code: string;
  category: 'earning' | 'deduction';
  is_taxable: boolean;
  is_active: boolean;
}

export type PayrollCalcType = 'fixed' | 'hours_rate' | 'auto';

export interface PayrollItemConfig {
  id: string;
  name: string;
  code: string;
  category: 'earning' | 'deduction';
  calc_type: PayrollCalcType;
  is_taxable: boolean;
  is_active: boolean;
  rate_multiplier: number | null;
  formula_description: string;
  default_amount: number;
  sort_order: number;
}

export interface PayrollLineItem {
  item_id: string;
  name: string;
  category: 'earning' | 'deduction';
  amount: number;
  is_taxable: boolean;
  formula: string;
}

export interface SavedPayroll {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  base_salary: number;
  items: PayrollLineItem[];
  total_earnings: number;
  total_deductions: number;
  net_pay: number;
  dependents: number;
  status: PayrollStatus;
  created_at: string;
}

export interface Payroll {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  base_salary: number;
  total_earnings: number;
  total_deductions: number;
  net_pay: number;
  status: PayrollStatus;
  paid_at: string | null;
  created_at: string;
  employee?: Employee;
  details?: PayrollDetail[];
}

export interface PayrollDetail {
  id: string;
  payroll_id: string;
  payroll_item_id: string;
  amount: number;
  payroll_item?: PayrollItem;
}

/**
 * 소속 이력 한 구간 — 언제부터 언제까지 어느 부서·직급·직책이었는지.
 * `effective_to`가 null이면 현재 유효한 구간입니다.
 */
export interface EmployeeAssignment {
  id: string;
  employee_id: string;
  effective_from: string;
  effective_to: string | null;
  department_id: string | null;
  position_rank_id: string | null;
  position_title_id: string | null;
  workplace_id: string | null;
  appointment_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  employee_id: string;
  type: AppointmentType;
  effective_date: string;
  prev_department_id: string | null;
  prev_position_rank_id: string | null;
  prev_position_title_id: string | null;
  new_department_id: string | null;
  new_position_rank_id: string | null;
  new_position_title_id: string | null;
  reason: string | null;
  approval_id: string | null;
  created_at: string;
  employee?: Employee;
  prev_department?: Department;
  prev_position_rank?: PositionRank;
  prev_position_title?: PositionTitle;
  new_department?: Department;
  new_position_rank?: PositionRank;
  new_position_title?: PositionTitle;
}

export interface Approval {
  id: string;
  title: string;
  type: string;
  requester_id: string;
  content: Record<string, unknown> | null;
  status: ApprovalStatus;
  created_at: string;
  completed_at: string | null;
  requester?: Employee;
  lines?: ApprovalLine[];
}

export type ApprovalLineType = 'approval' | 'agreement' | 'cc';

export interface ApprovalLine {
  id: string;
  approval_id: string;
  approver_id: string;
  step: number;
  status: ApprovalLineStatus;
  comment: string | null;
  acted_at: string | null;
  approver?: Employee;
  /** 결재: approval(순차결재), agreement(합의-병렬), cc(참조-열람만) */
  line_type: ApprovalLineType;
}

export interface JobPosting {
  id: string;
  title: string;
  department_id: string | null;
  position_rank_id: string | null;
  employment_type: string;
  description: string | null;
  requirements: string | null;
  headcount: number;
  start_date: string | null;
  end_date: string | null;
  status: JobPostingStatus;
  created_at: string;
  department?: Department;
  position_rank?: PositionRank;
}

export interface Applicant {
  id: string;
  job_posting_id: string;
  name: string;
  email: string;
  phone: string | null;
  resume_url: string | null;
  cover_letter: string | null;
  stage: ApplicantStage;
  note: string | null;
  created_at: string;
}

export interface Interview {
  id: string;
  applicant_id: string;
  interviewer_id: string | null;
  scheduled_at: string;
  type: InterviewType | null;
  result: InterviewResult | null;
  feedback: string | null;
  created_at: string;
  interviewer?: Employee;
}

export interface TrainingProgram {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  instructor: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  max_participants: number | null;
  status: TrainingStatus;
  created_at: string;
}

export interface TrainingEnrollment {
  id: string;
  training_id: string;
  employee_id: string;
  status: EnrollmentStatus;
  score: number | null;
  feedback: string | null;
  completed_at: string | null;
  employee?: Employee;
  training?: TrainingProgram;
}

export interface EvaluationPeriod {
  id: string;
  name: string;
  year: number;
  half: EvaluationHalf;
  start_date: string;
  end_date: string;
  status: EvaluationStatus;
  created_at: string;
}

export interface Evaluation {
  id: string;
  period_id: string;
  employee_id: string;
  evaluator_id: string;
  type: EvalType;
  scores: Record<string, number>;
  total_score: number | null;
  grade: string | null;
  comment: string | null;
  status: EvalItemStatus;
  created_at: string;
  employee?: Employee;
  evaluator?: Employee;
  period?: EvaluationPeriod;
}

// Change History types
export type ChangeHistoryEntityType =
  | 'department'
  | 'position_rank'
  | 'position_title'
  | 'job_category'
  | 'salary_grade'
  | 'work_schedule'
  | 'holiday'
  | 'attendance_type'
  | 'code_group'
  | 'code_item'
  | 'employee_payroll';

export type ChangeHistoryActionType = 'create' | 'update' | 'delete';

export interface FieldChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface ChangeHistoryEntry {
  id: string;
  entity_type: ChangeHistoryEntityType;
  entity_id: string;
  entity_label: string;
  action: ChangeHistoryActionType;
  changes: FieldChange[];
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
}

export interface ChangeHistorySettings {
  enabled: boolean;
  max_entries: number;
  retention_days: number;
}

// HR Issue types
export type IssueType = 'grievance' | 'safety' | 'policy_violation' | 'payroll_dispute' | 'harassment' | 'other';
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'in_progress' | 'under_review' | 'resolved' | 'closed';

export interface HrIssue {
  id: string;
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  status: IssueStatus;
  reporter_id: string | null;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}
