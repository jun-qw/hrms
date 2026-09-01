'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import type { WorkflowInstance } from '@/lib/stores/workflow-store';
import { format } from 'date-fns';
import { FileText } from 'lucide-react';

interface WorkflowProgressCardProps {
  instance: WorkflowInstance;
}

export default function WorkflowProgressCard({ instance }: WorkflowProgressCardProps) {
  const WORKFLOW_TYPE = useCodeMap(CODE.WORKFLOW_TYPE);
  const WORKFLOW_STATUS = useCodeMap(CODE.WORKFLOW_STATUS);
  const totalTasks = instance.tasks.length;
  const completedTasks = instance.tasks.filter(
    (t) => t.status === 'completed' || t.status === 'skipped'
  ).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Document stats
  const allDocs = instance.tasks.flatMap((t) => t.documents || []);
  const totalDocs = allDocs.length;
  const submittedDocs = allDocs.filter((d) => d.status === 'submitted').length;
  const pendingDocs = allDocs.filter((d) => d.status === 'pending').length;
  const rejectedDocs = allDocs.filter((d) => d.status === 'rejected').length;

  const typeLabel =
    WORKFLOW_TYPE[instance.type as keyof typeof WORKFLOW_TYPE] || instance.type;
  const statusLabel =
    WORKFLOW_STATUS[instance.status as keyof typeof WORKFLOW_STATUS] || instance.status;

  const statusVariant =
    instance.status === 'completed'
      ? 'default'
      : instance.status === 'in_progress'
        ? 'secondary'
        : instance.status === 'cancelled'
          ? 'destructive'
          : ('outline' as const);

  return (
    <Link href={`/workflows/${instance.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{instance.employee_name}</p>
              <p className="text-xs text-muted-foreground">{instance.department}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="outline" className="text-xs">
                {typeLabel}
              </Badge>
              <Badge variant={statusVariant} className="text-xs">
                {statusLabel}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">{instance.template_name}</p>
            <div className="flex items-center gap-2">
              <Progress value={progressPercent} className="flex-1 h-2" />
              <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                {progressPercent}%
              </span>
            </div>
          </div>

          {totalDocs > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>
                서류 {submittedDocs}/{totalDocs}
                {rejectedDocs > 0 && (
                  <span className="text-red-500 ml-1">(반려 {rejectedDocs})</span>
                )}
                {pendingDocs > 0 && instance.status === 'in_progress' && (
                  <span className="ml-1">(미제출 {pendingDocs})</span>
                )}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              현재: {instance.step_names[instance.current_step] || '완료'}
            </span>
            <span>{format(new Date(instance.started_at), 'yyyy-MM-dd')}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
