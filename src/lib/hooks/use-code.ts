'use client';

import { useMemo } from 'react';
import { useCodeStore } from '@/lib/stores/code-store';

/**
 * 코드관리 브릿지 훅
 *
 * 코드 스토어(설정 > 코드관리)에서 동적으로 코드 라벨을 조회합니다.
 * 관리자가 설정에서 코드명을 변경하면 모든 화면에 즉시 반영됩니다.
 */

/** groupCode로 { code: label } Record를 반환 */
export function useCodeMap(groupCode: string): Record<string, string> {
  const codeGroups = useCodeStore((s) => s.codeGroups);
  const codeItems = useCodeStore((s) => s.codeItems);

  return useMemo(() => {
    const group = codeGroups.find(
      (g) => g.group_code === groupCode && g.is_active,
    );
    if (!group) return {};

    const today = new Date().toISOString().split('T')[0];
    const items = codeItems.filter((i) => {
      if (i.group_id !== group.id || !i.is_active) return false;
      if (i.effective_from && i.effective_from > today) return false;
      if (i.effective_to && i.effective_to < today) return false;
      return true;
    });

    const map: Record<string, string> = {};
    for (const item of items.sort((a, b) => a.sort_order - b.sort_order)) {
      map[item.code] = item.label;
    }
    return map;
  }, [codeGroups, codeItems, groupCode]);
}

/** 코드값으로 라벨 조회 (fallback 지원) */
export function useCodeLabel(groupCode: string, code: string, fallback?: string): string {
  const map = useCodeMap(groupCode);
  return map[code] ?? fallback ?? code;
}

/** Select/드롭다운용 옵션 배열 반환 */
export function useCodeOptions(groupCode: string): { value: string; label: string }[] {
  const map = useCodeMap(groupCode);
  return useMemo(
    () => Object.entries(map).map(([value, label]) => ({ value, label })),
    [map],
  );
}

// ---------------------------------------------------------------------------
// 코드 그룹 코드 상수 (타이핑 실수 방지용)
// ---------------------------------------------------------------------------

export const CODE = {
  ATTENDANCE_STATUS: 'ATTENDANCE_STATUS',
  LEAVE_TIME_PERIODS: 'LEAVE_TIME_PERIODS',
  LEAVE_REQUEST_STATUS: 'LEAVE_REQUEST_STATUS',
  PAYROLL_STATUS: 'PAYROLL_STATUS',
  APPOINTMENT_TYPES: 'APPOINTMENT_TYPES',
  APPROVAL_STATUS: 'APPROVAL_STATUS',
  JOB_POSTING_STATUS: 'JOB_POSTING_STATUS',
  APPLICANT_STAGES: 'APPLICANT_STAGES',
  TRAINING_STATUS: 'TRAINING_STATUS',
  EVALUATION_STATUS: 'EVALUATION_STATUS',
  WORK_SCHEDULE_TYPES: 'WORK_SCHEDULE_TYPES',
  HOLIDAY_TYPES: 'HOLIDAY_TYPES',
  LEAVE_TYPE_CODES: 'LEAVE_TYPE_CODES',
  UNUSED_LEAVE_POLICIES: 'UNUSED_LEAVE_POLICIES',
  WORKFLOW_TYPE: 'WORKFLOW_TYPE',
  WORKFLOW_STATUS: 'WORKFLOW_STATUS',
  WORKFLOW_TASK_STATUS: 'WORKFLOW_TASK_STATUS',
  DOCUMENT_SUBMISSION_STATUS: 'DOCUMENT_SUBMISSION_STATUS',
  WORKFLOW_ASSIGNEE_ROLES: 'WORKFLOW_ASSIGNEE_ROLES',
  APPROVAL_DOCUMENT_TYPES: 'APPROVAL_DOCUMENT_TYPES',
  EMPLOYMENT_TYPES: 'EMPLOYMENT_TYPES',
  EMPLOYEE_STATUS: 'EMPLOYEE_STATUS',
  GENDER_LABELS: 'GENDER_LABELS',
  DEGREE_LABELS: 'DEGREE_LABELS',
  ATTENDANCE_TYPES: 'ATTENDANCE_TYPES',
  ATTENDANCE_CATEGORIES: 'ATTENDANCE_CATEGORIES',
  CERTIFICATE_TYPES: 'CERTIFICATE_TYPES',
  CONTRACT_STATUS: 'CONTRACT_STATUS',
  CONTRACT_TYPES: 'CONTRACT_TYPES',
  ISSUE_TYPES: 'ISSUE_TYPES',
  ISSUE_PRIORITY: 'ISSUE_PRIORITY',
  ISSUE_STATUS: 'ISSUE_STATUS',
  EVAL_GRADES: 'EVAL_GRADES',
} as const;
