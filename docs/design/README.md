# Handoff: HR Workspace (TalentOS)

## Overview
**TalentOS**는 한국 기업 환경(다우오피스 HR, WEHAGO, NOPSpro, 더존 Amaranth 등)을 참조한 **임직원·조직 관리 통합 워크스페이스**의 하이파이 디자인 시안입니다. 인사 담당자가 하루 종일 오가는 흐름 — 조직 트리 탐색 → 임직원 조회 → 인사기록/발령/근태/급여/교육 편집 — 을 하나의 3열 워크스페이스로 통합했습니다.

주 사용자는 **인사팀 관리자(HR Admin)** 이며, 재직 인원 1,000명 이상 규모의 국내 기업을 가정합니다.

## About the Design Files
이 번들에 포함된 HTML 파일은 **디자인 레퍼런스(design references)** 입니다. 최종 룩앤필과 상호작용을 시연하기 위해 만든 프로토타입일 뿐, 그대로 프로덕션에 배포하는 코드가 아닙니다.

개발자의 과제는 이 HTML 시안을 **대상 코드베이스의 기존 환경**(React, Vue, SwiftUI, Flutter 등)에서 **재구현**하는 것입니다. 코드베이스의 확립된 컴포넌트 라이브러리·스타일 토큰·아키텍처 패턴을 따라야 합니다. 코드베이스가 아직 없다면, 이 규모의 관리자 도구에 적합한 프레임워크(권장: React + TypeScript + Tailwind 또는 CSS-in-JS, 서버 상태 관리로 TanStack Query, 라우팅에 React Router)를 선택해 구현합니다.

## Fidelity
**High-fidelity (hifi)** — 색상, 타이포그래피, 여백, 상호작용이 최종 상태에 가깝게 명세되어 있습니다. 개발자는 이 시안을 **픽셀에 가깝게** 재현하되, 코드베이스에 이미 있는 기본 컴포넌트(Button, Input, Chip, Tabs 등)가 있다면 그것을 우선 사용해 통일성을 지키세요.

---

## Screens / Views

이 데모는 **단일 화면(임직원 관리 워크스페이스)** 입니다. 화면은 크게 다음 4개 영역으로 구성됩니다:

### 1. Global Top Bar (전역 네비게이션)
- **높이**: 56px, `position: sticky; top: 0; z-index: 40`
- **배경**: `#FFFFFF`, 하단 1px `#e6e1d8` 보더
- **구성**:
  - 브랜드: 22×22 다크 스퀘어 마크(`#141210`) + "TalentOS" Fraunces 20px 500 + "HR · v3.2" 캡션(11px, uppercase, letter-spacing 0.08em, `#6b6660`)
  - 메인 네비 8개 탭: 대시보드 / **인사관리(active)** / 조직관리 / 근태·휴가 / 급여 / 평가 / 보고서 / 설정
    - 활성 탭: `#141210` 텍스트, `#efeae1` 배경, 6px radius
    - 비활성: `#6b6660` 텍스트, 호버 시 `#1f1d1a`
  - 전역 검색바: 280px 폭, 라운드 6px, `⌘K` kbd 뱃지, placeholder "사번, 이름, 부서로 빠르게 이동…"
  - 알림·도움말 아이콘 버튼(32×32)
  - 우측 프로필 블록: 30px 원형 아바타 + "정지훈 매니저 / 인사팀 · HR Admin"

### 2. Page Header (페이지 헤더)
- **패딩**: 22px 28px 18px, 배경 `#f7f5f1`, 하단 1px 보더
- **좌측**:
  - Breadcrumbs: "인사관리 / 임직원 / **전체 임직원**" (12px, `#6b6660`)
  - Page title: `<h1>` Fraunces 34px 500, letter-spacing -0.025em, "임직원과 조직을 **한 화면**에서." (강조어 `한 화면`은 italic + `#1E3A8A`)
  - Sub: 13.5px `#6b6660`, max-width 620px, 화면 사용법 안내 한 문장
