'use client';

import { useState, useMemo } from 'react';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import type { Attendance } from '@/types';

interface AttendanceRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegister: (record: Attendance) => void;
}

function generateTimeOptions(min: string, max: string, intervalMin = 30): string[] {
  const [minH, minM] = min.split(':').map(Number);
  const [maxH, maxM] = max.split(':').map(Number);
  const options: string[] = [];
  let cur = minH * 60 + minM;
  const end = maxH * 60 + maxM;
  while (cur <= end) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    cur += intervalMin;
  }
  return options;
}

export function AttendanceRegisterDialog({
  open,
  onOpenChange,
  onRegister,
}: AttendanceRegisterDialogProps) {
  const attendanceTypes = useSettingsStore((s) => s.attendanceTypes);
  const work = useSettingsStore((s) => s.work);
  const activeTypes = attendanceTypes.filter((t) => t.is_active);
  const session = useAuthStore((s) => s.session);
  const employeeId = session?.employee_id ?? '';
  const employees = useEmployeeStore((s) => s.employees);
  const allDepartments = useEmployeeStore((s) => s.departments);
  const allPositionRanks = useEmployeeStore((s) => s.positionRanks);
  const allPositionTitles = useEmployeeStore((s) => s.positionTitles);
  const rawEmp = employees.find((e) => e.id === employeeId);
  const employee = rawEmp ? {
    ...rawEmp,
    department: allDepartments.find((d) => d.id === rawEmp.department_id),
    position_rank: allPositionRanks.find((r) => r.id === rawEmp.position_rank_id),
    position_title: allPositionTitles.find((t) => t.id === rawEmp.position_title_id),
  } : undefined;

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    attendance_type: 'office',
    location: '',
    purpose: '',
    note: '',
    scheduled_start: work.default_start_time,
  });

  const selectedTypeConfig = attendanceTypes.find((t) => t.code === form.attendance_type);

  const startOptions = useMemo(() => {
    if (!work.flex_work_enabled) return [work.default_start_time];
    return generateTimeOptions(work.flex_start_min, work.flex_start_max);
  }, [work]);

  const scheduledEnd = useMemo(() => {
    const [h, m] = form.scheduled_start.split(':').map(Number);
    const endMin = h * 60 + m + 9 * 60; // 9h = 8h work + 1h lunch
    const eh = Math.floor(endMin / 60);
    const em = endMin % 60;
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  }, [form.scheduled_start]);

  const handleSubmit = () => {
    if (!form.date) {
      toast.error('날짜를 입력해주세요.');
      return;
    }
    if (selectedTypeConfig?.requires_location && !form.location.trim()) {
      toast.error('장소/목적지를 입력해주세요.');
      return;
    }
    if (selectedTypeConfig?.requires_purpose && !form.purpose.trim()) {
      toast.error('목적을 입력해주세요.');
      return;
    }

    const now = new Date().toISOString();
    const clockIn = `${form.date}T${form.scheduled_start}:00+09:00`;
    const record: Attendance = {
      id: `att-${Date.now()}`,
      employee_id: employeeId,
      date: form.date,
      clock_in: clockIn,
      clock_out: null,
      work_hours: null,
      overtime_hours: 0,
      status: 'normal',
      note: form.note || null,
      attendance_type: form.attendance_type,
      location: form.location || null,
      purpose: form.purpose || null,
      scheduled_start: form.scheduled_start,
      scheduled_end: scheduledEnd,
      created_at: now,
      employee: employee,
    };

    onRegister(record);
    toast.success('근태가 등록되었습니다.');
    onOpenChange(false);
    setForm({
      date: new Date().toISOString().split('T')[0],
      attendance_type: 'office',
      location: '',
      purpose: '',
      note: '',
      scheduled_start: work.default_start_time,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>근태 등록</DialogTitle>
          <DialogDescription>근태 유형을 선택하고 필요한 정보를 입력하세요.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reg-date">날짜</Label>
            <Input
              id="reg-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-type">근태유형</Label>
            <Select
              value={form.attendance_type}
              onValueChange={(v) => setForm((prev) => ({ ...prev, attendance_type: v }))}
            >
              <SelectTrigger id="reg-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activeTypes.map((type) => (
                  <SelectItem key={type.code} value={type.code}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Flex schedule selector */}
          {work.flex_work_enabled && (
            <div className="space-y-2">
              <Label>출퇴근 시간</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={form.scheduled_start}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, scheduled_start: v }))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {startOptions.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">~</span>
                <span className="font-medium">{scheduledEnd}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                유연근무: {work.flex_start_min}~{work.flex_start_max} 출근 / {work.flex_end_min}~{work.flex_end_max} 퇴근
              </p>
            </div>
          )}
          {selectedTypeConfig?.requires_location && (
            <div className="space-y-2">
              <Label htmlFor="reg-location">장소/목적지</Label>
              <Input
                id="reg-location"
                placeholder="장소 또는 목적지를 입력하세요"
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>
          )}
          {selectedTypeConfig?.requires_purpose && (
            <div className="space-y-2">
              <Label htmlFor="reg-purpose">목적</Label>
              <Input
                id="reg-purpose"
                placeholder="목적을 입력하세요"
                value={form.purpose}
                onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reg-note">비고</Label>
            <Input
              id="reg-note"
              placeholder="비고 (선택사항)"
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit}>등록</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
