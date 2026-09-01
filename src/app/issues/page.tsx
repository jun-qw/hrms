'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, AlertTriangle, Clock, CheckCircle, AlertOctagon } from 'lucide-react';
import { useIssueStore } from '@/lib/stores/issue-store';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import type { IssueType, IssuePriority, IssueStatus } from '@/types';

const priorityBorderColor: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-400',
  medium: 'border-l-amber-400',
  low: 'border-l-gray-400',
};

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

export default function IssuesPage() {
  const ISSUE_TYPES = useCodeMap(CODE.ISSUE_TYPES);
  const ISSUE_PRIORITY = useCodeMap(CODE.ISSUE_PRIORITY);
  const ISSUE_STATUS = useCodeMap(CODE.ISSUE_STATUS);
  const issues = useIssueStore((s) => s.issues);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const filtered = useMemo(() => {
    return issues
      .filter((issue) => filterType === 'all' || issue.type === filterType)
      .filter((issue) => filterStatus === 'all' || issue.status === filterStatus)
      .filter((issue) => filterPriority === 'all' || issue.priority === filterPriority)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [issues, filterType, filterStatus, filterPriority]);

  const totalCount = issues.length;
  const openCount = issues.filter((i) => i.status === 'open').length;
  const inProgressCount = issues.filter((i) => i.status === 'in_progress' || i.status === 'under_review').length;
  const criticalCount = issues.filter((i) => i.priority === 'critical' && i.status !== 'closed' && i.status !== 'resolved').length;

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">HR 이슈 관리</h1>
        <Link href="/issues/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            이슈 등록
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatsCard title="전체 이슈" value={totalCount} icon={AlertTriangle} color="blue" />
        <StatsCard title="미해결" value={openCount} icon={AlertOctagon} color="amber" />
        <StatsCard title="처리중" value={inProgressCount} icon={Clock} color="purple" />
        <StatsCard title="긴급" value={criticalCount} icon={AlertTriangle} color="blue" description="미해결 긴급 이슈" />
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="유형" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            {Object.entries(ISSUE_TYPES).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="상태" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            {Object.entries(ISSUE_STATUS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="우선순위" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 우선순위</SelectItem>
            {Object.entries(ISSUE_PRIORITY).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filtered.map((issue) => (
          <Link key={issue.id} href={`/issues/${issue.id}`}>
            <Card className={`hover:shadow-md transition-shadow cursor-pointer border-l-4 ${priorityBorderColor[issue.priority] ?? ''}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg truncate">{issue.title}</h3>
                      <Badge variant={statusVariant(issue.status)} className="text-xs shrink-0">
                        {ISSUE_STATUS[issue.status as IssueStatus]}
                      </Badge>
                      <Badge variant={priorityVariant(issue.priority)} className="text-xs shrink-0">
                        {ISSUE_PRIORITY[issue.priority as IssuePriority]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{issue.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{ISSUE_TYPES[issue.type as IssueType]}</span>
                      <span>등록일: {issue.created_at}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            조건에 맞는 이슈가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
