'use server';

/**
 * Employee photo and document attachments (인사카드 사진 / 원본 서류).
 *
 * Files live in the database next to the records they belong to, so personnel
 * documents are covered by the same backup and access control as the employee
 * data itself. Bytes are read back through route handlers, not these actions.
 */
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import {
  DOCUMENT_MIME,
  MAX_DOCUMENT_BYTES,
  MAX_PHOTO_BYTES,
  PHOTO_MIME,
  employeePhotoUrl,
  type DocumentUploadResult,
  type EmployeeDocumentMeta,
  type EmployeeFileKind,
} from '@/lib/employee-files';

const HR_ROLES = ['admin', 'hr_manager'];

interface Actor {
  id: string | null;
  name: string;
  employeeId: string | null;
  isHr: boolean;
}

/** Demo mode has no session; treat the caller as HR so the UI stays usable. */
async function actor(): Promise<Actor> {
  if (process.env.AUTH_MODE !== 'db') {
    return { id: null, name: 'demo', employeeId: null, isHr: true };
  }
  const session = await getSession();
  if (!session) throw new Error('forbidden');
  return {
    id: session.userId,
    name: session.name,
    employeeId: session.employeeId,
    isHr: HR_ROLES.includes(session.role),
  };
}

/**
 * Documents are official personnel records: HR files and removes them, and an
 * employee may read their own. A photo is different — people maintain their
 * own picture — so self-service is allowed there.
 */
async function assertCanWrite(kind: EmployeeFileKind, employeeId: string): Promise<Actor> {
  const a = await actor();
  if (a.isHr) return a;
  if (kind === 'photo' && a.employeeId === employeeId) return a;
  throw new Error('forbidden');
}

async function assertCanRead(employeeId: string): Promise<Actor> {
  const a = await actor();
  if (a.isHr || a.employeeId === employeeId) return a;
  throw new Error('forbidden');
}

function toMeta(row: {
  id: string;
  employeeId: string;
  kind: string;
  category: string | null;
  title: string | null;
  fileName: string;
  mimeType: string;
  byteSize: number;
  uploadedBy: string | null;
  uploadedByName: string | null;
  createdAt: Date | null;
}): EmployeeDocumentMeta {
  return {
    id: row.id,
    employee_id: row.employeeId,
    kind: row.kind as EmployeeFileKind,
    category: row.category,
    title: row.title,
    file_name: row.fileName,
    mime_type: row.mimeType,
    byte_size: row.byteSize,
    uploaded_by: row.uploadedBy,
    uploaded_by_name: row.uploadedByName,
    created_at: row.createdAt ? row.createdAt.toISOString() : null,
  };
}

/** Metadata only — the bytes are far too large to ship through an action. */
const META_COLUMNS = {
  id: schema.employeeDocuments.id,
  employeeId: schema.employeeDocuments.employeeId,
  kind: schema.employeeDocuments.kind,
  category: schema.employeeDocuments.category,
  title: schema.employeeDocuments.title,
  fileName: schema.employeeDocuments.fileName,
  mimeType: schema.employeeDocuments.mimeType,
  byteSize: schema.employeeDocuments.byteSize,
  uploadedBy: schema.employeeDocuments.uploadedBy,
  uploadedByName: schema.employeeDocuments.uploadedByName,
  createdAt: schema.employeeDocuments.createdAt,
};

export async function listEmployeeDocuments(
  employeeId: string,
): Promise<EmployeeDocumentMeta[]> {
  try {
    await assertCanRead(employeeId);
    const rows = await db
      .select(META_COLUMNS)
      .from(schema.employeeDocuments)
      .where(eq(schema.employeeDocuments.employeeId, employeeId));
    return rows
      .map(toMeta)
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  } catch (err) {
    console.error('listEmployeeDocuments failed:', err);
    return [];
  }
}

export async function uploadEmployeeFile(input: {
  employeeId: string;
  kind: EmployeeFileKind;
  base64: string;
  mimeType: string;
  fileName: string;
  title?: string;
  category?: string;
}): Promise<DocumentUploadResult> {
  try {
    const a = await assertCanWrite(input.kind, input.employeeId);

    const allowed = input.kind === 'photo' ? PHOTO_MIME : DOCUMENT_MIME;
    if (!allowed.has(input.mimeType)) return { ok: false, error: 'unsupported_type' };

    const data = Buffer.from(input.base64, 'base64');
    const limit = input.kind === 'photo' ? MAX_PHOTO_BYTES : MAX_DOCUMENT_BYTES;
    if (data.byteLength > limit) return { ok: false, error: 'too_large' };

    const [employee] = await db
      .select({ id: schema.employees.id })
      .from(schema.employees)
      .where(eq(schema.employees.id, input.employeeId));
    if (!employee) return { ok: false, error: 'not_found' };

    // A person has one picture; replacing it removes the previous file.
    if (input.kind === 'photo') {
      await db
        .delete(schema.employeeDocuments)
        .where(
          and(
            eq(schema.employeeDocuments.employeeId, input.employeeId),
            eq(schema.employeeDocuments.kind, 'photo'),
          ),
        );
    }

    const [row] = await db
      .insert(schema.employeeDocuments)
      .values({
        employeeId: input.employeeId,
        kind: input.kind,
        category: input.kind === 'document' ? (input.category ?? null) : null,
        title: input.title ?? null,
        fileName: input.fileName,
        mimeType: input.mimeType,
        byteSize: data.byteLength,
        data,
        uploadedBy: a.id,
        uploadedByName: a.name,
      })
      .returning(META_COLUMNS);

    let photoUrl: string | null | undefined;
    if (input.kind === 'photo') {
      // Mirrored onto the employee record so every avatar in the app — lists,
      // org chart, header — picks the new picture up without extra lookups.
      photoUrl = employeePhotoUrl(
        input.employeeId,
        row.createdAt ? row.createdAt.toISOString() : String(Date.now()),
      );
      await db
        .update(schema.employees)
        .set({ profileImageUrl: photoUrl, updatedAt: new Date() })
        .where(eq(schema.employees.id, input.employeeId));
    }

    return { ok: true, document: toMeta(row), photoUrl };
  } catch (err) {
    console.error('uploadEmployeeFile failed:', err);
    if (err instanceof Error && err.message === 'forbidden') return { ok: false, error: 'forbidden' };
    return { ok: false, error: 'server_error' };
  }
}

export async function deleteEmployeeFile(
  documentId: string,
): Promise<{ ok: boolean; photoCleared?: boolean; employeeId?: string }> {
  try {
    const [existing] = await db
      .select({
        id: schema.employeeDocuments.id,
        employeeId: schema.employeeDocuments.employeeId,
        kind: schema.employeeDocuments.kind,
      })
      .from(schema.employeeDocuments)
      .where(eq(schema.employeeDocuments.id, documentId));
    if (!existing) return { ok: false };

    await assertCanWrite(existing.kind as EmployeeFileKind, existing.employeeId);
    await db.delete(schema.employeeDocuments).where(eq(schema.employeeDocuments.id, documentId));

    if (existing.kind === 'photo') {
      await db
        .update(schema.employees)
        .set({ profileImageUrl: null, updatedAt: new Date() })
        .where(eq(schema.employees.id, existing.employeeId));
      return { ok: true, photoCleared: true, employeeId: existing.employeeId };
    }
    return { ok: true, employeeId: existing.employeeId };
  } catch (err) {
    console.error('deleteEmployeeFile failed:', err);
    return { ok: false };
  }
}
