import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  date,
  numeric,
  timestamp,
  jsonb,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { employees } from './employee';
import { USER_ROLES, users } from './auth';

// Key-value settings store, grouped by category (company / work / leave /
// payroll / notification / security / evaluation / branding ...).
export const companySettings = pgTable(
  'company_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    category: varchar('category', { length: 50 }).notNull(),
    key: varchar('key', { length: 100 }).notNull(),
    value: text('value'),
    description: varchar('description', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [unique().on(t.category, t.key)],
);

export const holidays = pgTable(
  'holidays',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    date: date('date').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    type: text('type', { enum: ['legal', 'substitute', 'company'] }).notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [unique().on(t.date, t.name)],
);

export const menuPermissions = pgTable('menu_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: text('role', { enum: USER_ROLES }).notNull().unique(),
  allowedPaths: jsonb('allowed_paths').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const codeGroups = pgTable('code_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  isSystem: boolean('is_system').default(false),
  sortOrder: integer('sort_order').default(0),
  effectiveFrom: date('effective_from'),
  effectiveTo: date('effective_to'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const codeItems = pgTable(
  'code_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => codeGroups.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    label: text('label').notNull(),
    value: text('value'),
    isActive: boolean('is_active').default(true),
    isSystem: boolean('is_system').default(false),
    sortOrder: integer('sort_order').default(0),
    effectiveFrom: date('effective_from'),
    effectiveTo: date('effective_to'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [unique().on(t.groupId, t.code)],
);

// --- HR issues ---

export const hrIssues = pgTable('hr_issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  type: text('type', {
    enum: ['grievance', 'safety', 'policy_violation', 'payroll_dispute', 'harassment', 'other'],
  }).notNull(),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'critical'] })
    .notNull()
    .default('medium'),
  status: text('status', {
    enum: ['open', 'in_progress', 'under_review', 'resolved', 'closed'],
  })
    .notNull()
    .default('open'),
  reporterId: uuid('reporter_id').references(() => employees.id),
  assigneeId: uuid('assignee_id').references(() => employees.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

// --- Workflows ---

export const WORKFLOW_TYPES = ['onboarding', 'offboarding', 'promotion', 'transfer', 'custom'] as const;

// Steps/tasks/documents form a deep tree that is always read and written as a
// whole, so they are stored as JSONB rather than split across child tables.
export const workflowTemplates = pgTable('workflow_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type', { enum: WORKFLOW_TYPES }).notNull(),
  description: text('description'),
  steps: jsonb('steps').notNull().default([]),
  /** @deprecated superseded by `steps`; retained so upgrades are non-destructive */
  tasks: jsonb('tasks').notNull().default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').references(() => workflowTemplates.id),
  templateName: text('template_name'),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  employeeName: text('employee_name'),
  department: text('department'),
  type: text('type', { enum: WORKFLOW_TYPES }).notNull(),
  status: text('status', {
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
  })
    .notNull()
    .default('pending'),
  currentStep: integer('current_step').default(0),
  totalSteps: integer('total_steps').default(0),
  stepNames: jsonb('step_names').notNull().default([]),
  tasks: jsonb('tasks').notNull().default([]),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

/** @deprecated Task trees now live in `workflows.tasks` (JSONB). Kept so the
 *  table is not dropped from existing installations. */
export const workflowTasks = pgTable('workflow_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id')
    .notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  assigneeRole: text('assignee_role'),
  assigneeId: uuid('assignee_id').references(() => employees.id),
  dueDays: integer('due_days'),
  sortOrder: integer('sort_order').default(0),
  status: text('status', { enum: ['pending', 'completed', 'skipped'] })
    .notNull()
    .default('pending'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// --- Workplaces (사업장) ---

export const workplaces = pgTable('workplaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  businessNumber: text('business_number'),
  representative: text('representative'),
  address: text('address'),
  taxOffice: text('tax_office'),
  industryType: text('industry_type'),
  businessType: text('business_type'),
  isHeadquarters: boolean('is_headquarters').default(false),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  workplaceType: text('workplace_type').default('headquarters'),
  countryCode: text('country_code').default('KR'),
  timezone: text('timezone').default('Asia/Seoul'),
  useCustomWorkHours: boolean('use_custom_work_hours').default(false),
  startTime: text('start_time').default('09:00'),
  endTime: text('end_time').default('18:00'),
  breakMinutes: integer('break_minutes').default(60),
  weeklyHours: numeric('weekly_hours', { precision: 4, scale: 1 }).default('40'),
  lateGraceMinutes: integer('late_grace_minutes').default(0),
  currency: text('currency').default('KRW'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// --- Notifications ---

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    link: text('link'),
    isRead: boolean('is_read').notNull().default(false),
    relatedId: text('related_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_notifications_recipient').on(t.recipientId, t.isRead)],
);

// --- Audit ---

export const changeHistory = pgTable(
  'change_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    entityLabel: text('entity_label').notNull(),
    action: text('action', { enum: ['create', 'update', 'delete'] }).notNull(),
    changes: jsonb('changes').notNull().default([]),
    changedBy: text('changed_by').notNull(),
    changedByName: text('changed_by_name').notNull(),
    changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_change_history_entity').on(t.entityType, t.entityId)],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
    userId: text('user_id').notNull(),
    userName: text('user_name').notNull(),
    userRole: text('user_role').notNull(),
    actionType: text('action_type').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id'),
    targetLabel: text('target_label').notNull(),
    details: jsonb('details'),
    sessionId: text('session_id').notNull(),
  },
  (t) => [index('idx_audit_logs_date').on(t.timestamp.desc())],
);

// --- Branding (white-labelling) ---

/**
 * Customer logo / favicon, stored in the database so an installation stays
 * self-contained: no writable upload directory or volume mount to configure,
 * and the branding travels with a database backup.
 */
export const brandingAssets = pgTable('branding_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** 'logo' | 'favicon' — one row per slot. */
  kind: text('kind').unique().notNull(),
  mimeType: text('mime_type').notNull(),
  /** Base64 payload; assets are capped at a few hundred KB. */
  data: text('data').notNull(),
  fileName: text('file_name'),
  byteSize: integer('byte_size').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// --- Saved grid views (대장 화면의 열 구성 · 필터 프리셋) ---

/**
 * A named column/filter/sort combination for one grid. Rows are per user
 * unless `isShared` is set, in which case everyone in the tenant sees them —
 * that is how an HR lead publishes a house layout (예: 법정 노동자명부) to
 * the rest of the team.
 *
 * `state` holds the serialised grid state (visible columns and their order,
 * widths, pinning, sort, per-column filters). It is deliberately opaque JSON:
 * grids evolve, and a saved view that references a column the grid no longer
 * has is simply ignored when it is applied.
 */
export const gridViews = pgTable(
  'grid_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Which grid this belongs to, e.g. 'employees' or 'payroll-register'. */
    gridKey: text('grid_key').notNull(),
    name: text('name').notNull(),
    ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'cascade' }),
    isShared: boolean('is_shared').notNull().default(false),
    /** Applied automatically when the grid opens, for this owner. */
    isDefault: boolean('is_default').notNull().default(false),
    state: jsonb('state').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_grid_views_key').on(t.gridKey, t.ownerUserId),
    unique('uq_grid_views_owner_name').on(t.gridKey, t.ownerUserId, t.name),
  ],
);

export type GridViewRow = typeof gridViews.$inferSelect;
