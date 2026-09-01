'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/lib/stores/settings-store';
import type { Workplace, WorkplaceType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Building2, Globe, Clock } from 'lucide-react';
import { toast } from 'sonner';

const WORKPLACE_TYPE_LABELS: Record<WorkplaceType, string> = {
  headquarters: '본사',
  branch: '지사/사무소',
  factory: '공장',
  overseas_corp: '현지법인',
  project_site: '현장사무소',
};

const WORKPLACE_TYPE_VARIANTS: Record<WorkplaceType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  headquarters: 'default',
  branch: 'secondary',
  factory: 'outline',
  overseas_corp: 'default',
  project_site: 'outline',
};

const COUNTRY_OPTIONS = [
  { code: 'KR', name: '대한민국', timezone: 'Asia/Seoul', currency: 'KRW' },
  { code: 'CN', name: '중국', timezone: 'Asia/Shanghai', currency: 'CNY' },
  { code: 'JP', name: '일본', timezone: 'Asia/Tokyo', currency: 'JPY' },
  { code: 'VN', name: '베트남', timezone: 'Asia/Ho_Chi_Minh', currency: 'VND' },
  { code: 'US', name: '미국', timezone: 'America/New_York', currency: 'USD' },
  { code: 'SG', name: '싱가포르', timezone: 'Asia/Singapore', currency: 'SGD' },
  { code: 'AE', name: 'UAE', timezone: 'Asia/Dubai', currency: 'AED' },
  { code: 'IN', name: '인도', timezone: 'Asia/Kolkata', currency: 'INR' },
];

const emptyForm: Omit<Workplace, 'id' | 'sort_order' | 'created_at' | 'updated_at'> = {
  code: '', name: '', business_number: '', representative: '', address: '',
  tax_office: '', industry_type: '', business_type: '',
  is_headquarters: false, is_active: true,
  workplace_type: 'branch',
  country_code: 'KR', timezone: 'Asia/Seoul', currency: 'KRW',
  use_custom_work_hours: false,
  start_time: '07:00', end_time: '16:00',
  break_minutes: 60, weekly_hours: 40, late_grace_minutes: 5,
};

