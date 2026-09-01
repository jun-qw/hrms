export const ko = {
  // 공통 UI
  'common.save': '저장',
  'common.cancel': '취소',
  'common.edit': '수정',
  'common.delete': '삭제',
  'common.search': '검색',
  'common.next': '다음',
  'common.prev': '이전',
  'common.confirm': '확인',
  'common.close': '닫기',
  'common.required': '필수',
  'common.loading': '불러오는 중...',
  'common.noData': '데이터가 없습니다',
  'common.searchPlaceholder': '검색...',

  // 메뉴 라벨
  'menu.dashboard': '대시보드',
  'menu.myPage': '마이페이지',
  'menu.organization': '조직도',
  'menu.employees': '인사정보',
  'menu.appointments': '인사발령',
  'menu.attendance': '근태관리',
  'menu.leave': '휴가관리',
  'menu.payroll': '급여관리',
  'menu.recruitment': '채용관리',
  'menu.training': '교육관리',
  'menu.evaluation': '평가관리',
  'menu.approval': '전자결재',
  'menu.contracts': '전자계약',
  'menu.auditLog': '감사로그',
  'menu.settings': '설정',

  // 메뉴 설명 (command palette subtitle)
  'menuDesc.dashboard': '메인 대시보드',
  'menuDesc.myPage': '내 정보 관리',
  'menuDesc.organization': '조직 구조 관리',
  'menuDesc.employees': '사원 정보 관리',
  'menuDesc.appointments': '인사발령 관리',
  'menuDesc.attendance': '출퇴근/근태 관리',
  'menuDesc.leave': '휴가 신청/관리',
  'menuDesc.payroll': '급여 계산/관리',
  'menuDesc.recruitment': '채용공고/지원자 관리',
  'menuDesc.training': '교육 과정/이수 관리',
  'menuDesc.evaluation': '인사평가 관리',
  'menuDesc.approval': '전자결재 시스템',
  'menuDesc.contracts': '근로계약서 관리',
  'menuDesc.auditLog': '시스템 감사 로그',
  'menuDesc.settings': '시스템 설정',

  // 메뉴 그룹
  'menuGroup.home': '홈',
  'menuGroup.hr': '인사관리',
  'menuGroup.work': '근무관리',
  'menuGroup.payroll': '급여관리',
  'menuGroup.talent': '인재개발',
  'menuGroup.support': '업무지원',
  'menuGroup.system': '시스템',

  // 헤더
  'header.myInfo': '내 정보',
  'header.logout': '로그아웃',
  'header.kbdHint': '⌘K',

  // Command Palette
  'commandPalette.title': '글로벌 검색',
  'commandPalette.description': '직원, 메뉴를 검색합니다',
  'commandPalette.inputPlaceholder': '검색어를 입력하세요... (직원, 메뉴)',
  'commandPalette.empty': '검색 결과가 없습니다.',
  'commandPalette.groupEmployees': '직원',
  'commandPalette.groupMenus': '메뉴',

  // 언어 전환
  'language.korean': '한국어',
  'language.english': 'English',
  'language.label.ko': '한',
  'language.label.en': 'EN',

  // 역할
  'role.admin': '시스템관리자',
  'role.hr_manager': '인사담당자',
  'role.dept_manager': '부서관리자',
  'role.employee': '일반사원',

  // 알림 (notification bell)
  'notification.title': '알림',
  'notification.unreadBadge': '{{count}}개 미확인',
  'notification.markAllRead': '모두 읽음',
  'notification.clearAllConfirm': '모든 알림을 삭제하시겠습니까?',
  'notification.empty': '알림이 없습니다.',
  'notification.timeAgo.justNow': '방금',
  'notification.timeAgo.minutes': '{{count}}분 전',
  'notification.timeAgo.hours': '{{count}}시간 전',
  'notification.timeAgo.days': '{{count}}일 전',

  // 공통 토스트
  'toast.saved': '저장되었습니다',
  'toast.deleted': '삭제되었습니다',
  'toast.updated': '수정되었습니다',
  'toast.error': '오류가 발생했습니다',
  'toast.networkError': '네트워크 오류가 발생했습니다',
  'toast.requiredField': '필수 항목을 입력해주세요',
} as const;
