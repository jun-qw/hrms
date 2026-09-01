'use client';

import { useState, useMemo } from 'react';
import { useLeaveStore } from '@/lib/stores/leave-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useEmployeeLeave } from '@/lib/hooks/use-leave';
import { calculateBusinessDays } from '@/lib/utils/leave-calculator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { LeaveTimePeriod } from '@/types';

interface LeaveRequestFormProps {
  employeeId: string;
  onSuccess?: () => void;
}

export default function LeaveRequestForm({ employeeId, onSuccess }: LeaveRequestFormProps) {
  const leaveTypes = useLeaveStore((s) => s.leaveTypes);
  const addLeaveRequest = useLeaveStore((s) => s.addLeaveRequest);
  const holidays = useSettingsStore((s) => s.holidays);
  const leaveSettings = useSettingsStore((s) => s.leave);
  const work = useSettingsStore((s) => s.work);
  const { balances } = useEmployeeLeave(employeeId);

  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [isQuarterDay, setIsQuarterDay] = useState(false);
  const [period, setPeriod] = useState<'am' | 'pm' | 'custom'>('am');
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');

  const activeTypes = leaveTypes.filter((lt) => lt.is_active);
  const holidayDates = holidays.filter((h) => h.is_active).map((h) => h.date);

  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    let days = calculateBusinessDays(start, end, holidayDates);
    if (isQuarterDay && leaveSettings.allow_quarter_day) {
      days = 0.25;
    } else if (isHalfDay && leaveSettings.allow_half_day) {
      days = 0.5;
    }
    return days;
  }, [startDate, endDate, holidayDates, isHalfDay, isQuarterDay, leaveSettings]);

  const selectedBalance = balances.find((b) => b.leave_type_id === leaveTypeId);
  const isOverLimit = selectedBalance ? calculatedDays > selectedBalance.remaining_days : false;

  // 시간을 분 단위로 변환
  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const minutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // 사용자 지정 시간이 유효한지 검증
  const customDuration = useMemo(() => {
    if (period !== 'custom' || !customStartTime || !customEndTime) return 0;
    const diff = timeToMinutes(customEndTime) - timeToMinutes(customStartTime);
    return diff;
  }, [period, customStartTime, customEndTime]);

  const expectedMinutes = isHalfDay ? 240 : isQuarterDay ? 120 : 0;
  const customTimeValid = period !== 'custom' || (customDuration === expectedMinutes);

  // Compute work time description for half/quarter day
  const getWorkTimeDesc = () => {
    const start = work.default_start_time;
    const end = work.default_end_time;
    const [sh] = start.split(':').map(Number);
    const [eh] = end.split(':').map(Number);
    const midH = Math.floor((sh + eh) / 2);
    const mid = `${String(midH).padStart(2, '0')}:00`;

    if (period === 'custom') {
      if (!customStartTime || !customEndTime) return '시작/종료 시간을 입력하세요';
      if (customDuration !== expectedMinutes) {
        return `${isHalfDay ? '반차는 4시간' : '반반차는 2시간'}이어야 합니다. (현재 ${customDuration}분)`;
      }
      return `사용자지정: ${customStartTime} ~ ${customEndTime} 휴가 (${customDuration / 60}시간)`;
    }

    if (isHalfDay) {
      if (period === 'am') {
        return `오전반차: ${mid} 출근 ~ ${end} 퇴근 (오전 근무면제)`;
      }
      return `오후반차: ${start} 출근 ~ ${mid} 퇴근 (오후 근무면제)`;
    }
    if (isQuarterDay) {
      const quarterH = Math.floor((eh - sh) / 4);
      if (period === 'am') {
        const lateStart = `${String(sh + quarterH).padStart(2, '0')}:00`;
        return `오전반반차: ${lateStart} 출근 ~ ${end} 퇴근 (2시간 면제)`;
      }
      const earlyEnd = `${String(eh - quarterH).padStart(2, '0')}:00`;
      return `오후반반차: ${start} 출근 ~ ${earlyEnd} 퇴근 (2시간 면제)`;
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId || !startDate || !endDate) {
      toast.error('필수 항목을 모두 입력해주세요.');
      return;
    }
    if (calculatedDays <= 0) {
      toast.error('유효한 근무일이 없습니다.');
      return;
    }
    if (isOverLimit) {
      toast.error('잔여일수를 초과합니다.');
      return;
    }
    // 사용자 지정 시간 검증
    if ((isHalfDay || isQuarterDay) && period === 'custom') {
      if (!customStartTime || !customEndTime) {
        toast.error('시작/종료 시간을 입력해주세요.');
        return;
      }
      if (customDuration !== expectedMinutes) {
        toast.error(`${isHalfDay ? '반차는 4시간(240분)' : '반반차는 2시간(120분)'}이어야 합니다.`);
        return;
      }
    }

    const request = {
      id: `lr-${crypto.randomUUID().slice(0, 8)}`,
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: isHalfDay || isQuarterDay ? startDate : endDate,
      days: calculatedDays,
      reason: reason || null,
      status: 'pending' as const,
      approval_id: null,
      created_at: new Date().toISOString().slice(0, 10),
      leave_time_period: (isHalfDay
        ? (period === 'am' ? 'am_half' : period === 'pm' ? 'pm_half' : 'custom_half')
        : isQuarterDay
          ? (period === 'am' ? 'am_quarter' : period === 'pm' ? 'pm_quarter' : 'custom_quarter')
          : undefined) as LeaveTimePeriod | undefined,
      custom_start_time: period === 'custom' ? customStartTime : null,
      custom_end_time: period === 'custom' ? customEndTime : null,
    };

    addLeaveRequest(request);
    toast.success('휴가가 신청되었습니다.');
    onSuccess?.();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label>휴가 유형</Label>
        <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
          <SelectTrigger>
            <SelectValue placeholder="유형 선택" />
          </SelectTrigger>
          <SelectContent>
            {activeTypes.map((lt) => (
              <SelectItem key={lt.id} value={lt.id}>
                {lt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedBalance && (
          <p className="text-sm text-muted-foreground">
            잔여: {selectedBalance.remaining_days}일 / {selectedBalance.total_days}일
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>시작일</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (!endDate || endDate < e.target.value) {
                setEndDate(e.target.value);
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>종료일</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isHalfDay || isQuarterDay}
          />
        </div>
      </div>

      <div className="flex gap-4">
        {leaveSettings.allow_half_day && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="half-day"
              checked={isHalfDay}
              onCheckedChange={(checked) => {
                setIsHalfDay(!!checked);
                if (checked) setIsQuarterDay(false);
              }}
            />
            <Label htmlFor="half-day" className="text-sm">
              반차 (0.5일)
            </Label>
          </div>
        )}
        {leaveSettings.allow_quarter_day && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="quarter-day"
              checked={isQuarterDay}
              onCheckedChange={(checked) => {
                setIsQuarterDay(!!checked);
                if (checked) setIsHalfDay(false);
              }}
            />
            <Label htmlFor="quarter-day" className="text-sm">
              반반차 (0.25일)
            </Label>
          </div>
        )}
      </div>

      {/* AM/PM/Custom Period selection */}
      {(isHalfDay || isQuarterDay) && (
        <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
          <Label className="text-sm font-medium">
            {isHalfDay ? '반차' : '반반차'} 시간대 선택
          </Label>
          <RadioGroup
            value={period}
            onValueChange={(v) => setPeriod(v as 'am' | 'pm' | 'custom')}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="am" id="period-am" />
              <Label htmlFor="period-am" className="text-sm cursor-pointer">
                {isHalfDay ? '오전반차 (오전 근무면제)' : '오전반반차 (오전 2시간 면제)'}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pm" id="period-pm" />
              <Label htmlFor="period-pm" className="text-sm cursor-pointer">
                {isHalfDay ? '오후반차 (오후 근무면제)' : '오후반반차 (오후 2시간 면제)'}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="period-custom" />
              <Label htmlFor="period-custom" className="text-sm cursor-pointer">
                사용자 지정 시간 ({isHalfDay ? '4시간' : '2시간'})
              </Label>
            </div>
          </RadioGroup>

          {/* 사용자 지정 시간 입력 */}
          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div className="space-y-1">
                <Label className="text-xs">시작 시간</Label>
                <Input
                  type="time"
                  value={customStartTime}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustomStartTime(v);
                    // 종료시간 자동 계산 (반차=4h, 반반차=2h)
                    if (v && expectedMinutes > 0) {
                      const newEnd = timeToMinutes(v) + expectedMinutes;
                      if (newEnd <= 24 * 60) {
                        setCustomEndTime(minutesToTime(newEnd));
                      }
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">종료 시간</Label>
                <Input
                  type="time"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {getWorkTimeDesc() && (
            <p className={`text-xs mt-1 ${period === 'custom' && !customTimeValid ? 'text-destructive' : 'text-muted-foreground'}`}>
              {getWorkTimeDesc()}
            </p>
          )}
        </div>
      )}

      {startDate && endDate && (
        <div className="text-sm p-2 rounded bg-muted">
          신청일수: <span className="font-bold">{calculatedDays}일</span>
          {isOverLimit && (
            <span className="text-destructive ml-2">
              (잔여일수 초과)
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>사유</Label>
        <Textarea
          placeholder="휴가 사유를 입력하세요"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isOverLimit || !customTimeValid}>
          신청
        </Button>
      </div>
    </form>
  );
}
