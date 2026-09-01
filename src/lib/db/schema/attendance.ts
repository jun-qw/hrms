import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  time,
  numeric,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';
import { employees } from './employee';

export const ATTENDANCE_STATUSES = [
  'normal',
  'late',
  'early_leave',
  'absent',
  'holiday',
  'leave',
  'half_day',
  'quarter_day',
] as const;

export const LEAVE_TIME_PERIODS = ['am_half', 'pm_half', 'am_quarter', 'pm_quarter'] as const;

export const attendances = pgTable(
  'attendances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),
    date: date('date').notNull(),
    clockIn: timestamp('clock_in', { withTimezone: true }),
    clockOut: timestamp('clock_out', { withTimezone: true }),
    workHours: numeric('work_hours', { precision: 4, scale: 2 }),
    overtimeHours: numeric('overtime_hours', { precision: 4, scale: 2 }).default('0'),
    status: text('status', { enum: ATTENDANCE_STATUSES }).default('normal'),
    attendanceType: text('attendance_type'),
    location: text('location'),
    purpose: text('purpose'),
    leaveTimePeriod: text('leave_time_period', { enum: LEAVE_TIME_PERIODS }),
    scheduledStart: text('scheduled_start'),
    scheduledEnd: text('scheduled_end'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [unique().on(t.employeeId, t.date)],
);

export const attendanceTypeConfigs = pgTable('attendance_type_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').unique().notNull(),
  label: text('label').notNull(),
  category: text('category'),
  deductLeave: boolean('deduct_leave').default(false),
  defaultHours: numeric('default_hours', { precision: 4, scale: 2 }).default('8'),
  isActive: boolean('is_active').default(true),
  effectiveFrom: date('effective_from'),
  effectiveTo: date('effective_to'),
  requiresApproval: boolean('requires_approval').default(false),
  requiresLocation: boolean('requires_location').default(false),
  requiresPurpose: boolean('requires_purpose').default(false),
  countsAsWork: boolean('counts_as_work').default(true),
  sortOrder: integer('sort_order').default(0),
  isSystem: boolean('is_system').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Monthly attendance closeout (월마감)
export const attendanceCloseouts = pgTable(
  'attendance_closeouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    closedBy: text('closed_by').notNull(),
    closedByName: text('closed_by_name').notNull(),
    note: text('note'),
    closedAt: timestamp('closed_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [unique().on(t.year, t.month)],
);

export const WORK_SCHEDULE_TYPES = [
  'fixed',
  'staggered',
  'selective',
  'remote',
  'flexible',
  'compressed',
] as const;

export const workSchedules = pgTable('work_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type', { enum: WORK_SCHEDULE_TYPES }).notNull(),
  startTime: time('start_time').notNull().default('09:00'),
  endTime: time('end_time').notNull().default('18:00'),
  coreStartTime: time('core_start_time'),
  coreEndTime: time('core_end_time'),
  breakMinutes: integer('break_minutes').notNull().default(60),
  weeklyHours: numeric('weekly_hours', { precision: 4, scale: 1 }).notNull().default('40.0'),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  settings: jsonb('settings').default({}),
  effectiveFrom: date('effective_from'),
  effectiveTo: date('effective_to'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const employeeWorkSchedules = pgTable('employee_work_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  workScheduleId: uuid('work_schedule_id')
    .notNull()
    .references(() => workSchedules.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// --- Flexible work (근무유형 배정 / 유연근무 신청) ---

export const flexScheduleAssignments = pgTable('flex_schedule_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  workScheduleId: uuid('work_schedule_id').references(() => workSchedules.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  approvedBy: text('approved_by'),
  approvedByName: text('approved_by_name'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const flexWorkRequests = pgTable('flex_work_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  requestType: text('request_type').notNull(),
  workScheduleId: uuid('work_schedule_id').references(() => workSchedules.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  reason: text('reason'),
  status: text('status').notNull().default('pending'),
  reviewedBy: text('reviewed_by'),
  reviewedByName: text('reviewed_by_name'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewComment: text('review_comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// --- Attendance modification requests (사후결재) ---

export const attendanceModifications = pgTable('attendance_modifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  attendanceId: uuid('attendance_id').references(() => attendances.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  before: jsonb('before').notNull().default({}),
  after: jsonb('after').notNull().default({}),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('pending'),
  approvalId: uuid('approval_id'),
  reviewedBy: text('reviewed_by'),
  reviewedByName: text('reviewed_by_name'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewComment: text('review_comment'),
  attachmentName: text('attachment_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
