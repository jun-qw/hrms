'use client';

import { useState, useMemo, Fragment } from 'react';
import { usePayrollStore, MONTHLY_WORK_HOURS } from '@/lib/stores/payroll-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import { useChangeHistory } from '@/lib/hooks/use-change-history';
import { useChangeHistoryStore } from '@/lib/stores/change-history-store';
import ChangeHistoryDialog from '@/components/shared/change-history-dialog';
import type { Employee, EmployeePayrollSetting } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Pencil,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const fmtWon = (n: number) => new Intl.NumberFormat('ko-KR').format(n) + '원';

interface EmployeePayrollTabProps {
  employee: Employee;
}

export default function EmployeePayrollTab({ employee }: EmployeePayrollTabProps) {
  const PAYROLL_STATUS = useCodeMap(CODE.PAYROLL_STATUS);

  const savedPayrolls = usePayrollStore((s) => s.savedPayrolls);
  const employeePayrollSettings = usePayrollStore((s) => s.employeePayrollSettings);
  const addEmployeePayrollSetting = usePayrollStore((s) => s.addEmployeePayrollSetting);
  const updateEmployeePayrollSetting = usePayrollStore((s) => s.updateEmployeePayrollSetting);
  const deleteEmployeePayrollSetting = usePayrollStore((s) => s.deleteEmployeePayrollSetting);
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee);
  const payrollItems = usePayrollStore((s) => s.payrollItems);
  const payrollSettings = useSettingsStore((s) => s.payroll);
  const { recordChange } = useChangeHistory();
  const getByEntity = useChangeHistoryStore((s) => s.getByEntity);

  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryForm, setSalaryForm] = useState(employee.base_salary);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EmployeePayrollSetting | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    item_code: '',
    item_name: '',
    category: 'earning' as 'earning' | 'deduction',
    amount: 0,
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '' as string,
    note: '',
    is_active: true,
  });

  // This employee's settings — split current / past
  const allEmpSettings = useMemo(
    () => employeePayrollSettings.filter((s) => s.employee_id === employee.id),
    [employeePayrollSettings, employee.id],
  );
  const today = new Date().toISOString().split('T')[0];
  const currentSettings = useMemo(
    () => allEmpSettings.filter((s) => s.effective_from <= today && (!s.effective_to || s.effective_to >= today)),
    [allEmpSettings, today],
  );
  const pastSettings = useMemo(
    () => allEmpSettings.filter((s) => s.effective_to && s.effective_to < today),
    [allEmpSettings, today],
  );

  // This employee's payroll history
  const empPayrolls = useMemo(
    () => savedPayrolls
      .filter((p) => p.employee_id === employee.id)
      .sort((a, b) => a.year !== b.year ? b.year - a.year : b.month - a.month),
    [savedPayrolls, employee.id],
  );

  const latestPayroll = empPayrolls.length > 0 ? empPayrolls[0] : null;
  const hourlyWage = Math.round(employee.base_salary / MONTHLY_WORK_HOURS);

  // Available payroll items for adding
  const availableItems = useMemo(() => {
    const earningItems = payrollItems.filter(
      (pi) => pi.category === 'earning' && pi.calc_type === 'fixed' && pi.code !== 'base_salary' && pi.code !== 'meal_allowance' && pi.code !== 'transport_allowance',
    );
    return earningItems;
  }, [payrollItems]);

  // Active allowance total (current effective items only)
  const totalAllowances = currentSettings.filter((s) => s.is_active && s.category === 'earning').reduce((sum, s) => sum + s.amount, 0);

  // Change history entries for this employee
  const changeHistory = useMemo(
    () => getByEntity('employee_payroll', employee.id),
    [getByEntity, employee.id],
  );

  // Save salary
  const handleSaveSalary = () => {
    const oldSalary = employee.base_salary;
    if (oldSalary !== salaryForm) {
      recordChange('employee_payroll', employee.id, `${employee.name} 급여`, 'update', [
        { field: 'base_salary', label: '기본급', before: fmtWon(oldSalary), after: fmtWon(salaryForm) },
        { field: 'hourly_wage', label: '통상시급', before: fmtWon(Math.round(oldSalary / MONTHLY_WORK_HOURS)), after: fmtWon(Math.round(salaryForm / MONTHLY_WORK_HOURS)) },
      ]);
    }
    updateEmployee(employee.id, { base_salary: salaryForm });
    setEditingSalary(false);
    toast.success('기본급이 수정되었습니다.');
  };

  // Open add dialog
  const handleAddItem = () => {
    setEditingItem(null);
    setItemForm({
      item_code: availableItems[0]?.code ?? 'custom',
      item_name: availableItems[0]?.name ?? '',
      category: 'earning',
      amount: 0,
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: '',
      note: '',
      is_active: true,
    });
    setDialogOpen(true);
  };

  // Open edit dialog
  const handleEditItem = (item: EmployeePayrollSetting) => {
    setEditingItem(item);
    setItemForm({
      item_code: item.item_code,
      item_name: item.item_name,
      category: item.category,
      amount: item.amount,
      effective_from: item.effective_from,
      effective_to: item.effective_to ?? '',
      note: item.note ?? '',
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  // Save item
  const handleSaveItem = () => {
    if (!itemForm.item_name.trim()) {
      toast.error('항목명을 입력해주세요.');
      return;
    }
    if (itemForm.amount <= 0) {
      toast.error('금액을 입력해주세요.');
      return;
    }
    if (!itemForm.effective_from) {
      toast.error('적용 시작일을 입력해주세요.');
      return;
    }
    const now = new Date().toISOString();
    const effTo = itemForm.effective_to || null;
    if (editingItem) {
      const changes = [];
      if (editingItem.amount !== itemForm.amount) {
        changes.push({ field: 'amount', label: `${editingItem.item_name} 금액`, before: fmtWon(editingItem.amount), after: fmtWon(itemForm.amount) });
      }
      if (editingItem.effective_from !== itemForm.effective_from) {
        changes.push({ field: 'effective_from', label: `${editingItem.item_name} 적용시작`, before: editingItem.effective_from, after: itemForm.effective_from });
      }
      if ((editingItem.effective_to ?? '') !== (itemForm.effective_to ?? '')) {
        changes.push({ field: 'effective_to', label: `${editingItem.item_name} 적용종료`, before: editingItem.effective_to ?? '없음', after: itemForm.effective_to || '없음' });
      }
      if (editingItem.is_active !== itemForm.is_active) {
        changes.push({ field: 'is_active', label: `${editingItem.item_name} 적용`, before: editingItem.is_active ? '적용' : '미적용', after: itemForm.is_active ? '적용' : '미적용' });
      }
      if (editingItem.item_name !== itemForm.item_name) {
        changes.push({ field: 'item_name', label: '항목명', before: editingItem.item_name, after: itemForm.item_name });
      }
      if (editingItem.note !== (itemForm.note || null)) {
        changes.push({ field: 'note', label: `${itemForm.item_name} 비고`, before: editingItem.note ?? '-', after: itemForm.note || '-' });
      }
      if (changes.length > 0) {
        recordChange('employee_payroll', employee.id, `${employee.name} 급여`, 'update', changes);
      }
      updateEmployeePayrollSetting(editingItem.id, {
        item_code: itemForm.item_code,
        item_name: itemForm.item_name,
        category: itemForm.category,
        amount: itemForm.amount,
        effective_from: itemForm.effective_from,
        effective_to: effTo,
        note: itemForm.note || null,
        is_active: itemForm.is_active,
      });
      toast.success('수당 항목이 수정되었습니다.');
    } else {
      const newSetting: EmployeePayrollSetting = {
        id: `eps-${crypto.randomUUID().slice(0, 8)}`,
        employee_id: employee.id,
        item_code: itemForm.item_code,
        item_name: itemForm.item_name,
        category: itemForm.category,
        amount: itemForm.amount,
        is_active: itemForm.is_active,
        effective_from: itemForm.effective_from,
        effective_to: effTo,
        note: itemForm.note || null,
        created_at: now,
        updated_at: now,
      };
      addEmployeePayrollSetting(newSetting);
      recordChange('employee_payroll', employee.id, `${employee.name} 급여`, 'create', [
        { field: 'item_name', label: '항목', before: '-', after: itemForm.item_name },
        { field: 'amount', label: '금액', before: '-', after: fmtWon(itemForm.amount) },
        { field: 'effective_from', label: '적용시작', before: '-', after: itemForm.effective_from },
        { field: 'effective_to', label: '적용종료', before: '-', after: itemForm.effective_to || '없음 (계속)' },
      ]);
      toast.success('수당 항목이 추가되었습니다.');
    }
    setDialogOpen(false);
  };

  // Delete item
  const handleDeleteItem = (item: EmployeePayrollSetting) => {
    if (window.confirm(`"${item.item_name}" 항목을 삭제하시겠습니까?`)) {
      recordChange('employee_payroll', employee.id, `${employee.name} 급여`, 'delete', [
        { field: 'item_name', label: '항목', before: item.item_name, after: '삭제' },
        { field: 'amount', label: '금액', before: fmtWon(item.amount), after: '-' },
      ]);
      deleteEmployeePayrollSetting(item.id);
      toast.success('수당 항목이 삭제되었습니다.');
    }
  };

  // Handle item code change in dialog
  const handleItemCodeChange = (code: string) => {
    const found = availableItems.find((pi) => pi.code === code);
    setItemForm((prev) => ({
      ...prev,
      item_code: code,
      item_name: found?.name ?? prev.item_name,
    }));
  };

  return (
    <div className="space-y-6">
      {/* 급여 기준정보 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">급여 기준정보</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
            <History className="h-4 w-4 mr-1" />
            변경이력 ({changeHistory.length})
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 기본급 */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">기본급 (월)</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => { setEditingSalary(!editingSalary); setSalaryForm(employee.base_salary); }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
              {editingSalary ? (
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    value={salaryForm}
                    onChange={(e) => setSalaryForm(Number(e.target.value))}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" className="h-8 px-2" onClick={handleSaveSalary}>
                    <Save className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-lg font-bold">{fmtWon(employee.base_salary)}</p>
              )}
            </div>

            {/* 통상시급 */}
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-2">통상시급 (209h 기준)</p>
              <p className="text-lg font-bold">{fmtWon(hourlyWage)}</p>
            </div>

            {/* 수당 합계 */}
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-2">고정수당 합계</p>
              <p className="text-lg font-bold text-accent-blue">{fmtWon(totalAllowances)}</p>
            </div>

            {/* 최근 실수령 */}
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-2">최근 실수령액</p>
              <p className="text-lg font-bold">
                {latestPayroll ? fmtWon(latestPayroll.net_pay) : '-'}
              </p>
              {latestPayroll && (
                <p className="text-xs text-muted-foreground">{latestPayroll.year}년 {latestPayroll.month}월</p>
              )}
            </div>
          </div>

          {/* 4대보험 요율 */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <p className="text-xs font-medium mb-2">4대보험 (근로자 부담분)</p>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>국민연금 {payrollSettings.national_pension_rate}%</span>
              <span>건강보험 {payrollSettings.health_insurance_rate}%</span>
              <span>장기요양 {payrollSettings.long_term_care_rate}% (건강보험의)</span>
              <span>고용보험 {payrollSettings.employment_insurance_rate}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 현재 적용중 수당/공제 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">현재 적용중 수당/공제</CardTitle>
          <Button size="sm" onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-1" />
            항목 추가
          </Button>
        </CardHeader>
        <CardContent>
          {currentSettings.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">현재 적용중인 개인 수당/공제 항목이 없습니다.</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>항목명</TableHead>
                    <TableHead>구분</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>적용기간</TableHead>
                    <TableHead>비고</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSettings.map((item) => (
                    <TableRow key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell>
                        <Badge variant={item.category === 'earning' ? 'default' : 'destructive'} className="text-xs">
                          {item.category === 'earning' ? '지급' : '공제'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {item.category === 'deduction' && '-'}{fmtWon(item.amount)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-mono text-xs">{item.effective_from}</span>
                        <span className="text-muted-foreground"> ~ </span>
                        <span className="font-mono text-xs">{item.effective_to ?? '계속'}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.note ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="text-xs bg-green-600">적용중</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditItem(item)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteItem(item)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 종료된 수당/공제 이력 */}
      {pastSettings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">종료된 수당/공제 이력</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>항목명</TableHead>
                    <TableHead>구분</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>적용기간</TableHead>
                    <TableHead>비고</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastSettings.map((item) => (
                    <TableRow key={item.id} className="opacity-60">
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell>
                        <Badge variant={item.category === 'earning' ? 'default' : 'destructive'} className="text-xs">
                          {item.category === 'earning' ? '지급' : '공제'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {item.category === 'deduction' && '-'}{fmtWon(item.amount)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-mono text-xs">{item.effective_from}</span>
                        <span className="text-muted-foreground"> ~ </span>
                        <span className="font-mono text-xs">{item.effective_to}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.note ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">종료</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditItem(item)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 비과세 한도 안내 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">비과세 항목 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">식대</p>
              <p className="text-sm font-bold">월 {fmtWon(payrollSettings.meal_allowance_limit)}</p>
              <p className="text-xs text-muted-foreground">비과세 한도</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">교통비</p>
              <p className="text-sm font-bold">월 {fmtWon(payrollSettings.transport_allowance_limit)}</p>
              <p className="text-xs text-muted-foreground">비과세 한도</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">연장근로수당</p>
              <p className="text-sm font-bold">시급 × 1.5배</p>
              <p className="text-xs text-muted-foreground">{fmtWon(hourlyWage)} × 1.5 = {fmtWon(Math.round(hourlyWage * 1.5))}/h</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">급여 지급일</p>
              <p className="text-sm font-bold">매월 {payrollSettings.pay_day}일</p>
              <p className="text-xs text-muted-foreground">정기 지급</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 급여 이력 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">급여 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead className="text-right">기본급</TableHead>
                  <TableHead className="text-right">총 지급</TableHead>
                  <TableHead className="text-right">총 공제</TableHead>
                  <TableHead className="text-right">실수령</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>명세서</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empPayrolls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">급여 내역이 없습니다.</TableCell>
                  </TableRow>
                ) : empPayrolls.map((p) => {
                  const isExpanded = expandedId === p.id;
                  const earnings = p.items.filter((i) => i.category === 'earning');
                  const deductions = p.items.filter((i) => i.category === 'deduction');
                  return (
                    <Fragment key={p.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                        <TableCell className="px-2">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="font-medium">{p.year}년 {String(p.month).padStart(2, '0')}월</TableCell>
                        <TableCell className="text-right text-sm font-mono">{fmtWon(p.base_salary)}</TableCell>
                        <TableCell className="text-right text-sm font-mono">{fmtWon(p.total_earnings)}</TableCell>
                        <TableCell className="text-right text-sm font-mono text-destructive">{fmtWon(p.total_deductions)}</TableCell>
                        <TableCell className="text-right text-sm font-mono font-bold">{fmtWon(p.net_pay)}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === 'paid' ? 'default' : p.status === 'confirmed' ? 'secondary' : 'outline'} className="text-xs">
                            {PAYROLL_STATUS[p.status] ?? p.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/payroll/payslip/${p.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">보기</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${p.id}-detail`}>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <p className="text-sm font-semibold mb-2">지급 항목</p>
                                <div className="space-y-1.5">
                                  {earnings.map((item) => (
                                    <div key={item.item_id} className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">
                                        {item.name}
                                        {!item.is_taxable && <span className="text-xs ml-1 text-blue-500">(비과세)</span>}
                                      </span>
                                      <span className="font-mono">{fmtWon(item.amount)}</span>
                                    </div>
                                  ))}
                                  <Separator />
                                  <div className="flex justify-between text-sm font-bold">
                                    <span>합계</span>
                                    <span className="font-mono">{fmtWon(p.total_earnings)}</span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-semibold mb-2">공제 항목</p>
                                <div className="space-y-1.5">
                                  {deductions.map((item) => (
                                    <div key={item.item_id} className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">{item.name}</span>
                                      <span className="font-mono text-destructive">-{fmtWon(item.amount)}</span>
                                    </div>
                                  ))}
                                  <Separator />
                                  <div className="flex justify-between text-sm font-bold">
                                    <span>합계</span>
                                    <span className="font-mono text-destructive">-{fmtWon(p.total_deductions)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm font-bold text-primary pt-2 border-t">
                                    <span>실수령액</span>
                                    <span className="font-mono">{fmtWon(p.net_pay)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? '수당/공제 항목 수정' : '수당/공제 항목 추가'}</DialogTitle>
            <DialogDescription>
              {employee.name}님의 개인 수당/공제 항목을 {editingItem ? '수정' : '추가'}합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>항목 선택</Label>
              <Select value={itemForm.item_code} onValueChange={handleItemCodeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableItems.map((pi) => (
                    <SelectItem key={pi.code} value={pi.code}>{pi.name}</SelectItem>
                  ))}
                  <SelectItem value="custom">직접 입력</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {itemForm.item_code === 'custom' && (
              <div className="space-y-2">
                <Label>항목명</Label>
                <Input
                  value={itemForm.item_name}
                  onChange={(e) => setItemForm((p) => ({ ...p, item_name: e.target.value }))}
                  placeholder="항목명 입력"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>구분</Label>
              <Select
                value={itemForm.category}
                onValueChange={(v) => setItemForm((p) => ({ ...p, category: v as 'earning' | 'deduction' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="earning">지급 (수당)</SelectItem>
                  <SelectItem value="deduction">공제</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>금액 (원)</Label>
              <Input
                type="number"
                value={itemForm.amount}
                onChange={(e) => setItemForm((p) => ({ ...p, amount: Number(e.target.value) }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>적용 시작일</Label>
                <Input
                  type="date"
                  value={itemForm.effective_from}
                  onChange={(e) => setItemForm((p) => ({ ...p, effective_from: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>적용 종료일 <span className="text-xs text-muted-foreground">(미입력시 계속)</span></Label>
                <Input
                  type="date"
                  value={itemForm.effective_to}
                  onChange={(e) => setItemForm((p) => ({ ...p, effective_to: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>비고</Label>
              <Input
                value={itemForm.note}
                onChange={(e) => setItemForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="비고 (선택사항)"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>적용 여부</Label>
              <Switch
                checked={itemForm.is_active}
                onCheckedChange={(checked) => setItemForm((p) => ({ ...p, is_active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSaveItem}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change History Dialog */}
      <ChangeHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entityType="employee_payroll"
        entityId={employee.id}
        entityLabel={`${employee.name} 급여 기준정보`}
      />
    </div>
  );
}
