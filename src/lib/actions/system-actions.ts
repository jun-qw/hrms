'use server';

/**
 * Server actions for the system / auxiliary modules:
 *   code management, HR issues, audit logs, change history, notifications,
 *   flexible-work (assignments + requests) and attendance modification requests.
 *
 * The matching client stores hydrate from fetchSystemData() and mirror every
 * mutation through the actions below.
 *
 * App types use snake_case fields (string dates); Drizzle rows use camelCase
 * with Date objects, so rows are converted with the shared mappers where the
 * shapes line up and with explicit mappers where they do not (code tables use
 * different column names, JSONB payloads must be passed through verbatim).
 */
import { and, desc, eq, inArray, isNull, lt } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession, type SessionPayload } from '@/lib/auth/session';
import { toApp, toDb } from './mappers';
import type {
  AuditLogEntry,
  AuditLogSettings,
  ChangeHistoryEntry,
  ChangeHistorySettings,
  HrIssue,
} from '@/types';
import type { CodeGroup, CodeItem } from '@/lib/stores/code-store';
import type { Notification, NotificationType } from '@/lib/stores/notification-store';
import type {
  EmployeeScheduleAssignment,
  FlexWorkRequest,
} from '@/lib/stores/flex-schedule-store';
import type { AttendanceModificationRequest } from '@/lib/stores/attendance-modification-store';

// ---------------------------------------------------------------------------
// Auth guards — bypassed entirely in demo mode (AUTH_MODE !== 'db')
// ---------------------------------------------------------------------------

const HR_ROLES = ['admin', 'hr_manager'];

/** Capture settings live next to the other settings sections. */
const SECTION_KEY = '__section__';
const CAPTURE_SECTIONS = ['auditLog', 'changeHistory'] as const;

function parseCaptureSections(rows: { category: string; value: string | null }[]): {
  auditLog: Partial<AuditLogSettings> | null;
  changeHistory: Partial<ChangeHistorySettings> | null;
} {
  const out: {
    auditLog: Partial<AuditLogSettings> | null;
    changeHistory: Partial<ChangeHistorySettings> | null;
  } = { auditLog: null, changeHistory: null };
  for (const row of rows) {
    if (!row.value) continue;
    try {
      const parsed = JSON.parse(row.value);
      if (row.category === 'auditLog') out.auditLog = parsed;
      else if (row.category === 'changeHistory') out.changeHistory = parsed;
    } catch {
      console.warn(`system settings: section '${row.category}' holds invalid JSON — ignored`);
    }
  }
  return out;
}

function isDemoMode(): boolean {
  return process.env.AUTH_MODE !== 'db';
}

/** Any signed-in user. Returns null in demo mode. */
async function requireSession(): Promise<SessionPayload | null> {
  if (isDemoMode()) return null;
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
  return session;
}

/** admin / hr_manager only. */
async function assertHr(): Promise<void> {
  if (isDemoMode()) return;
  const session = await getSession();
  if (!session || !HR_ROLES.includes(session.role)) throw new Error('forbidden');
}

/** admin only (code master data). */
async function assertAdmin(): Promise<void> {
  if (isDemoMode()) return;
  const session = await getSession();
  if (!session || session.role !== 'admin') throw new Error('forbidden');
}

/** HR roles may act on anyone; everyone else only on their own records. */
async function assertSelfOrHr(employeeId: string | null | undefined): Promise<void> {
  if (isDemoMode()) return;
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
  if (HR_ROLES.includes(session.role)) return;
  if (employeeId && session.employeeId === employeeId) return;
  throw new Error('forbidden');
}

// ---------------------------------------------------------------------------
// Row mappers for tables whose columns diverge from the app shape
// ---------------------------------------------------------------------------

type CodeGroupRow = typeof schema.codeGroups.$inferSelect;
type CodeItemRow = typeof schema.codeItems.$inferSelect;
type NotificationRow = typeof schema.notifications.$inferSelect;
type FlexAssignmentRow = typeof schema.flexScheduleAssignments.$inferSelect;
type FlexRequestRow = typeof schema.flexWorkRequests.$inferSelect;
type AttendanceModificationRow = typeof schema.attendanceModifications.$inferSelect;

