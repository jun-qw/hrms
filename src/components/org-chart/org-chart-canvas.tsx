'use client';

import { useState, useRef, useCallback, type MouseEvent, type WheelEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Maximize } from 'lucide-react';
import { OrgNode } from './org-node';
import type { Department, Employee, DragPayload } from '@/types';

const MIN_SCALE = 0.3;
const MAX_SCALE = 3.0;
const ZOOM_STEP = 0.15;

interface OrgChartCanvasProps {
  departments: Department[];
  employeeCounts: Record<string, number>;
  employeesByDept: Record<string, Employee[]>;
  isSimulating?: boolean;
  onDropItem?: (payload: DragPayload, targetDeptId: string) => void;
  modifiedDeptIds?: Set<string>;
  onDragPreviewStart?: (payload: DragPayload) => void;
  onDragPreviewEnd?: () => void;
}

export function OrgChartCanvas({
  departments,
  employeeCounts,
  employeesByDept,
  isSimulating = false,
  onDropItem,
  modifiedDeptIds,
  onDragPreviewStart,
  onDragPreviewEnd,
}: OrgChartCanvasProps) {
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(0.85);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-slot="context-menu-content"]') || target.closest('button') || target.closest('a')) return;

    // Guard: don't start pan if clicking on a draggable element during simulation
    if (isSimulating && target.closest('[draggable="true"]')) return;

    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
    e.preventDefault();
  }, [translate, isSimulating]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTranslate({
      x: translateStart.current.x + dx,
      y: translateStart.current.y + dy,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale((prev) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
  }, []);

  const zoomIn = () => setScale((prev) => Math.min(MAX_SCALE, prev + ZOOM_STEP));
  const zoomOut = () => setScale((prev) => Math.max(MIN_SCALE, prev - ZOOM_STEP));
  const resetView = () => {
    setScale(0.85);
    setTranslate({ x: 0, y: 0 });
  };

  const hintText = isSimulating
    ? '드래그: 노드 이동 · 빈 영역 드래그: 화면 이동 · 스크롤: 확대/축소'
    : '드래그: 이동 · 스크롤: 확대/축소 · 우클릭: 정보';

  return (
    <div className="relative border rounded-lg org-chart-canvas overflow-hidden" style={{ height: '600px' }}>
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8 bg-background" onClick={zoomIn} title="확대">
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8 bg-background" onClick={zoomOut} title="축소">
          <Minus className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8 bg-background" onClick={resetView} title="맞춤">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Scale indicator */}
      <div className="absolute bottom-3 right-3 z-10 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded border">
        {Math.round(scale * 100)}%
      </div>

      {/* Hint */}
      <div className="absolute bottom-3 left-3 z-10 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded border">
        {hintText}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="w-full h-full flex justify-center"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'top center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <div className="pt-8">
            {departments.map((root) => (
              <TreeBranch
                key={root.id}
                department={root}
                employeeCounts={employeeCounts}
                employeesByDept={employeesByDept}
                isSimulating={isSimulating}
                onDropItem={onDropItem}
                modifiedDeptIds={modifiedDeptIds}
                onDragPreviewStart={onDragPreviewStart}
                onDragPreviewEnd={onDragPreviewEnd}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Recursive tree branch rendering
function TreeBranch({
  department,
  employeeCounts,
  employeesByDept,
  isSimulating,
  onDropItem,
  modifiedDeptIds,
  onDragPreviewStart,
  onDragPreviewEnd,
}: {
  department: Department;
  employeeCounts: Record<string, number>;
  employeesByDept: Record<string, Employee[]>;
  isSimulating?: boolean;
  onDropItem?: (payload: DragPayload, targetDeptId: string) => void;
  modifiedDeptIds?: Set<string>;
  onDragPreviewStart?: (payload: DragPayload) => void;
  onDragPreviewEnd?: () => void;
}) {
  const children = department.children ?? [];
  const hasChildren = children.length > 0;
  const employees = employeesByDept[department.id] ?? [];
  const leader = employees.find((e) => e.position_title?.name?.includes('장') || e.position_title?.name?.includes('대표'));
  const count = employeeCounts[department.id] ?? 0;

  return (
    <div className="flex flex-col items-center">
      {/* Node */}
      <OrgNode
        name={department.name}
        title={leader?.name}
        rank={leader?.position_rank?.name}
        employeeCount={count}
        leader={leader}
        employees={employees}
        departmentId={department.id}
        isSimulating={isSimulating}
        isModified={modifiedDeptIds?.has(department.id)}
        onDropItem={onDropItem}
        onDragPreviewStart={onDragPreviewStart}
        onDragPreviewEnd={onDragPreviewEnd}
      />

      {/* Connector lines */}
      {hasChildren && (
        <>
          {/* Vertical line down from parent */}
          <div className="w-px h-6 bg-gradient-to-b from-border to-border/50" />

          {/* Horizontal line spanning children */}
          <div className="relative flex">
            {children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border"
                style={{
                  left: '50%',
                  right: '50%',
                }}
              />
            )}
          </div>

          <div className="flex items-start">
            {children.map((child, idx) => (
              <div key={child.id} className="flex flex-col items-center relative px-3">
                {/* Horizontal connector */}
                {children.length > 1 && (
                  <div
                    className="absolute top-0 h-px bg-border"
                    style={{
                      left: idx === 0 ? '50%' : 0,
                      right: idx === children.length - 1 ? '50%' : 0,
                    }}
                  />
                )}
                {/* Vertical line into child */}
                <div className="w-px h-6 bg-border" />
                <TreeBranch
                  department={child}
                  employeeCounts={employeeCounts}
                  employeesByDept={employeesByDept}
                  isSimulating={isSimulating}
                  onDropItem={onDropItem}
                  modifiedDeptIds={modifiedDeptIds}
                  onDragPreviewStart={onDragPreviewStart}
                  onDragPreviewEnd={onDragPreviewEnd}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
