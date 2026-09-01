'use client';

import { useState, useMemo, Fragment } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { usePayrollStore, MONTHLY_WORK_HOURS } from '@/lib/stores/payroll-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useChangeHistory } from '@/lib/hooks/use-change-history';
import { useChangeHistoryStore } from '@/lib/stores/change-history-store';
import ChangeHistoryDialog from '@/components/shared/change-history-dialog';
import type { Employee, EmployeePayrollSetting } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ArrowLeft,
  Calculator,
  Plus,
  Pencil,
  Trash2,
  Save,
  History,
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const fmtWon = (n: number) => new Intl.NumberFormat('ko-KR').format(n) + '원';

export default function PayrollSettingsPage() {
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee);
  const payrollItems = usePayrollStore((s) => s.payrollItems);
  const employeePayrollSettings = usePayrollStore((s) => s.employeePayrollSettings);
  const addEmployeePayrollSetting = usePayrollStore((s) => s.addEmployeePayrollSetting);
  const updateEmployeePayrollSetting = usePayrollStore((s) => s.updateEmployeePayrollSetting);
  const deleteEmployeePayrollSetting = usePayrollStore((s) => s.deleteEmployeePayrollSetting);
  const payrollConfig = useSettingsStore((s) => s.payroll);
  const { recordChange } = useChangeHistory();

  // Filters
  const [searchText, setSearchText] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [expandedEmpId, setExpandedEmpId] = useState<string | null>(null);

  // Inline salary edit
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);
  const [salaryDraft, setSalaryDraft] = useState(0);

  // Item dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [dialogTargetEmpId, setDialogTargetEmpId] = useState('');
  const [editingItem, setEditingItem] = useState<EmployeePayrollSetting | null>(null);
  const [itemForm, setItemForm] = useState({
    item_code: '', item_name: '', category: 'earning' as 'earning' | 'deduction',
    amount: 0, effective_from: '', effective_to: '', note: '', is_active: true,
  });

  // History dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEmpId, setHistoryEmpId] = useState('');
  const [historyEmpName, setHistoryEmpName] = useState('');

  const today = new Date().toISOString().split('T')[0];

  // Hydrated active employees
  const activeEmployees = useMemo(() => {
    return employees
      .filter((e) => e.status === 'active')
      .map((e) => ({
        ...e,
        department: departments.find((d) => d.id === e.department_id),
        position_rank: positionRanks.find((r) => r.id === e.position_rank_id),
      }))
      .filter((e) => {
        if (deptFilter !== 'all' && e.department_id !== deptFilter) return false;
        if (searchText) {
          const q = searchText.toLowerCase();
          return e.name.toLowerCase().includes(q) || e.employee_number.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => a.employee_number.localeCompare(b.employee_number));
  }, [employees, departments, positionRanks, deptFilter, searchText]);

  const activeDepartments = useMemo(
    () => departments.filter((d) => d.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [departments],
  );

  // Per-employee settings map
  const settingsMap = useMemo(() => {
    const map = new Map<string, EmployeePayrollSetting[]>();
    for (const s of employeePayrollSettings) {
      const arr = map.get(s.employee_id) ?? [];
      arr.push(s);
      map.set(s.employee_id, arr);
    }
    return map;
  }, [employeePayrollSettings]);

  const getEmpCurrentSettings = (empId: string) =>
    (settingsMap.get(empId) ?? []).filter((s) => s.effective_from <= today && (!s.effective_to || s.effective_to >= today));

  const getEmpPastSettings = (empId: string) =>
    (settingsMap.get(empId) ?? []).filter((s) => s.effective_to && s.effective_to < today);

  const getEmpAllowanceTotal = (empId: string) =>
    getEmpCurrentSettings(empId).filter((s) => s.is_active && s.category === 'earning').reduce((sum, s) => sum + s.amount, 0);

  // Available items for add
  const availableItems = useMemo(
    () => payrollItems.filter((pi) => pi.category === 'earning' && pi.calc_type === 'fixed' && pi.code !== 'base_salary' && pi.code !== 'meal_allowance' && pi.code !== 'transport_allowance'),
    [payrollItems],
  );

  // Summary stats
  const totalPayrollCost = useMemo(() => {
    return activeEmployees.reduce((sum, e) => sum + e.base_salary + getEmpAllowanceTotal(e.id), 0);
  }, [activeEmployees, settingsMap]);

  // ---- Handlers ----

  const handleStartEditSalary = (emp: Employee) => {
    setEditingSalaryId(emp.id);
    setSalaryDraft(emp.base_salary);
  };

  const handleSaveSalary = (emp: Employee) => {
    if (emp.base_salary !== salaryDraft) {
      recordChange('employee_payroll', emp.id, `${emp.name} 급여`, 'update', [
        { field: 'base_salary', label: '기본급', before: fmtWon(emp.base_salary), after: fmtWon(salaryDraft) },
        { field: 'hourly_wage', label: '통상시급', before: fmtWon(Math.round(emp.base_salary / MONTHLY_WORK_HOURS)), after: fmtWon(Math.round(salaryDraft / MONTHLY_WORK_HOURS)) },
      ]);
      updateEmployee(emp.id, { base_salary: salaryDraft });
      toast.success(`${emp.name}님 기본급이 수정되었습니다.`);
    }
    setEditingSalaryId(null);
  };

  const handleOpenAddItem = (empId: string) => {
    setDialogTargetEmpId(empId);
    setEditingItem(null);
    setItemForm({
      item_code: availableItems[0]?.code ?? 'custom', item_name: availableItems[0]?.name ?? '',
      category: 'earning', amount: 0,
      effective_from: today, effective_to: '', note: '', is_active: true,
    });
    setItemDialogOpen(true);
  };

  const handleOpenEditItem = (empId: string, item: EmployeePayrollSetting) => {
    setDialogTargetEmpId(empId);
    setEditingItem(item);
    setItemForm({
      item_code: item.item_code, item_name: item.item_name,
      category: item.category, amount: item.amount,
      effective_from: item.effective_from, effective_to: item.effective_to ?? '',
      note: item.note ?? '', is_active: item.is_active,
    });
    setItemDialogOpen(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.item_name.trim()) { toast.error('항목명을 입력해주세요.'); return; }
    if (itemForm.amount <= 0) { toast.error('금액을 입력해주세요.'); return; }
    if (!itemForm.effective_from) { toast.error('적용 시작일을 입력해주세요.'); return; }
    const emp = employees.find((e) => e.id === dialogTargetEmpId);
    const empName = emp?.name ?? dialogTargetEmpId;
    const now = new Date().toISOString();
    const effTo = itemForm.effective_to || null;

    if (editingItem) {
      const changes = [];
      if (editingItem.amount !== itemForm.amount) changes.push({ field: 'amount', label: `${editingItem.item_name} 금액`, before: fmtWon(editingItem.amount), after: fmtWon(itemForm.amount) });
      if (editingItem.effective_from !== itemForm.effective_from) changes.push({ field: 'effective_from', label: `${editingItem.item_name} 적용시작`, before: editingItem.effective_from, after: itemForm.effective_from });
      if ((editingItem.effective_to ?? '') !== (itemForm.effective_to ?? '')) changes.push({ field: 'effective_to', label: `${editingItem.item_name} 적용종료`, before: editingItem.effective_to ?? '없음', after: itemForm.effective_to || '없음' });
      if (editingItem.is_active !== itemForm.is_active) changes.push({ field: 'is_active', label: `${editingItem.item_name} 적용`, before: editingItem.is_active ? '적용' : '미적용', after: itemForm.is_active ? '적용' : '미적용' });
      if (changes.length > 0) recordChange('employee_payroll', dialogTargetEmpId, `${empName} 급여`, 'update', changes);
      updateEmployeePayrollSetting(editingItem.id, {
        item_code: itemForm.item_code, item_name: itemForm.item_name, category: itemForm.category,
        amount: itemForm.amount, effective_from: itemForm.effective_from, effective_to: effTo,
        note: itemForm.note || null, is_active: itemForm.is_active,
      });
      toast.success('수당 항목이 수정되었습니다.');
    } else {
      addEmployeePayrollSetting({
        id: `eps-${crypto.randomUUID().slice(0, 8)}`, employee_id: dialogTargetEmpId,
        item_code: itemForm.item_code, item_name: itemForm.item_name, category: itemForm.category,
        amount: itemForm.amount, is_active: itemForm.is_active,
        effective_from: itemForm.effective_from, effective_to: effTo,
        note: itemForm.note || null, created_at: now, updated_at: now,
      });
      recordChange('employee_payroll', dialogTargetEmpId, `${empName} 급여`, 'create', [
        { field: 'item_name', label: '항목', before: '-', after: itemForm.item_name },
        { field: 'amount', label: '금액', before: '-', after: fmtWon(itemForm.amount) },
        { field: 'effective_from', label: '적용시작', before: '-', after: itemForm.effective_from },
        { field: 'effective_to', label: '적용종료', before: '-', after: itemForm.effective_to || '없음(계속)' },
      ]);
      toast.success('수당 항목이 추가되었습니다.');
    }
    setItemDialogOpen(false);
  };

  const handleDeleteItem = (empId: string, item: EmployeePayrollSetting) => {
    const emp = employees.find((e) => e.id === empId);
    if (window.confirm(`"${item.item_name}" 항목을 삭제하시겠습니까?`)) {
      recordChange('employee_payroll', empId, `${emp?.name ?? empId} 급여`, 'delete', [
        { field: 'item_name', label: '항목', before: item.item_name, after: '삭제' },
        { field: 'amount', label: '금액', before: fmtWon(item.amount), after: '-' },
      ]);
      deleteEmployeePayrollSetting(item.id);
      toast.success('항목이 삭제되었습니다.');
    }
  };

  const handleItemCodeChange = (code: string) => {
    const found = availableItems.find((pi) => pi.code === code);
    setItemForm((p) => ({ ...p, item_code: code, item_name: found?.name ?? p.item_name }));
  };

  const handleShowHistory = (empId: string, empName: string) => {
    setHistoryEmpId(empId);
    setHistoryEmpName(empName);
    setHistoryOpen(true);
  };

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">개인별 급여 기준정보 관리</h1>
        <div className="flex gap-2">
          <Link href="/payroll">
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />급여관리</Button>
          </Link>
          <Link href="/payroll/calculate">
            <Button><Calculator className="h-4 w-4 mr-2" />급여 계산</Button>
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">관리 대상</p>
            <p className="text-xl font-bold">{activeEmployees.length}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">월 총 인건비 (기본급+수당)</p>
            <p className="text-xl font-bold">{fmtWon(totalPayrollCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">비과세 식대 한도</p>
            <p className="text-xl font-bold">{fmtWon(payrollConfig.meal_allowance_limit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">급여 지급일</p>
            <p className="text-xl font-bold">매월 {payrollConfig.pay_day}일</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 w-[250px]"
            placeholder="이름 또는 사번 검색"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="부서 전체" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 부서</SelectItem>
            {activeDepartments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{activeEmployees.length}명</span>
      </div>

      {/* Main table */}
      <Card>
        <CardContent className="pt-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>사번</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>직급</TableHead>
                  <TableHead className="text-right">기본급</TableHead>
                  <TableHead className="text-right">통상시급</TableHead>
                  <TableHead className="text-right">고정수당</TableHead>
                  <TableHead className="text-right">합계</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">해당 조건의 사원이 없습니다.</TableCell>
                  </TableRow>
                ) : activeEmployees.map((emp) => {
                  const isExpanded = expandedEmpId === emp.id;
                  const isEditingSalary = editingSalaryId === emp.id;
                  const allowanceTotal = getEmpAllowanceTotal(emp.id);
                  const hourly = Math.round(emp.base_salary / MONTHLY_WORK_HOURS);
                  const currentSettings = getEmpCurrentSettings(emp.id);
                  const pastSettings = getEmpPastSettings(emp.id);

                  return (
                    <Fragment key={emp.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedEmpId(isExpanded ? null : emp.id)}>
                        <TableCell className="px-2">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{emp.employee_number}</TableCell>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="text-sm">{emp.department?.name ?? '-'}</TableCell>
                        <TableCell className="text-sm">{emp.position_rank?.name ?? '-'}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {isEditingSalary ? (
                            <div className="flex items-center gap-1 justify-end">
                              <Input type="number" className="w-[130px] h-7 text-sm text-right" value={salaryDraft}
                                onChange={(e) => setSalaryDraft(Number(e.target.value))}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSalary(emp); if (e.key === 'Escape') setEditingSalaryId(null); }}
                                autoFocus />
                              <Button size="icon" className="h-7 w-7" onClick={() => handleSaveSalary(emp)}>
                                <Save className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="font-mono text-sm cursor-pointer hover:underline" onClick={() => handleStartEditSalary(emp)}>
                              {fmtWon(emp.base_salary)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">{fmtWon(hourly)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {allowanceTotal > 0 ? <span className="text-accent-blue">{fmtWon(allowanceTotal)}</span> : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold">{fmtWon(emp.base_salary + allowanceTotal)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="수당 추가" onClick={() => handleOpenAddItem(emp.id)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="변경이력" onClick={() => handleShowHistory(emp.id, emp.name)}>
                              <History className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={10} className="bg-muted/30 p-4">
                            {/* Current settings */}
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold">현재 적용중 수당/공제</h4>
                              <Button size="sm" variant="outline" onClick={() => handleOpenAddItem(emp.id)}>
                                <Plus className="h-3 w-3 mr-1" />항목 추가
                              </Button>
                            </div>
                            {currentSettings.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-3">설정된 항목이 없습니다.</p>
                            ) : (
                              <div className="border rounded-lg mb-4 bg-background">
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
                                      <TableRow key={item.id}>
                                        <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                                        <TableCell>
                                          <Badge variant={item.category === 'earning' ? 'default' : 'destructive'} className="text-xs">
                                            {item.category === 'earning' ? '지급' : '공제'}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">{fmtWon(item.amount)}</TableCell>
                                        <TableCell className="text-xs font-mono">
                                          {item.effective_from} ~ {item.effective_to ?? '계속'}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{item.note ?? '-'}</TableCell>
                                        <TableCell>
                                          <Badge variant="default" className="text-xs bg-green-600">적용중</Badge>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex gap-1 justify-end">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEditItem(emp.id, item)}>
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteItem(emp.id, item)}>
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

                            {/* Past settings */}
                            {pastSettings.length > 0 && (
                              <>
                                <h4 className="text-sm font-semibold text-muted-foreground mb-2">종료된 이력</h4>
                                <div className="border rounded-lg bg-background">
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
                                          <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                                          <TableCell>
                                            <Badge variant="outline" className="text-xs">
                                              {item.category === 'earning' ? '지급' : '공제'}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-sm">{fmtWon(item.amount)}</TableCell>
                                          <TableCell className="text-xs font-mono">
                                            {item.effective_from} ~ {item.effective_to}
                                          </TableCell>
                                          <TableCell className="text-xs text-muted-foreground">{item.note ?? '-'}</TableCell>
                                          <TableCell>
                                            <Badge variant="outline" className="text-xs">종료</Badge>
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex gap-1 justify-end">
                                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEditItem(emp.id, item)}>
                                                <Pencil className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </>
                            )}

                            {/* Quick info */}
                            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground flex flex-wrap gap-4">
                              <span>기본급: {fmtWon(emp.base_salary)}</span>
                              <span>통상시급: {fmtWon(Math.round(emp.base_salary / MONTHLY_WORK_HOURS))}</span>
                              <span>연장수당: {fmtWon(Math.round(emp.base_salary / MONTHLY_WORK_HOURS * 1.5))}/h</span>
                              <span>국민연금: {payrollConfig.national_pension_rate}%</span>
                              <span>건강보험: {payrollConfig.health_insurance_rate}%</span>
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

      {/* Item Add/Edit Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? '수당/공제 항목 수정' : '수당/공제 항목 추가'}</DialogTitle>
            <DialogDescription>
              {employees.find((e) => e.id === dialogTargetEmpId)?.name ?? ''}님의 개인 수당/공제 항목
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>항목 선택</Label>
              <Select value={itemForm.item_code} onValueChange={handleItemCodeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input value={itemForm.item_name} onChange={(e) => setItemForm((p) => ({ ...p, item_name: e.target.value }))} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>구분</Label>
                <Select value={itemForm.category} onValueChange={(v) => setItemForm((p) => ({ ...p, category: v as 'earning' | 'deduction' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earning">지급 (수당)</SelectItem>
                    <SelectItem value="deduction">공제</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>금액 (원)</Label>
                <Input type="number" value={itemForm.amount} onChange={(e) => setItemForm((p) => ({ ...p, amount: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>적용 시작일</Label>
                <Input type="date" value={itemForm.effective_from} onChange={(e) => setItemForm((p) => ({ ...p, effective_from: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>적용 종료일 <span className="text-xs text-muted-foreground">(비우면 계속)</span></Label>
                <Input type="date" value={itemForm.effective_to} onChange={(e) => setItemForm((p) => ({ ...p, effective_to: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>비고</Label>
              <Input value={itemForm.note} onChange={(e) => setItemForm((p) => ({ ...p, note: e.target.value }))} placeholder="비고 (선택사항)" />
            </div>
            <div className="flex items-center justify-between">
              <Label>적용 여부</Label>
              <Switch checked={itemForm.is_active} onCheckedChange={(checked) => setItemForm((p) => ({ ...p, is_active: checked }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>취소</Button>
            <Button onClick={handleSaveItem}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change History Dialog */}
      <ChangeHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entityType="employee_payroll"
        entityId={historyEmpId}
        entityLabel={`${historyEmpName} 급여 기준정보`}
      />
    </div>
  );
}
