'use client';

import { useState, useCallback, useMemo } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { OrgTree } from '@/components/org-chart/org-tree';
import { DepartmentCard } from '@/components/org-chart/department-card';
import { OrgChartCanvas } from '@/components/org-chart/org-chart-canvas';
import { SimulationToolbar } from '@/components/org-chart/simulation-toolbar';
import { DragOverlay } from '@/components/org-chart/drag-overlay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  cloneTree,
  findDepartment,
  isAncestorOf,
  reparentDepartment,
  moveEmployee,
  recomputeCounts,
} from '@/lib/tree-utils';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import type { Department, Employee, DragPayload, SimulationMove } from '@/types';

/** Build a tree from flat department list using parent_id */
function buildDeptTree(departments: Department[]): Department[] {
  const map = new Map<string, Department>();
  const roots: Department[] = [];

  for (const dept of departments) {
    map.set(dept.id, { ...dept, children: [] });
  }

  for (const dept of map.values()) {
    if (dept.parent_id && map.has(dept.parent_id)) {
      map.get(dept.parent_id)!.children!.push(dept);
    } else {
      roots.push(dept);
    }
  }

  const sortChildren = (nodes: Department[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    for (const node of nodes) {
      if (node.children?.length) sortChildren(node.children);
    }
  };
  sortChildren(roots);

  return roots;
}

/** Group employees by department and enrich with position_rank/title objects */
function buildEmployeesByDept(
  employees: Employee[],
  positionRanks: { id: string; name: string; level: number; is_active: boolean; effective_from: string | null; effective_to: string | null; created_at: string; updated_at: string }[],
  positionTitles: { id: string; name: string; level: number; is_active: boolean; effective_from: string | null; effective_to: string | null; created_at: string; updated_at: string }[],
): Record<string, Employee[]> {
  const rankMap = new Map(positionRanks.map((r) => [r.id, r]));
  const titleMap = new Map(positionTitles.map((t) => [t.id, t]));
  const result: Record<string, Employee[]> = {};

  for (const emp of employees) {
    if (emp.status !== 'active' || !emp.department_id) continue;
    const enriched: Employee = {
      ...emp,
      position_rank: emp.position_rank_id ? rankMap.get(emp.position_rank_id) : undefined,
      position_title: emp.position_title_id ? titleMap.get(emp.position_title_id) : undefined,
      profile_image_url: emp.profile_image_url ?? `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(emp.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
    };
    if (!result[emp.department_id]) result[emp.department_id] = [];
    result[emp.department_id].push(enriched);
  }

  // Sort each dept's employees: higher rank level first
  for (const deptId of Object.keys(result)) {
    result[deptId].sort((a, b) => (b.position_rank?.level ?? 0) - (a.position_rank?.level ?? 0));
  }

  return result;
}

export default function OrganizationPage() {
  const departments = useEmployeeStore((s) => s.departments);
  const employees = useEmployeeStore((s) => s.employees);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const positionTitles = useEmployeeStore((s) => s.positionTitles);

  // Build tree & employee data from store
  const deptTree = useMemo(() => buildDeptTree(departments), [departments]);
  const empsByDept = useMemo(
    () => buildEmployeesByDept(employees, positionRanks, positionTitles),
    [employees, positionRanks, positionTitles],
  );
  const empCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [deptId, emps] of Object.entries(empsByDept)) {
      counts[deptId] = emps.length;
    }
    return counts;
  }, [empsByDept]);

  // Leaf departments for card view
  const leafDepts = useMemo(() => {
    return departments
      .filter((d) => !departments.some((c) => c.parent_id === d.id))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [departments]);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simTree, setSimTree] = useState<Department[]>(() => cloneTree(deptTree));
  const [simEmployeesByDept, setSimEmployeesByDept] = useState<Record<string, Employee[]>>(() => ({ ...empsByDept }));
  const [moves, setMoves] = useState<SimulationMove[]>([]);
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);

  // Active data: original when not simulating, sim data when simulating
  const activeTree = isSimulating ? simTree : deptTree;
  const activeEmployeesByDept = isSimulating ? simEmployeesByDept : empsByDept;
  const activeEmployeeCounts = isSimulating ? recomputeCounts(simEmployeesByDept) : empCounts;

  // Set of department IDs that have been modified
  const modifiedDeptIds = useMemo(() => {
    const ids = new Set<string>();
    for (const move of moves) {
      ids.add(move.fromDepartmentId);
      ids.add(move.toDepartmentId);
      if (move.type === 'department') {
        ids.add(move.itemId);
      }
    }
    return ids;
  }, [moves]);

  const handleDropItem = useCallback((payload: DragPayload, targetDeptId: string) => {
    if (payload.type === 'department') {
      if (payload.id === targetDeptId) return;
      if (isAncestorOf(simTree, payload.id, targetDeptId)) return;

      const movingDept = findDepartment(simTree, payload.id);
      const targetDept = findDepartment(simTree, targetDeptId);
      const currentParentId = movingDept?.parent_id;
      if (currentParentId === targetDeptId) return;

      const fromName = currentParentId ? findDepartment(simTree, currentParentId)?.name ?? '최상위' : '최상위';
      const toName = targetDept?.name ?? '';

      const newTree = reparentDepartment(simTree, payload.id, targetDeptId);
      setSimTree(newTree);

      const move: SimulationMove = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'department',
        itemId: payload.id,
        itemName: payload.name,
        fromDepartmentId: currentParentId ?? payload.sourceDepartmentId,
        fromDepartmentName: fromName,
        toDepartmentId: targetDeptId,
        toDepartmentName: toName,
      };
      setMoves((prev) => [...prev, move]);
    } else {
      if (payload.sourceDepartmentId === targetDeptId) return;

      const fromDept = findDepartment(simTree, payload.sourceDepartmentId);
      const toDept = findDepartment(simTree, targetDeptId);

      const newEmps = moveEmployee(simEmployeesByDept, payload.id, payload.sourceDepartmentId, targetDeptId);
      setSimEmployeesByDept(newEmps);

      const move: SimulationMove = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'employee',
        itemId: payload.id,
        itemName: payload.name,
        fromDepartmentId: payload.sourceDepartmentId,
        fromDepartmentName: fromDept?.name ?? '',
        toDepartmentId: targetDeptId,
        toDepartmentName: toDept?.name ?? '',
      };
      setMoves((prev) => [...prev, move]);
    }
  }, [simTree, simEmployeesByDept]);

  const handleReset = useCallback(() => {
    setSimTree(cloneTree(deptTree));
    setSimEmployeesByDept({ ...empsByDept });
    setMoves([]);
  }, [deptTree, empsByDept]);

  const handleUndoLast = useCallback(() => {
    if (moves.length === 0) return;
    const newMoves = moves.slice(0, -1);
    let tree = cloneTree(deptTree);
    let emps: Record<string, Employee[]> = { ...empsByDept };

    for (const m of newMoves) {
      if (m.type === 'department') {
        tree = reparentDepartment(tree, m.itemId, m.toDepartmentId);
      } else {
        emps = moveEmployee(emps, m.itemId, m.fromDepartmentId, m.toDepartmentId);
      }
    }

    setSimTree(tree);
    setSimEmployeesByDept(emps);
    setMoves(newMoves);
  }, [moves, deptTree, empsByDept]);

  const handleDragPreviewStart = useCallback((payload: DragPayload) => {
    setDragPayload(payload);
  }, []);

  const handleDragPreviewEnd = useCallback(() => {
    setDragPayload(null);
  }, []);

  const handleToggleSimulation = useCallback((on: boolean) => {
    if (on) {
      setSimTree(cloneTree(deptTree));
      setSimEmployeesByDept({ ...empsByDept });
    }
    setMoves([]);
    setIsSimulating(on);
  }, [deptTree, empsByDept]);

  return (
    <div>
      <DragOverlay payload={dragPayload} />
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-6">조직도</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">조직 트리</CardTitle>
            </CardHeader>
            <CardContent>
              <OrgTree departments={activeTree} employeeCounts={activeEmployeeCounts} />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          {/* Simulation Toolbar */}
          <div className="mb-4">
            <SimulationToolbar
              isSimulating={isSimulating}
              onToggle={handleToggleSimulation}
              moves={moves}
              onUndoLast={handleUndoLast}
              onReset={handleReset}
            />
          </div>

          <Tabs defaultValue="chart">
            <TabsList>
              <TabsTrigger value="chart">조직도 차트</TabsTrigger>
              <TabsTrigger value="cards">부서 카드</TabsTrigger>
            </TabsList>
            <TabsContent value="chart" className="mt-4">
              <OrgChartCanvas
                departments={activeTree}
                employeeCounts={activeEmployeeCounts}
                employeesByDept={activeEmployeesByDept}
                isSimulating={isSimulating}
                onDropItem={handleDropItem}
                modifiedDeptIds={isSimulating ? modifiedDeptIds : undefined}
                onDragPreviewStart={handleDragPreviewStart}
                onDragPreviewEnd={handleDragPreviewEnd}
              />
            </TabsContent>
            <TabsContent value="cards" className="mt-4">
              <h2 className="text-lg font-semibold mb-4">부서 현황</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {leafDepts.map((dept) => (
                  <DepartmentCard
                    key={dept.id}
                    department={dept}
                    employeeCount={empCounts[dept.id] ?? 0}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
