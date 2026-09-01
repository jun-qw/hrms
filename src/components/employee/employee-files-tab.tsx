'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Upload,
  Trash2,
  Loader2,
  FileText,
  Download,
  ExternalLink,
  ImagePlus,
  Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/hooks/use-auth';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import {
  listEmployeeDocuments,
  uploadEmployeeFile,
  deleteEmployeeFile,
} from '@/lib/actions/employee-document-actions';
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_CATEGORIES,
  MAX_DOCUMENT_BYTES,
  MAX_PHOTO_BYTES,
  PHOTO_ACCEPT,
  employeeDocumentUrl,
  formatFileSize,
  type EmployeeDocumentMeta,
  type UploadErrorCode,
} from '@/lib/employee-files';

const UPLOAD_ERRORS: Record<UploadErrorCode, string> = {
  forbidden: '권한이 없습니다.',
  too_large: '파일 용량이 제한을 초과했습니다.',
  unsupported_type: '지원하지 않는 파일 형식입니다.',
  not_found: '사원 정보를 찾을 수 없습니다.',
  server_error: '업로드에 실패했습니다.',
};

/** Strips the data URL prefix a FileReader result carries. */
function splitDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  return m ? { mime: m[1], base64: m[2] } : null;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function fmtDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR');
}

export function EmployeeFilesTab({ employeeId }: { employeeId: string }) {
  const { role, employeeId: myEmployeeId } = useAuth();
  const employee = useEmployeeStore((s) => s.employees.find((e) => e.id === employeeId));
  const updateEmployeeLocal = useEmployeeStore((s) => s.updateEmployee);

  const [files, setFiles] = useState<EmployeeDocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDoc, setPendingDoc] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<string>(DOCUMENT_CATEGORIES[0]);

  const photoInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);

  const isHr = role === 'admin' || role === 'hr_manager';
  const isSelf = myEmployeeId === employeeId;
  const canManagePhoto = isHr || isSelf;
  const canManageDocuments = isHr;

  const refresh = useCallback(async () => {
    const rows = await listEmployeeDocuments(employeeId);
    setFiles(rows);
    setLoading(false);
  }, [employeeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const photo = files.find((f) => f.kind === 'photo');
  const documents = files.filter((f) => f.kind === 'document');

  const handlePhoto = async (file: File) => {
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error(`사진은 ${formatFileSize(MAX_PHOTO_BYTES)} 이하만 등록할 수 있습니다.`);
      return;
    }
    setBusy(true);
    try {
      const parts = splitDataUrl(await readAsDataUrl(file));
      if (!parts) {
        toast.error('파일을 읽을 수 없습니다.');
        return;
      }
      const result = await uploadEmployeeFile({
        employeeId,
        kind: 'photo',
        base64: parts.base64,
        mimeType: parts.mime,
        fileName: file.name,
      });
      if (!result.ok) {
        toast.error(UPLOAD_ERRORS[result.error ?? 'server_error']);
        return;
      }
      // Keeps every avatar in the app (lists, org chart) in step immediately.
      if (result.photoUrl !== undefined) {
        updateEmployeeLocal(employeeId, { profile_image_url: result.photoUrl });
      }
      await refresh();
      toast.success('사진이 등록되었습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleDocumentSubmit = async () => {
    if (!pendingDoc) return;
    if (pendingDoc.size > MAX_DOCUMENT_BYTES) {
      toast.error(`서류는 ${formatFileSize(MAX_DOCUMENT_BYTES)} 이하만 등록할 수 있습니다.`);
      return;
    }
    setBusy(true);
    try {
      const parts = splitDataUrl(await readAsDataUrl(pendingDoc));
      if (!parts) {
        toast.error('파일을 읽을 수 없습니다.');
        return;
      }
      const result = await uploadEmployeeFile({
        employeeId,
        kind: 'document',
        base64: parts.base64,
        mimeType: parts.mime,
        fileName: pendingDoc.name,
        title: docTitle.trim() || pendingDoc.name,
        category: docCategory,
      });
      if (!result.ok) {
        toast.error(UPLOAD_ERRORS[result.error ?? 'server_error']);
        return;
      }
      await refresh();
      setDialogOpen(false);
      setPendingDoc(null);
      setDocTitle('');
      toast.success('서류가 등록되었습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (file: EmployeeDocumentMeta) => {
    if (!confirm(`'${file.title ?? file.file_name}'을(를) 삭제하시겠습니까?`)) return;
    setBusy(true);
    try {
      const result = await deleteEmployeeFile(file.id);
      if (!result.ok) {
        toast.error('삭제에 실패했습니다.');
        return;
      }
      if (result.photoCleared) {
        updateEmployeeLocal(employeeId, { profile_image_url: null });
      }
      await refresh();
      toast.success('삭제되었습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Photo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImagePlus className="h-4 w-4" />
            증명사진
          </CardTitle>
          <CardDescription>
            JPG, PNG, WEBP · 최대 {formatFileSize(MAX_PHOTO_BYTES)}. 인사기록카드와 사원 목록에
            표시됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-start gap-6">
          <div className="flex h-40 w-32 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
            {employee?.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- served from a DB route
              <img
                src={employee.profile_image_url}
                alt={`${employee.name} 증명사진`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs text-muted-foreground">사진 없음</span>
            )}
          </div>

          {canManagePhoto ? (
            <div className="space-y-2">
              <input
                ref={photoInput}
                type="file"
                accept={PHOTO_ACCEPT}
                className="hidden"
                data-testid="employee-photo-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handlePhoto(f);
                  e.target.value = '';
                }}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => photoInput.current?.click()}
                >
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  사진 {photo ? '변경' : '등록'}
                </Button>
                {photo && (
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => void handleDelete(photo)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </Button>
                )}
              </div>
              {photo && (
                <p className="text-xs text-muted-foreground">
                  {photo.file_name} · {formatFileSize(photo.byte_size)} · {fmtDate(photo.created_at)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">사진은 본인 또는 인사담당자만 변경할 수 있습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              첨부 서류 ({documents.length})
            </CardTitle>
            <CardDescription>
              근로계약서, 자격증 사본 등 원본 서류를 PDF로 보관합니다 · 최대{' '}
              {formatFileSize(MAX_DOCUMENT_BYTES)}
            </CardDescription>
          </div>
          {canManageDocuments && (
            <Button
              size="sm"
              onClick={() => {
                setPendingDoc(null);
                setDocTitle('');
                setDocCategory(DOCUMENT_CATEGORIES[0]);
                setDialogOpen(true);
              }}
              data-testid="employee-document-add"
            >
              <Upload className="mr-2 h-4 w-4" />
              서류 등록
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>구분</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>파일</TableHead>
                  <TableHead className="text-right">크기</TableHead>
                  <TableHead>등록자</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead className="w-32 text-right">보기</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      불러오는 중...
                    </TableCell>
                  </TableRow>
                ) : documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      등록된 서류가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {d.category ?? '기타'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{d.title ?? d.file_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {d.file_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs">{formatFileSize(d.byte_size)}</TableCell>
                      <TableCell className="text-xs">{d.uploaded_by_name ?? '-'}</TableCell>
                      <TableCell className="text-xs">{fmtDate(d.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <a href={employeeDocumentUrl(d.id)} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="icon" title="새 창에서 보기">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                          <a href={`${employeeDocumentUrl(d.id)}?download=1`}>
                            <Button variant="ghost" size="icon" title="내려받기">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                          {canManageDocuments && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="삭제"
                              disabled={busy}
                              onClick={() => void handleDelete(d)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Upload dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>서류 등록</DialogTitle>
            <DialogDescription>
              PDF 또는 이미지 파일을 선택하고 구분과 제목을 지정하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="doc-category">구분</Label>
              <Select value={docCategory} onValueChange={setDocCategory}>
                <SelectTrigger id="doc-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-title">제목</Label>
              <Input
                id="doc-title"
                value={docTitle}
                placeholder="비워두면 파일명이 사용됩니다"
                onChange={(e) => setDocTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-file">파일</Label>
              <input
                ref={docInput}
                id="doc-file"
                type="file"
                accept={DOCUMENT_ACCEPT}
                data-testid="employee-document-input"
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
                onChange={(e) => setPendingDoc(e.target.files?.[0] ?? null)}
              />
              {pendingDoc && (
                <p className="text-xs text-muted-foreground">
                  {pendingDoc.name} · {formatFileSize(pendingDoc.size)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button
              disabled={!pendingDoc || busy}
              onClick={() => void handleDocumentSubmit()}
              data-testid="employee-document-submit"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
