'use client';

import { useMemo } from 'react';
import { useChangeHistoryStore } from '@/lib/stores/change-history-store';
import type { ChangeHistoryEntityType, ChangeHistoryEntry, ChangeHistoryActionType } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const ACTION_LABELS: Record<ChangeHistoryActionType, string> = {
  create: '생성',
  update: '수정',
  delete: '삭제',
};

const ACTION_VARIANTS: Record<ChangeHistoryActionType, 'default' | 'secondary' | 'destructive'> = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ChangeHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: ChangeHistoryEntityType;
  entityId: string;
  entityLabel: string;
}

export default function ChangeHistoryDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityLabel,
}: ChangeHistoryDialogProps) {
  const getByEntity = useChangeHistoryStore((s) => s.getByEntity);

  const entries = useMemo(
    () => (open ? getByEntity(entityType, entityId) : []),
    [open, entityType, entityId, getByEntity],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>변경이력 - {entityLabel}</DialogTitle>
          <DialogDescription>
            해당 항목의 변경 내역을 조회합니다.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {entries.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              변경이력이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">일시</TableHead>
                  <TableHead className="w-[80px]">변경자</TableHead>
                  <TableHead className="w-[60px]">구분</TableHead>
                  <TableHead>변경내용</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs">
                      {formatDateTime(entry.changed_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.changed_by_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANTS[entry.action]} className="text-xs">
                        {ACTION_LABELS[entry.action]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.changes.length === 0 ? (
                        <span className="text-muted-foreground text-sm">-</span>
                      ) : (
                        <div className="space-y-1">
                          {entry.changes.map((change, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="font-medium">{change.label}:</span>{' '}
                              <span className="line-through text-muted-foreground">
                                {change.before}
                              </span>{' '}
                              <span className="text-green-600">
                                {change.after}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
