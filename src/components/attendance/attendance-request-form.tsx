'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useApprovalStore } from '@/lib/stores/approval-store';
import { useAttendanceStore } from '@/lib/stores/attendance-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { findApprovers } from '@/lib/utils/approval-helpers';
import { ApprovalLineEditor, type ApprovalLineEntry } from '@/components/approval/approval-line-editor';
import { toast } from 'sonner';
import type { Approval, ApprovalLine, Employee } from '@/types';
import { FileCheck, Users, ArrowRight, Edit, Handshake, Eye } from 'lucide-react';

export type AttendanceRequestCategory = 'overtime' | 'trip' | 'maternity' | 'other';

export type AttendanceRequestType =
  // 잔업/특근
  | 'overtime_indoor'      // 잔업 사내
  | 'overtime_outdoor'     // 잔업 사외
  | 'overtime_remote'      // 잔업 재택
  | 'special_indoor'       // 특근 사내
  | 'special_outdoor'      // 특근 사외
  | 'special_remote'       // 특근 재택
  // 외근/출장
  | 'field_work'
  | 'business_trip_a'      // 출장 A
  | 'business_trip_b'      // 출장 B
  | 'business_trip_c'      // 출장 C
  | 'boarding'             // 승선
  | 'training'             // 교육
  | 'dispatch_domestic'    // 국내파견
  | 'dispatch_overseas'    // 해외파견
  | 'leave_full'
  | 'leave_half'
  | 'leave_quarter'
  | 'leave_1h'             // 1H연차
  | 'remote'
  // 모성보호
  | 'maternity'            // 출산휴가
  | 'spouse_maternity'     // 배우자출산
  | 'childcare_leave'      // 육아휴직
  | 'infertility'          // 난임휴가
  | 'prenatal'             // 태아검진
  | 'family_care_4h'       // 가족돌봄(4h)
  | 'family_care_8h'       // 가족돌봄(8h)
  | 'pregnancy_short'      // 임신기근로시간단축
  | 'childcare_short'      // 육아기근로시간단축
  | 'birthday_early'       // 생일자조기퇴근
  // 기타
  | 'sick_leave'           // 병가
  | 'leave_of_absence'     // 휴직
  | 'other';

interface RequestTypeOption {
  value: AttendanceRequestType;
  label: string;
  category: AttendanceRequestCategory;
  description: string;
  defaultHours?: number;
  deductLeave?: boolean;
  notifyHR?: boolean;
}

