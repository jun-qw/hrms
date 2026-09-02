/**
 * 대한오토텍(주) 인력 명부.
 *
 * 출처: 사내 `비상연락망 2026.09.01` 워크북의 `비상연락망 상세` 시트.
 * 시트는 같은 서식의 블록 5개가 가로로 이어 붙은 형태라, 이를 한 줄씩 펼쳐
 * 정규화했습니다. 총 115명.
 *
 * ## 사번 규칙
 *
 * `DA` + `YYMMDD`(입사일) + `NNN`(같은 입사일 안에서의 순번).
 * 순번은 명부에 적힌 순서를 따릅니다. 같은 날 입사자가 여러 명인 날이
 * 있으므로
 * 채번 근거를 바꾸려면 이 파일의 순서를 바꾸면 됩니다.
 *
 * ## 확인이 필요한 항목
 *
 *  - **이메일**: 메일 명부에서 확인된 52명만 채웠습니다.
 *    나머지는 비워 둡니다 — 현장 근로자는 회사 계정이 없는 경우가 많아
 *    가짜 주소를 만들어 넣지 않았습니다.
 *  - **부서**: 명부 비고에서 확인된 39명만 배정했습니다.
 *    생산 블록의 비고는 대부분 체류자격(E-7, E-9 …)이라 부서로 쓰지 않았습니다.
 *  - **직급·직책**: 명부의 '직위' 칸에서 직급으로 읽히는 값만 옮겼습니다.
 *    '생', '검', '청소'처럼 담당을 나타내는 표기는 직급이 아니므로 사원/팀원으로
 *    두고 원래 표기를 비고에 남겼습니다.
 *  - **급여액**: 명부에 없어 전부 0입니다. 현장 시급직은 시급을, 나머지는 월
 *    기본급을 인력대장에서 입력해야 급여 계산이 됩니다.
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

const ORG_DATE = '2026-01-01';

/** 입사일이 확인되지 않은 사람에게 쓰는 자리표시 값. */
export const PLACEHOLDER_HIRE_DATE = '2026-01-01';

