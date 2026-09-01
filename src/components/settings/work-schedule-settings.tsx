'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/lib/stores/settings-store';
import type { WorkSchedule } from '@/types';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Star, History } from 'lucide-react';
import { toast } from 'sonner';
import WorkScheduleDialog from './work-schedule-dialog';
import { useChangeHistory } from '@/lib/hooks/use-change-history';
import { computeFieldChanges } from '@/lib/utils/diff';
import EffectiveStatusBadge from '@/components/shared/effective-status-badge';
import ChangeHistoryDialog from '@/components/shared/change-history-dialog';

export default function WorkScheduleSettings() {
  const WORK_SCHEDULE_TYPES = useCodeMap(CODE.WORK_SCHEDULE_TYPES);

  const work = useSettingsStore((s) => s.work);
  const workSchedules = useSettingsStore((s) => s.workSchedules);
  const updateWork = useSettingsStore((s) => s.updateWork);
  const addWorkSchedule = useSettingsStore((s) => s.addWorkSchedule);
  const updateWorkSchedule = useSettingsStore((s) => s.updateWorkSchedule);
  const deleteWorkSchedule = useSettingsStore((s) => s.deleteWorkSchedule);
  const setDefaultWorkSchedule = useSettingsStore((s) => s.setDefaultWorkSchedule);

  // Section A: Basic work hours local state
  const [basicForm, setBasicForm] = useState({
    default_start_time: '09:00',
    default_end_time: '18:00',
    lunch_break_minutes: 60,
    weekly_hours: 40,
    late_grace_minutes: 5,
  });

  // Section A-2: Flex work local state
  const [flexForm, setFlexForm] = useState({
    flex_work_enabled: true,
    flex_start_min: '06:00',
    flex_start_max: '08:00',
    flex_end_min: '15:00',
    flex_end_max: '17:00',
  });

  // Section C: 52h rule & rates local state
  const [ruleForm, setRuleForm] = useState({
    enforce_52h_rule: true,
    max_weekly_hours: 52,
    overtime_limit_weekly: 12,
    overtime_warning_hours: 48,
    overtime_rate: 1.5,
    night_rate: 0.5,
    holiday_rate: 1.5,
    holiday_overtime_rate: 2.0,
  });

  const { recordChange } = useChangeHistory();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<WorkSchedule | null>(null);

  useEffect(() => {
    setBasicForm({
      default_start_time: work.default_start_time,
      default_end_time: work.default_end_time,
      lunch_break_minutes: work.lunch_break_minutes,
      weekly_hours: work.weekly_hours,
      late_grace_minutes: work.late_grace_minutes,
    });
    setFlexForm({
      flex_work_enabled: work.flex_work_enabled,
      flex_start_min: work.flex_start_min,
      flex_start_max: work.flex_start_max,
      flex_end_min: work.flex_end_min,
      flex_end_max: work.flex_end_max,
    });
    setRuleForm({
      enforce_52h_rule: work.enforce_52h_rule,
      max_weekly_hours: work.max_weekly_hours,
      overtime_limit_weekly: work.overtime_limit_weekly,
      overtime_warning_hours: work.overtime_warning_hours,
      overtime_rate: work.overtime_rate,
      night_rate: work.night_rate,
      holiday_rate: work.holiday_rate,
      holiday_overtime_rate: work.holiday_overtime_rate,
    });
  }, [work]);

  const handleSaveBasic = () => {
    updateWork(basicForm);
    toast.success('기본 근무시간이 저장되었습니다.');
  };

  const handleSaveFlex = () => {
    updateWork(flexForm);
    toast.success('유연근무 설정이 저장되었습니다.');
  };

  const handleSaveRules = () => {
    updateWork(ruleForm);
    toast.success('근무 규정이 저장되었습니다.');
  };

  const handleAddSchedule = () => {
    setEditingSchedule(null);
    setDialogOpen(true);
  };

  const handleEditSchedule = (schedule: WorkSchedule) => {
    setEditingSchedule(schedule);
    setDialogOpen(true);
  };

  const handleDeleteSchedule = (schedule: WorkSchedule) => {
    if (schedule.is_default) {
      toast.error('기본 근무유형은 삭제할 수 없습니다.');
      return;
    }
    if (window.confirm(`"${schedule.name}" 근무유형을 미사용 처리하시겠습니까?`)) {
      deleteWorkSchedule(schedule.id);
      recordChange('work_schedule', schedule.id, schedule.name, 'delete', [
        { field: 'is_active', label: '활성', before: '예', after: '아니오' },
      ]);
      toast.success('근무유형이 미사용 처리되었습니다.');
    }
  };

  const handleDialogSave = (schedule: WorkSchedule) => {
    if (editingSchedule) {
      const changes = computeFieldChanges(
        editingSchedule as unknown as Record<string, unknown>,
        schedule as unknown as Record<string, unknown>,
        { name: '유형명', type: '근무유형', start_time: '출근시간', end_time: '퇴근시간', weekly_hours: '주당시간', effective_from: '시작일', effective_to: '종료일' },
      );
      updateWorkSchedule(schedule.id, schedule);
      if (changes.length > 0) recordChange('work_schedule', schedule.id, schedule.name, 'update', changes);
      toast.success('근무유형이 수정되었습니다.');
    } else {
      addWorkSchedule(schedule);
      recordChange('work_schedule', schedule.id, schedule.name, 'create', []);
      toast.success('근무유형이 추가되었습니다.');
    }
  };

  const handleShowHistory = (schedule: WorkSchedule) => {
    setHistoryTarget(schedule);
    setHistoryOpen(true);
  };

  const handleSetDefault = (id: string) => {
    setDefaultWorkSchedule(id);
    toast.success('기본 근무유형이 변경되었습니다.');
  };

  return (
    <div className="space-y-6">
      {/* Section A: 기본 근무시간 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 근무시간</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">출근시간</Label>
              <Input
                id="start-time"
                type="time"
                value={basicForm.default_start_time}
                onChange={(e) =>
                  setBasicForm((prev) => ({
                    ...prev,
                    default_start_time: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">퇴근시간</Label>
              <Input
                id="end-time"
                type="time"
                value={basicForm.default_end_time}
                onChange={(e) =>
                  setBasicForm((prev) => ({
                    ...prev,
                    default_end_time: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lunch-break">점심시간 (분)</Label>
              <Input
                id="lunch-break"
                type="number"
                value={basicForm.lunch_break_minutes}
                onChange={(e) =>
                  setBasicForm((prev) => ({
                    ...prev,
                    lunch_break_minutes: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-hours">주당 근무시간</Label>
              <Input
                id="weekly-hours"
                type="number"
                value={basicForm.weekly_hours}
                onChange={(e) =>
                  setBasicForm((prev) => ({
                    ...prev,
                    weekly_hours: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <Label htmlFor="late-grace">지각 유예시간 (분)</Label>
            <p className="text-sm text-muted-foreground">
              출근시간 이후 설정된 시간 내에 출근하면 지각으로 처리하지 않습니다.
            </p>
            <div className="flex items-center gap-3">
              <Input
                id="late-grace"
                type="number"
                min={0}
                max={10}
                className="w-[100px]"
                value={basicForm.late_grace_minutes}
                onChange={(e) =>
                  setBasicForm((prev) => ({
                    ...prev,
                    late_grace_minutes: Math.min(10, Math.max(0, Number(e.target.value))),
                  }))
                }
              />
              <span className="text-sm text-muted-foreground">분 (0~10분)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              예: {basicForm.late_grace_minutes}분 설정 시 출근시간 {basicForm.default_start_time} 기준 {(() => {
                const [h, m] = basicForm.default_start_time.split(':').map(Number);
                const total = h * 60 + m + basicForm.late_grace_minutes;
                return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
              })()}까지 정상 출근으로 인정
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveBasic}>저장</Button>
          </div>
        </CardContent>
      </Card>

      {/* Section A-3: 근태신청 옵션 */}
      <Card>
        <CardHeader>
          <CardTitle>근태신청 옵션</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>출장 시 첨부파일 필수</Label>
              <p className="text-sm text-muted-foreground">국내/해외 출장 신청 시 증빙 첨부 필수</p>
            </div>
            <Switch checked={work.require_attachment_for_trip ?? false}
              onCheckedChange={(v) => updateWork({ require_attachment_for_trip: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>동행자 신청 허용</Label>
              <p className="text-sm text-muted-foreground">같은 본부 직원과 동반 신청 (결재 1건으로 처리)</p>
            </div>
            <Switch checked={work.allow_companion_request ?? true}
              onCheckedChange={(v) => updateWork({ allow_companion_request: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>부산권 출장(A/B/C) 차단</Label>
              <p className="text-sm text-muted-foreground">부산/김해/창원/양산은 외근으로 신청하도록 안내</p>
            </div>
            <Switch checked={work.block_near_area_business_trip ?? true}
              onCheckedChange={(v) => updateWork({ block_near_area_business_trip: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>잔업/특근 결재 필수</Label>
              <p className="text-sm text-muted-foreground">잔업/특근 신청 시 전자결재 상신 필수</p>
            </div>
            <Switch checked={work.overtime_requires_approval ?? true}
              onCheckedChange={(v) => updateWork({ overtime_requires_approval: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>근태별 지각유예 차등</Label>
              <p className="text-sm text-muted-foreground">교대근무, 유연근무 등 근태유형별 지각 기준 차등 적용</p>
            </div>
            <Switch checked={work.enable_late_grace_by_request_type ?? false}
              onCheckedChange={(v) => updateWork({ enable_late_grace_by_request_type: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>사후결재 (근태수정 요청) 허용</Label>
              <p className="text-sm text-muted-foreground">개인 근태조회에서 [근태수정] 버튼으로 수정요청 가능</p>
            </div>
            <Switch checked={work.allow_attendance_modification ?? true}
              onCheckedChange={(v) => updateWork({ allow_attendance_modification: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>마감된 근태는 수정 불가</Label>
              <p className="text-sm text-muted-foreground">근태 마감 처리된 월의 근태는 수정 요청을 비활성화</p>
            </div>
            <Switch checked={work.modification_locked_after_close ?? true}
              onCheckedChange={(v) => updateWork({ modification_locked_after_close: v })} />
          </div>

          <Separator />
          <p className="text-sm font-semibold">전결규정 / 검증</p>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>전결규정 활성화</Label>
              <p className="text-sm text-muted-foreground">잔업/출장 신청 시 본인 결재 한도 초과 안내</p>
            </div>
            <Switch checked={work.enable_delegation_rules ?? true}
              onCheckedChange={(v) => updateWork({ enable_delegation_rules: v })} />
          </div>
          {(work.enable_delegation_rules ?? true) && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label>본인 결재 가능 잔업 시간</Label>
                <Input
                  type="number" min={0} step="0.5"
                  value={work.overtime_self_approval_limit ?? 4}
                  onChange={(e) => updateWork({ overtime_self_approval_limit: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">초과 시 상위자 전결 안내</p>
              </div>
              <div className="space-y-2">
                <Label>본인 결재 가능 출장 일수</Label>
                <Input
                  type="number" min={0}
                  value={work.business_trip_self_approval_limit ?? 1}
                  onChange={(e) => updateWork({ business_trip_self_approval_limit: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">초과 시 상위자 전결 안내</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>1일 중복 근태 신청 차단</Label>
              <p className="text-sm text-muted-foreground">동일 직원 동일 날짜에 중복 신청 방지</p>
            </div>
            <Switch checked={work.block_duplicate_attendance_request ?? true}
              onCheckedChange={(v) => updateWork({ block_duplicate_attendance_request: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>주52시간 초과 경고</Label>
              <p className="text-sm text-muted-foreground">잔업 신청 시 주간 누적이 52시간 초과 시 경고</p>
            </div>
            <Switch checked={work.weekly_52h_warning ?? true}
              onCheckedChange={(v) => updateWork({ weekly_52h_warning: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>사업장별 근로조건 사용</Label>
              <p className="text-sm text-muted-foreground">법인/사업장별로 다른 출퇴근시간을 적용 (사업장 관리에서 설정)</p>
            </div>
            <Switch checked={work.enable_workplace_specific_hours ?? true}
              onCheckedChange={(v) => updateWork({ enable_workplace_specific_hours: v })} />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>생일자 조기퇴근 - 자녀 1명당 시간</Label>
            <p className="text-sm text-muted-foreground">자녀 수에 따라 연 사용 한도 자동 산정 (인사정보 가족 등록 기준)</p>
            <div className="flex items-center gap-3">
              <Input
                type="number" min={0} max={8} className="w-[100px]"
                value={work.birthday_early_per_child_hours ?? 4}
                onChange={(e) => updateWork({ birthday_early_per_child_hours: Number(e.target.value) })}
              />
              <span className="text-sm text-muted-foreground">시간/자녀</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section A-2: 유연근무 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>유연근무 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="flex-enabled">유연근무제 사용</Label>
              <p className="text-sm text-muted-foreground">
                직원이 출퇴근 시간을 선택할 수 있습니다.
              </p>
            </div>
            <Switch
              id="flex-enabled"
              checked={flexForm.flex_work_enabled}
              onCheckedChange={(checked) =>
                setFlexForm((prev) => ({ ...prev, flex_work_enabled: checked }))
              }
            />
          </div>
          {flexForm.flex_work_enabled && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-sm font-medium">출근 가능 시간대</p>
                  <div className="flex items-center gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="flex-start-min" className="text-xs text-muted-foreground">최소</Label>
                      <Input
                        id="flex-start-min"
                        type="time"
                        value={flexForm.flex_start_min}
                        onChange={(e) =>
                          setFlexForm((prev) => ({ ...prev, flex_start_min: e.target.value }))
                        }
                      />
                    </div>
                    <span className="text-muted-foreground mt-5">~</span>
                    <div className="space-y-1">
                      <Label htmlFor="flex-start-max" className="text-xs text-muted-foreground">최대</Label>
                      <Input
                        id="flex-start-max"
                        type="time"
                        value={flexForm.flex_start_max}
                        onChange={(e) =>
                          setFlexForm((prev) => ({ ...prev, flex_start_max: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium">퇴근 가능 시간대</p>
                  <div className="flex items-center gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="flex-end-min" className="text-xs text-muted-foreground">최소</Label>
                      <Input
                        id="flex-end-min"
                        type="time"
                        value={flexForm.flex_end_min}
                        onChange={(e) =>
                          setFlexForm((prev) => ({ ...prev, flex_end_min: e.target.value }))
                        }
                      />
                    </div>
                    <span className="text-muted-foreground mt-5">~</span>
                    <div className="space-y-1">
                      <Label htmlFor="flex-end-max" className="text-xs text-muted-foreground">최대</Label>
                      <Input
                        id="flex-end-max"
                        type="time"
                        value={flexForm.flex_end_max}
                        onChange={(e) =>
                          setFlexForm((prev) => ({ ...prev, flex_end_max: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                현재 설정: {flexForm.flex_start_min}~{flexForm.flex_start_max} 출근 / {flexForm.flex_end_min}~{flexForm.flex_end_max} 퇴근 (8시간 근무 + 1시간 점심)
              </p>
            </>
          )}
          <div className="flex justify-end">
            <Button onClick={handleSaveFlex}>저장</Button>
          </div>
        </CardContent>
      </Card>

      {/* Section B: 유연근무제 유형 관리 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>유연근무제 유형 관리</CardTitle>
          <Button size="sm" onClick={handleAddSchedule}>
            <Plus className="h-4 w-4 mr-1" />
            추가
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>유형명</TableHead>
                <TableHead>근무유형</TableHead>
                <TableHead>출근시간</TableHead>
                <TableHead>퇴근시간</TableHead>
                <TableHead>코어타임</TableHead>
                <TableHead>주당시간</TableHead>
                <TableHead>기본</TableHead>
                <TableHead>시작일</TableHead>
                <TableHead>종료일</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workSchedules.map((ws) => (
                <TableRow key={ws.id}>
                  <TableCell className="font-medium">{ws.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {WORK_SCHEDULE_TYPES[ws.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>{ws.start_time}</TableCell>
                  <TableCell>{ws.end_time}</TableCell>
                  <TableCell>
                    {ws.core_start_time && ws.core_end_time
                      ? `${ws.core_start_time} ~ ${ws.core_end_time}`
                      : '-'}
                  </TableCell>
                  <TableCell>{ws.weekly_hours}h</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleSetDefault(ws.id)}
                      className="hover:opacity-70"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          ws.is_default
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ws.effective_from ?? '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ws.effective_to ?? '-'}</TableCell>
                  <TableCell>
                    <EffectiveStatusBadge is_active={ws.is_active} effective_from={ws.effective_from} effective_to={ws.effective_to} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditSchedule(ws)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleShowHistory(ws)}>
                        <History className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteSchedule(ws)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {workSchedules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground">
                    등록된 근무유형이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section C: 주 52시간제 & 수당율 */}
      <Card>
        <CardHeader>
          <CardTitle>주 52시간제 및 수당율</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enforce-52h">주 52시간제 적용</Label>
              <p className="text-sm text-muted-foreground">
                주 52시간 초과 근무를 제한합니다.
              </p>
            </div>
            <Switch
              id="enforce-52h"
              checked={ruleForm.enforce_52h_rule}
              onCheckedChange={(checked) =>
                setRuleForm((prev) => ({ ...prev, enforce_52h_rule: checked }))
              }
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-weekly">최대 주당 근무시간</Label>
              <Input
                id="max-weekly"
                type="number"
                value={ruleForm.max_weekly_hours}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    max_weekly_hours: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ot-limit">주당 연장근로 한도 (시간)</Label>
              <Input
                id="ot-limit"
                type="number"
                value={ruleForm.overtime_limit_weekly}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    overtime_limit_weekly: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ot-warning">초과근무 경고 시간</Label>
              <Input
                id="ot-warning"
                type="number"
                value={ruleForm.overtime_warning_hours}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    overtime_warning_hours: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <Separator />

          <p className="text-sm font-medium">수당율 설정</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ot-rate">연장근무 수당율</Label>
              <Input
                id="ot-rate"
                type="number"
                step={0.1}
                value={ruleForm.overtime_rate}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    overtime_rate: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="night-rate">야간근무 수당율</Label>
              <Input
                id="night-rate"
                type="number"
                step={0.1}
                value={ruleForm.night_rate}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    night_rate: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-rate">휴일근무 수당율</Label>
              <Input
                id="holiday-rate"
                type="number"
                step={0.1}
                value={ruleForm.holiday_rate}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    holiday_rate: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-ot-rate">휴일연장 수당율</Label>
              <Input
                id="holiday-ot-rate"
                type="number"
                step={0.1}
                value={ruleForm.holiday_overtime_rate}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    holiday_overtime_rate: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveRules}>저장</Button>
          </div>
        </CardContent>
      </Card>

      {/* Work Schedule Dialog */}
      <WorkScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schedule={editingSchedule}
        onSave={handleDialogSave}
      />

      {historyTarget && (
        <ChangeHistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          entityType="work_schedule"
          entityId={historyTarget.id}
          entityLabel={historyTarget.name}
        />
      )}
    </div>
  );
}
