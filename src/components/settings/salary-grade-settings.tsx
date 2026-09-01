'use client';

import { useState } from 'react';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useChangeHistory } from '@/lib/hooks/use-change-history';
import { computeFieldChanges } from '@/lib/utils/diff';
import type { SalaryGrade } from '@/types';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, History } from 'lucide-react';
import { toast } from 'sonner';
import EffectiveStatusBadge from '@/components/shared/effective-status-badge';
import EffectiveDateFields from '@/components/shared/effective-date-fields';
import ChangeHistoryDialog from '@/components/shared/change-history-dialog';

const FIELD_LABELS: Record<string, string> = {
  rank_id: '직급',
  step: '호봉',
  base_amount: '기본급',
  is_active: '활성',
  effective_from: '시작일',
  effective_to: '종료일',
};

export default function SalaryGradeSettings() {
  const salaryGrades = useEmployeeStore((s) => s.salaryGrades);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const addSalaryGrade = useEmployeeStore((s) => s.addSalaryGrade);
  const updateSalaryGrade = useEmployeeStore((s) => s.updateSalaryGrade);
  const deleteSalaryGrade = useEmployeeStore((s) => s.deleteSalaryGrade);
  const { recordChange } = useChangeHistory();

  const [filterRankId, setFilterRankId] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryGrade | null>(null);
  const [form, setForm] = useState({
    rank_id: '', step: 1, base_amount: 0, is_active: true, effective_from: '', effective_to: '',
  });

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<SalaryGrade | null>(null);

  const getRankName = (rankId: string) => positionRanks.find((r) => r.id === rankId)?.name ?? '-';

  const filtered = filterRankId === 'all' ? salaryGrades : salaryGrades.filter((g) => g.rank_id === filterRankId);
  const sorted = [...filtered].sort((a, b) => {
    const aRank = positionRanks.find((r) => r.id === a.rank_id);
    const bRank = positionRanks.find((r) => r.id === b.rank_id);
    const levelDiff = (aRank?.level ?? 0) - (bRank?.level ?? 0);
    return levelDiff !== 0 ? levelDiff : a.step - b.step;
  });

  const formatAmount = (amount: number) => new Intl.NumberFormat('ko-KR').format(amount) + '원';

  const handleAdd = () => {
    setEditing(null);
    setForm({ rank_id: positionRanks[0]?.id ?? '', step: 1, base_amount: 0, is_active: true, effective_from: '', effective_to: '' });
    setDialogOpen(true);
  };

  const handleEdit = (grade: SalaryGrade) => {
    setEditing(grade);
    setForm({
      rank_id: grade.rank_id, step: grade.step, base_amount: grade.base_amount, is_active: grade.is_active,
      effective_from: grade.effective_from ?? '', effective_to: grade.effective_to ?? '',
    });
    setDialogOpen(true);
  };

  const handleDelete = (grade: SalaryGrade) => {
    const label = `${getRankName(grade.rank_id)} ${grade.step}호봉`;
    if (window.confirm(`${label}을 미사용 처리하시겠습니까?`)) {
      deleteSalaryGrade(grade.id);
      recordChange('salary_grade', grade.id, label, 'delete', [
        { field: 'is_active', label: '활성', before: '예', after: '아니오' },
      ]);
      toast.success('호봉이 미사용 처리되었습니다.');
    }
  };

  const handleShowHistory = (grade: SalaryGrade) => {
    setHistoryTarget(grade);
    setHistoryOpen(true);
  };

  const handleSave = () => {
    if (!form.rank_id) { toast.error('직급을 선택해주세요.'); return; }
    if (form.base_amount <= 0) { toast.error('기본급을 입력해주세요.'); return; }

    const now = new Date().toISOString();
    const label = `${getRankName(form.rank_id)} ${form.step}호봉`;

    if (editing) {
      const newData: Partial<SalaryGrade> = {
        rank_id: form.rank_id, step: form.step, base_amount: form.base_amount, is_active: form.is_active,
        effective_from: form.effective_from || null, effective_to: form.effective_to || null,
      };
      const changes = computeFieldChanges(
        { ...editing, rank_id: getRankName(editing.rank_id), base_amount: String(editing.base_amount) } as unknown as Record<string, unknown>,
        { ...newData, rank_id: getRankName(form.rank_id), base_amount: String(form.base_amount) } as unknown as Record<string, unknown>,
        FIELD_LABELS,
      );
      updateSalaryGrade(editing.id, newData);
      if (changes.length > 0) recordChange('salary_grade', editing.id, label, 'update', changes);
      toast.success('호봉이 수정되었습니다.');
    } else {
      const newGrade: SalaryGrade = {
        id: `sg-${Date.now()}`, rank_id: form.rank_id, step: form.step, base_amount: form.base_amount, is_active: form.is_active,
        effective_from: form.effective_from || null, effective_to: form.effective_to || null,
        created_at: now, updated_at: now,
      };
      addSalaryGrade(newGrade);
      recordChange('salary_grade', newGrade.id, label, 'create', []);
      toast.success('호봉이 추가되었습니다.');
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>호봉 관리</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterRankId} onValueChange={setFilterRankId}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="전체 직급" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 직급</SelectItem>
                {[...positionRanks].sort((a, b) => a.level - b.level).map((rank) => (
                  <SelectItem key={rank.id} value={rank.id}>{rank.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />추가</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>직급</TableHead>
                <TableHead>호봉</TableHead>
                <TableHead>기본급</TableHead>
                <TableHead>시작일</TableHead>
                <TableHead>종료일</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell className="font-medium">{getRankName(grade.rank_id)}</TableCell>
                  <TableCell>{grade.step}호봉</TableCell>
                  <TableCell>{formatAmount(grade.base_amount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{grade.effective_from ?? '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{grade.effective_to ?? '-'}</TableCell>
                  <TableCell>
                    <EffectiveStatusBadge is_active={grade.is_active} effective_from={grade.effective_from} effective_to={grade.effective_to} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(grade)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleShowHistory(grade)}><History className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(grade)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">등록된 호봉이 없습니다.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '호봉 수정' : '호봉 추가'}</DialogTitle>
            <DialogDescription>{editing ? '기존 호봉을 수정합니다.' : '새로운 호봉을 추가합니다.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sg-rank">직급</Label>
              <Select value={form.rank_id} onValueChange={(v) => setForm((p) => ({ ...p, rank_id: v }))}>
                <SelectTrigger id="sg-rank"><SelectValue placeholder="직급 선택" /></SelectTrigger>
                <SelectContent>
                  {[...positionRanks].sort((a, b) => a.level - b.level).map((rank) => (
                    <SelectItem key={rank.id} value={rank.id}>{rank.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sg-step">호봉</Label>
              <Input id="sg-step" type="number" min={1} value={form.step} onChange={(e) => setForm((p) => ({ ...p, step: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sg-amount">기본급 (원)</Label>
              <Input id="sg-amount" type="number" min={0} step={10000} value={form.base_amount} onChange={(e) => setForm((p) => ({ ...p, base_amount: Number(e.target.value) }))} />
            </div>
            <EffectiveDateFields effectiveFrom={form.effective_from} effectiveTo={form.effective_to} onFromChange={(v) => setForm((p) => ({ ...p, effective_from: v }))} onToChange={(v) => setForm((p) => ({ ...p, effective_to: v }))} />
            <div className="flex items-center justify-between">
              <Label htmlFor="sg-active">활성</Label>
              <Switch id="sg-active" checked={form.is_active} onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {historyTarget && (
        <ChangeHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} entityType="salary_grade" entityId={historyTarget.id} entityLabel={`${getRankName(historyTarget.rank_id)} ${historyTarget.step}호봉`} />
      )}
    </div>
  );
}
