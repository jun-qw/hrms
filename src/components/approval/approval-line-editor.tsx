'use client';

import { useMemo, useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  Search,
  Users,
  ArrowRight,
  UserPlus,
  Handshake,
  Eye,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Employee, ApprovalLineType } from '@/types';

export interface ApprovalLineEntry {
  employee: Employee;
  lineType: ApprovalLineType;
}

interface ApprovalLineEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 현재 결재 라인 */
  value: ApprovalLineEntry[];
  /** 결재 라인 변경 완료 시 호출 */
  onChange: (entries: ApprovalLineEntry[]) => void;
  /** 신청자 정보 (표시용, 결재자에서 제외) */
  requester?: Employee | null;
  /** 선택 가능한 직원 목록 */
  employees: Employee[];
  positionRanks: { id: string; name: string; level: number }[];
  departments: { id: string; name: string }[];
}

const LINE_TYPE_OPTIONS: { value: ApprovalLineType; label: string; icon: typeof FileCheck; color: string }[] = [
  { value: 'approval', label: '결재', icon: FileCheck, color: 'text-blue-600 bg-blue-50' },
  { value: 'agreement', label: '합의', icon: Handshake, color: 'text-amber-600 bg-amber-50' },
  { value: 'cc', label: '참조', icon: Eye, color: 'text-slate-500 bg-slate-50' },
];

