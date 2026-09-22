'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Building2, ChevronRight, ChevronsDownUp, ChevronsUpDown, Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Department } from '@/types';
import { buildDepartmentTree, type DepartmentNode } from './department-tree-filter';

/**
 * 조직 트리 패널 — 워크스페이스 왼쪽 칸.
 *
 * 상위 부서를 고르면 그 아래 전부가 잡힙니다. 검색어를 넣으면 맞는 부서와
 * 그 조상만 남기고 글자를 강조합니다. 고른 줄은 먹색으로 채웁니다 — 디자인
 * 시안의 selected row.
 */
export function OrgTreePanel({
  departments,
  countByDepartment,
  totalCount,
  selectedId,
  onSelect,
}: {
  departments: Department[];
  countByDepartment: Map<string, number>;
  totalCount: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const roots = useMemo(
    () => buildDepartmentTree(departments, countByDepartment),
    [departments, countByDepartment],
  );

  const q = query.trim().toLowerCase();

  // 검색 중에는 맞는 부서와 그 조상만 남깁니다.
  const matches = (node: DepartmentNode): boolean =>
    !q ||
    node.department.name.toLowerCase().includes(q) ||
    node.children.some(matches);

  const allIds = useMemo(() => {
    const ids: string[] = [];
    const walk = (n: DepartmentNode) => {
      if (n.children.length > 0) ids.push(n.department.id);
      n.children.forEach(walk);
    };
    roots.forEach(walk);
    return ids;
  }, [roots]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const highlight = (name: string): ReactNode => {
    if (!q) return name;
    const idx = name.toLowerCase().indexOf(q);
    if (idx < 0) return name;
    return (
      <>
        {name.slice(0, idx)}
        <mark>{name.slice(idx, idx + q.length)}</mark>
        {name.slice(idx + q.length)}
      </>
    );
  };

  const renderNode = (node: DepartmentNode, depth: number) => {
    if (!matches(node)) return null;
    const id = node.department.id;
    const selected = selectedId === id;
    const hasChildren = node.children.length > 0;
    const open = q ? true : !collapsed.has(id);

    return (
      <div key={id}>
        <div
          role="treeitem"
          aria-selected={selected}
          aria-expanded={hasChildren ? open : undefined}
          className={cn(
            'flex cursor-pointer select-none items-center gap-1 rounded px-2 py-[5px] text-[13px]',
            selected ? 'bg-ink-900 text-paper' : 'text-ink-800 hover:bg-ink-100',
          )}
          style={{ marginLeft: depth * 14 }}
          onClick={() => onSelect(selected ? null : id)}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? `${node.department.name} 접기` : `${node.department.name} 펼치기`}
            className={cn(
              'grid h-[14px] w-[14px] shrink-0 place-items-center transition-transform',
              hasChildren ? (open ? 'rotate-90' : '') : 'invisible',
              selected ? 'text-paper/70' : 'text-ink-400',
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggle(id);
            }}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <Building2 className={cn('h-3.5 w-3.5 shrink-0', selected ? 'text-paper' : 'text-ink-500')} />
          <span className="min-w-0 flex-1 truncate">{highlight(node.department.name)}</span>
          <span className={cn('pl-1.5 font-mono text-[10.5px]', selected ? 'text-paper/70' : 'text-ink-400')}>
            {node.total}
          </span>
        </div>
        {hasChildren && open && (
          <div className="ml-[15px] border-l border-dashed border-ink-200 pl-1">
            {node.children.map((c) => renderNode(c, depth))}
          </div>
        )}
      </div>
    );
  };

  const allCollapsed = allIds.length > 0 && allIds.every((id) => collapsed.has(id));

  return (
    <aside className="flex min-h-0 flex-col border-r border-ink-150 bg-paper" aria-label="조직 트리">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-ink-150 bg-paper-2 px-4">
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500">조직</span>
        <div className="flex gap-0.5">
          <Link
            href="/organization"
            className="grid h-[26px] w-[26px] place-items-center rounded text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            title="부서 관리"
          >
            <Plus className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            className="grid h-[26px] w-[26px] place-items-center rounded text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            title={allCollapsed ? '모두 펼치기' : '모두 접기'}
            onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(allIds))}
          >
            {allCollapsed ? <ChevronsUpDown className="h-3.5 w-3.5" /> : <ChevronsDownUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <div className="px-3.5 pb-2.5 pt-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="부서 검색"
          className="w-full rounded-md border border-ink-150 bg-card px-2.5 py-[7px] text-[12.5px] outline-none transition-shadow focus:border-brand focus:ring-[3px] focus:ring-brand-tint"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 pb-5" role="tree">
        <div
          role="treeitem"
          aria-selected={selectedId === null}
          className={cn(
            'mb-1 flex cursor-pointer items-center gap-1.5 rounded px-2 py-[5px] text-[13px]',
            selectedId === null ? 'bg-ink-900 text-paper' : 'text-ink-800 hover:bg-ink-100',
          )}
          onClick={() => onSelect(null)}
        >
          <Users className={cn('ml-[18px] h-3.5 w-3.5', selectedId === null ? 'text-paper' : 'text-ink-500')} />
          <span className="flex-1">전체</span>
          <span className={cn('font-mono text-[10.5px]', selectedId === null ? 'text-paper/70' : 'text-ink-400')}>
            {totalCount}
          </span>
        </div>
        {roots.map((node) => renderNode(node, 0))}
        {q && roots.every((r) => !matches(r)) && (
          <p className="px-2 py-6 text-center text-[12px] text-ink-400">맞는 부서가 없습니다.</p>
        )}
      </div>
    </aside>
  );
}
