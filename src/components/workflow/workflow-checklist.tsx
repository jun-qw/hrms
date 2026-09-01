'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import type { WorkflowTaskInstance, DocumentInstance } from '@/lib/stores/workflow-store';
import { format } from 'date-fns';
import { FileText, Check, X } from 'lucide-react';

interface WorkflowChecklistProps {
  tasks: WorkflowTaskInstance[];
  stepIndex: number;
  currentStep: number;
  instanceStatus: string;
  onComplete: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  onSubmitDocument?: (taskId: string, docId: string) => void;
  onRejectDocument?: (taskId: string, docId: string, reason: string) => void;
}

export default function WorkflowChecklist({
  tasks,
  stepIndex,
  currentStep,
  instanceStatus,
  onComplete,
  onSkip,
  onSubmitDocument,
  onRejectDocument,
}: WorkflowChecklistProps) {
  const WORKFLOW_ASSIGNEE_ROLES = useCodeMap(CODE.WORKFLOW_ASSIGNEE_ROLES);
  const WORKFLOW_TASK_STATUS = useCodeMap(CODE.WORKFLOW_TASK_STATUS);
  const DOCUMENT_SUBMISSION_STATUS = useCodeMap(CODE.DOCUMENT_SUBMISSION_STATUS);
  const stepTasks = tasks
    .filter((t) => t.step_index === stepIndex)
    .sort((a, b) => a.sort_order - b.sort_order);

  const isEditable = instanceStatus === 'in_progress' && stepIndex === currentStep;
  const isPast = stepIndex < currentStep || instanceStatus === 'completed';

  return (
    <div className="space-y-3">
      {stepTasks.map((task) => {
        const isDone = task.status === 'completed';
        const isSkipped = task.status === 'skipped';
        const roleLabel =
          WORKFLOW_ASSIGNEE_ROLES[task.assignee_role as keyof typeof WORKFLOW_ASSIGNEE_ROLES] ||
          task.assignee_role;
        const docs = task.documents || [];

        return (
          <div
            key={task.id}
            className={cn(
              'flex flex-col gap-2 p-3 rounded-lg border',
              isDone && 'bg-green-50 border-green-200',
              isSkipped && 'bg-muted/50 border-muted',
              !isDone && !isSkipped && 'bg-background'
            )}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={isDone}
                disabled={!isEditable || isDone || isSkipped}
                onCheckedChange={(checked) => {
                  if (checked) onComplete(task.id);
                }}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isDone && 'line-through text-muted-foreground',
                      isSkipped && 'line-through text-muted-foreground'
                    )}
                  >
                    {task.title}
                  </span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {roleLabel}
                  </Badge>
                  {task.is_required ? (
                    <Badge variant="destructive" className="text-xs shrink-0">
                      필수
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      선택
                    </Badge>
                  )}
                  {isSkipped && (
                    <Badge variant="secondary" className="text-xs">
                      {WORKFLOW_TASK_STATUS.skipped}
                    </Badge>
                  )}
                  {docs.length > 0 && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      <FileText className="h-3 w-3 mr-0.5" />
                      서류 {docs.filter((d) => d.status === 'submitted').length}/{docs.length}
                    </Badge>
                  )}
                </div>
                {isDone && task.completed_by && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {task.completed_by} 완료
                    {task.completed_at &&
                      ` (${format(new Date(task.completed_at), 'yyyy-MM-dd HH:mm')})`}
                    {task.note && ` — ${task.note}`}
                  </p>
                )}
                {isEditable && !isDone && !isSkipped && !task.is_required && (
                  <button
                    onClick={() => onSkip(task.id)}
                    className="text-xs text-muted-foreground hover:text-foreground mt-1 underline"
                  >
                    건너뛰기
                  </button>
                )}
              </div>
            </div>

            {/* Documents inline */}
            {docs.length > 0 && (
              <div className="ml-8 space-y-1.5">
                {docs.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    taskId={task.id}
                    isEditable={isEditable}
                    onSubmit={onSubmitDocument}
                    onReject={onRejectDocument}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
      {stepTasks.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          이 단계에 등록된 태스크가 없습니다.
        </p>
      )}
      {isPast && !isEditable && (
        <p className="text-xs text-muted-foreground text-center">
          완료된 단계입니다 (읽기 전용)
        </p>
      )}
    </div>
  );
}

// ---- Document Row ----

function DocumentRow({
  doc,
  taskId,
  isEditable,
  onSubmit,
  onReject,
}: {
  doc: DocumentInstance;
  taskId: string;
  isEditable: boolean;
  onSubmit?: (taskId: string, docId: string) => void;
  onReject?: (taskId: string, docId: string, reason: string) => void;
}) {
  const WORKFLOW_ASSIGNEE_ROLES = useCodeMap(CODE.WORKFLOW_ASSIGNEE_ROLES);
  const DOCUMENT_SUBMISSION_STATUS = useCodeMap(CODE.DOCUMENT_SUBMISSION_STATUS);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const roleLabel =
    WORKFLOW_ASSIGNEE_ROLES[doc.responsible_role as keyof typeof WORKFLOW_ASSIGNEE_ROLES] ||
    doc.responsible_role;
  const statusLabel =
    DOCUMENT_SUBMISSION_STATUS[doc.status as keyof typeof DOCUMENT_SUBMISSION_STATUS] || doc.status;

  const statusDot =
    doc.status === 'submitted'
      ? 'bg-green-500'
      : doc.status === 'rejected'
        ? 'bg-red-500'
        : 'bg-gray-400';

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    onReject?.(taskId, doc.id, rejectReason.trim());
    setRejectMode(false);
    setRejectReason('');
  };

  return (
    <div className="flex flex-col gap-1 p-2 rounded border bg-muted/10 text-xs">
      <div className="flex items-center gap-2">
        <span className={cn('h-2 w-2 rounded-full shrink-0', statusDot)} />
        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="font-medium">{doc.title}</span>
        {doc.is_required ? (
          <Badge variant="destructive" className="text-[10px] px-1 py-0">필수</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] px-1 py-0">선택</Badge>
        )}
        <Badge variant="outline" className="text-[10px] px-1 py-0">{roleLabel}</Badge>
        <span className={cn(
          'ml-auto text-[10px]',
          doc.status === 'submitted' && 'text-green-600',
          doc.status === 'rejected' && 'text-red-600',
          doc.status === 'pending' && 'text-muted-foreground',
        )}>
          {statusLabel}
        </span>
      </div>

      {doc.status === 'submitted' && doc.submitted_by && (
        <p className="text-muted-foreground ml-5">
          {doc.submitted_by} 제출
          {doc.submitted_at && ` (${format(new Date(doc.submitted_at), 'yyyy-MM-dd HH:mm')})`}
        </p>
      )}

      {doc.status === 'rejected' && doc.rejected_reason && (
        <p className="text-red-600 ml-5">반려 사유: {doc.rejected_reason}</p>
      )}

      {isEditable && doc.status === 'pending' && (
        <div className="flex items-center gap-1 ml-5 mt-0.5">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2"
            onClick={() => onSubmit?.(taskId, doc.id)}
          >
            <Check className="h-3 w-3 mr-0.5" />
            제출
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2"
            onClick={() => setRejectMode(true)}
          >
            <X className="h-3 w-3 mr-0.5" />
            반려
          </Button>
        </div>
      )}

      {isEditable && doc.status === 'rejected' && (
        <div className="flex items-center gap-1 ml-5 mt-0.5">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2"
            onClick={() => onSubmit?.(taskId, doc.id)}
          >
            <Check className="h-3 w-3 mr-0.5" />
            재제출
          </Button>
        </div>
      )}

      {rejectMode && (
        <div className="flex items-center gap-1 ml-5 mt-0.5">
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="반려 사유"
            className="h-6 text-xs flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleReject();
              if (e.key === 'Escape') setRejectMode(false);
            }}
            autoFocus
          />
          <Button
            size="sm"
            variant="default"
            className="h-6 text-[10px] px-2"
            onClick={handleReject}
          >
            확인
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[10px] px-2"
            onClick={() => setRejectMode(false)}
          >
            취소
          </Button>
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
