'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Department } from '@/types';

interface Node {
  department: Department;
  children: Node[];
  /** 본인 부서 인원 */
  own: number;
  /** 하위 부서까지 합친 인원 — 상위 부서를 고르면 이 수만큼 걸립니다. */
  total: number;
}

/**
 * 부서 트리 필터.
 *
 * 상위 부서를 고르면 그 아래 전부가 잡힙니다. 인사담당자가 "생산본부 전체"를
 * 보려고 하위 팀을 하나씩 체크하는 일이 없도록, 선택은 언제나 한 부서이고
 * 범위는 그 부서의 서브트리입니다.
 */
export function DepartmentTreeFilter({
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
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const roots = useMemo(() => buildTree(departments, countByDepartment), [departments, countByDepartment]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderNode = (node: Node, depth: number) => {
    const isSelected = selectedId === node.department.id;
    const isCollapsed = collapsed.has(node.department.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.department.id}>
        <div
          className={cn(
            'flex items-center gap-1 rounded pr-1 text-sm',
            isSelected ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted',
          )}
          style={{ paddingLeft: depth * 12 }}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={isCollapsed ? `${node.department.name} 펼치기` : `${node.department.name} 접기`}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => toggle(node.department.id)}
            >
              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <span className="w-[18px] shrink-0" />
          )}
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center justify-between gap-2 py-1 text-left"
            onClick={() => onSelect(isSelected ? null : node.department.id)}
          >
            <span className="truncate">{node.department.name}</span>
            <span
              className={cn(
                'shrink-0 text-xs tabular-nums',
                isSelected ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {node.total}
              {hasChildren && node.own !== node.total && (
                <span className="ml-0.5 opacity-60">({node.own})</span>
              )}
            </span>
          </button>
        </div>
        {hasChildren && !isCollapsed && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="w-56 shrink-0 rounded-md border bg-card p-2">
      <button
        type="button"
        className={cn(
          'mb-1 flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-sm',
          selectedId === null ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted',
        )}
        onClick={() => onSelect(null)}
      >
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          전체 부서
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{totalCount}</span>
      </button>
      <div className="border-t pt-1">{roots.map((node) => renderNode(node, 0))}</div>
    </div>
  );
}

/** 부서 목록에서 서브트리 인원까지 채운 트리를 만듭니다. */
function buildTree(departments: Department[], counts: Map<string, number>): Node[] {
  const active = departments.filter((d) => d.is_active);
  const byId = new Map<string, Node>(
    active.map((d) => [
      d.id,
      { department: d, children: [], own: counts.get(d.id) ?? 0, total: counts.get(d.id) ?? 0 },
    ]),
  );

  const roots: Node[] = [];
  for (const node of byId.values()) {
    const parent = node.department.parent_id ? byId.get(node.department.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortAndSum = (node: Node): number => {
    node.children.sort((a, b) => a.department.sort_order - b.department.sort_order);
    node.total = node.own + node.children.reduce((sum, c) => sum + sortAndSum(c), 0);
    return node.total;
  };
  roots.sort((a, b) => a.department.sort_order - b.department.sort_order);
  roots.forEach(sortAndSum);

  return roots;
}

/** 선택한 부서와 그 하위 부서 id 전부. */
export function departmentSubtree(departments: Department[], rootId: string): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const d of departments) {
    if (!d.parent_id) continue;
    const list = childrenOf.get(d.parent_id);
    if (list) list.push(d.id);
    else childrenOf.set(d.parent_id, [d.id]);
  }

  const ids = new Set<string>();
  const walk = (id: string) => {
    if (ids.has(id)) return;
    ids.add(id);
    for (const child of childrenOf.get(id) ?? []) walk(child);
  };
  walk(rootId);
  return ids;
}