export function ApprovalLineEditor({
  open,
  onOpenChange,
  value,
  onChange,
  requester,
  employees,
  positionRanks,
  departments,
}: ApprovalLineEditorProps) {
  const [entries, setEntries] = useState<ApprovalLineEntry[]>(value);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [addLineType, setAddLineType] = useState<ApprovalLineType>('approval');

  useEffect(() => {
    if (open) {
      setEntries(value);
      setSearch('');
      setDeptFilter('all');
      setAddLineType('approval');
    }
  }, [open, value]);

  const requesterId = requester?.id;
  const selectedIds = new Set(entries.map((e) => e.employee.id));

  const candidates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return employees
      .filter((e) => {
        if (e.status !== 'active') return false;
        if (e.id === requesterId) return false;
        if (selectedIds.has(e.id)) return false;
        if (deptFilter !== 'all' && e.department_id !== deptFilter) return false;
        if (normalizedSearch) {
          const rank = positionRanks.find((r) => r.id === e.position_rank_id)?.name ?? '';
          const dept = departments.find((d) => d.id === e.department_id)?.name ?? '';
          const hay = `${e.name} ${rank} ${dept} ${e.employee_number}`.toLowerCase();
          if (!hay.includes(normalizedSearch)) return false;
        }
        return true;
      })
      .slice(0, 30);
  }, [employees, requesterId, selectedIds, search, deptFilter, positionRanks, departments]);

  const allDepartments = useMemo(() => {
    const unique = new Map<string, { id: string; name: string }>();
    for (const d of departments) unique.set(d.id, d);
    return Array.from(unique.values());
  }, [departments]);

  const getRankName = (rankId: string | null) =>
    rankId ? positionRanks.find((r) => r.id === rankId)?.name ?? '-' : '-';
  const getDeptName = (deptId: string | null) =>
    deptId ? departments.find((d) => d.id === deptId)?.name ?? '-' : '-';

  const addEntry = (emp: Employee) => {
    setEntries((prev) => [...prev, { employee: emp, lineType: addLineType }]);
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.employee.id !== id));
  };

  const changeLineType = (id: string, lineType: ApprovalLineType) => {
    setEntries((prev) =>
      prev.map((e) => (e.employee.id === id ? { ...e, lineType } : e)),
    );
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setEntries((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx: number) => {
    setEntries((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const handleSave = () => {
    const approvalCount = entries.filter((e) => e.lineType === 'approval').length;
    if (approvalCount === 0) {
      toast.error('최소 1명 이상의 결재자가 필요합니다.');
      return;
    }
    onChange(entries);
    onOpenChange(false);
    toast.success('결재 라인이 변경되었습니다.');
  };

  const getLineTypeOption = (t: ApprovalLineType) => LINE_TYPE_OPTIONS.find((o) => o.value === t)!;

  // 그룹별 카운트
  const agreementCount = entries.filter((e) => e.lineType === 'agreement').length;
  const approvalCount = entries.filter((e) => e.lineType === 'approval').length;
  const ccCount = entries.filter((e) => e.lineType === 'cc').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            결재 라인 설정
          </DialogTitle>
          <DialogDescription>
            결재자, 합의자, 참조자를 설정합니다. 합의가 모두 완료되어야 최종결재가 가능하고, 참조자는 최종결재 후 열람합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 현재 결재 라인 요약 */}
          <div className="flex items-center gap-3 text-xs">
            <Badge variant="outline" className="gap-1">
              <Handshake className="h-3 w-3 text-amber-600" />
              합의 {agreementCount}명
            </Badge>
            <Badge variant="outline" className="gap-1">
              <FileCheck className="h-3 w-3 text-blue-600" />
              결재 {approvalCount}명
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Eye className="h-3 w-3 text-slate-400" />
              참조 {ccCount}명
            </Badge>
          </div>

          {/* 미리보기 */}
          <div className="p-3 rounded-lg border bg-muted/30">
            <span className="text-xs font-medium mb-2 block">결재 흐름 미리보기</span>
            {entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">결재자를 추가해주세요.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {requester && (
                  <Badge variant="outline" className="text-xs">{requester.name} (신청)</Badge>
                )}
                {entries.map((e, idx) => {
                  const opt = getLineTypeOption(e.lineType);
                  const Icon = opt.icon;
                  return (
                    <div key={e.employee.id} className="flex items-center gap-1.5">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge className={`text-xs gap-1 ${opt.color}`}>
                        <Icon className="h-2.5 w-2.5" />
                        {e.employee.name}
                        <span className="text-[9px] opacity-70">({opt.label})</span>
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 선택된 결재 라인 (역할 변경/순서/삭제) */}
          {entries.length > 0 && (
            <div className="border rounded-lg divide-y">
              {entries.map((entry, idx) => {
                const opt = getLineTypeOption(entry.lineType);
                return (
                  <div key={entry.employee.id} className="flex items-center gap-2 p-2.5">
                    <Badge variant="secondary" className="h-6 w-6 justify-center text-xs shrink-0">
                      {idx + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {entry.employee.name}{' '}
                        <span className="text-xs text-muted-foreground font-normal">
                          {getRankName(entry.employee.position_rank_id)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getDeptName(entry.employee.department_id)}
                      </p>
                    </div>
                    {/* 역할 변경 */}
                    <Select
                      value={entry.lineType}
                      onValueChange={(v) => changeLineType(entry.employee.id, v as ApprovalLineType)}
                    >
                      <SelectTrigger className="w-[90px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LINE_TYPE_OPTIONS.map((o) => {
                          const LIcon = o.icon;
                          return (
                            <SelectItem key={o.value} value={o.value}>
                              <span className="flex items-center gap-1">
                                <LIcon className={`h-3 w-3 ${o.color.split(' ')[0]}`} />
                                {o.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {/* 순서/삭제 */}
                    <div className="flex items-center gap-0.5">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveUp(idx)} disabled={idx === 0}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveDown(idx)} disabled={idx === entries.length - 1}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeEntry(entry.employee.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 결재자 추가 */}
          <div className="border rounded-lg">
            <div className="p-2.5 border-b bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="h-4 w-4" />
                <span className="text-sm font-medium">결재자 추가</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="이름, 직급, 부서..."
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 부서</SelectItem>
                    {allDepartments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={addLineType} onValueChange={(v) => setAddLineType(v as ApprovalLineType)}>
                  <SelectTrigger className="w-[90px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINE_TYPE_OPTIONS.map((o) => {
                      const LIcon = o.icon;
                      return (
                        <SelectItem key={o.value} value={o.value}>
                          <span className="flex items-center gap-1">
                            <LIcon className={`h-3 w-3 ${o.color.split(' ')[0]}`} />
                            {o.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="h-[200px]">
              {candidates.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {search || deptFilter !== 'all' ? '검색 결과가 없습니다.' : '추가 가능한 직원이 없습니다.'}
                </div>
              ) : (
                <div className="divide-y">
                  {candidates.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center gap-2 p-2.5 hover:bg-muted/50 cursor-pointer"
                      onClick={() => addEntry(emp)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {emp.name}{' '}
                          <span className="text-xs text-muted-foreground font-normal">
                            {getRankName(emp.position_rank_id)}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {getDeptName(emp.department_id)}
                        </p>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* 규칙 안내 */}
          <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-lg bg-muted/30">
            <p><strong>결재</strong>: 순서대로 승인합니다. 모든 합의가 완료된 후에 결재 가능합니다.</p>
            <p><strong>합의</strong>: 관련 부서의 동의를 받습니다. 합의가 모두 완료되어야 최종결재가 진행됩니다.</p>
            <p><strong>참조</strong>: 최종결재가 완료되면 문서를 열람할 수 있습니다. 승인/반려 권한은 없습니다.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
