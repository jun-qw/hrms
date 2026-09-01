import type { Department, Employee } from '@/types';

/** Deep clone a department tree */
export function cloneTree(tree: Department[]): Department[] {
  return tree.map((node) => ({
    ...node,
    children: node.children ? cloneTree(node.children) : undefined,
  }));
}

/** Find a department by id in a tree (DFS) */
export function findDepartment(tree: Department[], id: string): Department | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findDepartment(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** Find the parent of a department */
function findParent(tree: Department[], childId: string): Department | null {
  for (const node of tree) {
    if (node.children) {
      for (const child of node.children) {
        if (child.id === childId) return node;
      }
      const found = findParent(node.children, childId);
      if (found) return found;
    }
  }
  return null;
}

/** Check if ancestorId is an ancestor of descendantId (prevents circular reparenting) */
export function isAncestorOf(tree: Department[], ancestorId: string, descendantId: string): boolean {
  const ancestor = findDepartment(tree, ancestorId);
  if (!ancestor || !ancestor.children) return false;
  for (const child of ancestor.children) {
    if (child.id === descendantId) return true;
    if (isAncestorOf([child], child.id === ancestorId ? '' : child.id, descendantId)) {
      // recurse into children of ancestor
    }
  }
  // Simpler recursive approach
  return _isDescendant(ancestor, descendantId);
}

function _isDescendant(node: Department, targetId: string): boolean {
  if (!node.children) return false;
  for (const child of node.children) {
    if (child.id === targetId) return true;
    if (_isDescendant(child, targetId)) return true;
  }
  return false;
}

/** Recursively update levels of a subtree */
function updateLevels(node: Department, parentLevel: number): void {
  node.level = parentLevel + 1;
  if (node.children) {
    for (const child of node.children) {
      updateLevels(child, node.level);
    }
  }
}

/** Move a department to be a child of newParentId. Returns a new tree (immutable). */
export function reparentDepartment(tree: Department[], deptId: string, newParentId: string): Department[] {
  const newTree = cloneTree(tree);

  // Remove dept from its current parent
  const dept = removeDepartment(newTree, deptId);
  if (!dept) return newTree;

  // Find new parent and add dept as child
  const newParent = findDepartment(newTree, newParentId);
  if (!newParent) return newTree;

  updateLevels(dept, newParent.level);
  dept.parent_id = newParentId;
  if (!newParent.children) newParent.children = [];
  newParent.children.push(dept);

  return newTree;
}

/** Remove a department from the tree and return it */
function removeDepartment(tree: Department[], deptId: string): Department | null {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === deptId) {
      return tree.splice(i, 1)[0];
    }
    if (tree[i].children) {
      const found = removeDepartment(tree[i].children!, deptId);
      if (found) return found;
    }
  }
  return null;
}

/** Move an employee from one department to another. Returns new employeesByDept map. */
export function moveEmployee(
  empsByDept: Record<string, Employee[]>,
  empId: string,
  fromDeptId: string,
  toDeptId: string,
): Record<string, Employee[]> {
  const result = { ...empsByDept };

  const fromList = [...(result[fromDeptId] ?? [])];
  const idx = fromList.findIndex((e) => e.id === empId);
  if (idx === -1) return result;

  const [employee] = fromList.splice(idx, 1);
  const movedEmployee = { ...employee, department_id: toDeptId };

  result[fromDeptId] = fromList;
  result[toDeptId] = [...(result[toDeptId] ?? []), movedEmployee];

  return result;
}

/** Recompute employee counts from employeesByDept */
export function recomputeCounts(empsByDept: Record<string, Employee[]>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [deptId, emps] of Object.entries(empsByDept)) {
    counts[deptId] = emps.length;
  }
  return counts;
}
