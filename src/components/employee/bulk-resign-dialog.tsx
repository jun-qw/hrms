'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  bulkResign,
  previewBulkResign,
  type ResignPreviewRow,
} from '@/lib/actions/pipeline-actions';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { Employee } from '@/types';

/**
 * 일괄 퇴사처리.
 *
 * 되돌리기 번거로운 처리라, 확정 전에 무엇이 걸리는지를 먼저 보여 줍니다.
 * 특히 근속 1년 이상(퇴직금 대상)과 남은 연차는 금액이 달린 항목이므로
 * 명단에 그대로 띄웁니다.
 */
export function BulkResignDialog({
  open,
  onOpenChange,
  employees,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  onDone?: () => void;
}) {
  const reloadEmployees = useEmployeeStore((s) => s.reload);
  const reloadWorkflows = useWorkflowStore((s) => s.reload);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<ResignPreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const ids = employees.map((e) => e.id);
  const key = `${open}|${date}|${ids.join(',')}`;

  useEffect(() => {
    if (!open || ids.length === 0) return;
    let alive = true;
    setLoading(true);
    previewBulkResign(ids, date)
      .then((rows) => {
        if (alive) setPreview(rows);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // 대상·기준일이 바뀔 때만 다시 계산합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const severanceCount = preview.filter((p) => p.severanceEligible).length;
  const leaveTotal = preview.reduce((sum, p) => sum + p.remainingLeaveDays, 0);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const result = await bulkResign({ employeeIds: ids, resignationDate: date, reason: reason || null });
      if (!result.ok) {
        toast.error(result.error ?? '퇴사 처리에 실패했습니다.');
        return;
      }
      await Promise.all([reloadEmployees(), reloadWorkflows()]);
      toast.success(`${result.processed}명 퇴사 처리하고 퇴사 프로세스를 열었습니다.`);
      onOpenChange(false);
      onDone?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>일괄 퇴사처리 ({employees.length}명)</DialogTitle>
          <DialogDescription>
            확정하면 재직 상태와 소속 이력이 함께 닫히고, 각 사원의 퇴사 프로세스가 열립니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="resign-date">퇴사일 (최종 근무일)</Label>
            <Input id="resign-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resign-reason">사유</Label>
            <Input
              id="resign-reason"
              placeholder="이직 · 계약만료 · 권고 등"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 rounded border bg-muted/40 px-3 py-2 text-sm">
          <span>
            퇴직금 대상(근속 1년 이상) <strong className="tabular-nums">{severanceCount}</strong>명
          </span>
          <span>
            정산 대상 잔여 연차 <strong className="tabular-nums">{leaveTotal}</strong>일
          </span>
        </div>

        <div className="max-h-64 overflow-auto rounded border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold">사번</th>
                <th className="px-2 py-1.5 text-left font-semibold">성명</th>
                <th className="px-2 py-1.5 text-left font-semibold">부서</th>
                <th className="px-2 py-1.5 text-left font-semibold">입사일</th>
                <th className="px-2 py-1.5 text-right font-semibold">근속일수</th>
                <th className="px-2 py-1.5 text-center font-semibold">퇴직금</th>
                <th className="px-2 py-1.5 text-right font-semibold">잔여 연차</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-2 py-8 text-center text-muted-foreground">
                    확인 중...
                  </td>
                </tr>
              ) : (
                preview.map((p) => (
                  <tr key={p.employeeId} className="border-t">
                    <td className="px-2 py-1 font-mono">{p.employeeNumber}</td>
                    <td className="px-2 py-1 font-medium">{p.name}</td>
                    <td className="px-2 py-1">{p.department}</td>
                    <td className="px-2 py-1 tabular-nums">{p.hireDate}</td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {p.serviceDays.toLocaleString('ko-KR')}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {p.severanceEligible ? (
                        <Badge variant="secondary" className="text-[11px]">
                          대상
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {p.remainingLeaveDays > 0 ? `${p.remainingLeaveDays}일` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-amber" />
          퇴직금과 연차수당 금액은 이 화면에서 계산하지 않습니다. 확정 후 퇴직 관리 화면에서
          평균임금 기준으로 정산하세요.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={saving || loading || employees.length === 0}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {employees.length}명 퇴사 확정
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
