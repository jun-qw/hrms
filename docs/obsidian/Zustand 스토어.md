---
tags: [hrms, architecture, zustand, store]
created: 2026-03-09
---

# Zustand 스토어

> 경로: `src/lib/stores/`

## 개요

모든 상태관리는 Zustand 5 영속 스토어로 구현되어 있다. `persist` 미들웨어를 사용하여 localStorage에 상태를 저장하므로, 새로고침 후에도 데이터가 유지된다.

## 스토어 목록

### employee-store
> `src/lib/stores/employee-store.ts`

| 상태 | 설명 |
|------|------|
| `employees` | 전체 직원 목록 |
| `departments` | 부서 목록 (계층 구조) |
| `positionRanks` | 직급 목록 |
| `positionTitles` | 직책 목록 |
| `jobCategories` | 직무 분류 |
| `salaryGrades` | 호봉 테이블 |

관련: [[인사정보 관리]], [[조직도]]

---

### attendance-store
> `src/lib/stores/attendance-store.ts`

| 상태 | 설명 |
|------|------|
| `records` | 근태 기록 |
| `addRecord()` | 근태 등록 |

관련: [[근태관리]]

---

### leave-store
> `src/lib/stores/leave-store.ts`

| 상태 | 설명 |
|------|------|
| `leaveTypes` | 휴가 유형 |
| `leaveBalances` | 잔여일수 |
| `leaveRequests` | 휴가 신청 |
| `cancelLeaveRequest()` | 휴가 취소 |

관련: [[연차관리]]

---

### payroll-store
> `src/lib/stores/payroll-store.ts`

| 상태 | 설명 |
|------|------|
| `savedPayrolls` | 급여 기록 |
| `updatePayrollStatus()` | 상태 변경 |
| `deletePayroll()` | 급여 삭제 |

관련: [[급여관리]]

---

### appointment-store
> `src/lib/stores/appointment-store.ts`

| 상태 | 설명 |
|------|------|
| `appointments` | 발령 이력 |

관련: [[인사발령]]

---

### approval-store
> `src/lib/stores/approval-store.ts`

| 상태 | 설명 |
|------|------|
| `approvals` | 결재 목록 (ApprovalLine 포함) |

관련: [[전자결재]]

---

### issue-store
> `src/lib/stores/issue-store.ts`

| 상태 | 설명 |
|------|------|
| `issues` | HR 이슈 목록 |

관련: [[HR이슈 관리]]

---

### workflow-store
> `src/lib/stores/workflow-store.ts`

| 상태 | 설명 |
|------|------|
| `templates` | 워크플로우 템플릿 |
| `instances` | 워크플로우 인스턴스 |
| `createInstance()` | 인스턴스 생성 |

관련: [[워크플로우]]

---

### audit-log-store
> `src/lib/stores/audit-log-store.ts`

| 상태 | 설명 |
|------|------|
| `logs` | 감사 로그 |
| `addLog()` | 로그 추가 |
| `clearLogs()` | 전체 삭제 |

관련: [[감사로그]]

---

### auth-store
> `src/lib/stores/auth-store.ts`

| 상태 | 설명 |
|------|------|
| `session` | 현재 로그인 세션 |
| `loginDemo()` | 이메일/비밀번호 데모 로그인 |
| `loginDemoByRole()` | 역할별 빠른 로그인 |
| `logout()` | 로그아웃 |
| `DEMO_ACCOUNTS` | 데모 계정 목록 |

관련: [[로그인]]

---

### settings-store
> `src/lib/stores/settings-store.ts`

| 상태 | 설명 |
|------|------|
| `menuPermissions` | 역할별 메뉴 권한 |
| `displaySettings` | 화면 설정 |
| `printSettings` | 출력 설정 |
| 기타 설정값 | 근무/휴가/급여/보안 등 |

관련: [[설정]]

---

### code-store
> `src/lib/stores/code-store.ts`

| 상태 | 설명 |
|------|------|
| `codes` | 마스터 코드 테이블 |

관련: [[설정]]

---

### change-history-store
> `src/lib/stores/change-history-store.ts`

| 상태 | 설명 |
|------|------|
| `histories` | 설정 변경 이력 |

관련: [[설정]]
