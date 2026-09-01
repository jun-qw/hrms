'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore, type PrintTemplateState } from '@/lib/stores/settings-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const defaultPrintTemplate: PrintTemplateState = {
  header_title: '급여명세서',
  company_name_visible: true,
  company_logo_text: '',
  show_department: true,
  show_position: true,
  show_dependents: true,
  show_formula: true,
  show_tax_badge: true,
  header_note: '',
  footer_note: '본 명세서는 급여 지급 내역을 안내하기 위한 문서입니다.',
  page_size: 'A4',
  orientation: 'portrait',
  margin: 'normal',
};

// Dummy data for preview
const PREVIEW_DATA = {
  year: 2026,
  month: 3,
  name: '허승현',
  department: '개발팀',
  position: '선임',
  dependents: 2,
  earnings: [
    { name: '기본급', amount: 3500000, formula: '월 기본급', is_taxable: true },
    { name: '식대', amount: 200000, formula: '비과세 한도 내', is_taxable: false },
    { name: '교통비', amount: 200000, formula: '비과세 한도 내', is_taxable: false },
  ],
  deductions: [
    { name: '국민연금', amount: 157500, formula: '기본급 × 4.5%' },
    { name: '건강보험', amount: 124075, formula: '기본급 × 3.545%' },
    { name: '고용보험', amount: 31500, formula: '기본급 × 0.9%' },
    { name: '소득세', amount: 85000, formula: '간이세액표 적용' },
  ],
  total_earnings: 3900000,
  total_deductions: 398075,
  net_pay: 3501925,
};

const fmtWon = (n: number) => new Intl.NumberFormat('ko-KR').format(n) + '원';

