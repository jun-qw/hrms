'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { OrgTreePanel } from './org-tree-panel';
import { EmployeeListPanel, filterEmployees, type StatusFilter } from './employee-list-panel';
import { EmployeeDetailPanel, type DetailTab } from './employee-detail-panel';
import { departmentSubtree } from './department-tree-filter';

const FILTERS: StatusFilter[] = ['all', 'active', 'on_leave', 'new', 'left'];
const TABS: DetailTab[] = ['info', 'assign', 'history', 'family', 'pay', 'docs'];

/**
 * 임직원 워크스페이스 — 조직 트리 · 임직원 목록 · 사원카드 세 칸.
 *
 * 디자인 시안의 3열(260 / 400 / 나머지) 배치입니다. 고른 부서·사원·탭은
 * 주소창(?dept=&emp=&tab=)에 남깁니다 — 새로고침해도, 링크를 보내도 같은
 * 자리가 열립니다.
 */
export function EmployeeWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const positionTitles = useEmployeeStore((s) => s.positionTitles);

  const deptParam = params.get('dept');
  const empParam = params.get('emp');
  const filterParam = params.get('f') as StatusFilter | null;
  const tabParam = params.get('tab') as DetailTab | null;

  const departmentId = deptParam && departments.some((d) => d.id === deptParam) ? deptParam : null;
  const filter: StatusFilter = filterParam && FILTERS.includes(filterParam) ? filterParam : 'active';
  const tab: DetailTab = tabParam && TABS.includes(tabParam) ? tabParam : 'info';
  const [query, setQuery] = useState('');
  const frame = useRef<HTMLDivElement>(null);

  // 세 칸은 화면 아래끝까지 채우고 각자 안에서 스크롤합니다. 머리말 높이가
  // 버튼 줄바꿈으로 달라질 수 있어 CSS 계산 대신 실제 위치를 재서 맞춥니다.
  // 좁은 화면(lg 미만)에서는 세 칸이 위아래로 쌓이므로 높이를 고정하지 않습니다.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const fit = () => {
      if (window.innerWidth < 1024) {
        el.style.height = '';
        return;
      }
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.height = `max(480px, calc(100dvh - ${Math.round(top)}px))`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(document.body);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, []);

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const today = new Date().toISOString().slice(0, 10);

  // 부서 범위 — 고른 부서와 그 하위 전부.
  const scoped = useMemo(() => {
    if (!departmentId) return employees;
    const ids = departmentSubtree(departments, departmentId);
    return employees.filter((e) => e.department_id && ids.has(e.department_id));
  }, [employees, departments, departmentId]);

  // 트리에 붙는 인원수는 지금 보고 있는 상태 필터 기준입니다.
  const countByDepartment = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filterEmployees(employees, filter, today)) {
      if (!e.department_id) continue;
      map.set(e.department_id, (map.get(e.department_id) ?? 0) + 1);
    }
    return map;
  }, [employees, filter, today]);
  const totalCount = useMemo(() => filterEmployees(employees, filter, today).length, [employees, filter, today]);

  const departmentName = useCallback(
    (id: string | null) => (id ? (departments.find((d) => d.id === id)?.name ?? '') : ''),
    [departments],
  );
  const rankName = useCallback(
    (id: string | null) => (id ? (positionRanks.find((r) => r.id === id)?.name ?? '') : ''),
    [positionRanks],
  );

  const selected = useMemo(() => {
    const raw = empParam ? employees.find((e) => e.id === empParam) : undefined;
    if (!raw) return null;
    return {
      ...raw,
      department: departments.find((d) => d.id === raw.department_id),
      position_rank: positionRanks.find((r) => r.id === raw.position_rank_id),
      position_title: positionTitles.find((t) => t.id === raw.position_title_id),
    };
  }, [empParam, employees, departments, positionRanks, positionTitles]);

  // 주소에 남은 사원 id 가 목록에 없으면(삭제됨 등) 지웁니다.
  useEffect(() => {
    if (empParam && employees.length > 0 && !employees.some((e) => e.id === empParam)) {
      setParams({ emp: null });
    }
  }, [empParam, employees, setParams]);

  return (
    <div
      ref={frame}
      className="grid grid-cols-1 bg-paper lg:grid-cols-[240px_360px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[260px_400px_minmax(0,1fr)]"
    >
      <OrgTreePanel
        departments={departments}
        countByDepartment={countByDepartment}
        totalCount={totalCount}
        selectedId={departmentId}
        onSelect={(id) => setParams({ dept: id })}
      />
      <EmployeeListPanel
        employees={scoped}
        filter={filter}
        onFilterChange={(f) => setParams({ f: f === 'active' ? null : f })}
        query={query}
        onQueryChange={setQuery}
        selectedId={selected?.id ?? null}
        onSelect={(id) => setParams({ emp: id })}
        onOpen={(id) => router.push(`/employees/${id}`)}
        departmentName={departmentName}
        rankName={rankName}
        onShowGrid={() => setParams({ view: 'grid' })}
        scopeLabel={departmentId ? departmentName(departmentId) : null}
      />
      <EmployeeDetailPanel
        employee={selected}
        tab={tab}
        onTabChange={(t) => setParams({ tab: t === 'info' ? null : t })}
      />
    </div>
  );
}
