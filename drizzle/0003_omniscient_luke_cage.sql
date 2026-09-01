CREATE TABLE "attendance_modifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_id" uuid,
	"employee_id" uuid NOT NULL,
	"before" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"after" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approval_id" uuid,
	"reviewed_by" text,
	"reviewed_by_name" text,
	"reviewed_at" timestamp with time zone,
	"review_comment" text,
	"attachment_name" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "flex_schedule_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"work_schedule_id" uuid,
	"start_date" date NOT NULL,
	"end_date" date,
	"approved_by" text,
	"approved_by_name" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "flex_work_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"request_type" text NOT NULL,
	"work_schedule_id" uuid,
	"start_date" date NOT NULL,
	"end_date" date,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_by_name" text,
	"reviewed_at" timestamp with time zone,
	"review_comment" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_promotion_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"alert_round" integer NOT NULL,
	"remaining_days" numeric(4, 1) DEFAULT '0' NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now(),
	"acknowledged" boolean DEFAULT false,
	"acknowledged_at" timestamp with time zone,
	"response" text,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "leave_usage_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"total_planned_days" numeric(4, 1) DEFAULT '0' NOT NULL,
	"monthly_plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reason" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"reviewed_by_name" text,
	"review_comment" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "leave_usage_plans_employee_id_year_unique" UNIQUE("employee_id","year")
);
--> statement-breakpoint
CREATE TABLE "retirement_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"hire_date" date NOT NULL,
	"resignation_date" date NOT NULL,
	"reason_code" text,
	"reason_detail" text,
	"base_salary_avg" numeric(12, 0) DEFAULT '0',
	"bonus_avg" numeric(12, 0) DEFAULT '0',
	"annual_leave_compensation" numeric(12, 0) DEFAULT '0',
	"service_days" integer DEFAULT 0,
	"service_years" numeric(6, 2) DEFAULT '0',
	"daily_avg_wage" numeric(12, 0) DEFAULT '0',
	"retirement_pay" numeric(12, 0) DEFAULT '0',
	"income_tax" numeric(12, 0) DEFAULT '0',
	"local_tax" numeric(12, 0) DEFAULT '0',
	"net_pay" numeric(12, 0) DEFAULT '0',
	"status" text DEFAULT 'draft' NOT NULL,
	"paid_at" timestamp with time zone,
	"paid_by" text,
	"paid_by_name" text,
	"bank_name" text,
	"bank_account" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trip_expense_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_code" text NOT NULL,
	"job_name" text NOT NULL,
	"grade" text NOT NULL,
	"scope" text NOT NULL,
	"daily_amount" numeric(12, 0) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "trip_expense_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"approval_id" uuid,
	"trip_type" text,
	"trip_grade" text,
	"trip_scope" text,
	"destination" text,
	"client" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"trip_days" integer DEFAULT 0,
	"daily_allowance" numeric(12, 0) DEFAULT '0',
	"meal_allowance" numeric(12, 0) DEFAULT '0',
	"accommodation_allowance" numeric(12, 0) DEFAULT '0',
	"fuel_allowance" numeric(12, 0) DEFAULT '0',
	"other_allowance" numeric(12, 0) DEFAULT '0',
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_amount" numeric(12, 0) DEFAULT '0',
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"reviewed_by_name" text,
	"review_comment" text,
	"paid_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"related_id" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workplaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"business_number" text,
	"representative" text,
	"address" text,
	"tax_office" text,
	"industry_type" text,
	"business_type" text,
	"is_headquarters" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"workplace_type" text DEFAULT 'headquarters',
	"country_code" text DEFAULT 'KR',
	"timezone" text DEFAULT 'Asia/Seoul',
	"use_custom_work_hours" boolean DEFAULT false,
	"start_time" text DEFAULT '09:00',
	"end_time" text DEFAULT '18:00',
	"break_minutes" integer DEFAULT 60,
	"weekly_hours" numeric(4, 1) DEFAULT '40',
	"late_grace_minutes" integer DEFAULT 0,
	"currency" text DEFAULT 'KRW',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "workplaces_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "workflows" DROP CONSTRAINT "workflows_employee_id_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "attendance_type_configs" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "attendance_type_configs" ADD COLUMN "deduct_leave" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "attendance_type_configs" ADD COLUMN "default_hours" numeric(4, 2) DEFAULT '8';--> statement-breakpoint
ALTER TABLE "approval_lines" ADD COLUMN "line_type" text DEFAULT 'approval' NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "custom_start_time" text;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "custom_end_time" text;--> statement-breakpoint
ALTER TABLE "workflow_templates" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "workflow_templates" ADD COLUMN "steps" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "template_name" text;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "employee_name" text;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "current_step" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "total_steps" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "step_names" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "tasks" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_modifications" ADD CONSTRAINT "attendance_modifications_attendance_id_attendances_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_modifications" ADD CONSTRAINT "attendance_modifications_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flex_schedule_assignments" ADD CONSTRAINT "flex_schedule_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flex_schedule_assignments" ADD CONSTRAINT "flex_schedule_assignments_work_schedule_id_work_schedules_id_fk" FOREIGN KEY ("work_schedule_id") REFERENCES "public"."work_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flex_work_requests" ADD CONSTRAINT "flex_work_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flex_work_requests" ADD CONSTRAINT "flex_work_requests_work_schedule_id_work_schedules_id_fk" FOREIGN KEY ("work_schedule_id") REFERENCES "public"."work_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_promotion_alerts" ADD CONSTRAINT "leave_promotion_alerts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_usage_plans" ADD CONSTRAINT "leave_usage_plans_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retirement_settlements" ADD CONSTRAINT "retirement_settlements_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_expense_settlements" ADD CONSTRAINT "trip_expense_settlements_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_employees_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notifications_recipient" ON "notifications" USING btree ("recipient_id","is_read");--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;