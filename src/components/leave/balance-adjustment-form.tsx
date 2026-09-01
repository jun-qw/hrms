'use client';

import { useState, useMemo } from 'react';
import { useLeaveStore } from '@/lib/stores/leave-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface BalanceAdjustmentFormProps {
  employeeId: string;
  year: number;
  onSuccess?: () => void;
}

export default function BalanceAdjustmentForm({
  employeeId,
  year,
  onSuccess,
}: BalanceAdjustmentFormProps) {
  const leaveTypes = useLeaveStore((s) => s.leaveTypes);
  const leaveBalances = useLeaveStore((s) => s.leaveBalances);
  const addBalanceAdjustment = useLeaveStore((s) => s.addBalanceAdjustment);

  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [adjustmentDays, setAdjustmentDays] = useState('');
  const [reason, setReason] = useState('');

  const activeTypes = leaveTypes.filter((lt) => lt.is_active);

  const currentBalance = useMemo(() => {
    return leaveBalances.find(
      (b) =>
        b.employee_id === employeeId &&
        b.leave_type_id === leaveTypeId &&
        b.year === year
    );
  }, [leaveBalances, employeeId, leaveTypeId, year]);

  const days = Number(adjustmentDays) || 0;
  const afterRemaining = currentBalance
    ? currentBalance.remaining_days + days
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId || !adjustmentDays || !reason.trim()) {
      toast.error('모든 항목을 입력해주세요.');
      return;
    }
    if (days === 0) {
      toast.error('조정일수는 0이 아니어야 합니다.');
      return;
    }

    addBalanceAdjustment({
      id: `adj-${crypto.randomUUID().slice(0, 8)}`,
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      year,
      adjustment_days: days,
      reason: reason.trim(),
      adjusted_by: 'HR',
      created_at: new Date().toISOString().slice(0, 10),
    });

    toast.success('잔액이 조정되었습니다.');
    setLeaveTypeId('');
    setAdjustmentDays('');
    setReason('');
    onSuccess?.();
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label>휴가 유형</Label>
        <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
          <SelectTrigger>
            <SelectValue placeholder="유형 선택" />
          </SelectTrigger>
          <SelectContent>
            {activeTypes.map((lt) => (
              <SelectItem key={lt.id} value={lt.id}>
                {lt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>조정 일수 (+추가, -차감)</Label>
        <Input
          type="number"
          step="0.5"
          value={adjustmentDays}
          onChange={(e) => setAdjustmentDays(e.target.value)}
          placeholder="예: 2 또는 -1"
        />
      </div>

      {currentBalance && days !== 0 && (
        <div className="text-sm p-2 rounded bg-muted">
          현재 잔여: {currentBalance.remaining_days}일 → 조정 후:{' '}
          <span className="font-bold">{afterRemaining}일</span>
        </div>
      )}

      <div className="space-y-2">
        <Label>사유</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="조정 사유를 입력하세요"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm">
          조정
        </Button>
      </div>
    </form>
  );
}
