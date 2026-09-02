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
import { encryptSensitive, maskStored } from '@/lib/security/sensitive';
import { readScope, redactForScope } from './read-scope';
import { recordAudit } from './audit';
import { normalizePhone } from '@/lib/attendance/import-parse';
import { setSalaries, type SalaryInput } from './salary-actions';
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

/**
 * 목록·상세로 나가는 직원 자료에서 주민등록번호를 가립니다.
 *
 * 저장은 암호화되어 있으므로 그대로 내보내면 암호문이 화면에 뜹니다. 복호화해
 * 보내면 이번에는 평문이 브라우저까지 갑니다 — 개발자도구만 열면 전 직원의
 * 주민번호가 보입니다. 그래서 여기서 마스킹된 값으로 바꿔 내보내고, 전체
 * 열람은 revealResidentNumber 로만 열립니다.
 */
/**
 * 저장으로 들어온 주민등록번호를 어떻게 다룰지 정합니다.
 *
 * 화면은 마스킹된 값(`900101-1******`)을 받아 들고 있습니다. 사용자가 그 칸을
 * 건드리지 않고 다른 항목만 고쳐 저장하면, 마스킹 문자열이 그대로 올라와
 * **진짜 번호를 별표로 덮어씁니다.** 되돌릴 수 없는 손실이라 여기서 막습니다.
 *
 * - 별표가 섞여 있으면 "안 고쳤다"는 뜻이므로 그 항목을 저장에서 뺍니다.
 * - 진짜 번호면 암호화해서 넣습니다.
 * - 빈 값이면 지웁니다.
 */
function normalizeResidentInput(
  values: Record<string, unknown>,
): Record<string, unknown> {
  if (!('residentNumber' in values)) return values;
  const raw = values.residentNumber;
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { ...values, residentNumber: null };
  }
  const text = String(raw);
  if (text.includes('*')) {
    const { residentNumber: _ignored, ...rest } = values;
    void _ignored;
    return rest;
  }
  return { ...values, residentNumber: encryptSensitive(text) };
}

function withMaskedResident(employee: Employee): Employee {
  if (!employee.resident_number) return employee;
  return { ...employee, resident_number: maskStored(employee.resident_number) };
}

export async function fetchEmployeeData(): Promise<EmployeeModuleData | null> {
  try {
    await assertRead();
    const scope = await readScope();

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
      // 이름·부서·직급은 조직도와 결재선에 필요해 모두에게 나갑니다.
      // 급여·계좌·주민번호·집주소는 인사 담당과 본인에게만 나갑니다.
      employees: employees.map((r) =>
        redactForScope(scope, withMaskedResident(toApp<Employee>(r))),
      ),
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
  // 정규화는 normalizePhone 하나만 씁니다. 같은 규칙을 여러 곳에 베껴 두었더니
  // 한 곳의 정규식이 깨진 것을 한참 뒤에야 알았습니다 — 그동안 하이픈 표기가
  // 다른 번호는 중복으로 걸리지 않았습니다.
  const key = normalizePhone(phone);
  if (!key) return null;
  const rows = await db
    .select({ id: schema.employees.id, name: schema.employees.name, phone: schema.employees.phone })
    .from(schema.employees);
  const clash = rows.find((r) => r.id !== exceptId && normalizePhone(r.phone) === key);
  return clash ? clash.name : null;
}

export async function createEmployee(employee: Employee): Promise<Employee | null> {
  try {
    await assertHrWrite();
    const taken = await phoneTakenBy(employee.phone);
    if (taken) throw new Error(`휴대폰 번호를 ${taken} 님이 이미 쓰고 있습니다.`);
    const values = normalizeResidentInput(
      toDb(employee as unknown as Record<string, unknown>, { dropId: true }),
    );
    const [row] = await db
      .insert(schema.employees)
      .values(values as typeof schema.employees.$inferInsert)
      .returning();

    // Every employee starts with an open assignment interval from their hire
    // date; without one the as-of lookup would have nothing to return for them.
    if (row) {
      await recordAudit({
        action: 'create', targetType: 'employee', targetId: row.id,
        targetLabel: `${row.name} (${row.employeeNumber ?? '사번없음'})`,
      });
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
    return withMaskedResident(toApp<Employee>(row));
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
    const values = normalizeResidentInput(toDb(patch as Record<string, unknown>, { dropId: true }));
    const [row] = await db
      .update(schema.employees)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.employees.id, id))
      .returning();
    if (row) {
      await recordAudit({
        action: 'update', targetType: 'employee', targetId: id,
        targetLabel: `${row.name} (${row.employeeNumber ?? '사번없음'})`,
        // 무엇을 고쳤는지만 남기고 값은 남기지 않습니다 — 감사로그가
        // 개인정보 사본이 되면 안 됩니다.
        details: { fields: Object.keys(patch) },
      });

      // 사원카드에서 급여를 고치면 급여 **이력**에도 같은 날짜 구간으로
      // 남깁니다. employees 의 금액 컬럼은 이력의 사본일 뿐이라, 여기만
      // 고치면 다음에 급여 기준액 화면이 열리는 순간 syncCurrentSalaries 가
      // 이력값으로 되돌립니다 — 담당자가 고친 값이 소리 없이 사라집니다.
      if (patch.base_salary !== undefined || patch.hourly_wage !== undefined) {
        const today = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const iso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        await setSalaries([
          {
            employeeId: id,
            effectiveFrom: iso,
            payMethod: (row.payMethod ?? 'monthly') as SalaryInput['payMethod'],
            baseSalary: Number(row.baseSalary ?? 0),
            hourlyWage: Number(row.hourlyWage ?? 0),
            reason: '사원카드에서 수정',
          },
        ]);
      }
    }
    return row ? withMaskedResident(toApp<Employee>(row)) : null;
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
