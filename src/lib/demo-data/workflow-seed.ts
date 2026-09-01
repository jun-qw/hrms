// Demo/seed dataset for the workflow module (generic HR process templates).
// Used ONLY by the seed script — the runtime store hydrates from the DB.
import type { WorkflowTemplate } from '@/lib/stores/workflow-store';

// ---------------------------------------------------------------------------
// Default workflow templates (8 processes)
// ---------------------------------------------------------------------------

export const seedWorkflowTemplates: WorkflowTemplate[] = [
  {
    id: 'tpl-onboarding',
    name: '신입사원 입사',
    type: 'onboarding',
    description: '신입사원 입사 시 필요한 전체 프로세스',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    steps: [
      {
        id: 'step-ob-1', title: '서류수집', sort_order: 0,
        tasks: [
          {
            id: 'task-ob-1-1', title: '근로계약서 작성 및 서명', assignee_role: 'hr', is_required: true, sort_order: 0,
            documents: [
              { id: 'doc-ob-1', title: '근로계약서', description: '서명된 근로계약서 원본', is_required: true, responsible_role: 'hr', deadline_days: 3, sort_order: 0 },
            ],
          },
          {
            id: 'task-ob-1-2', title: '신분증 사본 수집', assignee_role: 'hr', is_required: true, sort_order: 1,
            documents: [
              { id: 'doc-ob-2', title: '신분증 사본', description: '주민등록증 또는 운전면허증 사본', is_required: true, responsible_role: 'employee', deadline_days: 3, sort_order: 0 },
            ],
          },
          {
            id: 'task-ob-1-3', title: '통장사본 수집', assignee_role: 'hr', is_required: true, sort_order: 2,
            documents: [
              { id: 'doc-ob-3', title: '통장사본', description: '급여 입금용 본인 명의 통장 사본', is_required: true, responsible_role: 'employee', deadline_days: 3, sort_order: 0 },
              { id: 'doc-ob-4', title: '졸업증명서', description: '최종학력 졸업증명서', is_required: false, responsible_role: 'employee', deadline_days: 7, sort_order: 1 },
              { id: 'doc-ob-5', title: '건강검진결과서', description: '최근 6개월 이내 건강검진 결과서', is_required: false, responsible_role: 'employee', deadline_days: 7, sort_order: 2 },
            ],
          },
        ],
      },
      {
        id: 'step-ob-2', title: '시스템설정', sort_order: 1,
        tasks: [
          { id: 'task-ob-2-1', title: '사내 이메일 계정 생성', assignee_role: 'it', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-ob-2-2', title: 'PC 및 장비 준비', assignee_role: 'it', is_required: true, sort_order: 1, documents: [] },
          { id: 'task-ob-2-3', title: '시스템 접근권한 설정', assignee_role: 'it', is_required: true, sort_order: 2, documents: [] },
        ],
      },
      {
        id: 'step-ob-3', title: '인사등록', sort_order: 2,
        tasks: [
          { id: 'task-ob-3-1', title: 'HRMS 인사정보 등록', assignee_role: 'hr', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-ob-3-2', title: '4대보험 취득신고', assignee_role: 'hr', is_required: true, sort_order: 1, documents: [] },
          { id: 'task-ob-3-3', title: '사원증 발급', assignee_role: 'admin', is_required: false, sort_order: 2, documents: [] },
        ],
      },
      {
        id: 'step-ob-4', title: '교육', sort_order: 3,
        tasks: [
          { id: 'task-ob-4-1', title: '사내규정 및 취업규칙 교육', assignee_role: 'hr', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-ob-4-2', title: '정보보안 교육 수료', assignee_role: 'it', is_required: true, sort_order: 1, documents: [] },
        ],
      },
      {
        id: 'step-ob-5', title: '부서배치', sort_order: 4,
        tasks: [
          { id: 'task-ob-5-1', title: '부서 인사 소개', assignee_role: 'manager', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-ob-5-2', title: '멘토 지정 및 OJT 시작', assignee_role: 'mentor', is_required: false, sort_order: 1, documents: [] },
        ],
      },
      {
        id: 'step-ob-6', title: '완료', sort_order: 5,
        tasks: [
          { id: 'task-ob-6-1', title: '입사 프로세스 최종 확인', assignee_role: 'hr', is_required: true, sort_order: 0, documents: [] },
        ],
      },
    ],
  },
  {
    id: 'tpl-offboarding',
    name: '퇴사 처리',
    type: 'offboarding',
    description: '퇴사 시 필요한 전체 프로세스',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    steps: [
      {
        id: 'step-off-1', title: '퇴사접수', sort_order: 0,
        tasks: [
          { id: 'task-off-1-1', title: '사직서 접수 확인', assignee_role: 'hr', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-off-1-2', title: '퇴사일 확정', assignee_role: 'hr', is_required: true, sort_order: 1, documents: [] },
          { id: 'task-off-1-3', title: '잔여 연차 확인', assignee_role: 'hr', is_required: true, sort_order: 2, documents: [] },
        ],
      },
      {
        id: 'step-off-2', title: '인수인계', sort_order: 1,
        tasks: [
          { id: 'task-off-2-1', title: '업무 인수인계서 작성', assignee_role: 'employee', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-off-2-2', title: '인수인계 확인 (부서장)', assignee_role: 'manager', is_required: true, sort_order: 1, documents: [] },
          { id: 'task-off-2-3', title: '프로젝트 자료 이관', assignee_role: 'employee', is_required: true, sort_order: 2, documents: [] },
        ],
      },
      {
        id: 'step-off-3', title: '자산반납/계정해지', sort_order: 2,
        tasks: [
          { id: 'task-off-3-1', title: 'PC 및 장비 반납', assignee_role: 'it', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-off-3-2', title: '시스템 계정 해지', assignee_role: 'it', is_required: true, sort_order: 1, documents: [] },
          { id: 'task-off-3-3', title: '사원증 회수', assignee_role: 'admin', is_required: true, sort_order: 2, documents: [] },
        ],
      },
      {
        id: 'step-off-4', title: '퇴직정산', sort_order: 3,
        tasks: [
          { id: 'task-off-4-1', title: '퇴직금 산정', assignee_role: 'finance', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-off-4-2', title: '4대보험 상실신고', assignee_role: 'hr', is_required: true, sort_order: 1, documents: [] },
        ],
      },
    ],
  },
  {
    id: 'tpl-promotion',
    name: '승진 처리',
    type: 'promotion',
    description: '승진 시 필요한 전체 프로세스',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    steps: [
      {
        id: 'step-pr-1', title: '승진심사', sort_order: 0,
        tasks: [
          { id: 'task-pr-1-1', title: '승진 대상자 평가 확인', assignee_role: 'hr', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-pr-1-2', title: '승진심사위원회 심의', assignee_role: 'hr', is_required: true, sort_order: 1, documents: [] },
        ],
      },
      {
        id: 'step-pr-2', title: '발령처리', sort_order: 1,
        tasks: [
          { id: 'task-pr-2-1', title: '승진 발령 공문 작성', assignee_role: 'hr', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-pr-2-2', title: 'HRMS 직급 변경', assignee_role: 'hr', is_required: true, sort_order: 1, documents: [] },
          { id: 'task-pr-2-3', title: '급여 테이블 조정', assignee_role: 'finance', is_required: true, sort_order: 2, documents: [] },
        ],
      },
      {
        id: 'step-pr-3', title: '완료', sort_order: 2,
        tasks: [
          { id: 'task-pr-3-1', title: '승진 축하 안내 발송', assignee_role: 'hr', is_required: false, sort_order: 0, documents: [] },
        ],
      },
    ],
  },
  // === 전보/이동 ===
  {
    id: 'tpl-transfer', name: '부서 전보', type: 'transfer',
    description: '부서 이동 시 필요한 인수인계 및 시스템 설정',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
    steps: [
      {
        id: 'step-tr-1', title: '인수인계', sort_order: 0,
        tasks: [
          { id: 'task-tr-1-1', title: '담당 업무 인계 문서 작성', assignee_role: 'employee', is_required: true, sort_order: 0,
            documents: [
              { id: 'doc-tr-1', title: '업무 인수인계서', description: '담당 업무 목록과 진행 상황', is_required: true, responsible_role: 'employee', deadline_days: 5, sort_order: 0 },
            ],
          },
          { id: 'task-tr-1-2', title: '후임자 인계 회의', assignee_role: 'manager', is_required: true, sort_order: 1, documents: [] },
        ],
      },
      {
        id: 'step-tr-2', title: '시스템 변경', sort_order: 1,
        tasks: [
          { id: 'task-tr-2-1', title: 'HRMS 부서 변경', assignee_role: 'hr', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-tr-2-2', title: '결재선 / 권한 재설정', assignee_role: 'it', is_required: true, sort_order: 1, documents: [] },
          { id: 'task-tr-2-3', title: '좌석/장비 이동', assignee_role: 'admin', is_required: true, sort_order: 2, documents: [] },
        ],
      },
      {
        id: 'step-tr-3', title: '신규 부서 적응', sort_order: 2,
        tasks: [
          { id: 'task-tr-3-1', title: '신규 부서 OJT', assignee_role: 'manager', is_required: false, sort_order: 0, documents: [] },
        ],
      },
    ],
  },
  // === 육아휴직 ===
  {
    id: 'tpl-childcare', name: '육아휴직 처리', type: 'custom',
    description: '육아휴직 신청부터 복직까지 전체 프로세스',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
    steps: [
      {
        id: 'step-cc-1', title: '신청 및 승인', sort_order: 0,
        tasks: [
          { id: 'task-cc-1-1', title: '육아휴직 신청서 제출', assignee_role: 'employee', is_required: true, sort_order: 0,
            documents: [
              { id: 'doc-cc-1', title: '육아휴직 신청서', description: '회사 양식', is_required: true, responsible_role: 'employee', deadline_days: 30, sort_order: 0 },
              { id: 'doc-cc-2', title: '주민등록등본', description: '자녀 확인용', is_required: true, responsible_role: 'employee', deadline_days: 30, sort_order: 1 },
              { id: 'doc-cc-3', title: '의료기관 진단서', description: '필요시', is_required: false, responsible_role: 'employee', deadline_days: 30, sort_order: 2 },
            ],
          },
          { id: 'task-cc-1-2', title: '인사팀 승인 및 노사담당 안내', assignee_role: 'hr', is_required: true, sort_order: 1, documents: [] },
        ],
      },
      {
        id: 'step-cc-2', title: '휴직 시작', sort_order: 1,
        tasks: [
          { id: 'task-cc-2-1', title: '인수인계 완료', assignee_role: 'employee', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-cc-2-2', title: '4대보험 처리 (납부유예 신청)', assignee_role: 'hr', is_required: true, sort_order: 1, documents: [] },
          { id: 'task-cc-2-3', title: '고용보험 육아휴직 급여 신청 안내', assignee_role: 'hr', is_required: true, sort_order: 2, documents: [] },
          { id: 'task-cc-2-4', title: 'HRMS 상태 변경 (휴직)', assignee_role: 'hr', is_required: true, sort_order: 3, documents: [] },
        ],
      },
      {
        id: 'step-cc-3', title: '복직 처리', sort_order: 2,
        tasks: [
          { id: 'task-cc-3-1', title: '복직 의사 확인', assignee_role: 'hr', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-cc-3-2', title: 'HRMS 상태 변경 (재직)', assignee_role: 'hr', is_required: true, sort_order: 1, documents: [] },
          { id: 'task-cc-3-3', title: '재오리엔테이션 및 업무 배정', assignee_role: 'manager', is_required: true, sort_order: 2, documents: [] },
        ],
      },
    ],
  },
  // === 장기 교육/연수 ===
  {
    id: 'tpl-training', name: '장기 교육/연수 파견', type: 'custom',
    description: '국내외 장기 교육/연수 파견 프로세스',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
    steps: [
      {
        id: 'step-tn-1', title: '파견 결정', sort_order: 0,
        tasks: [
          { id: 'task-tn-1-1', title: '교육 신청서 작성', assignee_role: 'employee', is_required: true, sort_order: 0,
            documents: [
              { id: 'doc-tn-1', title: '교육 신청서 + 사유서', description: '회사 양식', is_required: true, responsible_role: 'employee', deadline_days: 14, sort_order: 0 },
              { id: 'doc-tn-2', title: '교육 안내문', description: '교육기관 발행', is_required: true, responsible_role: 'employee', deadline_days: 14, sort_order: 1 },
            ],
          },
          { id: 'task-tn-1-2', title: '교육비 예산 확보', assignee_role: 'finance', is_required: true, sort_order: 1, documents: [] },
          { id: 'task-tn-1-3', title: '학자금/교육비 약정서 체결', assignee_role: 'hr', is_required: true, sort_order: 2, documents: [] },
        ],
      },
      {
        id: 'step-tn-2', title: '파견 기간', sort_order: 1,
        tasks: [
          { id: 'task-tn-2-1', title: '월 출석/성적 확인', assignee_role: 'hr', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-tn-2-2', title: '교육비 송금 처리', assignee_role: 'finance', is_required: true, sort_order: 1, documents: [] },
        ],
      },
      {
        id: 'step-tn-3', title: '복귀', sort_order: 2,
        tasks: [
          { id: 'task-tn-3-1', title: '교육 결과 보고서 제출', assignee_role: 'employee', is_required: true, sort_order: 0,
            documents: [
              { id: 'doc-tn-3', title: '교육 결과 보고서', description: '학습 내용 + 회사 적용 방안', is_required: true, responsible_role: 'employee', deadline_days: 14, sort_order: 0 },
              { id: 'doc-tn-4', title: '수료증', description: '교육기관 발행', is_required: true, responsible_role: 'employee', deadline_days: 14, sort_order: 1 },
            ],
          },
          { id: 'task-tn-3-2', title: '교육 활용도 평가', assignee_role: 'manager', is_required: false, sort_order: 1, documents: [] },
        ],
      },
    ],
  },
  // === 조직 개편 ===
  {
    id: 'tpl-reorg', name: '조직 개편 (부서 신설/통합)', type: 'custom',
    description: '부서 신설, 통합, 폐지 시 진행되는 프로세스',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
    steps: [
      {
        id: 'step-rg-1', title: '계획 수립', sort_order: 0,
        tasks: [
          { id: 'task-rg-1-1', title: '조직 개편안 작성', assignee_role: 'hr', is_required: true, sort_order: 0,
            documents: [
              { id: 'doc-rg-1', title: '조직개편 계획서', description: '신설/통합/폐지 계획', is_required: true, responsible_role: 'hr', deadline_days: 14, sort_order: 0 },
            ],
          },
          { id: 'task-rg-1-2', title: '경영진 승인', assignee_role: 'admin', is_required: true, sort_order: 1, documents: [] },
        ],
      },
      {
        id: 'step-rg-2', title: '시스템 반영', sort_order: 1,
        tasks: [
          { id: 'task-rg-2-1', title: 'HRMS 부서 코드 등록/변경', assignee_role: 'it', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-rg-2-2', title: '결재선 재구성', assignee_role: 'it', is_required: true, sort_order: 1, documents: [] },
          { id: 'task-rg-2-3', title: '권한 재배분', assignee_role: 'it', is_required: true, sort_order: 2, documents: [] },
        ],
      },
      {
        id: 'step-rg-3', title: '인력 배치', sort_order: 2,
        tasks: [
          { id: 'task-rg-3-1', title: '대상 직원 전보 발령', assignee_role: 'hr', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-rg-3-2', title: '인수인계 일정 조율', assignee_role: 'manager', is_required: true, sort_order: 1, documents: [] },
          { id: 'task-rg-3-3', title: '안내문 공지', assignee_role: 'hr', is_required: true, sort_order: 2, documents: [] },
        ],
      },
    ],
  },
  // === 복리후생 신청 (자녀학자금/주택자금 등) ===
  {
    id: 'tpl-benefit', name: '복리후생 신청', type: 'custom',
    description: '자녀학자금/주택자금/경조사 등 복리후생 신청',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
    steps: [
      {
        id: 'step-bf-1', title: '신청 접수', sort_order: 0,
        tasks: [
          { id: 'task-bf-1-1', title: '신청서 작성', assignee_role: 'employee', is_required: true, sort_order: 0,
            documents: [
              { id: 'doc-bf-1', title: '복리후생 신청서', description: '회사 양식', is_required: true, responsible_role: 'employee', deadline_days: 7, sort_order: 0 },
              { id: 'doc-bf-2', title: '증빙 서류', description: '청구서/영수증 등', is_required: true, responsible_role: 'employee', deadline_days: 7, sort_order: 1 },
            ],
          },
          { id: 'task-bf-1-2', title: '서류 검토', assignee_role: 'hr', is_required: true, sort_order: 1, documents: [] },
        ],
      },
      {
        id: 'step-bf-2', title: '결재 및 지급', sort_order: 1,
        tasks: [
          { id: 'task-bf-2-1', title: '결재 상신 (부서장 → 인사팀장)', assignee_role: 'manager', is_required: true, sort_order: 0, documents: [] },
          { id: 'task-bf-2-2', title: '재무팀 지급 처리', assignee_role: 'finance', is_required: true, sort_order: 1, documents: [] },
          { id: 'task-bf-2-3', title: '사용자 안내', assignee_role: 'hr', is_required: false, sort_order: 2, documents: [] },
        ],
      },
    ],
  },
];
