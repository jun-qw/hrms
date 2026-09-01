'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Department } from '@/types';
import { ChevronRight, Building2, Users } from 'lucide-react';
import Link from 'next/link';

interface OrgTreeProps {
  departments: Department[];
  employeeCounts?: Record<string, number>;
}

interface TreeNodeProps {
  department: Department;
  employeeCounts?: Record<string, number>;
  level?: number;
}

function TreeNode({ department, employeeCounts, level = 0 }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const hasChildren = department.children && department.children.length > 0;
  const count = employeeCounts?.[department.id] ?? 0;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted cursor-pointer group',
          level === 0 && 'font-semibold'
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setIsOpen(!isOpen)} className="p-0.5">
            <ChevronRight className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-90',
            )} />
          </button>
        ) : (
          <span className="w-5" />
        )}
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Link
          href={`/organization/departments/${department.id}`}
          className="flex-1 text-sm hover:underline"
        >
          {department.name}
        </Link>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Users className="h-3 w-3" />
          {count}명
        </span>
      </div>
      {isOpen && hasChildren && (
        <div>
          {department.children!.map((child) => (
            <TreeNode
              key={child.id}
              department={child}
              employeeCounts={employeeCounts}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgTree({ departments, employeeCounts }: OrgTreeProps) {
  return (
    <div className="border rounded-lg p-2">
      {departments.map((dept) => (
        <TreeNode key={dept.id} department={dept} employeeCounts={employeeCounts} />
      ))}
    </div>
  );
}