export default function PrintTemplateSettings() {
  const printTemplate = useSettingsStore((s) => s.printTemplate);
  const companyName = useSettingsStore((s) => s.company.name);
  const updatePrintTemplate = useSettingsStore((s) => s.updatePrintTemplate);

  const [form, setForm] = useState<PrintTemplateState>({ ...defaultPrintTemplate });

  useEffect(() => {
    setForm({ ...printTemplate });
  }, [printTemplate]);

  const handleSave = () => {
    updatePrintTemplate(form);
    toast.success('출력 설정이 저장되었습니다.');
  };

  const update = (data: Partial<PrintTemplateState>) => {
    setForm((prev) => ({ ...prev, ...data }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Settings Form */}
      <div className="space-y-6">
        {/* Header Settings */}
        <Card>
          <CardHeader>
            <CardTitle>헤더 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>명세서 제목</Label>
              <Input
                value={form.header_title}
                onChange={(e) => update({ header_title: e.target.value })}
                placeholder="급여명세서"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>회사명 표시</Label>
                <p className="text-sm text-muted-foreground">명세서 상단에 회사명을 표시합니다</p>
              </div>
              <Switch
                checked={form.company_name_visible}
                onCheckedChange={(checked) => update({ company_name_visible: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label>로고 대체 텍스트</Label>
              <Input
                value={form.company_logo_text}
                onChange={(e) => update({ company_logo_text: e.target.value })}
                placeholder="로고 대신 표시할 텍스트 (비워두면 회사명 사용)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Display Fields */}
        <Card>
          <CardHeader>
            <CardTitle>표시 항목</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {[
              { key: 'show_department' as const, label: '부서', desc: '직원의 부서명을 표시합니다' },
              { key: 'show_position' as const, label: '직급', desc: '직원의 직급을 표시합니다' },
              { key: 'show_dependents' as const, label: '부양가족 수', desc: '부양가족 수를 표시합니다' },
              { key: 'show_formula' as const, label: '계산식', desc: '각 항목의 계산식을 표시합니다' },
              { key: 'show_tax_badge' as const, label: '비과세 뱃지', desc: '비과세 항목에 뱃지를 표시합니다' },
            ].map((item, index) => (
              <div key={item.key}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="text-base">{item.label}</Label>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={form[item.key]}
                    onCheckedChange={(checked) => update({ [item.key]: checked })}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Header/Footer Notes */}
        <Card>
          <CardHeader>
            <CardTitle>머리글 / 바닥글</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>상단 비고</Label>
              <Textarea
                value={form.header_note}
                onChange={(e) => update({ header_note: e.target.value })}
                placeholder="명세서 상단에 표시할 안내 문구"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>하단 비고</Label>
              <Textarea
                value={form.footer_note}
                onChange={(e) => update({ footer_note: e.target.value })}
                placeholder="명세서 하단에 표시할 안내 문구"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Page Settings */}
        <Card>
          <CardHeader>
            <CardTitle>용지 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>용지 크기</Label>
              <Select value={form.page_size} onValueChange={(v) => update({ page_size: v as PrintTemplateState['page_size'] })}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="Letter">Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>방향</Label>
              <Select value={form.orientation} onValueChange={(v) => update({ orientation: v as PrintTemplateState['orientation'] })}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">세로</SelectItem>
                  <SelectItem value="landscape">가로</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>여백</Label>
              <Select value={form.margin} onValueChange={(v) => update({ margin: v as PrintTemplateState['margin'] })}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">좁게</SelectItem>
                  <SelectItem value="normal">보통</SelectItem>
                  <SelectItem value="wide">넓게</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave}>저장</Button>
        </div>
      </div>

      {/* Right: Live Preview */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">미리보기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 bg-white text-black text-xs space-y-4 min-h-[500px]">
              {/* Header */}
              <div className="text-center space-y-1">
                {form.company_name_visible && (
                  <p className="text-sm font-semibold text-gray-700">
                    {form.company_logo_text || companyName}
                  </p>
                )}
                <h2 className="text-lg font-bold">{form.header_title || '급여명세서'}</h2>
                <p className="text-gray-500">{PREVIEW_DATA.year}년 {PREVIEW_DATA.month}월</p>
              </div>

              {/* Header Note */}
              {form.header_note && (
                <p className="text-center text-gray-500 text-[10px] border-b pb-2">
                  {form.header_note}
                </p>
              )}

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-500">성명:</span>{' '}
                  <strong>{PREVIEW_DATA.name}</strong>
                </div>
                {form.show_department && (
                  <div>
                    <span className="text-gray-500">부서:</span>{' '}
                    <strong>{PREVIEW_DATA.department}</strong>
                  </div>
                )}
                {form.show_position && (
                  <div>
                    <span className="text-gray-500">직급:</span>{' '}
                    <strong>{PREVIEW_DATA.position}</strong>
                  </div>
                )}
                {form.show_dependents && (
                  <div>
                    <span className="text-gray-500">부양가족:</span>{' '}
                    <strong>{PREVIEW_DATA.dependents}인</strong>
                  </div>
                )}
              </div>

              <hr className="border-gray-200" />

              {/* Earnings & Deductions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2 text-[11px]">지급 항목</h3>
                  <div className="space-y-1.5">
                    {PREVIEW_DATA.earnings.map((item) => (
                      <div key={item.name}>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">
                            {item.name}
                            {form.show_tax_badge && !item.is_taxable && (
                              <Badge variant="outline" className="text-[8px] h-3 px-1 leading-none">비과세</Badge>
                            )}
                          </span>
                          <span className="font-mono">{fmtWon(item.amount)}</span>
                        </div>
                        {form.show_formula && (
                          <p className="text-[9px] text-gray-400">{item.formula}</p>
                        )}
                      </div>
                    ))}
                    <hr className="border-gray-200" />
                    <div className="flex justify-between font-semibold">
                      <span>지급합계</span>
                      <span className="font-mono">{fmtWon(PREVIEW_DATA.total_earnings)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-[11px]">공제 항목</h3>
                  <div className="space-y-1.5">
                    {PREVIEW_DATA.deductions.map((item) => (
                      <div key={item.name}>
                        <div className="flex justify-between">
                          <span>{item.name}</span>
                          <span className="font-mono text-red-600">{fmtWon(item.amount)}</span>
                        </div>
                        {form.show_formula && (
                          <p className="text-[9px] text-gray-400">{item.formula}</p>
                        )}
                      </div>
                    ))}
                    <hr className="border-gray-200" />
                    <div className="flex justify-between font-semibold">
                      <span>공제합계</span>
                      <span className="font-mono text-red-600">{fmtWon(PREVIEW_DATA.total_deductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Net Pay */}
              <div className="text-center py-2">
                <p className="text-gray-500 text-[10px]">실수령액</p>
                <p className="text-xl font-bold">{fmtWon(PREVIEW_DATA.net_pay)}</p>
              </div>

              {/* Footer Note */}
              {form.footer_note && (
                <p className="text-center text-gray-400 text-[9px] border-t pt-2">
                  {form.footer_note}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
