'use client';

import { useState, useMemo } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { useAuditLogStore } from '@/lib/stores/audit-log-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Eye,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  Download,
  CheckCircle,
  XCircle,
  Activity,
  Users,
  FileText,
  MousePointerClick,
} from 'lucide-react';
import type { AuditActionType } from '@/types';

const ACTION_LABELS: Record<AuditActionType, string> = {
  page_view: '페이지 조회',
  create: '생성',
  update: '수정',
  delete: '삭제',
  login: '로그인',
  logout: '로그아웃',
  export: '내보내기',
  approve: '승인',
  reject: '반려',
};

const ACTION_ICONS: Record<AuditActionType, React.ReactNode> = {
  page_view: <Eye className="h-3.5 w-3.5" />,
  create: <Plus className="h-3.5 w-3.5" />,
  update: <Pencil className="h-3.5 w-3.5" />,
  delete: <Trash2 className="h-3.5 w-3.5" />,
  login: <LogIn className="h-3.5 w-3.5" />,
  logout: <LogOut className="h-3.5 w-3.5" />,
  export: <Download className="h-3.5 w-3.5" />,
  approve: <CheckCircle className="h-3.5 w-3.5" />,
  reject: <XCircle className="h-3.5 w-3.5" />,
};

const ACTION_VARIANTS: Record<AuditActionType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  page_view: 'secondary',
  create: 'default',
  update: 'outline',
  delete: 'destructive',
  login: 'default',
  logout: 'secondary',
  export: 'outline',
  approve: 'default',
  reject: 'destructive',
};

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  hr_manager: '인사담당',
  dept_manager: '부서장',
  employee: '사원',
};

export default function AuditLogPage() {
  const logs = useAuditLogStore((s) => s.logs);
  const clearLogs = useAuditLogStore((s) => s.clearLogs);

  const [searchUser, setSearchUser] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (searchUser && !log.user_name.includes(searchUser)) return false;
      if (filterAction !== 'all' && log.action_type !== filterAction) return false;
      if (startDate && log.timestamp < new Date(startDate).toISOString()) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        if (log.timestamp >= end.toISOString()) return false;
      }
      return true;
    });
  }, [logs, searchUser, filterAction, startDate, endDate]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPageViews = logs.filter(
    (l) => l.action_type === 'page_view' && l.timestamp.startsWith(todayStr)
  ).length;
  const todayActions = logs.filter(
    (l) => l.action_type !== 'page_view' && l.timestamp.startsWith(todayStr)
  ).length;
  const uniqueUsers = new Set(logs.map((l) => l.user_id)).size;

  return (
    <div>
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-6">감사로그</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">전체 로그</CardTitle>
            <div className="p-2 rounded-lg bg-accent-blue-subtle text-accent-blue">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">오늘 페이지 조회</CardTitle>
            <div className="p-2 rounded-lg bg-accent-green-subtle text-accent-green">
              <MousePointerClick className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayPageViews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">오늘 액션</CardTitle>
            <div className="p-2 rounded-lg bg-accent-purple-subtle text-accent-purple">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayActions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">접속 사용자</CardTitle>
            <div className="p-2 rounded-lg bg-accent-amber-subtle text-accent-amber">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label>사용자명</Label>
              <Input
                placeholder="이름 검색..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label>액션 유형</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {Object.entries(ACTION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>시작일</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label>종료일</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchUser('');
                setFilterAction('all');
                setStartDate('');
                setEndDate('');
              }}
            >
              필터 초기화
            </Button>
            <div className="ml-auto">
              <Button variant="destructive" size="sm" onClick={clearLogs}>
                전체 삭제
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">일시</TableHead>
                <TableHead className="w-[100px]">사용자</TableHead>
                <TableHead className="w-[90px]">역할</TableHead>
                <TableHead className="w-[120px]">액션</TableHead>
                <TableHead>대상</TableHead>
                <TableHead className="w-[130px]">IP 주소</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    감사로그가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {new Date(log.timestamp).toLocaleString('ko-KR')}
                    </TableCell>
                    <TableCell className="font-medium">{log.user_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {ROLE_LABELS[log.user_role] || log.user_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANTS[log.action_type]} className="gap-1">
                        {ACTION_ICONS[log.action_type]}
                        {ACTION_LABELS[log.action_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.target_label}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.ip_address ?? '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
