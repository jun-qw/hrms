'use client';

/**
 * 화면별 권한.
 *
 * 예전에는 최상위 메뉴 단위였습니다. 그러면 "급여관리는 주되 급여 기준액은
 * 막는다" 같은 흔한 요구를 담지 못합니다. 화면 하나가 행 하나입니다.
 *
 * 시스템관리자 열은 잠겨 있습니다 — 권한을 고칠 사람마저 잠기면 아무도 풀 수
 * 없습니다. 그 외 역할의 기본값은 마이페이지 하나이고(인사담당자만 전부),
 * 필요한 화면을 여기서 열어 줍니다.
 *
 * 이것은 **화면** 권한입니다. 자료 범위는 별개로, 서버가 역할에 따라 거릅니다 —
 * 일반사원에게 근태대장을 열어 줘도 그 사람에게는 본인 근태만 내려갑니다.
 */

import { useState } from 'react';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useSettingsStore } from '@/lib/stores/settings-store';
import {
  PERMISSION_SCREENS,
  defaultScreensForRole,
  type PermissionScreen,
} from '@/lib/constants/menu-items';
import type { UserRole } from '@/types';
import type { TranslationKey } from '@/lib/i18n/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useT } from '@/lib/i18n/use-translation';
import { cn } from '@/lib/utils';

const EDITABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: 'hr_manager', label: '인사담당자' },
  { value: 'dept_manager', label: '부서관리자' },
  { value: 'employee', label: '일반사원' },
];

export default function MenuPermissionSettings() {
  const menuPermissions = useSettingsStore((s) => s.menuPermissions);
  const updateMenuPermissions = useSettingsStore((s) => s.updateMenuPermissions);
  const { t } = useT();

  const [local, setLocal] = useState<Record<UserRole, string[]>>(() => ({
    admin: defaultScreensForRole('admin'),
    hr_manager: menuPermissions?.hr_manager ?? defaultScreensForRole('hr_manager'),
    dept_manager: menuPermissions?.dept_manager ?? defaultScreensForRole('dept_manager'),
    employee: menuPermissions?.employee ?? defaultScreensForRole('employee'),
  }));
  const [dirty, setDirty] = useState(false);

  const has = (role: UserRole, href: string) => (local[role] ?? []).includes(href);

  const toggle = (role: UserRole, href: string) => {
    setLocal((prev) => {
      const current = prev[role] ?? [];
      const next = current.includes(href)
        ? current.filter((h) => h !== href)
        : [...current, href];
      return { ...prev, [role]: next };
    });
    setDirty(true);
  };

  const resetDefaults = () => {
    setLocal({
      admin: defaultScreensForRole('admin'),
      hr_manager: defaultScreensForRole('hr_manager'),
      dept_manager: defaultScreensForRole('dept_manager'),
      employee: defaultScreensForRole('employee'),
    });
    setDirty(true);
  };

  const save = () => {
    for (const role of EDITABLE_ROLES) {
      // 마이페이지는 항상 남깁니다. 전부 꺼진 역할은 로그인해도 갈 곳이
      // 없어, 시스템이 고장난 것처럼 보입니다.
      const next = has(role.value, '/my')
        ? local[role.value]
        : [...local[role.value], '/my'];
      updateMenuPermissions(role.value, next);
    }
    setDirty(false);
    toast.success('화면 권한을 저장했습니다. 대상 역할은 새로고침 후 적용됩니다.');
  };

  const label = (s: PermissionScreen) =>
    s.label.includes('.') ? t(s.label as TranslationKey) : s.label;

  // 그룹별로 묶어 표시
  const groups = PERMISSION_SCREENS.reduce<Map<string, PermissionScreen[]>>((map, s) => {
    map.set(s.group, [...(map.get(s.group) ?? []), s]);
    return map;
  }, new Map());

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-[60ch] text-xs text-muted-foreground">
          역할이 볼 수 있는 <strong>화면</strong>을 정합니다. 기본값은 마이페이지
          하나입니다(인사담당자는 전부). 화면을 열어 줘도 자료는 서버가 역할에 맞게
          거릅니다 — 일반사원에게 근태대장을 열어 주면 <strong>본인 근태만</strong> 보입니다.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={resetDefaults}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            기본값
          </Button>
          <Button size="sm" onClick={save} disabled={!dirty}>
            저장
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                화면
              </th>
              <th className="w-28 px-2 py-2.5 text-center text-xs font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  시스템관리자
                </span>
              </th>
              {EDITABLE_ROLES.map((r) => (
                <th key={r.value} className="w-28 px-2 py-2.5 text-center text-xs font-medium text-muted-foreground">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...groups.entries()].map(([group, screens]) => (
              <GroupRows
                key={group}
                title={t(group as TranslationKey)}
                screens={screens}
                label={label}
                has={has}
                toggle={toggle}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">
        시스템관리자는 항상 모든 화면을 봅니다 — 권한을 고칠 사람마저 잠기면 아무도 풀 수
        없습니다. 마이페이지는 모든 역할에서 꺼지지 않습니다.
      </p>
    </div>
  );
}

function GroupRows({
  title,
  screens,
  label,
  has,
  toggle,
}: {
  title: string;
  screens: PermissionScreen[];
  label: (s: PermissionScreen) => string;
  has: (role: UserRole, href: string) => boolean;
  toggle: (role: UserRole, href: string) => void;
}) {
  return (
    <>
      <tr className="border-b bg-muted/20">
        <td colSpan={5} className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </td>
      </tr>
      {screens.map((s) => {
        const isMyPage = s.href === '/my';
        return (
          <tr key={s.href} className="border-b last:border-0 hover:bg-muted/20">
            <td className="px-4 py-2">
              <span>{label(s)}</span>
              <span className="ml-2 font-mono text-[11px] text-muted-foreground/60">{s.href}</span>
            </td>
            {/* 시스템관리자 — 항상 켜짐, 잠금 */}
            <td className="px-2 py-2 text-center">
              <Checkbox checked disabled aria-label="시스템관리자는 항상 허용" />
            </td>
            {EDITABLE_ROLES.map((r) => (
              <td key={r.value} className="px-2 py-2 text-center">
                <Checkbox
                  checked={has(r.value, s.href)}
                  disabled={isMyPage}
                  onCheckedChange={() => toggle(r.value, s.href)}
                  className={cn(isMyPage && 'opacity-60')}
                  aria-label={`${r.label} · ${label(s)}`}
                />
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}