export const seedDepartments: Department[] = [
  { id: 'dept-00', name: '미배정', code: 'UNASSIGNED', parent_id: null, level: 1, sort_order: 0, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-01', name: '경영지원팀', code: 'MGT', parent_id: null, level: 1, sort_order: 1, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-02', name: '경영기획팀', code: 'PLAN', parent_id: null, level: 1, sort_order: 2, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-03', name: '총무팀', code: 'GA', parent_id: null, level: 1, sort_order: 3, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-04', name: '전산팀', code: 'IT', parent_id: null, level: 1, sort_order: 4, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-05', name: '기술연구소', code: 'RND', parent_id: null, level: 1, sort_order: 5, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-06', name: '생산기술팀', code: 'PE', parent_id: null, level: 1, sort_order: 6, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-07', name: '생산관리팀', code: 'PC', parent_id: null, level: 1, sort_order: 7, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-08', name: '주조팀', code: 'CAST', parent_id: null, level: 1, sort_order: 8, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-09', name: '금형팀', code: 'MOLD', parent_id: null, level: 1, sort_order: 9, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-10', name: '사상팀', code: 'FIN', parent_id: null, level: 1, sort_order: 10, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-11', name: '보전팀', code: 'MAINT', parent_id: null, level: 1, sort_order: 11, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-12', name: '품질관리팀', code: 'QC', parent_id: null, level: 1, sort_order: 12, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-13', name: '측정실', code: 'MEAS', parent_id: null, level: 1, sort_order: 13, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-14', name: '출하팀', code: 'SHIP', parent_id: null, level: 1, sort_order: 14, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-15', name: '물류팀', code: 'LOG', parent_id: null, level: 1, sort_order: 15, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'dept-16', name: '대기환경팀', code: 'ENV', parent_id: null, level: 1, sort_order: 16, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
];

export const seedPositionRanks: PositionRank[] = [
  { id: 'rank-01', name: '사원', level: 1, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-02', name: '주임', level: 2, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-03', name: '대리', level: 3, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-04', name: '과장', level: 4, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-05', name: '차장', level: 5, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-06', name: '부장', level: 6, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-07', name: '수석부장', level: 7, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-08', name: '상무', level: 8, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-09', name: '전무', level: 9, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'rank-10', name: '대표이사', level: 10, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
];

export const seedPositionTitles: PositionTitle[] = [
  { id: 'title-1', name: '팀원', level: 1, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'title-2', name: '조장', level: 2, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'title-3', name: '반장', level: 3, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'title-4', name: '직장', level: 4, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'title-5', name: '실장', level: 5, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'title-6', name: '대표이사', level: 6, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
];

export const seedJobCategories: JobCategory[] = [
  { id: 'jc-0', name: '미지정', code: 'NONE', description: '직무 확정 전', sort_order: 0, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'jc-1', name: '사무관리직', code: 'OFFICE', description: '경영지원·기획·전산 등', sort_order: 1, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'jc-2', name: '연구개발직', code: 'RND', description: '기술연구소', sort_order: 2, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'jc-3', name: '생산기술직', code: 'TECH', description: '생산기술·보전·금형', sort_order: 3, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'jc-4', name: '품질검사직', code: 'QC', description: '품질관리·측정', sort_order: 4, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
  { id: 'jc-5', name: '생산기능직', code: 'MANUF', description: '주조·사상 등 현장 기능', sort_order: 5, is_active: true, effective_from: null, effective_to: null, created_at: ORG_DATE, updated_at: ORG_DATE },
];

/** 호봉표는 회사 임금테이블이 확정되기 전까지 비워 둡니다. */
export const seedSalaryGrades: SalaryGrade[] = [];

// ---------------------------------------------------------------------------
// 인력 명부
// ---------------------------------------------------------------------------

interface RosterRow {
  no: string;
  name: string;
  /**
   * 휴대폰 번호. 근태기록에는 사원번호가 없고 휴대폰 번호가 필수 항목이라,
   * 외부 근태 자료를 직원에게 붙이는 유일한 연결 키입니다. 명부에서 두 사람이
   * 같은 번호를 쓴 경우(여치호·림부) 뒤쪽을 비워 두었습니다 — 지어내면 남의
   * 근태가 그 사람에게 붙습니다.
   */
  phone: string | null;
  email: string | null;
  hire: string;
  dept: string;
  rank: string;
  title: string;
  jobClass: Employee['job_class'];
  note: string;
}

const ROSTER: readonly RosterRow[] = [
  { no: '미채번-김대형', name: '김대형', phone: '010-4666-8499', email: '1999hdk@daehan-at.co.kr', hire: '2026-01-01', dept: 'dept-00', rank: 'rank-10', title: 'title-6', jobClass: 'office', note: '' },
  { no: 'DA151102001', name: '장현표', phone: '010-3580-9522', email: 'sirokuma@daehan-at.co.kr', hire: '2015-11-02', dept: 'dept-00', rank: 'rank-09', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA121101001', name: '김동현', phone: '010-7766-5516', email: 'skyland127@daehan-at.co.kr', hire: '2012-11-01', dept: 'dept-00', rank: 'rank-01', title: 'title-5', jobClass: 'office', note: '' },
  { no: 'DA201116001', name: '여치호', phone: '010-6202-0593', email: 'chiho.yeo2@daehan-at.co.kr', hire: '2020-11-16', dept: 'dept-02', rank: 'rank-05', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA210809001', name: '백봉진', phone: '010-8332-0220', email: 'bongjin.baek@daehan-at.co.kr', hire: '2021-08-09', dept: 'dept-05', rank: 'rank-04', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA211018001', name: '김대엽', phone: '010-2846-5896', email: 'daeyup.kim@daehan-at.co.kr', hire: '2021-10-18', dept: 'dept-06', rank: 'rank-07', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA220620001', name: '정진우', phone: '010-7770-1064', email: 'jinwoo.jung@daehan-at.co.kr', hire: '2022-06-20', dept: 'dept-14', rank: 'rank-04', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA221201001', name: '황해영', phone: '010-8554-4446', email: 'haeyeong.hwang@daehan-at.co.kr', hire: '2022-12-01', dept: 'dept-12', rank: 'rank-05', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA230918001', name: '박정명', phone: '010-3205-2304', email: 'jeongmyeong.park@daehan-at.co.kr', hire: '2023-09-18', dept: 'dept-11', rank: 'rank-05', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA240205001', name: '김성식', phone: '010-3976-6623', email: 'sungsik.kim@daehan-at.co.kr', hire: '2024-02-05', dept: 'dept-11', rank: 'rank-05', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA240213001', name: '천야일', phone: '010-4058-7469', email: 'yail.chon@daehan-at.co.kr', hire: '2024-02-13', dept: 'dept-06', rank: 'rank-05', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA230522001', name: '김민정', phone: '010-3935-7689', email: null, hire: '2023-05-22', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'office', note: '명부 직위: 청소' },
  { no: 'DA240701001', name: '김황희', phone: '010-8463-0140', email: 'hwanghee.kim@daehan-at.co.kr', hire: '2024-07-01', dept: 'dept-12', rank: 'rank-04', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA240827001', name: '배영미', phone: '010-3586-6944', email: 'youngmi.bae@daehan-at.co.kr', hire: '2024-08-27', dept: 'dept-00', rank: 'rank-04', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA250310001', name: '김성훈', phone: '010-2002-8384', email: 'seonghun.kim@daehan-at.co.kr', hire: '2025-03-10', dept: 'dept-12', rank: 'rank-05', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA250731001', name: '성용진', phone: '010-5772-0010', email: 'mcjin7@daehan-at.co.kr', hire: '2025-07-31', dept: 'dept-06', rank: 'rank-05', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA250804001', name: '김상택', phone: '010-3562-1926', email: 'sangtaeg.kim@daehan-at.co.kr', hire: '2025-08-04', dept: 'dept-00', rank: 'rank-08', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA250908001', name: '추영진', phone: '010-3854-9541', email: 'youngjin.chu@daehan-at.co.kr', hire: '2025-09-08', dept: 'dept-14', rank: 'rank-03', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA251013001', name: '박용근', phone: '010-7676-8433', email: 'yougkeun.park@daehan-at.co.kr', hire: '2025-10-13', dept: 'dept-00', rank: 'rank-05', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA251111001', name: '이장수', phone: '010-7254-8524', email: 'jangsu.lee@daehan-at.co.kr', hire: '2025-11-11', dept: 'dept-03', rank: 'rank-04', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA251215001', name: '유수성', phone: '010-3009-4737', email: 'soosung.yoo@daehan-at.co.kr', hire: '2025-12-15', dept: 'dept-13', rank: 'rank-02', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA260102001', name: '김태영', phone: '010-5376-6936', email: 'taeyoung.kim@daehan-at.co.kr', hire: '2026-01-02', dept: 'dept-05', rank: 'rank-08', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA260105001', name: '문기영', phone: '010-2558-9098', email: 'kiyoung.moon@daehan-at.co.kr', hire: '2026-01-05', dept: 'dept-16', rank: 'rank-04', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA260202001', name: '최규돈', phone: '010-9450-2371', email: 'gyudon.choi@daehan-at.co.kr', hire: '2026-02-02', dept: 'dept-12', rank: 'rank-06', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA260427001', name: '박건식', phone: '010-8529-2447', email: 'gunshik.park@daehan-at.co.kr', hire: '2026-04-27', dept: 'dept-07', rank: 'rank-05', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA260506001', name: '김민지', phone: '010-2323-9212', email: 'minji.kim@daehan-at.co.kr', hire: '2026-05-06', dept: 'dept-01', rank: 'rank-03', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA260506002', name: '최영지', phone: '010-4428-5319', email: 'yeongji.choi@daehan-at.co.kr', hire: '2026-05-06', dept: 'dept-12', rank: 'rank-02', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA260518001', name: '김보민', phone: '010-7645-2998', email: 'bomin.kim@daehan-at.co.kr', hire: '2026-05-18', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA260818001', name: '권용인', phone: '010-6604-5658', email: 'yongin.kwon@daehan-at.co.kr', hire: '2026-08-18', dept: 'dept-01', rank: 'rank-04', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA260818002', name: '정기준', phone: '010-2970-9856', email: 'gijun.jeung@daehan-at.co.kr', hire: '2026-08-18', dept: 'dept-04', rank: 'rank-08', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA260901001', name: '권오희', phone: '010-4859-7411', email: 'ohhee.kwon@daehan-at.co.kr', hire: '2026-09-01', dept: 'dept-06', rank: 'rank-05', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA211018002', name: '오현주', phone: '010-7710-3895', email: null, hire: '2021-10-18', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'office', note: '명부 직위: 검' },
  { no: 'DA211110001', name: '정경화', phone: '010-9193-4109', email: null, hire: '2021-11-10', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'office', note: '명부 직위: 검' },
  { no: 'DA240805001', name: '김지일', phone: '010-8930-3485', email: 'jiil.kim@daehan-at.co.kr', hire: '2024-08-05', dept: 'dept-00', rank: 'rank-01', title: 'title-2', jobClass: 'office', note: '' },
  { no: 'DA251117001', name: '장영수', phone: '010-9328-3872', email: null, hire: '2025-11-17', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'office', note: '명부 직위: 검' },
  { no: 'DA251216001', name: '구현아', phone: '010-8107-8099', email: null, hire: '2025-12-16', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'office', note: '명부 직위: 검' },
  { no: 'DA260427002', name: '조말순', phone: '010-8855-9212', email: null, hire: '2026-04-27', dept: 'dept-12', rank: 'rank-01', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA260423001', name: '박지순', phone: '010-9509-5808', email: null, hire: '2026-04-23', dept: 'dept-12', rank: 'rank-01', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA260427003', name: '오여진', phone: '010-7496-8400', email: null, hire: '2026-04-27', dept: 'dept-12', rank: 'rank-01', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA260427004', name: '전경진', phone: '010-7474-2338', email: null, hire: '2026-04-27', dept: 'dept-12', rank: 'rank-01', title: 'title-1', jobClass: 'office', note: '' },
  { no: 'DA170607001', name: '박성진', phone: '010-5781-8667', email: null, hire: '2017-06-07', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA190611001', name: '권은희', phone: '010-5429-4747', email: null, hire: '2019-06-11', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA200921001', name: '비말', phone: '010-6660-7046', email: null, hire: '2020-09-21', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-7 · 명부 직위: 생' },
  { no: 'DA201020001', name: '박지태', phone: '010-5531-2631', email: 'jitae.park@daehan-at.co.kr', hire: '2020-10-20', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA201028001', name: '쌈부', phone: '010-2150-8650', email: null, hire: '2020-10-28', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-7 · 명부 직위: 생' },
  { no: 'DA201012001', name: '이봉순', phone: '010-6606-1190', email: null, hire: '2020-10-12', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA210215001', name: '최순복', phone: '010-9696-8935', email: null, hire: '2021-02-15', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA211028001', name: '딜', phone: '010-2627-1120', email: null, hire: '2021-10-28', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-7 · 명부 직위: 생' },
  { no: 'DA220525001', name: '우재범', phone: '010-9445-9772', email: null, hire: '2022-05-25', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA220704001', name: '나라앤', phone: '010-5728-6233', email: null, hire: '2022-07-04', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-7 · 명부 직위: 생' },
  { no: 'DA230125001', name: '사라드', phone: '010-5922-4432', email: null, hire: '2023-01-25', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-9/네팔 · 명부 직위: 생' },
  { no: 'DA230421001', name: '비제이', phone: '010-5621-8508', email: null, hire: '2023-04-21', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-7 · 명부 직위: 생' },
  { no: 'DA230626001', name: '크리스너', phone: '010-5634-0543', email: null, hire: '2023-06-26', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '캐스팅 · E-7 · 명부 직위: 생(캐)' },
  { no: 'DA230823001', name: '러메스', phone: '010-8459-7590', email: null, hire: '2023-08-23', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-7 · 명부 직위: 생' },
  { no: 'DA231004001', name: '구룽', phone: '010-5709-2764', email: null, hire: '2023-10-04', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-9/네팔 · 명부 직위: 생' },
  { no: 'DA240109001', name: '지렐', phone: '010-2150-2926', email: null, hire: '2024-01-09', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-9/네팔 · 명부 직위: 생' },
  { no: 'DA240102001', name: '네와스', phone: '010-7209-3056', email: null, hire: '2024-01-02', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-9/네팔 · 명부 직위: 생' },
  { no: 'DA240520001', name: '나성준', phone: '010-3597-9531', email: null, hire: '2024-05-20', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA240614001', name: '가루키', phone: '010-8193-5212', email: null, hire: '2024-06-14', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-7 · 명부 직위: 생' },
  { no: 'DA240816001', name: '비벡', phone: '010-6856-9841', email: null, hire: '2024-08-16', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-9/네팔 · 명부 직위: 생' },
  { no: 'DA240829001', name: '류윤정', phone: '010-3724-9320', email: null, hire: '2024-08-29', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA240905001', name: '후사인', phone: '010-2758-8066', email: null, hire: '2024-09-05', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '캐스팅 · E-9/방글라데시 · 명부 직위: 생(캐)' },
  { no: 'DA240923001', name: '김경목', phone: '010-4031-1300', email: null, hire: '2024-09-23', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA240925001', name: '만달', phone: '010-3902-9811', email: null, hire: '2024-09-25', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-9/네팔 · 명부 직위: 생' },
  { no: 'DA241021001', name: '알빈', phone: '010-8350-2995', email: null, hire: '2024-10-21', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'F-6 · 명부 직위: 생' },
  { no: 'DA241022001', name: '림부', phone: '010-8474-9001', email: null, hire: '2024-10-22', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-9/네팔 · 명부 직위: 생' },
  { no: 'DA241022002', name: '가네쉬', phone: '010-7917-9891', email: null, hire: '2024-10-22', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-9/네팔 · 명부 직위: 생' },
  { no: 'DA241106001', name: '찬드라', phone: '010-2115-7782', email: null, hire: '2024-11-06', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-9/네팔 · 명부 직위: 생' },
  { no: 'DA241111001', name: '이수윤', phone: '010-5521-1134', email: null, hire: '2024-11-11', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA241113001', name: '푼', phone: '010-2193-8735', email: null, hire: '2024-11-13', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-9/네팔 · 명부 직위: 생' },
  { no: 'DA241111002', name: '김미양', phone: '010-2040-5936', email: null, hire: '2024-11-11', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 검' },
  { no: 'DA241212001', name: '아나따샤이', phone: '010-3359-8599', email: null, hire: '2024-12-12', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-9/태국 · 명부 직위: 생' },
  { no: 'DA241212002', name: '가이손', phone: '010-9732-9923', email: null, hire: '2024-12-12', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-9/태국 · 명부 직위: 생' },
  { no: 'DA241209001', name: '비핀', phone: '010-5788-4331', email: null, hire: '2024-12-09', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '캐스팅 · E-7 · 명부 직위: 생(캐)' },
  { no: 'DA250407001', name: '김보은', phone: '010-5557-3052', email: null, hire: '2025-04-07', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA250401001', name: '이강빈', phone: '010-7455-9551', email: 'kangbin.lee@daehan-at.co.kr', hire: '2025-04-01', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '캐스팅 · 명부 직위: 생(캐)' },
  { no: 'DA250414001', name: '강동순', phone: '010-2558-8813', email: null, hire: '2025-04-14', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA251201001', name: '권도엽', phone: '010-3917-6944', email: 'doyeop.kwon@daehan-at.co.kr', hire: '2025-12-01', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA251013002', name: '니할', phone: '010-2118-9126', email: null, hire: '2025-10-13', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '캐스팅 · E-9/스리랑카 · 명부 직위: 생(캐)' },
  { no: 'DA251017001', name: '용석천', phone: '010-3043-4814', email: null, hire: '2025-10-17', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA251110001', name: '비노드', phone: '010-3256-2415', email: null, hire: '2025-11-10', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-9/네팔 · 명부 직위: 생' },
  { no: 'DA251209001', name: '라만', phone: '010-5784-9509', email: null, hire: '2025-12-09', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '캐스팅 · E-7 · 명부 직위: 생(캐)' },
  { no: 'DA250421001', name: '전태상', phone: '010-9345-9857', email: null, hire: '2025-04-21', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 검' },
  { no: 'DA260122001', name: '자키르', phone: '010-4689-7187', email: null, hire: '2026-01-22', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '캐스팅 · E-9/방글라데시 · 명부 직위: 생(캐)' },
  { no: 'DA260127001', name: '아자룰', phone: '010-2188-4692', email: null, hire: '2026-01-27', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '캐스팅 · E-9/방글라데시 · 명부 직위: 생(캐)' },
  { no: 'DA260304001', name: '로이', phone: '010-2225-6343', email: null, hire: '2026-03-04', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '캐스팅 · E-9/방글라데시 · 명부 직위: 생(캐)' },
  { no: 'DA260323001', name: '원영준', phone: '010-6558-0735', email: null, hire: '2026-03-23', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA260324001', name: '유태식', phone: '010-6588-2861', email: null, hire: '2026-03-24', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA260423002', name: '정점자', phone: '010-3365-5784', email: null, hire: '2026-04-23', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA260420001', name: '강영아', phone: '010-9662-6678', email: null, hire: '2026-04-20', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA260427005', name: '나민진', phone: '010-3325-9631', email: null, hire: '2026-04-27', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA260527001', name: '마지드', phone: '010-7526-0106', email: null, hire: '2026-05-27', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'G-1/파키스탄 · 명부 직위: 생' },
  { no: 'DA260605001', name: '미아', phone: '010-2157-2964', email: null, hire: '2026-06-05', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'E-9/방글라데시 · 명부 직위: 생' },
  { no: 'DA260608001', name: '웬디', phone: '010-5145-0560', email: null, hire: '2026-06-08', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: 'F-6/필리핀 · 명부 직위: 생' },
  { no: 'DA260721001', name: '연지만', phone: '010-4195-4398', email: null, hire: '2026-07-21', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA260727001', name: '이동형', phone: '010-8415-7720', email: null, hire: '2026-07-27', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field', note: '명부 직위: 생' },
  { no: 'DA260901002', name: '이가온', phone: '010-5364-4885', email: null, hire: '2026-09-01', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'office', note: '명부 직위: 실슶' },
  { no: 'DA210222001', name: '공성환', phone: '010-8905-7900', email: 'sunghwan.gong@daehan-at.co.kr', hire: '2021-02-22', dept: 'dept-00', rank: 'rank-05', title: 'title-1', jobClass: 'field_manager', note: '' },
  { no: 'DA210222002', name: '기민주', phone: '010-4557-1041', email: 'minjoo.gi@daehan-at.co.kr', hire: '2021-02-22', dept: 'dept-00', rank: 'rank-01', title: 'title-1', jobClass: 'field_manager', note: '캐스팅 · 명부 직위: 생(캐)' },
  { no: 'DA240812001', name: '김성주', phone: '010-8474-9004', email: 'sungju.kim@daehan-at.co.kr', hire: '2024-08-12', dept: 'dept-00', rank: 'rank-03', title: 'title-1', jobClass: 'field_manager', note: '' },
  { no: 'DA240923002', name: '조상호', phone: '010-9083-7695', email: 'sangho.jo@daehan-at.co.kr', hire: '2024-09-23', dept: 'dept-00', rank: 'rank-06', title: 'title-1', jobClass: 'field_manager', note: '' },
  { no: 'DA250102001', name: '이태호', phone: '010-9013-0741', email: 'taeho.lee@daehan-at.co.kr', hire: '2025-01-02', dept: 'dept-10', rank: 'rank-03', title: 'title-1', jobClass: 'field_manager', note: '' },
  { no: 'DA250317001', name: '남인수', phone: '010-9321-3842', email: 'insoo.nam@daehan-at.co.kr', hire: '2025-03-17', dept: 'dept-09', rank: 'rank-01', title: 'title-3', jobClass: 'field_manager', note: '' },
  { no: 'DA250402001', name: '나승관', phone: '010-4856-6039', email: 'seungkwan.na@daehan-at.co.kr', hire: '2025-04-02', dept: 'dept-09', rank: 'rank-06', title: 'title-1', jobClass: 'field_manager', note: '' },
  { no: 'DA250520001', name: '김종희', phone: '010-6476-4696', email: 'jonghee.kim@daehan-at.co.kr', hire: '2025-05-20', dept: 'dept-09', rank: 'rank-01', title: 'title-3', jobClass: 'field_manager', note: '' },
  { no: 'DA251103001', name: '송희복', phone: '010-5502-6479', email: 'heebok.song@daehan-at.co.kr', hire: '2025-11-03', dept: 'dept-00', rank: 'rank-01', title: 'title-3', jobClass: 'field_manager', note: '' },
  { no: 'DA260105002', name: '아왈', phone: '010-3229-2114', email: 'awal.abdul@daehan-at.co.kr', hire: '2026-01-05', dept: 'dept-00', rank: 'rank-01', title: 'title-3', jobClass: 'field_manager', note: 'F-6' },
  { no: 'DA260401001', name: '최민식', phone: '010-4124-7499', email: 'minsik.choi@daehan-at.co.kr', hire: '2026-04-01', dept: 'dept-13', rank: 'rank-05', title: 'title-1', jobClass: 'field_manager', note: '' },
  { no: 'DA260401002', name: '최영희', phone: '010-9510-7198', email: 'younghee.choi@daehan-at.co.kr', hire: '2026-04-01', dept: 'dept-15', rank: 'rank-04', title: 'title-1', jobClass: 'field_manager', note: '' },
  { no: 'DA260401003', name: '박성건', phone: '010-8481-0079', email: 'sunggun.park@daehan-at.co.kr', hire: '2026-04-01', dept: 'dept-15', rank: 'rank-04', title: 'title-1', jobClass: 'field_manager', note: '' },
  { no: 'DA260401004', name: '김영일', phone: '010-8847-3585', email: 'youngil.kim@daehan-at.co.kr', hire: '2026-04-01', dept: 'dept-08', rank: 'rank-05', title: 'title-1', jobClass: 'field_manager', note: '' },
  { no: 'DA260401005', name: '김동식', phone: '010-9369-3485', email: 'dongsick.kim@daehan-at.co.kr', hire: '2026-04-01', dept: 'dept-08', rank: 'rank-01', title: 'title-1', jobClass: 'field_manager', note: '' },
  { no: 'DA260401006', name: '이종섭', phone: '010-4859-0437', email: 'jongseob.lee@daehan-at.co.kr', hire: '2026-04-01', dept: 'dept-08', rank: 'rank-01', title: 'title-4', jobClass: 'field_manager', note: '' },
  { no: 'DA260608002', name: '권병현', phone: '010-8577-7388', email: 'byeonghyeon.kwon@daehan-at.co.kr', hire: '2026-06-08', dept: 'dept-11', rank: 'rank-05', title: 'title-1', jobClass: 'field_manager', note: '' },
  { no: 'DA260810001', name: '정재훈', phone: '010-8875-2724', email: 'jeongjaehun@daehan-at.co.kr', hire: '2026-08-10', dept: 'dept-12', rank: 'rank-04', title: 'title-1', jobClass: 'field_manager', note: '' },
];

export const seedEmployees: Employee[] = ROSTER.map((r) => ({
  id: `e-${r.no}`,
  employee_number: r.no,
  name: r.name,
  name_en: null,
  email: r.email,
  phone: r.phone,
  birth_date: null,
  gender: null,
  address: null,
  address_detail: null,
  zip_code: null,
  department_id: r.dept,
  position_rank_id: r.rank,
  position_title_id: r.title,
  employment_type: 'regular',
  job_class: r.jobClass,
  // 현장 시급직만 시급제, 사무직·현장관리직은 월급제입니다.
  pay_method: r.jobClass === 'field' ? 'hourly' : 'monthly',
  hire_date: r.hire,
  resignation_date: null,
  status: 'active',
  base_salary: 0,
  hourly_wage: 0,
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
}));

// ---------------------------------------------------------------------------
// 부속 정보 — 명부에 없어 비워 둡니다 (사원카드에서 개별 입력)
// ---------------------------------------------------------------------------

export const seedCareerHistories: CareerHistory[] = [];
export const seedEducationHistories: EducationHistory[] = [];
export const seedCertifications: Certification[] = [];
export const seedFamilyMembers: FamilyMember[] = [];
