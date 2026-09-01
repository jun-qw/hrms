'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useIssueStore } from '@/lib/stores/issue-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import { SimilarIssuesPanel } from '@/components/issues/similar-issues-panel';
import type { IssueType, IssuePriority, IssueStatus } from '@/types';

const statusFlow: IssueStatus[] = ['open', 'in_progress', 'under_review', 'resolved', 'closed'];

const priorityVariant = (p: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (p) {
    case 'critical': return 'destructive';
    case 'high': return 'default';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
};

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (s) {
    case 'open': return 'default';
    case 'in_progress': return 'secondary';
    case 'resolved': case 'closed': return 'outline';
    default: return 'secondary';
  }
};

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ISSUE_TYPES = useCodeMap(CODE.ISSUE_TYPES);
  const ISSUE_PRIORITY = useCodeMap(CODE.ISSUE_PRIORITY);
  const ISSUE_STATUS = useCodeMap(CODE.ISSUE_STATUS);
  const { id } = use(params);
  const router = useRouter();
  const issue = useIssueStore((s) => s.getIssueById(id));
  const updateIssue = useIssueStore((s) => s.updateIssue);
  const employees = useEmployeeStore((s) => s.employees);

  if (!issue) {
    return (
      <div>
        <Breadcrumb />
        <div className="text-center py-12 text-muted-foreground">
          이슈를 찾을 수 없습니다.
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.push('/issues')}>목록으로</Button>
          </div>
        </div>
      </div>
    );
  }

  const currentStatusIdx = statusFlow.indexOf(issue.status);
  const nextStatus = currentStatusIdx < statusFlow.length - 1 ? statusFlow[currentStatusIdx + 1] : null;

  const handleAdvanceStatus = () => {
    if (!nextStatus) return;
    const updates: Record<string, string | null> = { status: nextStatus };
    if (nextStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString().split('T')[0];
    }
    updateIssue(issue.id, updates as any);
    toast.success(`상태가 "${ISSUE_STATUS[nextStatus]}"(으)로 변경되었습니다.`);
  };

  const handleAssigneeChange = (empId: string) => {
    updateIssue(issue.id, { assignee_id: empId === 'none' ? null : empId });
    toast.success('담당자가 지정되었습니다.');
  };

  const assignee = employees.find((e) => e.id === issue.assignee_id);
  const reporter = employees.find((e) => e.id === issue.reporter_id);

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{issue.title}</h1>
        <Badge variant={statusVariant(issue.status)}>
          {ISSUE_STATUS[issue.status as IssueStatus]}
        </Badge>
        <Badge variant={priorityVariant(issue.priority)}>
          {ISSUE_PRIORITY[issue.priority as IssuePriority]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">이슈 정보</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">유형:</span>{' '}
                <strong>{ISSUE_TYPES[issue.type as IssueType]}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">등록일:</span>{' '}
                <strong>{issue.created_at}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">최종 수정일:</span>{' '}
                <strong>{issue.updated_at}</strong>
              </div>
              {issue.resolved_at && (
                <div>
                  <span className="text-muted-foreground">해결일:</span>{' '}
                  <strong>{issue.resolved_at}</strong>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">신고자:</span>{' '}
                <strong>{reporter?.name ?? '미지정'}</strong>
              </div>
              <div className="pt-2 border-t">
                <span className="text-muted-foreground">설명:</span>
                <p className="mt-1 whitespace-pre-line">{issue.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">상태 관리</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4 overflow-x-auto">
                {statusFlow.map((s, idx) => (
                  <div
                    key={s}
                    className={`flex-1 text-center p-2 border rounded-lg min-w-[80px] ${
                      s === issue.status ? 'bg-primary text-primary-foreground' : idx < currentStatusIdx ? 'bg-muted' : ''
                    }`}
                  >
                    <p className="text-xs">{ISSUE_STATUS[s]}</p>
                  </div>
                ))}
              </div>
              {nextStatus && (
                <Button onClick={handleAdvanceStatus}>
                  {ISSUE_STATUS[nextStatus]}(으)로 전환
                </Button>
              )}
              {!nextStatus && (
                <p className="text-sm text-muted-foreground">이슈가 종결되었습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">담당자</CardTitle></CardHeader>
            <CardContent>
              <Select
                value={issue.assignee_id ?? 'none'}
                onValueChange={handleAssigneeChange}
              >
                <SelectTrigger><SelectValue placeholder="담당자 선택" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">미지정</SelectItem>
                  {employees
                    .filter((e) => e.status === 'active')
                    .slice(0, 20)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {assignee && (
                <p className="text-sm text-muted-foreground mt-2">
                  현재 담당: {assignee.name}
                </p>
              )}
            </CardContent>
          </Card>

          <SimilarIssuesPanel
            title={issue.title}
            description={issue.description}
            excludeId={issue.id}
          />
        </div>
      </div>
    </div>
  );
}
