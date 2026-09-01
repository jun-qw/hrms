CREATE TABLE "payroll_rate_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"rates" jsonb NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "payroll_rate_sets_year_unique" UNIQUE("year")
);
