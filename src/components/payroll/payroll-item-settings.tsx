'use client';

import { useState } from 'react';
import { usePayrollStore } from '@/lib/stores/payroll-store';
import type { PayrollItemConfig, PayrollCalcType } from '@/types';
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

// System item codes that cannot be deleted
const SYSTEM_CODES = new Set([
  'base_salary', 'national_pension', 'health_insurance',
  'long_term_care', 'employment_insurance', 'income_tax', 'local_tax',
]);

interface PayrollItemSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PayrollItemSettings({ open, onOpenChange }: PayrollItemSettingsProps) {
  const payrollItems = usePayrollStore((s) => s.payrollItems);
  const addPayrollItem = usePayrollStore((s) => s.addPayrollItem);
  const updatePayrollItem = usePayrollStore((s) => s.updatePayrollItem);
  const deletePayrollItem = usePayrollStore((s) => s.deletePayrollItem);
  const togglePayrollItem = usePayrollStore((s) => s.togglePayrollItem);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<PayrollItemConfig | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    category: 'earning' as 'earning' | 'deduction',
    calc_type: 'fixed' as PayrollCalcType,
    is_taxable: true,
    rate_multiplier: '',
    formula_description: '',
    default_amount: '',
  });

  const earningItems = payrollItems
    .filter((pi) => pi.category === 'earning')
    .sort((a, b) => a.sort_order - b.sort_order);
  const deductionItems = payrollItems
    .filter((pi) => pi.category === 'deduction')
    .sort((a, b) => a.sort_order - b.sort_order);

  const handleAdd = () => {
    setEditing(null);
    setForm({
      name: '', code: '', category: 'earning', calc_type: 'fixed',
      is_taxable: true, rate_multiplier: '', formula_description: '', default_amount: '',
    });
    setEditOpen(true);
  };

  const handleEdit = (item: PayrollItemConfig) => {
    setEditing(item);
    setForm({
      name: item.name,
      code: item.code,
      category: item.category,
      calc_type: item.calc_type,
      is_taxable: item.is_taxable,
      rate_multiplier: item.rate_multiplier !== null ? String(item.rate_multiplier) : '',
      formula_description: item.formula_description,
      default_amount: item.default_amount ? String(item.default_amount) : '',
    });
    setEditOpen(true);
  };

  const handleDelete = (item: PayrollItemConfig) => {
    if (SYSTEM_CODES.has(item.code)) {
      toast.error('시스템 항목은 삭제할 수 없습니다.');
      return;
    }
    if (window.confirm(`"${item.name}" 항목을 삭제하시겠습니까?`)) {
      deletePayrollItem(item.id);
      toast.success('항목이 삭제되었습니다.');
    }
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('항목명과 코드를 입력해주세요.');
      return;
    }
    const data = {
      name: form.name,
      code: form.code,
      category: form.category,
      calc_type: form.calc_type,
      is_taxable: form.is_taxable,
      rate_multiplier: form.rate_multiplier ? Number(form.rate_multiplier) : null,
      formula_description: form.formula_description,
      default_amount: form.default_amount ? Number(form.default_amount) : 0,
    };

    if (editing) {
      updatePayrollItem(editing.id, data);
      toast.success('항목이 수정되었습니다.');
    } else {
      const maxSort = payrollItems
        .filter((pi) => pi.category === form.category)
        .reduce((max, pi) => Math.max(max, pi.sort_order), 0);
      const newItem: PayrollItemConfig = {
        id: `pi-${crypto.randomUUID().slice(0, 8)}`,
        ...data,
        is_active: true,
        sort_order: maxSort + 1,
      };
      addPayrollItem(newItem);
      toast.success('항목이 추가되었습니다.');
    }
    setEditOpen(false);
  };

  const renderTable = (items: PayrollItemConfig[], title: string) => (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>항목명</TableHead>
              <TableHead>코드</TableHead>
              <TableHead>계산방식</TableHead>
              <TableHead>과세</TableHead>
              <TableHead>활성</TableHead>
              <TableHead>관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.code}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {item.calc_type === 'fixed' ? '고정' : item.calc_type === 'hours_rate' ? '시간×배율' : '자동'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.category === 'earning' && (
                    <Badge variant={item.is_taxable ? 'secondary' : 'default'} className="text-xs">
                      {item.is_taxable ? '과세' : '비과세'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Switch checked={item.is_active} onCheckedChange={() => togglePayrollItem(item.id)} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!SYSTEM_CODES.has(item.code) && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>급여 항목 설정</DialogTitle>
            <DialogDescription>급여 계산에 사용할 지급/공제 항목을 관리합니다.</DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              항목 추가
            </Button>
          </div>

          <div className="space-y-6">
            {renderTable(earningItems, '지급 항목')}
            {renderTable(deductionItems, '공제 항목')}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Add Item Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '항목 수정' : '항목 추가'}</DialogTitle>
            <DialogDescription>
              {editing ? '기존 급여 항목을 수정합니다.' : '새로운 급여 항목을 추가합니다.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>항목명</Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>코드</Label>
                <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>구분</Label>
                <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v as 'earning' | 'deduction' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earning">지급</SelectItem>
                    <SelectItem value="deduction">공제</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>계산방식</Label>
                <Select value={form.calc_type} onValueChange={(v) => setForm((p) => ({ ...p, calc_type: v as PayrollCalcType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">고정금액</SelectItem>
                    <SelectItem value="hours_rate">시간 × 배율</SelectItem>
                    <SelectItem value="auto">자동계산</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.calc_type === 'hours_rate' && (
              <div className="space-y-2">
                <Label>배율 (예: 연장 1.5, 야간 0.5)</Label>
                <Input type="number" step="0.1" value={form.rate_multiplier} onChange={(e) => setForm((p) => ({ ...p, rate_multiplier: e.target.value }))} />
              </div>
            )}
            {form.calc_type === 'fixed' && (
              <div className="space-y-2">
                <Label>기본 금액 (원)</Label>
                <Input type="number" value={form.default_amount} onChange={(e) => setForm((p) => ({ ...p, default_amount: e.target.value }))} />
              </div>
            )}
            <div className="space-y-2">
              <Label>계산식 설명</Label>
              <Input value={form.formula_description} onChange={(e) => setForm((p) => ({ ...p, formula_description: e.target.value }))} placeholder="예: 통상시급 × 1.5 × 시간" />
            </div>
            {form.category === 'earning' && (
              <div className="flex items-center justify-between">
                <Label>과세 여부</Label>
                <Switch checked={form.is_taxable} onCheckedChange={(checked) => setForm((p) => ({ ...p, is_taxable: checked }))} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>취소</Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