- **우측 KPI 그리드**: 4열, 1px 갭 보더 스타일, 8px radius overflow hidden
  - 재직 인원 · 1,284명 · ▲ 12 이번 달
  - 신규 입사 · 18명 · 3분기 온보딩 진행
  - 진행 발령 · 7건 · 결재 대기 3건
  - 평균 근속 · 5.4년 · ▼ 0.2 YoY
  - 각 KPI: label(11px uppercase `#6b6660`) + val(Fraunces 24px + 단위 12px sans) + delta(mono 10.5px)

### 3. Workspace (3열 메인 영역)
`display: grid; grid-template-columns: 260px 400px 1fr; min-height: calc(100vh - 56px - 128px);`

#### 3-A. Left Panel — 조직 트리 (260px)
- **Panel head**: 44px 높이, 배경 `#fbf9f5`, 하단 보더
  - Title "조직" (12px uppercase, letter-spacing 0.08em, `#6b6660`, 600)
  - Actions: 새 부서(+), 펼치기, 더보기 (26×26 icon-btn)
- **Tree search**: 상단 `<input placeholder="부서 검색">`, focus 시 `#1E3A8A` border + 3px `#e5eaf6` glow
- **Tree structure** (실제 데이터):
  - 다우 홀딩스 (1,284)
    - 본사 (412)
      - 대표이사실 (6)
      - 경영기획본부 (84) → 전략기획팀 12, 재무팀 18, 법무·컴플라이언스 9
      - 인사본부 (24) → 인사기획팀 6, **인사운영팀 10(default 선택)**, 인재개발팀 8
      - 마케팅본부 (62) → 브랜드팀 14, 퍼포먼스팀 22, 콘텐츠팀 12
    - 프로덕트 부문 (486) → 개발본부(312: 플랫폼42, 앱58, 데이터34, SRE18), 디자인본부 44, 프로덕트관리본부 30
    - 영업본부 (236) → 엔터프라이즈 46, SMB 62, 고객성공 38
    - 자회사·해외법인 (150) → 다우재팬(도쿄) 62, 다우베트남(하노이) 88
- **Tree row**:
  - 5px 8px 패딩, 4px radius
  - Chevron 14×14 (회전 애니메이션 150ms), 노드 타입 아이콘 16×16, 라벨(13px), 우측 카운트(mono 10.5px `#918b83`)
  - 호버: `#efeae1` 배경
  - **선택**: `#141210` 배경, `#f7f5f1` 텍스트, 아이콘/카운트도 화이트
  - Children: `margin-left: 14px; border-left: 1px dashed #d9d4cc; padding-left: 4px`
- **검색 하이라이트**: 매칭 텍스트를 `<mark>` 로 감싸 `#f4ecd6` 배경 적용

#### 3-B. Middle Panel — 임직원 리스트 (400px)
- **Panel head**: "임직원 · 86명" (숫자는 mono 400 `#918b83`), 정렬/열 설정/내보내기 액션
- **Filter chips** (14px 패딩 상하, wrap):
  - `[전체(on)] [재직] [휴직] [신규] [원격] [직급 ▾] [입사연도 ▾]`
  - 기본 chip: 4×10px, 100px radius, `#ffffff` bg, `#e6e1d8` border, 12px 텍스트
  - `.on`: `#141210` bg, `#f7f5f1` fg
  - `▾` 표시 chip: 점선 border
- **List header** (sticky top): 34px avatar / 이름·사번 / 78px 직급 / 74px 상태 (모두 10.5px uppercase `#918b83`)
- **Employee row**: 동일 그리드
  - 28px 원형 이니셜 아바타 (색상은 이름 해시 → 8색 팔레트 순환: `#3b4a7a #8a5a15 #2f6b4a #a3341f #5b3a7a #7a5b3b #3a6b7a #7a3a5b`)
  - 이름 13.5px 600, 사번 `#20140312` (mono 11px `#918b83`)
  - 팀명 · 역할 (11.5px `#6b6660`)
  - 직급 12px `#35322d`
  - 상태 badge(pill)
  - 호버: `#fbf9f5` 배경
  - **선택**: `#ffffff` 배경 + `inset 3px 0 0 #1E3A8A` (좌측 액센트 라인)
