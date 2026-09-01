'use client';

import { useState, useMemo } from 'react';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import type { Holiday, HolidayType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useChangeHistory } from '@/lib/hooks/use-change-history';
import ChangeHistoryDialog from '@/components/shared/change-history-dialog';

function getHolidayBadgeVariant(type: HolidayType): 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'legal': return 'default';
    case 'substitute': return 'secondary';
    case 'company': return 'outline';
    default: return 'outline';
  }
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function HolidayCalendar({ holidays, year, month, onMonthChange, onDateClick }: {
  holidays: Holiday[];
  year: number;
  month: number;
  onMonthChange: (y: number, m: number) => void;
  onDateClick: (dateStr: string) => void;
}) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const holidayMap = useMemo(() => {
    const map = new Map<string, Holiday[]>();
    for (const h of holidays) {
      if (!h.is_active) continue;
      const arr = map.get(h.date) ?? [];
      arr.push(h);
      map.set(h.date, arr);
    }
    return map;
  }, [holidays]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };
  const next = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm font-bold">{year}년 {month}월</span>
        <Button variant="ghost" size="icon" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground mb-1">
        {DAY_NAMES.map((d, i) => (
          <div key={d} className={i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : ''}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-muted/30 border rounded-lg overflow-hidden">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="bg-background p-1 min-h-[60px]" />;
          }
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayOfWeek = new Date(year, month - 1, day).getDay();
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;
          const dayHolidays = holidayMap.get(dateStr) ?? [];
          const isHoliday = dayHolidays.length > 0;
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <div
              key={dateStr}
              className={`bg-background p-1 min-h-[60px] cursor-pointer hover:bg-muted/50 transition-colors ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
              onClick={() => onDateClick(dateStr)}
            >
              <div className={`text-xs font-medium mb-0.5 ${
                isHoliday || isSunday ? 'text-red-500 font-bold' :
                isSaturday ? 'text-blue-500' : 'text-foreground'
              }`}>
                {day}
              </div>
              {dayHolidays.map((h) => (
                <div
                  key={h.id}
                  className={`text-[10px] leading-tight px-1 py-0.5 rounded mb-0.5 truncate ${
                    h.type === 'legal' ? 'bg-red-100 text-red-700' :
                    h.type === 'substitute' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}
                  title={h.name}
                >
                  {h.name}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-100 border" />법정공휴일
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-100 border" />대체공휴일
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-100 border" />회사지정
        </span>
      </div>
    </div>
  );
}

export default function HolidaySettings() {
  const HOLIDAY_TYPES = useCodeMap(CODE.HOLIDAY_TYPES);

  const holidays = useSettingsStore((s) => s.holidays);
  const holidayAutoSubstitute = useSettingsStore((s) => s.holiday_auto_substitute);
  const setHolidayAutoSubstitute = useSettingsStore((s) => s.setHolidayAutoSubstitute);
  const addHoliday = useSettingsStore((s) => s.addHoliday);
  const deleteHoliday = useSettingsStore((s) => s.deleteHoliday);

  const { recordChange } = useChangeHistory();

  const now = new Date();
  const [autoSubstitute, setAutoSubstitute] = useState(holidayAutoSubstitute);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newHolidayForm, setNewHolidayForm] = useState({ date: '', name: '' });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Holiday | null>(null);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  const sortedHolidays = useMemo(
    () => [...holidays].sort((a, b) => a.date.localeCompare(b.date)),
    [holidays],
  );

  const handlePolicySave = () => {
    setHolidayAutoSubstitute(autoSubstitute);
    toast.success('공휴일 정책이 저장되었습니다.');
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`"${name}" 공휴일을 삭제하시겠습니까?`)) {
      deleteHoliday(id);
      recordChange('holiday', id, name, 'delete', []);
      toast.success('공휴일이 삭제되었습니다.');
    }
  };

  const handleShowHistory = (h: Holiday) => {
    setHistoryTarget(h);
    setHistoryOpen(true);
  };

  const openAddDialog = () => {
    setNewHolidayForm({ date: '', name: '' });
    setDialogOpen(true);
  };

  const handleDateClick = (dateStr: string) => {
    // Check if holiday already exists on this date
    const existing = holidays.find((h) => h.date === dateStr && h.is_active);
    if (existing) {
      // If company holiday, confirm delete; otherwise just show info
      if (existing.type === 'company') {
        if (window.confirm(`"${existing.name}" (${dateStr})을 삭제하시겠습니까?`)) {
          deleteHoliday(existing.id);
          recordChange('holiday', existing.id, existing.name, 'delete', []);
          toast.success('공휴일이 삭제되었습니다.');
        }
      } else {
        toast.info(`${dateStr}: ${existing.name} (${HOLIDAY_TYPES[existing.type]})`);
      }
      return;
    }
    // Open add dialog with date pre-filled
    setNewHolidayForm({ date: dateStr, name: '' });
    setDialogOpen(true);
  };

  const handleAddHoliday = () => {
    if (!newHolidayForm.date) { toast.error('날짜를 입력해주세요.'); return; }
    if (!newHolidayForm.name.trim()) { toast.error('명칭을 입력해주세요.'); return; }
    const newHoliday: Holiday = {
      id: `h-${Date.now()}`,
      date: newHolidayForm.date,
      name: newHolidayForm.name,
      type: 'company',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    addHoliday(newHoliday);
    recordChange('holiday', newHoliday.id, newHoliday.name, 'create', []);
    toast.success('공휴일이 추가되었습니다.');
    setDialogOpen(false);
  };

  // Holiday count by type
  const counts = useMemo(() => {
    const legal = holidays.filter((h) => h.type === 'legal' && h.is_active).length;
    const substitute = holidays.filter((h) => h.type === 'substitute' && h.is_active).length;
    const company = holidays.filter((h) => h.type === 'company' && h.is_active).length;
    return { legal, substitute, company, total: legal + substitute + company };
  }, [holidays]);

  return (
    <div className="space-y-6">
      {/* Card 1: 공휴일 정책 */}
      <Card>
        <CardHeader>
          <CardTitle>공휴일 정책</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">대체공휴일 자동적용</Label>
              <p className="text-sm text-muted-foreground">
                법정공휴일이 주말과 겹칠 경우 대체공휴일 자동 생성
              </p>
            </div>
            <Switch checked={autoSubstitute} onCheckedChange={setAutoSubstitute} />
          </div>

          {/* Summary badges */}
          <div className="flex gap-3">
            <Badge variant="default">법정 {counts.legal}일</Badge>
            <Badge variant="secondary">대체 {counts.substitute}일</Badge>
            <Badge variant="outline">회사지정 {counts.company}일</Badge>
            <Badge variant="outline" className="ml-auto">총 {counts.total}일</Badge>
          </div>

          <div className="flex justify-end">
            <Button onClick={handlePolicySave}>저장</Button>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: 달력 */}
      <Card>
        <CardHeader>
          <CardTitle>공휴일 달력</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <HolidayCalendar
              holidays={holidays}
              year={calYear}
              month={calMonth}
              onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
              onDateClick={handleDateClick}
            />
            <HolidayCalendar
              holidays={holidays}
              year={calMonth === 12 ? calYear + 1 : calYear}
              month={calMonth === 12 ? 1 : calMonth + 1}
              onMonthChange={(y, m) => { setCalYear(m === 1 ? y - 1 : y); setCalMonth(m === 1 ? 12 : m - 1); }}
              onDateClick={handleDateClick}
            />
          </div>
        </CardContent>
      </Card>

      {/* Card 3: 공휴일 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>공휴일 목록</CardTitle>
            <Button onClick={openAddDialog} size="sm">
              <Plus className="h-4 w-4 mr-1" />추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>날짜</TableHead>
                <TableHead>요일</TableHead>
                <TableHead>명칭</TableHead>
                <TableHead>유형</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedHolidays.map((h) => {
                const d = new Date(h.date);
                const dayName = DAY_NAMES[d.getDay()];
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono text-sm">{h.date}</TableCell>
                    <TableCell>
                      <span className={isWeekend ? 'text-red-500 font-bold' : ''}>
                        {dayName}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell>
                      <Badge variant={getHolidayBadgeVariant(h.type)}>
                        {HOLIDAY_TYPES[h.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleShowHistory(h)}>
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={h.type === 'legal'}
                          title={h.type === 'legal' ? '법정공휴일은 삭제할 수 없습니다' : '삭제'}
                          onClick={() => handleDelete(h.id, h.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {holidays.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    등록된 공휴일이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {historyTarget && (
        <ChangeHistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          entityType="holiday"
          entityId={historyTarget.id}
          entityLabel={historyTarget.name}
        />
      )}

      {/* Add Holiday Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>회사지정 공휴일 추가</DialogTitle>
            <DialogDescription>회사지정 공휴일 정보를 입력해주세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="holiday-date">날짜</Label>
              <Input
                id="holiday-date"
                type="date"
                value={newHolidayForm.date}
                onChange={(e) => setNewHolidayForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-name">명칭</Label>
              <Input
                id="holiday-name"
                value={newHolidayForm.name}
                onChange={(e) => setNewHolidayForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="예: 창립기념일"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleAddHoliday}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
