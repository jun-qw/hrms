'use server';

/**
 * Server actions for the employees module. The client store hydrates from
 * fetchEmployeeData() and mirrors every mutation through these actions.
 *
 * App types use snake_case fields (string dates); the DB layer uses camelCase
 * Drizzle columns — the generic mappers below convert between the two.
 */
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import type {
  Department,
  PositionRank,
  PositionTitle,
  Employee,
  CareerHistory,
  EducationHistory,
  Certification,
  FamilyMember,
  EmployeeAssignment,
  JobCategory,
  SalaryGrade,
} from '@/types';

// ---------------------------------------------------------------------------
// Auth guards
// ---------------------------------------------------------------------------

const HR_ROLES = ['admin', 'hr_manager'];

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

/** HR roles may write any employee; everyone else only their own record. */
async function assertEmployeeWrite(employeeId: string): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
  if (HR_ROLES.includes(session.role)) return;
  if (session.employeeId === employeeId) return;
  throw new Error('forbidden');
}

import { toApp, toDb } from './mappers';
import {
  createAssignment,
  fetchAssignments,
  syncCurrentAssignments,
} from './assignment-actions';
import { startEmployeeProcess } from './pipeline-actions';

// ---------------------------------------------------------------------------
// Read: full module dataset
// ---------------------------------------------------------------------------

export interface EmployeeModuleData {
  departments: Department[];
  positionRanks: PositionRank[];
  positionTitles: PositionTitle[];
  jobCategories: JobCategory[];
  salaryGrades: SalaryGrade[];
  employees: Employee[];
  careerHistories: CareerHistory[];
  educationHistories: EducationHistory[];
  certifications: Certification[];
  familyMembers: FamilyMember[];
  /** 소속 이력 전체 — 사원카드의 발령 이력과 시점 조회에 씁니다. */
  assignments: EmployeeAssignment[];
}

