/**
 * 대한오토텍(주) 초기 인력 명부.
 *
 * 사내 메일 명부에서 확보한 것은 **성명과 회사 이메일뿐**입니다. 부서·직급·직책·
 * 입사일·급여 등 나머지 항목은 확인된 값이 없으므로 아래 원칙으로 적재합니다.
 *
 *  - 전원을 `미배정` 부서에 넣고, 직급·직책도 최하위 기본값으로 둡니다.
 *    실제 소속은 도입 후 **인력대장 그리드에서 일괄 수정**하는 것을 전제로 합니다.
 *  - 사번은 명부 순서를 따른 임시 일련번호(`0001`~)이며, 회사 채번 규칙이
 *    정해지면 그리드에서 교체합니다.
 *  - 입사일은 스키마상 NOT NULL이라 `PLACEHOLDER_HIRE_DATE` 한 값으로 채웁니다.
 *    **연차 자동계산이 이 날짜를 그대로 쓰므로 실제 입사일로 반드시 교체해야 합니다.**
 *
 * 추측으로 채운 값은 하나도 없습니다. 비어 있는 항목은 비어 있는 채로 둡니다.
 */
import type {
  Department,
  PositionRank,
  PositionTitle,
  Employee,
  CareerHistory,
  EducationHistory,
  Certification,
  FamilyMember,
  JobCategory,
  SalaryGrade,
} from '@/types';

/** 실제 입사일을 확인하기 전까지 쓰는 자리표시 값. */
export const PLACEHOLDER_HIRE_DATE = '2026-01-01';

// ---------------------------------------------------------------------------
// 조직 — 확인 전까지 전원이 머무는 `미배정` + 일반적인 시작 부서 골격
// ---------------------------------------------------------------------------

const ORG_DATE = '2026-01-01';

