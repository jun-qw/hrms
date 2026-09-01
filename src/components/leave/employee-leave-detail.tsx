'use client';

import { useMemo } from 'react';
import { useLeaveStore } from '@/lib/stores/leave-store';
import { useEmployeeDirectory } from '@/lib/hooks/use-employee-directory';
import { useEmployeeLeave } from '@/lib/hooks/use-leave';
import { differenceInYears } from 'date-fns';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import BalanceAdjustmentForm from './balance-adjustment-form';

interface EmployeeLeaveDetailProps {
  employeeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EmployeeLeaveDetail({
  employeeId,
  open,
  onOpenChange,
}: EmployeeLeaveDetailProps) {
  const LEAVE_REQUEST_STATUS = useCodeMap(CODE.LEAVE_REQUEST_STATUS);
  const directory = useEmployeeDirectory();
  const employee = directory.find((e) => e.id === employeeId);
  const { balances, requests } = useEmployeeLeave(employeeId);
  const leaveTypes = useLeaveStore((s) => s.leaveTypes);
  const adjustments = useLeaveStore((s) => s.balanceAdjustments);

  const empAdjustments = useMemo(
    () =>
      adjustments
        .filter((a) => a.employee_id === employeeId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [adjustments, employeeId]
  );

  const yearsOfService = employee
    ? differenceInYears(new Date(), new Date(employee.hire_date))
    : 0;

  if (!employee) return null;

  const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee.name} - 연차 상세</DialogTitle>
        </DialogHeader>

        {/* Employee Header */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">부서</span>
            <p className="font-medium">{employee.department}</p>
          </div>
          <div>
            <span className="text-muted-foreground">직급</span>
            <p className="font-medium">{employee.position_rank}</p>
          </div>
          <div>
            <span className="text-muted-foreground">입사일</span>
            <p className="font-medium">{employee.hire_date}</p>
          </div>
          <div>
            <span className="text-muted-foreground">근속연수</span>
            <p className="font-medium">{yearsOfService}년</p>
          </div>
        </div>

        <Separator />

        {/* Balance Cards */}
        <div className="grid gap-3 grid-cols-2">
          {balances
            .filter((b) => {
              const lt = leaveTypes.find((t) => t.id === b.leave_type_id);
              return lt?.is_active;
            })
            .map((b) => {
              const rate =
                b.total_days > 0
                  ? Math.round((b.used_days / b.total_days) * 100)
                  : 0;
              return (
                <Card key={b.id} className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {b.leave_type?.name ?? ''}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {b.used_days}/{b.total_days}일
                    </span>
                  </div>
                  <Progress value={rate} className="h-2 mb-1" />
                  <p className="text-xs text-muted-foreground">
                    잔여: {b.remaining_days}일 ({rate}% 소진)
                  </p>
                </Card>
              );
            })}
        </div>

        <Separator />

        {/* Balance Adjustment */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">잔액 수동 조정</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceAdjustmentForm employeeId={employeeId} year={2026} />
          </CardContent>
        </Card>

        {/* Adjustment History */}
        {empAdjustments.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">조정 이력</h4>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>일자</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead className="text-center">조정</TableHead>
                    <TableHead>사유</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empAdjustments.map((adj) => {
                    const lt = leaveTypes.find((t) => t.id === adj.leave_type_id);
                    return (
                      <TableRow key={adj.id}>
                        <TableCell className="text-sm">{adj.created_at}</TableCell>
                        <TableCell className="text-sm">{lt?.name ?? ''}</TableCell>
                        <TableCell className="text-center text-sm font-medium">
                          {adj.adjustment_days > 0 ? '+' : ''}
                          {adj.adjustment_days}일
                        </TableCell>
                        <TableCell className="text-sm">{adj.reason}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Leave Request History */}
        <div>
          <h4 className="text-sm font-medium mb-2">휴가 사용 이력</h4>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>유형</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead className="text-center">일수</TableHead>
                  <TableHead>사유</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      휴가 사용 이력이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => {
                    const lt = leaveTypes.find((t) => t.id === req.leave_type_id);
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="text-sm">{lt?.name ?? ''}</TableCell>
                        <TableCell className="text-sm">
                          {req.start_date}
                          {req.start_date !== req.end_date && ` ~ ${req.end_date}`}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {req.days}일
                        </TableCell>
                        <TableCell className="text-sm">{req.reason}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(req.status)} className="text-xs">
                            {LEAVE_REQUEST_STATUS[req.status] ?? req.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
