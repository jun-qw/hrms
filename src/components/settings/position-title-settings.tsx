'use client';

import { useState } from 'react';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useChangeHistory } from '@/lib/hooks/use-change-history';
import { computeFieldChanges } from '@/lib/utils/diff';
import type { PositionTitle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  name: '직책명',
  level: '레벨',
  is_active: '활성',
  effective_from: '시작일',
  effective_to: '종료일',
};

export default function PositionTitleSettings() {
  const positionTitles = useEmployeeStore((s) => s.positionTitles);
  const addPositionTitle = useEmployeeStore((s) => s.addPositionTitle);
  const updatePositionTitle = useEmployeeStore((s) => s.updatePositionTitle);
  const deletePositionTitle = useEmployeeStore((s) => s.deletePositionTitle);
  const { recordChange } = useChangeHistory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PositionTitle | null>(null);
  const [form, setForm] = useState({
    name: '', level: 1, is_active: true, effective_from: '', effective_to: '',
  });

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<PositionTitle | null>(null);

  const handleAdd = () => {
    setEditing(null);
    setForm({ name: '', level: positionTitles.length + 1, is_active: true, effective_from: '', effective_to: '' });
    setDialogOpen(true);
  };

  const handleEdit = (title: PositionTitle) => {
    setEditing(title);
    setForm({
      name: title.name, level: title.level, is_active: title.is_active,
      effective_from: title.effective_from ?? '', effective_to: title.effective_to ?? '',
    });
    setDialogOpen(true);
  };

  const handleDelete = (title: PositionTitle) => {
    if (window.confirm(`"${title.name}" 직책을 미사용 처리하시겠습니까?`)) {
      deletePositionTitle(title.id);
      recordChange('position_title', title.id, title.name, 'delete', [
        { field: 'is_active', label: '활성', before: '예', after: '아니오' },
      ]);
      toast.success('직책이 미사용 처리되었습니다.');
    }
  };

  const handleShowHistory = (title: PositionTitle) => {
    setHistoryTarget(title);
    setHistoryOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('직책명을 입력해주세요.'); return; }
    const now = new Date().toISOString();
    if (editing) {
      const newData: Partial<PositionTitle> = {
        name: form.name, level: form.level, is_active: form.is_active,
        effective_from: form.effective_from || null, effective_to: form.effective_to || null,
      };
      const changes = computeFieldChanges(
        editing as unknown as Record<string, unknown>,
        newData as unknown as Record<string, unknown>,
        FIELD_LABELS,
      );
      updatePositionTitle(editing.id, newData);
      if (changes.length > 0) recordChange('position_title', editing.id, form.name, 'update', changes);
      toast.success('직책이 수정되었습니다.');
    } else {
      const newTitle: PositionTitle = {
        id: `title-${Date.now()}`, name: form.name, level: form.level, is_active: form.is_active,
        effective_from: form.effective_from || null, effective_to: form.effective_to || null,
        created_at: now, updated_at: now,
      };
      addPositionTitle(newTitle);
      recordChange('position_title', newTitle.id, newTitle.name, 'create', []);
      toast.success('직책이 추가되었습니다.');
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>직책 관리</CardTitle>
          <Button size="sm" onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />추가</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>직책명</TableHead>
                <TableHead>레벨</TableHead>
                <TableHead>시작일</TableHead>
                <TableHead>종료일</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...positionTitles].sort((a, b) => a.level - b.level).map((title) => (
                <TableRow key={title.id}>
                  <TableCell className="font-medium">{title.name}</TableCell>
                  <TableCell>{title.level}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{title.effective_from ?? '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{title.effective_to ?? '-'}</TableCell>
                  <TableCell>
                    <EffectiveStatusBadge is_active={title.is_active} effective_from={title.effective_from} effective_to={title.effective_to} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(title)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleShowHistory(title)}><History className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(title)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {positionTitles.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">등록된 직책이 없습니다.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '직책 수정' : '직책 추가'}</DialogTitle>
            <DialogDescription>{editing ? '기존 직책을 수정합니다.' : '새로운 직책을 추가합니다.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title-name">직책명</Label>
              <Input id="title-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title-level">레벨</Label>
              <Input id="title-level" type="number" value={form.level} onChange={(e) => setForm((p) => ({ ...p, level: Number(e.target.value) }))} />
            </div>
            <EffectiveDateFields effectiveFrom={form.effective_from} effectiveTo={form.effective_to} onFromChange={(v) => setForm((p) => ({ ...p, effective_from: v }))} onToChange={(v) => setForm((p) => ({ ...p, effective_to: v }))} />
            <div className="flex items-center justify-between">
              <Label htmlFor="title-active">활성</Label>
              <Switch id="title-active" checked={form.is_active} onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {historyTarget && (
        <ChangeHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} entityType="position_title" entityId={historyTarget.id} entityLabel={historyTarget.name} />
      )}
    </div>
  );
}
