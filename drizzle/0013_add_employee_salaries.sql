CREATE TABLE "employee_salaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"pay_method" text DEFAULT 'monthly' NOT NULL,
	"base_salary" numeric(12, 0) DEFAULT '0' NOT NULL,
	"hourly_wage" numeric(12, 0) DEFAULT '0' NOT NULL,
	"reason" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "employee_salaries" ADD CONSTRAINT "employee_salaries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_employee_salaries_asof" ON "employee_salaries" USING btree ("employee_id","effective_from");--> statement-breakpoint
-- 기존 직원의 현재 급여를 입사일부터 유효한 첫 구간으로 옮겨 둡니다.
-- 없으면 시점 조회가 아무것도 못 찾아 급여가 0으로 계산됩니다.
INSERT INTO "employee_salaries"
  ("employee_id", "effective_from", "effective_to", "pay_method", "base_salary", "hourly_wage", "reason")
SELECT
  "id", "hire_date", NULL, "pay_method",
  COALESCE("base_salary", '0'), COALESCE("hourly_wage", '0'),
  '이력 도입 전 자료로 소급 생성'
FROM "employees";
