// Seed dataset for the code-management module (설정 > 코드관리).
// Used ONLY by the seed scripts — the runtime store hydrates from the DB.
//
// Contains the generic code groups every installation needs (status/type
// enumerations referenced by the UI). Company-specific code series belong in a
// customer-specific seed, not here.
import type { CodeGroup, CodeItem } from '@/lib/stores/code-store';

const SEED_TIMESTAMP = '2024-01-01T00:00:00.000Z';

function buildGroup(
  group_code: string,
  group_name: string,
  description: string,
  sort_order: number,
  items: Record<string, string>,
): { group: CodeGroup; items: CodeItem[] } {
  const groupId = `cg-${group_code.toLowerCase()}`;
  return {
    group: {
      id: groupId,
      group_code,
      group_name,
      description,
      sort_order,
      is_active: true,
      is_system: true,
      effective_from: null,
      effective_to: null,
      created_at: SEED_TIMESTAMP,
      updated_at: SEED_TIMESTAMP,
    },
    items: Object.entries(items).map(([code, label], idx) => ({
      id: `ci-${group_code.toLowerCase()}-${code}`,
      group_id: groupId,
      code,
      label,
      sort_order: idx + 1,
      is_active: true,
      is_system: true,
      effective_from: null,
      effective_to: null,
      created_at: SEED_TIMESTAMP,
      updated_at: SEED_TIMESTAMP,
    })),
  };
}

