'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDownAZ, Plus, Search, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusPill, employeeStatusTone } from '@/components/ui/status-pill';
import { avatarColor, initials } from '@/lib/utils/avatar';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import type { Employee } from '@/types';

export type StatusFilter = 'all' | 'active' | 'on_leave' | 'new' | 'left';

const FILTERS: { id: StatusFilter; label: string; match: (e: Employee, today: string) => boolean }[] = [
  { id: 'active', label: '재직', match: (e) => e.status === 'active' },
  { id: 'on_leave', label: '휴직', match: (e) => e.status === 'on_leave' },
  {
    id: 'new',
    label: '신규',
    // 입사 90일 이내 — 온보딩 중인 사람.
    match: (e, today) => e.status === 'active' && daysBetween(e.hire_date, today) <= 90,
  },
  { id: 'left', label: '퇴직', match: (e) => e.status === 'resigned' || e.status === 'retired' },
  { id: 'all', label: '전체', match: () => true },
];

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function filterEmployees(list: Employee[], filter: StatusFilter, today: string): Employee[] {
  const f = FILTERS.find((x) => x.id === filter) ?? FILTERS[0];
  return list.filter((e) => f.match(e, today));
}

type SortKey = 'name' | 'number' | 'hire';

/**
 * 임직원 목록 — 워크스페이스 가운데 칸.
 *
 * 한 줄에 이니셜 아바타, 이름과 사번·부서, 직급, 상태 알약. 고른 줄은 흰
 * 바탕에 왼쪽 잉크블루 막대. 목록에 초점이 있으면 ↑↓ 로 옮기고 Enter 로
 * 사원카드 전체 화면을 엽니다.
 */
