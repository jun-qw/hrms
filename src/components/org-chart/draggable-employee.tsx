'use client';

import type { DragEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Employee, DragPayload } from '@/types';

// 1x1 transparent image to hide native drag ghost
const EMPTY_IMG = typeof Image !== 'undefined' ? (() => {
  const img = new Image(1, 1);
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  return img;
})() : null;

interface DraggableEmployeeProps {
  employee: Employee;
  departmentId: string;
  isSimulating: boolean;
  onDragPreviewStart?: (payload: DragPayload) => void;
  onDragPreviewEnd?: () => void;
}

export function DraggableEmployee({
  employee,
  departmentId,
  isSimulating,
  onDragPreviewStart,
  onDragPreviewEnd,
}: DraggableEmployeeProps) {
  const handleDragStart = (e: DragEvent) => {
    e.stopPropagation();
    const payload: DragPayload = {
      type: 'employee',
      id: employee.id,
      sourceDepartmentId: departmentId,
      name: employee.name,
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

  return (
    <div
      draggable={isSimulating}
      onDragStart={isSimulating ? handleDragStart : undefined}
      onDragEnd={isSimulating ? handleDragEnd : undefined}
      className={`flex items-center gap-2 text-xs px-2 py-1 rounded hover:bg-muted ${
        isSimulating ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <Avatar className="h-6 w-6">
        {employee.profile_image_url && (
          <AvatarImage src={employee.profile_image_url} alt={employee.name} />
        )}
        <AvatarFallback className="text-[10px]">{employee.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <span>{employee.name}</span>
      {employee.position_rank && (
        <span className="text-muted-foreground">{employee.position_rank.name}</span>
      )}
    </div>
  );
}
