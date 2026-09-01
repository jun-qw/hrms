import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  numeric,
  timestamp,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').unique().notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => departments.id),
  level: integer('level').notNull().default(1),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  effectiveFrom: date('effective_from'),
  effectiveTo: date('effective_to'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const positionRanks = pgTable('position_ranks', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  level: integer('level').notNull(),
  isActive: boolean('is_active').default(true),
  effectiveFrom: date('effective_from'),
  effectiveTo: date('effective_to'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const positionTitles = pgTable('position_titles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  level: integer('level').notNull(),
  isActive: boolean('is_active').default(true),
  effectiveFrom: date('effective_from'),
  effectiveTo: date('effective_to'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const jobCategories = pgTable('job_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').unique().notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  effectiveFrom: date('effective_from'),
  effectiveTo: date('effective_to'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const salaryGrades = pgTable('salary_grades', {
  id: uuid('id').primaryKey().defaultRandom(),
  rankId: uuid('rank_id').references(() => positionRanks.id),
  step: integer('step').notNull(),
  baseAmount: numeric('base_amount', { precision: 12, scale: 0 }).notNull(),
  isActive: boolean('is_active').default(true),
  effectiveFrom: date('effective_from'),
  effectiveTo: date('effective_to'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