const iso = (d: Date | null | undefined): string => (d ? d.toISOString() : '');

/** HR issues are presented as plain dates (YYYY-MM-DD) throughout the UI. */
const isoDate = (d: Date | null | undefined): string => (d ? d.toISOString().slice(0, 10) : '');

function hrIssueToApp(row: typeof schema.hrIssues.$inferSelect): HrIssue {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    priority: row.priority,
    status: row.status,
    reporter_id: row.reporterId,
    assignee_id: row.assigneeId,
    created_at: isoDate(row.createdAt),
    updated_at: isoDate(row.updatedAt),
    resolved_at: row.resolvedAt ? isoDate(row.resolvedAt) : null,
  };
}

/**
 * `code_groups` stores the group code/name as `code`/`name`; the effective-date
 * and is_system flags have no columns, so they are reported as unset.
 */
function codeGroupToApp(row: CodeGroupRow): CodeGroup {
  return {
    id: row.id,
    group_code: row.code,
    group_name: row.name,
    description: row.description ?? '',
    sort_order: row.sortOrder ?? 0,
    is_active: row.isActive ?? true,
    is_system: false,
    effective_from: null,
    effective_to: null,
    created_at: iso(row.createdAt),
    updated_at: iso(row.updatedAt),
  };
}

function codeItemToApp(row: CodeItemRow): CodeItem {
  return {
    id: row.id,
    group_id: row.groupId,
    code: row.code,
    label: row.label,
    sort_order: row.sortOrder ?? 0,
    is_active: row.isActive ?? true,
    is_system: false,
    effective_from: null,
    effective_to: null,
    created_at: iso(row.createdAt),
    updated_at: iso(row.updatedAt),
  };
}

function notificationToApp(row: NotificationRow): Notification {
  return {
    id: row.id,
    recipient_id: row.recipientId,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    link: row.link ?? undefined,
    is_read: row.isRead,
    created_at: iso(row.createdAt),
    related_id: row.relatedId ?? undefined,
  };
}

function flexAssignmentToApp(row: FlexAssignmentRow): EmployeeScheduleAssignment {
  return {
    id: row.id,
    employee_id: row.employeeId,
    work_schedule_id: row.workScheduleId ?? '',
    start_date: row.startDate,
    end_date: row.endDate,
    approved_by: row.approvedBy,
    approved_by_name: row.approvedByName,
    note: row.note,
    created_at: iso(row.createdAt),
  };
}

function flexRequestToApp(row: FlexRequestRow): FlexWorkRequest {
  return {
    id: row.id,
    employee_id: row.employeeId,
    request_type: row.requestType as FlexWorkRequest['request_type'],
    work_schedule_id: row.workScheduleId ?? '',
    start_date: row.startDate,
    end_date: row.endDate,
    reason: row.reason ?? '',
    status: row.status as FlexWorkRequest['status'],
    reviewed_by: row.reviewedBy,
    reviewed_by_name: row.reviewedByName,
    reviewed_at: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    review_comment: row.reviewComment,
    created_at: iso(row.createdAt),
  };
}

