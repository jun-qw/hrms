/**
 * 초기 인력 명부 적재: 대한오토텍(주) 재직자 55명과 조직 골격.
 *
 * Exported so both the CLI wrapper and `npm run setup` can run it.
 */
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createDb } from '../../src/lib/db/client';
import * as schema from '../../src/lib/db/schema';
import { calculateAnnualLeave } from '../../src/lib/utils/leave-calculator';
import {
  seedDepartments,
  seedPositionRanks,
  seedPositionTitles,
  seedJobCategories,
  seedSalaryGrades,
  seedEmployees,
  seedCareerHistories,
  seedEducationHistories,
  seedCertifications,
  seedFamilyMembers,
} from '../../src/lib/demo-data/employee-seed';

// 로그인 계정: 인사 담당자와 일반 사용자 각각 하나씩, 명부의 실제 인원에 연결.
const DEMO_USERS = [
  { email: 'hr@daehan-at.co.kr', role: 'hr_manager' as const, seedEmployeeId: 'e-DA260818002' },
  { email: 'employee@daehan-at.co.kr', role: 'employee' as const, seedEmployeeId: 'e-DA151102001' },
];
const DEMO_PASSWORD = 'Demo1234!';

function id(map: Map<string, string>, oldId: string | null | undefined): string | null {
  if (!oldId) return null;
  let v = map.get(oldId);
  if (!v) {
    v = randomUUID();
    map.set(oldId, v);
  }
  return v;
}

