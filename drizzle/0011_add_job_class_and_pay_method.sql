ALTER TABLE "employees" ADD COLUMN "job_class" text DEFAULT 'office' NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "pay_method" text DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "hourly_wage" numeric(12, 0) DEFAULT '0';