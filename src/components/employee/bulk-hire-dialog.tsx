'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { parseClipboard } from '@/components/grid/grid-paste';
import { bulkHire, type BulkHireRow } from '@/lib/actions/pipeline-actions';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import type { GridOption } from '@/components/grid/types';

const COLUMNS = ['성명', '이메일', '입사일', '부서', '직급', '직책', '고용형태', '휴대전화'] as const;

const EMPLOYMENT_BY_LABEL: Record<string, BulkHireRow['employmentType']> = {
  정규직: 'regular',
  계약직: 'contract',
  단시간: 'parttime',
  인턴: 'intern',
};

interface Parsed {
  row: BulkHireRow;
  raw: string[];
  errors: string[];
}

/**
 * 일괄 입사등록.
 *
 * 신입 명단은 거의 항상 엑셀로 옵니다. 그래서 화면도 엑셀 블록을 그대로 받고,
 * 사번은 자동 채번하며, 각 행마다 입사 프로세스를 함께 엽니다. 스무 명을 한
 * 사람씩 등록하고 스무 번 체크리스트를 만드는 일이 없도록 하기 위해서입니다.
 */
export function BulkHireDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const positionTitles = useEmployeeStore((s) => s.positionTitles);
  const reload = useEmployeeStore((s) => s.reload);

  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const options = useMemo(
    () => ({
      dept: departments.filter((d) => d.is_active).map<GridOption>((d) => ({ value: d.id, label: d.name })),
      rank: positionRanks.filter((r) => r.is_active).map<GridOption>((r) => ({ value: r.id, label: r.name })),
      title: positionTitles.filter((t) => t.is_active).map<GridOption>((t) => ({ value: t.id, label: t.name })),
    }),
    [departments, positionRanks, positionTitles],
  );

  const parsed = useMemo<Parsed[]>(() => {
    if (!text.trim()) return [];
    return parseClipboard(text).map((cells) => {
      const [name = '', email = '', hireDate = '', dept = '', rank = '', title = '', type = '', phone = ''] =
        cells.map((c) => c.trim());
      const errors: string[] = [];

      if (!name) errors.push('성명이 비어 있습니다.');
      if (!email) errors.push('이메일이 비어 있습니다.');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('이메일 형식이 아닙니다.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(hireDate)) errors.push('입사일은 YYYY-MM-DD 형식이어야 합니다.');

      const lookup = (list: GridOption[], value: string, label: string) => {
        if (!value) return null;
        const hit = list.find((o) => o.label === value);
        if (!hit) errors.push(`${label} '${value}'을(를) 찾을 수 없습니다.`);
        return hit?.value ?? null;
      };

      const departmentId = lookup(options.dept, dept, '부서');
      const positionRankId = lookup(options.rank, rank, '직급');
      const positionTitleId = lookup(options.title, title, '직책');

      let employmentType: BulkHireRow['employmentType'] = 'regular';
      if (type) {
        const hit = EMPLOYMENT_BY_LABEL[type];
        if (!hit) errors.push(`고용형태 '${type}'은(는) 정규직·계약직·단시간·인턴 중 하나여야 합니다.`);
        else employmentType = hit;
      }

      return {
        raw: cells,
        errors,
        row: { name, email, hireDate, departmentId, positionRankId, positionTitleId, employmentType, phone: phone || null },
      };
    });
  }, [text, options]);

  const okRows = parsed.filter((p) => p.errors.length === 0);
  const badRows = parsed.filter((p) => p.errors.length > 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await bulkHire(okRows.map((p) => p.row));
      if (!result.ok) {
        toast.error('일괄 등록에 실패했습니다.');
        return;
      }
      await reload();
      if (result.failed.length > 0) {
        toast.warning(
          `${result.created.length}명 등록, ${result.failed.length}명 실패 — ${result.failed[0].reason}`,
        );
      } else {
        toast.success(
          `${result.created.length}명을 등록하고 입사 프로세스를 열었습니다. (사번 ${result.created[0]?.employeeNumber} ~)`,
        );
      }
      setText('');
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>일괄 입사등록</DialogTitle>
          <DialogDescription>
            엑셀에서 명단을 복사해 아래에 붙여넣으세요. 사번은 자동으로 채번되고, 각 사원마다
            입사 프로세스가 함께 열립니다.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded border bg-muted/40 px-3 py-2 text-xs">
          <span className="font-semibold">열 순서</span>
          <span className="ml-2 font-mono">{COLUMNS.join(' · ')}</span>
          <p className="mt-1 text-muted-foreground">
            부서·직급·직책·고용형태는 한글 이름 그대로 쓰면 됩니다. 뒤쪽 열은 비워도 됩니다.
          </p>
        </div>

        <Textarea
          className="h-28 font-mono text-xs"
          placeholder={'김철수\tchulsoo.kim@daehan-at.co.kr\t2026-09-01\t생산팀\t사원\t팀원\t정규직\t010-1234-5678'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {parsed.length > 0 && (
          <>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                등록 가능 {okRows.length}명
              </span>
              {badRows.length > 0 && (
                <span className="flex items-center gap-1.5 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  오류 {badRows.length}명 — 등록하지 않습니다
                </span>
              )}
            </div>

            <div className="max-h-64 overflow-auto rounded border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {COLUMNS.map((c) => (
                      <th key={c} className="px-2 py-1.5 text-left font-semibold">
                        {c}
                      </th>
                    ))}
                    <th className="px-2 py-1.5 text-left font-semibold">확인</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((p, i) => (
                    <tr key={i} className={cn('border-t', p.errors.length > 0 && 'bg-red-50')}>
                      {COLUMNS.map((_, c) => (
                        <td key={c} className="whitespace-nowrap px-2 py-1">
                          {p.raw[c] ?? ''}
                        </td>
                      ))}
                      <td
                        className={cn(
                          'px-2 py-1',
                          p.errors.length > 0 ? 'text-destructive' : 'text-green-700',
                        )}
                      >
                        {p.errors[0] ?? '확인'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || okRows.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {okRows.length}명 등록
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
