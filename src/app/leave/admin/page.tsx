'use client';

import { useState, useMemo } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { useLeaveStore } from '@/lib/stores/leave-store';
import { useEmployeeDirectory, useAnnualLeaveTypeId } from '@/lib/hooks/use-employee-directory';
import { usePendingRequests } from '@/lib/hooks/use-leave';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import EmployeeLeaveDetail from '@/components/leave/employee-leave-detail';
import LeaveTypeManagement from '@/components/leave/leave-type-management';
import BulkGrantDialog from '@/components/leave/bulk-grant-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Check, X, Users, BarChart3, AlertTriangle, Download, Calendar, Send, Bell } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useLeavePlanStore } from '@/lib/stores/leave-plan-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function LeaveAdminPage() {
  const LEAVE_REQUEST_STATUS = useCodeMap(CODE.LEAVE_REQUEST_STATUS);
  const leaveTypes = useLeaveStore((s) => s.leaveTypes);
  const leaveBalances = useLeaveStore((s) => s.leaveBalances);
  const approveLeaveRequest = useLeaveStore((s) => s.approveLeaveRequest);
  const rejectLeaveRequest = useLeaveStore((s) => s.rejectLeaveRequest);
  const pendingRequests = usePendingRequests();
  const leaveSettings = useSettingsStore((s) => s.leave);
  const plans = useLeavePlanStore((s) => s.plans);
  const reviewPlan = useLeavePlanStore((s) => s.reviewPlan);
  const alerts = useLeavePlanStore((s) => s.alerts);
  const generateAlerts = useLeavePlanStore((s) => s.generateAlerts);
  const realEmployees = useEmployeeStore((s) => s.employees);
  const realDepartments = useEmployeeStore((s) => s.departments);
  const realPositionRanks = useEmployeeStore((s) => s.positionRanks);
  const directory = useEmployeeDirectory();
  const annualTypeId = useAnnualLeaveTypeId();

  // 사용률 분석 필터
  const [analysisDeptFilter, setAnalysisDeptFilter] = useState('all');
  const [analysisRankFilter, setAnalysisRankFilter] = useState('all');
  const currentYear = new Date().getFullYear();

  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bulkGrantOpen, setBulkGrantOpen] = useState(false);

  // Employee table data
  const employeeRows = useMemo(() => {
    return directory
      .filter(
        (emp) =>
          emp.name.includes(search) || emp.department.includes(search)
      )
      .map((emp) => {
        const annualBalance = leaveBalances.find(
          (b) =>
            b.employee_id === emp.id &&
            b.leave_type_id === annualTypeId &&
            b.year === currentYear
        );
        const total = annualBalance?.total_days ?? 0;
        const used = annualBalance?.used_days ?? 0;
        const remaining = annualBalance?.remaining_days ?? 0;
        const rate = total > 0 ? Math.round((used / total) * 100) : 0;
        return { ...emp, total, used, remaining, rate };
      });
  }, [directory, leaveBalances, search, annualTypeId, currentYear]);

  // Summary cards
  const totalEmployees = directory.length;
  const avgRate = useMemo(() => {
    const rates = employeeRows.map((r) => r.rate);
    return rates.length > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;
  }, [employeeRows]);
  const lowRemainingCount = employeeRows.filter((r) => r.remaining <= 3 && r.remaining >= 0).length;

  const handleApprove = (id: string) => {
    approveLeaveRequest(id);
    toast.success('승인되었습니다. 잔액이 차감됩니다.');
  };

  const handleReject = (id: string) => {
    rejectLeaveRequest(id);
    toast.success('반려되었습니다.');
  };

  const handleRowClick = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setDetailOpen(true);
  };

  return (
    <div>
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-6">휴가 관리 (HR)</h1>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            승인 대기
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overview">개인별 연차 현황</TabsTrigger>
          <TabsTrigger value="analysis" className="gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            사용률 분석
          </TabsTrigger>
          {leaveSettings.enable_usage_plan && (
            <TabsTrigger value="plans" className="gap-1">
              <Calendar className="h-3.5 w-3.5" />
              사용계획서 ({plans.filter((p) => p.status === 'submitted').length})
            </TabsTrigger>
          )}
          {leaveSettings.enable_unused_alert && (
            <TabsTrigger value="alerts" className="gap-1">
              <Bell className="h-3.5 w-3.5" />
              촉진알림 ({alerts.filter((a) => !a.acknowledged).length})
            </TabsTrigger>
          )}
          <TabsTrigger value="settings">연차 설정</TabsTrigger>
        </TabsList>

        {/* Tab 1: Pending Approvals */}
        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                승인 대기 ({pendingRequests.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>신청자</TableHead>
                      <TableHead>부서</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>기간</TableHead>
                      <TableHead className="text-center">일수</TableHead>
                      <TableHead>사유</TableHead>
                      <TableHead>신청일</TableHead>
                      <TableHead>처리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          승인 대기 중인 요청이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingRequests.map((req) => {
                        const emp = directory.find((e) => e.id === req.employee_id);
                        return (
                          <TableRow key={req.id}>
                            <TableCell className="font-medium">{emp?.name ?? ''}</TableCell>
                            <TableCell>{emp?.department ?? ''}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{req.leave_type?.name ?? ''}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {req.start_date}
                              {req.start_date !== req.end_date && ` ~ ${req.end_date}`}
                            </TableCell>
                            <TableCell className="text-center">{req.days}일</TableCell>
                            <TableCell className="text-sm">{req.reason}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {req.created_at}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-7 px-2"
                                  onClick={() => handleApprove(req.id)}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  승인
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 px-2"
                                  onClick={() => handleReject(req.id)}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  반려
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Employee Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">전체 직원수</span>
                </div>
                <span className="text-2xl font-bold">{totalEmployees}명</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">평균 소진율</span>
                </div>
                <span className="text-2xl font-bold">{avgRate}%</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">잔여 3일 미만</span>
                </div>
                <span className="text-2xl font-bold">{lowRemainingCount}명</span>
              </CardContent>
            </Card>
          </div>

          {/* Search & Bulk Grant */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="이름 또는 부서 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setBulkGrantOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              연차 일괄 부여
            </Button>
          </div>

          {/* Employee Table */}
          <Card>
            <CardContent className="pt-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>부서</TableHead>
                      <TableHead>입사일</TableHead>
                      <TableHead className="text-center">총 연차</TableHead>
                      <TableHead className="text-center">사용</TableHead>
                      <TableHead className="text-center">잔여</TableHead>
                      <TableHead className="w-[120px]">소진율</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeRows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => handleRowClick(row.id)}
                      >
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell className="text-sm">{row.hire_date}</TableCell>
                        <TableCell className="text-center">{row.total}</TableCell>
                        <TableCell className="text-center">{row.used}</TableCell>
                        <TableCell className="text-center font-bold">{row.remaining}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={row.rate} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-8">
                              {row.rate}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(row.id);
                            }}
                          >
                            상세
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: 사용률 분석 */}
        <TabsContent value="analysis" className="mt-4 space-y-4">
          {(() => {
            // 본부 후보 (level 1 부서)
            const headquarters = realDepartments.filter((d) => d.level === 1);
            const filteredEmps = realEmployees.filter((e) => {
              if (e.status !== 'active') return false;
              if (analysisDeptFilter !== 'all') {
                // 본부 또는 직속 부서
                const dept = realDepartments.find((d) => d.id === e.department_id);
                if (!dept) return false;
                if (dept.id !== analysisDeptFilter && dept.parent_id !== analysisDeptFilter) return false;
              }
              if (analysisRankFilter !== 'all' && e.position_rank_id !== analysisRankFilter) return false;
              return true;
            });

            const empBalances = filteredEmps.map((e) => {
              const bal = leaveBalances.find((b) => b.employee_id === e.id && b.leave_type_id === annualTypeId && b.year === currentYear);
              const dept = realDepartments.find((d) => d.id === e.department_id);
              const rank = realPositionRanks.find((r) => r.id === e.position_rank_id);
              return {
                ...e, dept, rank,
                total: bal?.total_days ?? 0,
                used: bal?.used_days ?? 0,
                remaining: bal?.remaining_days ?? 0,
                rate: bal && bal.total_days > 0 ? Math.round((bal.used_days / bal.total_days) * 100) : 0,
              };
            });

            // 본부별 집계
            const byHeadquarters = headquarters.map((hq) => {
              const subs = realDepartments.filter((d) => d.parent_id === hq.id || d.id === hq.id).map((d) => d.id);
              const list = empBalances.filter((e) => e.dept && subs.includes(e.dept.id));
              const total = list.reduce((s, e) => s + e.total, 0);
              const used = list.reduce((s, e) => s + e.used, 0);
              return { name: hq.name, count: list.length, rate: total > 0 ? Math.round((used / total) * 100) : 0, used, total };
            }).filter((x) => x.count > 0);

            // 부서별 집계
            const byDept = realDepartments.filter((d) => d.level === 2).map((d) => {
              const list = empBalances.filter((e) => e.dept?.id === d.id);
              const total = list.reduce((s, e) => s + e.total, 0);
              const used = list.reduce((s, e) => s + e.used, 0);
              return { name: d.name, count: list.length, rate: total > 0 ? Math.round((used / total) * 100) : 0 };
            }).filter((x) => x.count > 0).sort((a, b) => b.rate - a.rate);

            // 직급별 집계
            const byRank = realPositionRanks.map((r) => {
              const list = empBalances.filter((e) => e.rank?.id === r.id);
              const total = list.reduce((s, e) => s + e.total, 0);
              const used = list.reduce((s, e) => s + e.used, 0);
              return { name: r.name, count: list.length, rate: total > 0 ? Math.round((used / total) * 100) : 0, level: r.level };
            }).filter((x) => x.count > 0).sort((a, b) => a.level - b.level);

            const totalRate = empBalances.length > 0
              ? Math.round(empBalances.reduce((s, e) => s + e.used, 0) / Math.max(1, empBalances.reduce((s, e) => s + e.total, 0)) * 100)
              : 0;

            return (
              <>
                {/* 필터 */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium">필터:</span>
                      <Select value={analysisDeptFilter} onValueChange={setAnalysisDeptFilter}>
                        <SelectTrigger className="w-[160px]"><SelectValue placeholder="전체 본부" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체 본부</SelectItem>
                          {headquarters.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={analysisRankFilter} onValueChange={setAnalysisRankFilter}>
                        <SelectTrigger className="w-[140px]"><SelectValue placeholder="전체 직급" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체 직급</SelectItem>
                          {realPositionRanks.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge variant="outline" className="ml-auto">
                        대상: {filteredEmps.length}명 · 평균 사용률 {totalRate}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* 본부별 */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">본부별 연차 사용률</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={byHeadquarters} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 100]} unit="%" />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => `${v as number}%`} />
                          <Bar dataKey="rate" fill="#3b82f6" radius={[0, 4, 4, 0]} name="사용률" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* 직급별 */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">직급별 연차 사용률</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={byRank}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} unit="%" />
                          <Tooltip formatter={(v) => `${v as number}%`} />
                          <Bar dataKey="rate" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="사용률" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* 부서별 상세 테이블 */}
                <Card>
                  <CardHeader><CardTitle className="text-base">부서별 사용률 순위</CardTitle></CardHeader>
                  <CardContent>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>순위</TableHead>
                            <TableHead>부서</TableHead>
                            <TableHead className="text-right">인원</TableHead>
                            <TableHead className="text-right">사용률</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {byDept.map((d, i) => (
                            <TableRow key={d.name}>
                              <TableCell className="font-bold">{i + 1}</TableCell>
                              <TableCell>{d.name}</TableCell>
                              <TableCell className="text-right">{d.count}명</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center gap-2 justify-end">
                                  <Progress value={d.rate} className="h-2 w-[120px]" />
                                  <span className="text-sm font-bold w-[40px]">{d.rate}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        {/* Tab: 사용계획서 */}
        {leaveSettings.enable_usage_plan && (
          <TabsContent value="plans" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  연차 사용계획서 (제출 마감: 매년 {leaveSettings.plan_submission_deadline_month}월)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {plans.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    아직 제출된 사용계획서가 없습니다.<br/>
                    <span className="text-xs">직원이 마이페이지에서 직접 제출할 수 있도록 안내하세요.</span>
                  </p>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>제출일</TableHead>
                          <TableHead>직원</TableHead>
                          <TableHead>부서</TableHead>
                          <TableHead className="text-right">계획 일수</TableHead>
                          <TableHead>월별 분포</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead className="text-right">처리</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plans.filter((p) => p.year === currentYear).map((p) => {
                          const emp = realEmployees.find((e) => e.id === p.employee_id);
                          const dept = emp ? realDepartments.find((d) => d.id === emp.department_id) : null;
                          const monthsArr = Object.entries(p.monthly_plan).filter(([, v]) => v > 0);
                          return (
                            <TableRow key={p.id}>
                              <TableCell className="text-xs">{p.submitted_at?.slice(0, 10) ?? '-'}</TableCell>
                              <TableCell className="font-medium">{emp?.name ?? p.employee_id}</TableCell>
                              <TableCell className="text-sm">{dept?.name ?? '-'}</TableCell>
                              <TableCell className="text-right font-bold">{p.total_planned_days}일</TableCell>
                              <TableCell className="text-xs">
                                {monthsArr.map(([m, d]) => `${m}월:${d}일`).join(', ')}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={p.status === 'reviewed' ? 'default' : p.status === 'submitted' ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {p.status === 'submitted' ? '제출됨' : p.status === 'reviewed' ? '검토완료' : p.status === 'final' ? '확정' : '작성중'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {p.status === 'submitted' && (
                                  <Button
                                    size="sm" variant="outline" className="h-7 text-xs"
                                    onClick={() => {
                                      reviewPlan(p.id, 'admin', '관리자', '검토 완료');
                                      toast.success('사용계획서가 검토 처리되었습니다.');
                                    }}
                                  >
                                    검토 완료
                                  </Button>
                                )}
                                {p.review_comment && (
                                  <p className="text-[10px] text-muted-foreground mt-1">{p.review_comment}</p>
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
        )}

        {/* Tab: 촉진알림 */}
        {leaveSettings.enable_unused_alert && (
          <TabsContent value="alerts" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  미사용 연차 촉진 알림
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="outline"
                    onClick={() => {
                      // 1차 촉진 발송
                      const empWithBalance = employeeRows.map((r) => ({ id: r.id, remaining_days: r.remaining }));
                      const count = generateAlerts(1, currentYear, empWithBalance, leaveSettings.first_alert_threshold);
                      if (count > 0) toast.success(`1차 촉진 알림 ${count}건이 발송되었습니다.`);
                      else toast.info('이미 발송했거나 대상자가 없습니다.');
                    }}
                  >
                    <Send className="h-3 w-3 mr-1" />1차 촉진 발송
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => {
                      const empWithBalance = employeeRows.map((r) => ({ id: r.id, remaining_days: r.remaining }));
                      const count = generateAlerts(2, currentYear, empWithBalance, leaveSettings.second_alert_threshold);
                      if (count > 0) toast.success(`2차 촉진 알림 ${count}건이 발송되었습니다.`);
                      else toast.info('이미 발송했거나 대상자가 없습니다.');
                    }}
                  >
                    <Send className="h-3 w-3 mr-1" />2차 촉진 발송
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-amber-50 text-sm">
                    <p className="font-semibold mb-1">1차 촉진 ({leaveSettings.first_alert_month}월)</p>
                    <p className="text-xs text-muted-foreground">미사용 잔여 {leaveSettings.first_alert_threshold}일 이상</p>
                    <p className="text-lg font-bold mt-1">{alerts.filter((a) => a.alert_round === 1).length}건</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 text-sm">
                    <p className="font-semibold mb-1">2차 촉진 ({leaveSettings.second_alert_month}월)</p>
                    <p className="text-xs text-muted-foreground">미사용 잔여 {leaveSettings.second_alert_threshold}일 이상</p>
                    <p className="text-lg font-bold mt-1">{alerts.filter((a) => a.alert_round === 2).length}건</p>
                  </div>
                </div>

                {alerts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">발송된 촉진 알림이 없습니다.</p>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>발송일</TableHead>
                          <TableHead>회차</TableHead>
                          <TableHead>대상자</TableHead>
                          <TableHead className="text-right">잔여 연차</TableHead>
                          <TableHead>응답</TableHead>
                          <TableHead>응답일</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alerts.map((a) => {
                          const emp = realEmployees.find((e) => e.id === a.employee_id);
                          return (
                            <TableRow key={a.id}>
                              <TableCell className="text-xs">{a.sent_at.slice(0, 10)}</TableCell>
                              <TableCell>
                                <Badge variant={a.alert_round === 1 ? 'secondary' : 'destructive'} className="text-xs">
                                  {a.alert_round}차
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm font-medium">{emp?.name ?? a.employee_id}</TableCell>
                              <TableCell className="text-right font-bold">{a.remaining_days}일</TableCell>
                              <TableCell>
                                {!a.acknowledged ? (
                                  <Badge variant="outline" className="text-xs">미확인</Badge>
                                ) : a.response === 'plan_submitted' ? (
                                  <Badge variant="default" className="text-xs">계획제출</Badge>
                                ) : a.response === 'company_decision' ? (
                                  <Badge variant="secondary" className="text-xs">회사위임</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">확인만</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">{a.responded_at?.slice(0, 10) ?? a.acknowledged_at?.slice(0, 10) ?? '-'}</TableCell>
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
        )}

        {/* Tab 3: Leave Settings */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <LeaveTypeManagement />
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                연차 정책(반차/반반차 허용, 미사용 연차 처리 등)은{' '}
                <Link href="/settings" className="text-primary underline">
                  시스템 설정 &gt; 연차/휴가 정책
                </Link>
                에서 관리할 수 있습니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      {selectedEmployeeId && (
        <EmployeeLeaveDetail
          employeeId={selectedEmployeeId}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}

      {/* Bulk Grant Dialog */}
      <BulkGrantDialog open={bulkGrantOpen} onOpenChange={setBulkGrantOpen} />
    </div>
  );
}
