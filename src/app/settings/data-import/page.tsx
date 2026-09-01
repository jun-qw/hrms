'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useAttendanceStore } from '@/lib/stores/attendance-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { buildTemplate, parseWorkbook, type ParsedWorkbook } from '@/lib/excel/initial-import';
import {
  importInitialData,
  wipeAllData,
  linkUserToEmployeeByEmail,
  type InitialImportResult,
} from '@/lib/actions/data-import-actions';

// Legacy demo stores still persisted in this browser — cleared on wipe so the
// customer starts fully clean.
const DEMO_STORAGE_KEYS = [
  'hrms-leave',
  'hrms-attendance',
  'hrms-payroll',
  'hrms-appointments',
  'hrms-approvals',
  'hrms-workflow',
  'hrms-issues',
  'hrms-audit-log',
  'hrms-audit-logs',
  'hrms-flex-schedule',
  'hrms-leave-plans',
  'hrms-notifications',
  'hrms-retirement',
  'hrms-attendance-modifications',
  'hrms-change-history',
  'hrms-codes',
  'hrms-employees',
];

export default function DataImportPage() {
  const { role } = useAuth();
  const reloadEmployees = useEmployeeStore((s) => s.reload);
  const reloadAttendance = useAttendanceStore((s) => s.reload);
  const updateCompany = useSettingsStore((s) => s.updateCompany);

  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<InitialImportResult | null>(null);
  const [wipeConfirm, setWipeConfirm] = useState('');
  const [wiping, setWiping] = useState(false);

  if (role !== 'admin') {
    return (
      <div>
        <Breadcrumb />
        <h1 className="text-2xl font-bold mb-4">데이터 가져오기</h1>
        <p className="text-muted-foreground">이 기능은 시스템 관리자만 사용할 수 있습니다.</p>
      </div>
    );
  }

  const handleDownloadTemplate = async () => {
    const blob = await buildTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'HRMS_초기설정_템플릿.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const p = await parseWorkbook(buffer);
      setParsed(p);
      if (p.errors.length > 0) {
        toast.warning(`검증 경고 ${p.errors.length}건 — 아래 내용을 확인하세요.`);
      }
    } catch (err) {
      console.error(err);
      toast.error('엑셀 파일을 읽을 수 없습니다. 템플릿 형식인지 확인하세요.');
      setParsed(null);
    }
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    try {
      const res = await importInitialData(parsed.payload);
      setResult(res);
      if (res.ok) {
        // Sync imported company info into the (still localStorage-based)
        // settings store so it shows immediately in the UI/printouts.
        const c = parsed.payload.company;
        updateCompany({
          name: c.name,
          business_number: c.business_number,
          ceo_name: c.ceo_name,
          address: c.address,
          industry: c.industry,
          phone: c.phone,
          fax: c.fax,
          website: c.website,
        });
        const linked = await linkUserToEmployeeByEmail();
        await reloadEmployees();
        toast.success(
          `가져오기 완료 — 사원 ${res.employees}명, 부서 ${res.departments}개` +
            (linked ? `, 계정 연결 ${linked}건` : ''),
        );
      } else {
        toast.error('가져오기에 실패했습니다.');
      }
    } finally {
      setImporting(false);
    }
  };

  const handleWipe = async () => {
    setWiping(true);
    try {
      const res = await wipeAllData();
      if (!res.ok) {
        toast.error(`초기화 실패: ${res.error ?? '알 수 없는 오류'}`);
        return;
      }
      for (const key of DEMO_STORAGE_KEYS) localStorage.removeItem(key);
      await Promise.all([reloadEmployees(), reloadAttendance()]);
      toast.success('모든 데이터가 초기화되었습니다.');
      setWipeConfirm('');
    } finally {
      setWiping(false);
    }
  };

  const counts = parsed
    ? {
        company: Object.keys(parsed.payload.company).length,
        departments: parsed.payload.departments.length,
        ranks: parsed.payload.ranks.length,
        titles: parsed.payload.titles.length,
        employees: parsed.payload.employees.length,
      }
    : null;

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <div>
        <h1 className="text-2xl font-bold">데이터 가져오기</h1>
        <p className="text-sm text-muted-foreground mt-1">
          신규 도입 시 회사정보·조직도·인사정보를 엑셀 한 파일로 일괄 등록합니다.
        </p>
      </div>

      {/* 1. Template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. 템플릿 다운로드</CardTitle>
          <CardDescription>
            회사정보 · 부서 · 직급 · 직책 · 사원 시트로 구성된 엑셀 템플릿을 내려받아 작성하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            엑셀 템플릿 다운로드
          </Button>
        </CardContent>
      </Card>

      {/* 2. Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. 파일 업로드 및 검증</CardTitle>
          <CardDescription>작성한 템플릿을 업로드하면 내용을 검증하고 미리 보여줍니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            data-testid="import-file-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            엑셀 파일 선택
          </Button>
          {fileName && <span className="ml-3 text-sm text-muted-foreground">{fileName}</span>}

          {counts && (
            <div className="rounded-md border p-4 text-sm space-y-2">
              <p className="font-medium">파일 내용</p>
              <ul className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-muted-foreground">
                <li>회사정보 {counts.company}항목</li>
                <li>부서 {counts.departments}개</li>
                <li>직급 {counts.ranks}개</li>
                <li>직책 {counts.titles}개</li>
                <li>사원 {counts.employees}명</li>
              </ul>
              {parsed && parsed.errors.length > 0 && (
                <div className="mt-2 rounded bg-amber-50 p-3 text-amber-800">
                  <p className="font-medium mb-1">검증 경고 ({parsed.errors.length}건)</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {parsed.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {parsed.errors.length > 10 && <li>외 {parsed.errors.length - 10}건...</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          {parsed && (
            <Button onClick={handleImport} disabled={importing} data-testid="import-execute">
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              가져오기 실행
            </Button>
          )}

          {result && result.ok && (
            <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-4 text-sm">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">가져오기 완료</p>
                <p className="text-green-700">
                  회사정보 {result.companyKeys}항목 · 부서 {result.departments}개 · 직급 {result.ranks}개 ·
                  직책 {result.titles}개 · 사원 {result.employees}명
                </p>
                {result.errors.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-amber-700">
                    {result.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            전체 데이터 초기화
          </CardTitle>
          <CardDescription>
            사원·조직·근태·휴가·급여·결재 등 모든 운영 데이터를 삭제합니다. 계정과 시스템 설정은
            유지됩니다. <strong>되돌릴 수 없습니다.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Input
            className="max-w-45"
            placeholder="'초기화'를 입력하세요"
            value={wipeConfirm}
            onChange={(e) => setWipeConfirm(e.target.value)}
            data-testid="wipe-confirm-input"
          />
          <Button
            variant="destructive"
            disabled={wipeConfirm !== '초기화' || wiping}
            onClick={handleWipe}
            data-testid="wipe-execute"
          >
            {wiping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            전체 데이터 삭제
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
