'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import type { WorkflowType } from '@/types';
import type {
  WorkflowTemplate,
  WorkflowTemplateStep,
  WorkflowTemplateTask,
  DocumentRequirement,
} from '@/lib/stores/workflow-store';
import { toast } from 'sonner';

interface WorkflowTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: WorkflowTemplate | null;
  onSave: (data: Partial<WorkflowTemplate>) => void;
}

interface FormStep {
  id: string;
  title: string;
  sort_order: number;
  tasks: FormTask[];
}

interface FormTask {
  id: string;
  title: string;
  assignee_role: string;
  is_required: boolean;
  sort_order: number;
  documents: FormDocument[];
}

interface FormDocument {
  id: string;
  title: string;
  description: string;
  is_required: boolean;
  responsible_role: string;
  deadline_days: number | null;
  sort_order: number;
}

const emptyForm = {
  name: '',
  type: 'onboarding' as WorkflowType,
  description: '',
  steps: [] as FormStep[],
};

export default function WorkflowTemplateEditor({
  open,
  onOpenChange,
  template,
  onSave,
}: WorkflowTemplateEditorProps) {
  const WORKFLOW_TYPE = useCodeMap(CODE.WORKFLOW_TYPE);
  const WORKFLOW_ASSIGNEE_ROLES = useCodeMap(CODE.WORKFLOW_ASSIGNEE_ROLES);
  const [form, setForm] = useState(emptyForm);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      if (template) {
        setForm({
          name: template.name,
          type: template.type,
          description: template.description,
          steps: template.steps.map((s) => ({
            id: s.id,
            title: s.title,
            sort_order: s.sort_order,
            tasks: s.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              assignee_role: t.assignee_role,
              is_required: t.is_required,
              sort_order: t.sort_order,
              documents: (t.documents || []).map((d) => ({ ...d })),
            })),
          })),
        });
        setExpandedSteps(new Set(template.steps.map((s) => s.id)));
      } else {
        setForm({ ...emptyForm, steps: [] });
        setExpandedSteps(new Set());
      }
    }
  }, [open, template]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  // ---- Step actions ----
  const addStep = () => {
    const newId = `step-new-${Date.now()}`;
    setForm((prev) => ({
      ...prev,
      steps: [...prev.steps, { id: newId, title: '', sort_order: prev.steps.length, tasks: [] }],
    }));
    setExpandedSteps((prev) => new Set(prev).add(newId));
  };

  const updateStepTitle = (stepId: string, title: string) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === stepId ? { ...s, title } : s)),
    }));
  };

  const removeStep = (stepId: string) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, sort_order: i })),
    }));
  };

  // ---- Task actions ----
  const addTask = (stepId: string) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => {
        if (s.id !== stepId) return s;
        return {
          ...s,
          tasks: [
            ...s.tasks,
            {
              id: `task-new-${Date.now()}`,
              title: '',
              assignee_role: 'hr',
              is_required: true,
              sort_order: s.tasks.length,
              documents: [],
            },
          ],
        };
      }),
    }));
  };

  const updateTask = (stepId: string, taskId: string, updates: Partial<FormTask>) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => {
        if (s.id !== stepId) return s;
        return {
          ...s,
          tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
        };
      }),
    }));
  };

  const removeTask = (stepId: string, taskId: string) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => {
        if (s.id !== stepId) return s;
        return {
          ...s,
          tasks: s.tasks.filter((t) => t.id !== taskId).map((t, i) => ({ ...t, sort_order: i })),
        };
      }),
    }));
  };

  // ---- Document actions ----
  const addDocument = (stepId: string, taskId: string) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => {
        if (s.id !== stepId) return s;
        return {
          ...s,
          tasks: s.tasks.map((t) => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              documents: [
                ...t.documents,
                {
                  id: `doc-new-${Date.now()}`,
                  title: '',
                  description: '',
                  is_required: true,
                  responsible_role: 'employee',
                  deadline_days: 7,
                  sort_order: t.documents.length,
                },
              ],
            };
          }),
        };
      }),
    }));
  };

  const updateDocument = (stepId: string, taskId: string, docId: string, updates: Partial<FormDocument>) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => {
        if (s.id !== stepId) return s;
        return {
          ...s,
          tasks: s.tasks.map((t) => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              documents: t.documents.map((d) => (d.id === docId ? { ...d, ...updates } : d)),
            };
          }),
        };
      }),
    }));
  };

  const removeDocument = (stepId: string, taskId: string, docId: string) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => {
        if (s.id !== stepId) return s;
        return {
          ...s,
          tasks: s.tasks.map((t) => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              documents: t.documents.filter((d) => d.id !== docId).map((d, i) => ({ ...d, sort_order: i })),
            };
          }),
        };
      }),
    }));
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('템플릿 이름을 입력해주세요.');
      return;
    }

    const steps: WorkflowTemplateStep[] = form.steps.map((s, si) => ({
      id: s.id,
      title: s.title || `단계 ${si + 1}`,
      sort_order: si,
      tasks: s.tasks.map((t, ti) => ({
        id: t.id,
        title: t.title || `태스크 ${ti + 1}`,
        assignee_role: t.assignee_role,
        is_required: t.is_required,
        sort_order: ti,
        documents: t.documents.map((d, di) => ({
          id: d.id,
          title: d.title || `서류 ${di + 1}`,
          description: d.description,
          is_required: d.is_required,
          responsible_role: d.responsible_role,
          deadline_days: d.deadline_days,
          sort_order: di,
        })) as DocumentRequirement[],
      })) as WorkflowTemplateTask[],
    }));

    onSave({
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim(),
      steps,
    });
    onOpenChange(false);
  };

  const totalDocs = form.steps.reduce(
    (sum, s) => sum + s.tasks.reduce((ts, t) => ts + t.documents.length, 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? '템플릿 편집' : '템플릿 추가'}</DialogTitle>
          <DialogDescription>
            단계, 태스크, 서류 요구사항까지 편집할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>템플릿 이름</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="예: 신입사원 입사"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>유형</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as WorkflowType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WORKFLOW_TYPE).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="프로세스 설명"
                />
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                단계 ({form.steps.length})
                {totalDocs > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    서류 {totalDocs}건
                  </span>
                )}
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                단계 추가
              </Button>
            </div>

            {form.steps.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                등록된 단계가 없습니다. &quot;단계 추가&quot; 버튼을 클릭하세요.
              </p>
            )}

            <div className="space-y-3">
              {form.steps.map((step, stepIdx) => {
                const isExpanded = expandedSteps.has(step.id);
                const stepDocCount = step.tasks.reduce((s, t) => s + t.documents.length, 0);

                return (
                  <div key={step.id} className="border rounded-lg">
                    {/* Step header */}
                    <div className="flex items-center gap-2 p-3 bg-muted/30">
                      <button
                        type="button"
                        onClick={() => toggleStep(step.id)}
                        className="shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {stepIdx + 1}
                      </Badge>
                      <Input
                        value={step.title}
                        onChange={(e) => updateStepTitle(step.id, e.target.value)}
                        placeholder={`단계 ${stepIdx + 1} 이름`}
                        className="h-8 text-sm"
                      />
                      <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                        태스크 {step.tasks.length}
                        {stepDocCount > 0 && ` / 서류 ${stepDocCount}`}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeStep(step.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Step body (tasks) */}
                    {isExpanded && (
                      <div className="p-3 space-y-3">
                        {step.tasks.map((task, taskIdx) => (
                          <div key={task.id} className="border rounded-md p-3 space-y-2 bg-background">
                            {/* Task row */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground shrink-0 w-5 text-center">
                                {taskIdx + 1}
                              </span>
                              <Input
                                value={task.title}
                                onChange={(e) =>
                                  updateTask(step.id, task.id, { title: e.target.value })
                                }
                                placeholder="태스크 제목"
                                className="h-8 text-sm flex-1"
                              />
                              <Select
                                value={task.assignee_role}
                                onValueChange={(v) =>
                                  updateTask(step.id, task.id, { assignee_role: v })
                                }
                              >
                                <SelectTrigger className="h-8 w-[120px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(WORKFLOW_ASSIGNEE_ROLES).map(([key, label]) => (
                                    <SelectItem key={key} value={key} className="text-xs">
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex items-center gap-1 shrink-0">
                                <Switch
                                  checked={task.is_required}
                                  onCheckedChange={(v) =>
                                    updateTask(step.id, task.id, { is_required: v })
                                  }
                                  className="scale-75"
                                />
                                <span className="text-xs text-muted-foreground">필수</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => removeTask(step.id, task.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            {/* Documents */}
                            {task.documents.length > 0 && (
                              <div className="ml-5 space-y-2">
                                {task.documents.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-start gap-2 p-2 bg-muted/20 rounded border border-dashed"
                                  >
                                    <FileText className="h-3.5 w-3.5 mt-1.5 shrink-0 text-muted-foreground" />
                                    <div className="flex-1 space-y-1.5">
                                      <div className="flex items-center gap-2">
                                        <Input
                                          value={doc.title}
                                          onChange={(e) =>
                                            updateDocument(step.id, task.id, doc.id, {
                                              title: e.target.value,
                                            })
                                          }
                                          placeholder="서류명"
                                          className="h-7 text-xs flex-1"
                                        />
                                        <Select
                                          value={doc.responsible_role}
                                          onValueChange={(v) =>
                                            updateDocument(step.id, task.id, doc.id, {
                                              responsible_role: v,
                                            })
                                          }
                                        >
                                          <SelectTrigger className="h-7 w-[100px] text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Object.entries(WORKFLOW_ASSIGNEE_ROLES).map(
                                              ([key, label]) => (
                                                <SelectItem
                                                  key={key}
                                                  value={key}
                                                  className="text-xs"
                                                >
                                                  {label}
                                                </SelectItem>
                                              )
                                            )}
                                          </SelectContent>
                                        </Select>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <Switch
                                            checked={doc.is_required}
                                            onCheckedChange={(v) =>
                                              updateDocument(step.id, task.id, doc.id, {
                                                is_required: v,
                                              })
                                            }
                                            className="scale-75"
                                          />
                                          <span className="text-xs text-muted-foreground">필수</span>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() =>
                                            removeDocument(step.id, task.id, doc.id)
                                          }
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          value={doc.description}
                                          onChange={(e) =>
                                            updateDocument(step.id, task.id, doc.id, {
                                              description: e.target.value,
                                            })
                                          }
                                          placeholder="설명 (선택)"
                                          className="h-7 text-xs flex-1"
                                        />
                                        <div className="flex items-center gap-1 shrink-0">
                                          <Input
                                            type="number"
                                            value={doc.deadline_days ?? ''}
                                            onChange={(e) =>
                                              updateDocument(step.id, task.id, doc.id, {
                                                deadline_days: e.target.value
                                                  ? parseInt(e.target.value)
                                                  : null,
                                              })
                                            }
                                            placeholder="일"
                                            className="h-7 w-16 text-xs"
                                          />
                                          <span className="text-xs text-muted-foreground">일 이내</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="ml-5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground"
                                onClick={() => addDocument(step.id, task.id)}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                서류 추가
                              </Button>
                            </div>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => addTask(step.id)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          태스크 추가
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