const REQUEST_TYPE_OPTIONS: RequestTypeOption[] = [
  // 잔업/특근
  { value: 'overtime_indoor', label: '잔업(사내)', category: 'overtime', description: '평일 연장근로 - 사내' },
  { value: 'overtime_outdoor', label: '잔업(사외)', category: 'overtime', description: '평일 연장근로 - 사외' },
  { value: 'overtime_remote', label: '잔업(재택)', category: 'overtime', description: '평일 연장근로 - 재택' },
  { value: 'special_indoor', label: '특근(사내)', category: 'overtime', description: '휴일 근무 - 사내' },
  { value: 'special_outdoor', label: '특근(사외)', category: 'overtime', description: '휴일 근무 - 사외' },
  { value: 'special_remote', label: '특근(재택)', category: 'overtime', description: '휴일 근무 - 재택' },
  // 외근/출장
  { value: 'leave_full', label: '연차', category: 'trip', description: '종일 휴가 (1일)', deductLeave: true, defaultHours: 8 },
  { value: 'leave_half', label: '반차', category: 'trip', description: '반나절 휴가 (0.5일)', deductLeave: true, defaultHours: 4 },
  { value: 'leave_quarter', label: '반반차', category: 'trip', description: '2시간 단위 (0.25일)', deductLeave: true, defaultHours: 2 },
  { value: 'leave_1h', label: '1H연차', category: 'trip', description: '1시간 단위 시간차', deductLeave: true, defaultHours: 1 },
  { value: 'training', label: '교육', category: 'trip', description: '사외 교육/연수 (간주근로 8h)', defaultHours: 8 },
  { value: 'business_trip_a', label: '출장(A)', category: 'trip', description: '연구/시험 직무 - 간주근로 8h', defaultHours: 8 },
  { value: 'business_trip_b', label: '출장(B)', category: 'trip', description: 'AS/시운전/설치 직무 - 간주근로 8h', defaultHours: 8 },
  { value: 'business_trip_c', label: '출장(C)', category: 'trip', description: '영업/관리 직무 - 간주근로 8h', defaultHours: 8 },
  { value: 'boarding', label: '승선', category: 'trip', description: '선박 승선' },
  { value: 'field_work', label: '외근', category: 'trip', description: '사업장 인근 외근' },
  { value: 'dispatch_domestic', label: '국내파견', category: 'trip', description: '국내 장기 파견' },
  { value: 'dispatch_overseas', label: '해외파견', category: 'trip', description: '해외 장기 파견' },
  { value: 'remote', label: '재택근무', category: 'trip', description: '자택에서 근무' },
  // 모성보호
  { value: 'maternity', label: '출산휴가', category: 'maternity', description: '출산 전후 90일', notifyHR: true },
  { value: 'spouse_maternity', label: '배우자출산휴가', category: 'maternity', description: '배우자 출산 10일', notifyHR: true },
  { value: 'childcare_leave', label: '육아휴직', category: 'maternity', description: '만 8세 이하 자녀', notifyHR: true },
  { value: 'infertility', label: '난임휴가', category: 'maternity', description: '난임치료 휴가' },
  { value: 'prenatal', label: '태아검진', category: 'maternity', description: '임신부 정기검진' },
  { value: 'family_care_4h', label: '가족돌봄(4h)', category: 'maternity', description: '가족돌봄 반차' },
  { value: 'family_care_8h', label: '가족돌봄(8h)', category: 'maternity', description: '가족돌봄 종일' },
  { value: 'pregnancy_short', label: '임신기근로시간단축', category: 'maternity', description: '임신기 단축근로', notifyHR: true },
  { value: 'childcare_short', label: '육아기근로시간단축', category: 'maternity', description: '육아기 단축근로', notifyHR: true },
  { value: 'birthday_early', label: '생일자조기퇴근', category: 'maternity', description: '본인/자녀 생일' },
  // 기타
  { value: 'sick_leave', label: '병가', category: 'other', description: '질병으로 인한 휴무' },
  { value: 'leave_of_absence', label: '휴직', category: 'other', description: '장기 휴직' },
  { value: 'other', label: '기타', category: 'other', description: '기타 사유' },
];

const CATEGORY_LABELS: Record<AttendanceRequestCategory, string> = {
  overtime: '잔업/특근',
  trip: '외근/출장/휴가',
  maternity: '모성보호',
  other: '기타',
};

// 출장(A,B,C) 시 출장지 검증 - 부산/김해/창원/양산은 외근으로 변경 안내
const NEAR_AREAS = ['부산', '김해', '창원', '양산'];

interface AttendanceRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 신청자 ID (미지정시 세션에서) */
  employeeId?: string;
  /** 기본 선택 유형 */
  defaultType?: AttendanceRequestType;
  onSuccess?: () => void;
}

