/**
 * Constants and shapes for employee photos and attached documents.
 *
 * Kept out of the `'use server'` action module, which may only export async
 * functions, so both client and server code can import them.
 */

export const EMPLOYEE_FILE_KINDS = ['photo', 'document'] as const;
export type EmployeeFileKind = (typeof EMPLOYEE_FILE_KINDS)[number];

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const PHOTO_MIME: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

/** Scanned originals are usually PDFs; images are accepted for phone photos. */
export const DOCUMENT_MIME: ReadonlySet<string> = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export const PHOTO_ACCEPT = '.png,.jpg,.jpeg,.webp';
export const DOCUMENT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp';

/** Filing categories offered in the upload form; free text is also allowed. */
export const DOCUMENT_CATEGORIES = [
  '근로계약서',
  '이력서',
  '주민등록등본',
  '가족관계증명서',
  '통장사본',
  '자격증 사본',
  '졸업증명서',
  '건강검진 결과',
  '서약서',
  '기타',
] as const;

export interface EmployeeDocumentMeta {
  id: string;
  employee_id: string;
  kind: EmployeeFileKind;
  category: string | null;
  title: string | null;
  file_name: string;
  mime_type: string;
  byte_size: number;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string | null;
}

export type UploadErrorCode =
  | 'forbidden'
  | 'too_large'
  | 'unsupported_type'
  | 'not_found'
  | 'server_error';

export interface DocumentUploadResult {
  ok: boolean;
  error?: UploadErrorCode;
  document?: EmployeeDocumentMeta;
  /** Versioned URL for the profile photo, mirrored onto the employee record. */
  photoUrl?: string | null;
}

export function formatFileSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

/** Photo URL carries the upload timestamp so a replacement is not served from cache. */
export function employeePhotoUrl(employeeId: string, version: string): string {
  return `/api/employees/${employeeId}/photo?v=${encodeURIComponent(version)}`;
}

export function employeeDocumentUrl(documentId: string): string {
  return `/api/employee-documents/${documentId}`;
}
