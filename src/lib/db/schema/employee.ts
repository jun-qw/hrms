import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  numeric,
  timestamp,
  customType,
  index,
} from 'drizzle-orm/pg-core';
import { departments, positionRanks, positionTitles } from './organization';

export const EMPLOYMENT_TYPES = ['regular', 'contract', 'parttime', 'intern'] as const;
export const EMPLOYEE_STATUSES = ['active', 'on_leave', 'resigned', 'retired'] as const;

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeNumber: text('employee_number').unique().notNull(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  email: text('email').unique().notNull(),
  phone: text('phone'),
  birthDate: date('birth_date'),
  gender: text('gender', { enum: ['M', 'F'] }),
  address: text('address'),
  addressDetail: text('address_detail'),
  zipCode: text('zip_code'),
  departmentId: uuid('department_id').references(() => departments.id),
  positionRankId: uuid('position_rank_id').references(() => positionRanks.id),
  positionTitleId: uuid('position_title_id').references(() => positionTitles.id),
  employmentType: text('employment_type', { enum: EMPLOYMENT_TYPES }).default('regular'),
  hireDate: date('hire_date').notNull(),
  resignationDate: date('resignation_date'),
  status: text('status', { enum: EMPLOYEE_STATUSES }).default('active'),
  baseSalary: numeric('base_salary', { precision: 12, scale: 0 }).default('0'),
  bankName: text('bank_name'),
  bankAccount: text('bank_account'),
  profileImageUrl: text('profile_image_url'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  emergencyContactRelation: text('emergency_contact_relation'),
  // Plain text until workplaces move from the settings store into the DB
  workplaceId: text('workplace_id'),
  workArrangement: text('work_arrangement'),
  arrangementStartDate: date('arrangement_start_date'),
  arrangementEndDate: date('arrangement_end_date'),
  residentNumber: text('resident_number'),
  personalEmail: text('personal_email'),
  marriageDate: date('marriage_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const careerHistories = pgTable('career_histories', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  companyName: text('company_name').notNull(),
  department: text('department'),
  position: text('position'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  description: text('description'),
});

export const educationHistories = pgTable('education_histories', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  schoolName: text('school_name').notNull(),
  major: text('major'),
  degree: text('degree', {
    enum: ['high_school', 'associate', 'bachelor', 'master', 'doctorate'],
  }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  isGraduated: boolean('is_graduated').default(false),
});

export const certifications = pgTable('certifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  issuer: text('issuer'),
  issueDate: date('issue_date'),
  expiryDate: date('expiry_date'),
  certificateNumber: text('certificate_number'),
});

export const familyMembers = pgTable('family_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  relation: text('relation').notNull(),
  birthDate: date('birth_date'),
  phone: text('phone'),
  isDependent: boolean('is_dependent').default(false),
  isLivingTogether: boolean('is_living_together').default(false),
  hasIncome: boolean('has_income').default(false),
  medicalNotes: text('medical_notes'),
});

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

// --- Photos and attached documents (인사카드 사진 / 원본 서류) ---

/**
 * Raw file bytes. Stored in the database rather than on disk so an
 * installation stays self-contained: no upload volume to mount, and personnel
 * documents are included in the same backup as the records they belong to.
 */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const EMPLOYEE_FILE_KINDS = ['photo', 'document'] as const;
export type EmployeeFileKind = (typeof EMPLOYEE_FILE_KINDS)[number];

export const employeeDocuments = pgTable(
  'employee_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    /** 'photo' is the single profile picture; 'document' is a filed record. */
    kind: text('kind', { enum: EMPLOYEE_FILE_KINDS }).notNull().default('document'),
    /** Free-form filing category for documents (계약서, 자격증 사본 ...). */
    category: text('category'),
    title: text('title'),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    byteSize: integer('byte_size').notNull().default(0),
    data: bytea('data').notNull(),
    uploadedBy: text('uploaded_by'),
    uploadedByName: text('uploaded_by_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_employee_documents_employee').on(t.employeeId, t.kind)],
);

export type EmployeeDocumentRow = typeof employeeDocuments.$inferSelect;
