'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface SecurityForm {
  session_timeout_minutes: number;
  min_password_length: number;
  require_special_char: boolean;
  require_number: boolean;
}

interface PermissionRow {
  role: string;
  roleLabel: string;
  employee: string;
  payroll: string;
  settings: string;
  approval: string;
}

const PERMISSION_DATA: PermissionRow[] = [
  {
    role: 'admin',
    roleLabel: '시스템관리자',
    employee: 'O',
    payroll: 'O',
    settings: 'O',
    approval: 'O',
  },
  {
    role: 'hr_manager',
    roleLabel: '인사담당자',
    employee: 'O',
    payroll: 'O',
    settings: 'O',
    approval: 'O',
  },
  {
    role: 'dept_manager',
    roleLabel: '부서장',
    employee: '소속부서',
    payroll: 'X',
    settings: 'X',
    approval: '소속부서',
  },
  {
    role: 'employee',
    roleLabel: '일반직원',
    employee: '본인',
    payroll: 'X',
    settings: 'X',
    approval: '본인',
  },
];

function PermissionBadge({ value }: { value: string }) {
  if (value === 'O') {
    return (
      <Badge variant="outline" className="text-green-600 border-green-300">
        O
      </Badge>
    );
  }
  if (value === 'X') {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        X
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-yellow-600 border-yellow-300">
      {value}
    </Badge>
  );
}

export default function SecuritySettings() {
  const security = useSettingsStore((s) => s.security);
  const updateSecurity = useSettingsStore((s) => s.updateSecurity);

  const [form, setForm] = useState<SecurityForm>({
    session_timeout_minutes: 30,
    min_password_length: 8,
    require_special_char: true,
    require_number: true,
  });

  useEffect(() => {
    setForm({ ...security });
  }, [security]);

  const handleSave = () => {
    updateSecurity(form);
    toast.success('보안 설정이 저장되었습니다.');
  };

  return (
    <div className="space-y-6">
      {/* Card 1: 세션 & 비밀번호 정책 */}
      <Card>
        <CardHeader>
          <CardTitle>세션 &amp; 비밀번호 정책</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">세션 타임아웃 (분)</Label>
              <Input
                id="session-timeout"
                type="number"
                min={1}
                value={form.session_timeout_minutes}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    session_timeout_minutes: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-password-length">비밀번호 최소길이</Label>
              <Input
                id="min-password-length"
                type="number"
                min={1}
                value={form.min_password_length}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    min_password_length: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">특수문자 필수</Label>
                <p className="text-sm text-muted-foreground">
                  비밀번호에 특수문자를 반드시 포함하도록 합니다.
                </p>
              </div>
              <Switch
                checked={form.require_special_char}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, require_special_char: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">숫자 필수</Label>
                <p className="text-sm text-muted-foreground">
                  비밀번호에 숫자를 반드시 포함하도록 합니다.
                </p>
              </div>
              <Switch
                checked={form.require_number}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, require_number: checked }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave}>저장</Button>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: 역할별 권한 (읽기전용) */}
      <Card>
        <CardHeader>
          <CardTitle>역할별 권한 (읽기전용)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>역할</TableHead>
                <TableHead>직원관리</TableHead>
                <TableHead>급여관리</TableHead>
                <TableHead>인사설정</TableHead>
                <TableHead>결재관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_DATA.map((row) => (
                <TableRow key={row.role}>
                  <TableCell className="font-medium">{row.roleLabel}</TableCell>
                  <TableCell>
                    <PermissionBadge value={row.employee} />
                  </TableCell>
                  <TableCell>
                    <PermissionBadge value={row.payroll} />
                  </TableCell>
                  <TableCell>
                    <PermissionBadge value={row.settings} />
                  </TableCell>
                  <TableCell>
                    <PermissionBadge value={row.approval} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
