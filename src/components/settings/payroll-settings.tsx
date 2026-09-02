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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>급여일 설정</CardTitle>
          <p className="text-xs text-muted-foreground">
            4대보험 요율·비과세 한도·주휴수당 방식은 <strong>급여 기준값</strong> 탭으로
            옮겼습니다. 여기에 두면 화면의 숫자와 계산에 쓰이는 숫자가 갈라집니다.
          </p>
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


      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave}>저장</Button>
      </div>
    </div>
  );
}
