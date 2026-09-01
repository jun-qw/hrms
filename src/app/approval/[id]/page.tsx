'use client';

import { use, useMemo } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ApprovalFlow } from '@/components/approval/approval-flow';
import { ApprovalActionForm } from '@/components/approval/approval-form';
import { Separator } from '@/components/ui/separator';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import { useApprovalStore } from '@/lib/stores/approval-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { useAttendanceStore } from '@/lib/stores/attendance-store';
import type { Attendance, AttendanceStatus } from '@/types';

export default function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const APPROVAL_STATUS = useCodeMap(CODE.APPROVAL_STATUS);
  const { id } = use(params);

  const approvals = useApprovalStore((s) => s.approvals);
  const approvalLines = useApprovalStore((s) => s.approvalLines);
  const approveStep = useApprovalStore((s) => s.approveStep);
  const rejectStep = useApprovalStore((s) => s.rejectStep);
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const session = useAuthStore((s) => s.session);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const addAttendanceRecord = useAttendanceStore((s) => s.addRecord);

  const approval = approvals.find((a) => a.id === id);
  const lines = approvalLines.filter((l) => l.approval_id === id).sort((a, b) => a.step - b.step);

  const findEmployee = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return undefined;
    return {
      ...emp,
      department: departments.find((d) => d.id === emp.department_id),
      position_rank: positionRanks.find((r) => r.id === emp.position_rank_id),
    };
  };

  const hydratedLines = useMemo(() => {
    return lines.map((line) => {
      const approver = findEmployee(line.approver_id);
      return {
        ...line,
        approverName: approver?.name ?? line.approver_id,
        approverRank: approver?.position_rank?.name ?? '-',
      };
    });
  }, [lines, employees, departments, positionRanks]);

  if (!approval) {
    return (
      <div>
        <Breadcrumb />
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">결재 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const requester = findEmployee(approval.requester_id);
  const statusLabel = APPROVAL_STATUS[approval.status] ?? approval.status;

  const typeLabels: Record<string, string> = {
    leave: '휴가', appointment: '인사발령', expense: '경비', general: '일반',
    attendance_request: '근태신청',
  };

  // 근태 신청 내용의 키를 한글 라벨로 매핑
  const contentLabels: Record<string, string> = {
    requestType: '신청유형코드',
    requestTypeLabel: '신청유형',
    startDate: '시작일',
    endDate: '종료일',
    halfPeriod: '시간대',
    days: '기간(일)',
    location: '장소',
    purpose: '목적',
    reason: '사유',
  };

  // Check if current user can act on this approval
  const currentEmployeeId = session?.employee_id;
  const myPendingLine = lines.find(
    (l) => l.approver_id === currentEmployeeId && l.status === 'pending' && l.line_type !== 'cc',
  );

  // 결재(approval) 타입은 모든 합의(agreement)가 완료된 후에만 결재 가능
  const allAgreementsCompleted = lines
    .filter((l) => l.line_type === 'agreement')
    .every((l) => l.status === 'approved');

  const canAct = !!(
    currentEmployeeId &&
    myPendingLine &&
    (approval.status === 'pending' || approval.status === 'in_progress') &&
    // 합의자는 항상 액션 가능, 결재자는 합의 완료 후만 가능
    (myPendingLine.line_type === 'agreement' || allAgreementsCompleted)
  );

  // 참조자 여부 확인 (최종 승인 후 열람 가능)
  const isCcViewer = !!(
    currentEmployeeId &&
    lines.some((l) => l.approver_id === currentEmployeeId && l.line_type === 'cc')
  );
  const ccViewable = isCcViewer && approval.status === 'approved';

  // 근태 신청 유형에 따른 Attendance.status 매핑
  const mapAttendanceStatus = (requestType: string): AttendanceStatus => {
    if (requestType === 'leave_full') return 'leave';
    if (requestType === 'leave_half') return 'half_day';
    if (requestType === 'leave_quarter') return 'quarter_day';
    return 'normal'; // field_work, business_trip, remote
  };

  // 근태 신청 유형에 따른 attendance_type 매핑
  const mapAttendanceType = (requestType: string): string => {
    switch (requestType) {
      case 'field_work': return 'field_work';
      case 'business_trip': return 'domestic_trip';
      case 'remote': return 'remote';
      case 'leave_full':
      case 'leave_half':
      case 'leave_quarter':
        return 'annual_leave';
      default: return 'office';
    }
  };

  const handleApprove = (comment?: string) => {
    if (!currentEmployeeId) return;
    approveStep(id, currentEmployeeId, comment);

    // 알림: 신청자에게 결재 진행 상황 통지
    const isLastStep = lines.filter((l) => l.approver_id !== currentEmployeeId).every((l) => l.status !== 'pending');
    const finalApproved = isLastStep;

    if (finalApproved) {
      // 최종 승인: 근태 신청이면 attendance record 생성
      if (approval.type === 'attendance_request' && approval.content) {
        const content = approval.content as Record<string, unknown>;
        const requestType = String(content.requestType ?? '');
        const startDate = String(content.startDate ?? '');
        const endDate = String(content.endDate ?? startDate);
        const halfPeriod = content.halfPeriod as string | null;

        // 기간 내 각 날짜에 대해 근태 기록 생성
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dayMs = 24 * 60 * 60 * 1000;
        const days: string[] = [];
        for (let d = new Date(start); d <= end; d = new Date(d.getTime() + dayMs)) {
          days.push(d.toISOString().split('T')[0]);
        }

        days.forEach((date, idx) => {
          const record: Attendance = {
            id: `att-req-${approval.id}-${idx}`,
            employee_id: approval.requester_id,
            date,
            clock_in: null,
            clock_out: null,
            work_hours: requestType === 'leave_half' ? 4 : requestType === 'leave_quarter' ? 6 : 8,
            overtime_hours: 0,
            status: mapAttendanceStatus(requestType),
            note: `[전자결재 승인] ${String(content.reason ?? '')}`,
            attendance_type: mapAttendanceType(requestType),
            location: (content.location as string | null) ?? null,
            purpose: (content.purpose as string | null) ?? null,
            leave_time_period: halfPeriod
              ? (requestType === 'leave_half'
                  ? (halfPeriod === 'am' ? 'am_half' : 'pm_half')
                  : (halfPeriod === 'am' ? 'am_quarter' : 'pm_quarter'))
              : undefined,
            scheduled_start: null,
            scheduled_end: null,
            created_at: new Date().toISOString(),
          };
          addAttendanceRecord(record);
        });

        // 신청자에게 알림
        addNotification({
          recipient_id: approval.requester_id,
          type: 'attendance_approved',
          title: '근태 신청 승인',
          message: `${approval.title} 신청이 최종 승인되었습니다.`,
          link: `/approval/${id}`,
          related_id: id,
        });
      } else {
        // 일반 결재 승인 알림
        addNotification({
          recipient_id: approval.requester_id,
          type: 'approval_approved',
          title: '결재 승인',
          message: `${approval.title} 결재가 최종 승인되었습니다.`,
          link: `/approval/${id}`,
          related_id: id,
        });
      }
    } else {
      // 중간 단계 승인: 다음 결재자에게 알림
      const nextLine = lines
        .filter((l) => l.approver_id !== currentEmployeeId && l.status === 'pending')
        .sort((a, b) => a.step - b.step)[0];
      if (nextLine) {
        addNotification({
          recipient_id: nextLine.approver_id,
          type: 'approval_request',
          title: '결재 요청 (다음 단계)',
          message: `${approval.title} 결재가 이전 단계 승인 후 귀하에게 전달되었습니다.`,
          link: `/approval/${id}`,
          related_id: id,
        });
      }
      // 신청자에게도 진행 상황 알림
      addNotification({
        recipient_id: approval.requester_id,
        type: 'approval_approved',
        title: '결재 진행',
        message: `${approval.title}이(가) 중간 단계에서 승인되었습니다.`,
        link: `/approval/${id}`,
        related_id: id,
      });
    }
  };

  const handleReject = (comment?: string) => {
    if (!currentEmployeeId) return;
    rejectStep(id, currentEmployeeId, comment);

    // 신청자에게 반려 알림
    const notifType = approval.type === 'attendance_request' ? 'attendance_rejected' : 'approval_rejected';
    addNotification({
      recipient_id: approval.requester_id,
      type: notifType,
      title: approval.type === 'attendance_request' ? '근태 신청 반려' : '결재 반려',
      message: `${approval.title}이(가) 반려되었습니다.${comment ? ` 사유: ${comment}` : ''}`,
      link: `/approval/${id}`,
      related_id: id,
    });
  };

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{approval.title}</h1>
        <Badge variant={approval.status === 'approved' ? 'default' : approval.status === 'rejected' ? 'destructive' : 'secondary'}>
          {statusLabel}
        </Badge>
      </div>

      <div className="space-y-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">결재 라인</CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovalFlow lines={hydratedLines} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">결재 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">신청자:</span> <strong>{requester?.name ?? approval.requester_id}</strong></div>
              <div><span className="text-muted-foreground">부서:</span> <strong>{requester?.department?.name ?? '-'}</strong></div>
              <div><span className="text-muted-foreground">신청일:</span> <strong>{approval.created_at}</strong></div>
              <div><span className="text-muted-foreground">유형:</span> <Badge variant="outline">{typeLabels[approval.type] ?? approval.type}</Badge></div>
            </div>
            {approval.content && (
              <>
                <Separator />
                <div className="space-y-2 text-sm">
                  <h4 className="font-semibold">결재 내용</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(approval.content)
                      .filter(([, value]) => value !== null && value !== undefined && value !== '')
                      .map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground">{contentLabels[key] ?? key}:</span>{' '}
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {canAct && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {myPendingLine?.line_type === 'agreement' ? '합의 처리' : '결재 처리'}
              </CardTitle>
              {myPendingLine?.line_type === 'agreement' && (
                <p className="text-xs text-muted-foreground">합의 완료 시 최종 결재자에게 전달됩니다.</p>
              )}
              {myPendingLine?.line_type === 'approval' && !allAgreementsCompleted && (
                <p className="text-xs text-destructive">모든 합의가 완료되어야 결재 가능합니다.</p>
              )}
            </CardHeader>
            <CardContent>
              <ApprovalActionForm
                approvalId={id}
                onApprove={(comment) => handleApprove(comment)}
                onReject={(comment) => handleReject(comment)}
                approveLabel={myPendingLine?.line_type === 'agreement' ? '합의' : '승인'}
              />
            </CardContent>
          </Card>
        )}

        {ccViewable && (
          <Card className="border-slate-300">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">참조</Badge>
                이 결재 문서가 최종 승인되어 참조로 열람 가능합니다.
              </div>
            </CardContent>
          </Card>
        )}

        {isCcViewer && !ccViewable && approval.status !== 'approved' && (
          <Card className="border-dashed border-slate-300">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">참조 대기</Badge>
                최종결재가 완료되면 이 문서를 열람할 수 있습니다.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
