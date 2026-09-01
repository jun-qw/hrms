'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import type { ApprovalTemplate } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  admin: '시스템관리자',
  hr_manager: '인사담당자',
  dept_manager: '부서장',
  employee: '일반직원',
};

const AVAILABLE_ROLES = ['admin', 'hr_manager', 'dept_manager'] as const;

interface TemplateFormData {
  name: string;
  document_type: string;
  steps: Array<{ step: number; role: string }>;
}

const emptyForm: TemplateFormData = {
  name: '',
  document_type: '',
  steps: [],
};

export default function ApprovalSettings() {
  const APPROVAL_DOCUMENT_TYPES = useCodeMap(CODE.APPROVAL_DOCUMENT_TYPES);
  const approvalTemplates = useSettingsStore((s) => s.approvalTemplates);
  const addApprovalTemplate = useSettingsStore((s) => s.addApprovalTemplate);
  const updateApprovalTemplate = useSettingsStore((s) => s.updateApprovalTemplate);
  const deleteApprovalTemplate = useSettingsStore((s) => s.deleteApprovalTemplate);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateFormData>({ ...emptyForm });

  const openCreateDialog = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEditDialog = (template: ApprovalTemplate) => {
    setEditingId(template.id);
    setForm({
      name: template.name,
      document_type: template.document_type,
      steps: template.steps.map((s) => ({ ...s })),
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`"${name}" 템플릿을 삭제하시겠습니까?`)) {
      deleteApprovalTemplate(id);
      toast.success('결재 템플릿이 삭제되었습니다.');
    }
  };

  const addStep = () => {
    setForm((prev) => ({
      ...prev,
      steps: [...prev.steps, { step: prev.steps.length + 1, role: 'dept_manager' }],
    }));
  };

  const removeStep = (index: number) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, step: i + 1 })),
    }));
  };

  const updateStepRole = (index: number, role: string) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, role } : s)),
    }));
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('템플릿명을 입력해주세요.');
      return;
    }
    if (!form.document_type) {
      toast.error('문서유형을 선택해주세요.');
      return;
    }
    if (form.steps.length === 0) {
      toast.error('결재단계를 1개 이상 추가해주세요.');
      return;
    }

    const now = new Date().toISOString();

    if (editingId) {
      updateApprovalTemplate(editingId, {
        name: form.name,
        document_type: form.document_type,
        steps: form.steps,
        updated_at: now,
      });
      toast.success('결재 템플릿이 수정되었습니다.');
    } else {
      const newTemplate: ApprovalTemplate = {
        id: `at-${Date.now()}`,
        name: form.name,
        document_type: form.document_type,
        steps: form.steps,
        is_active: true,
        created_at: now,
        updated_at: now,
      };
      addApprovalTemplate(newTemplate);
      toast.success('결재 템플릿이 추가되었습니다.');
    }

    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>문서유형별 결재라인 템플릿</CardTitle>
            <Button onClick={openCreateDialog} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>템플릿명</TableHead>
                <TableHead>문서유형</TableHead>
                <TableHead>결재단계</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvalTemplates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    {APPROVAL_DOCUMENT_TYPES[t.document_type as keyof typeof APPROVAL_DOCUMENT_TYPES] ?? t.document_type}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-sm text-muted-foreground mr-1">
                        {t.steps.length}단계
                      </span>
                      {t.steps.map((step) => (
                        <Badge key={step.step} variant="secondary">
                          {step.step}. {ROLE_LABELS[step.role] ?? step.role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(t)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(t.id, t.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {approvalTemplates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    등록된 결재 템플릿이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? '결재 템플릿 수정' : '결재 템플릿 추가'}
            </DialogTitle>
            <DialogDescription>
              결재라인 템플릿의 정보를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">템플릿명</Label>
              <Input
                id="template-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="예: 휴가 결재"
              />
            </div>
            <div className="space-y-2">
              <Label>문서유형</Label>
              <Select
                value={form.document_type}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, document_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="문서유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(APPROVAL_DOCUMENT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>결재단계</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-1" />
                  단계 추가
                </Button>
              </div>
              {form.steps.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  결재단계를 추가해주세요.
                </p>
              )}
              <div className="space-y-2">
                {form.steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-16">
                      {step.step}단계
                    </span>
                    <Select
                      value={step.role}
                      onValueChange={(value) => updateStepRole(index, value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