- **Status pill 스펙**:
  | 상태 | fg | bg |
  |------|-----|-----|
  | 재직 (on-duty) | `#2f6b4a` | `#dfece5` |
  | 휴직 (leave)   | `#8a5a15` | `#f5e6cd` |
  | 원격 (remote)  | `#1E3A8A` | `#e5eaf6` |
  | 신규 (new)     | `#b58a2b` | `#f4ecd6` |
  | 퇴사 (off)     | `#6b6660` | `#efeae1` |
  - 좌측 5×5 dot(currentColor), 11px 500, padding 2×8, 100px radius

#### 3-C. Right Panel — 임직원 상세
- **Detail hero** (24×28 패딩, 하단 보더):
  - 3열 그리드 `auto 1fr auto`
  - 좌: 72×72 원형 대형 아바타(Fraunces 28px 이니셜, 6px 그림자 `-6px rgba(20,18,16,.24)`)
  - 중: `<h1>` Fraunces 28px 500 이름 + 직급·직책 라벨(sans 13px, `#efeae1` bg, 3×8, 4px radius)
    - Meta line: 사번 · 팀 · 입사일(연차) · 상태 pill · 태그 chip들 (12.5px `#6b6660`, sep은 `·` `#d9d4cc`)
  - 배경 radial-gradient: `radial-gradient(600px 200px at 12% 0%, rgba(30,58,138,.06), transparent 70%)`
  - 우: 액션 버튼 2개
    - `[인사기록 다운로드]` (secondary btn: white bg, `#d9d4cc` border, 12.5px 500)
    - `[+ 발령 상신 ▾]` (primary btn: `#141210` bg, `#f7f5f1` fg)
- **Tabs** (28px 좌우 패딩, 하단 1px 보더, gap 4px):
  - 순서: 기본정보 / 발령이력(12) / 근태(30) / 급여 / 교육(6) / 평가 / 문서(24)
  - 각 탭: 12px 14px 패딩, 13px 500 `#6b6660`
  - 활성 탭: `#141210` 텍스트, 하단 2px `#141210` 밑줄, `margin-bottom: -1px`
  - 카운트 뱃지: mono 10.5px `#918b83` (활성 시 `#35322d`)
- **Tab body**: 24×28 패딩, 배경 `#ffffff`

##### 탭 상세 — 기본정보 (info)
1. **인적사항** 섹션 (title: Fraunces 17px 500 + mono "01" prefix)
   - 4열 fields 그리드, 각 필드: 12px 16px 패딩, 우/하 1px 보더, `#ffffff` bg on `#fbf9f5` container
   - 필드: 성명(한글)/사번(mono)/주민등록번호(마스킹 `841102-2******`, "암호화·열람 로그 기록" sub)/성별·생년월일 / 이메일(사번2칸 wide)/휴대전화/사내내선 / 주소(4칸 full)
2. **소속·직위** 섹션
   - 본부/팀/직급·직책/근무지 · 고용형태(정규직)/직군·직렬/입사일/수습종료(입사일 +3개월 자동)
3. **학력·계좌·4대보험** — 2열 카드
   - 좌 카드: 학교/전공·학위/졸업/자격증 (stat-line 스타일: k 12.5px `#6b6660`, v mono 13px 우측 정렬)
   - 우 카드: 급여 계좌/국민연금/건강보험/고용보험/산재보험 — 가입 상태는 `#2f6b4a`
4. **콜아웃**: 개인정보 열람 로그 (점선 dashed border, `#fbf9f5` bg, info 아이콘 `#1E3A8A`)

