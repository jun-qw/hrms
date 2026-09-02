'use client';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function SettingsPage() {
  return (
    <div>
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-6">시스템 설정</h1>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
          <TabsTrigger value="company">회사정보</TabsTrigger>
          <TabsTrigger value="branding">브랜딩</TabsTrigger>
          <TabsTrigger value="work">근무설정</TabsTrigger>
          <TabsTrigger value="leave">휴가설정</TabsTrigger>
          <TabsTrigger value="workplace">사업장</TabsTrigger>
          <TabsTrigger value="payroll">급여설정</TabsTrigger>
          <TabsTrigger value="payroll-rates">급여 기준값</TabsTrigger>
          <TabsTrigger value="approval">결재설정</TabsTrigger>
          <TabsTrigger value="notification">알림설정</TabsTrigger>
          <TabsTrigger value="menu-permission">메뉴권한</TabsTrigger>
          <TabsTrigger value="security">보안설정</TabsTrigger>
          <TabsTrigger value="holiday">공휴일설정</TabsTrigger>
          <TabsTrigger value="display">화면설정</TabsTrigger>
          <TabsTrigger value="print">출력설정</TabsTrigger>
          <TabsTrigger value="workflow">프로세스설정</TabsTrigger>
          <TabsTrigger value="attendance-type">근태유형설정</TabsTrigger>
          <TabsTrigger value="codes">코드관리</TabsTrigger>
          <TabsTrigger value="audit-log">감사로그설정</TabsTrigger>
          <TabsTrigger value="change-history">변경이력</TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <BrandingSettings />
        </TabsContent>

        <TabsContent value="company">
          <CompanyInfoSettings />
        </TabsContent>
        <TabsContent value="work">
          <WorkScheduleSettings />
        </TabsContent>
        <TabsContent value="leave">
          <LeavePolicySettings />
        </TabsContent>
        <TabsContent value="workplace">
          <WorkplaceSettings />
        </TabsContent>
        <TabsContent value="payroll">
          <PayrollSettings />
        </TabsContent>
        <TabsContent value="payroll-rates">
          <PayrollRateSettings />
        </TabsContent>
        <TabsContent value="approval">
          <ApprovalSettings />
        </TabsContent>
        <TabsContent value="notification">
          <NotificationSettings />
        </TabsContent>
        <TabsContent value="menu-permission">
          <MenuPermissionSettings />
        </TabsContent>
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>
        <TabsContent value="holiday">
          <HolidaySettings />
        </TabsContent>
        <TabsContent value="display">
          <DisplaySettings />
        </TabsContent>
        <TabsContent value="print">
          <PrintTemplateSettings />
        </TabsContent>
        <TabsContent value="workflow">
          <WorkflowTemplateSettings />
        </TabsContent>
        <TabsContent value="attendance-type">
          <AttendanceTypeSettings />
        </TabsContent>
        <TabsContent value="codes">
          <CodeManagementSettings />
        </TabsContent>
        <TabsContent value="audit-log">
          <AuditLogSettings />
        </TabsContent>
        <TabsContent value="change-history">
          <ChangeHistorySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
