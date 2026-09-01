'use client';

import { useState, useMemo } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { ClockButton } from '@/components/attendance/clock-button';
import { AttendanceTable } from '@/components/attendance/attendance-table';
import { AttendanceRegisterDialog } from '@/components/attendance/attendance-register-dialog';
import { AttendanceRequestForm } from '@/components/attendance/attendance-request-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Building2, Plane, MapPin, Laptop, Clock, UserX, Palmtree, TimerOff, Lock, FileCheck, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { useAttendanceStore } from '@/lib/stores/attendance-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';

const statConfig = [
  { key: 'office', label: '출근', icon: Building2, iconClass: 'bg-accent-blue-subtle text-accent-blue' },
  { key: 'business_trip', label: '출장', icon: Plane, iconClass: 'bg-accent-purple-subtle text-accent-purple' },
  { key: 'field_work', label: '외근', icon: MapPin, iconClass: 'bg-accent-green-subtle text-accent-green' },
  { key: 'remote', label: '재택', icon: Laptop, iconClass: 'bg-accent-amber-subtle text-accent-amber' },
  { key: 'late', label: '지각', icon: Clock, iconClass: 'bg-red-100 text-red-600' },
  { key: 'absent', label: '결근', icon: UserX, iconClass: 'bg-red-100 text-red-600' },
  { key: 'leave', label: '휴가', icon: Palmtree, iconClass: 'bg-accent-green-subtle text-accent-green' },
  { key: 'half_day', label: '반차', icon: TimerOff, iconClass: 'bg-orange-100 text-orange-600' },
] as const;

export default function AttendancePage() {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const records = useAttendanceStore((s) => s.records);
  const addRecord = useAttendanceStore((s) => s.addRecord);
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const positionTitles = useEmployeeStore((s) => s.positionTitles);

  const today = new Date().toISOString().split('T')[0];

  const todayRecords = useMemo(() => {
    return records
      .filter((r) => r.date === today)
      .map((r) => {
        const emp = employees.find((e) => e.id === r.employee_id);
        return {
          ...r,
          employee: emp ? {
            ...emp,
            department: departments.find((d) => d.id === emp.department_id),
            position_rank: positionRanks.find((rk) => rk.id === emp.position_rank_id),
            position_title: positionTitles.find((t) => t.id === emp.position_title_id),
          } : undefined,
        };
      });
  }, [records, today, employees, departments, positionRanks, positionTitles]);

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    let late = 0;
    let absent = 0;
    let half_day = 0;
    for (const r of todayRecords) {
      const t = r.attendance_type ?? 'office';
      byType[t] = (byType[t] ?? 0) + 1;
      if (r.status === 'late') late++;
      if (r.status === 'absent') absent++;
      if (r.status === 'half_day' || r.status === 'quarter_day') half_day++;
    }
    return {
      office: byType['office'] ?? 0,
      business_trip: byType['business_trip'] ?? 0,
      field_work: byType['field_work'] ?? 0,
      remote: byType['remote'] ?? 0,
      late,
      absent,
      leave: 0,
      half_day,
    };
  }, [todayRecords]);

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">근태관리</h1>
        <div className="flex gap-2">
          <Button onClick={() => setRequestOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <FileCheck className="h-4 w-4 mr-2" />
            근태 신청 (전자결재)
          </Button>
          <Button variant="outline" onClick={() => setRegisterOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            근태 등록
          </Button>
          <Link href="/attendance/flex-admin">
            <Button variant="outline">
              <CalendarClock className="h-4 w-4 mr-2" />
              유연근무
            </Button>
          </Link>
          <Link href="/attendance/admin">
            <Button variant="outline">
              <Lock className="h-4 w-4 mr-2" />
              근태 마감
            </Button>
          </Link>
          <Link href="/attendance/monthly">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              월별 현황
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <ClockButton />

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
          {statConfig.map(({ key, label, icon: Icon, iconClass }) => {
            const val = stats[key as keyof typeof stats];
            const isNegative = key === 'late' || key === 'absent';
            return (
              <Card key={key}>
                <CardContent className="pt-4 text-center space-y-2">
                  <div className={`mx-auto w-fit p-2 rounded-lg ${iconClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold ${isNegative && val > 0 ? 'text-destructive' : ''}`}>{val}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">금일 근태 현황</h2>
          <AttendanceTable records={todayRecords} />
        </div>
      </div>

      <AttendanceRegisterDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onRegister={addRecord}
      />

      <AttendanceRequestForm
        open={requestOpen}
        onOpenChange={setRequestOpen}
      />
    </div>
  );
}
