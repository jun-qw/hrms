'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, LogIn, LogOut, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { useAttendanceStore } from '@/lib/stores/attendance-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFlexScheduleStore } from '@/lib/stores/flex-schedule-store';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';

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

function calcEndTime(startTime: string, workHoursTotal: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const endMin = h * 60 + m + workHoursTotal * 60;
  const eh = Math.floor(endMin / 60);
  const em = endMin % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

export function ClockButton() {
  const LEAVE_TIME_PERIODS = useCodeMap(CODE.LEAVE_TIME_PERIODS);
  const session = useAuthStore((s) => s.session);
  // Accounts that are not linked to an employee record (a dedicated IT
  // administrator, for example) have nobody to clock in for.
  const employeeId = session?.employee_id ?? '';
  const hasEmployeeRecord = employeeId.length > 0;
  const clockIn = useAttendanceStore((s) => s.clockIn);
  const clockOut = useAttendanceStore((s) => s.clockOut);
  const getTodayRecord = useAttendanceStore((s) => s.getTodayRecord);
  const work = useSettingsStore((s) => s.work);
  const workSchedules = useSettingsStore((s) => s.workSchedules);
  const getActiveAssignment = useFlexScheduleStore((s) => s.getActiveAssignment);

  // 개인 배정 근무유형 가져오기
  const myAssignment = getActiveAssignment(employeeId);
  const mySchedule = myAssignment ? workSchedules.find((ws) => ws.id === myAssignment.work_schedule_id) : null;

  // 배정된 근무유형 기반으로 출퇴근 시간 결정
  const scheduleStartTime = mySchedule?.start_time ?? work.default_start_time;
  const scheduleEndTime = mySchedule?.end_time ?? work.default_end_time;
  const isStaggered = mySchedule?.type === 'staggered';
  const staggeredSettings = isStaggered && mySchedule?.settings ? mySchedule.settings as Record<string, string> : null;

  const todayRecord = getTodayRecord(employeeId);
  const isClockedIn = !!todayRecord && !todayRecord.clock_out;
  const isDone = !!todayRecord?.clock_out;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedStart, setSelectedStart] = useState(scheduleStartTime);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const startOptions = useMemo(() => {
    // 배정된 근무유형이 시차출퇴근제인 경우 해당 범위 사용
    if (isStaggered && staggeredSettings) {
      return generateTimeOptions(
        staggeredSettings.earliest_start ?? work.flex_start_min,
        staggeredSettings.latest_start ?? work.flex_start_max,
      );
    }
    // 회사 전체 유연근무 활성화 시
    if (work.flex_work_enabled) {
      return generateTimeOptions(work.flex_start_min, work.flex_start_max);
    }
    return [scheduleStartTime];
  }, [work, isStaggered, staggeredSettings, scheduleStartTime]);

  const selectedEnd = useMemo(() => {
    if (mySchedule) {
      // 배정된 근무유형의 총 근무시간 계산 (근무시간 + 휴게)
      const [sh, sm] = selectedStart.split(':').map(Number);
      const [eh, em] = mySchedule.end_time.split(':').map(Number);
      const [dsh] = mySchedule.start_time.split(':').map(Number);
      const totalMinutes = (eh * 60 + em) - (dsh * 60 + 0); // 기본 근무시간(분)
      const endMin = sh * 60 + sm + totalMinutes;
      const endH = Math.floor(endMin / 60);
      const endM = endMin % 60;
      return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }
    return calcEndTime(selectedStart, 9);
  }, [selectedStart, mySchedule]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatClockTime = (isoStr: string | null) => {
    if (!isoStr) return '--:--:--';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleClockIn = () => {
    if (!hasEmployeeRecord) return;
    clockIn(employeeId, 'office', selectedStart, selectedEnd, work.late_grace_minutes);
    toast.success('출근이 기록되었습니다.');
  };

  const handleClockOut = () => {
    if (!hasEmployeeRecord) return;
    clockOut(employeeId);
    toast.success('퇴근이 기록되었습니다.');
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-mono font-bold">{formatTime(currentTime)}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {currentTime.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
            <div className="flex gap-4 text-sm">
              <span>출근: <strong>{formatClockTime(todayRecord?.clock_in ?? null)}</strong></span>
              <span>퇴근: <strong>{formatClockTime(todayRecord?.clock_out ?? null)}</strong></span>
            </div>
            {mySchedule && (
              <Badge variant="secondary" className="text-xs mt-1">
                {mySchedule.name}
              </Badge>
            )}
            {todayRecord?.leave_time_period && (
              <Badge variant="outline" className="text-xs mt-1">
                {LEAVE_TIME_PERIODS[todayRecord.leave_time_period as keyof typeof LEAVE_TIME_PERIODS]}
              </Badge>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            {/* Flex schedule selector - 시차출퇴근 또는 전사 유연근무 */}
            {(isStaggered || work.flex_work_enabled) && !todayRecord && (
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedStart} onValueChange={setSelectedStart}>
                  <SelectTrigger className="w-[100px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {startOptions.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">~</span>
                <span className="text-sm font-medium w-[50px]">{selectedEnd}</span>
              </div>
            )}
            {todayRecord && (
              <div className="text-sm text-muted-foreground">
                근무시간: {todayRecord.scheduled_start ?? work.default_start_time} ~ {todayRecord.scheduled_end ?? work.default_end_time}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleClockIn}
                disabled={!hasEmployeeRecord || !!todayRecord}
                size="lg"
              >
                <LogIn className="h-4 w-4 mr-2" />
                출근
              </Button>
              <Button
                onClick={handleClockOut}
                disabled={!hasEmployeeRecord || !isClockedIn}
                variant="outline"
                size="lg"
              >
                <LogOut className="h-4 w-4 mr-2" />
                퇴근
              </Button>
            </div>
            {!hasEmployeeRecord && (
              <p className="text-xs text-muted-foreground">
                이 계정은 사원 정보와 연결되어 있지 않아 출퇴근을 기록할 수 없습니다.
                인사담당자에게 계정 연결을 요청하세요.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
