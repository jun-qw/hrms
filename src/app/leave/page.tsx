'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { useLeaveStore } from '@/lib/stores/leave-store';
import { useEmployeeDirectory } from '@/lib/hooks/use-employee-directory';
import { useEmployeeLeave } from '@/lib/hooks/use-leave';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import LeaveRequestForm from '@/components/leave/leave-request-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Settings, X, CalendarDays, Thermometer, Heart, MoreHorizontal, Table2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';


export default function LeavePage() {
  const session = useAuthStore((s) => s.session);
  const currentEmployeeId = session?.employee_id ?? '';
  const directory = useEmployeeDirectory();
  const LEAVE_REQUEST_STATUS = useCodeMap(CODE.LEAVE_REQUEST_STATUS);
  const [open, setOpen] = useState(false);
  const leaveTypes = useLeaveStore((s) => s.leaveTypes);
  const cancelLeaveRequest = useLeaveStore((s) => s.cancelLeaveRequest);
  const { balances, requests } = useEmployeeLeave(currentEmployeeId);
  const employee = directory.find((e) => e.id === currentEmployeeId);

  const activeBalances = balances.filter((b) => {
    const lt = leaveTypes.find((t) => t.id === b.leave_type_id);
    return lt?.is_active;
  });

  const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const handleCancel = (id: string) => {
    if (window.confirm('이 휴가 신청을 취소하시겠습니까?')) {
      cancelLeaveRequest(id);
      toast.success('휴가 신청이 취소되었습니다.');
    }
  };

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">휴가관리</h1>
          {employee && (
            <p className="text-sm text-muted-foreground mt-1">
              {employee.name} ({employee.department} / {employee.position_rank})
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/leave/register">
            <Button variant="outline" size="sm">
              <Table2 className="mr-1.5 h-3.5 w-3.5" />
              연차대장
            </Button>
          </Link>
          <Link href="/leave/admin">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              휴가 관리
            </Button>
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                휴가 신청
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>휴가 신청</DialogTitle>
              </DialogHeader>
              <LeaveRequestForm
                employeeId={currentEmployeeId}
                onSuccess={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mb-6">
        {activeBalances.map((b, idx) => {
          const rate = b.total_days > 0 ? Math.round((b.used_days / b.total_days) * 100) : 0;
          const iconConfig = [
            { icon: CalendarDays, bg: 'bg-accent-blue-subtle', fg: 'text-accent-blue' },
            { icon: Thermometer, bg: 'bg-accent-amber-subtle', fg: 'text-accent-amber' },
            { icon: Heart, bg: 'bg-accent-purple-subtle', fg: 'text-accent-purple' },
            { icon: MoreHorizontal, bg: 'bg-accent-green-subtle', fg: 'text-accent-green' },
          ][idx % 4];
          const IconComp = iconConfig.icon;
          return (
            <Card key={b.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{b.leave_type?.name}</p>
                  <div className={`p-2 rounded-lg ${iconConfig.bg} ${iconConfig.fg}`}>
                    <IconComp className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold">{b.remaining_days}</span>
                  <span className="text-sm text-muted-foreground">
                    / {b.total_days} (사용: {b.used_days})
                  </span>
                </div>
                <Progress value={rate} className="h-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">휴가 신청 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>유형</TableHead>
                  <TableHead>시작일</TableHead>
                  <TableHead>종료일</TableHead>
                  <TableHead>일수</TableHead>
                  <TableHead>사유</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>신청일</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      휴가 신청 내역이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => {
                    const lt = leaveTypes.find((t) => t.id === req.leave_type_id);
                    return (
                      <TableRow key={req.id}>
                        <TableCell>
                          <Badge variant="outline">{lt?.name ?? ''}</Badge>
                        </TableCell>
                        <TableCell>{req.start_date}</TableCell>
                        <TableCell>{req.end_date}</TableCell>
                        <TableCell>{req.days}일</TableCell>
                        <TableCell className="text-sm">{req.reason}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(req.status)} className="text-xs">
                            {LEAVE_REQUEST_STATUS[req.status] ?? req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {req.created_at}
                        </TableCell>
                        <TableCell>
                          {(req.status === 'pending' || req.status === 'approved') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => handleCancel(req.id)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              취소
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
