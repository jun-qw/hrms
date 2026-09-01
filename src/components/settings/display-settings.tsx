'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore, type DisplayState } from '@/lib/stores/settings-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const defaultDisplay: DisplayState = {
  font_size: 'medium',
  content_density: 'comfortable',
  sidebar_compact: false,
  rows_per_page: 10,
  date_format: 'yyyy-MM-dd',
  number_format: 'comma',
  locale: 'ko',
};

export default function DisplaySettings() {
  const display = useSettingsStore((s) => s.display);
  const updateDisplay = useSettingsStore((s) => s.updateDisplay);

  const [form, setForm] = useState<DisplayState>({ ...defaultDisplay });

  useEffect(() => {
    setForm({ ...display });
  }, [display]);

  const handleSave = () => {
    updateDisplay(form);
    toast.success('화면 설정이 저장되었습니다.');
  };

  return (
    <div className="space-y-6">
      {/* Display */}
      <Card>
        <CardHeader>
          <CardTitle>화면 표시</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Font Size */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">글꼴 크기</Label>
              <p className="text-sm text-muted-foreground">전체 UI의 기본 글꼴 크기를 설정합니다</p>
            </div>
            <Select
              value={form.font_size}
              onValueChange={(v) => setForm((prev) => ({ ...prev, font_size: v as DisplayState['font_size'] }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">작게 (14px)</SelectItem>
                <SelectItem value="medium">보통 (16px)</SelectItem>
                <SelectItem value="large">크게 (18px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Content Density */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">콘텐츠 밀도</Label>
              <p className="text-sm text-muted-foreground">UI 요소 간의 간격을 조절합니다</p>
            </div>
            <Select
              value={form.content_density}
              onValueChange={(v) => setForm((prev) => ({ ...prev, content_density: v as DisplayState['content_density'] }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">좁게</SelectItem>
                <SelectItem value="comfortable">보통</SelectItem>
                <SelectItem value="spacious">넓게</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Layout & Format */}
      <Card>
        <CardHeader>
          <CardTitle>레이아웃 및 형식</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {/* Sidebar Compact */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-base">사이드바 축소 모드</Label>
              <p className="text-sm text-muted-foreground">사이드바를 아이콘만 표시하도록 축소합니다</p>
            </div>
            <Switch
              checked={form.sidebar_compact}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, sidebar_compact: checked }))}
            />
          </div>

          <Separator className="my-4" />

          {/* Rows Per Page */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-base">테이블 기본 행 수</Label>
              <p className="text-sm text-muted-foreground">목록 테이블에서 한 페이지에 표시할 행 수</p>
            </div>
            <Input
              type="number"
              min={5}
              max={100}
              value={form.rows_per_page}
              onChange={(e) => setForm((prev) => ({ ...prev, rows_per_page: Number(e.target.value) || 10 }))}
              className="w-[100px]"
            />
          </div>

          <Separator className="my-4" />

          {/* Date Format */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-base">날짜 형식</Label>
              <p className="text-sm text-muted-foreground">날짜 표시 형식을 선택합니다</p>
            </div>
            <Select
              value={form.date_format}
              onValueChange={(v) => setForm((prev) => ({ ...prev, date_format: v as DisplayState['date_format'] }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yyyy-MM-dd">2026-03-01</SelectItem>
                <SelectItem value="yyyy.MM.dd">2026.03.01</SelectItem>
                <SelectItem value="yyyy년 MM월 dd일">2026년 03월 01일</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-4" />

          {/* Number Format */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-base">숫자 형식</Label>
              <p className="text-sm text-muted-foreground">숫자 표시 시 천단위 구분 여부</p>
            </div>
            <Select
              value={form.number_format}
              onValueChange={(v) => setForm((prev) => ({ ...prev, number_format: v as DisplayState['number_format'] }))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comma">1,000,000</SelectItem>
                <SelectItem value="plain">1000000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-4" />

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave}>저장</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
