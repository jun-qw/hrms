'use client';

import { useMemo, useCallback } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useApprovalStore } from '@/lib/stores/approval-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (s) {
    case 'approved': return 'default';
    case 'pending': return 'secondary';
    case 'in_progress': return 'outline';
    case 'rejected': return 'destructive';
    default: return 'outline';
  }
};

const typeLabels: Record<string, string> = {
  leave: '휴가',
  appointment: '인사발령',
  expense: '경비',
  general: '일반',
};

export default function ApprovalPage() {
  const APPROVAL_STATUS = useCodeMap(CODE.APPROVAL_STATUS);
  const approvals = useApprovalStore((s) => s.approvals);
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);

  const findEmployee = useCallback((empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return undefined;
    return {
      ...emp,
      department: departments.find((d) => d.id === emp.department_id),
      position_rank: positionRanks.find((r) => r.id === emp.position_rank_id),
    };
  }, [employees, departments, positionRanks]);

  const pendingApprovals = useMemo(
    () => approvals.filter((a) => a.status === 'pending' || a.status === 'in_progress'),
    [approvals],
  );

  const completedApprovals = useMemo(
    () => approvals.filter((a) => a.status === 'approved' || a.status === 'rejected' || a.status === 'cancelled'),
    [approvals],
  );

  function ApprovalTable({ items }: { items: typeof approvals }) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제목</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>신청자</TableHead>
              <TableHead>부서</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>신청일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  결재 건이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const requester = findEmployee(item.requester_id);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link href={`/approval/${item.id}`} className="font-medium hover:underline">
                        {item.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{typeLabels[item.type] ?? item.type}</Badge>
                    </TableCell>
                    <TableCell>{requester?.name ?? item.requester_id}</TableCell>
                    <TableCell>{requester?.department?.name ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(item.status)} className="text-xs">
                        {APPROVAL_STATUS[item.status] ?? item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.created_at}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  const totalCount = approvals.length;
  const pendingCount = approvals.filter((a) => a.status === 'pending').length;
  const approvedCount = approvals.filter((a) => a.status === 'approved').length;
  const rejectedCount = approvals.filter((a) => a.status === 'rejected').length;

  return (
    <div>
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-6">전자결재</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard title="전체" value={totalCount} icon={FileText} color="blue" />
        <StatsCard title="대기" value={pendingCount} icon={Clock} color="amber" />
        <StatsCard title="승인" value={approvedCount} icon={CheckCircle} color="green" />
        <StatsCard title="반려" value={rejectedCount} icon={XCircle} color="purple" />
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">결재 대기 ({pendingApprovals.length})</TabsTrigger>
          <TabsTrigger value="completed">처리 완료 ({completedApprovals.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <ApprovalTable items={pendingApprovals} />
        </TabsContent>
        <TabsContent value="completed">
          <ApprovalTable items={completedApprovals} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