export async function fetchEmployeeData(): Promise<EmployeeModuleData | null> {
  try {
    await assertRead();

    // 발령일이 지난 예약 발령을 현재값으로 옮겨 담습니다. 자료를 읽을 때마다
    // 한 번 맞추므로 별도 스케줄러가 필요 없습니다.
    await syncCurrentAssignments();

    const [
      departments,
      positionRanks,
      positionTitles,
      jobCategories,
      salaryGrades,
      employees,
      careerHistories,
      educationHistories,
      certifications,
      familyMembers,
      assignments,
    ] = await Promise.all([
      // Every list is ordered explicitly. Without it PostgreSQL returns heap
      // order, which moves a row to the end of the result set the moment it is
      // updated — in a grid you edit in place, the row you just touched would
      // jump to the bottom of the screen.
      db.select().from(schema.departments).orderBy(asc(schema.departments.sortOrder), asc(schema.departments.name)),
      db.select().from(schema.positionRanks).orderBy(asc(schema.positionRanks.level)),
      db.select().from(schema.positionTitles).orderBy(asc(schema.positionTitles.level)),
      db.select().from(schema.jobCategories).orderBy(asc(schema.jobCategories.sortOrder)),
      db.select().from(schema.salaryGrades).orderBy(asc(schema.salaryGrades.step)),
      db.select().from(schema.employees).orderBy(asc(schema.employees.employeeNumber)),
      db.select().from(schema.careerHistories).orderBy(asc(schema.careerHistories.startDate)),
      db.select().from(schema.educationHistories).orderBy(asc(schema.educationHistories.startDate)),
      db.select().from(schema.certifications).orderBy(asc(schema.certifications.issueDate)),
      db.select().from(schema.familyMembers).orderBy(asc(schema.familyMembers.name)),
      fetchAssignments(),
    ]);
    return {
      departments: departments.map((r) => toApp<Department>(r)),
      positionRanks: positionRanks.map((r) => toApp<PositionRank>(r)),
      positionTitles: positionTitles.map((r) => toApp<PositionTitle>(r)),
      jobCategories: jobCategories.map((r) => toApp<JobCategory>(r)),
      salaryGrades: salaryGrades.map((r) => toApp<SalaryGrade>(r)),
      employees: employees.map((r) => toApp<Employee>(r)),
      careerHistories: careerHistories.map((r) => toApp<CareerHistory>(r)),
      educationHistories: educationHistories.map((r) => toApp<EducationHistory>(r)),
      certifications: certifications.map((r) => toApp<Certification>(r)),
      familyMembers: familyMembers.map((r) => toApp<FamilyMember>(r)),
      assignments,
    };
  } catch (err) {
    console.error('fetchEmployeeData failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Employee CRUD
// ---------------------------------------------------------------------------

/**
 * 이 휴대폰 번호를 이미 쓰는 사람이 있는가.
 *
 * 근태기록은 휴대폰 번호로만 직원을 찾습니다. 번호가 겹치면 그 근태를 누구
 * 것으로 붙일지 판정할 수 없으므로, 화면에서 막기 전에 여기서 먼저 막습니다.
 * 표기가 제각각이라 숫자만 남긴 형태로 비교합니다.
 */
async function phoneTakenBy(phone: string | null | undefined, exceptId?: string): Promise<string | null> {
  const key = String(phone ?? '').replace(/D/g, '');
  if (!key) return null;
  const rows = await db
    .select({ id: schema.employees.id, name: schema.employees.name, phone: schema.employees.phone })
    .from(schema.employees);
  const clash = rows.find(
    (r) => r.id !== exceptId && String(r.phone ?? '').replace(/D/g, '') === key,
  );
  return clash ? clash.name : null;
}

export async function createEmployee(employee: Employee): Promise<Employee | null> {
  try {
    await assertHrWrite();
    const taken = await phoneTakenBy(employee.phone);
    if (taken) throw new Error(`휴대폰 번호를 ${taken} 님이 이미 쓰고 있습니다.`);
    const values = toDb(employee as unknown as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .insert(schema.employees)
      .values(values as typeof schema.employees.$inferInsert)
      .returning();

    // Every employee starts with an open assignment interval from their hire
    // date; without one the as-of lookup would have nothing to return for them.
    if (row) {
      await createAssignment({
        employeeId: row.id,
        effectiveFrom: row.hireDate,
        departmentId: row.departmentId,
        positionRankId: row.positionRankId,
        positionTitleId: row.positionTitleId,
        workplaceId: row.workplaceId,
        reason: '입사',
      });
      // 입사 프로세스를 함께 엽니다. 담당자가 따로 기억해서 시작하게 두면
      // 계약서·계정·연차 부여 같은 항목이 그대로 누락됩니다.
      await startEmployeeProcess(row.id, 'onboarding');
    }
    return toApp<Employee>(row);
  } catch (err) {
    console.error('createEmployee failed:', err);
    return null;
  }
}

export async function updateEmployee(
  id: string,
  patch: Partial<Employee>,
): Promise<Employee | null> {
  try {
    await assertEmployeeWrite(id);
    if (patch.phone !== undefined) {
      const taken = await phoneTakenBy(patch.phone, id);
      if (taken) throw new Error(`휴대폰 번호를 ${taken} 님이 이미 쓰고 있습니다.`);
    }
    const values = toDb(patch as Record<string, unknown>, { dropId: true });
    const [row] = await db
      .update(schema.employees)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.employees.id, id))
      .returning();
    return row ? toApp<Employee>(row) : null;
  } catch (err) {
    console.error('updateEmployee failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Generic entity dispatcher (org structure + employee sub-records)
// ---------------------------------------------------------------------------

export type EntityKind =
  | 'department'
  | 'positionRank'
  | 'positionTitle'
  | 'jobCategory'
  | 'salaryGrade'
  | 'careerHistory'
  | 'educationHistory'
  | 'certification'
  | 'familyMember';

const ENTITY_TABLES = {
  department: schema.departments,
  positionRank: schema.positionRanks,
  positionTitle: schema.positionTitles,
  jobCategory: schema.jobCategories,
  salaryGrade: schema.salaryGrades,
  careerHistory: schema.careerHistories,
  educationHistory: schema.educationHistories,
  certification: schema.certifications,
  familyMember: schema.familyMembers,
} as const;

const HAS_UPDATED_AT: ReadonlySet<EntityKind> = new Set([
  'department',
  'positionRank',
  'positionTitle',
  'jobCategory',
  'salaryGrade',
]);

// Employee sub-records may be edited by the employee themself (my page)
const SUB_RECORDS: ReadonlySet<EntityKind> = new Set([
  'careerHistory',
  'educationHistory',
  'certification',
  'familyMember',
]);

async function assertEntityWrite(kind: EntityKind, employeeId?: string): Promise<void> {
  if (SUB_RECORDS.has(kind) && employeeId) {
    await assertEmployeeWrite(employeeId);
  } else {
    await assertHrWrite();
  }
}

export async function createEntity(
  kind: EntityKind,
  data: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  try {
    await assertEntityWrite(kind, data.employee_id as string | undefined);
    const table = ENTITY_TABLES[kind];
    const values = toDb(data, { dropId: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [row] = await db.insert(table).values(values as any).returning();
    return toApp<Record<string, unknown>>(row as Record<string, unknown>);
  } catch (err) {
    console.error(`createEntity(${kind}) failed:`, err);
    return null;
  }
}

export async function updateEntity(
  kind: EntityKind,
  id: string,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  try {
    const table = ENTITY_TABLES[kind];
    let employeeId = patch.employee_id as string | undefined;
    if (SUB_RECORDS.has(kind) && !employeeId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [existing] = await db.select().from(table as any).where(eq((table as any).id, id));
      employeeId = (existing as { employeeId?: string } | undefined)?.employeeId;
    }
    await assertEntityWrite(kind, employeeId);
    const values = toDb(patch, { dropId: true });
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
    console.error(`updateEntity(${kind}) failed:`, err);
    return null;
  }
}

export async function deleteEntity(kind: EntityKind, id: string): Promise<boolean> {
  try {
    const table = ENTITY_TABLES[kind];
    let employeeId: string | undefined;
    if (SUB_RECORDS.has(kind)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [existing] = await db.select().from(table as any).where(eq((table as any).id, id));
      employeeId = (existing as { employeeId?: string } | undefined)?.employeeId;
    }
    await assertEntityWrite(kind, employeeId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.delete(table as any).where(eq((table as any).id, id));
    return true;
  } catch (err) {
    console.error(`deleteEntity(${kind}) failed:`, err);
    return false;
  }
}
