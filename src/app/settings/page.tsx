'use client';

/**
 * 시스템 설정.
 *
 * 19개 탭이 한 줄에 다 안 들어가 두세 줄로 감겨 있었습니다. 이름만 보고
 * 어느 것이 무엇인지 알기 어렵고, 찾으려면 스무 개를 눈으로 훑어야 했습니다.
 *
 * 6그룹으로 접고 왼쪽에 세웠습니다. 그룹을 고르면 그 안의 항목만 보이므로
 * 한 번에 다섯 개 이하만 읽으면 됩니다. 항목마다 한 줄 설명을 붙인 것은,
 * 인사 시스템을 처음 만지는 담당자에게는 "근무설정"과 "근태유형설정"이
 * 어떻게 다른지가 이름만으로 드러나지 않기 때문입니다.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Network, Clock, Banknote, ShieldCheck, Cog, Upload } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import CompanyInfoSettings from '@/components/settings/company-info-settings';
import { BrandingSettings } from '@/components/settings/branding-settings';
import WorkScheduleSettings from '@/components/settings/work-schedule-settings';
import LeavePolicySettings from '@/components/settings/leave-policy-settings';
import PayrollSettings from '@/components/settings/payroll-settings';
import PayrollRateSettings from '@/components/settings/payroll-rate-settings';
import ApprovalSettings from '@/components/settings/approval-settings';
import NotificationSettings from '@/components/settings/notification-settings';
import SecuritySettings from '@/components/settings/security-settings';
import HolidaySettings from '@/components/settings/holiday-settings';
import DisplaySettings from '@/components/settings/display-settings';
import PrintTemplateSettings from '@/components/settings/print-template-settings';
import WorkflowTemplateSettings from '@/components/settings/workflow-template-settings';
import AttendanceTypeSettings from '@/components/settings/attendance-type-settings';
import CodeManagementSettings from '@/components/settings/code-management-settings';
import AuditLogSettings from '@/components/settings/audit-log-settings';
import ChangeHistorySettings from '@/components/settings/change-history-settings';
import WorkplaceSettings from '@/components/settings/workplace-settings';
import MenuPermissionSettings from '@/components/settings/menu-permission-settings';

interface SettingItem {
  id: string;
  name: string;
  hint: string;
  render: () => React.ReactElement;
}

interface SettingGroup {
  id: string;
  name: string;
  icon: typeof Building2;
  items: SettingItem[];
}

const GROUPS: SettingGroup[] = [
  {
    id: 'company',
    name: '회사',
    icon: Building2,
    items: [
      { id: 'company-info', name: '회사정보', hint: '증명서·급여명세서에 인쇄되는 상호·사업자번호·주소', render: () => <CompanyInfoSettings /> },
      { id: 'workplace', name: '사업장', hint: '사업장이 여러 곳이면 등록합니다. 출퇴근 시간을 따로 둘 수 있습니다', render: () => <WorkplaceSettings /> },
      { id: 'holiday', name: '공휴일', hint: '유급휴일입니다. 주휴수당 판정과 휴일근로 가산에 그대로 쓰입니다', render: () => <HolidaySettings /> },
      { id: 'branding', name: '브랜딩', hint: '로고, 시스템 이름, 브랜드 색상', render: () => <BrandingSettings /> },
    ],
  },
  {
    id: 'organization',
    name: '조직',
    icon: Network,
    items: [
      { id: 'codes', name: '코드관리', hint: '부서·직급·직책·고용형태 등 선택 목록의 값', render: () => <CodeManagementSettings /> },
      { id: 'workflow', name: '프로세스', hint: '입사·퇴사 절차의 단계와 담당자', render: () => <WorkflowTemplateSettings /> },
    ],
  },
  {
    id: 'work',
    name: '근무',
    icon: Clock,
    items: [
      { id: 'work-schedule', name: '근무설정', hint: '출퇴근 시간, 주당 근로시간, 가산율, 지각 유예', render: () => <WorkScheduleSettings /> },
      { id: 'attendance-type', name: '근태유형', hint: '근태대장에 적는 코드와 각 코드의 인정 시간', render: () => <AttendanceTypeSettings /> },
      { id: 'leave', name: '휴가설정', hint: '연차 부여 기준(입사일·회계연도), 반차 허용, 이월 정책', render: () => <LeavePolicySettings /> },
    ],
  },
  {
    id: 'payroll',
    name: '급여',
    icon: Banknote,
    items: [
      { id: 'payroll-rates', name: '급여 기준값', hint: '4대보험 요율·비과세 한도·최저임금·주휴수당 방식. 연도별로 관리합니다', render: () => <PayrollRateSettings /> },
      { id: 'payroll', name: '급여일', hint: '급여 지급일', render: () => <PayrollSettings /> },
      { id: 'print', name: '출력 서식', hint: '급여명세서·증명서 인쇄 서식', render: () => <PrintTemplateSettings /> },
    ],
  },
  {
    id: 'permission',
    name: '권한',
    icon: ShieldCheck,
    items: [
      { id: 'menu-permission', name: '메뉴권한', hint: '역할별로 어떤 메뉴를 보이게 할지', render: () => <MenuPermissionSettings /> },
      { id: 'approval', name: '결재설정', hint: '결재선과 문서 종류별 결재 단계', render: () => <ApprovalSettings /> },
      { id: 'security', name: '보안설정', hint: '비밀번호 규칙, 접속 제한, 세션 시간', render: () => <SecuritySettings /> },
    ],
  },
  {
    id: 'system',
    name: '시스템',
    icon: Cog,
    items: [
      { id: 'display', name: '화면설정', hint: '글자 크기, 목록 밀도 같은 표시 방식', render: () => <DisplaySettings /> },
      { id: 'notification', name: '알림설정', hint: '어떤 일이 생겼을 때 누구에게 알릴지', render: () => <NotificationSettings /> },
      { id: 'audit-log', name: '감사로그', hint: '무엇을 기록으로 남길지', render: () => <AuditLogSettings /> },
      { id: 'change-history', name: '변경이력', hint: '설정이 언제 누구에 의해 바뀌었는지', render: () => <ChangeHistorySettings /> },
    ],
  },
];

const ALL_ITEMS = GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, groupId: g.id })));

export default function SettingsPage() {
  const router = useRouter();
  const params = useSearchParams();

  // 링크로 바로 열 수 있어야 합니다 — 매뉴얼과 다른 화면에서 특정 설정을
  // 가리키는데, 매번 "설정에 들어가 급여 탭을 누르고" 라고 쓸 수는 없습니다.
  const requested = params.get('tab');
  const initial = ALL_ITEMS.find((i) => i.id === requested) ?? ALL_ITEMS[0];
  const [groupId, setGroupId] = useState(initial.groupId);
  const [itemId, setItemId] = useState(initial.id);

  useEffect(() => {
    const found = ALL_ITEMS.find((i) => i.id === requested);
    if (found) { setGroupId(found.groupId); setItemId(found.id); }
  }, [requested]);

  const group = GROUPS.find((g) => g.id === groupId) ?? GROUPS[0];
  const item = group.items.find((i) => i.id === itemId) ?? group.items[0];

  const open = (nextGroup: string, nextItem: string) => {
    setGroupId(nextGroup);
    setItemId(nextItem);
    router.replace(`/settings?tab=${nextItem}`, { scroll: false });
  };

  return (
    <div>
      <Breadcrumb />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">시스템 설정</h1>
        <Link href="/settings/data-import">
          <Button variant="outline" size="sm">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            데이터 가져오기
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* 그룹 — 여섯 개라 한눈에 들어옵니다 */}
        <nav className="shrink-0 lg:w-44">
          <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {GROUPS.map((g) => {
              const on = g.id === group.id;
              return (
                <button
                  key={g.id}
                  onClick={() => open(g.id, g.items[0].id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] transition-colors',
                    on
                      ? 'bg-muted font-semibold text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <g.icon className={cn('h-4 w-4', on ? 'text-primary' : 'text-muted-foreground')} />
                  {g.name}
                  <span className="ml-auto hidden text-[11px] text-muted-foreground/60 lg:inline">
                    {g.items.length}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          {/* 그룹 안의 항목 — 많아야 넷입니다 */}
          <div className="flex flex-wrap gap-1 border-b pb-3">
            {group.items.map((i) => (
              <button
                key={i.id}
                onClick={() => open(group.id, i.id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[13px] transition-colors',
                  i.id === item.id
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                {i.name}
              </button>
            ))}
          </div>

          <div>
            <h2 className="text-base font-semibold">{item.name}</h2>
            <p className="mb-4 mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
            {item.render()}
          </div>
        </div>
      </div>
    </div>
  );
}