##### 탭 상세 — 발령이력 (assign)
- 4개 이벤트 타임라인 카드:
  - 각 row: `grid-template-columns: 110px 22px 1fr auto`, gap 16px, 14×20 패딩, 하단 보더
  - Date 컬럼: mono 12px `#35322d`, 부제(예: "2년 6개월") `#918b83`
  - Pipe 컬럼: 세로 1px `#d9d4cc` 연결선 + 10px 원형 dot
    - 현재 발령(`.now`): `#1E3A8A` 채움 dot
    - 과거: 흰 채움 + `#1E3A8A` 2px 보더
  - Body: h4 14px 600, p 12.5px `#6b6660`
  - Tag: 11px `#6b6660`, `#d9d4cc` 1px border, 3×8 패딩, 4px radius (예: HR-2024-001)
- 이벤트 예시: 2024.01.02 팀장 승진(현재) → 2021.07.01 전보 → 2019.01.01 차장 승진 → 입사(공채 기수)
- 하단 "진행 중인 발령" 카드: 결재대기 상태 + 결재선/확인 버튼

##### 탭 상세 — 근태 (att)
- **30일 히트맵**: `grid-template-columns: repeat(30, 1fr); gap: 3px`, cell은 aspect-ratio 1, 2px radius
  - 색상: 정상 `#cfe0d3` / 연장 `#a4c1ac` / 재택 `#e5eaf6` / 휴가 `#f5e6cd` / 지각 `#f2dcd6` / 휴일 `#efeae1`
- **범례**: 10×10 컬러 스퀘어 + 라벨 (11.5px `#6b6660`)
- **하단 2열 카드**:
  - 근무 요약: 기본 168h / 연장 12.5h / 재택 32h / 평균 출근 08:52 / 지각·조퇴 1·0 (지각은 `#a3341f`)
  - 연차·휴가: 부여 17일 / 사용 9.5일 / 잔여 7.5일(`#2f6b4a`) / 보건·경조 1·0 / 마감 2026.12.31

##### 탭 상세 — 급여 (pay)
- **3분할 meta-strip**: 지급 총액 ₩6,320,000 / 공제 −₩812,540(`#a3341f`) / 실 수령 ₩5,507,460(`#1E3A8A`)
  - 각 값: Fraunces 18px 500, -0.02em tracking
- **2열 카드**:
  - 지급: 기본급 4,800,000 / 직책수당 400,000 / 식대 200,000 / 연장근로 620,000 / 복지포인트 300,000
  - 공제: 국민연금(4.5%) −284,400 / 건강보험 −224,120 / 장기요양 −29,010 / 고용보험 −56,880 / 소득세·지방 −218,130
- 콜아웃: 연말정산 환급 +₩284,000 (`#b58a2b` icon)

##### 탭 상세 — 교육 (edu)
- **법정의무교육** 5줄 (성희롱예방/괴롭힘예방/개인정보/산업안전보건/장애인 인식개선)
  - 이수: `#2f6b4a`, 예정: `#8a5a15` "D-11" 카운트다운
- **선택 교육 이력**: HR 리더십 스쿨 96h / People Analytics 40h

### 4. Right-panel Empty State
임직원 필터 결과가 0인 경우: 중앙 정렬, Fraunces 22px `#6b6660` "임직원을 선택해 주세요" + sub 13px `#918b83`

---

## Interactions & Behavior

### Tree (좌측)
- **Chevron 클릭** → 해당 노드의 자식 펼침/접힘 토글 (openIds Set 관리)
- **Row 클릭 (chevron 외)** → 해당 부서 선택 (`selectedDeptId` 갱신) + 자동 펼침, 중앙 리스트 재렌더링
- **상위 부서 선택** 시 하위 리프(leaf 팀) 소속 임직원 모두 표시
- **Tree search input** → 매칭 텍스트에 `<mark>` 하이라이트 (필터링은 아님, 강조만)

### Employee List (중앙)
- **Filter chip 클릭** → 상태 필터 갱신 (all/on-duty/leave/new/remote), 활성 chip은 `#141210`
- **Row 클릭** → 우측 상세 갱신
- **필터 결과에 selected가 없으면** 자동으로 첫 번째 임직원 선택
- **결과 0개**: "해당 부서에 데이터가 없습니다" 빈 상태

