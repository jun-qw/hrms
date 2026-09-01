'use client';

import { useState, useMemo } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { WorkArrangement } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Search, Pencil, Building2, Globe, Plane, Briefcase,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const ARRANGEMENT_LABELS: Record<WorkArrangement, string> = {
  regular: '정규 근무',
  dispatch_domestic: '국내 파견',
  dispatch_overseas: '해외 파견',
  overseas_corp: '현지법인 채용',
  project: '프로젝트 현장',
};

const ARRANGEMENT_VARIANTS: Record<WorkArrangement, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  regular: 'default',
  dispatch_domestic: 'secondary',
  dispatch_overseas: 'destructive',
  overseas_corp: 'outline',
  project: 'outline',
};

export default function WorkplaceAssignmentPage() {
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee);
  const workplaces = useSettingsStore((s) => s.workplaces);
  const session = useAuthStore((s) => s.session);

  const [searchText, setSearchText] = useState('');
  const [workplaceFilter, setWorkplaceFilter] = useState('all');
  const [arrangementFilter, setArrangementFilter] = useState('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [form, setForm] = useState({
    workplace_id: '',
    work_arrangement: 'regular' as WorkArrangement,
    arrangement_start_date: '',
    arrangement_end_date: '',
  });

  const isHR = session?.role === 'admin' || session?.role === 'hr_manager';

  const enrichedEmployees = useMemo(() => {
    return employees
      .filter((e) => e.status === 'active')
      .map((e) => ({
        ...e,
        department: departments.find((d) => d.id === e.department_id),
        rank: positionRanks.find((r) => r.id === e.position_rank_id),
        workplace: e.workplace_id ? workplaces.find((w) => w.id === e.workplace_id) : null,
      }))
      .filter((e) => {
        if (workplaceFilter !== 'all') {
          if (workplaceFilter === 'unassigned') {
            if (e.workplace_id) return false;
          } else if (e.workplace_id !== workplaceFilter) return false;
        }
        if (arrangementFilter !== 'all') {
          if (arrangementFilter === 'unassigned') {
            if (e.work_arrangement) return false;
          } else if (e.work_arrangement !== arrangementFilter) return false;
        }
        if (searchText) {
          const q = searchText.toLowerCase();
          return e.name.toLowerCase().includes(q) || e.employee_number.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => a.employee_number.localeCompare(b.employee_number));
  }, [employees, departments, positionRanks, workplaces, workplaceFilter, arrangementFilter, searchText]);

  // 사업장별 통계
  const workplaceStats = useMemo(() => {
    const map = new Map<string, number>();
    let unassigned = 0;
    for (const e of employees.filter((x) => x.status === 'active')) {
      if (!e.workplace_id) { unassigned++; continue; }
      map.set(e.workplace_id, (map.get(e.workplace_id) ?? 0) + 1);
    }
    return { byWorkplace: map, unassigned };
  }, [employees]);

  const arrangementStats = useMemo(() => {
    const map = new Map<WorkArrangement | 'unassigned', number>();
    for (const e of employees.filter((x) => x.status === 'active')) {
      const key = e.work_arrangement ?? 'unassigned';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [employees]);

  const openEdit = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    setEditingEmpId(empId);
    setForm({
      workplace_id: emp.workplace_id ?? '',
      work_arrangement: emp.work_arrangement ?? 'regular',
      arrangement_start_date: emp.arrangement_start_date ?? new Date().toISOString().split('T')[0],
      arrangement_end_date: emp.arrangement_end_date ?? '',
    });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingEmpId) return;
    if (!form.workplace_id) { toast.error('사업장을 선택하세요.'); return; }
    updateEmployee(editingEmpId, {
      workplace_id: form.workplace_id,
      work_arrangement: form.work_arrangement,
      arrangement_start_date: form.arrangement_start_date || null,
      arrangement_end_date: form.arrangement_end_date || null,
    });
    toast.success('사업장/근로형태가 저장되었습니다.');
    setEditDialogOpen(false);
  };

  // 선택된 사업장이 현지법인이면 해외 파견 등 자동 추천
  const selectedWp = workplaces.find((w) => w.id === form.workplace_id);
  const recommendedArrangement = useMemo<WorkArrangement>(() => {
    if (!selectedWp) return 'regular';
    if (selectedWp.workplace_type === 'overseas_corp') return 'overseas_corp';
    if (selectedWp.workplace_type === 'project_site') return 'project';
    return 'regular';
  }, [selectedWp]);

  if (!isHR) {
    return (
      <div>
        <Breadcrumb />
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>인사담당자 또는 관리자만 접근 가능합니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">사업장 / 근로형태 배정</h1>
        <Link href="/employees">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />사원 목록</Button>
        </Link>
      </div>

      {/* 사업장별 통계 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />사업장별 인원 분포
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {workplaces.filter((w) => w.is_active).map((wp) => {
              const count = workplaceStats.byWorkplace.get(wp.id) ?? 0;
              return (
                <div key={wp.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <Badge variant={wp.is_headquarters ? 'default' : 'outline'} className="text-xs">{wp.code}</Badge>
                  <span className="text-sm font-medium">{wp.name}</span>
                  <span className="text-sm font-bold text-primary">{count}명</span>
                </div>
              );
            })}
            <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2">
              <Badge variant="destructive" className="text-xs">미배정</Badge>
              <span className="text-sm font-bold">{workplaceStats.unassigned}명</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 근로형태 통계 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />근로형태별 인원
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(['regular', 'dispatch_domestic', 'dispatch_overseas', 'overseas_corp', 'project'] as WorkArrangement[]).map((arr) => (
              <div key={arr} className="rounded-lg border p-3">
                <Badge variant={ARRANGEMENT_VARIANTS[arr]} className="text-xs mb-1">{ARRANGEMENT_LABELS[arr]}</Badge>
                <p className="text-xl font-bold">{arrangementStats.get(arr) ?? 0}명</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 w-[240px]" placeholder="이름/사번 검색" value={searchText}
            onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <Select value={workplaceFilter} onValueChange={setWorkplaceFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="사업장" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 사업장</SelectItem>
            <SelectItem value="unassigned">미배정</SelectItem>
            {workplaces.filter((w) => w.is_active).map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={arrangementFilter} onValueChange={setArrangementFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="근로형태" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 근로형태</SelectItem>
            <SelectItem value="unassigned">미배정</SelectItem>
            {Object.entries(ARRANGEMENT_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="ml-auto">{enrichedEmployees.length}명</Badge>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사번</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>직급</TableHead>
                  <TableHead>사업장</TableHead>
                  <TableHead>근로형태</TableHead>
                  <TableHead>적용기간</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      해당 조건의 직원이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : enrichedEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-xs">{emp.employee_number}</TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-sm">{emp.department?.name ?? '-'}</TableCell>
                    <TableCell className="text-sm">{emp.rank?.name ?? '-'}</TableCell>
                    <TableCell>
                      {emp.workplace ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">{emp.workplace.code}</Badge>
                          <span className="text-sm">{emp.workplace.name}</span>
                        </div>
                      ) : (
                        <Badge variant="destructive" className="text-xs">미배정</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {emp.work_arrangement ? (
                        <Badge variant={ARRANGEMENT_VARIANTS[emp.work_arrangement]} className="text-xs">
                          {ARRANGEMENT_LABELS[emp.work_arrangement]}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">정규 (기본)</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {emp.arrangement_start_date && (
                        <span className="font-mono">
                          {emp.arrangement_start_date}
                          {emp.arrangement_end_date && ` ~ ${emp.arrangement_end_date}`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(emp.id)}>
                        <Pencil className="h-3 w-3 mr-1" />
                        배정
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 배정 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사업장 / 근로형태 배정</DialogTitle>
            <DialogDescription>
              {employees.find((e) => e.id === editingEmpId)?.name ?? ''}님의 사업장과 근로형태를 설정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>사업장 *</Label>
              <Select value={form.workplace_id}
                onValueChange={(v) => {
                  setForm((p) => ({ ...p, workplace_id: v }));
                  // 자동 추천
                  const wp = workplaces.find((w) => w.id === v);
                  if (wp?.workplace_type === 'overseas_corp') {
                    setForm((p) => ({ ...p, workplace_id: v, work_arrangement: 'overseas_corp' }));
                  } else if (wp?.workplace_type === 'project_site') {
                    setForm((p) => ({ ...p, workplace_id: v, work_arrangement: 'project' }));
                  } else if (wp?.workplace_type === 'headquarters' || wp?.workplace_type === 'branch' || wp?.workplace_type === 'factory') {
                    setForm((p) => ({ ...p, workplace_id: v, work_arrangement: 'regular' }));
                  }
                }}>
                <SelectTrigger><SelectValue placeholder="사업장 선택" /></SelectTrigger>
                <SelectContent>
                  {workplaces.filter((w) => w.is_active).map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      [{w.code}] {w.name} ({w.country_code ?? 'KR'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedWp && (
                <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-1">
                  <p><strong>유형:</strong> {{ headquarters: '본사', branch: '지사', factory: '공장', overseas_corp: '현지법인', project_site: '현장사무소' }[selectedWp.workplace_type ?? 'branch']}</p>
                  <p><strong>위치:</strong> {selectedWp.address}</p>
                  {selectedWp.use_custom_work_hours ? (
                    <p><strong>근로조건:</strong> {selectedWp.start_time}~{selectedWp.end_time}, 주 {selectedWp.weekly_hours}시간 (사업장 별도 적용)</p>
                  ) : (
                    <p><strong>근로조건:</strong> 본사 기본 적용</p>
                  )}
                  <p><strong>통화:</strong> {selectedWp.currency ?? 'KRW'}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>근로형태 *</Label>
              <Select value={form.work_arrangement}
                onValueChange={(v) => setForm((p) => ({ ...p, work_arrangement: v as WorkArrangement }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">정규 (본사/지사/공장 소속)</SelectItem>
                  <SelectItem value="dispatch_domestic">국내 파견</SelectItem>
                  <SelectItem value="dispatch_overseas">해외 파견</SelectItem>
                  <SelectItem value="overseas_corp">현지법인 채용</SelectItem>
                  <SelectItem value="project">프로젝트 현장근무</SelectItem>
                </SelectContent>
              </Select>
              {form.work_arrangement !== recommendedArrangement && selectedWp && (
                <p className="text-xs text-amber-600">
                  💡 선택한 사업장({selectedWp.name})에는 <strong>{ARRANGEMENT_LABELS[recommendedArrangement]}</strong> 추천
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>배정 시작일</Label>
                <Input type="date" value={form.arrangement_start_date}
                  onChange={(e) => setForm((p) => ({ ...p, arrangement_start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>배정 종료일 <span className="text-xs text-muted-foreground">(파견 등 임시)</span></Label>
                <Input type="date" value={form.arrangement_end_date}
                  onChange={(e) => setForm((p) => ({ ...p, arrangement_end_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
