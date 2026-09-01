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

/**
 * 직군 — 어떤 성격의 일을 하는가.
 *
 * 고용형태(정규/계약)와도, 급여지급방식(월급/시급)과도 다른 축입니다. 정규직
 * 현장직과 정규직 사무직은 고용형태가 같지만 급여 계산과 근태 관리가 다르므로
 * 고용형태로 대신할 수 없습니다.
 *
 * 현장은 다시 둘로 갈립니다 — 반장·직장·과장처럼 월급을 받는 **현장관리직**과,
 * 실근로시간으로 급여를 받는 **현장 시급직**입니다. 둘을 한 값으로 묶으면
 * 급여방식이 섞여 대장에서 구분할 수 없습니다.
 */
export const JOB_CLASSES = ['office', 'field_manager', 'field'] as const;

/**
 * 급여지급방식.
 *
 * 현장직은 통상 시급직입니다 — 강제하지는 않고, 직군을 현장직으로 고르면 시급이
 * 기본으로 잡히되 담당자가 바꿀 수 있게 둡니다.
 */
export const PAY_METHODS = ['monthly', 'annual', 'hourly', 'daily'] as const;
export const EMPLOYEE_STATUSES = ['active', 'on_leave', 'resigned', 'retired'] as const;

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeNumber: text('employee_number').unique().notNull(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  /**
   * 회사 이메일. **필수가 아닙니다** — 현장 근로자는 회사 계정이 없는 경우가
   * 많습니다. 예전에는 NOT NULL이라 계정 없는 사람을 넣으려면 가짜 주소를
   * 만들어야 했고, 그런 주소는 언젠가 실제로 메일이 발송됩니다.
   * unique는 유지합니다 — PostgreSQL은 NULL 중복을 허용합니다.
   */
  email: text('email').unique(),
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
  jobClass: text('job_class', { enum: JOB_CLASSES }).notNull().default('office'),
  payMethod: text('pay_method', { enum: PAY_METHODS }).notNull().default('monthly'),
  hireDate: date('hire_date').notNull(),
  resignationDate: date('resignation_date'),
  status: text('status', { enum: EMPLOYEE_STATUSES }).default('active'),
  /** 월급제·연봉제의 월 기본급. 시급·일급제에서는 쓰지 않습니다. */
  baseSalary: numeric('base_salary', { precision: 12, scale: 0 }).default('0'),
  /**
   * 시급제의 시급, 일급제의 일급.
   *
   * 기본급 컬럼 하나에 방식에 따라 다른 의미의 금액을 담으면 "이 숫자가 월급인지
   * 시급인지" 화면마다 다시 판단해야 하고, 급여에서 그런 모호함은 곧 사고입니다.
   */
  hourlyWage: numeric('hourly_wage', { precision: 12, scale: 0 }).default('0'),
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

// --- Assignment history (소속 이력) ---

/**
 * Where an employee sat, from when to when.
 *
 * `employees` carries only the *current* department / rank / title, which is
 * enough to draw today's org chart and no help at all for anything else:
 * "what did the org look like in March", "recalculate June payroll under the
 * grade they held then", "print a career certificate" all need the value that
 * was in force on a given date.
 *
 * So the intervals here are the record, and the columns on `employees` are a
 * cache of whichever interval covers today. Intervals for one employee never
 * overlap: opening a new one closes the previous at the day before.
 *
 * A row usually comes from an 인사발령; `appointmentId` points back at it.
 * Rows without one are the opening assignment created at hire, or a manual
 * correction.
 */
export const employeeAssignments = pgTable(
  'employee_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    effectiveFrom: date('effective_from').notNull(),
    /** null while this is the assignment currently in force. */
    effectiveTo: date('effective_to'),
    departmentId: uuid('department_id').references(() => departments.id),
    positionRankId: uuid('position_rank_id').references(() => positionRanks.id),
    positionTitleId: uuid('position_title_id').references(() => positionTitles.id),
    /** Plain text, matching employees.workplaceId. */
    workplaceId: text('workplace_id'),
    /** The 인사발령 this came from, when it came from one. */
    appointmentId: uuid('appointment_id'),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_employee_assignments_asof').on(t.employeeId, t.effectiveFrom)],
);

export type EmployeeAssignment = typeof employeeAssignments.$inferSelect;
