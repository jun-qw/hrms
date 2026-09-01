'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from 'sonner';

export default function PayrollSettings() {
  const payroll = useSettingsStore((s) => s.payroll);
  const updatePayroll = useSettingsStore((s) => s.updatePayroll);

  const [form, setForm] = useState({
    pay_day: 25,
    national_pension_rate: 4.5,
    health_insurance_rate: 3.545,
    long_term_care_rate: 12.95,
    employment_insurance_rate: 0.9,
    meal_allowance_limit: 200000,
    transport_allowance_limit: 200000,
  });

  useEffect(() => {
    setForm({ ...payroll });
  }, [payroll]);

  const handleSave = () => {
    updatePayroll(form);
    toast.success('급여 설정이 저장되었습니다.');
  };

  const formatWon = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  return (
    <div className="space-y-6">
      {/* Card 1: 급여일 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>급여일 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="pay-day">급여 지급일</Label>
            <Select
              value={String(form.pay_day)}
              onValueChange={(v) =>
                setForm((prev) => ({ ...prev, pay_day: Number(v) }))
              }
            >
              <SelectTrigger id="pay-day" className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    매월 {day}일
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: 4대보험 요율 */}
      <Card>
        <CardHeader>
          <CardTitle>4대보험 요율</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pension-rate">국민연금 요율 (%)</Label>
              <Input
                id="pension-rate"
                type="number"
                step={0.01}
                value={form.national_pension_rate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    national_pension_rate: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="health-rate">건강보험 요율 (%)</Label>
              <Input
                id="health-rate"
                type="number"
                step={0.001}
                value={form.health_insurance_rate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    health_insurance_rate: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longterm-rate">장기요양보험 요율 (%)</Label>
              <Input
                id="longterm-rate"
                type="number"
                step={0.01}
                value={form.long_term_care_rate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    long_term_care_rate: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employment-rate">고용보험 요율 (%)</Label>
              <Input
                id="employment-rate"
                type="number"
                step={0.01}
                value={form.employment_insurance_rate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    employment_insurance_rate: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: 비과세 한도 */}
      <Card>
        <CardHeader>
          <CardTitle>비과세 한도</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meal-allowance">식대 한도 (원)</Label>
              <div className="relative">
                <Input
                  id="meal-allowance"
                  type="number"
                  value={form.meal_allowance_limit}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      meal_allowance_limit: Number(e.target.value),
                    }))
                  }
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {formatWon(form.meal_allowance_limit / 10000)}만원
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transport-allowance">교통비 한도 (원)</Label>
              <div className="relative">
                <Input
                  id="transport-allowance"
                  type="number"
                  value={form.transport_allowance_limit}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      transport_allowance_limit: Number(e.target.value),
                    }))
                  }
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {formatWon(form.transport_allowance_limit / 10000)}만원
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave}>저장</Button>
      </div>
    </div>
  );
}
