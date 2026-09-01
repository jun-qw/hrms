'use server';

/**
 * Admin onboarding actions for a newly sold installation:
 *  - wipeAllData(): clears every demo/operational record so a customer
 *    starts clean (master settings, users, and code tables are kept).
 *  - importInitialData(): bulk-loads company info, org structure, and
 *    employees parsed from the Excel onboarding template.
 */
import { eq, sql, and } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

async function assertAdmin(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session || session.role !== 'admin') throw new Error('forbidden');
}

// ---------------------------------------------------------------------------
// Wipe
// ---------------------------------------------------------------------------

export async function wipeAllData(): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertAdmin();

    // Unlink users from employee records before employees are removed
    await db.update(schema.users).set({ employeeId: null });

    // Transactional data first (FK order), then employee sub-records,
    // then employees and org structure.
    await db.delete(schema.attendanceModifications);
    await db.delete(schema.attendances);
    await db.delete(schema.attendanceCloseouts);
    await db.delete(schema.flexWorkRequests);
    await db.delete(schema.flexScheduleAssignments);
    await db.delete(schema.leavePromotionAlerts);
    await db.delete(schema.leaveUsagePlans);
    await db.delete(schema.leaveBalanceAdjustments);
    await db.delete(schema.leaveRequests);
    await db.delete(schema.leaveBalances);
    await db.delete(schema.payrollDetails);
    await db.delete(schema.payrolls);
    await db.delete(schema.employeePayrollSettings);
    await db.delete(schema.retirementSettlements);
    await db.delete(schema.notifications);
    await db.delete(schema.appointments);
    await db.delete(schema.approvalLines);
    await db.delete(schema.approvals);
    await db.delete(schema.workflows);
    await db.delete(schema.hrIssues);
    await db.delete(schema.employeeWorkSchedules);
    await db.delete(schema.careerHistories);
    await db.delete(schema.educationHistories);
    await db.delete(schema.certifications);
    await db.delete(schema.familyMembers);
    await db.delete(schema.salaryGrades);
    await db.delete(schema.employees);
    await db.delete(schema.jobCategories);
    // departments self-reference via parent_id — detach before deleting
    await db.update(schema.departments).set({ parentId: null });
    await db.delete(schema.departments);
    await db.delete(schema.positionRanks);
    await db.delete(schema.positionTitles);

    return { ok: true };
  } catch (err) {
    console.error('wipeAllData failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export interface ImportDepartmentRow {
  code: string;
  name: string;
  parent_code?: string | null;
  sort_order?: number | null;
}

export interface ImportLevelRow {
  name: string;
  level: number;
}

export interface ImportEmployeeRow {
  employee_number: string;
  name: string;
  email: string;
  hire_date: string;
  department_code?: string | null;
  rank_name?: string | null;
  title_name?: string | null;
  employment_type?: string | null;
  name_en?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  gender?: 'M' | 'F' | null;
  base_salary?: number | null;
  address?: string | null;
  zip_code?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
}

export interface InitialImportPayload {
  company: Record<string, string>;
  departments: ImportDepartmentRow[];
  ranks: ImportLevelRow[];
  titles: ImportLevelRow[];
  employees: ImportEmployeeRow[];
}

export interface InitialImportResult {
  ok: boolean;
  companyKeys: number;
  departments: number;
  ranks: number;
  titles: number;
  employees: number;
  errors: string[];
}

const SECTION_KEY = '__section__';

const COMPANY_KEYS = new Set([
  'name',
  'business_number',
  'ceo_name',
  'address',
  'industry',
  'phone',
  'fax',
  'website',
]);

export async function importInitialData(
  payload: InitialImportPayload,
): Promise<InitialImportResult> {
  const result: InitialImportResult = {
    ok: false,
    companyKeys: 0,
    departments: 0,
    ranks: 0,
    titles: 0,
    employees: 0,
    errors: [],
  };
  try {
    await assertAdmin();

    // --- Company section (merged into the existing JSON section row) ---
    const [existingCompany] = await db
      .select()
      .from(schema.companySettings)
      .where(
        and(
          eq(schema.companySettings.category, 'company'),
          eq(schema.companySettings.key, SECTION_KEY),
        ),
      );
    let companySection: Record<string, unknown> = {};
    if (existingCompany?.value) {
      try {
        companySection = JSON.parse(existingCompany.value) as Record<string, unknown>;
      } catch {
        companySection = {};
      }
    }
    for (const [key, value] of Object.entries(payload.company)) {
      if (!COMPANY_KEYS.has(key)) continue;
      companySection[key] = value;
      result.companyKeys++;
    }
    if (result.companyKeys > 0) {
      const json = JSON.stringify(companySection);
      await db
        .insert(schema.companySettings)
        .values({ category: 'company', key: SECTION_KEY, value: json })
        .onConflictDoUpdate({
          target: [schema.companySettings.category, schema.companySettings.key],
          set: { value: json, updatedAt: sql`now()` },
        });
    }

    // --- Position ranks / titles (upsert by name) ---
    for (const r of payload.ranks) {
      const [existing] = await db
        .select()
        .from(schema.positionRanks)
        .where(eq(schema.positionRanks.name, r.name));
      if (existing) {
        await db
          .update(schema.positionRanks)
          .set({ level: r.level, isActive: true })
          .where(eq(schema.positionRanks.id, existing.id));
      } else {
        await db.insert(schema.positionRanks).values({ name: r.name, level: r.level });
      }
      result.ranks++;
    }
    for (const t of payload.titles) {
      const [existing] = await db
        .select()
        .from(schema.positionTitles)
        .where(eq(schema.positionTitles.name, t.name));
      if (existing) {
        await db
          .update(schema.positionTitles)
          .set({ level: t.level, isActive: true })
          .where(eq(schema.positionTitles.id, existing.id));
      } else {
        await db.insert(schema.positionTitles).values({ name: t.name, level: t.level });
      }
      result.titles++;
    }

    // --- Departments (two passes: rows first, then parent links) ---
    for (const [i, d] of payload.departments.entries()) {
      await db
        .insert(schema.departments)
        .values({ code: d.code, name: d.name, sortOrder: d.sort_order ?? i + 1, level: 1 })
        .onConflictDoUpdate({
          target: schema.departments.code,
          set: { name: d.name, sortOrder: d.sort_order ?? i + 1, isActive: true },
        });
    }
    const deptRows = await db.select().from(schema.departments);
    const deptByCode = new Map(deptRows.map((d) => [d.code, d]));
    for (const d of payload.departments) {
      const self = deptByCode.get(d.code);
      if (!self) continue;
      if (d.parent_code) {
        const parent = deptByCode.get(d.parent_code);
        if (!parent) {
          result.errors.push(`부서 '${d.name}': 상위부서코드 '${d.parent_code}'를 찾을 수 없습니다.`);
          continue;
        }
        await db
          .update(schema.departments)
          .set({ parentId: parent.id, level: (parent.level ?? 1) + 1 })
          .where(eq(schema.departments.id, self.id));
      }
      result.departments++;
    }

    // --- Employees (upsert by employee_number, refs resolved by code/name) ---
    const rankRows = await db.select().from(schema.positionRanks);
    const titleRows = await db.select().from(schema.positionTitles);
    const rankByName = new Map(rankRows.map((r) => [r.name, r.id]));
    const titleByName = new Map(titleRows.map((t) => [t.name, t.id]));
    const deptRows2 = await db.select().from(schema.departments);
    const deptByCode2 = new Map(deptRows2.map((d) => [d.code, d.id]));

    for (const e of payload.employees) {
      const departmentId = e.department_code ? (deptByCode2.get(e.department_code) ?? null) : null;
      if (e.department_code && !departmentId) {
        result.errors.push(`사원 '${e.name}(${e.employee_number})': 부서코드 '${e.department_code}' 없음`);
      }
      const positionRankId = e.rank_name ? (rankByName.get(e.rank_name) ?? null) : null;
      if (e.rank_name && !positionRankId) {
        result.errors.push(`사원 '${e.name}(${e.employee_number})': 직급 '${e.rank_name}' 없음`);
      }
      const positionTitleId = e.title_name ? (titleByName.get(e.title_name) ?? null) : null;
      if (e.title_name && !positionTitleId) {
        result.errors.push(`사원 '${e.name}(${e.employee_number})': 직책 '${e.title_name}' 없음`);
      }

      const values = {
        employeeNumber: e.employee_number,
        name: e.name,
        nameEn: e.name_en || null,
        email: e.email,
        phone: e.phone || null,
        birthDate: e.birth_date || null,
        gender: e.gender ?? null,
        departmentId,
        positionRankId,
        positionTitleId,
        employmentType: (e.employment_type ?? 'regular') as 'regular' | 'contract' | 'parttime' | 'intern',
        hireDate: e.hire_date,
        baseSalary: String(e.base_salary ?? 0),
        address: e.address || null,
        zipCode: e.zip_code || null,
        bankName: e.bank_name || null,
        bankAccount: e.bank_account || null,
      };
      try {
        await db
          .insert(schema.employees)
          .values(values)
          .onConflictDoUpdate({ target: schema.employees.employeeNumber, set: values });
        result.employees++;
      } catch (err) {
        result.errors.push(
          `사원 '${e.name}(${e.employee_number})' 저장 실패: ${err instanceof Error ? err.message.split('\n')[0] : 'unknown'}`,
        );
      }
    }

    result.ok = true;
    return result;
  } catch (err) {
    console.error('importInitialData failed:', err);
    result.errors.push(err instanceof Error ? err.message : 'unknown');
    return result;
  }
}

// Re-link a user account to an employee by email (used after import so the
// admin can attach logins to imported employees).
export async function linkUserToEmployeeByEmail(): Promise<number> {
  await assertAdmin();
  const rows = await db.select().from(schema.users);
  let linked = 0;
  for (const u of rows) {
    if (u.employeeId) continue;
    const [emp] = await db
      .select()
      .from(schema.employees)
      .where(and(eq(schema.employees.email, u.email), eq(schema.employees.status, 'active')));
    if (emp) {
      await db.update(schema.users).set({ employeeId: emp.id }).where(eq(schema.users.id, u.id));
      linked++;
    }
  }
  return linked;
}