### Detail (우측)
- **Tab 클릭** → activeTab 갱신, tab body만 재렌더링(hero는 유지)
- **Primary/Secondary 버튼**: 호버 시 border 색 진해짐(`#b8b2a9`) / bg 진해짐(`#1f1d1a`)

### 애니메이션
- Chevron 회전: `transition: transform 150ms ease`
- 그 외 상태 전환은 즉시(no transition) — 밀도 높은 관리 도구의 반응성 우선

### Keyboard (스펙만 정의, 현 프로토타입 미구현)
- `⌘K` / `Ctrl+K` → 전역 검색바 포커스
- `↑ ↓` → 리스트 내 임직원 이동
- `← →` → 탭 이동
- `/` → 트리 검색 포커스

---

## State Management

프로토타입에서는 모듈 변수 3개로 관리:
- `selectedDeptId` (string, default `"hr-ops"`) — 좌측 선택 부서 ID
- `openIds` (Set<string>) — 펼쳐진 트리 노드 ID들
- `selectedEmpId` (string) — 중앙 선택 임직원 사번
- `statusFilter` (string, default `"all"`) — 상태 필터 값
- `activeTab` (string, default `"info"`) — 우측 활성 탭

프로덕션 구현 시:
- **URL 상태화 권장**: `/hr/employees?dept=hr-ops&emp=20140312&tab=info&status=all` — 새로고침·공유 링크 대응
- **서버 데이터**: `GET /api/orgs/tree`, `GET /api/employees?deptId=...&status=...`, `GET /api/employees/:id`, `GET /api/employees/:id/appointments|attendance|payroll|education`
- **캐싱**: TanStack Query 또는 SWR로 부서·임직원 응답 캐시, 팀 이동/발령 뮤테이션 후 부분 무효화
- **권한**: 주민번호·계좌 등 민감 필드는 `RBAC(role=HR_ADMIN)` + 열람 로그 서버 이벤트 전송

---

## Design Tokens

### Colors
```css
/* Ink scale (그레이 대체 웜뉴트럴) */
--ink-900: #141210;   /* 본문·강조 */
--ink-800: #1f1d1a;
--ink-700: #35322d;
--ink-500: #6b6660;   /* 서브 텍스트 */
--ink-400: #918b83;   /* 캡션 */
--ink-300: #b8b2a9;
--ink-200: #d9d4cc;   /* 보더 */
--ink-150: #e6e1d8;   /* 얕은 보더 */
--ink-100: #efeae1;   /* 얕은 배경 */

/* Paper (배경) */
--paper:   #f7f5f1;   /* 페이지 배경 */
--paper-2: #fbf9f5;   /* 서브 배경 */
--white:   #ffffff;

/* Accent */
--accent:      #1E3A8A;   /* 잉크 블루 (주 액센트) */
--accent-2:    #2a4bb0;
--accent-tint: #e5eaf6;
--gold:        #b58a2b;
--gold-tint:   #f4ecd6;

/* Semantic */
--success:      #2f6b4a;
--success-tint: #dfece5;
--danger:       #a3341f;
--danger-tint:  #f2dcd6;
--warn:         #8a5a15;
--warn-tint:    #f5e6cd;
```

### Typography
- **Sans (본문 · UI)**: `"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif`
- **Serif (제목 · 수치 강조)**: `"Fraunces", ui-serif, Georgia, serif`, `font-optical-sizing: auto`, letter-spacing `-0.01em ~ -0.025em`
- **Mono (사번 · 날짜 · 금액)**: `"JetBrains Mono", ui-monospace, Menlo, monospace`, `font-feature-settings: "tnum" 1`
- **Body**: `font-feature-settings: "ss01","tnum"`, `-webkit-font-smoothing: antialiased`

