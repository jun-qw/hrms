ALTER TABLE "employees" ADD COLUMN "workplace_id" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "work_arrangement" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "arrangement_start_date" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "arrangement_end_date" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "resident_number" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "personal_email" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "marriage_date" date;--> statement-breakpoint
ALTER TABLE "family_members" ADD COLUMN "is_living_together" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "family_members" ADD COLUMN "has_income" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "family_members" ADD COLUMN "medical_notes" text;