export const seedDepartments: Department[] = [
  { id: 'dept-00', name: '미배정', code: 'UNASSIGNED', parent_id: null, level: 1, sort_order: 0, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-01', name: '경영지원팀', code: 'MGT', parent_id: null, level: 1, sort_order: 1, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-02', name: '영업팀', code: 'SALES', parent_id: null, level: 1, sort_order: 2, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-03', name: '기술연구팀', code: 'RND', parent_id: null, level: 1, sort_order: 3, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-04', name: '생산팀', code: 'PROD', parent_id: null, level: 1, sort_order: 4, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-05', name: '품질관리팀', code: 'QC', parent_id: null, level: 1, sort_order: 5, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
];

export const seedPositionRanks: PositionRank[] = [
  { id: 'rank-1', name: '사원', level: 1, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-2', name: '주임', level: 2, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-3', name: '대리', level: 3, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-4', name: '과장', level: 4, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-5', name: '차장', level: 5, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-6', name: '부장', level: 6, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-7', name: '이사', level: 7, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-8', name: '상무', level: 8, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-9', name: '전무', level: 9, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-10', name: '대표이사', level: 10, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
];

export const seedPositionTitles: PositionTitle[] = [
  { id: 'title-1', name: '팀원', level: 1, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'title-2', name: '파트장', level: 2, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'title-3', name: '팀장', level: 3, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'title-4', name: '실장', level: 4, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'title-5', name: '본부장', level: 5, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'title-6', name: '대표이사', level: 6, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
];

export const seedJobCategories: JobCategory[] = [
  { id: 'jc-0', name: '미지정', code: 'NONE', description: '직무 확정 전', sort_order: 0, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'jc-1', name: '사무관리직', code: 'OFFICE', description: '경영지원·총무·회계 등 관리 직무', sort_order: 1, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'jc-2', name: '영업직', code: 'SALES', description: '국내외 영업 직무', sort_order: 2, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'jc-3', name: '연구직', code: 'RESEARCH', description: '연구개발 직무', sort_order: 3, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'jc-4', name: '생산기술직', code: 'TECH', description: '생산기술·설비 직무', sort_order: 4, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'jc-5', name: '생산기능직', code: 'MANUF', description: '생산 현장 직무', sort_order: 5, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
];

/** 호봉표는 회사 임금테이블이 확정되기 전까지 비워 둡니다. */
export const seedSalaryGrades: SalaryGrade[] = [];

// ---------------------------------------------------------------------------
// 인력 명부 — 사내 메일 명부 순서 그대로 (55명)
// ---------------------------------------------------------------------------

/** 명부에서 확인된 값: 성명과 회사 이메일. */
const ROSTER: ReadonlyArray<readonly [name: string, email: string]> = [
  ['김대형', '1999hdk@daehan-at.co.kr'],
  ['김동현', 'skyland127@daehan-at.co.kr'],
  ['장현표', 'sirokuma@daehan-at.co.kr'],
  ['김상택', 'sangtaeg.kim@daehan-at.co.kr'],
  ['김태영', 'taeyoung.kim@daehan-at.co.kr'],
  ['정기준', 'gijun.jeung@daehan-at.co.kr'],
  ['여치호', 'chiho.yeo2@daehan-at.co.kr'],
  ['문기영', 'kiyoung.moon@daehan-at.co.kr'],
  ['안혜원', 'hyewon.an@daehan-at.co.kr'],
  ['이장수', 'jangsu.lee@daehan-at.co.kr'],
  ['김민지', 'minji.kim@daehan-at.co.kr'],
  ['권용인', 'yongin.kwon@daehan-at.co.kr'],
  ['김대엽', 'daeyup.kim@daehan-at.co.kr'],
  ['김성식', 'sungsik.kim@daehan-at.co.kr'],
  ['박정명', 'jeongmyeong.park@daehan-at.co.kr'],
  ['성용진', 'mcjin7@daehan-at.co.kr'],
  ['천야일', 'yail.chon@daehan-at.co.kr'],
  ['박지태', 'jitae.park@daehan-at.co.kr'],
  ['나성윤', 'sungyoon.na@daehan-at.co.kr'],
  ['권오희', 'ohhee.kwon@daehan-at.co.kr'],
  ['나승관', 'seungkwan.na@daehan-at.co.kr'],
  ['조상호', 'sangho.jo@daehan-at.co.kr'],
  ['공성환', 'sunghwan.gong@daehan-at.co.kr'],
  ['권병현', 'byeonghyeon.kwon@daehan-at.co.kr'],
  ['김영일', 'youngil.kim@daehan-at.co.kr'],
  ['이태호', 'taeho.lee@daehan-at.co.kr'],
  ['김종희', 'jonghee.kim@daehan-at.co.kr'],
  ['남인수', 'insoo.nam@daehan-at.co.kr'],
  ['송희복', 'heebok.song@daehan-at.co.kr'],
  ['기민주', 'minjoo.gi@daehan-at.co.kr'],
  ['아왈', 'awal.abdul@daehan-at.co.kr'],
  ['이종섭', 'jongseob.lee@daehan-at.co.kr'],
  ['이강빈', 'kangbin.lee@daehan-at.co.kr'],
  ['김동식', 'dongsick.kim@daehan-at.co.kr'],
  ['손민재', 'minjae.son@daehan-at.co.kr'],
  ['최규돈', 'gyudon.choi@daehan-at.co.kr'],
  ['김성훈', 'seonghun.kim@daehan-at.co.kr'],
  ['최민식', 'minsik.choi@daehan-at.co.kr'],
  ['황해영', 'haeyeong.hwang@daehan-at.co.kr'],
  ['김황희', 'hwanghee.kim@daehan-at.co.kr'],
  ['배영미', 'youngmi.bae@daehan-at.co.kr'],
  ['유수성', 'soosung.yoo@daehan-at.co.kr'],
  ['최영지', 'yeongji.choi@daehan-at.co.kr'],
  ['김지일', 'jiil.kim@daehan-at.co.kr'],
  ['정재훈', 'jeongjaehun@daehan-at.co.kr'],
  ['박건식', 'gunshik.park@daehan-at.co.kr'],
  ['김성주', 'sungju.kim@daehan-at.co.kr'],
  ['박성건', 'sunggun.park@daehan-at.co.kr'],
  ['정진우', 'jinwoo.jung@daehan-at.co.kr'],
  ['최영희', 'younghee.choi@daehan-at.co.kr'],
  ['추영진', 'youngjin.chu@daehan-at.co.kr'],
  ['박용근', 'yougkeun.park@daehan-at.co.kr'],
  ['백봉진', 'bongjin.baek@daehan-at.co.kr'],
  ['권도엽', 'doyeop.kwon@daehan-at.co.kr'],
  ['김보민', 'bomin.kim@daehan-at.co.kr'],
] as const;

export const seedEmployees: Employee[] = ROSTER.map(([name, email], index) => {
  const seq = String(index + 1).padStart(4, '0');
  return {
    id: `e${seq}`,
    employee_number: seq,
    name,
    name_en: null,
    email,
    phone: null,
    birth_date: null,
    gender: null,
    address: null,
    address_detail: null,
    zip_code: null,
    department_id: 'dept-00', // 미배정 — 인력대장에서 실제 부서로 이동
    position_rank_id: 'rank-1',
    position_title_id: 'title-1',
    employment_type: 'regular',
    hire_date: PLACEHOLDER_HIRE_DATE,
    resignation_date: null,
    status: 'active',
    base_salary: 0,
    bank_name: null,
    bank_account: null,
    profile_image_url: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    emergency_contact_relation: null,
    workplace_id: null,
    work_arrangement: null,
    arrangement_start_date: null,
    arrangement_end_date: null,
    resident_number: null,
    personal_email: null,
    marriage_date: null,
    created_at: ORG_DATE,
    updated_at: ORG_DATE,
  } satisfies Employee;
});

// ---------------------------------------------------------------------------
// 부속 정보 — 확인된 자료가 없어 비워 둡니다 (사원카드에서 개별 입력)
// ---------------------------------------------------------------------------

export const seedCareerHistories: CareerHistory[] = [];
export const seedEducationHistories: EducationHistory[] = [];
export const seedCertifications: Certification[] = [];
export const seedFamilyMembers: FamilyMember[] = [];
