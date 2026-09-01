'use client';

import { useEffect, useState } from 'react';
import type { WorkSchedule, WorkScheduleType } from '@/types';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import EffectiveDateFields from '@/components/shared/effective-date-fields';

interface WorkScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: WorkSchedule | null;
  onSave: (schedule: WorkSchedule) => void;
}

interface FormState {
  name: string;
  type: WorkScheduleType;
  start_time: string;
  end_time: string;
  core_start_time: string;
  core_end_time: string;
  break_minutes: number;
  weekly_hours: number;
  effective_from: string;
  effective_to: string;
  settings: Record<string, unknown>;
}

const defaultForm: FormState = {
  name: '',
  type: 'fixed',
  start_time: '09:00',
  end_time: '18:00',
  core_start_time: '',
  core_end_time: '',
  break_minutes: 60,
  weekly_hours: 40,
  effective_from: '',
  effective_to: '',
  settings: {},
};

const DAYS_OF_WEEK = [
  { key: 'mon', label: '월' },
  { key: 'tue', label: '화' },
  { key: 'wed', label: '수' },
  { key: 'thu', label: '목' },
  { key: 'fri', label: '금' },
] as const;

export default function WorkScheduleDialog({
  open,
  onOpenChange,
  schedule,
  onSave,
}: WorkScheduleDialogProps) {
  const WORK_SCHEDULE_TYPES = useCodeMap(CODE.WORK_SCHEDULE_TYPES);
  const [form, setForm] = useState<FormState>(defaultForm);

  useEffect(() => {
    if (schedule) {
      setForm({
        name: schedule.name,
        type: schedule.type,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        core_start_time: schedule.core_start_time ?? '',
        core_end_time: schedule.core_end_time ?? '',
        break_minutes: schedule.break_minutes,
        weekly_hours: schedule.weekly_hours,
        effective_from: schedule.effective_from ?? '',
        effective_to: schedule.effective_to ?? '',
        settings: { ...schedule.settings },
      });
    } else {
      setForm({ ...defaultForm, settings: {} });
    }
  }, [schedule, open]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateSetting = (key: string, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      settings: { ...prev.settings, [key]: value },
    }));
  };

  const handleTypeChange = (type: WorkScheduleType) => {
    const newSettings: Record<string, unknown> = {};
    switch (type) {
      case 'staggered':
        newSettings.earliest_start = '07:00';
        newSettings.latest_start = '10:00';
        break;
      case 'selective':
        newSettings.settlement_period = '1month';
        break;
      case 'remote':
        newSettings.max_remote_days = 3;
        newSettings.required_office_days = ['mon', 'fri'];
        break;
      case 'flexible':
        newSettings.cycle = '2week';
        break;
      case 'compressed':
        newSettings.work_days_per_week = 4;
        newSettings.daily_hours = 10;
        break;
    }
    setForm((prev) => ({ ...prev, type, settings: newSettings }));
  };

  const toggleOfficeDay = (day: string) => {
    const current = (form.settings.required_office_days as string[]) ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    updateSetting('required_office_days', next);
  };

  const handleSave = () => {
    const now = new Date().toISOString();
    const result: WorkSchedule = {
      id: schedule?.id ?? crypto.randomUUID(),
      name: form.name,
      type: form.type,
      start_time: form.start_time,
      end_time: form.end_time,
      core_start_time: form.core_start_time || null,
      core_end_time: form.core_end_time || null,
      break_minutes: form.break_minutes,
      weekly_hours: form.weekly_hours,
      is_default: schedule?.is_default ?? false,
      is_active: schedule?.is_active ?? true,
      effective_from: form.effective_from || null,
      effective_to: form.effective_to || null,
      settings: form.settings,
      created_at: schedule?.created_at ?? now,
      updated_at: now,
    };
    onSave(result);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {schedule ? '근무유형 수정' : '근무유형 추가'}
          </DialogTitle>
          <DialogDescription>
            {schedule
              ? '기존 근무유형의 정보를 수정합니다.'
              : '새로운 근무유형을 추가합니다.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic fields */}
          <div className="space-y-2">
            <Label htmlFor="ws-name">유형명</Label>
            <Input
              id="ws-name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ws-type">근무유형</Label>
            <Select
              value={form.type}
              onValueChange={(v) => handleTypeChange(v as WorkScheduleType)}
            >
              <SelectTrigger id="ws-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(WORK_SCHEDULE_TYPES) as [WorkScheduleType, string][]).map(
                  ([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ws-start">출근시간</Label>
              <Input
                id="ws-start"
                type="time"
                value={form.start_time}
                onChange={(e) => updateField('start_time', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-end">퇴근시간</Label>
              <Input
                id="ws-end"
                type="time"
                value={form.end_time}
                onChange={(e) => updateField('end_time', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ws-core-start">코어타임 시작</Label>
              <Input
                id="ws-core-start"
                type="time"
                value={form.core_start_time}
                onChange={(e) => updateField('core_start_time', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-core-end">코어타임 종료</Label>
              <Input
                id="ws-core-end"
                type="time"
                value={form.core_end_time}
                onChange={(e) => updateField('core_end_time', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ws-break">휴게시간 (분)</Label>
              <Input
                id="ws-break"
                type="number"
                value={form.break_minutes}
                onChange={(e) => updateField('break_minutes', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-weekly">주당 근무시간</Label>
              <Input
                id="ws-weekly"
                type="number"
                value={form.weekly_hours}
                onChange={(e) => updateField('weekly_hours', Number(e.target.value))}
              />
            </div>
          </div>

          <EffectiveDateFields
            effectiveFrom={form.effective_from}
            effectiveTo={form.effective_to}
            onFromChange={(v) => updateField('effective_from', v)}
            onToChange={(v) => updateField('effective_to', v)}
          />

          {/* Type-specific settings */}
          {form.type !== 'fixed' && (
            <>
              <Separator />
              <p className="text-sm font-medium text-muted-foreground">
                유형별 상세 설정
              </p>

              {form.type === 'staggered' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ws-earliest">최소 출근시간</Label>
                    <Input
                      id="ws-earliest"
                      type="time"
                      value={(form.settings.earliest_start as string) ?? '07:00'}
                      onChange={(e) =>
                        updateSetting('earliest_start', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ws-latest">최대 출근시간</Label>
                    <Input
                      id="ws-latest"
                      type="time"
                      value={(form.settings.latest_start as string) ?? '10:00'}
                      onChange={(e) =>
                        updateSetting('latest_start', e.target.value)
                      }
                    />
                  </div>
                </div>
              )}

              {form.type === 'selective' && (
                <div className="space-y-2">
                  <Label htmlFor="ws-settlement">정산 기간</Label>
                  <Select
                    value={(form.settings.settlement_period as string) ?? '1month'}
                    onValueChange={(v) =>
                      updateSetting('settlement_period', v)
                    }
                  >
                    <SelectTrigger id="ws-settlement">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1month">1개월</SelectItem>
                      <SelectItem value="3month">3개월</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.type === 'remote' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ws-remote-days">최대 재택 일수 (주)</Label>
                    <Input
                      id="ws-remote-days"
                      type="number"
                      value={(form.settings.max_remote_days as number) ?? 3}
                      onChange={(e) =>
                        updateSetting('max_remote_days', Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>필수 출근일</Label>
                    <div className="flex gap-2">
                      {DAYS_OF_WEEK.map(({ key, label }) => {
                        const selected = (
                          (form.settings.required_office_days as string[]) ?? []
                        ).includes(key);
                        return (
                          <Button
                            key={key}
                            type="button"
                            size="sm"
                            variant={selected ? 'default' : 'outline'}
                            onClick={() => toggleOfficeDay(key)}
                          >
                            {label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {form.type === 'flexible' && (
                <div className="space-y-2">
                  <Label htmlFor="ws-cycle">근무 주기</Label>
                  <Select
                    value={(form.settings.cycle as string) ?? '2week'}
                    onValueChange={(v) => updateSetting('cycle', v)}
                  >
                    <SelectTrigger id="ws-cycle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2week">2주</SelectItem>
                      <SelectItem value="12week">12주</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.type === 'compressed' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ws-workdays">주당 근무일수</Label>
                    <Input
                      id="ws-workdays"
                      type="number"
                      value={(form.settings.work_days_per_week as number) ?? 4}
                      onChange={(e) =>
                        updateSetting(
                          'work_days_per_week',
                          Number(e.target.value)
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ws-dailyhours">일일 근무시간</Label>
                    <Input
                      id="ws-dailyhours"
                      type="number"
                      value={(form.settings.daily_hours as number) ?? 10}
                      onChange={(e) =>
                        updateSetting('daily_hours', Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
