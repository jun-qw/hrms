'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import type { Attendance } from '@/types';

interface AttendanceTableProps {
  records: Attendance[];
}

export function AttendanceTable({ records }: AttendanceTableProps) {
  const ATTENDANCE_STATUS = useCodeMap(CODE.ATTENDANCE_STATUS);
  const ATTENDANCE_TYPES = useCodeMap(CODE.ATTENDANCE_TYPES);
  const LEAVE_TIME_PERIODS = useCodeMap(CODE.LEAVE_TIME_PERIODS);

  const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'normal': return 'default';
      case 'late': return 'destructive';
      case 'early_leave': return 'secondary';
      case 'absent': return 'destructive';
      case 'holiday': return 'outline';
      case 'leave': return 'secondary';
      case 'half_day': return 'secondary';
      case 'quarter_day': return 'outline';
      default: return 'outline';
    }
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const getTypeLabel = (code: string | undefined) => {
    if (!code) return null;
    return ATTENDANCE_TYPES[code] ?? code;
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>날짜</TableHead>
            <TableHead>이름</TableHead>
            <TableHead>근태유형</TableHead>
            <TableHead>근무시간대</TableHead>
            <TableHead>출근</TableHead>
            <TableHead>퇴근</TableHead>
            <TableHead>근무시간</TableHead>
            <TableHead>연장근무</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>비고</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                근태 기록이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            records.map((record) => {
              const typeCode = record.attendance_type;
              const typeLabel = getTypeLabel(typeCode);
              const isNonOffice = typeCode && typeCode !== 'office';
              const scheduleLabel = record.scheduled_start && record.scheduled_end
                ? `${record.scheduled_start}~${record.scheduled_end}`
                : null;
              const leavePeriodLabel = record.leave_time_period
                ? LEAVE_TIME_PERIODS[record.leave_time_period]
                : null;

              return (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.date}</TableCell>
                  <TableCell>{record.employee?.name ?? '-'}</TableCell>
                  <TableCell>
                    {isNonOffice ? (
                      <Badge variant="outline" className="text-xs">
                        {typeLabel}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">{typeLabel ?? '사무실 출근'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground font-mono">
                      {scheduleLabel ?? '-'}
                    </span>
                  </TableCell>
                  <TableCell>{formatTime(record.clock_in)}</TableCell>
                  <TableCell>{formatTime(record.clock_out)}</TableCell>
                  <TableCell>{record.work_hours ? `${record.work_hours}시간` : '-'}</TableCell>
                  <TableCell>{record.overtime_hours > 0 ? `${record.overtime_hours}시간` : '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge variant={statusVariant(record.status)} className="text-xs">
                        {ATTENDANCE_STATUS[record.status] ?? record.status}
                      </Badge>
                      {leavePeriodLabel && (
                        <Badge variant="outline" className="text-xs">
                          {leavePeriodLabel}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="text-sm text-muted-foreground">{record.note ?? ''}</span>
                      {(record.location || record.purpose) && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {record.location && <span>{record.location}</span>}
                          {record.location && record.purpose && <span> / </span>}
                          {record.purpose && <span>{record.purpose}</span>}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
