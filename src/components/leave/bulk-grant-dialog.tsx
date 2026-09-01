'use client';

import { useState, useMemo } from 'react';
import { useLeaveStore } from '@/lib/stores/leave-store';
import { useEmployeeDirectory, useAnnualLeaveTypeId } from '@/lib/hooks/use-employee-directory';
import { calculateAnnualLeave } from '@/lib/utils/leave-calculator';
import { differenceInYears } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface BulkGrantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BulkGrantDialog({ open, onOpenChange }: BulkGrantDialogProps) {
  const directory = useEmployeeDirectory();
  const annualTypeId = useAnnualLeaveTypeId();
  const leaveBalances = useLeaveStore((s) => s.leaveBalances);
  const bulkGrantAnnualLeave = useLeaveStore((s) => s.bulkGrantAnnualLeave);

  const [year, setYear] = useState('2026');
  const yearNum = Number(year);
  const refDate = new Date(`${year}-01-01`);

  const preview = useMemo(() => {
    return directory.map((emp) => {
      const yearsOfService = differenceInYears(refDate, new Date(emp.hire_date));
      const calculated = calculateAnnualLeave(new Date(emp.hire_date), refDate);
      const current = leaveBalances.find(
        (b) =>
          b.employee_id === emp.id &&
          b.leave_type_id === annualTypeId &&
          b.year === yearNum
      );
      return {
        ...emp,
        yearsOfService,
        calculated,
        currentTotal: current?.total_days ?? 0,
        diff: calculated - (current?.total_days ?? 0),
      };
    });
  }, [leaveBalances, yearNum, refDate]);

  const handleGrant = () => {
    bulkGrantAnnualLeave(directory, yearNum, refDate);
    toast.success(`${yearNum}년 연차가 일괄 부여되었습니다.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>연차 일괄 부여</DialogTitle>
          <DialogDescription>
            전 직원에게 입사일 기준 연차를 자동 계산하여 부여합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium">연도:</span>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>부서</TableHead>
                <TableHead>입사일</TableHead>
                <TableHead className="text-center">근속</TableHead>
                <TableHead className="text-center">계산 연차</TableHead>
                <TableHead className="text-center">현재</TableHead>
                <TableHead className="text-center">차이</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-sm">{row.department}</TableCell>
                  <TableCell className="text-sm">{row.hire_date}</TableCell>
                  <TableCell className="text-center text-sm">{row.yearsOfService}년</TableCell>
                  <TableCell className="text-center font-medium">{row.calculated}일</TableCell>
                  <TableCell className="text-center text-sm">{row.currentTotal}일</TableCell>
                  <TableCell className="text-center text-sm">
                    {row.diff !== 0 && (
                      <span className={row.diff > 0 ? 'text-blue-600' : 'text-red-600'}>
                        {row.diff > 0 ? '+' : ''}{row.diff}
                      </span>
                    )}
                    {row.diff === 0 && '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleGrant}>일괄 부여</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
