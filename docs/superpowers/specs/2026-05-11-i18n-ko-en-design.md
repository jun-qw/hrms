# i18n (한/영 옵션) 설계 — 인프라 + 핵심 UI

- 날짜: 2026-05-11
- 범위: i18n 인프라 + 사이드바/헤더/공통 칭크롬 + 공통 토스트
- 비범위: 페이지 본문, 도메인 용어, 비즈니스 로직 내부 토스트

## 1. 배경 및 목표

HRMS는 현재 196개 TS/TSX 파일에 한글 UI가 하드코딩되어 있고, 별도 i18n 인프라가 없다.
이번 작업은 향후 점진적으로 영문 지원을 확장할 수 있는 **자체 구현 i18n 인프라**를 구축하고,
가장 자주 노출되는 **크롬 영역**(사이드바, 헤더, 공통 버튼/토스트)에 한·영 전환을 적용한다.

핵심 의사결정:
- 외부 라이브러리(next-intl, react-i18next) **사용 안 함** — Zustand가 이미 글로벌 상태를 관리하고 있으며, URL 경로 변경 없이 토글 가능해야 함
- 언어 전환은 헤더 우측 드롭다운(KO / EN)에서 이루어진다
- 페이지 본문 번역은 이번 작업의 비범위이며, 별도 PR에서 점진적으로 추가

## 2. 아키텍처

```
settings-store.display.locale ∈ {'ko', 'en'}
       │
       ├─ <LanguageToggle/>  (Header)
       │     └─ updateDisplay({ locale })
       │
       ├─ useT() hook
       │     └─ dictionaries[locale][key]  →  fallback: ko[key]  →  key
       │
       └─ <DisplaySettingsApplier/>
             └─ document.documentElement.lang = locale
```

원칙:
- **단일 진실의 원천**: 모든 컴포넌트가 `settings-store.display.locale`을 구독한다
- **Provider 불필요**: Zustand로 충분하다. `useT()`는 store에서 locale을 읽고 dictionary lookup만 수행
- **타입 안전성**: dictionary 키는 union 타입으로 추출되어 `t('...')` 호출에서 자동완성/타입체크 가능
- **폴백 체인**: `en[key] ?? ko[key] ?? key` (영문 누락 키는 한글로 보이고, 둘 다 없으면 키 그대로 + dev 환경에서 `console.warn`)

## 3. 컴포넌트 단위 설계

### 3.1 Dictionary

위치: `src/lib/i18n/dictionaries/{ko,en}.ts`

구조: 네임스페이스로 평탄화된 객체 (도트로 구분).

```typescript
// dictionaries/ko.ts
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

  // 메뉴 (라벨)
  'menu.dashboard': '대시보드',
  'menu.organization': '조직도',
  'menu.employees': '인사정보',
  'menu.attendance': '근태관리',
  'menu.leave': '휴가관리',
  'menu.payroll': '급여관리',
  'menu.appointments': '인사발령',
  'menu.approval': '전자결재',
  'menu.workflows': '업무흐름',
  'menu.issues': '이슈',
  'menu.training': '교육관리',
  'menu.recruitment': '채용관리',
  'menu.evaluation': '평가관리',
  'menu.auditLog': '감사로그',
  'menu.settings': '설정',
  'menu.my': '내 정보',

  // 메뉴 그룹
  'menuGroup.main': '주요',
  'menuGroup.hr': '인사',
  'menuGroup.operation': '운영',
  'menuGroup.system': '시스템',

  // 헤더
  'header.searchPlaceholder': '검색...',
  'header.myInfo': '내 정보',
  'header.logout': '로그아웃',
  'header.language': '언어',

  // 역할 (Role)
  'role.admin': '시스템관리자',
  'role.hr_manager': '인사담당자',
  'role.dept_manager': '부서관리자',
  'role.employee': '일반사원',

  // 공통 토스트
  'toast.saved': '저장되었습니다',
  'toast.deleted': '삭제되었습니다',
  'toast.updated': '수정되었습니다',
  'toast.error': '오류가 발생했습니다',
  'toast.networkError': '네트워크 오류가 발생했습니다',
  'toast.requiredField': '필수 항목을 입력해주세요',
} as const;
```

```typescript
// dictionaries/en.ts
export const en: Record<keyof typeof ko, string> = {
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  // ...
  'menu.dashboard': 'Dashboard',
  'menu.organization': 'Organization',
  'menu.employees': 'Employees',
  // ...
};
```

타입은 `ko`에서 추출하여 `en`이 동일 키셋을 가지도록 강제한다. 키가 누락되면 TS 컴파일 에러.

### 3.2 Types

위치: `src/lib/i18n/types.ts`

```typescript
import type { ko } from './dictionaries/ko';

export type Locale = 'ko' | 'en';
export type TranslationKey = keyof typeof ko;
export type Dictionary = Record<TranslationKey, string>;
```

### 3.3 useT() hook

위치: `src/lib/i18n/use-translation.ts`

