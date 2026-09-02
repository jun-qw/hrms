/**
 * Initial seed: the administrator account and the neutral defaults a
 * fresh installation needs. Contains no customer-specific data.
 *
 * Exported so both the CLI wrapper and `npm run setup` can run it.
 */
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createDb } from '../../src/lib/db/client';
import * as schema from '../../src/lib/db/schema';
import {
  defaultWorkSchedules,
  defaultWorkplaces,
  defaultAttendanceTypes,
  defaultCondolenceRules,
  defaultHolidays,
  defaultApprovalTemplates,
} from '../../src/lib/demo-data/settings-seed';
import { seedWorkflowTemplates } from '../../src/lib/demo-data/workflow-seed';
import { defaultPayrollItems } from '../../src/lib/demo-data/payroll-seed';
import { seedCodeGroups, seedCodeItems } from '../../src/lib/demo-data/code-seed';
import { DEFAULT_RATE_SET, STATUTORY_MINIMUM_WAGE } from '../../src/lib/payroll/rate-set';

export async function runSeed() {
  const { db, close } = createDb();

  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const name = process.env.SEED_ADMIN_NAME ?? 'Administrator';

  // --- Admin account ---
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing.length === 0) {
    await db.insert(schema.users).values({
      email,
      passwordHash: await bcrypt.hash(password, 12),
      name,
      role: 'admin',
    });
    console.log(`Created admin account: ${email}`);
  } else {
    console.log(`Admin account already exists: ${email} (skipped)`);
  }

  // --- Default leave types ---
  const leaveTypeCount = await db.select().from(schema.leaveTypes);
  if (leaveTypeCount.length === 0) {
    await db.insert(schema.leaveTypes).values([
      { name: 'Annual Leave', code: 'annual', isPaid: true },
      { name: 'Sick Leave', code: 'sick', isPaid: true, maxDays: '30' },
      { name: 'Family Event Leave', code: 'condolence', isPaid: true },
      { name: 'Maternity Leave', code: 'maternity', isPaid: true, maxDays: '90' },
      { name: 'Paternity Leave', code: 'paternity', isPaid: true, maxDays: '10' },
      { name: 'Other', code: 'other', isPaid: false },
    ]);
    console.log('Created default leave types');
  }

  // --- Default configuration collections ---
  const scheduleCount = await db.select().from(schema.workSchedules);
  if (scheduleCount.length === 0) {
    await db.insert(schema.workSchedules).values(
      defaultWorkSchedules.map((w) => ({
        name: w.name,
        type: w.type,
        startTime: w.start_time,
        endTime: w.end_time,
        coreStartTime: w.core_start_time,
        coreEndTime: w.core_end_time,
        breakMinutes: w.break_minutes,
        weeklyHours: String(w.weekly_hours),
        isDefault: w.is_default,
        isActive: w.is_active,
        settings: w.settings,
      })),
    );
    console.log(`Created ${defaultWorkSchedules.length} work schedules`);
  }

  const workplaceCount = await db.select().from(schema.workplaces);
  if (workplaceCount.length === 0) {
    await db.insert(schema.workplaces).values(
      defaultWorkplaces.map((w) => ({
        code: w.code,
        name: w.name,
        isHeadquarters: w.is_headquarters,
        isActive: w.is_active,
        sortOrder: w.sort_order,
        workplaceType: w.workplace_type,
        countryCode: w.country_code,
        timezone: w.timezone,
        currency: w.currency,
        useCustomWorkHours: w.use_custom_work_hours,
        startTime: w.start_time,
        endTime: w.end_time,
        breakMinutes: w.break_minutes,
        weeklyHours: String(w.weekly_hours),
        lateGraceMinutes: w.late_grace_minutes,
      })),
    );
    console.log('Created default workplace');
  }

  const attTypeCount = await db.select().from(schema.attendanceTypeConfigs);
  if (attTypeCount.length === 0) {
    await db.insert(schema.attendanceTypeConfigs).values(
      defaultAttendanceTypes.map((t) => ({
        code: t.code,
        label: t.label,
        category: t.category,
        isActive: t.is_active,
        requiresApproval: t.requires_approval,
        requiresLocation: t.requires_location,
        requiresPurpose: t.requires_purpose,
        countsAsWork: t.counts_as_work,
        deductLeave: t.deduct_leave,
        defaultHours: String(t.default_hours),
        sortOrder: t.sort_order,
        isSystem: t.is_system,
      })),
    );
    console.log(`Created ${defaultAttendanceTypes.length} attendance types`);
  }

  const condolenceCount = await db.select().from(schema.condolenceLeaveRules);
  if (condolenceCount.length === 0) {
    await db.insert(schema.condolenceLeaveRules).values(
      defaultCondolenceRules.map((r) => ({
        eventName: r.event_name,
        days: r.days,
        isPaid: r.is_paid,
        isActive: r.is_active,
      })),
    );
    console.log(`Created ${defaultCondolenceRules.length} condolence leave rules`);
  }

  const holidayCount = await db.select().from(schema.holidays);
  if (holidayCount.length === 0) {
    await db.insert(schema.holidays).values(
      defaultHolidays.map((h) => ({
        date: h.date,
        name: h.name,
        type: h.type,
        isActive: h.is_active,
      })),
    );
    console.log(`Created ${defaultHolidays.length} holidays`);
  }

  const templateCount = await db.select().from(schema.approvalTemplates);
  if (templateCount.length === 0) {
    await db.insert(schema.approvalTemplates).values(
      defaultApprovalTemplates.map((t) => ({
        name: t.name,
        documentType: t.document_type,
        steps: t.steps,
        isActive: t.is_active,
      })),
    );
    console.log(`Created ${defaultApprovalTemplates.length} approval templates`);
  }

  const codeGroupCount = await db.select().from(schema.codeGroups);
  if (codeGroupCount.length === 0) {
    const groupIdByCode = new Map<string, string>();
    for (const g of seedCodeGroups) {
      const [row] = await db
        .insert(schema.codeGroups)
        .values({
          code: g.group_code,
          name: g.group_name,
          description: g.description,
          isActive: g.is_active,
          isSystem: g.is_system,
          sortOrder: g.sort_order,
          effectiveFrom: g.effective_from,
          effectiveTo: g.effective_to,
        })
        .returning();
      groupIdByCode.set(g.id, row.id);
    }
    const items = seedCodeItems
      .map((i) => {
        const groupId = groupIdByCode.get(i.group_id);
        if (!groupId) return null;
        return {
          groupId,
          code: i.code,
          label: i.label,
          isActive: i.is_active,
          isSystem: i.is_system,
          sortOrder: i.sort_order,
          effectiveFrom: i.effective_from,
          effectiveTo: i.effective_to,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
    if (items.length > 0) await db.insert(schema.codeItems).values(items);
    console.log(`Created ${seedCodeGroups.length} code groups / ${items.length} code items`);
  }

  const payrollItemCount = await db.select().from(schema.payrollItemConfigs);
  if (payrollItemCount.length === 0) {
    await db.insert(schema.payrollItemConfigs).values(
      defaultPayrollItems.map((i) => ({
        name: i.name,
        code: i.code,
        category: i.category,
        calcType: i.calc_type,
        isTaxable: i.is_taxable,
        isActive: i.is_active,
        rateMultiplier: i.rate_multiplier === null ? null : String(i.rate_multiplier),
        formulaDescription: i.formula_description,
        defaultAmount: String(i.default_amount),
        sortOrder: i.sort_order,
      })),
    );
    console.log(`Created ${defaultPayrollItems.length} payroll items`);
  }

  const workflowTemplateCount = await db.select().from(schema.workflowTemplates);
  if (workflowTemplateCount.length === 0) {
    await db.insert(schema.workflowTemplates).values(
      seedWorkflowTemplates.map((t) => ({
        name: t.name,
        type: t.type,
        description: t.description,
        steps: t.steps,
        isActive: t.is_active,
      })),
    );
    console.log(`Created ${seedWorkflowTemplates.length} workflow templates`);
  }

  // --- 연도별 급여 기준값 ---
  // 요율·비과세 한도·세율 구간을 데이터로 넣습니다. 값 자체는 확정 고시값이
  // 아니므로, 운영 투입 전에 설정 화면에서 대조해야 합니다.
  //
  // 최근 몇 해를 함께 넣는 이유는 두 가지입니다. 과거 급여를 다시 돌릴 때 그
  // 해의 요율이 있어야 하고, 담당자가 "연도별로 관리된다"는 것을 화면에서
  // 바로 보게 되기 때문입니다. 최저임금만 해당 연도 고시액으로 채우고
  // 나머지는 기본값을 이어 씁니다 — 지어낸 요율을 확정값처럼 넣지 않습니다.
  const rateSetCount = await db.select().from(schema.payrollRateSets);
  if (rateSetCount.length === 0) {
    for (const year of [2024, 2025, 2026]) {
      const minimum = STATUTORY_MINIMUM_WAGE[year];
      const rates = {
        ...DEFAULT_RATE_SET,
        year,
        minimumHourlyWage: minimum ?? DEFAULT_RATE_SET.minimumHourlyWage,
        verified: false,
        verifiedAt: null,
        verifiedBy: null,
        note:
          `최저임금은 ${year}년 고시액입니다. 4대보험 요율·비과세 한도는 ` +
          '개편 전 코드의 추정값이라 고시값 대조가 필요합니다.',
      };
      await db.insert(schema.payrollRateSets).values({ year, rates, note: rates.note });
    }
    console.log('Created payroll rate sets for 2024, 2025, 2026');
  }

  // --- Default settings sections (rates are tenant-adjustable) ---
  const settingsCount = await db.select().from(schema.companySettings);
  if (settingsCount.length === 0) {
    const sections: Record<string, unknown> = {
      company: {
        name: '대한오토텍(주)',
        business_number: '621-81-98896',
        ceo_name: '',
        address: '',
        industry: '',
        phone: '',
        fax: '',
        website: '',
      },
      work: {
        default_start_time: '09:00',
        default_end_time: '18:00',
        lunch_break_minutes: 60,
        weekly_hours: 40,
        overtime_rate: 1.5,
        night_rate: 0.5,
        holiday_rate: 1.5,
        holiday_overtime_rate: 2.0,
      },
      leave: { auto_grant_annual: true, allow_half_day: true, allow_quarter_day: false },
      payroll: {
        pay_day: 25,
        national_pension_rate: 4.5,
        health_insurance_rate: 3.545,
        long_term_care_rate: 12.95,
        employment_insurance_rate: 0.9,
        meal_allowance_limit: 200000,
        transport_allowance_limit: 200000,
      },
      security: { session_timeout_minutes: 480, min_password_length: 8 },
    };
    await db.insert(schema.companySettings).values(
      Object.entries(sections).map(([category, value]) => ({
        category,
        key: '__section__',
        value: JSON.stringify(value),
      })),
    );
    console.log(`Created ${Object.keys(sections).length} settings sections`);
  }

  await close();
  console.log('Seed complete.');
}

