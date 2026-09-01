'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface NotificationItem {
  key: keyof typeof initialNotifications;
  label: string;
  description: string;
}

const initialNotifications = {
  approval_alert: true,
  leave_alert: true,
  birthday_alert: true,
  attendance_alert: true,
  payroll_alert: true,
};

const NOTIFICATION_ITEMS: NotificationItem[] = [
  {
    key: 'approval_alert',
    label: '결재 알림',
    description: '결재 요청/승인/반려 시 알림',
  },
  {
    key: 'leave_alert',
    label: '휴가 알림',
    description: '휴가 승인/반려 시 알림',
  },
  {
    key: 'birthday_alert',
    label: '생일 알림',
    description: '직원 생일 알림',
  },
  {
    key: 'attendance_alert',
    label: '근태이상 알림',
    description: '지각/조퇴/결근 발생 시 알림',
  },
  {
    key: 'payroll_alert',
    label: '급여 알림',
    description: '급여 확정/지급 시 알림',
  },
];

export default function NotificationSettings() {
  const notifications = useSettingsStore((s) => s.notifications);
  const updateNotifications = useSettingsStore((s) => s.updateNotifications);

  const [form, setForm] = useState({ ...initialNotifications });

  useEffect(() => {
    setForm({ ...notifications });
  }, [notifications]);

  const handleToggle = (key: keyof typeof form, checked: boolean) => {
    setForm((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSave = () => {
    updateNotifications(form);
    toast.success('알림 설정이 저장되었습니다.');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>알림 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {NOTIFICATION_ITEMS.map((item, index) => (
            <div key={item.key}>
              {index > 0 && <Separator className="my-4" />}
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-base">{item.label}</Label>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <Switch
                  checked={form[item.key]}
                  onCheckedChange={(checked) => handleToggle(item.key, checked)}
                />
              </div>
            </div>
          ))}
          <Separator className="my-4" />
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave}>저장</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
