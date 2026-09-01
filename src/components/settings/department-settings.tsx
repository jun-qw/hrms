'use client';

import { useState } from 'react';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useChangeHistory } from '@/lib/hooks/use-change-history';
import { computeFieldChanges } from '@/lib/utils/diff';
import type { Department } from '@/types';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, History } from 'lucide-react';
import { toast } from 'sonner';
import EffectiveStatusBadge from '@/components/shared/effective-status-badge';
import EffectiveDateFields from '@/components/shared/effective-date-fields';
import ChangeHistoryDialog from '@/components/shared/change-history-dialog';

const FIELD_LABELS: Record<string, string> = {
  name: '부서명',
  code: '코드',
  parent_id: '상위부서',
  sort_order: '정렬순서',
  is_active: '활성',
  effective_from: '시작일',
  effective_to: '종료일',
};

export default function DepartmentSettings() {
  const departments = useEmployeeStore((s) => s.departments);
  const addDepartment = useEmployeeStore((s) => s.addDepartment);
  const updateDepartment = useEmployeeStore((s) => s.updateDepartment);
  const deleteDepartment = useEmployeeStore((s) => s.deleteDepartment);
  const { recordChange } = useChangeHistory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({
    name: '', code: '', parent_id: '' as string | null, sort_order: 1, is_active: true,
    effective_from: '', effective_to: '',
  });

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Department | null>(null);

  const topLevel = departments.filter((d) => !d.parent_id);

  const getParentName = (parentId: string | null) => {
    if (!parentId) return '-';
    return departments.find((d) => d.id === parentId)?.name ?? '-';
  };

  const sortedDepts = [...departments].sort((a, b) => {
    const aParent = a.parent_id ?? a.id;
    const bParent = b.parent_id ?? b.id;
    if (aParent !== bParent) {
      const aIdx = departments.findIndex((d) => d.id === (a.parent_id ?? a.id));
      const bIdx = departments.findIndex((d) => d.id === (b.parent_id ?? b.id));
      return aIdx - bIdx;
    }
    if (a.parent_id && !b.parent_id) return 1;
    if (!a.parent_id && b.parent_id) return -1;
    return a.sort_order - b.sort_order;
  });

  const handleAdd = () => {
    setEditing(null);
    setForm({ name: '', code: '', parent_id: null, sort_order: departments.length + 1, is_active: true, effective_from: '', effective_to: '' });
    setDialogOpen(true);
  };

  const handleEdit = (dept: Department) => {
    setEditing(dept);
    setForm({
      name: dept.name, code: dept.code, parent_id: dept.parent_id, sort_order: dept.sort_order, is_active: dept.is_active,
      effective_from: dept.effective_from ?? '', effective_to: dept.effective_to ?? '',
    });
    setDialogOpen(true);
  };

  const handleDelete = (dept: Department) => {
    const hasChildren = departments.some((d) => d.parent_id === dept.id);
    if (hasChildren) { toast.error('하위 부서가 있는 부서는 삭제할 수 없습니다.'); return; }
    if (window.confirm(`"${dept.name}" 부서를 미사용 처리하시겠습니까?`)) {
      deleteDepartment(dept.id);
      recordChange('department', dept.id, dept.name, 'delete', [
        { field: 'is_active', label: '활성', before: '예', after: '아니오' },
      ]);
      toast.success('부서가 미사용 처리되었습니다.');
    }
  };

  const handleShowHistory = (dept: Department) => {
    setHistoryTarget(dept);
    setHistoryOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('부서명을 입력해주세요.'); return; }
    if (!form.code.trim()) { toast.error('부서 코드를 입력해주세요.'); return; }

    const now = new Date().toISOString();
    if (editing) {
      const newData: Partial<Department> = {
        name: form.name, code: form.code, parent_id: form.parent_id || null,
        level: form.parent_id ? 2 : 1, sort_order: form.sort_order, is_active: form.is_active,
        effective_from: form.effective_from || null, effective_to: form.effective_to || null,
      };
      const changes = computeFieldChanges(
        { ...editing, parent_id: getParentName(editing.parent_id) } as unknown as Record<string, unknown>,
        { ...newData, parent_id: getParentName(form.parent_id || null) } as unknown as Record<string, unknown>,
        FIELD_LABELS,
      );
      updateDepartment(editing.id, newData);
      if (changes.length > 0) recordChange('department', editing.id, form.name, 'update', changes);
      toast.success('부서가 수정되었습니다.');
    } else {
      const newDept: Department = {
        id: `dept-${Date.now()}`, name: form.name, code: form.code, parent_id: form.parent_id || null,
        level: form.parent_id ? 2 : 1, sort_order: form.sort_order, is_active: form.is_active,
        effective_from: form.effective_from || null, effective_to: form.effective_to || null,
        created_at: now, updated_at: now,
      };
      addDepartment(newDept);
      recordChange('department', newDept.id, newDept.name, 'create', []);
      toast.success('부서가 추가되었습니다.');
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>부서 관리</CardTitle>
          <Button size="sm" onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />추가</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>부서명</TableHead>
                <TableHead>코드</TableHead>
                <TableHead>상위부서</TableHead>
                <TableHead>정렬순서</TableHead>
                <TableHead>시작일</TableHead>
                <TableHead>종료일</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDepts.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">
                    {dept.parent_id && <span className="text-muted-foreground mr-2">└</span>}
                    {dept.name}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs font-mono">{dept.code}</Badge></TableCell>
                  <TableCell>{getParentName(dept.parent_id)}</TableCell>
                  <TableCell>{dept.sort_order}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{dept.effective_from ?? '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{dept.effective_to ?? '-'}</TableCell>
                  <TableCell>
                    <EffectiveStatusBadge is_active={dept.is_active} effective_from={dept.effective_from} effective_to={dept.effective_to} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleShowHistory(dept)}><History className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(dept)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {departments.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">등록된 부서가 없습니다.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '부서 수정' : '부서 추가'}</DialogTitle>
            <DialogDescription>{editing ? '기존 부서 정보를 수정합니다.' : '새로운 부서를 추가합니다.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dept-name">부서명</Label>
              <Input id="dept-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-code">코드</Label>
              <Input id="dept-code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-parent">상위부서</Label>
              <Select value={form.parent_id ?? 'none'} onValueChange={(v) => setForm((p) => ({ ...p, parent_id: v === 'none' ? null : v }))}>
                <SelectTrigger id="dept-parent"><SelectValue placeholder="없음 (최상위)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음 (최상위)</SelectItem>
                  {topLevel.filter((d) => d.id !== editing?.id).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-sort">정렬순서</Label>
              <Input id="dept-sort" type="number" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))} />
            </div>
            <EffectiveDateFields effectiveFrom={form.effective_from} effectiveTo={form.effective_to} onFromChange={(v) => setForm((p) => ({ ...p, effective_from: v }))} onToChange={(v) => setForm((p) => ({ ...p, effective_to: v }))} />
            <div className="flex items-center justify-between">
              <Label htmlFor="dept-active">활성</Label>
              <Switch id="dept-active" checked={form.is_active} onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {historyTarget && (
        <ChangeHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} entityType="department" entityId={historyTarget.id} entityLabel={historyTarget.name} />
      )}
    </div>
  );
}
