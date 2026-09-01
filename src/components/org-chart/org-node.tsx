'use client';

import { useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Building2, Mail, Phone, User, ExternalLink, ChevronDown } from 'lucide-react';
import { DraggableEmployee } from './draggable-employee';
import type { Employee, DragPayload } from '@/types';

// 1x1 transparent image to hide native drag ghost
const EMPTY_IMG = typeof Image !== 'undefined' ? (() => {
  const img = new Image(1, 1);
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  return img;
})() : null;

interface OrgNodeProps {
  name: string;
  title?: string;
  rank?: string;
  employeeCount?: number;
  leader?: Employee;
  employees?: Employee[];
  departmentId?: string;
  isSimulating?: boolean;
  isModified?: boolean;
  onDropItem?: (payload: DragPayload, targetDeptId: string) => void;
  onDragPreviewStart?: (payload: DragPayload) => void;
  onDragPreviewEnd?: () => void;
}

export function OrgNode({
  name,
  title,
  rank,
  employeeCount,
  leader,
  employees,
  departmentId,
  isSimulating,
  isModified,
  onDropItem,
  onDragPreviewStart,
  onDragPreviewEnd,
}: OrgNodeProps) {
  const router = useRouter();
  const hasEmployees = employees && employees.length > 0;
  const [isDragOver, setIsDragOver] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleDragStart = (e: DragEvent) => {
    if (!isSimulating || !departmentId) return;
    e.stopPropagation();
    const payload: DragPayload = {
      type: 'department',
      id: departmentId,
      sourceDepartmentId: departmentId,
      name,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';

    // Hide native ghost, show custom overlay
    if (EMPTY_IMG) {
      e.dataTransfer.setDragImage(EMPTY_IMG, 0, 0);
    }
    onDragPreviewStart?.(payload);
  };

  const handleDragEnd = () => {
    onDragPreviewEnd?.();
  };

  const handleDragOver = (e: DragEvent) => {
    if (!isSimulating) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!isSimulating || !departmentId || !onDropItem) return;
    try {
      const payload: DragPayload = JSON.parse(e.dataTransfer.getData('application/json'));
      if (payload.sourceDepartmentId === departmentId && payload.type === 'employee') return;
      if (payload.id === departmentId && payload.type === 'department') return;
      onDropItem(payload, departmentId);
    } catch {
      // ignore invalid data
    }
  };

  const handleCardClick = () => {
    if (hasEmployees) {
      setExpanded((prev) => !prev);
    }
  };

  // Avatars for collapsed preview (max 4)
  const previewEmployees = employees?.slice(0, 4) ?? [];
  const remainingCount = (employees?.length ?? 0) - previewEmployees.length;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex flex-col items-center">
          <div
            draggable={isSimulating}
            onDragStart={isSimulating ? handleDragStart : undefined}
            onDragEnd={isSimulating ? handleDragEnd : undefined}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border rounded-lg p-3 bg-background shadow-sm min-w-[180px] cursor-pointer hover:shadow-md transition-all',
              isSimulating && 'cursor-grab active:cursor-grabbing',
              isDragOver && 'ring-2 ring-primary bg-primary/5',
              isModified && 'border-l-4 border-l-amber-500',
            )}
            onClick={handleCardClick}
          >
            {/* Header: department name + count badge */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="font-semibold text-sm">{name}</p>
              {employeeCount !== undefined && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {employeeCount}명
                </Badge>
              )}
            </div>

            {/* Leader section */}
            {leader && (
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-7 w-7">
                  {leader.profile_image_url && (
                    <AvatarImage src={leader.profile_image_url} alt={leader.name} />
                  )}
                  <AvatarFallback className="text-[10px]">{leader.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{leader.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {leader.position_title?.name ?? ''}{leader.position_title?.name && leader.position_rank?.name ? ' · ' : ''}{leader.position_rank?.name ?? ''}
                  </p>
                </div>
              </div>
            )}
            {!leader && title && (
              <div className="mb-2">
                <p className="text-xs text-muted-foreground text-center">{title}</p>
                {rank && <p className="text-xs text-muted-foreground text-center">{rank}</p>}
              </div>
            )}

            {/* Collapsed: avatar group preview */}
            {!expanded && hasEmployees && (
              <div className="flex items-center justify-between">
                <AvatarGroup>
                  {previewEmployees.map((emp) => (
                    <Avatar key={emp.id} className="h-5 w-5" size="sm">
                      {emp.profile_image_url && (
                        <AvatarImage src={emp.profile_image_url} alt={emp.name} />
                      )}
                      <AvatarFallback className="text-[8px]">{emp.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {remainingCount > 0 && (
                    <AvatarGroupCount className="text-[8px] !size-5">
                      +{remainingCount}
                    </AvatarGroupCount>
                  )}
                </AvatarGroup>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200" />
              </div>
            )}

            {/* Expanded chevron indicator */}
            {expanded && hasEmployees && (
              <div className="flex justify-center mt-1">
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground rotate-180 transition-transform duration-200" />
              </div>
            )}
          </div>

          {/* Expanded panel: full team list */}
          {expanded && hasEmployees && (
            <div className="mt-1 w-full min-w-[180px] border rounded-lg bg-background shadow-sm p-2 space-y-1 animate-in slide-in-from-top-1 duration-200">
              {employees.map((emp) =>
                isSimulating ? (
                  <DraggableEmployee
                    key={emp.id}
                    employee={emp}
                    departmentId={departmentId ?? ''}
                    isSimulating
                    onDragPreviewStart={onDragPreviewStart}
                    onDragPreviewEnd={onDragPreviewEnd}
                  />
                ) : (
                  <div key={emp.id} className="flex items-center gap-2 text-xs px-1.5 py-1 rounded hover:bg-muted">
                    <Avatar className="h-6 w-6">
                      {emp.profile_image_url && (
                        <AvatarImage src={emp.profile_image_url} alt={emp.name} />
                      )}
                      <AvatarFallback className="text-[10px]">{emp.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{emp.name}</span>
                      <span className="text-muted-foreground ml-1">
                        {emp.position_title?.name ? `${emp.position_title.name} · ` : ''}{emp.position_rank?.name ?? ''}
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        <ContextMenuLabel className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {name}
        </ContextMenuLabel>
        <ContextMenuSeparator />

        {departmentId && (
          <ContextMenuItem onClick={() => router.push(`/organization/departments/${departmentId}`)}>
            <ExternalLink className="h-4 w-4" />
            부서 상세 보기
          </ContextMenuItem>
        )}

        {hasEmployees && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <User className="h-4 w-4" />
              소속 직원 ({employees.length}명)
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-64">
              {employees.map((emp) => (
                <ContextMenuSub key={emp.id}>
                  <ContextMenuSubTrigger>
                    <Avatar className="h-5 w-5 mr-1">
                      {emp.profile_image_url && (
                        <AvatarImage src={emp.profile_image_url} alt={emp.name} />
                      )}
                      <AvatarFallback className="text-[10px]">{emp.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{emp.name}</span>
                    {emp.position_rank && (
                      <span className="ml-auto text-xs text-muted-foreground">{emp.position_rank.name}</span>
                    )}
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-60">
                    <ContextMenuLabel>{emp.name} {emp.position_rank?.name}</ContextMenuLabel>
                    <ContextMenuSeparator />
                    {emp.email && (
                      <ContextMenuItem disabled>
                        <Mail className="h-4 w-4" />
                        {emp.email}
                      </ContextMenuItem>
                    )}
                    {emp.phone && (
                      <ContextMenuItem disabled>
                        <Phone className="h-4 w-4" />
                        {emp.phone}
                      </ContextMenuItem>
                    )}
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => router.push(`/employees/${emp.id}`)}>
                      <ExternalLink className="h-4 w-4" />
                      직원 상세 보기
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        {!hasEmployees && (
          <ContextMenuItem disabled>
            <User className="h-4 w-4" />
            소속 직원 없음
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
