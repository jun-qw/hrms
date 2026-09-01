export const ATTENDANCE_STATUS = {
  normal: '정상',
  late: '지각',
  early_leave: '조퇴',
  absent: '결근',
  holiday: '휴일',
  leave: '휴가',
  half_day: '반차',
  quarter_day: '반반차',
} as const;

export const LEAVE_TIME_PERIODS = {
  am_half: '오전반차',
  pm_half: '오후반차',
  am_quarter: '오전반반차',
  pm_quarter: '오후반반차',
} as const;

export const LEAVE_REQUEST_STATUS = {
  pending: '대기',
  approved: '승인',
  rejected: '반려',
  cancelled: '취소',
} as const;

export const PAYROLL_STATUS = {
  draft: '작성중',
  confirmed: '확정',
  paid: '지급완료',
} as const;

export const APPOINTMENT_TYPES = {
  promotion: '승진',
  transfer: '전보',
  title_change: '직책변경',
  hire: '입사',
  resignation: '퇴사',
  other: '기타',
} as const;

export const APPROVAL_STATUS = {
  pending: '대기',
  in_progress: '진행중',
  approved: '승인',
  rejected: '반려',
  cancelled: '취소',
} as const;

export const JOB_POSTING_STATUS = {
  draft: '작성중',
  open: '진행중',
  closed: '마감',
  cancelled: '취소',
} as const;

export const APPLICANT_STAGES = {
  applied: '지원',
  screening: '서류심사',
  interview: '면접',
  offer: '제안',
  hired: '채용',
  rejected: '불합격',
} as const;

export const TRAINING_STATUS = {
  planned: '예정',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소',
} as const;

export const EVALUATION_STATUS = {
  draft: '작성중',
  in_progress: '진행중',
  completed: '완료',
} as const;

export const EVAL_GRADES = ['S', 'A', 'B', 'C', 'D'] as const;

export const WORK_SCHEDULE_TYPES = {
  fixed: '고정근무',
  staggered: '시차출퇴근제',
  selective: '선택적 근로시간제',
  remote: '재택근무제',
  flexible: '탄력적 근로시간제',
  compressed: '집중근무제',
} as const;

export const HOLIDAY_TYPES = {
  legal: '법정공휴일',
  substitute: '대체공휴일',
  company: '회사지정휴일',
} as const;

export const LEAVE_TYPE_CODES = {
  annual: '연차',
  sick: '병가',
  condolence: '경조사휴가',
  maternity: '출산휴가',
  paternity: '배우자출산휴가',
  other: '기타',
} as const;

export const UNUSED_LEAVE_POLICIES = {
  carryover: '이월',
  payout: '수당지급',
} as const;

export const WORKFLOW_TYPE = {
  onboarding: '입사',
  offboarding: '퇴사',
  promotion: '승진',
  transfer: '전보',
  custom: '사용자정의',
} as const;

export const WORKFLOW_STATUS = {
  pending: '대기',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소',
} as const;

export const WORKFLOW_TASK_STATUS = {
  pending: '미완료',
  completed: '완료',
  skipped: '건너뜀',
} as const;

export const DOCUMENT_SUBMISSION_STATUS = {
  pending: '미제출',
  submitted: '제출완료',
  rejected: '반려',
} as const;

export const WORKFLOW_ASSIGNEE_ROLES = {
  hr: '인사담당자',
  it: 'IT담당자',
  manager: '부서장',
  admin: '총무담당자',
  employee: '본인',
  mentor: '멘토',
  finance: '재무담당자',
} as const;

export const ATTENDANCE_CATEGORIES = {
  work: '근무',
  leave: '휴가/휴직',
  trip: '출장',
  special: '특수/의무',
  overtime: '연장근로',
  absence: '근태이상',
} as const;

export const ATTENDANCE_TYPES = {
  office: '사무실 출근',
  remote: '재택근무',
  field_work: '외근',
  domestic_trip: '국내출장(일반)',
  domestic_trip_as: '국내출장(A/S)',
  overseas_trip: '해외출장(일반)',
  overseas_trip_as: '해외출장(A/S)',
  boarding: '승선',
  dispatch_domestic: '국내파견',
  dispatch_overseas: '해외파견',
  training: '교육',
  research_domestic: '연구TEST(국내)',
  research_overseas: '연구TEST(해외)',
  overseas_corp: '현지법인',
  annual_leave: '연차',
  half_day: '반차',
  group_annual: '단체연차',
  substitute_leave: '대체휴무(일반)',
  substitute_leave_as: '대체휴무(A/S)',
  sick_leave: '병가',
  condolence: '경조사',
  maternity: '출산휴가',
  childcare: '육아휴직',
  childcare_short: '육아기근로시간단축',
  infertility: '난임휴가',
  prenatal: '태아검진',
  pregnancy_short: '임신기근로시간단축',
  child_care_leave: '자녀돌봄휴가(8h)',
  child_care_half: '자녀돌봄휴가(4h)',
  birthday_early: '생일자조기퇴근',
  leave_generic: '휴가',
  leave_of_absence: '휴직',
  unused_annual: '연차미사용',
  military_reserve: '예비군',
  civil_defense: '민방위',
  quarantine: '자가격리',
  drill: '훈련',
  late: '지각',
  early_leave: '조퇴',
  outing: '외출',
  absent: '결근',
  research_a: '연구/시험직무(A)',
  as_commissioning_a: 'AS/시운전 직무(A)',
  construction_b: '설치/공사/감리직무(A)',
  safety_b: '안전관리직무(B)',
  quality_b: '품질검사직무(B)',
  sales_c: '영업직무(C)',
  admin_c: '관리/기타직무(C)',
  overtime: '잔업(연장근로)',
  special_work: '특근',
} as const;

export const APPROVAL_DOCUMENT_TYPES = {
  leave: '휴가',
  expense: '경비',
  appointment: '인사발령',
  overtime: '시간외근무',
  business_trip: '출장',
} as const;

export const CERTIFICATE_TYPES = {
  employment: '재직증명서',
  career: '경력증명서',
  retirement: '퇴직증명서',
} as const;

export const ISSUE_TYPES = {
  grievance: '직원 고충',
  safety: '안전 보고',
  policy_violation: '정책 위반',
  payroll_dispute: '급여 이의',
  harassment: '괴롭힘 신고',
  other: '기타',
} as const;

export const ISSUE_PRIORITY = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  critical: '긴급',
} as const;

export const ISSUE_STATUS = {
  open: '접수',
  in_progress: '처리중',
  under_review: '검토중',
  resolved: '해결',
  closed: '종결',
} as const;