export async function runSeedDemo(options: { force?: boolean } = {}) {
  const { db, close } = createDb();
  const force = options.force === true;

  const existing = await db.select().from(schema.employees).limit(1);
  if (existing.length > 0) {
    if (!force) {
      console.log('Employees already exist — aborting. Re-run with --force to wipe and re-seed.');
      await close();
      return;
    }
    console.log('Wiping employee-module tables ...');
    await db.update(schema.users).set({ employeeId: null });

    // 직원을 참조하는 테이블을 먼저 비웁니다. 하나라도 빠지면 외래키 제약에
    // 걸려 --force 재적재가 통째로 실패합니다 — 실제로 연차 잔액과 급여가
    // 빠져 있어서, 한 번이라도 급여를 돌린 뒤에는 재적재가 막혔습니다.
    await db.delete(schema.attendanceModifications);
    await db.delete(schema.attendances);
    await db.delete(schema.attendanceCloseouts);
    await db.delete(schema.flexWorkRequests);
    await db.delete(schema.flexScheduleAssignments);
    await db.delete(schema.employeeWorkSchedules);
    await db.delete(schema.leavePromotionAlerts);
    await db.delete(schema.leaveUsagePlans);
    await db.delete(schema.leaveBalanceAdjustments);
    await db.delete(schema.leaveRequests);
    await db.delete(schema.leaveBalances);
    await db.delete(schema.payrollDetails);
    await db.delete(schema.payrolls);
    await db.delete(schema.employeePayrollSettings);
    await db.delete(schema.retirementSettlements);
    await db.delete(schema.employeeDocuments);
    await db.delete(schema.employeeAssignments);
    await db.delete(schema.workflows);
    await db.delete(schema.appointments);
    await db.delete(schema.notifications);
    await db.delete(schema.hrIssues);
    await db.delete(schema.approvalLines);
    await db.delete(schema.approvals);
    await db.delete(schema.careerHistories);
    await db.delete(schema.educationHistories);
    await db.delete(schema.certifications);
    await db.delete(schema.familyMembers);
    await db.delete(schema.salaryGrades);
    await db.delete(schema.employees);
    await db.delete(schema.jobCategories);
    await db.delete(schema.departments);
    await db.delete(schema.positionRanks);
    await db.delete(schema.positionTitles);
  }

  const deptIds = new Map<string, string>();
  const rankIds = new Map<string, string>();
  const titleIds = new Map<string, string>();
  const catIds = new Map<string, string>();
  const empIds = new Map<string, string>();

  // Departments: parents before children (sorted by level)
  const depts = [...seedDepartments].sort((a, b) => a.level - b.level);
  for (const d of depts) {
    await db.insert(schema.departments).values({
      id: id(deptIds, d.id)!,
      name: d.name,
      code: d.code,
      parentId: id(deptIds, d.parent_id),
      level: d.level,
      sortOrder: d.sort_order,
      isActive: d.is_active,
      effectiveFrom: d.effective_from,
      effectiveTo: d.effective_to,
    });
  }

  for (const r of seedPositionRanks) {
    await db.insert(schema.positionRanks).values({
      id: id(rankIds, r.id)!,
      name: r.name,
      level: r.level,
      isActive: r.is_active,
      effectiveFrom: r.effective_from,
      effectiveTo: r.effective_to,
    });
  }

  for (const t of seedPositionTitles) {
    await db.insert(schema.positionTitles).values({
      id: id(titleIds, t.id)!,
      name: t.name,
      level: t.level,
      isActive: t.is_active,
      effectiveFrom: t.effective_from,
      effectiveTo: t.effective_to,
    });
  }

  for (const c of seedJobCategories) {
    await db.insert(schema.jobCategories).values({
      id: id(catIds, c.id)!,
      name: c.name,
      code: c.code,
      description: c.description,
      sortOrder: c.sort_order,
      isActive: c.is_active,
      effectiveFrom: c.effective_from,
      effectiveTo: c.effective_to,
    });
  }

  for (const g of seedSalaryGrades) {
    await db.insert(schema.salaryGrades).values({
      id: randomUUID(),
      rankId: id(rankIds, g.rank_id),
      step: g.step,
      baseAmount: String(g.base_amount),
      isActive: g.is_active,
      effectiveFrom: g.effective_from,
      effectiveTo: g.effective_to,
    });
  }

  for (const e of seedEmployees) {
    await db.insert(schema.employees).values({
      id: id(empIds, e.id)!,
      employeeNumber: e.employee_number,
      name: e.name,
      nameEn: e.name_en,
      email: e.email,
      phone: e.phone,
      birthDate: e.birth_date,
      gender: e.gender,
      address: e.address,
      addressDetail: e.address_detail,
      zipCode: e.zip_code,
      departmentId: id(deptIds, e.department_id),
      positionRankId: id(rankIds, e.position_rank_id),
      positionTitleId: id(titleIds, e.position_title_id),
      employmentType: e.employment_type,
      jobClass: e.job_class,
      payMethod: e.pay_method,
      hireDate: e.hire_date,
      resignationDate: e.resignation_date,
      status: e.status,
      baseSalary: String(e.base_salary ?? 0),
      hourlyWage: String(e.hourly_wage ?? 0),
      bankName: e.bank_name,
      bankAccount: e.bank_account,
      profileImageUrl: e.profile_image_url,
      emergencyContactName: e.emergency_contact_name,
      emergencyContactPhone: e.emergency_contact_phone,
      emergencyContactRelation: e.emergency_contact_relation,
      workplaceId: e.workplace_id,
      workArrangement: e.work_arrangement,
      arrangementStartDate: e.arrangement_start_date,
      arrangementEndDate: e.arrangement_end_date,
      residentNumber: e.resident_number,
      personalEmail: e.personal_email,
      marriageDate: e.marriage_date,
    });
  }

  for (const c of seedCareerHistories) {
    const employeeId = empIds.get(c.employee_id);
    if (!employeeId) continue;
    await db.insert(schema.careerHistories).values({
      id: randomUUID(),
      employeeId,
      companyName: c.company_name,
      department: c.department,
      position: c.position,
      startDate: c.start_date,
      endDate: c.end_date,
      description: c.description,
    });
  }

  for (const e of seedEducationHistories) {
    const employeeId = empIds.get(e.employee_id);
    if (!employeeId) continue;
    await db.insert(schema.educationHistories).values({
      id: randomUUID(),
      employeeId,
      schoolName: e.school_name,
      major: e.major,
      degree: e.degree,
      startDate: e.start_date,
      endDate: e.end_date,
      isGraduated: e.is_graduated,
    });
  }

  for (const c of seedCertifications) {
    const employeeId = empIds.get(c.employee_id);
    if (!employeeId) continue;
    await db.insert(schema.certifications).values({
      id: randomUUID(),
      employeeId,
      name: c.name,
      issuer: c.issuer,
      issueDate: c.issue_date,
      expiryDate: c.expiry_date,
      certificateNumber: c.certificate_number,
    });
  }

  for (const f of seedFamilyMembers) {
    const employeeId = empIds.get(f.employee_id);
    if (!employeeId) continue;
    await db.insert(schema.familyMembers).values({
      id: randomUUID(),
      employeeId,
      name: f.name,
      relation: f.relation,
      birthDate: f.birth_date,
      phone: f.phone,
      isDependent: f.is_dependent,
      isLivingTogether: f.is_living_together ?? false,
      hasIncome: f.has_income ?? false,
      medicalNotes: f.medical_notes ?? null,
    });
  }

  // --- Annual-leave balances for every active employee ---
  const [annualType] = await db
    .select()
    .from(schema.leaveTypes)
    .where(eq(schema.leaveTypes.code, 'annual'));
  if (annualType) {
    const year = new Date().getFullYear();
    const refDate = new Date();
    const balances = seedEmployees
      .filter((e) => e.status === 'active')
      .map((e) => {
        const total = calculateAnnualLeave(new Date(e.hire_date), refDate);
        // Spread demo usage deterministically so the dashboards show variety.
        const used = Math.min(total, (e.employee_number.charCodeAt(6) ?? 0) % 8);
        return {
          employeeId: empIds.get(e.id)!,
          leaveTypeId: annualType.id,
          year,
          totalDays: String(total),
          usedDays: String(used),
        };
      });
    if (balances.length > 0) {
      await db.insert(schema.leaveBalances).values(balances).onConflictDoNothing();
      console.log(`Created ${balances.length} annual-leave balances for ${year}`);
    }
  }

  // Demo login accounts linked to seeded employees
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  for (const u of DEMO_USERS) {
    const employeeId = empIds.get(u.seedEmployeeId) ?? null;
    const emp = seedEmployees.find((e) => e.id === u.seedEmployeeId);
    const [row] = await db
      .insert(schema.users)
      .values({
        email: u.email,
        passwordHash,
        name: emp?.name ?? u.email,
        role: u.role,
        employeeId,
      })
      .onConflictDoUpdate({
        target: schema.users.email,
        set: { employeeId, name: emp?.name ?? u.email, role: u.role },
      })
      .returning();
    console.log(row ? `Upserted user ${u.email} (${u.role})` : `User ${u.email} unchanged`);
  }

  console.log(
    `Seeded: ${seedDepartments.length} departments, ${seedPositionRanks.length} ranks, ` +
      `${seedPositionTitles.length} titles, ${seedJobCategories.length} job categories, ` +
      `${seedSalaryGrades.length} salary grades, ${seedEmployees.length} employees, ` +
      `${seedCareerHistories.length} careers, ${seedEducationHistories.length} educations, ` +
      `${seedCertifications.length} certifications, ${seedFamilyMembers.length} family members.`,
  );
  console.log(`Demo user password: ${DEMO_PASSWORD}`);
  await close();
}