/** before/after are JSONB snapshots — stored and read back verbatim. */
function attendanceModificationToApp(
  row: AttendanceModificationRow,
): AttendanceModificationRequest {
  return {
    id: row.id,
    attendance_id: row.attendanceId ?? '',
    employee_id: row.employeeId,
    before: (row.before ?? {}) as AttendanceModificationRequest['before'],
    after: (row.after ?? {}) as AttendanceModificationRequest['after'],
    reason: row.reason,
    status: row.status as AttendanceModificationRequest['status'],
    approval_id: row.approvalId,
    reviewed_by: row.reviewedBy,
    reviewed_by_name: row.reviewedByName,
    reviewed_at: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    review_comment: row.reviewComment,
    attachment_name: row.attachmentName,
    created_at: iso(row.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Read: full module dataset
// ---------------------------------------------------------------------------

const AUDIT_LOG_FETCH_LIMIT = 1000;
const CHANGE_HISTORY_FETCH_LIMIT = 5000;
const NOTIFICATION_FETCH_LIMIT = 200;

export interface SystemModuleData {
  codeGroups: CodeGroup[];
  codeItems: CodeItem[];
  issues: HrIssue[];
  auditLogs: AuditLogEntry[];
  changeHistory: ChangeHistoryEntry[];
  notifications: Notification[];
  flexAssignments: EmployeeScheduleAssignment[];
  flexRequests: FlexWorkRequest[];
  attendanceModifications: AttendanceModificationRequest[];
  /** Capture settings, stored as JSON sections in `company_settings`. */
  auditLogSettings: Partial<AuditLogSettings> | null;
  changeHistorySettings: Partial<ChangeHistorySettings> | null;
}

/**
 * Loads every system-module table the client stores cache.
 *
 * Visibility rules: notifications are scoped to the signed-in employee, and
 * audit logs / change history are HR-only (non-HR users simply get empty
 * arrays so the remaining modules still hydrate).
 */
export async function fetchSystemData(): Promise<SystemModuleData | null> {
  try {
    const session = await requireSession();
    const demo = isDemoMode();
    const isHr = demo || (session != null && HR_ROLES.includes(session.role));
    const recipientId = session?.employeeId ?? null;

    const [
      codeGroups,
      codeItems,
      issues,
      auditLogs,
      changeHistory,
      notifications,
      flexAssignments,
      flexRequests,
      attendanceModifications,
      captureRows,
    ] = await Promise.all([
      db.select().from(schema.codeGroups),
      db.select().from(schema.codeItems),
      db.select().from(schema.hrIssues),
      isHr
        ? db
            .select()
            .from(schema.auditLogs)
            .orderBy(desc(schema.auditLogs.timestamp))
            .limit(AUDIT_LOG_FETCH_LIMIT)
        : Promise.resolve([]),
      isHr
        ? db
            .select()
            .from(schema.changeHistory)
            .orderBy(desc(schema.changeHistory.changedAt))
            .limit(CHANGE_HISTORY_FETCH_LIMIT)
        : Promise.resolve([]),
      demo
        ? db
            .select()
            .from(schema.notifications)
            .orderBy(desc(schema.notifications.createdAt))
            .limit(NOTIFICATION_FETCH_LIMIT)
        : recipientId
          ? db
              .select()
              .from(schema.notifications)
              .where(eq(schema.notifications.recipientId, recipientId))
              .orderBy(desc(schema.notifications.createdAt))
              .limit(NOTIFICATION_FETCH_LIMIT)
          : Promise.resolve([]),
      db.select().from(schema.flexScheduleAssignments),
      db.select().from(schema.flexWorkRequests),
      db.select().from(schema.attendanceModifications),
      db
        .select()
        .from(schema.companySettings)
        .where(
          and(
            eq(schema.companySettings.key, SECTION_KEY),
            inArray(schema.companySettings.category, CAPTURE_SECTIONS),
          ),
        ),
    ]);

    const captureSettings = parseCaptureSections(captureRows);

    return {
      codeGroups: codeGroups.map(codeGroupToApp),
      codeItems: codeItems.map(codeItemToApp),
      issues: issues.map(hrIssueToApp),
      auditLogs: auditLogs.map((r) => toApp<AuditLogEntry>(r)),
      changeHistory: changeHistory.map((r) => toApp<ChangeHistoryEntry>(r)),
      notifications: notifications.map(notificationToApp),
      flexAssignments: flexAssignments.map(flexAssignmentToApp),
      flexRequests: flexRequests.map(flexRequestToApp),
      attendanceModifications: attendanceModifications.map(attendanceModificationToApp),
      auditLogSettings: captureSettings.auditLog,
      changeHistorySettings: captureSettings.changeHistory,
    };
  } catch (err) {
    console.error('fetchSystemData failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Code management (admin only)
// ---------------------------------------------------------------------------

export type CodeGroupInput = Omit<
  CodeGroup,
  'id' | 'created_at' | 'updated_at' | 'is_system'
>;

export async function createCodeGroup(group: CodeGroupInput): Promise<CodeGroup | null> {
  try {
    await assertAdmin();
    const [row] = await db
      .insert(schema.codeGroups)
      .values({
        code: group.group_code,
        name: group.group_name,
        description: group.description || null,
        isActive: group.is_active,
        sortOrder: group.sort_order,
      })
      .returning();
    return row ? codeGroupToApp(row) : null;
  } catch (err) {
    console.error('createCodeGroup failed:', err);
    return null;
  }
}

export async function updateCodeGroup(
  id: string,
  patch: Partial<CodeGroup>,
): Promise<CodeGroup | null> {
  try {
    await assertAdmin();
    const values: Partial<typeof schema.codeGroups.$inferInsert> = { updatedAt: new Date() };
    if (patch.group_code !== undefined) values.code = patch.group_code;
    if (patch.group_name !== undefined) values.name = patch.group_name;
    if (patch.description !== undefined) values.description = patch.description || null;
    if (patch.sort_order !== undefined) values.sortOrder = patch.sort_order;
    if (patch.is_active !== undefined) values.isActive = patch.is_active;
    const [row] = await db
      .update(schema.codeGroups)
      .set(values)
      .where(eq(schema.codeGroups.id, id))
      .returning();
    return row ? codeGroupToApp(row) : null;
  } catch (err) {
    console.error('updateCodeGroup failed:', err);
    return null;
  }
}

/**
 * Soft delete: code values are referenced by historical records, so a group is
 * only deactivated (together with its items) rather than removed.
 */
export async function deleteCodeGroup(id: string): Promise<boolean> {
  try {
    await assertAdmin();
    const now = new Date();
    await db
      .update(schema.codeGroups)
      .set({ isActive: false, updatedAt: now })
      .where(eq(schema.codeGroups.id, id));
    await db
      .update(schema.codeItems)
      .set({ isActive: false, updatedAt: now })
      .where(eq(schema.codeItems.groupId, id));
    return true;
  } catch (err) {
    console.error('deleteCodeGroup failed:', err);
    return false;
  }
}

export type CodeItemInput = Omit<CodeItem, 'id' | 'created_at' | 'updated_at' | 'is_system'>;

export async function createCodeItem(item: CodeItemInput): Promise<CodeItem | null> {
  try {
    await assertAdmin();
    const [row] = await db
      .insert(schema.codeItems)
      .values({
        groupId: item.group_id,
        code: item.code,
        label: item.label,
        isActive: item.is_active,
        sortOrder: item.sort_order,
      })
      .returning();
    return row ? codeItemToApp(row) : null;
  } catch (err) {
    console.error('createCodeItem failed:', err);
    return null;
  }
}

export async function updateCodeItem(
  id: string,
  patch: Partial<CodeItem>,
): Promise<CodeItem | null> {
  try {
    await assertAdmin();
    const values: Partial<typeof schema.codeItems.$inferInsert> = { updatedAt: new Date() };
    if (patch.code !== undefined) values.code = patch.code;
    if (patch.label !== undefined) values.label = patch.label;
    if (patch.sort_order !== undefined) values.sortOrder = patch.sort_order;
    if (patch.is_active !== undefined) values.isActive = patch.is_active;
    const [row] = await db
      .update(schema.codeItems)
      .set(values)
      .where(eq(schema.codeItems.id, id))
      .returning();
    return row ? codeItemToApp(row) : null;
  } catch (err) {
    console.error('updateCodeItem failed:', err);
    return null;
  }
}

/** Soft delete — see deleteCodeGroup(). */
export async function deleteCodeItem(id: string): Promise<boolean> {
  try {
    await assertAdmin();
    await db
      .update(schema.codeItems)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.codeItems.id, id));
    return true;
  } catch (err) {
    console.error('deleteCodeItem failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// HR issues
// ---------------------------------------------------------------------------

export async function createIssue(issue: HrIssue): Promise<HrIssue | null> {
  try {
    await requireSession();
    const values = toDb(issue as unknown as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .insert(schema.hrIssues)
      .values(values as typeof schema.hrIssues.$inferInsert)
      .returning();
    return row ? hrIssueToApp(row) : null;
  } catch (err) {
    console.error('createIssue failed:', err);
    return null;
  }
}

/** HR roles may edit any issue; a reporter may edit their own. */
export async function updateIssue(
  id: string,
  patch: Partial<HrIssue>,
): Promise<HrIssue | null> {
  try {
    const [existing] = await db.select().from(schema.hrIssues).where(eq(schema.hrIssues.id, id));
    if (!existing) return null;
    await assertSelfOrHr(existing.reporterId);
    const values = toDb(patch as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .update(schema.hrIssues)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.hrIssues.id, id))
      .returning();
    return row ? hrIssueToApp(row) : null;
  } catch (err) {
    console.error('updateIssue failed:', err);
    return null;
  }
}

export async function deleteIssue(id: string): Promise<boolean> {
  try {
    await assertHr();
    await db.delete(schema.hrIssues).where(eq(schema.hrIssues.id, id));
    return true;
  } catch (err) {
    console.error('deleteIssue failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Audit log (append-only)
// ---------------------------------------------------------------------------

export type AuditLogInput = Omit<AuditLogEntry, 'id' | 'timestamp'>;

/**
 * Audit entries are written on nearly every interaction, so appending is a
 * single dedicated action rather than a generic create/update/delete trio.
 * The client IP is deliberately not recorded (no external lookups, privacy).
 */
export async function appendAuditLog(entry: AuditLogInput): Promise<AuditLogEntry | null> {
  try {
    await requireSession();
    const [row] = await db
      .insert(schema.auditLogs)
      .values({
        userId: entry.user_id,
        userName: entry.user_name,
        userRole: entry.user_role,
        actionType: entry.action_type,
        targetType: entry.target_type,
        targetId: entry.target_id,
        targetLabel: entry.target_label,
        details: entry.details ?? null,
        sessionId: entry.session_id,
      })
      .returning();
    return row ? toApp<AuditLogEntry>(row) : null;
  } catch (err) {
    console.error('appendAuditLog failed:', err);
    return null;
  }
}

export async function clearAuditLogs(): Promise<boolean> {
  try {
    await assertAdmin();
    await db.delete(schema.auditLogs);
    return true;
  } catch (err) {
    console.error('clearAuditLogs failed:', err);
    return false;
  }
}

export async function clearOldAuditLogs(retentionDays: number): Promise<boolean> {
  try {
    await assertAdmin();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    await db.delete(schema.auditLogs).where(lt(schema.auditLogs.timestamp, cutoff));
    return true;
  } catch (err) {
    console.error('clearOldAuditLogs failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Change history (append-only)
// ---------------------------------------------------------------------------

export type ChangeHistoryInput = Omit<ChangeHistoryEntry, 'id' | 'changed_at'>;

export async function appendChangeHistory(
  entry: ChangeHistoryInput,
): Promise<ChangeHistoryEntry | null> {
  try {
    await requireSession();
    const [row] = await db
      .insert(schema.changeHistory)
      .values({
        entityType: entry.entity_type,
        entityId: entry.entity_id,
        entityLabel: entry.entity_label,
        action: entry.action,
        changes: entry.changes,
        changedBy: entry.changed_by,
        changedByName: entry.changed_by_name,
      })
      .returning();
    return row ? toApp<ChangeHistoryEntry>(row) : null;
  } catch (err) {
    console.error('appendChangeHistory failed:', err);
    return null;
  }
}

export async function clearChangeHistory(): Promise<boolean> {
  try {
    await assertAdmin();
    await db.delete(schema.changeHistory);
    return true;
  } catch (err) {
    console.error('clearChangeHistory failed:', err);
    return false;
  }
}

export async function clearOldChangeHistory(retentionDays: number): Promise<boolean> {
  try {
    await assertAdmin();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    await db.delete(schema.changeHistory).where(lt(schema.changeHistory.changedAt, cutoff));
    return true;
  } catch (err) {
    console.error('clearOldChangeHistory failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Notifications (readable/writable only by the recipient, or HR)
// ---------------------------------------------------------------------------

export type NotificationInput = Omit<Notification, 'id' | 'is_read' | 'created_at'>;

/** Any signed-in user may notify another (approval flows notify requesters). */
export async function createNotification(
  input: NotificationInput,
): Promise<Notification | null> {
  try {
    await requireSession();
    const [row] = await db
      .insert(schema.notifications)
      .values({
        recipientId: input.recipient_id,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        relatedId: input.related_id ?? null,
        isRead: false,
      })
      .returning();
    return row ? notificationToApp(row) : null;
  } catch (err) {
    console.error('createNotification failed:', err);
    return null;
  }
}

export async function markNotificationRead(id: string): Promise<Notification | null> {
  try {
    const [existing] = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.id, id));
    if (!existing) return null;
    await assertSelfOrHr(existing.recipientId);
    const [row] = await db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.id, id))
      .returning();
    return row ? notificationToApp(row) : null;
  } catch (err) {
    console.error('markNotificationRead failed:', err);
    return null;
  }
}

export async function markAllNotificationsRead(recipientId: string): Promise<boolean> {
  try {
    await assertSelfOrHr(recipientId);
    await db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.recipientId, recipientId));
    return true;
  } catch (err) {
    console.error('markAllNotificationsRead failed:', err);
    return false;
  }
}

export async function deleteNotification(id: string): Promise<boolean> {
  try {
    const [existing] = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.id, id));
    if (!existing) return true;
    await assertSelfOrHr(existing.recipientId);
    await db.delete(schema.notifications).where(eq(schema.notifications.id, id));
    return true;
  } catch (err) {
    console.error('deleteNotification failed:', err);
    return false;
  }
}

export async function clearNotifications(recipientId: string): Promise<boolean> {
  try {
    await assertSelfOrHr(recipientId);
    await db
      .delete(schema.notifications)
      .where(eq(schema.notifications.recipientId, recipientId));
    return true;
  } catch (err) {
    console.error('clearNotifications failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Flexible work — schedule assignments (HR) and employee requests
// ---------------------------------------------------------------------------

/**
 * Assigning a schedule closes any still-open assignment for the employee
 * (end_date = the new assignment's start date) before inserting the new row.
 */
export async function createFlexAssignment(
  assignment: EmployeeScheduleAssignment,
): Promise<EmployeeScheduleAssignment | null> {
  try {
    await assertHr();
    await db
      .update(schema.flexScheduleAssignments)
      .set({ endDate: assignment.start_date })
      .where(
        and(
          eq(schema.flexScheduleAssignments.employeeId, assignment.employee_id),
          isNull(schema.flexScheduleAssignments.endDate),
        ),
      );
    const [row] = await db
      .insert(schema.flexScheduleAssignments)
      .values({
        employeeId: assignment.employee_id,
        workScheduleId: assignment.work_schedule_id || null,
        startDate: assignment.start_date,
        endDate: assignment.end_date,
        approvedBy: assignment.approved_by,
        approvedByName: assignment.approved_by_name,
        note: assignment.note,
      })
      .returning();
    return row ? flexAssignmentToApp(row) : null;
  } catch (err) {
    console.error('createFlexAssignment failed:', err);
    return null;
  }
}

export async function updateFlexAssignment(
  id: string,
  patch: Partial<EmployeeScheduleAssignment>,
): Promise<EmployeeScheduleAssignment | null> {
  try {
    await assertHr();
    const values: Partial<typeof schema.flexScheduleAssignments.$inferInsert> = {};
    if (patch.work_schedule_id !== undefined)
      values.workScheduleId = patch.work_schedule_id || null;
    if (patch.start_date !== undefined) values.startDate = patch.start_date;
    if (patch.end_date !== undefined) values.endDate = patch.end_date;
    if (patch.approved_by !== undefined) values.approvedBy = patch.approved_by;
    if (patch.approved_by_name !== undefined) values.approvedByName = patch.approved_by_name;
    if (patch.note !== undefined) values.note = patch.note;
    const [row] = await db
      .update(schema.flexScheduleAssignments)
      .set(values)
      .where(eq(schema.flexScheduleAssignments.id, id))
      .returning();
    return row ? flexAssignmentToApp(row) : null;
  } catch (err) {
    console.error('updateFlexAssignment failed:', err);
    return null;
  }
}

export async function deleteFlexAssignment(id: string): Promise<boolean> {
  try {
    await assertHr();
    await db
      .delete(schema.flexScheduleAssignments)
      .where(eq(schema.flexScheduleAssignments.id, id));
    return true;
  } catch (err) {
    console.error('deleteFlexAssignment failed:', err);
    return false;
  }
}

/** Employees file their own flexible-work requests; HR may file for anyone. */
export async function createFlexRequest(
  request: FlexWorkRequest,
): Promise<FlexWorkRequest | null> {
  try {
    await assertSelfOrHr(request.employee_id);
    const [row] = await db
      .insert(schema.flexWorkRequests)
      .values({
        employeeId: request.employee_id,
        requestType: request.request_type,
        workScheduleId: request.work_schedule_id || null,
        startDate: request.start_date,
        endDate: request.end_date,
        reason: request.reason,
        status: request.status ?? 'pending',
      })
      .returning();
    return row ? flexRequestToApp(row) : null;
  } catch (err) {
    console.error('createFlexRequest failed:', err);
    return null;
  }
}

/** Approval / rejection is HR-only. */
export async function reviewFlexRequest(
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  reviewedByName: string,
  comment?: string,
): Promise<FlexWorkRequest | null> {
  try {
    await assertHr();
    const [row] = await db
      .update(schema.flexWorkRequests)
      .set({
        status,
        reviewedBy,
        reviewedByName,
        reviewedAt: new Date(),
        reviewComment: comment ?? null,
      })
      .where(eq(schema.flexWorkRequests.id, id))
      .returning();
    return row ? flexRequestToApp(row) : null;
  } catch (err) {
    console.error('reviewFlexRequest failed:', err);
    return null;
  }
}

export async function deleteFlexRequest(id: string): Promise<boolean> {
  try {
    const [existing] = await db
      .select()
      .from(schema.flexWorkRequests)
      .where(eq(schema.flexWorkRequests.id, id));
    if (!existing) return true;
    await assertSelfOrHr(existing.employeeId);
    await db.delete(schema.flexWorkRequests).where(eq(schema.flexWorkRequests.id, id));
    return true;
  } catch (err) {
    console.error('deleteFlexRequest failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Attendance modification requests (사후결재)
// ---------------------------------------------------------------------------

/** Employees request corrections to their own records; HR may file for anyone. */
export async function createAttendanceModification(
  request: AttendanceModificationRequest,
): Promise<AttendanceModificationRequest | null> {
  try {
    await assertSelfOrHr(request.employee_id);
    const [row] = await db
      .insert(schema.attendanceModifications)
      .values({
        attendanceId: request.attendance_id || null,
        employeeId: request.employee_id,
        // JSONB snapshots — stored verbatim, never run through the field mapper
        before: request.before,
        after: request.after,
        reason: request.reason,
        status: request.status ?? 'pending',
        approvalId: request.approval_id,
        attachmentName: request.attachment_name,
      })
      .returning();
    return row ? attendanceModificationToApp(row) : null;
  } catch (err) {
    console.error('createAttendanceModification failed:', err);
    return null;
  }
}

/** Approval / rejection is HR-only. */
export async function reviewAttendanceModification(
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  reviewedByName: string,
  comment?: string,
): Promise<AttendanceModificationRequest | null> {
  try {
    await assertHr();
    const [row] = await db
      .update(schema.attendanceModifications)
      .set({
        status,
        reviewedBy,
        reviewedByName,
        reviewedAt: new Date(),
        reviewComment: comment ?? null,
      })
      .where(eq(schema.attendanceModifications.id, id))
      .returning();
    return row ? attendanceModificationToApp(row) : null;
  } catch (err) {
    console.error('reviewAttendanceModification failed:', err);
    return null;
  }
}

export async function deleteAttendanceModification(id: string): Promise<boolean> {
  try {
    const [existing] = await db
      .select()
      .from(schema.attendanceModifications)
      .where(eq(schema.attendanceModifications.id, id));
    if (!existing) return true;
    await assertSelfOrHr(existing.employeeId);
    await db
      .delete(schema.attendanceModifications)
      .where(eq(schema.attendanceModifications.id, id));
    return true;
  } catch (err) {
    console.error('deleteAttendanceModification failed:', err);
    return false;
  }
}
