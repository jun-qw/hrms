import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';
import { employees } from './employee';
import { departments, positionRanks, positionTitles } from './organization';

export const APPROVAL_STATUSES = [
  'pending',
  'in_progress',
  'approved',
  'rejected',
  'cancelled',
] as const;

export const approvals = pgTable('approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  type: text('type').notNull(),
  requesterId: uuid('requester_id')
    .notNull()
    .references(() => employees.id),
  content: jsonb('content'),
  status: text('status', { enum: APPROVAL_STATUSES }).default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const approvalLines = pgTable(
  'approval_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    approvalId: uuid('approval_id')
      .notNull()
      .references(() => approvals.id, { onDelete: 'cascade' }),
    approverId: uuid('approver_id')
      .notNull()
      .references(() => employees.id),
    step: integer('step').notNull(),
    status: text('status', { enum: ['pending', 'approved', 'rejected'] }).default('pending'),
    // approval(순차결재) / agreement(합의-병렬) / cc(참조-열람만)
    lineType: text('line_type').notNull().default('approval'),
    comment: text('comment'),
    actedAt: timestamp('acted_at', { withTimezone: true }),
  },
  (t) => [unique().on(t.approvalId, t.step)],
);

export const approvalTemplates = pgTable('approval_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  documentType: text('document_type').notNull(),
  steps: jsonb('steps').notNull().default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const APPOINTMENT_TYPES = [
  'promotion',
  'transfer',
  'title_change',
  'hire',
  'resignation',
  'other',
] as const;

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  type: text('type', { enum: APPOINTMENT_TYPES }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  prevDepartmentId: uuid('prev_department_id').references(() => departments.id),
  prevPositionRankId: uuid('prev_position_rank_id').references(() => positionRanks.id),
  prevPositionTitleId: uuid('prev_position_title_id').references(() => positionTitles.id),
  newDepartmentId: uuid('new_department_id').references(() => departments.id),
  newPositionRankId: uuid('new_position_rank_id').references(() => positionRanks.id),
  newPositionTitleId: uuid('new_position_title_id').references(() => positionTitles.id),
  reason: text('reason'),
  approvalId: uuid('approval_id').references(() => approvals.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
