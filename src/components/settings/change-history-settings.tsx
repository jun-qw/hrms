'use client';

import { useState, useMemo } from 'react';
import { useChangeHistoryStore } from '@/lib/stores/change-history-store';
import type { ChangeHistoryEntityType, ChangeHistoryActionType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const ENTITY_TYPE_LABELS: Record<ChangeHistoryEntityType, string> = {
  department: '부서',
  position_rank: '직급',
  position_title: '직책',
  job_category: '직무',
  salary_grade: '호봉',
  work_schedule: '근무유형',
  holiday: '공휴일',
  attendance_type: '근태유형',
  code_group: '코드그룹',
  code_item: '코드항목',
  employee_payroll: '사원급여',
};

const ACTION_LABELS: Record<ChangeHistoryActionType, string> = {
  create: '생성',
  update: '수정',
  delete: '삭제',
};

const ACTION_BADGE_VARIANT: Record<ChangeHistoryActionType, 'default' | 'secondary' | 'destructive'> = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
};

export default function ChangeHistorySettings() {
  const entries = useChangeHistoryStore((s) => s.entries);
  const settings = useChangeHistoryStore((s) => s.settings);
  const updateSettings = useChangeHistoryStore((s) => s.updateSettings);
  const clearAll = useChangeHistoryStore((s) => s.clearAll);
  const clearOldEntries = useChangeHistoryStore((s) => s.clearOldEntries);

  const [filterEntityType, setFilterEntityType] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterKeyword, setFilterKeyword] = useState('');

  const filteredEntries = useMemo(() => {
    let result = [...entries].sort((a, b) => b.changed_at.localeCompare(a.changed_at));

    if (filterEntityType !== 'all') {
      result = result.filter((e) => e.entity_type === filterEntityType);
    }
    if (filterAction !== 'all') {
      result = result.filter((e) => e.action === filterAction);
    }
    if (filterKeyword.trim()) {
      const kw = filterKeyword.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.entity_label.toLowerCase().includes(kw) ||
          e.changed_by_name.toLowerCase().includes(kw),
      );
    }

    return result;
  }, [entries, filterEntityType, filterAction, filterKeyword]);

  const handleClearAll = () => {
    if (window.confirm('전체 변경이력을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      clearAll();
      toast.success('전체 변경이력이 삭제되었습니다.');
    }
  };

  const handleClearOld = () => {
    if (window.confirm(`보관기간(${settings.retention_days}일)이 지난 이력을 삭제하시겠습니까?`)) {
      clearOldEntries();
      toast.success('오래된 변경이력이 삭제되었습니다.');
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>변경이력 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">변경이력 기록</Label>
              <p className="text-sm text-muted-foreground">
                코드/마스터 데이터 변경사항을 자동으로 기록합니다.
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSettings({ enabled: checked })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-entries">최대 보관 건수</Label>
              <Input
                id="max-entries"
                type="number"
                value={settings.max_entries}
                onChange={(e) => updateSettings({ max_entries: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retention-days">보관기간 (일)</Label>
              <Input
                id="retention-days"
                type="number"
                value={settings.retention_days}
                onChange={(e) => updateSettings({ retention_days: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClearOld}>오래된 이력 삭제</Button>
            <Button variant="destructive" onClick={handleClearAll}><Trash2 className="h-4 w-4 mr-1" />전체 삭제</Button>
          </div>
        </CardContent>
      </Card>

      {/* History List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>변경이력 조회</CardTitle>
            <p className="text-sm text-muted-foreground">총 {entries.length}건</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>엔티티 유형</Label>
              <Select value={filterEntityType} onValueChange={setFilterEntityType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {(Object.entries(ENTITY_TYPE_LABELS) as [ChangeHistoryEntityType, string][]).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>구분</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {(Object.entries(ACTION_LABELS) as [ChangeHistoryActionType, string][]).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>검색</Label>
              <Input
                placeholder="대상명, 변경자 검색..."
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>일시</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>대상</TableHead>
                <TableHead>구분</TableHead>
                <TableHead>변경내용</TableHead>
                <TableHead>변경자</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.slice(0, 100).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDateTime(entry.changed_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {ENTITY_TYPE_LABELS[entry.entity_type] ?? entry.entity_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{entry.entity_label}</TableCell>
                  <TableCell>
                    <Badge variant={ACTION_BADGE_VARIANT[entry.action]}>
                      {ACTION_LABELS[entry.action]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-xs">
                    {entry.changes.length === 0 ? (
                      <span className="text-muted-foreground">-</span>
                    ) : (
                      <div className="space-y-0.5">
                        {entry.changes.map((c, i) => (
                          <div key={i} className="text-xs">
                            <span className="text-muted-foreground">{c.label}: </span>
                            {c.before && (
                              <span className="line-through text-muted-foreground">{c.before}</span>
                            )}
                            {c.before && c.after && <span className="mx-1">&rarr;</span>}
                            {c.after && (
                              <span className="text-green-600">{c.after}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{entry.changed_by_name}</TableCell>
                </TableRow>
              ))}
              {filteredEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    변경이력이 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {filteredEntries.length > 100 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    최근 100건만 표시됩니다. (전체 {filteredEntries.length}건)
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
