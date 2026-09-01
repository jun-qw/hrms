CREATE TABLE "attendance_closeouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"closed_by" text NOT NULL,
	"closed_by_name" text NOT NULL,
	"note" text,
	"closed_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "attendance_closeouts_year_month_unique" UNIQUE("year","month")
);
