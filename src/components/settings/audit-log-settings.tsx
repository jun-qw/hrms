'use client';

import { useAuditLogStore } from '@/lib/stores/audit-log-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const TRACKING_ITEMS = [
  { key: 'track_page_views' as const, label: '페이지 조회', description: '사용자 페이지 이동 추적' },
  { key: 'track_creates' as const, label: '생성', description: '데이터 생성 작업 추적' },
  { key: 'track_updates' as const, label: '수정', description: '데이터 수정 작업 추적' },
  { key: 'track_deletes' as const, label: '삭제', description: '데이터 삭제 작업 추적' },
  { key: 'track_logins' as const, label: '로그인/로그아웃', description: '로그인 및 로그아웃 추적' },
];

export default function AuditLogSettings() {
  const settings = useAuditLogStore((s) => s.settings);
  const logs = useAuditLogStore((s) => s.logs);
  const updateSettings = useAuditLogStore((s) => s.updateSettings);
  const clearLogs = useAuditLogStore((s) => s.clearLogs);
  const clearOldLogs = useAuditLogStore((s) => s.clearOldLogs);

  return (
    <div className="space-y-6">
      {/* Master switch */}
      <Card>
        <CardHeader>
          <CardTitle>감사로그 활성화</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">감사로그 기록</Label>
              <p className="text-sm text-muted-foreground">
                비활성화 시 모든 사용자 활동 로깅이 중단됩니다.
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => {
                updateSettings({ enabled: checked });
                toast.success(checked ? '감사로그가 활성화되었습니다.' : '감사로그가 비활성화되었습니다.');
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tracking items */}
      <Card>
        <CardHeader>
          <CardTitle>추적 항목</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {TRACKING_ITEMS.map((item, index) => (
            <div key={item.key}>
              {index > 0 && <Separator className="my-4" />}
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-base">{item.label}</Label>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Switch
                  checked={settings[item.key]}
                  disabled={!settings.enabled}
                  onCheckedChange={(checked) => {
                    updateSettings({ [item.key]: checked });
                    toast.success('추적 설정이 변경되었습니다.');
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Retention settings */}
      <Card>
        <CardHeader>
          <CardTitle>보존 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>보존 기간 (일)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={settings.retention_days}
                onChange={(e) =>
                  updateSettings({ retention_days: parseInt(e.target.value) || 90 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>최대 건수</Label>
              <Input
                type="number"
                min={100}
                max={10000}
                step={100}
                value={settings.max_entries}
                onChange={(e) =>
                  updateSettings({ max_entries: parseInt(e.target.value) || 1000 })
                }
              />
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">현재 로그: {logs.length.toLocaleString()}건</p>
              <p className="text-xs text-muted-foreground">
                보존 기간이 지난 로그를 정리하거나 전체를 삭제할 수 있습니다.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearOldLogs();
                  toast.success('오래된 로그가 정리되었습니다.');
                }}
              >
                오래된 로그 정리
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  clearLogs();
                  toast.success('전체 로그가 삭제되었습니다.');
                }}
              >
                전체 삭제
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