export default function WorkplaceSettings() {
  const workplaces = useSettingsStore((s) => s.workplaces);
  const addWorkplace = useSettingsStore((s) => s.addWorkplace);
  const updateWorkplace = useSettingsStore((s) => s.updateWorkplace);
  const deleteWorkplace = useSettingsStore((s) => s.deleteWorkplace);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Workplace | null>(null);
  const [form, setForm] = useState(emptyForm);

  const handleAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (wp: Workplace) => {
    setEditing(wp);
    setForm({
      code: wp.code, name: wp.name, business_number: wp.business_number,
      representative: wp.representative, address: wp.address, tax_office: wp.tax_office,
      industry_type: wp.industry_type, business_type: wp.business_type,
      is_headquarters: wp.is_headquarters, is_active: wp.is_active,
      workplace_type: wp.workplace_type ?? 'branch',
      country_code: wp.country_code ?? 'KR',
      timezone: wp.timezone ?? 'Asia/Seoul',
      currency: wp.currency ?? 'KRW',
      use_custom_work_hours: wp.use_custom_work_hours ?? false,
      start_time: wp.start_time ?? '07:00',
      end_time: wp.end_time ?? '16:00',
      break_minutes: wp.break_minutes ?? 60,
      weekly_hours: wp.weekly_hours ?? 40,
      late_grace_minutes: wp.late_grace_minutes ?? 5,
    });
    setDialogOpen(true);
  };

  const handleDelete = (wp: Workplace) => {
    if (wp.is_headquarters) { toast.error('본사 사업장은 삭제할 수 없습니다.'); return; }
    if (window.confirm(`"${wp.name}" 사업장을 삭제하시겠습니까?`)) {
      deleteWorkplace(wp.id);
      toast.success('사업장이 삭제되었습니다.');
    }
  };

  const handleCountryChange = (code: string) => {
    const c = COUNTRY_OPTIONS.find((x) => x.code === code);
    if (c) {
      setForm((p) => ({ ...p, country_code: c.code, timezone: c.timezone, currency: c.currency }));
    }
  };

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim()) { toast.error('코드와 명칭을 입력해주세요.'); return; }
    if (!form.business_number.trim()) { toast.error('사업자등록번호를 입력해주세요.'); return; }
    const now = new Date().toISOString();
    if (editing) {
      updateWorkplace(editing.id, { ...form });
      toast.success('사업장이 수정되었습니다.');
    } else {
      addWorkplace({
        id: `wp-${crypto.randomUUID().slice(0, 8)}`,
        ...form,
        sort_order: workplaces.length + 1,
        created_at: now, updated_at: now,
      });
      toast.success('사업장이 추가되었습니다.');
    }
    setDialogOpen(false);
  };

  const sorted = [...workplaces].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>법인 / 사업장 관리</CardTitle>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />사업장 추가
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            법인별 급여사업장과 근무지를 코드 기반으로 등록합니다. <strong>사업장 유형(본사/지사/공장/현지법인/현장사무소)</strong>과 <strong>사업장별 근로조건(출퇴근시간 등)</strong>을 별도 설정할 수 있습니다.
          </p>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>코드</TableHead>
                  <TableHead>사업장명</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>국가</TableHead>
                  <TableHead>근로조건</TableHead>
                  <TableHead>사업자번호</TableHead>
                  <TableHead>대표자</TableHead>
                  <TableHead>관할세무서</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">등록된 사업장이 없습니다.</TableCell>
                  </TableRow>
                ) : sorted.map((wp) => (
                  <TableRow key={wp.id} className={!wp.is_active ? 'opacity-50' : ''}>
                    <TableCell className="font-mono text-sm font-bold">{wp.code}</TableCell>
                    <TableCell className="font-medium">
                      {wp.name}
                      {wp.is_headquarters && <Badge variant="default" className="ml-1 text-[10px]">본사</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={WORKPLACE_TYPE_VARIANTS[wp.workplace_type ?? 'branch']} className="text-xs">
                        {WORKPLACE_TYPE_LABELS[wp.workplace_type ?? 'branch']}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <p className="font-mono">{wp.country_code ?? 'KR'}</p>
                      <p className="text-muted-foreground">{wp.currency ?? 'KRW'}</p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {wp.use_custom_work_hours ? (
                        <div>
                          <p className="font-mono">{wp.start_time}~{wp.end_time}</p>
                          <p className="text-muted-foreground">주 {wp.weekly_hours}h</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">기본 적용</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-mono">{wp.business_number}</TableCell>
                    <TableCell className="text-sm">{wp.representative}</TableCell>
                    <TableCell className="text-sm">{wp.tax_office}</TableCell>
                    <TableCell>
                      <Badge variant={wp.is_active ? 'default' : 'secondary'} className="text-xs">
                        {wp.is_active ? '활성' : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(wp)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {!wp.is_headquarters && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(wp)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? '사업장 수정' : '사업장 추가'}</DialogTitle>
            <DialogDescription>법인/사업장 정보 + 근로조건을 입력합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 기본 정보 */}
            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />기본 정보
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>사업장 코드 *</Label>
                  <Input value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    placeholder="예: HQ, FAC2, CN-SH" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>사업장명 *</Label>
                  <Input value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="예: 본사 (미음산단), 상하이 현지법인" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>사업장 유형 *</Label>
                  <Select value={form.workplace_type}
                    onValueChange={(v) => setForm((p) => ({ ...p, workplace_type: v as WorkplaceType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="headquarters">본사</SelectItem>
                      <SelectItem value="branch">지사/사무소</SelectItem>
                      <SelectItem value="factory">공장</SelectItem>
                      <SelectItem value="overseas_corp">현지법인</SelectItem>
                      <SelectItem value="project_site">현장사무소</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>대표자</Label>
                  <Input value={form.representative}
                    onChange={(e) => setForm((p) => ({ ...p, representative: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>사업자등록번호 *</Label>
                  <Input value={form.business_number}
                    onChange={(e) => setForm((p) => ({ ...p, business_number: e.target.value }))}
                    placeholder="000-00-00000" />
                </div>
                <div className="space-y-2">
                  <Label>관할세무서</Label>
                  <Input value={form.tax_office}
                    onChange={(e) => setForm((p) => ({ ...p, tax_office: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>소재지</Label>
                <Input value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>업태</Label>
                  <Input value={form.industry_type}
                    onChange={(e) => setForm((p) => ({ ...p, industry_type: e.target.value }))}
                    placeholder="예: 제조업" />
                </div>
                <div className="space-y-2">
                  <Label>종목</Label>
                  <Input value={form.business_type}
                    onChange={(e) => setForm((p) => ({ ...p, business_type: e.target.value }))} />
                </div>
              </div>
            </div>

            <Separator />

            {/* 국가/통화 */}
            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4" />국가 / 통화
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>국가</Label>
                  <Select value={form.country_code} onValueChange={handleCountryChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>시간대</Label>
                  <Input value={form.timezone}
                    onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>통화</Label>
                  <Input value={form.currency}
                    onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} />
                </div>
              </div>
            </div>

            <Separator />

            {/* 사업장별 근로조건 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />사업장별 근로조건
                </p>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">사용</Label>
                  <Switch checked={form.use_custom_work_hours}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, use_custom_work_hours: v }))} />
                </div>
              </div>
              {form.use_custom_work_hours ? (
                <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>출근시간</Label>
                    <Input type="time" value={form.start_time}
                      onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>퇴근시간</Label>
                    <Input type="time" value={form.end_time}
                      onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>휴게시간 (분)</Label>
                    <Input type="number" value={form.break_minutes}
                      onChange={(e) => setForm((p) => ({ ...p, break_minutes: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>주당 근로시간</Label>
                    <Input type="number" value={form.weekly_hours}
                      onChange={(e) => setForm((p) => ({ ...p, weekly_hours: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>지각 유예시간 (분)</Label>
                    <Input type="number" value={form.late_grace_minutes}
                      onChange={(e) => setForm((p) => ({ ...p, late_grace_minutes: Number(e.target.value) }))}
                      className="w-[140px]" />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/30">
                  본사 기본 근로조건이 적용됩니다 (시스템 설정 &gt; 근무시간).
                </p>
              )}
            </div>

            <Separator />

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_headquarters}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, is_headquarters: v }))} />
                <Label>본사 (대표 사업장)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
                <Label>활성</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