export function AttendanceRequestForm({
  open,
  onOpenChange,
  employeeId: propEmployeeId,
  defaultType,
  onSuccess,
}: AttendanceRequestFormProps) {
  const session = useAuthStore((s) => s.session);
  const employees = useEmployeeStore((s) => s.employees);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const departments = useEmployeeStore((s) => s.departments);
  const createApproval = useApprovalStore((s) => s.createApproval);
  const allApprovals = useApprovalStore((s) => s.approvals);
  const attendanceRecords = useAttendanceStore((s) => s.records);
  const work = useSettingsStore((s) => s.work);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const employeeId = propEmployeeId ?? session?.employee_id ?? '';

  const [category, setCategory] = useState<AttendanceRequestCategory>('trip');
  const [type, setType] = useState<AttendanceRequestType>(defaultType ?? 'leave_full');
  const [startDate, setStartDate] = useState(''); // 출발일자
  const [endDate, setEndDate] = useState('');     // 도착일자
  const [startTime, setStartTime] = useState(''); // 출발시간
  const [endTime, setEndTime] = useState('');     // 도착시간
  const [halfPeriod, setHalfPeriod] = useState<'am' | 'pm' | 'custom'>('am');
  const [halfCustomStart, setHalfCustomStart] = useState('');
  const [halfCustomEnd, setHalfCustomEnd] = useState('');
  const [location, setLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  // 외근출장 추가 필드
  const [client, setClient] = useState('');           // 방문거래처
  const [region, setRegion] = useState('');           // 방문지역
  const [vehicle, setVehicle] = useState('');         // 사용차량
  const [departLocation, setDepartLocation] = useState<'company' | 'other'>('company'); // 출발위치
  const [departLocationDetail, setDepartLocationDetail] = useState(''); // 그 외 출발위치 상세
  const [note, setNote] = useState('');               // 비고
  const [attachmentName, setAttachmentName] = useState(''); // 첨부파일명
  // 잔업/특근 추가 필드
  const [overtimeHours, setOvertimeHours] = useState('');   // 잔업시간
  // 모성보호 추가 필드
  const [childName, setChildName] = useState('');           // 영아성명
  const [childBirth, setChildBirth] = useState('');         // 영아 생년월일/예정일
  // 동행자 (같은 본부 기준)
  const [companions, setCompanions] = useState<string[]>([]); // 동행자 ID 목록

  // 요청자 정보
  const requester = employees.find((e) => e.id === employeeId);
  const requesterDept = departments.find((d) => d.id === requester?.department_id);
  const requesterRank = positionRanks.find((r) => r.id === requester?.position_rank_id);

  // 자동 결재자 탐색
  const autoApprovers = useMemo(() => {
    if (!employeeId) return [];
    return findApprovers({
      requesterId: employeeId,
      employees,
      positionRanks,
      departments,
      maxLevels: 2,
    });
  }, [employeeId, employees, positionRanks, departments]);

  // 커스텀 결재 라인 (변경 가능) - 합의/참조 역할 포함
  const [customLineEntries, setCustomLineEntries] = useState<ApprovalLineEntry[] | null>(null);
  const [lineEditorOpen, setLineEditorOpen] = useState(false);

  // 자동 결재자가 변경될 때 커스텀이 없으면 자동 반영
  useEffect(() => {
    setCustomLineEntries(null);
  }, [employeeId]);

  // 자동 탐색된 결재자를 ApprovalLineEntry로 변환 (기본: 모두 'approval')
  const autoLineEntries: ApprovalLineEntry[] = useMemo(() => {
    return autoApprovers.map((emp) => ({ employee: emp, lineType: 'approval' as const }));
  }, [autoApprovers]);

  const lineEntries = customLineEntries ?? autoLineEntries;
  const approvers = lineEntries.map((e) => e.employee);

  const handleLineChange = (newEntries: ApprovalLineEntry[]) => {
    setCustomLineEntries(newEntries);
  };

  const selectedOption = REQUEST_TYPE_OPTIONS.find((o) => o.value === type);
  const isOvertime = category === 'overtime';
  const isTrip = category === 'trip' && (type === 'business_trip_a' || type === 'business_trip_b' || type === 'business_trip_c' || type === 'field_work');
  const isMaternity = category === 'maternity';
  const needsLocation = isTrip || type === 'training';
  const needsTripFields = isTrip; // 거래처/지역/차량/출발위치
  const needsChildInfo = type === 'maternity' || type === 'spouse_maternity' || type === 'childcare_leave' || type === 'family_care_4h' || type === 'family_care_8h' || type === 'pregnancy_short' || type === 'childcare_short' || type === 'birthday_early';
  const isHalfType = type === 'leave_half' || type === 'leave_quarter' || type === 'leave_1h';
  const isBusinessTripABC = type === 'business_trip_a' || type === 'business_trip_b' || type === 'business_trip_c';

  // 출장(A,B,C) 부산권 검증
  const isNearAreaTrip = isBusinessTripABC && region && NEAR_AREAS.some((area) => region.includes(area));

  // 동행자 후보 (같은 본부 활성 직원, 본인 제외)
  const companionCandidates = useMemo(() => {
    if (!isTrip) return [];
    if (!requesterDept) return [];
    // 본부 단위로 묶기 위해 parent_id가 같은 부서들의 직원
    const headquarters = requesterDept.parent_id ?? requesterDept.id;
    const sameHQDeptIds = departments.filter((d) => d.id === headquarters || d.parent_id === headquarters).map((d) => d.id);
    return employees.filter((e) => e.status === 'active' && e.id !== employeeId && sameHQDeptIds.includes(e.department_id ?? ''));
  }, [isTrip, requesterDept, departments, employees, employeeId]);

  const calculatedDays = useMemo(() => {
    if (!startDate) return 0;
    if (type === 'leave_half') return 0.5;
    if (type === 'leave_quarter') return 0.25;
    if (type === 'leave_1h') return 1 / 8;
    if (!endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  }, [type, startDate, endDate]);

  const resetForm = () => {
    setCategory('trip');
    setType(defaultType ?? 'leave_full');
    setStartDate(''); setEndDate('');
    setStartTime(''); setEndTime('');
    setHalfPeriod('am');
    setHalfCustomStart(''); setHalfCustomEnd('');
    setLocation(''); setPurpose(''); setReason('');
    setClient(''); setRegion(''); setVehicle('');
    setDepartLocation('company'); setDepartLocationDetail('');
    setNote(''); setAttachmentName('');
    setOvertimeHours('');
    setChildName(''); setChildBirth('');
    setCompanions([]);
    setCustomLineEntries(null);
  };

  const handleSubmit = () => {
    if (!employeeId || !requester) {
      toast.error('신청자 정보를 찾을 수 없습니다.');
      return;
    }
    // 카테고리별 검증
    if (isOvertime) {
      if (!overtimeHours || Number(overtimeHours) <= 0) {
        toast.error('잔업/특근 시간을 입력해주세요.');
        return;
      }
    }
    if (isBusinessTripABC && isNearAreaTrip) {
      toast.error(`${region}은(는) 부산권 인근입니다. 출장이 아닌 외근으로 신청해주세요.`);
      return;
    }
    if (needsTripFields) {
      if (!region.trim()) { toast.error('방문지역을 입력해주세요.'); return; }
      if (departLocation === 'other' && !departLocationDetail.trim()) {
        toast.error('출발위치 상세를 입력해주세요.'); return;
      }
    }
    if (needsChildInfo && type !== 'birthday_early') {
      if (!childName.trim() && (type === 'maternity' || type === 'spouse_maternity' || type === 'childcare_leave')) {
        // 영아성명 또는 자녀명은 출산/육아휴직에 필수
        // 단, 첫 출산휴가는 영아예정일만 있을 수도 있음 → 미리 검증 안함
      }
    }
    if (!startDate) {
      toast.error('시작일을 선택해주세요.');
      return;
    }

    // === 1일 중복 근태 신청 차단 ===
    if (work.block_duplicate_attendance_request) {
      const reqEnd = isHalfType ? startDate : (endDate || startDate);
      // 동일 직원 + 동일 날짜 범위에 이미 pending/in_progress/approved 결재 있는지
      const conflictingApprovals = allApprovals.filter((a) => {
        if (a.requester_id !== employeeId) return false;
        if (a.status === 'rejected' || a.status === 'cancelled') return false;
        if (a.type !== 'attendance_request') return false;
        const c = a.content as Record<string, unknown> | null;
        if (!c) return false;
        const aStart = c.startDate as string;
        const aEnd = c.endDate as string;
        if (!aStart) return false;
        // 날짜 겹침 체크
        return !(reqEnd < aStart || startDate > aEnd);
      });
      if (conflictingApprovals.length > 0) {
        const conflict = conflictingApprovals[0];
        const c = conflict.content as Record<string, unknown>;
        toast.error(`해당 기간에 이미 신청된 근태(${c.requestTypeLabel ?? '근태'})가 있습니다. 중복 신청은 불가합니다.`);
        return;
      }
      // 이미 근태 기록이 있는 날짜인지 (휴가/출장 등)
      const existingRecord = attendanceRecords.find((r) =>
        r.employee_id === employeeId && r.date >= startDate && r.date <= reqEnd && r.status === 'leave',
      );
      if (existingRecord) {
        toast.error(`${existingRecord.date}에 이미 휴가 처리된 근태가 있습니다.`);
        return;
      }
    }

    // === 전결규정 검증 ===
    if (work.enable_delegation_rules) {
      // 잔업/특근: 본인 결재 한도 초과 시 상위자 결재 필요 안내
      if (isOvertime && Number(overtimeHours) > work.overtime_self_approval_limit) {
        const proceed = window.confirm(
          `잔업/특근 ${overtimeHours}시간은 본인 결재 한도(${work.overtime_self_approval_limit}시간)를 초과합니다.\n` +
          `상위자(부서장 이상) 전결이 필요합니다. 진행하시겠습니까?`,
        );
        if (!proceed) return;
      }
      // 출장: 본인 결재 일수 초과 시 안내
      if ((type === 'business_trip_a' || type === 'business_trip_b' || type === 'business_trip_c' || type === 'dispatch_overseas') && calculatedDays > work.business_trip_self_approval_limit) {
        const proceed = window.confirm(
          `출장 ${calculatedDays}일은 본인 결재 한도(${work.business_trip_self_approval_limit}일)를 초과합니다.\n` +
          `상위자 전결이 필요합니다. 진행하시겠습니까?`,
        );
        if (!proceed) return;
      }
    }

    // === 주52시간 초과 경고 (잔업/특근) ===
    if (work.weekly_52h_warning && isOvertime && overtimeHours) {
      // 해당 주의 기존 근로시간 + 신청 잔업시간 계산
      const reqDate = new Date(startDate);
      const dayOfWeek = reqDate.getDay();
      const monday = new Date(reqDate);
      monday.setDate(reqDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const mondayStr = monday.toISOString().split('T')[0];
      const sundayStr = sunday.toISOString().split('T')[0];
      const weeklyHours = attendanceRecords
        .filter((r) => r.employee_id === employeeId && r.date >= mondayStr && r.date <= sundayStr)
        .reduce((sum, r) => sum + (r.work_hours ?? 0), 0);
      const projected = weeklyHours + Number(overtimeHours);
      if (projected > work.weekly_max_hours) {
        const proceed = window.confirm(
          `⚠ 주 52시간 초과 경고\n` +
          `해당 주 누적 근무시간: ${weeklyHours.toFixed(1)}시간\n` +
          `신청 잔업: ${overtimeHours}시간\n` +
          `예상 총 근무: ${projected.toFixed(1)}시간 (한도 ${work.weekly_max_hours}시간)\n\n` +
          `진행하시겠습니까?`,
        );
        if (!proceed) return;
      }
    }

    // 반차/반반차/1H연차 사용자 지정 시간 검증
    if (isHalfType && halfPeriod === 'custom') {
      if (!halfCustomStart || !halfCustomEnd) {
        toast.error('사용자 지정 시간을 입력해주세요.');
        return;
      }
      const [sh, sm] = halfCustomStart.split(':').map(Number);
      const [eh, em] = halfCustomEnd.split(':').map(Number);
      const dur = (eh * 60 + em) - (sh * 60 + sm);
      const expected = type === 'leave_half' ? 240 : type === 'leave_quarter' ? 120 : 60;
      if (dur !== expected) {
        toast.error(`${type === 'leave_half' ? '반차는 4시간' : type === 'leave_quarter' ? '반반차는 2시간' : '1H연차는 1시간'}이어야 합니다. (현재 ${dur}분)`);
        return;
      }
    }
    if (!isHalfType && !endDate) {
      setEndDate(startDate);
    }
    if (needsLocation && !location.trim()) {
      toast.error('장소를 입력해주세요.');
      return;
    }
    if (!reason.trim()) {
      toast.error('사유를 입력해주세요.');
      return;
    }
    if (approvers.length === 0) {
      toast.error('결재 라인을 찾을 수 없습니다. 관리자에게 문의하세요.');
      return;
    }

    const now = new Date().toISOString();
    const approvalId = `ap-att-${Date.now()}`;

    const companionNames = companions.map((cid) => employees.find((e) => e.id === cid)?.name).filter(Boolean).join(', ');
    const titlePrefix = companions.length > 0 ? `[${selectedOption?.label}+동행${companions.length}]` : `[${selectedOption?.label}]`;

    // Approval 생성
    const approval: Approval = {
      id: approvalId,
      title: `${titlePrefix} ${requester.name} - ${startDate}${endDate && endDate !== startDate ? ` ~ ${endDate}` : ''}`,
      type: 'attendance_request',
      requester_id: employeeId,
      content: {
        category,
        requestType: type,
        requestTypeLabel: selectedOption?.label ?? '',
        startDate, endDate: isHalfType ? startDate : (endDate || startDate),
        startTime: startTime || null, endTime: endTime || null,
        halfPeriod: isHalfType ? halfPeriod : null,
        halfCustomStart: isHalfType && halfPeriod === 'custom' ? halfCustomStart : null,
        halfCustomEnd: isHalfType && halfPeriod === 'custom' ? halfCustomEnd : null,
        days: calculatedDays,
        location: needsLocation ? location : null,
        purpose: needsLocation ? purpose : null,
        reason,
        // 외근/출장 필드
        client: needsTripFields ? client : null,
        region: needsTripFields ? region : null,
        vehicle: needsTripFields ? vehicle : null,
        departLocation: needsTripFields ? (departLocation === 'company' ? '회사' : departLocationDetail) : null,
        // 잔업/특근
        overtimeHours: isOvertime ? Number(overtimeHours) : null,
        // 모성보호
        childName: needsChildInfo ? childName : null,
        childBirth: needsChildInfo ? childBirth : null,
        // 동행자
        companionIds: companions.length > 0 ? companions : null,
        companionNames: companions.length > 0 ? companionNames : null,
        // 기타
        note: note || null,
        attachmentName: attachmentName || null,
        notifyHR: selectedOption?.notifyHR ?? false,
      },
      status: 'pending',
      created_at: now,
      completed_at: null,
    };

    // ApprovalLine 생성 (합의/결재/참조 역할 반영)
    const lines: ApprovalLine[] = lineEntries.map((entry, idx) => ({
      id: `al-att-${Date.now()}-${idx}`,
      approval_id: approvalId,
      approver_id: entry.employee.id,
      step: idx + 1,
      status: 'pending',
      comment: null,
      acted_at: null,
      line_type: entry.lineType,
    }));

    createApproval(approval, lines);

    // 첫 결재자에게 알림 발송
    const firstApprover = approvers[0];
    if (firstApprover) {
      addNotification({
        recipient_id: firstApprover.id,
        type: 'approval_request',
        title: '새 결재 요청',
        message: `${requester.name} ${requesterRank?.name ?? ''}님이 ${selectedOption?.label} 결재를 요청했습니다.`,
        link: `/approval/${approvalId}`,
        related_id: approvalId,
      });
    }

    // 모성보호 - 인사팀에 알림
    if (selectedOption?.notifyHR) {
      const hrEmployees = employees.filter((e) => {
        const dept = departments.find((d) => d.id === e.department_id);
        return dept?.code === 'HR' && e.status === 'active';
      });
      for (const hr of hrEmployees) {
        addNotification({
          recipient_id: hr.id,
          type: 'info',
          title: '모성보호 신청 - 인사팀 확인 필요',
          message: `${requester.name}님이 ${selectedOption.label}을(를) 신청했습니다.`,
          link: `/approval/${approvalId}`,
          related_id: approvalId,
        });
      }
    }

    const companionMsg = companions.length > 0 ? ` (동행자 ${companions.length}명 함께 반영)` : '';
    toast.success(
      `${selectedOption?.label} 신청이 접수되었습니다${companionMsg}. 결재자: ${approvers.map((a) => a.name).join(' → ')}`,
    );

    resetForm();
    onOpenChange(false);
    onSuccess?.();
  };

  if (!session || !requester) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            근태 신청 (전자결재)
          </DialogTitle>
          <DialogDescription>
            외근/출장/휴가/재택근무를 신청합니다. 결재가 완료되면 알림을 받습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 신청자 정보 */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm flex items-center justify-between">
            <div>
              <span className="text-muted-foreground">신청자:</span>{' '}
              <strong>{requester.name}</strong>{' '}
              <span className="text-muted-foreground">
                {requesterDept?.name} · {requesterRank?.name}
              </span>
            </div>
          </div>

          {/* 카테고리 탭 */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-lg">
            {(['overtime', 'trip', 'maternity', 'other'] as AttendanceRequestCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  // 카테고리 변경시 첫 유형으로 초기화
                  const firstType = REQUEST_TYPE_OPTIONS.find((o) => o.category === cat);
                  if (firstType) setType(firstType.value);
                }}
                className={`text-xs px-2 py-1.5 rounded-md transition-colors ${
                  category === cat ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* 신청 유형 */}
          <div className="space-y-2">
            <Label>신청 유형 *</Label>
            <Select value={type} onValueChange={(v) => setType(v as AttendanceRequestType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_TYPE_OPTIONS.filter((o) => o.category === category).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col items-start">
                      <span>{opt.label}</span>
                      <span className="text-xs text-muted-foreground">{opt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 기간 - 출발일자/도착일자 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{isHalfType ? '일자 *' : '출발일자 *'}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            {!isHalfType && (
              <div className="space-y-2">
                <Label>도착일자</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
            )}
            {isHalfType && (
              <div className="space-y-2">
                <Label>시간대 *</Label>
                <Select value={halfPeriod} onValueChange={(v) => setHalfPeriod(v as 'am' | 'pm' | 'custom')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="am">오전</SelectItem>
                    <SelectItem value="pm">오후</SelectItem>
                    <SelectItem value="custom">사용자 지정</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* 반차/반반차/1H연차 - 사용자 지정 시간 입력 */}
          {isHalfType && halfPeriod === 'custom' && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="space-y-2">
                <Label>시작 시간 *</Label>
                <Input
                  type="time"
                  value={halfCustomStart}
                  onChange={(e) => {
                    const v = e.target.value;
                    setHalfCustomStart(v);
                    if (v) {
                      const [h, m] = v.split(':').map(Number);
                      const dur = type === 'leave_half' ? 240 : type === 'leave_quarter' ? 120 : 60;
                      const endMin = h * 60 + m + dur;
                      if (endMin <= 24 * 60) {
                        const eh = Math.floor(endMin / 60);
                        const em = endMin % 60;
                        setHalfCustomEnd(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`);
                      }
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>종료 시간 *</Label>
                <Input
                  type="time"
                  value={halfCustomEnd}
                  onChange={(e) => setHalfCustomEnd(e.target.value)}
                />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                {type === 'leave_half' ? '반차는 4시간(240분)' : type === 'leave_quarter' ? '반반차는 2시간(120분)' : '1H연차는 1시간(60분)'} 단위로 신청해야 합니다.
              </p>
            </div>
          )}

          {/* 출발/도착 시간 (외근/출장/잔업/특근) */}
          {(needsTripFields || isOvertime || type === 'training') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>출발시간</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>도착시간</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          )}

          {/* 잔업/특근 시간 */}
          {isOvertime && (
            <div className="space-y-2">
              <Label>잔업/특근 시간 *</Label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(e.target.value)}
                placeholder="예) 2.5 (시간 단위)"
              />
              <p className="text-xs text-muted-foreground">
                관리자 화면에서 시간 수정 가능합니다.
              </p>
            </div>
          )}

          {startDate && (
            <div className="text-sm text-muted-foreground">
              총 <strong className="text-foreground">{calculatedDays}</strong>
              {type.startsWith('leave') ? '일' : '일간'}
            </div>
          )}

          {/* 장소/목적 (외근/출장/교육) */}
          {needsLocation && (
            <>
              <div className="space-y-2">
                <Label>장소 *</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="예) 부산 ABC고객사"
                />
              </div>
              <div className="space-y-2">
                <Label>목적</Label>
                <Input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="예) 제품 납품 회의"
                />
              </div>
            </>
          )}

          {/* 외근/출장 추가 필드 */}
          {needsTripFields && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>방문 거래처</Label>
                  <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="예) ABC조선소" />
                </div>
                <div className="space-y-2">
                  <Label>방문 지역 *</Label>
                  <Input
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="예) 울산광역시"
                    className={isNearAreaTrip ? 'border-destructive' : ''}
                  />
                  {isNearAreaTrip && (
                    <p className="text-xs text-destructive">
                      ⚠ {region}은 부산권입니다. 출장 대신 외근으로 변경 권장
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>사용 차량</Label>
                  <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="예) 법인차/대중교통/자차" />
                </div>
                <div className="space-y-2">
                  <Label>출발 위치</Label>
                  <Select value={departLocation} onValueChange={(v) => setDepartLocation(v as 'company' | 'other')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">회사 출발</SelectItem>
                      <SelectItem value="other">기타 (직접 입력)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {departLocation === 'other' && (
                <Input
                  value={departLocationDetail}
                  onChange={(e) => setDepartLocationDetail(e.target.value)}
                  placeholder="출발 위치를 입력하세요"
                />
              )}
            </>
          )}

          {/* 모성보호 - 영아 정보 */}
          {needsChildInfo && type !== 'birthday_early' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-pink-50 rounded-lg">
              <div className="space-y-2">
                <Label>영아 성명 (자녀명)</Label>
                <Input value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="자녀 이름" />
              </div>
              <div className="space-y-2">
                <Label>생년월일 / 출산예정일</Label>
                <Input type="date" value={childBirth} onChange={(e) => setChildBirth(e.target.value)} />
              </div>
            </div>
          )}

          {/* 생일자 조기퇴근 - 자녀 수 안내 */}
          {type === 'birthday_early' && (
            <div className="p-3 bg-pink-50 rounded-lg text-sm">
              <p className="font-medium mb-1">📌 생일자 조기퇴근 안내</p>
              <p className="text-xs text-muted-foreground">
                본인 또는 자녀의 생일에 4시간 단위로 조기퇴근 가능합니다.<br/>
                연 사용 한도는 자녀 수에 따라 달라지며, 인사팀에 등록된 가족정보를 기준으로 산정됩니다.
              </p>
            </div>
          )}

          {/* 동행자 (외근/출장만) */}
          {needsTripFields && companionCandidates.length > 0 && (
            <div className="space-y-2">
              <Label>동행자 (같은 본부)</Label>
              <Select value="" onValueChange={(v) => {
                if (v && !companions.includes(v)) setCompanions([...companions, v]);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="동행자 추가" />
                </SelectTrigger>
                <SelectContent>
                  {companionCandidates.filter((c) => !companions.includes(c.id)).map((c) => {
                    const dept = departments.find((d) => d.id === c.department_id);
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({dept?.name ?? ''})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {companions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {companions.map((cid) => {
                    const c = employees.find((e) => e.id === cid);
                    return (
                      <Badge key={cid} variant="secondary" className="gap-1">
                        {c?.name}
                        <button type="button" onClick={() => setCompanions(companions.filter((x) => x !== cid))} className="hover:text-destructive">×</button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">동행자도 같은 근태로 자동 반영됩니다.</p>
            </div>
          )}

          {/* 사유 */}
          <div className="space-y-2">
            <Label>사유 *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="상세 사유를 입력해주세요 (필수)"
              rows={3}
            />
          </div>

          {/* 비고 */}
          <div className="space-y-2">
            <Label>비고</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="추가 메모 (선택)"
              rows={2}
            />
          </div>

          {/* 첨부파일 */}
          <div className="space-y-2">
            <Label>증빙 첨부파일</Label>
            <Input
              type="file"
              onChange={(e) => setAttachmentName(e.target.files?.[0]?.name ?? '')}
              className="cursor-pointer"
            />
            {attachmentName && (
              <p className="text-xs text-muted-foreground">📎 {attachmentName}</p>
            )}
          </div>

          {/* 모성보호 안내 */}
          {selectedOption?.notifyHR && (
            <div className="p-3 bg-blue-50 rounded-lg text-xs text-muted-foreground">
              💡 본 신청은 인사팀에도 자동 안내됩니다. 본인/팀장/인사담당자만 조회 가능합니다.
            </div>
          )}

          {/* 결재 라인 미리보기 */}
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  결재 라인 {customLineEntries ? '(수동)' : '(자동)'}
                </span>
                {customLineEntries && (
                  <Badge variant="secondary" className="text-[10px]">변경됨</Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setLineEditorOpen(true)}
              >
                <Edit className="h-3 w-3 mr-1" />
                결재라인 변경
              </Button>
            </div>
            {lineEntries.length === 0 ? (
              <p className="text-xs text-destructive">결재자를 찾을 수 없습니다. &quot;결재라인 변경&quot;을 눌러 직접 추가하세요.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {requester.name} (신청)
                </Badge>
                {lineEntries.map((entry, idx) => {
                  const a = entry.employee;
                  const rank = positionRanks.find((r) => r.id === a.position_rank_id);
                  const roleLabel = entry.lineType === 'agreement' ? '합의' : entry.lineType === 'cc' ? '참조' : '결재';
                  const roleColor = entry.lineType === 'agreement' ? 'bg-amber-50 text-amber-700' : entry.lineType === 'cc' ? 'bg-slate-50 text-slate-500' : '';
                  return (
                    <div key={a.id} className="flex items-center gap-2">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge className={`text-xs ${roleColor}`}>
                        {a.name} ({rank?.name ?? ''})
                        <span className="ml-1 text-[10px] opacity-70">{roleLabel}</span>
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={lineEntries.filter((e) => e.lineType === 'approval').length === 0}>
            <FileCheck className="h-4 w-4 mr-2" />
            결재 요청
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* 결재라인 변경 다이얼로그 */}
      <ApprovalLineEditor
        open={lineEditorOpen}
        onOpenChange={setLineEditorOpen}
        value={lineEntries}
        onChange={handleLineChange}
        requester={requester}
        employees={employees}
        positionRanks={positionRanks}
        departments={departments}
      />
    </Dialog>
  );
}
