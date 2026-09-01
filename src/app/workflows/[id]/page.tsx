'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import WorkflowStepper from '@/components/workflow/workflow-stepper';
import WorkflowChecklist from '@/components/workflow/workflow-checklist';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function WorkflowDetailPage() {
  const WORKFLOW_TYPE = useCodeMap(CODE.WORKFLOW_TYPE);
  const WORKFLOW_STATUS = useCodeMap(CODE.WORKFLOW_STATUS);
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const instance = useWorkflowStore((s) => s.instances.find((i) => i.id === id));
  const completeTask = useWorkflowStore((s) => s.completeTask);
  const skipTask = useWorkflowStore((s) => s.skipTask);
  const cancelInstance = useWorkflowStore((s) => s.cancelInstance);
  const submitDocument = useWorkflowStore((s) => s.submitDocument);
  const rejectDocument = useWorkflowStore((s) => s.rejectDocument);

  const [selectedStep, setSelectedStep] = useState<number>(instance?.current_step ?? 0);

  if (!instance) {
    return (
      <div>
        <Breadcrumb />
        <p className="text-muted-foreground text-center py-16">
          해당 프로세스를 찾을 수 없습니다.
        </p>
      </div>
    );
  }

  const totalTasks = instance.tasks.length;
  const completedTasks = instance.tasks.filter(
    (t) => t.status === 'completed' || t.status === 'skipped'
  ).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Document stats
  const allDocs = instance.tasks.flatMap((t) => t.documents || []);
  const totalDocs = allDocs.length;
  const submittedDocs = allDocs.filter((d) => d.status === 'submitted').length;
  const rejectedDocs = allDocs.filter((d) => d.status === 'rejected').length;
  const pendingDocs = allDocs.filter((d) => d.status === 'pending').length;
  const docProgressPercent = totalDocs > 0 ? Math.round((submittedDocs / totalDocs) * 100) : 0;

  const typeLabel = WORKFLOW_TYPE[instance.type as keyof typeof WORKFLOW_TYPE] || instance.type;
  const statusLabel = WORKFLOW_STATUS[instance.status as keyof typeof WORKFLOW_STATUS] || instance.status;

  const statusVariant =
    instance.status === 'completed'
      ? 'default'
      : instance.status === 'in_progress'
        ? 'secondary'
        : instance.status === 'cancelled'
          ? 'destructive'
          : ('outline' as const);

  const handleComplete = (taskId: string) => {
    completeTask(instance.id, taskId, '현재 사용자');
    toast.success('태스크를 완료했습니다.');
  };

  const handleSkip = (taskId: string) => {
    skipTask(instance.id, taskId);
    toast.info('태스크를 건너뛰었습니다.');
  };

  const handleCancel = () => {
    cancelInstance(instance.id);
    toast.success('프로세스가 취소되었습니다.');
    router.push('/workflows');
  };

  const handleSubmitDocument = (taskId: string, docId: string) => {
    submitDocument(instance.id, taskId, docId, '현재 사용자');
    toast.success('서류가 제출되었습니다.');
  };

  const handleRejectDocument = (taskId: string, docId: string, reason: string) => {
    rejectDocument(instance.id, taskId, docId, reason);
    toast.info('서류가 반려되었습니다.');
  };

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">업무프로세스 상세</h1>
        {instance.status === 'in_progress' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                프로세스 취소
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>프로세스를 취소하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  이 작업은 되돌릴 수 없습니다. 진행 중인 프로세스가 취소됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>아니오</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel}>취소하기</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Info Card */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">대상자</p>
              <p className="text-sm font-medium">{instance.employee_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">부서</p>
              <p className="text-sm font-medium">{instance.department}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">유형</p>
              <Badge variant="outline">{typeLabel}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">상태</p>
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">시작일</p>
              <p className="text-sm">{format(new Date(instance.started_at), 'yyyy-MM-dd')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">완료일</p>
              <p className="text-sm">
                {instance.completed_at
                  ? format(new Date(instance.completed_at), 'yyyy-MM-dd')
                  : '-'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-1">
                진행률 ({completedTasks}/{totalTasks})
              </p>
              <div className="flex items-center gap-2">
                <Progress value={progressPercent} className="flex-1 h-2" />
                <span className="text-xs font-medium">{progressPercent}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Summary Card */}
      {totalDocs > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              서류 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
              <div>
                <p className="text-xs text-muted-foreground">전체</p>
                <p className="text-lg font-bold">{totalDocs}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">제출완료</p>
                <p className="text-lg font-bold text-green-600">{submittedDocs}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">미제출</p>
                <p className="text-lg font-bold text-gray-500">{pendingDocs}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">반려</p>
                <p className="text-lg font-bold text-red-600">{rejectedDocs}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={docProgressPercent} className="flex-1 h-2" />
              <span className="text-xs font-medium">{docProgressPercent}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stepper Card */}
      <Card className="mb-6">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">진행 단계</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowStepper
            steps={instance.step_names}
            currentStep={instance.current_step}
            selectedStep={selectedStep}
            onStepClick={setSelectedStep}
            status={instance.status}
          />
        </CardContent>
      </Card>

      {/* Checklist Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {instance.step_names[selectedStep]} — 체크리스트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowChecklist
            tasks={instance.tasks}
            stepIndex={selectedStep}
            currentStep={instance.current_step}
            instanceStatus={instance.status}
            onComplete={handleComplete}
            onSkip={handleSkip}
            onSubmitDocument={handleSubmitDocument}
            onRejectDocument={handleRejectDocument}
          />
        </CardContent>
      </Card>
    </div>
  );
}
