'use client';

import { useState } from 'react';
import { useLeaveStore } from '@/lib/stores/leave-store';
import type { LeaveType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LeaveTypeManagement() {
  const leaveTypes = useLeaveStore((s) => s.leaveTypes);
  const addLeaveType = useLeaveStore((s) => s.addLeaveType);
  const updateLeaveType = useLeaveStore((s) => s.updateLeaveType);
  const deleteLeaveType = useLeaveStore((s) => s.deleteLeaveType);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    is_paid: true,
    max_days: '',
    is_active: true,
  });

  const handleAdd = () => {
    setEditing(null);
    setForm({ name: '', code: '', is_paid: true, max_days: '', is_active: true });
    setDialogOpen(true);
  };

  const handleEdit = (lt: LeaveType) => {
    setEditing(lt);
    setForm({
      name: lt.name,
      code: lt.code,
      is_paid: lt.is_paid,
      max_days: lt.max_days !== null ? String(lt.max_days) : '',
      is_active: lt.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = (lt: LeaveType) => {
    if (window.confirm(`"${lt.name}" 휴가 유형을 삭제하시겠습니까?`)) {
      deleteLeaveType(lt.id);
      toast.success('휴가 유형이 삭제되었습니다.');
    }
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('유형명과 코드를 입력해주세요.');
      return;
    }
    const maxDays = form.max_days ? Number(form.max_days) : null;

    if (editing) {
      updateLeaveType(editing.id, {
        name: form.name,
        code: form.code,
        is_paid: form.is_paid,
        max_days: maxDays,
        is_active: form.is_active,
      });
      toast.success('휴가 유형이 수정되었습니다.');
    } else {
      const newType: LeaveType = {
        id: `lt-${crypto.randomUUID().slice(0, 8)}`,
        name: form.name,
        code: form.code,
        is_paid: form.is_paid,
        max_days: maxDays,
        is_active: form.is_active,
      };
      addLeaveType(newType);
      toast.success('휴가 유형이 추가되었습니다.');
    }
    setDialogOpen(false);
  };

  const handleToggleActive = (lt: LeaveType) => {
    updateLeaveType(lt.id, { is_active: !lt.is_active });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">휴가 유형 관리</CardTitle>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            추가
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>유형명</TableHead>
                  <TableHead>코드</TableHead>
                  <TableHead>유급</TableHead>
                  <TableHead className="text-center">최대일수</TableHead>
                  <TableHead>활성</TableHead>
                  <TableHead>관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes.map((lt) => (
                  <TableRow key={lt.id}>
                    <TableCell className="font-medium">{lt.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lt.code}
                    </TableCell>
                    <TableCell>
                      <Badge variant={lt.is_paid ? 'default' : 'secondary'}>
                        {lt.is_paid ? '유급' : '무급'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {lt.max_days !== null ? `${lt.max_days}일` : '무제한'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={lt.is_active}
                        onCheckedChange={() => handleToggleActive(lt)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(lt)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(lt)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {leaveTypes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      등록된 휴가 유형이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '휴가 유형 수정' : '휴가 유형 추가'}</DialogTitle>
            <DialogDescription>
              {editing ? '기존 휴가 유형을 수정합니다.' : '새로운 휴가 유형을 추가합니다.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>유형명</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>코드</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>최대 일수 (비워두면 무제한)</Label>
              <Input
                type="number"
                value={form.max_days}
                onChange={(e) => setForm((p) => ({ ...p, max_days: e.target.value }))}
                placeholder="무제한"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>유급 여부</Label>
              <Switch
                checked={form.is_paid}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, is_paid: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>활성 상태</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
              />
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
    </>
  );
}
