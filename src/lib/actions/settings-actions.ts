'use server';

/**
 * Server actions for system settings.
 *
 * Two storage shapes:
 *  - Scalar sections (company, work, leave, payroll, evaluation, notifications,
 *    security, printTemplate, menuPermissions, misc) live in `company_settings`
 *    as one JSON row per section (category=<section>, key='__section__').
 *  - List collections (work schedules, workplaces, holidays, attendance types,
 *    condolence rules, approval templates, evaluation criteria) have their own
 *    tables.
 *
 * Per-user display preferences (theme/font/locale) are NOT stored here — they
 * stay in the browser.
 */
import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { toApp, toDb } from './mappers';
import type {
  WorkSchedule,
  Holiday,
  ApprovalTemplate,
  CondolenceLeaveRule,
  Workplace,
  AttendanceTypeConfig,
} from '@/types';

const HR_ROLES = ['admin', 'hr_manager'];
const SECTION_KEY = '__section__';

async function assertRead(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
}

async function assertHrWrite(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session || !HR_ROLES.includes(session.role)) throw new Error('forbidden');
}

/** Menu permissions govern access itself, so only admins may change them. */
async function assertAdminWrite(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session || session.role !== 'admin') throw new Error('forbidden');
}

// ---------------------------------------------------------------------------
// Sections (JSON blobs)
// ---------------------------------------------------------------------------

export type SettingsSection =
  | 'company'
  | 'work'
  | 'leave'
  | 'payroll'
  | 'evaluation'
  | 'notifications'
  | 'security'
  | 'printTemplate'
  | 'branding'
  | 'menuPermissions'
  | 'auditLog'
  | 'changeHistory'
  | 'misc';

export interface SettingsModuleData {
  sections: Partial<Record<SettingsSection, Record<string, unknown>>>;
  workSchedules: WorkSchedule[];
  workplaces: Workplace[];
  holidays: Holiday[];
  attendanceTypes: AttendanceTypeConfig[];
  condolenceLeaveRules: CondolenceLeaveRule[];
  approvalTemplates: ApprovalTemplate[];
}

export async function fetchSettingsData(): Promise<SettingsModuleData | null> {
  try {
    await assertRead();
    const [
      settingRows,
      workSchedules,
      workplaces,
      holidays,
      attendanceTypes,
      condolenceRules,
      approvalTemplates,
    ] = await Promise.all([
      db.select().from(schema.companySettings).where(eq(schema.companySettings.key, SECTION_KEY)),
      db.select().from(schema.workSchedules),
      db.select().from(schema.workplaces),
      db.select().from(schema.holidays),
      db.select().from(schema.attendanceTypeConfigs),
      db.select().from(schema.condolenceLeaveRules),
      db.select().from(schema.approvalTemplates),
    ]);

    const sections: SettingsModuleData['sections'] = {};
    for (const row of settingRows) {
      if (!row.value) continue;
      try {
        sections[row.category as SettingsSection] = JSON.parse(row.value);
      } catch {
        console.warn(`settings: section '${row.category}' holds invalid JSON — ignored`);
      }
    }

    return {
      sections,
      workSchedules: workSchedules.map((r) => toApp<WorkSchedule>(r)),
      workplaces: workplaces.map((r) => toApp<Workplace>(r)),
      holidays: holidays.map((r) => toApp<Holiday>(r)),
      attendanceTypes: attendanceTypes.map((r) => toApp<AttendanceTypeConfig>(r)),
      condolenceLeaveRules: condolenceRules.map((r) => toApp<CondolenceLeaveRule>(r)),
      approvalTemplates: approvalTemplates.map((r) => toApp<ApprovalTemplate>(r)),
    };
  } catch (err) {
    console.error('fetchSettingsData failed:', err);
    return null;
  }
}

