'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Undo2, RotateCcw, ChevronDown, ChevronUp, Building2, User, ArrowRight } from 'lucide-react';
import type { SimulationMove } from '@/types';

interface SimulationToolbarProps {
  isSimulating: boolean;
  onToggle: (on: boolean) => void;
  moves: SimulationMove[];
  onUndoLast: () => void;
  onReset: () => void;
}

export function SimulationToolbar({ isSimulating, onToggle, moves, onUndoLast, onReset }: SimulationToolbarProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="border rounded-lg bg-background p-3 space-y-3">
      {/* Toggle row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch id="sim-toggle" checked={isSimulating} onCheckedChange={onToggle} />
          <Label htmlFor="sim-toggle" className="text-sm font-medium cursor-pointer">
            조직 개편 시뮬레이션
          </Label>
          {moves.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {moves.length}건 변경
            </Badge>
          )}
        </div>
        {isSimulating && moves.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onUndoLast}>
              <Undo2 className="h-3.5 w-3.5 mr-1" />
              마지막 취소
            </Button>
            <Button variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              전체 초기화
            </Button>
          </div>
        )}
      </div>

      {/* Simulation active hint */}
      {isSimulating && moves.length === 0 && (
        <p className="text-xs text-muted-foreground">
          노드를 드래그하여 다른 부서 위에 놓으면 조직 구조가 변경됩니다.
        </p>
      )}

      {/* History panel */}
      {isSimulating && moves.length > 0 && (
        <div>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {historyOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            변경 이력
          </button>
          {historyOpen && (
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
              {[...moves].reverse().map((move) => (
                <div
                  key={move.id}
                  className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50"
                >
                  {move.type === 'department' ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                      <Building2 className="h-3 w-3 mr-0.5" />
                      부서
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                      <User className="h-3 w-3 mr-0.5" />
                      직원
                    </Badge>
                  )}
                  <span className="font-medium truncate">{move.itemName}</span>
                  <span className="text-muted-foreground truncate">{move.fromDepartmentName}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground truncate">{move.toDepartmentName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