export function EmployeeListPanel({
  employees,
  filter,
  onFilterChange,
  query,
  onQueryChange,
  selectedId,
  onSelect,
  onOpen,
  departmentName,
  rankName,
  onShowGrid,
  scopeLabel,
}: {
  /** 부서 범위까지 걸러진 목록 — 상태 필터와 검색은 여기서 겁니다. */
  employees: Employee[];
  filter: StatusFilter;
  onFilterChange: (f: StatusFilter) => void;
  query: string;
  onQueryChange: (q: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Enter — 전체 화면 사원카드로. */
  onOpen: (id: string) => void;
  departmentName: (id: string | null) => string;
  rankName: (id: string | null) => string;
  onShowGrid: () => void;
  /** 지금 고른 부서 이름 — 머리에 붙입니다. */
  scopeLabel: string | null;
}) {
  const EMPLOYEE_STATUS = useCodeMap(CODE.EMPLOYEE_STATUS);
  const [sort, setSort] = useState<SortKey>('name');
  const listRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  const counts = useMemo(() => {
    const out = new Map<StatusFilter, number>();
    for (const f of FILTERS) out.set(f.id, employees.filter((e) => f.match(e, today)).length);
    return out;
  }, [employees, today]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const base = filterEmployees(employees, filter, today).filter((e) => {
      if (!q) return true;
      if (e.name.toLowerCase().includes(q)) return true;
      if (e.employee_number.toLowerCase().includes(q)) return true;
      if (e.name_en?.toLowerCase().includes(q)) return true;
      if (digits.length >= 4 && (e.phone ?? '').replace(/\D/g, '').includes(digits)) return true;
      return departmentName(e.department_id).toLowerCase().includes(q);
    });
    const sorted = [...base];
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    if (sort === 'number') sorted.sort((a, b) => a.employee_number.localeCompare(b.employee_number));
    if (sort === 'hire') sorted.sort((a, b) => b.hire_date.localeCompare(a.hire_date));
    return sorted;
  }, [employees, filter, query, sort, today, departmentName]);

  // 고른 줄이 보이도록 따라갑니다 (키보드로 옮길 때).
  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-emp="${selectedId}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  const move = (delta: number) => {
    if (rows.length === 0) return;
    const idx = rows.findIndex((r) => r.id === selectedId);
    const next = idx < 0 ? (delta > 0 ? 0 : rows.length - 1) : Math.min(rows.length - 1, Math.max(0, idx + delta));
    onSelect(rows[next].id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter' && selectedId) {
      e.preventDefault();
      onOpen(selectedId);
    }
  };

  const SORT_LABEL: Record<SortKey, string> = { name: '이름순', number: '사번순', hire: '입사일순' };
  const nextSort: Record<SortKey, SortKey> = { name: 'number', number: 'hire', hire: 'name' };

  return (
    <section className="flex min-h-0 flex-col border-r border-ink-150 bg-paper" aria-label="임직원 목록">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-ink-150 bg-paper-2 px-4">
        <span className="flex items-baseline gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500">
          임직원
          <span className="font-mono text-[11px] font-normal normal-case tracking-normal text-ink-400">
            {rows.length}명{scopeLabel ? ` · ${scopeLabel}` : ''}
          </span>
        </span>
        <div className="flex gap-0.5">
          <button
            type="button"
            className="grid h-[26px] w-[26px] place-items-center rounded text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            title={`정렬: ${SORT_LABEL[sort]} (누르면 바뀜)`}
            onClick={() => setSort(nextSort[sort])}
          >
            <ArrowDownAZ className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="grid h-[26px] w-[26px] place-items-center rounded text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            title="표(대장)로 보기 — 셀 편집·엑셀 붙여넣기"
            onClick={onShowGrid}
          >
            <Table2 className="h-3.5 w-3.5" />
          </button>
          <Link
            href="/employees/new"
            className="grid h-[26px] w-[26px] place-items-center rounded text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            title="사원 등록"
          >
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-ink-150 px-3.5 py-2.5">
        {FILTERS.map((f) => {
          const on = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                on
                  ? 'border-ink-900 bg-ink-900 text-paper'
                  : 'border-ink-150 bg-card text-ink-700 hover:border-ink-300',
              )}
            >
              {f.label}
              <span className={cn('font-mono text-[10.5px]', on ? 'text-paper/70' : 'text-ink-400')}>
                {counts.get(f.id) ?? 0}
              </span>
            </button>
          );
        })}
        <label className="relative ml-auto block min-w-[140px] flex-1 basis-[140px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="이름·사번·휴대폰"
            className="w-full rounded-full border border-ink-150 bg-card py-1 pl-7 pr-2.5 text-[12px] outline-none transition-shadow focus:border-brand focus:ring-[3px] focus:ring-brand-tint"
          />
        </label>
      </div>

      <div className="grid shrink-0 grid-cols-[34px_1fr_78px_74px] border-b border-ink-150 px-3.5 py-2 text-[10.5px] uppercase tracking-[0.08em] text-ink-400">
        <span />
        <span>이름 / 사번</span>
        <span>직급</span>
        <span className="text-right">상태</span>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-auto outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-brand-tint"
        tabIndex={0}
        role="listbox"
        aria-label="임직원"
        aria-activedescendant={selectedId ? `emp-${selectedId}` : undefined}
        onKeyDown={onKeyDown}
      >
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-[12.5px] text-ink-400">
            조건에 맞는 사원이 없습니다.
          </p>
        ) : (
          rows.map((e) => {
            const selected = e.id === selectedId;
            return (
              <div
                key={e.id}
                id={`emp-${e.id}`}
                data-emp={e.id}
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(e.id)}
                onDoubleClick={() => onOpen(e.id)}
                className={cn(
                  'grid cursor-pointer grid-cols-[34px_1fr_78px_74px] items-center border-b border-ink-150 px-3.5 py-2.5',
                  selected ? 'bg-card shadow-[inset_3px_0_0_var(--brand)]' : 'hover:bg-paper-2',
                )}
              >
                <span
                  className="grid h-7 w-7 place-items-center rounded-full font-serif text-[11.5px] font-semibold text-white"
                  style={{ background: avatarColor(e.name) }}
                >
                  {initials(e.name)}
                </span>
                <span className="min-w-0 pl-1">
                  <span className="block truncate text-[13.5px] font-semibold tracking-[-0.01em] text-ink-900">
                    {e.name}
                  </span>
                  <span className="block truncate text-[11.5px] text-ink-500">
                    <span className="font-mono">{e.employee_number}</span>
                    {e.department_id && <> · {departmentName(e.department_id)}</>}
                  </span>
                </span>
                <span className="truncate text-[12px] text-ink-700">{rankName(e.position_rank_id) || '—'}</span>
                <span className="justify-self-end">
                  <StatusPill tone={employeeStatusTone(e.status)}>
                    {EMPLOYEE_STATUS[e.status as keyof typeof EMPLOYEE_STATUS] ?? e.status}
                  </StatusPill>
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
