'use client';

import { useState, useMemo } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAttendanceStore } from '@/lib/stores/attendance-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';

export default function MonthlyAttendancePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const records = useAttendanceStore((s) => s.records);
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const positionTitles = useEmployeeStore((s) => s.positionTitles);

  const activeEmployees = useMemo(
    () => employees
      .filter((e) => e.status === 'active')
      .map((e) => ({
        ...e,
        department: departments.find((d) => d.id === e.department_id),
        position_rank: positionRanks.find((r) => r.id === e.position_rank_id),
        position_title: positionTitles.find((t) => t.id === e.position_title_id),
      })),
    [employees, departments, positionRanks, positionTitles],
  );

  const monthlyData = useMemo(() => {
    return activeEmployees.map((emp) => {
      const empRecords = records.filter((r) => {
        if (r.employee_id !== emp.id) return false;
        const d = new Date(r.date);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
      const workDays = empRecords.length;
      const lateDays = empRecords.filter((r) => r.status === 'late').length;
      const absentDays = empRecords.filter((r) => r.status === 'absent').length;
      const leaveDays = empRecords.filter((r) => r.status === 'leave').length;
      const overtimeHours = empRecords.reduce((sum, r) => sum + (r.overtime_hours ?? 0), 0);
      return {
        id: emp.id,
        name: emp.name,
        department: emp.department?.name ?? '-',
        workDays,
        lateDays,
        absentDays,
        leaveDays,
        overtimeHours: Math.round(overtimeHours * 10) / 10,
      };
    }).filter((d) => d.workDays > 0);
  }, [activeEmployees, records, year, month]);

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  return (
    <div>
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-6">월별 근태 현황</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {year}년 {month}월 근태 요약
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-24 text-center">{year}년 {String(month).padStart(2, '0')}월</span>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead className="text-center">근무일</TableHead>
                  <TableHead className="text-center">지각</TableHead>
                  <TableHead className="text-center">결근</TableHead>
                  <TableHead className="text-center">휴가</TableHead>
                  <TableHead className="text-center">연장근무(h)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      해당 월의 근태 기록이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : monthlyData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell className="text-center">{row.workDays}</TableCell>
                    <TableCell className="text-center">
                      {row.lateDays > 0 ? (
                        <Badge variant="destructive" className="text-xs">{row.lateDays}</Badge>
                      ) : '0'}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.absentDays > 0 ? (
                        <Badge variant="destructive" className="text-xs">{row.absentDays}</Badge>
                      ) : '0'}
                    </TableCell>
                    <TableCell className="text-center">{row.leaveDays}</TableCell>
                    <TableCell className="text-center">{row.overtimeHours}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