const seedDefinitions = [
  buildGroup('ATTENDANCE_STATUS', '근태상태', '근태 상태 코드', 1, {
    normal: '정상', late: '지각', early_leave: '조퇴', absent: '결근', holiday: '휴일', leave: '휴가',
  }),
  buildGroup('LEAVE_REQUEST_STATUS', '휴가신청상태', '휴가 신청 상태 코드', 2, {
    pending: '대기', approved: '승인', rejected: '반려', cancelled: '취소',
  }),
  buildGroup('PAYROLL_STATUS', '급여상태', '급여 처리 상태 코드', 3, {
    draft: '작성중', confirmed: '확정', paid: '지급완료',
  }),
  buildGroup('APPOINTMENT_TYPES', '인사발령유형', '인사발령 유형 코드', 4, {
    promotion: '승진', transfer: '전보', title_change: '직책변경', hire: '입사', resignation: '퇴사', other: '기타',
  }),
  buildGroup('APPROVAL_STATUS', '결재상태', '결재 상태 코드', 5, {
    pending: '대기', in_progress: '진행중', approved: '승인', rejected: '반려', cancelled: '취소',
  }),
  buildGroup('JOB_POSTING_STATUS', '채용공고상태', '채용공고 상태 코드', 6, {
    draft: '작성중', open: '진행중', closed: '마감', cancelled: '취소',
  }),
  buildGroup('APPLICANT_STAGES', '지원자단계', '지원자 진행 단계 코드', 7, {
    applied: '지원', screening: '서류심사', interview: '면접', offer: '제안', hired: '채용', rejected: '불합격',
  }),
  buildGroup('TRAINING_STATUS', '교육상태', '교육 상태 코드', 8, {
    planned: '예정', in_progress: '진행중', completed: '완료', cancelled: '취소',
  }),
  buildGroup('EVALUATION_STATUS', '평가상태', '평가 상태 코드', 9, {
    draft: '작성중', in_progress: '진행중', completed: '완료',
  }),
  buildGroup('WORK_SCHEDULE_TYPES', '근무유형', '근무 스케줄 유형 코드', 10, {
    fixed: '고정근무', staggered: '시차출퇴근제', selective: '선택적 근로시간제', remote: '재택근무제', flexible: '탄력적 근로시간제', compressed: '집중근무제',
  }),
  buildGroup('HOLIDAY_TYPES', '공휴일유형', '공휴일 유형 코드', 11, {
    legal: '법정공휴일', substitute: '대체공휴일', company: '회사지정휴일',
  }),
  buildGroup('LEAVE_TYPE_CODES', '휴가유형', '휴가 유형 코드', 12, {
    annual: '연차', sick: '병가', condolence: '경조사휴가', maternity: '출산휴가', paternity: '배우자출산휴가', other: '기타',
  }),
  buildGroup('UNUSED_LEAVE_POLICIES', '미사용연차정책', '미사용 연차 처리 정책 코드', 13, {
    carryover: '이월', payout: '수당지급',
  }),
  buildGroup('WORKFLOW_TYPE', '워크플로우유형', '워크플로우 유형 코드', 14, {
    onboarding: '입사', offboarding: '퇴사', promotion: '승진', transfer: '전보', custom: '사용자정의',
  }),
  buildGroup('WORKFLOW_STATUS', '워크플로우상태', '워크플로우 상태 코드', 15, {
    pending: '대기', in_progress: '진행중', completed: '완료', cancelled: '취소',
  }),
  buildGroup('WORKFLOW_TASK_STATUS', '워크플로우태스크상태', '워크플로우 태스크 상태 코드', 16, {
    pending: '미완료', completed: '완료', skipped: '건너뜀',
  }),
  buildGroup('DOCUMENT_SUBMISSION_STATUS', '서류제출상태', '서류 제출 상태 코드', 17, {
    pending: '미제출', submitted: '제출완료', rejected: '반려',
  }),
  buildGroup('WORKFLOW_ASSIGNEE_ROLES', '워크플로우담당역할', '워크플로우 담당 역할 코드', 18, {
    hr: '인사담당자', it: 'IT담당자', manager: '부서장', admin: '총무담당자', employee: '본인', mentor: '멘토', finance: '재무담당자',
  }),
  buildGroup('APPROVAL_DOCUMENT_TYPES', '결재문서유형', '결재 문서 유형 코드', 19, {
    leave: '휴가', expense: '경비', appointment: '인사발령', overtime: '시간외근무', business_trip: '출장',
  }),
  buildGroup('EMPLOYMENT_TYPES', '고용유형', '고용 유형 코드', 20, {
    regular: '정규직', contract: '계약직', parttime: '시간제', intern: '인턴',
  }),
  buildGroup('EMPLOYEE_STATUS', '재직상태', '재직 상태 코드', 21, {
    active: '재직', on_leave: '휴직', resigned: '퇴직', retired: '정년퇴직',
  }),
  buildGroup('GENDER_LABELS', '성별', '성별 코드', 22, {
    M: '남성', F: '여성',
  }),
  buildGroup('DEGREE_LABELS', '학력', '학력 코드', 23, {
    high_school: '고등학교', associate: '전문학사', bachelor: '학사', master: '석사', doctorate: '박사',
  }),
  buildGroup('ATTENDANCE_TYPES', '근태유형', '근태 유형 코드 (출장/외근/재택 등)', 24, {
    office: '사무실 출근', business_trip: '출장', field_work: '외근', remote: '재택근무', training: '교육/연수', dispatch: '파견', other: '기타',
  }),
  buildGroup('LEAVE_TIME_PERIODS', '휴가시간구분', '반차/반반차 시간 구분 코드', 25, {
    am_half: '오전반차', pm_half: '오후반차', am_quarter: '오전반반차', pm_quarter: '오후반반차',
  }),
  buildGroup('ATTENDANCE_CATEGORIES', '근태카테고리', '근태 유형 대분류 코드', 26, {
    work: '근무', leave: '휴가/휴직', trip: '출장', special: '특수/의무', overtime: '연장근로', absence: '근태이상',
  }),
  buildGroup('CERTIFICATE_TYPES', '증명서종류', '증명서 발급 유형 코드', 27, {
    employment: '재직증명서', career: '경력증명서', retirement: '퇴직증명서',
  }),
  buildGroup('EVAL_GRADES', '평가등급', '인사평가 등급 코드', 28, {
    S: 'S', A: 'A', B: 'B', C: 'C', D: 'D',
  }),
  buildGroup('CONTRACT_STATUS', '계약상태', '전자계약 상태 코드', 29, {
    draft: '작성중', pending_sign: '서명대기', signed: '서명완료', expired: '만료', cancelled: '취소',
  }),
  buildGroup('CONTRACT_TYPES', '계약유형', '전자계약 유형 코드', 30, {
    employment: '근로계약서', salary: '연봉계약서', nda: '비밀유지계약서', non_compete: '겸업금지계약서',
  }),
  buildGroup('ISSUE_TYPES', 'HR이슈유형', 'HR 이슈 유형 코드', 31, {
    grievance: '직원 고충', safety: '안전 보고', policy_violation: '정책 위반', payroll_dispute: '급여 이의', harassment: '괴롭힘 신고', other: '기타',
  }),
  buildGroup('ISSUE_PRIORITY', 'HR이슈우선순위', 'HR 이슈 우선순위 코드', 32, {
    low: '낮음', medium: '보통', high: '높음', critical: '긴급',
  }),
  buildGroup('ISSUE_STATUS', 'HR이슈상태', 'HR 이슈 상태 코드', 33, {
    open: '접수', in_progress: '처리중', under_review: '검토중', resolved: '해결', closed: '종결',
  }),
  buildGroup('INSURANCE_TYPES', '4대보험', '4대보험 유형 코드', 34, {
    national_pension: '국민연금', health_insurance: '건강보험', long_term_care: '장기요양보험', employment_insurance: '고용보험',
  }),
  buildGroup('YEAR_END_TAX_STATUS', '연말정산상태', '연말정산 처리 상태 코드', 35, {
    not_submitted: '미제출', reviewing: '검토중', completed: '완료',
  }),
  buildGroup('SEVERANCE_STATUS', '퇴직금적립상태', '퇴직금 적립 상태 코드', 36, {
    funded: '적립완료', funding: '적립중', not_funded: '미적립',
  }),
];

export const seedCodeGroups: CodeGroup[] = seedDefinitions.map((d) => d.group);
export const seedCodeItems: CodeItem[] = seedDefinitions.flatMap((d) => d.items);