export async function saveSettingsSection(
  section: SettingsSection,
  value: Record<string, unknown>,
): Promise<boolean> {
  try {
    if (section === 'menuPermissions') await assertAdminWrite();
    else await assertHrWrite();
    const json = JSON.stringify(value);
    await db
      .insert(schema.companySettings)
      .values({ category: section, key: SECTION_KEY, value: json })
      .onConflictDoUpdate({
        target: [schema.companySettings.category, schema.companySettings.key],
        set: { value: json, updatedAt: sql`now()` },
      });
    return true;
  } catch (err) {
    console.error(`saveSettingsSection(${section}) failed:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export type SettingsEntityKind =
  | 'workSchedule'
  | 'workplace'
  | 'holiday'
  | 'attendanceType'
  | 'condolenceRule'
  | 'approvalTemplate';

const ENTITY_TABLES = {
  workSchedule: schema.workSchedules,
  workplace: schema.workplaces,
  holiday: schema.holidays,
  attendanceType: schema.attendanceTypeConfigs,
  condolenceRule: schema.condolenceLeaveRules,
  approvalTemplate: schema.approvalTemplates,
} as const;

// `holidays` has no updated_at column
const HAS_UPDATED_AT: ReadonlySet<SettingsEntityKind> = new Set([
  'workSchedule',
  'workplace',
  'attendanceType',
  'condolenceRule',
  'approvalTemplate',
]);

// JSONB columns must be passed through untouched by the key/value mappers
const JSON_FIELDS: Partial<Record<SettingsEntityKind, string[]>> = {
  workSchedule: ['settings'],
  approvalTemplate: ['steps'],
};

function splitJson(
  kind: SettingsEntityKind,
  data: Record<string, unknown>,
): { plain: Record<string, unknown>; json: Record<string, unknown> } {
  const jsonKeys = JSON_FIELDS[kind] ?? [];
  const plain: Record<string, unknown> = {};
  const json: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (jsonKeys.includes(k)) json[k] = v;
    else plain[k] = v;
  }
  return { plain, json };
}

export async function createSettingsEntity(
  kind: SettingsEntityKind,
  data: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  try {
    await assertHrWrite();
    const table = ENTITY_TABLES[kind];
    const { plain, json } = splitJson(kind, data);
    const values = { ...toDb(plain, { dropId: true }), ...json };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [row] = await db.insert(table).values(values as any).returning();
    return toApp<Record<string, unknown>>(row as Record<string, unknown>);
  } catch (err) {
    console.error(`createSettingsEntity(${kind}) failed:`, err);
    return null;
  }
}

export async function updateSettingsEntity(
  kind: SettingsEntityKind,
  id: string,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  try {
    await assertHrWrite();
    const table = ENTITY_TABLES[kind];
    const { plain, json } = splitJson(kind, patch);
    const values: Record<string, unknown> = { ...toDb(plain, { dropId: true }), ...json };
    if (HAS_UPDATED_AT.has(kind)) values.updatedAt = new Date();
    const [row] = await db
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(table as any)
      .set(values)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq((table as any).id, id))
      .returning();
    return row ? toApp<Record<string, unknown>>(row as Record<string, unknown>) : null;
  } catch (err) {
    console.error(`updateSettingsEntity(${kind}) failed:`, err);
    return null;
  }
}

export async function deleteSettingsEntity(
  kind: SettingsEntityKind,
  id: string,
): Promise<boolean> {
  try {
    await assertHrWrite();
    const table = ENTITY_TABLES[kind];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.delete(table as any).where(eq((table as any).id, id));
    return true;
  } catch (err) {
    console.error(`deleteSettingsEntity(${kind}) failed:`, err);
    return false;
  }
}

/** Exactly one work schedule may carry the default flag. */
export async function setDefaultWorkSchedule(id: string): Promise<boolean> {
  try {
    await assertHrWrite();
    await db.update(schema.workSchedules).set({ isDefault: false });
    await db
      .update(schema.workSchedules)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(schema.workSchedules.id, id));
    return true;
  } catch (err) {
    console.error('setDefaultWorkSchedule failed:', err);
    return false;
  }
}

/** Company identity is also written by the Excel onboarding import. */
export async function readCompanySection(): Promise<Record<string, unknown> | null> {
  try {
    const [row] = await db
      .select()
      .from(schema.companySettings)
      .where(
        and(eq(schema.companySettings.category, 'company'), eq(schema.companySettings.key, SECTION_KEY)),
      );
    return row?.value ? (JSON.parse(row.value) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
