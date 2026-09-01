import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  numeric,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';
import { employees } from './employee';

export const PAYROLL_CATEGORIES = ['earning', 'deduction'] as const;
export const PAYROLL_CALC_TYPES = ['fixed', 'hours_rate', 'auto'] as const;

// Consolidated from the legacy `payroll_items` + `payroll_item_configs` pair:
// the app only ever used the config shape, so this is the single item master.
export const payrollItemConfigs = pgTable('payroll_item_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').unique().notNull(),
  category: text('category', { enum: PAYROLL_CATEGORIES }).notNull(),
  calcType: text('calc_type', { enum: PAYROLL_CALC_TYPES }).notNull().default('fixed'),
  isTaxable: boolean('is_taxable').default(true),
  isActive: boolean('is_active').default(true),
  isSystem: boolean('is_system').default(false),
  rateMultiplier: numeric('rate_multiplier', { precision: 4, scale: 2 }),
  formulaDescription: text('formula_description'),
  defaultAmount: numeric('default_amount', { precision: 12, scale: 0 }).default('0'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const PAYROLL_STATUSES = ['draft', 'confirmed', 'paid'] as const;

export const payrolls = pgTable(
  'payrolls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    baseSalary: numeric('base_salary', { precision: 12, scale: 0 }),
    totalEarnings: numeric('total_earnings', { precision: 12, scale: 0 }),
    totalDeductions: numeric('total_deductions', { precision: 12, scale: 0 }),
    netPay: numeric('net_pay', { precision: 12, scale: 0 }),
    dependents: integer('dependents').default(1),
    status: text('status', { enum: PAYROLL_STATUSES }).default('draft'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [unique().on(t.employeeId, t.year, t.month)],
);

export const payrollDetails = pgTable('payroll_details', {
  id: uuid('id').primaryKey().defaultRandom(),
  payrollId: uuid('payroll_id')
    .notNull()
    .references(() => payrolls.id, { onDelete: 'cascade' }),
  payrollItemId: uuid('payroll_item_id').references(() => payrollItemConfigs.id),
  name: text('name').notNull(),
  category: text('category', { enum: PAYROLL_CATEGORIES }).notNull(),
  isTaxable: boolean('is_taxable').default(true),
  formula: text('formula'),
  amount: numeric('amount', { precision: 12, scale: 0 }).notNull(),
});

// --- Retirement settlements (퇴직정산) ---

export const retirementSettlements = pgTable('retirement_settlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  hireDate: date('hire_date').notNull(),
  resignationDate: date('resignation_date').notNull(),
  reasonCode: text('reason_code'),
  reasonDetail: text('reason_detail'),
  baseSalaryAvg: numeric('base_salary_avg', { precision: 12, scale: 0 }).default('0'),
  bonusAvg: numeric('bonus_avg', { precision: 12, scale: 0 }).default('0'),
  annualLeaveCompensation: numeric('annual_leave_compensation', { precision: 12, scale: 0 }).default('0'),
  serviceDays: integer('service_days').default(0),
  serviceYears: numeric('service_years', { precision: 6, scale: 2 }).default('0'),
  dailyAvgWage: numeric('daily_avg_wage', { precision: 12, scale: 0 }).default('0'),
  retirementPay: numeric('retirement_pay', { precision: 12, scale: 0 }).default('0'),
  incomeTax: numeric('income_tax', { precision: 12, scale: 0 }).default('0'),
  localTax: numeric('local_tax', { precision: 12, scale: 0 }).default('0'),
  netPay: numeric('net_pay', { precision: 12, scale: 0 }).default('0'),
  status: text('status').notNull().default('draft'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  paidBy: text('paid_by'),
  paidByName: text('paid_by_name'),
  bankName: text('bank_name'),
  bankAccount: text('bank_account'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const employeePayrollSettings = pgTable('employee_payroll_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  itemCode: text('item_code').notNull(),
  itemName: text('item_name').notNull(),
  category: text('category', { enum: PAYROLL_CATEGORIES }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 0 }).notNull(),
  isActive: boolean('is_active').default(true),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// --- 연도별 급여 기준값 (요율 · 비과세 한도 · 세율 구간) ---

/**
 * 해마다 바뀌는 숫자를 한 덩어리로 모아 연도로 조회합니다.
 *
 * 개편 전에는 4대보험 요율이 코드 상수였고 설정 화면의 값은 표시만 되었습니다.
 * 담당자가 요율을 고쳐도 계산은 옛 숫자로 돌아가는 상태였기 때문에, 기준값을
 * 데이터로 빼고 계산 엔진이 이 값을 읽도록 바꿨습니다.
 *
 * `rates`는 `PayrollRateSet` 모양의 JSON입니다. 구조를 컬럼으로 펼치지 않은
 * 이유는 세율 구간처럼 개수가 해마다 달라질 수 있는 항목이 섞여 있어서입니다.
 */
export const payrollRateSets = pgTable('payroll_rate_sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: integer('year').notNull().unique(),
  rates: jsonb('rates').notNull(),
  /** 이 값들을 어느 고시로 확인했는지 — 다음 담당자를 위한 근거 */
  note: text('note'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type PayrollRateSetRow = typeof payrollRateSets.$inferSelect;
