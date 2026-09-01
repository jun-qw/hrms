'use client';

import type { Employee, PositionRank } from '@/types';

/**
 * 결재 라인 자동 탐색 헬퍼
 *
 * 신청자의 소속 부서에서 팀장 → 상위 부서장 순서로 결재자를 찾아줍니다.
 */

interface FindApproversParams {
  requesterId: string;
  employees: Employee[];
  positionRanks: PositionRank[];
  departments: { id: string; parent_id: string | null }[];
  /** 몇 단계까지 결재를 올릴지 (기본 2: 팀장 + 본부장) */
  maxLevels?: number;
}

/**
 * 신청자의 소속 부서에서 가장 높은 직급을 가진 사람(본인 제외)을 찾아
 * 최대 `maxLevels` 명의 결재자 체인을 반환합니다.
 *
 * 1단계: 신청자와 같은 부서에서 가장 높은 직급자 (팀장)
 * 2단계: 상위 부서에서 가장 높은 직급자 (본부장)
 */
export function findApprovers({
  requesterId,
  employees,
  positionRanks,
  departments,
  maxLevels = 2,
}: FindApproversParams): Employee[] {
  const requester = employees.find((e) => e.id === requesterId);
  if (!requester) return [];

  const rankLevel = (empId: string): number => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return 0;
    return positionRanks.find((r) => r.id === emp.position_rank_id)?.level ?? 0;
  };

  const requesterLevel = rankLevel(requesterId);
  const approvers: Employee[] = [];
  const visited = new Set<string>([requesterId]);

  // 1단계: 같은 부서에서 가장 높은 직급자 (팀장)
  const sameDeptCandidates = employees
    .filter(
      (e) =>
        e.department_id === requester.department_id &&
        e.status === 'active' &&
        !visited.has(e.id) &&
        rankLevel(e.id) > requesterLevel,
    )
    .sort((a, b) => rankLevel(b.id) - rankLevel(a.id));

  if (sameDeptCandidates[0]) {
    approvers.push(sameDeptCandidates[0]);
    visited.add(sameDeptCandidates[0].id);
  }

  // 2단계: 상위 부서에서 가장 높은 직급자 (본부장)
  if (approvers.length < maxLevels && requester.department_id) {
    const dept = departments.find((d) => d.id === requester.department_id);
    if (dept?.parent_id) {
      const parentDeptEmployees = employees
        .filter(
          (e) =>
            e.department_id === dept.parent_id &&
            e.status === 'active' &&
            !visited.has(e.id),
        )
        .sort((a, b) => rankLevel(b.id) - rankLevel(a.id));

      if (parentDeptEmployees[0]) {
        approvers.push(parentDeptEmployees[0]);
        visited.add(parentDeptEmployees[0].id);
      }
    }
  }

  // Fallback: 결재자를 못 찾았으면 회사 내 최상위 직급자 1명
  if (approvers.length === 0) {
    const topRanked = employees
      .filter((e) => e.status === 'active' && !visited.has(e.id))
      .sort((a, b) => rankLevel(b.id) - rankLevel(a.id))[0];
    if (topRanked) approvers.push(topRanked);
  }

  return approvers.slice(0, maxLevels);
}
