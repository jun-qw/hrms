export const POSITION_RANKS = [
  { name: '사원', level: 1 },
  { name: '대리', level: 2 },
  { name: '과장', level: 3 },
  { name: '차장', level: 4 },
  { name: '부장', level: 5 },
  { name: '이사', level: 6 },
  { name: '대표이사', level: 7 },
  { name: '회장', level: 8 },
] as const;

export const POSITION_TITLES = [
  { name: '팀원', level: 1 },
  { name: '파트장', level: 2 },
  { name: '팀장', level: 3 },
  { name: '실장', level: 4 },
  { name: '본부장', level: 5 },
  { name: '소장', level: 6 },
  { name: '대표이사', level: 7 },
  { name: '회장', level: 8 },
] as const;

export const EMPLOYMENT_TYPES = {
  regular: '정규직',
  contract: '계약직',
  parttime: '시간제',
  intern: '인턴',
} as const;

export const EMPLOYEE_STATUS = {
  active: '재직',
  on_leave: '휴직',
  resigned: '퇴직',
  retired: '정년퇴직',
} as const;

export const GENDER_LABELS = {
  M: '남성',
  F: '여성',
} as const;

export const DEGREE_LABELS = {
  high_school: '고등학교',
  associate: '전문학사',
  bachelor: '학사',
  master: '석사',
  doctorate: '박사',
} as const;
