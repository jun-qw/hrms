'use client';

import { useState, useMemo, Fragment } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useFlexScheduleStore } from '@/lib/stores/flex-schedule-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Clock, Users, Search, Plus, Pencil, History, CheckCircle, XCircle,
  ChevronDown, ChevronUp, CalendarClock, Timer,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function FlexAdminPage() {
  const WORK_SCHEDULE_TYPES = useCodeMap(CODE.WORK_SCHEDULE_TYPES);

  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const workSchedules = useSettingsStore((s) => s.workSchedules);
  const work = useSettingsStore((s) => s.work);
  const session = useAuthStore((s) => s.session);

  const assignments = useFlexScheduleStore((s) => s.assignments);
  const assignSchedule = useFlexScheduleStore((s) => s.assignSchedule);
  const endAssignment = useFlexScheduleStore((s) => s.endAssignment);
  const getActiveAssignment = useFlexScheduleStore((s) => s.getActiveAssignment);
  const getAssignmentHistory = useFlexScheduleStore((s) => s.getAssignmentHistory);
  const requests = useFlexScheduleStore((s) => s.requests);
  const reviewRequest = useFlexScheduleStore((s) => s.reviewRequest);

  const [deptFilter, setDeptFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('all');
  const [expandedEmpId, setExpandedEmpId] = useState<string | null>(null);

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<string[]>([]);
  const [assignForm, setAssignForm] = useState({
    work_schedule_id: '',
    start_date: new Date().toISOString().split('T')[0],
    note: '',
  });

  // Bulk assign
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedEmps, setSelectedEmps] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().split('T')[0];
  const activeDepartments = useMemo(
    () => departments.filter((d) => d.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [departments],
  );

  const activeSchedules = useMemo(
    () => workSchedules.filter((ws) => ws.is_active),
    [workSchedules],
  );

  // Hydrated employees with current schedule
  const employeeData = useMemo(() => {
    return employees
      .filter((e) => e.status === 'active')
      .map((e) => {
        const dept = departments.find((d) => d.id === e.department_id);
        const rank = positionRanks.find((r) => r.id === e.position_rank_id);
        const active = getActiveAssignment(e.id);
        const schedule = active ? workSchedules.find((ws) => ws.id === active.work_schedule_id) : null;
        return { ...e, department: dept, position_rank: rank, activeAssignment: active, currentSchedule: schedule };
      })
      .filter((e) => {
        if (deptFilter !== 'all' && e.department_id !== deptFilter) return false;
        if (scheduleFilter !== 'all') {
          if (scheduleFilter === 'unassigned') return !e.activeAssignment;
          if (e.activeAssignment?.work_schedule_id !== scheduleFilter) return false;
        }
        if (searchText) {
          const q = searchText.toLowerCase();
          return e.name.toLowerCase().includes(q) || e.employee_number.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => a.employee_number.localeCompare(b.employee_number));
  }, [employees, departments, positionRanks, workSchedules, assignments, deptFilter, scheduleFilter, searchText]);

  // Summary stats
  const summary = useMemo(() => {
    const allActive = employees.filter((e) => e.status === 'active');
    const assigned = allActive.filter((e) => getActiveAssignment(e.id));
    const bySchedule = new Map<string, number>();
    for (const e of allActive) {
      const a = getActiveAssignment(e.id);
      const key = a?.work_schedule_id ?? 'unassigned';
      bySchedule.set(key, (bySchedule.get(key) ?? 0) + 1);
    }
    return { total: allActive.length, assigned: assigned.length, unassigned: allActive.length - assigned.length, bySchedule };
  }, [employees, assignments]);

  const pendingRequests = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);

  // Handlers
  const handleOpenAssign = (empIds: string[]) => {
    setAssignTarget(empIds);
    setAssignForm({
      work_schedule_id: activeSchedules[0]?.id ?? '',
      start_date: today,
      note: '',
    });
    setAssignDialogOpen(true);
  };

  const handleAssign = () => {
    if (!assignForm.work_schedule_id) { toast.error('근무유형을 선택해주세요.'); return; }
    if (!assignForm.start_date) { toast.error('적용 시작일을 입력해주세요.'); return; }
    const now = new Date().toISOString();
    for (const empId of assignTarget) {
      assignSchedule({
        id: `esa-${Date.now()}-${empId.slice(-3)}`,
        employee_id: empId,
        work_schedule_id: assignForm.work_schedule_id,
        start_date: assignForm.start_date,
        end_date: null,
        approved_by: session?.employee_id ?? null,
        approved_by_name: session?.user_name ?? null,
        note: assignForm.note || null,
        created_at: now,
      });
    }
    toast.success(`${assignTarget.length}명에게 근무유형이 배정되었습니다.`);
    setAssignDialogOpen(false);
    setSelectedEmps(new Set());
    setBulkMode(false);
  };

  const handleEndAssignment = (assignmentId: string, empName: string) => {
    if (window.confirm(`${empName}님의 현재 근무유형 배정을 종료하시겠습니까?`)) {
      endAssignment(assignmentId, today);
      toast.success('근무유형 배정이 종료되었습니다.');
    }
  };

  const handleReview = (reqId: string, status: 'approved' | 'rejected', comment?: string) => {
    reviewRequest(reqId, status, session?.employee_id ?? '', session?.user_name ?? '관리자', comment);
    if (status === 'approved') {
      const req = requests.find((r) => r.id === reqId);
      if (req) {
        assignSchedule({
          id: `esa-${Date.now()}`,
          employee_id: req.employee_id,
          work_schedule_id: req.work_schedule_id,
          start_date: req.start_date,
          end_date: req.end_date,
          approved_by: session?.employee_id ?? null,
          approved_by_name: session?.user_name ?? null,
          note: `신청 승인: ${req.reason}`,
          created_at: new Date().toISOString(),
        });
      }
    }
    toast.success(status === 'approved' ? '승인되었습니다.' : '반려되었습니다.');
  };

  const toggleSelect = (empId: string) => {
    const next = new Set(selectedEmps);
    if (next.has(empId)) next.delete(empId); else next.add(empId);
    setSelectedEmps(next);
  };

  const toggleSelectAll = () => {
    if (selectedEmps.size === employeeData.length) setSelectedEmps(new Set());
    else setSelectedEmps(new Set(employeeData.map((e) => e.id)));
  };

  const getScheduleName = (wsId: string) => workSchedules.find((ws) => ws.id === wsId)?.name ?? wsId;

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">유연근무 관리</h1>
        <div className="flex gap-2">
          <Link href="/attendance">
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />근태관리</Button>
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">전체 직원</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold">{summary.total}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-2">배정 완료</p>
            <p className="text-xl font-bold text-green-600">{summary.assigned}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-2">미배정</p>
            <p className="text-xl font-bold text-destructive">{summary.unassigned}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-2">승인 대기</p>
            <p className="text-xl font-bold text-orange-600">{pendingRequests.length}건</p>
          </CardContent>
        </Card>
      </div>

      {/* Schedule type distribution */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            {activeSchedules.map((ws) => {
              const count = summary.bySchedule.get(ws.id) ?? 0;
              return (
                <div key={ws.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <Badge variant={ws.is_default ? 'default' : 'outline'} className="text-xs">
                    {WORK_SCHEDULE_TYPES[ws.type] ?? ws.type}
                  </Badge>
                  <span className="text-sm font-medium">{ws.name}</span>
                  <span className="text-sm font-bold text-primary">{count}명</span>
                </div>
              );
            })}
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2 border-dashed">
              <Badge variant="destructive" className="text-xs">미배정</Badge>
              <span className="text-sm font-bold">{summary.unassigned}명</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="assign">
        <TabsList className="mb-4">
          <TabsTrigger value="assign" className="gap-1">
            <CalendarClock className="h-3.5 w-3.5" />
            근무유형 배정
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-1">
            <Timer className="h-3.5 w-3.5" />
            신청 관리 ({pendingRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* ===== 근무유형 배정 ===== */}
        <TabsContent value="assign">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 w-[220px]" placeholder="이름/사번 검색" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="전체 부서" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 부서</SelectItem>
                {activeDepartments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="전체 근무유형" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 근무유형</SelectItem>
                <SelectItem value="unassigned">미배정</SelectItem>
                {activeSchedules.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-2">
              <Button variant={bulkMode ? 'default' : 'outline'} size="sm" onClick={() => { setBulkMode(!bulkMode); setSelectedEmps(new Set()); }}>
                {bulkMode ? '선택 해제' : '일괄 배정'}
              </Button>
              {bulkMode && selectedEmps.size > 0 && (
                <Button size="sm" onClick={() => handleOpenAssign(Array.from(selectedEmps))}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {selectedEmps.size}명 배정
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="pt-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {bulkMode && (
                        <TableHead className="w-[40px]">
                          <input type="checkbox" checked={selectedEmps.size === employeeData.length && employeeData.length > 0} onChange={toggleSelectAll} />
                        </TableHead>
                      )}
                      <TableHead className="w-[36px]"></TableHead>
                      <TableHead>사번</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>부서</TableHead>
                      <TableHead>직급</TableHead>
                      <TableHead>현재 근무유형</TableHead>
                      <TableHead>출퇴근 시간</TableHead>
                      <TableHead>적용일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={bulkMode ? 12 : 11} className="text-center py-8 text-muted-foreground">해당 조건의 직원이 없습니다.</TableCell>
                      </TableRow>
                    ) : employeeData.map((emp) => {
                      const isExpanded = expandedEmpId === emp.id;
                      const ws = emp.currentSchedule;
                      const history = getAssignmentHistory(emp.id);
                      return (
                        <Fragment key={emp.id}>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedEmpId(isExpanded ? null : emp.id)}>
                            {bulkMode && (
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={selectedEmps.has(emp.id)} onChange={() => toggleSelect(emp.id)} />
                              </TableCell>
                            )}
                            <TableCell className="px-2">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{emp.employee_number}</TableCell>
                            <TableCell className="font-medium">{emp.name}</TableCell>
                            <TableCell className="text-sm">{emp.department?.name ?? '-'}</TableCell>
                            <TableCell className="text-sm">{emp.position_rank?.name ?? '-'}</TableCell>
                            <TableCell>
                              {ws ? (
                                <Badge variant={ws.is_default ? 'default' : 'secondary'} className="text-xs">
                                  {ws.name}
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">미배정</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-mono">
                              {ws ? `${ws.start_time}~${ws.end_time}` : `${work.default_start_time}~${work.default_end_time}`}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {emp.activeAssignment?.start_date ?? '-'}
                            </TableCell>
                            <TableCell>
                              {emp.activeAssignment ? (
                                <Badge variant="default" className="text-xs bg-green-600">적용중</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">-</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1 justify-end">
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="근무유형 배정" onClick={() => handleOpenAssign([emp.id])}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                {emp.activeAssignment && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="배정 종료" onClick={() => handleEndAssignment(emp.activeAssignment!.id, emp.name)}>
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Expanded: Assignment history */}
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={bulkMode ? 12 : 11} className="bg-muted/30 p-4">
                                <h4 className="text-sm font-semibold mb-2">
                                  <History className="h-3.5 w-3.5 inline mr-1" />
                                  근무유형 배정 이력
                                </h4>
                                {history.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">배정 이력이 없습니다.</p>
                                ) : (
                                  <div className="border rounded-lg bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>근무유형</TableHead>
                                          <TableHead>적용 시작</TableHead>
                                          <TableHead>적용 종료</TableHead>
                                          <TableHead>승인자</TableHead>
                                          <TableHead>비고</TableHead>
                                          <TableHead>상태</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {history.map((h) => (
                                          <TableRow key={h.id}>
                                            <TableCell className="font-medium text-sm">{getScheduleName(h.work_schedule_id)}</TableCell>
                                            <TableCell className="text-xs font-mono">{h.start_date}</TableCell>
                                            <TableCell className="text-xs font-mono">{h.end_date ?? '계속'}</TableCell>
                                            <TableCell className="text-xs">{h.approved_by_name ?? '-'}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{h.note ?? '-'}</TableCell>
                                            <TableCell>
                                              {!h.end_date || h.end_date >= today ? (
                                                <Badge variant="default" className="text-xs bg-green-600">적용중</Badge>
                                              ) : (
                                                <Badge variant="outline" className="text-xs">종료</Badge>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}

                                {/* Current schedule details */}
                                {ws && (
                                  <div className="mt-3 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                                    <strong>{ws.name}</strong>: {ws.start_time}~{ws.end_time}
                                    {ws.core_start_time && ` (코어타임 ${ws.core_start_time}~${ws.core_end_time})`}
                                    {' · '}휴게 {ws.break_minutes}분 · 주 {ws.weekly_hours}시간
                                    {ws.type === 'staggered' && ws.settings && (
                                      <> · 출근 {(ws.settings as Record<string, string>).earliest_start}~{(ws.settings as Record<string, string>).latest_start}</>
                                    )}
                                  </div>
                                )}
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
        </TabsContent>

        {/* ===== 신청 관리 ===== */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">유연근무 신청 목록</CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">유연근무 신청 내역이 없습니다.</p>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>신청일</TableHead>
                        <TableHead>신청자</TableHead>
                        <TableHead>신청 유형</TableHead>
                        <TableHead>근무유형</TableHead>
                        <TableHead>적용기간</TableHead>
                        <TableHead>사유</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((req) => {
                        const emp = employees.find((e) => e.id === req.employee_id);
                        return (
                          <TableRow key={req.id}>
                            <TableCell className="text-xs">{req.created_at.slice(0, 10)}</TableCell>
                            <TableCell className="font-medium">{emp?.name ?? req.employee_id}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {req.request_type === 'schedule_change' ? '근무유형 변경' : '임시 적용'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{getScheduleName(req.work_schedule_id)}</TableCell>
                            <TableCell className="text-xs font-mono">{req.start_date} ~ {req.end_date ?? '계속'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{req.reason}</TableCell>
                            <TableCell>
                              <Badge variant={req.status === 'approved' ? 'default' : req.status === 'pending' ? 'secondary' : 'destructive'} className="text-xs">
                                {req.status === 'pending' ? '대기' : req.status === 'approved' ? '승인' : '반려'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {req.status === 'pending' && (
                                <div className="flex gap-1 justify-end">
                                  <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700" onClick={() => handleReview(req.id, 'approved')}>
                                    <CheckCircle className="h-3 w-3 mr-1" />승인
                                  </Button>
                                  <Button size="sm" variant="destructive" className="h-7" onClick={() => handleReview(req.id, 'rejected')}>
                                    <XCircle className="h-3 w-3 mr-1" />반려
                                  </Button>
                                </div>
                              )}
                              {req.status !== 'pending' && (
                                <span className="text-xs text-muted-foreground">{req.reviewed_by_name}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>근무유형 배정</DialogTitle>
            <DialogDescription>
              {assignTarget.length === 1
                ? `${employees.find((e) => e.id === assignTarget[0])?.name ?? ''}님에게 근무유형을 배정합니다.`
                : `${assignTarget.length}명에게 근무유형을 일괄 배정합니다.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>근무유형</Label>
              <Select value={assignForm.work_schedule_id} onValueChange={(v) => setAssignForm((p) => ({ ...p, work_schedule_id: v }))}>
                <SelectTrigger><SelectValue placeholder="근무유형 선택" /></SelectTrigger>
                <SelectContent>
                  {activeSchedules.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name} ({ws.start_time}~{ws.end_time})
                      {ws.type !== 'fixed' && ` [${WORK_SCHEDULE_TYPES[ws.type] ?? ws.type}]`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignForm.work_schedule_id && (() => {
                const ws = workSchedules.find((w) => w.id === assignForm.work_schedule_id);
                if (!ws) return null;
                return (
                  <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
                    <p><strong>유형:</strong> {WORK_SCHEDULE_TYPES[ws.type] ?? ws.type}</p>
                    <p><strong>근무시간:</strong> {ws.start_time} ~ {ws.end_time} (휴게 {ws.break_minutes}분, 주 {ws.weekly_hours}시간)</p>
                    {ws.core_start_time && <p><strong>코어타임:</strong> {ws.core_start_time} ~ {ws.core_end_time}</p>}
                    {ws.type === 'staggered' && ws.settings && (
                      <p><strong>출근가능:</strong> {(ws.settings as Record<string, string>).earliest_start} ~ {(ws.settings as Record<string, string>).latest_start}</p>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              <Label>적용 시작일</Label>
              <Input type="date" value={assignForm.start_date} onChange={(e) => setAssignForm((p) => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>비고</Label>
              <Textarea value={assignForm.note} onChange={(e) => setAssignForm((p) => ({ ...p, note: e.target.value }))} placeholder="배정 사유 (선택)" />
            </div>
            {assignTarget.length > 1 && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <strong>배정 대상 ({assignTarget.length}명):</strong>{' '}
                {assignTarget.slice(0, 5).map((id) => employees.find((e) => e.id === id)?.name).join(', ')}
                {assignTarget.length > 5 && ` 외 ${assignTarget.length - 5}명`}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>취소</Button>
            <Button onClick={handleAssign}>배정</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
