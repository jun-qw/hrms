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
import { sql } from 'drizzle-orm';
import { employees } from './employee';
import { approvals } from './approval';
import { LEAVE_TIME_PERIODS } from './attendance';

export const leaveTypes = pgTable('leave_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').unique().notNull(),
  isPaid: boolean('is_paid').default(true),
  maxDays: numeric('max_days', { precision: 4, scale: 1 }),
  isActive: boolean('is_active').default(true),
});

export const leaveBalances = pgTable(
  'leave_balances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),
    leaveTypeId: uuid('leave_type_id')
      .notNull()
      .references(() => leaveTypes.id),
    year: integer('year').notNull(),
    totalDays: numeric('total_days', { precision: 4, scale: 1 }).notNull(),
    usedDays: numeric('used_days', { precision: 4, scale: 1 }).default('0'),
    remainingDays: numeric('remaining_days', { precision: 4, scale: 1 }).generatedAlwaysAs(
      sql`total_days - used_days`,
    ),
  },
  (t) => [unique().on(t.employeeId, t.leaveTypeId, t.year)],
);

export const LEAVE_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;

export const leaveRequests = pgTable('leave_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  leaveTypeId: uuid('leave_type_id')
    .notNull()
    .references(() => leaveTypes.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  days: numeric('days', { precision: 4, scale: 1 }).notNull(),
  leaveTimePeriod: text('leave_time_period', { enum: LEAVE_TIME_PERIODS }),
  customStartTime: text('custom_start_time'),
  customEndTime: text('custom_end_time'),
  reason: text('reason'),
  status: text('status', { enum: LEAVE_REQUEST_STATUSES }).default('pending'),
  approvalId: uuid('approval_id').references(() => approvals.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// --- Annual-leave usage plans & promotion alerts (연차 사용계획서 / 촉진) ---

export const leaveUsagePlans = pgTable(
  'leave_usage_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    totalPlannedDays: numeric('total_planned_days', { precision: 4, scale: 1 }).notNull().default('0'),
    monthlyPlan: jsonb('monthly_plan').notNull().default({}),
    reason: text('reason'),
    status: text('status').notNull().default('draft'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: text('reviewed_by'),
    reviewedByName: text('reviewed_by_name'),
    reviewComment: text('review_comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [unique().on(t.employeeId, t.year)],
);

export const leavePromotionAlerts = pgTable('leave_promotion_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  alertRound: integer('alert_round').notNull(),
  remainingDays: numeric('remaining_days', { precision: 4, scale: 1 }).notNull().default('0'),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow(),
  acknowledged: boolean('acknowledged').default(false),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  response: text('response'),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
});

export const leaveBalanceAdjustments = pgTable('leave_balance_adjustments', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  leaveTypeId: uuid('leave_type_id')
    .notNull()
    .references(() => leaveTypes.id),
  year: integer('year').notNull(),
  adjustmentDays: numeric('adjustment_days', { precision: 4, scale: 1 }).notNull(),
  reason: text('reason').notNull(),
  adjustedBy: text('adjusted_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const condolenceLeaveRules = pgTable('condolence_leave_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventName: text('event_name').notNull(),
  days: integer('days').notNull(),
  isPaid: boolean('is_paid').default(true),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
