import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { employees } from './employee';

export const USER_ROLES = ['admin', 'hr_manager', 'dept_manager', 'employee'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Replaces the Supabase `profiles` table: standalone credential store,
// linked 1:1 to an employee record when the user is an employee.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  employeeId: uuid('employee_id').references(() => employees.id),
  role: text('role', { enum: USER_ROLES }).notNull().default('employee'),
  locale: text('locale').notNull().default('en'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