```typescript
'use client';

import { useSettingsStore } from '@/lib/stores/settings-store';
import { ko } from './dictionaries/ko';
import { en } from './dictionaries/en';
import type { Locale, TranslationKey, Dictionary } from './types';

const dictionaries: Record<Locale, Dictionary> = { ko, en };

export function useT() {
  const locale = useSettingsStore((s) => s.display.locale);
  const t = (key: TranslationKey, vars?: Record<string, string | number>): string => {
    const dict = dictionaries[locale];
    const fallback = dictionaries.ko;
    let value = dict[key] ?? fallback[key];
    if (value === undefined) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[i18n] missing key: ${key}`);
      }
      return key;
    }
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }
    return value;
  };
  return { t, locale };
}
```

Interpolation은 `{{var}}` 형식: `t('greeting', { name: 'Alice' })` → `Hello, {{name}}` → `Hello, Alice`.

### 3.4 Language Toggle

위치: `src/components/layout/language-toggle.tsx`

헤더 우측 드롭다운: `Languages` 아이콘 + 현재 locale 라벨, 클릭 시 KO/EN 선택.

```tsx
'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useT } from '@/lib/i18n/use-translation';

export function LanguageToggle() {
  const { locale } = useT();
  const updateDisplay = useSettingsStore((s) => s.updateDisplay);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium">{locale === 'ko' ? '한' : 'EN'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => updateDisplay({ locale: 'ko' })}>한국어</DropdownMenuItem>
        <DropdownMenuItem onClick={() => updateDisplay({ locale: 'en' })}>English</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 3.5 settings-store 변경

- `DisplayState`에 `locale: Locale` 추가
- 초기값 `locale: 'ko'`
- `version: 6 → 7`, migration에서 `display.locale = 'ko'` 보장

### 3.6 html lang 동기화

`src/components/layout/display-settings-applier.tsx`에 effect 추가:

```typescript
useEffect(() => {
  document.documentElement.lang = locale;
}, [locale]);
```

`src/app/layout.tsx`의 `<html lang="ko">`는 SSR 초기값으로 유지(hydration 안전). 클라이언트가 hydrate 후 settings store에서 읽은 locale로 갱신.

## 4. 변경되는 파일 목록

### 신규 (5개)
- `src/lib/i18n/dictionaries/ko.ts`
- `src/lib/i18n/dictionaries/en.ts`
- `src/lib/i18n/types.ts`
- `src/lib/i18n/use-translation.ts`
- `src/components/layout/language-toggle.tsx`

### 수정 (6개)
- `src/lib/stores/settings-store.ts` — `display.locale` + migration v7
- `src/lib/constants/menu-items.ts` — `label`을 번역 키로 (`'menu.dashboard'`)
- `src/components/layout/sidebar.tsx` — `t(item.label)`, `t(group.label)`
- `src/components/layout/header.tsx` — 검색·내 정보·로그아웃·역할 라벨 i18n + `<LanguageToggle/>` 배치
- `src/components/layout/display-settings-applier.tsx` — `<html lang>` 동기화
- (필요 시) `src/components/layout/notification-bell.tsx` — 라벨 i18n (간단한 것만)

## 5. 데이터 흐름

```
[유저가 LanguageToggle에서 EN 클릭]
  → updateDisplay({ locale: 'en' })
  → Zustand persist가 localStorage에 저장
  → settings-store 구독자들 리렌더
  → useT()를 쓰는 컴포넌트들이 영문 dictionary로 lookup
  → DisplaySettingsApplier가 document.documentElement.lang = 'en'
```

## 6. 에러 처리 / 엣지 케이스

- **영문 키 누락**: 한글로 폴백, dev에서 `console.warn`. 사용자에게는 빈 화면 없음.
- **둘 다 누락**: 키 자체를 출력 (예: `menu.unknown`). 명시적 표시로 누락을 알아챌 수 있음.
- **Hydration mismatch**: `<html lang>` 초기값은 SSR에서 `ko` 고정. 사용자가 EN을 선택했다면 클라이언트 마운트 후 갱신됨. `suppressHydrationWarning`이 이미 적용되어 있어 경고 없음.
- **interpolation 변수 누락**: `{{var}}`이 그대로 남음. 명시적 누락 신호.

## 7. 테스트 / 검증 (수동)

- KO → EN 토글 시 사이드바·헤더·검색 placeholder 즉시 영문 전환
- 새로고침 후 선택한 언어 유지 (localStorage persist)
- 영문 사전에서 키 하나 삭제 → 해당 위치만 한글로 폴백 + 콘솔 경고
- `document.documentElement.lang` 속성이 `'en'`/`'ko'`로 갱신
- 헤더의 역할(`시스템관리자` 등)이 영문 (`System Admin` 등)으로 변경
- 메뉴 그룹명/항목명 모두 전환됨

## 8. 향후 확장 (비범위, 참고)

이 spec에서 다루지 않지만 동일 인프라로 가능:
- 페이지별 번역: 각 `app/<module>/page.tsx`에서 `useT()` 호출하며 dictionary에 키 추가
- 도메인 용어 사전 분리: `dictionaries/domain.ts` (연차, 결재, 발령 등 — 별도 용어 가이드 필요)
- 토스트 헬퍼: `toastT(key)` 헬퍼로 비즈니스 로직의 토스트 메시지를 점진적으로 i18n화
- 날짜/숫자 포맷: 이미 `date_format` 설정이 있으므로 locale-aware 포맷터로 통합 가능

## 9. 마이그레이션

```typescript
// settings-store version 6 → 7
if (version < 7) {
  const display = (state.display as Record<string, unknown> | undefined) ?? {};
  state = {
    ...state,
    display: { ...display, locale: display.locale ?? 'ko' },
  };
}
```

기존 사용자도 한글 기본값으로 진입하며, 명시적으로 EN을 선택해야 영문으로 전환된다.
