'use client';

import { useState } from 'react';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useChangeHistory } from '@/lib/hooks/use-change-history';
import { computeFieldChanges } from '@/lib/utils/diff';
import type { JobCategory } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, History } from 'lucide-react';
import { toast } from 'sonner';
import EffectiveStatusBadge from '@/components/shared/effective-status-badge';
import EffectiveDateFields from '@/components/shared/effective-date-fields';
import ChangeHistoryDialog from '@/components/shared/change-history-dialog';

const FIELD_LABELS: Record<string, string> = {
  name: '직무명',
  code: '코드',
  description: '설명',
  is_active: '활성',
  effective_from: '시작일',
  effective_to: '종료일',
};

export default function JobCategorySettings() {
  const jobCategories = useEmployeeStore((s) => s.jobCategories);
  const addJobCategory = useEmployeeStore((s) => s.addJobCategory);
  const updateJobCategory = useEmployeeStore((s) => s.updateJobCategory);
  const deleteJobCategory = useEmployeeStore((s) => s.deleteJobCategory);
  const { recordChange } = useChangeHistory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobCategory | null>(null);
  const [form, setForm] = useState({
    name: '', code: '', description: '', is_active: true, effective_from: '', effective_to: '',
  });

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<JobCategory | null>(null);

  const handleAdd = () => {
    setEditing(null);
    setForm({ name: '', code: '', description: '', is_active: true, effective_from: '', effective_to: '' });
    setDialogOpen(true);
  };

  const handleEdit = (cat: JobCategory) => {
    setEditing(cat);
    setForm({
      name: cat.name, code: cat.code, description: cat.description ?? '', is_active: cat.is_active,
      effective_from: cat.effective_from ?? '', effective_to: cat.effective_to ?? '',
    });
    setDialogOpen(true);
  };

  const handleDelete = (cat: JobCategory) => {
    if (window.confirm(`"${cat.name}" 직무를 미사용 처리하시겠습니까?`)) {
      deleteJobCategory(cat.id);
      recordChange('job_category', cat.id, cat.name, 'delete', [
        { field: 'is_active', label: '활성', before: '예', after: '아니오' },
      ]);
      toast.success('직무가 미사용 처리되었습니다.');
    }
  };

  const handleShowHistory = (cat: JobCategory) => {
    setHistoryTarget(cat);
    setHistoryOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('직무명을 입력해주세요.'); return; }
    if (!form.code.trim()) { toast.error('코드를 입력해주세요.'); return; }

    const now = new Date().toISOString();
    if (editing) {
      const newData: Partial<JobCategory> = {
        name: form.name, code: form.code, description: form.description || null, is_active: form.is_active,
        effective_from: form.effective_from || null, effective_to: form.effective_to || null,
      };
      const changes = computeFieldChanges(
        editing as unknown as Record<string, unknown>,
        newData as unknown as Record<string, unknown>,
        FIELD_LABELS,
      );
      updateJobCategory(editing.id, newData);
      if (changes.length > 0) recordChange('job_category', editing.id, form.name, 'update', changes);
      toast.success('직무가 수정되었습니다.');
    } else {
      const newCat: JobCategory = {
        id: `jc-${Date.now()}`, name: form.name, code: form.code, description: form.description || null,
        sort_order: jobCategories.length + 1, is_active: form.is_active,
        effective_from: form.effective_from || null, effective_to: form.effective_to || null,
        created_at: now, updated_at: now,
      };
      addJobCategory(newCat);
      recordChange('job_category', newCat.id, newCat.name, 'create', []);
      toast.success('직무가 추가되었습니다.');
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>직무 관리</CardTitle>
          <Button size="sm" onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />추가</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>직무명</TableHead>
                <TableHead>코드</TableHead>
                <TableHead>설명</TableHead>
                <TableHead>시작일</TableHead>
                <TableHead>종료일</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...jobCategories].sort((a, b) => a.sort_order - b.sort_order).map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs font-mono">{cat.code}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{cat.description ?? '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{cat.effective_from ?? '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{cat.effective_to ?? '-'}</TableCell>
                  <TableCell>
                    <EffectiveStatusBadge is_active={cat.is_active} effective_from={cat.effective_from} effective_to={cat.effective_to} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleShowHistory(cat)}><History className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cat)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {jobCategories.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">등록된 직무가 없습니다.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '직무 수정' : '직무 추가'}</DialogTitle>
            <DialogDescription>{editing ? '기존 직무를 수정합니다.' : '새로운 직무를 추가합니다.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="jc-name">직무명</Label>
              <Input id="jc-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jc-code">코드</Label>
              <Input id="jc-code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jc-desc">설명</Label>
              <Input id="jc-desc" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <EffectiveDateFields effectiveFrom={form.effective_from} effectiveTo={form.effective_to} onFromChange={(v) => setForm((p) => ({ ...p, effective_from: v }))} onToChange={(v) => setForm((p) => ({ ...p, effective_to: v }))} />
            <div className="flex items-center justify-between">
              <Label htmlFor="jc-active">활성</Label>
              <Switch id="jc-active" checked={form.is_active} onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {historyTarget && (
        <ChangeHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} entityType="job_category" entityId={historyTarget.id} entityLabel={historyTarget.name} />
      )}
    </div>
  );
}