**스케일**:
| 용도 | 폰트 | 크기 | 웨이트 | tracking |
|------|------|------|--------|----------|
| Page title (h1) | Fraunces | 34px | 500 | -0.025em |
| Detail hero name | Fraunces | 28px | 500 | -0.025em |
| KPI value | Fraunces | 24px | 500 | -0.02em |
| Section title | Fraunces | 17px | 500 | -0.015em |
| Meta-strip value | Fraunces | 18px | 500 | -0.02em |
| Panel head | Sans | 12px | 600 | 0.08em uppercase |
| Emp name | Sans | 13.5px | 600 | -0.01em |
| Body | Sans | 13-13.5px | 400-500 | 0 |
| Meta / sub | Sans | 12-12.5px | 400 | `#6b6660` |
| Caption / label | Sans | 11px | 500 | 0.06em uppercase |
| Micro | Mono | 10.5-11px | 400-500 | tnum |

### Spacing
6 → 8 → 10 → 12 → 14 → 16 → 20 → 24 → 28 → 36px (밀도 높은 관리 도구 스케일, 4의 배수 위주)

### Radius
- Standard: `6px` (--r)
- Cards: `10px` (--r-lg)
- Pills / chips: `100px`
- Icon buttons: `4px`
- Avatars: `50%`

### Shadow
```css
--shadow-1: 0 1px 0 rgba(20,18,16,.04), 0 1px 2px rgba(20,18,16,.04);
--shadow-2: 0 8px 24px -8px rgba(20,18,16,.12), 0 2px 4px rgba(20,18,16,.04);
```
아바타 대형: `0 6px 16px -6px rgba(20,18,16,.24), inset 0 0 0 1px rgba(255,255,255,.15)`

### Layout
- Top bar 56px · Page header 128px 내외 · Workspace `calc(100vh - 184px)`
- Workspace columns: `260px / 400px / 1fr`
- Panel head: 44px height, `#fbf9f5` bg
- Min body width: 1440px (관리 도구 특성상 데스크톱 전용)

---

## Assets

이 데모는 **외부 이미지/아이콘 라이브러리 없이** 모두 인라인 SVG 아이콘으로 구성되어 있습니다.

- **아이콘 세트**: 커스텀 인라인 SVG (Lucide 스타일 stroke 1.8-2, `currentColor`). 프로덕션에서는 [Lucide](https://lucide.dev) 또는 [Tabler Icons](https://tabler-icons.io) 사용 권장.
- **아바타**: 이름 해시 기반 8색 팔레트에서 색상 선택 + 이니셜 2자(성+이름 첫자)
- **폰트 CDN** (프로덕션에서는 self-host 권장):
  - Pretendard Variable: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css`
  - Fraunces + JetBrains Mono: Google Fonts
- **한국 HR 도메인 필드 참조**: 다우오피스 HR, WEHAGO T, NOPSpro 등 국내 그룹웨어 인사기록 화면

---

## Files

- **`TalentOS - HR System.html`** — 프로토타입 원본. 단일 HTML 파일에 `<style>`, mock 데이터, 렌더링 로직이 모두 포함되어 있습니다. 코드 구조:
  1. `:root` CSS 토큰 정의 (약 60줄)
  2. 컴포넌트별 CSS (topbar / pageheader / workspace / tree / emp-list / detail / timeline / att-grid …)
  3. HTML markup — 상단바, 페이지 헤더, 3열 workspace
  4. `<script>` 하단부:
     - `ORG` 트리 데이터 (본사·프로덕트·영업·자회사 구조)
     - `EMPLOYEES` 배열 (9명의 mock 인사기록: 사번, 이름, 팀, 직급, 상태, 개인정보, 학력, 계좌 등)
     - `renderTree()` / `renderEmpList()` / `renderDetail()` / `renderTabBody()`
     - 인터랙션: 클릭 위임(chip filter, tab click)

프로덕션 구현 시 참고:
- 각 탭 뷰(`tabInfo`, `tabAssign`, `tabAtt`, `tabPay`, `tabEdu`)를 별도 컴포넌트로 분리
- `<Fields>`, `<StatLine>`, `<StatusBadge>`, `<Timeline>`, `<AttGrid>` 등을 재사용 가능한 프리미티브로 추출
- 조직 트리는 재귀 컴포넌트(`<TreeNode>`)로 구현
- 200명 이상 리스트는 가상 스크롤(react-virtual 등) 적용
