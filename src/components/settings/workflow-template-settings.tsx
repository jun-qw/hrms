'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useWorkflowStore, type WorkflowTemplate } from '@/lib/stores/workflow-store';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import { toast } from 'sonner';
import WorkflowTemplateEditor from './workflow-template-editor';

export default function WorkflowTemplateSettings() {
  const WORKFLOW_TYPE = useCodeMap(CODE.WORKFLOW_TYPE);
  const templates = useWorkflowStore((s) => s.templates);
  const addTemplate = useWorkflowStore((s) => s.addTemplate);
  const updateTemplate = useWorkflowStore((s) => s.updateTemplate);
  const deleteTemplate = useWorkflowStore((s) => s.deleteTemplate);
  const toggleTemplateActive = useWorkflowStore((s) => s.toggleTemplateActive);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowTemplate | null>(null);

  const handleAdd = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const handleEdit = (template: WorkflowTemplate) => {
    setEditing(template);
    setEditorOpen(true);
  };

  const handleSave = (data: Partial<WorkflowTemplate>) => {
    if (editing) {
      updateTemplate(editing.id, data);
      toast.success('템플릿이 수정되었습니다.');
    } else {
      addTemplate({
        name: data.name || '',
        type: data.type || 'onboarding',
        description: data.description || '',
        steps: data.steps || [],
        is_active: true,
      });
      toast.success('템플릿이 추가되었습니다.');
    }
  };

  const handleDelete = (template: WorkflowTemplate) => {
    deleteTemplate(template.id);
    toast.success('템플릿이 삭제되었습니다.');
  };

  const getStepCount = (t: WorkflowTemplate) => t.steps.length;
  const getTaskCount = (t: WorkflowTemplate) =>
    t.steps.reduce((sum, step) => sum + step.tasks.length, 0);
  const getDocCount = (t: WorkflowTemplate) =>
    t.steps.reduce(
      (sum, step) =>
        sum + step.tasks.reduce((ts, task) => ts + (task.documents || []).length, 0),
      0
    );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>프로세스 템플릿 관리</CardTitle>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            추가
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>유형</TableHead>
                <TableHead className="text-center">단계수</TableHead>
                <TableHead className="text-center">태스크수</TableHead>
                <TableHead className="text-center">서류수</TableHead>
                <TableHead className="text-center">활성</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {WORKFLOW_TYPE[t.type as keyof typeof WORKFLOW_TYPE] || t.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{getStepCount(t)}</TableCell>
                  <TableCell className="text-center">{getTaskCount(t)}</TableCell>
                  <TableCell className="text-center">{getDocCount(t)}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={t.is_active}
                      onCheckedChange={() => toggleTemplateActive(t.id)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(t)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(t)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    등록된 템플릿이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <WorkflowTemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editing}
        onSave={handleSave}
      />
    </>
  );
}
