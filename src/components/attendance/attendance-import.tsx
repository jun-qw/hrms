'use client';

/**
 * 근태 일괄 등록.
 *
 * 근태기기에서 뽑은 표를 통째로 붙여넣습니다. 직원은 **휴대폰 번호**로 찾습니다 —
 * 근태 자료에는 사원번호가 없기 때문입니다.
 *
 * 저장 전에 반드시 미리보기를 거칩니다. 200줄을 한 번에 넣는 기능이라 잘못
 * 들어가면 어디가 틀렸는지 찾기 어렵고, 근태는 그대로 급여가 됩니다.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  importAttendanceRows,
  fetchPhoneGaps,
  type ImportRow,
  type ImportPreview,
  type ResolvedRow,
} from '@/lib/actions/attendance-import-actions';
import {
  parseSheet,
  parseDate,
  parseClock,
  parseHours,
  parseStatus,
  type ImportField,
  type ParsedSheet,
} from '@/lib/attendance/import-parse';

const FIELD_LABEL: Record<ImportField, string> = {
  phone: '휴대폰 번호',
  name: '성명 (대조용)',
  date: '날짜',
  clockIn: '출근',
  clockOut: '퇴근',
  workHours: '실근로시간',
  overtimeHours: '연장시간',
  status: '근태구분',
  note: '비고',
};

const STATUS_LABEL: Record<string, string> = {
  normal: '정상', late: '지각', early_leave: '조퇴', absent: '결근',
  holiday: '휴일', leave: '휴가', half_day: '반차', quarter_day: '반반차',
};

const SAMPLE = `휴대폰번호\t성명\t날짜\t출근\t퇴근
010-1234-5678\t홍길동\t2026-09-01\t08:00\t17:00
010-1234-5678\t홍길동\t2026-09-02\t08:00\t19:00`;

interface Props {
  year: number;
}

export function AttendanceImport({ year }: Props) {
  const [raw, setRaw] = useState('');
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<ImportField, number>>>({});
  const [deductBreak, setDeductBreak] = useState(true);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [gaps, setGaps] = useState<{
    missing: { id: string; name: string; employee_number: string }[];
    duplicated: { phone: string; names: string[] }[];
  } | null>(null);

  useEffect(() => { fetchPhoneGaps().then(setGaps); }, []);

  const readSheet = useCallback((text: string) => {
    setRaw(text);
    setPreview(null);
    if (!text.trim()) { setSheet(null); setMapping({}); return; }
    const parsed = parseSheet(text);
    setSheet(parsed);
    setMapping(parsed.mapping);
  }, []);

  /** 붙여넣은 표를 서버가 받을 형태로. 시간 계산은 여기서 끝냅니다. */
  const rows = useMemo<ImportRow[]>(() => {
    if (!sheet || mapping.phone === undefined || mapping.date === undefined) return [];
    const at = (r: string[], f: ImportField) => {
      const i = mapping[f];
      return i === undefined ? '' : (r[i] ?? '');
    };
    const offset = sheet.hasHeader ? 2 : 1;

    return sheet.rows.map((r, idx) => {
      let hours = parseHours(at(r, 'workHours'));
      if (hours === null) {
        // 출퇴근만 있으면 시간을 계산합니다. 자정을 넘긴 야간근무는 다음 날로 봅니다.
        const a = parseClock(at(r, 'clockIn'));
        const b = parseClock(at(r, 'clockOut'));
        if (a !== null && b !== null) {
          const span = (b >= a ? b - a : b + 24 * 60 - a) / 60;
          // 근로기준법 제54조 — 8시간 넘게 일하면 1시간, 4시간 넘으면 30분 휴게.
          const brk = deductBreak ? (span >= 8 ? 1 : span >= 4 ? 0.5 : 0) : 0;
          hours = Math.round((span - brk) * 100) / 100;
        }
      }
      return {
        line: idx + offset,
        phone: at(r, 'phone').trim(),
        name: at(r, 'name').trim() || null,
        date: parseDate(at(r, 'date'), year) ?? '',
        workHours: hours,
        overtimeHours: parseHours(at(r, 'overtimeHours')),
        status: parseStatus(at(r, 'status')),
        note: at(r, 'note').trim() || null,
      };
    });
  }, [sheet, mapping, deductBreak, year]);

  const ready = mapping.phone !== undefined && mapping.date !== undefined && rows.length > 0;

  const run = async (commit: boolean) => {
    setBusy(true);
    try {
      const result = await importAttendanceRows(rows, commit);
      setPreview(result);
      if (!result.ok) { toast.error('처리하지 못했습니다.'); return; }
      if (commit) {
        toast.success(`${result.saved ?? 0}건을 저장했습니다.`);
      } else if (result.summary.오류 > 0) {
        toast.warning(`${result.summary.오류}줄에 문제가 있습니다. 아래에서 확인하세요.`);
      } else {
        toast.success(`${result.summary.total}줄 모두 확인했습니다.`);
      }
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    // CSV 는 쉼표로 나뉘어 있습니다. 붙여넣기와 같은 형태로 맞춥니다.
    readSheet(file.name.toLowerCase().endsWith('.csv')
      ? text.split(/\r?\n/).map((l) => l.split(',').join('\t')).join('\n')
      : text);
  };

  const badRows = preview?.rows.filter((r) => r.verdict === 'error') ?? [];
  const okRows = preview?.rows.filter((r) => r.verdict !== 'error') ?? [];

  return (
    <div className="space-y-4">
      {/* 휴대폰 번호 점검 — 번호가 없으면 그 사람 근태는 영영 안 들어옵니다. */}
      {gaps && (gaps.missing.length > 0 || gaps.duplicated.length > 0) && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex gap-3 pt-5 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="space-y-1.5">
              <p className="font-semibold text-amber-900">
                휴대폰 번호를 먼저 정리하세요. 번호가 없거나 겹치면 그 사람의 근태는 들어오지 않습니다.
              </p>
              {gaps.missing.length > 0 && (
                <p className="text-amber-800">
                  <strong>미등록 {gaps.missing.length}명</strong> —{' '}
                  {gaps.missing.slice(0, 8).map((m) => m.name).join(', ')}
                  {gaps.missing.length > 8 && ` 외 ${gaps.missing.length - 8}명`}
                </p>
              )}
              {gaps.duplicated.map((d) => (
                <p key={d.phone} className="text-amber-800">
                  <strong>번호 중복</strong> — {d.names.join(' · ')} 이 {d.phone} 를 함께 쓰고 있습니다.
                  누구 근태인지 판정할 수 없습니다.
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1. 자료 넣기 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. 근태 자료 붙여넣기</CardTitle>
          <p className="text-xs text-muted-foreground">
            근태기기나 엑셀에서 표를 통째로 복사해 아래에 붙여넣습니다. 직원은{' '}
            <strong>휴대폰 번호</strong>로 찾습니다 — 근태 자료에는 사원번호가 없기 때문입니다.
            머리글이 있으면 열을 알아서 찾고, 틀리면 아래에서 바꿀 수 있습니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={raw}
            onChange={(e) => readSheet(e.target.value)}
            placeholder={SAMPLE}
            spellCheck={false}
            className="h-40 w-full resize-y rounded-md border border-input bg-white p-3 font-mono text-xs
                       placeholder:text-muted-foreground/60 focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
              <Upload className="h-3.5 w-3.5" />
              <span className="underline underline-offset-2">파일에서 가져오기 (CSV · TSV)</span>
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
              />
            </label>
            {raw && (
              <Button variant="ghost" size="sm" onClick={() => readSheet('')}>
                지우기
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. 열 맞추기 */}
      {sheet && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              2. 열 맞추기
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {sheet.rows.length}줄 · {sheet.headers.length}열
                {sheet.hasHeader ? ' · 머리글 인식됨' : ' · 머리글 없음'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {(Object.keys(FIELD_LABEL) as ImportField[]).map((f) => (
                <div key={f} className="space-y-1">
                  <Label className="text-xs">
                    {FIELD_LABEL[f]}
                    {(f === 'phone' || f === 'date') && <span className="ml-0.5 text-red-600">*</span>}
                  </Label>
                  <Select
                    value={mapping[f] === undefined ? 'none' : String(mapping[f])}
                    onValueChange={(v) =>
                      setMapping((m) => {
                        const next = { ...m };
                        if (v === 'none') delete next[f]; else next[f] = Number(v);
                        return next;
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— 없음</SelectItem>
                      {sheet.headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>{h || `${i + 1}열`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex items-start justify-between gap-4 rounded-md bg-muted/40 p-3">
              <div className="text-xs">
                <p className="font-medium">출퇴근 시각에서 휴게시간 빼기</p>
                <p className="text-muted-foreground">
                  실근로시간 열이 없을 때만 씁니다. 근로기준법 제54조에 따라 8시간 넘으면 1시간,
                  4시간 넘으면 30분을 뺍니다. 근태기기가 이미 휴게를 뺀 값을 준다면 끄세요.
                </p>
              </div>
              <Switch checked={deductBreak} onCheckedChange={setDeductBreak} />
            </div>

            {!ready && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <XCircle className="h-3.5 w-3.5" />
                휴대폰 번호와 날짜 열은 반드시 지정해야 합니다.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button onClick={() => run(false)} disabled={!ready || busy}>
                확인하기
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. 결과 */}
      {preview && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3. 확인 결과</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-800">
                신규 {preview.summary.신규}
              </Badge>
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                수정 {preview.summary.수정}
              </Badge>
              <Badge variant="outline">변화없음 {preview.summary.동일}</Badge>
              {preview.summary.오류 > 0 && (
                <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
                  오류 {preview.summary.오류}
                </Badge>
              )}
            </div>

            {preview.saved !== undefined && (
              <p className="flex items-center gap-1.5 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                {preview.saved}건을 저장했습니다. 근태대장에서 확인할 수 있습니다.
              </p>
            )}

            {badRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-red-700">
                  문제가 있는 {badRows.length}줄 — 이 줄은 저장하지 않습니다
                </p>
                <div className="max-h-56 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/60">
                      <TableRow>
                        <TableHead className="w-16">줄</TableHead>
                        <TableHead className="w-40">휴대폰</TableHead>
                        <TableHead className="w-28">날짜</TableHead>
                        <TableHead>사유</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {badRows.slice(0, 200).map((r) => (
                        <TableRow key={`${r.line}-${r.phone}`}>
                          <TableCell className="font-mono text-xs">{r.line}</TableCell>
                          <TableCell className="font-mono text-xs">{r.phone || '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{r.date || '—'}</TableCell>
                          <TableCell className="text-xs text-red-700">{r.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {okRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">들어갈 {okRows.length}줄 (앞 100줄)</p>
                <div className="max-h-72 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/60">
                      <TableRow>
                        <TableHead className="w-16">줄</TableHead>
                        <TableHead className="w-24">구분</TableHead>
                        <TableHead className="w-32">직원</TableHead>
                        <TableHead className="w-28">날짜</TableHead>
                        <TableHead className="w-24 text-right">실근로</TableHead>
                        <TableHead className="w-24 text-right">연장</TableHead>
                        <TableHead className="w-20">근태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {okRows.slice(0, 100).map((r) => (
                        <RowLine key={`${r.line}-${r.employeeId}`} row={r} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {preview.saved === undefined && (
              <div className="flex items-center justify-between gap-4 border-t pt-4">
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  저장하면 같은 사람·같은 날짜의 기존 기록은 덮어씁니다. 문제가 있는 줄은 건너뜁니다.
                </p>
                <Button
                  onClick={() => run(true)}
                  disabled={busy || preview.summary.신규 + preview.summary.수정 === 0}
                >
                  {preview.summary.신규 + preview.summary.수정}건 저장
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RowLine({ row }: { row: ResolvedRow }) {
  const tone =
    row.verdict === 'new' ? 'text-blue-700'
    : row.verdict === 'update' ? 'text-amber-700'
    : 'text-muted-foreground';
  const label = row.verdict === 'new' ? '신규' : row.verdict === 'update' ? '수정' : '변화없음';

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{row.line}</TableCell>
      <TableCell className={`text-xs font-medium ${tone}`}>{label}</TableCell>
      <TableCell className="text-xs">
        {row.employeeName}
        {row.nameMismatch && (
          <span className="ml-1 text-amber-700" title="자료의 이름과 다릅니다">
            (자료: {row.nameMismatch})
          </span>
        )}
      </TableCell>
      <TableCell className="font-mono text-xs">{row.date}</TableCell>
      <TableCell className="text-right font-mono text-xs">
        {row.workHours === null ? '—' : `${row.workHours}h`}
      </TableCell>
      <TableCell className="text-right font-mono text-xs">
        {row.overtimeHours ? `${row.overtimeHours}h` : '—'}
      </TableCell>
      <TableCell className="text-xs">{STATUS_LABEL[row.status] ?? row.status}</TableCell>
    </TableRow>
  );
}
