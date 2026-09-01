CREATE TABLE "employee_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"department_id" uuid,
	"position_rank_id" uuid,
	"position_title_id" uuid,
	"workplace_id" text,
	"appointment_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "employee_assignments" ADD CONSTRAINT "employee_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_assignments" ADD CONSTRAINT "employee_assignments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_assignments" ADD CONSTRAINT "employee_assignments_position_rank_id_position_ranks_id_fk" FOREIGN KEY ("position_rank_id") REFERENCES "public"."position_ranks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_assignments" ADD CONSTRAINT "employee_assignments_position_title_id_position_titles_id_fk" FOREIGN KEY ("position_title_id") REFERENCES "public"."position_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_employee_assignments_asof" ON "employee_assignments" USING btree ("employee_id","effective_from");--> statement-breakpoint
-- Backfill: every existing employee gets an opening assignment running from
-- their hire date, holding whatever department / rank / title they carry now.
-- Without it the as-of lookup would return nothing for anyone hired before
-- this table existed, and the register would show blank departments.
INSERT INTO "employee_assignments"
  ("employee_id", "effective_from", "effective_to", "department_id",
   "position_rank_id", "position_title_id", "workplace_id", "reason")
SELECT
  "id", "hire_date", NULL, "department_id",
  "position_rank_id", "position_title_id", "workplace_id", '입사 시 최초 배치 (이력 도입 전 자료로 소급 생성)'
FROM "employees";
