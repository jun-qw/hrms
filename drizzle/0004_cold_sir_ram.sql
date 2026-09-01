ALTER TABLE "code_groups" ADD COLUMN "is_system" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "code_groups" ADD COLUMN "effective_from" date;--> statement-breakpoint
ALTER TABLE "code_groups" ADD COLUMN "effective_to" date;--> statement-breakpoint
ALTER TABLE "code_items" ADD COLUMN "is_system" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "code_items" ADD COLUMN "effective_from" date;--> statement-breakpoint
ALTER TABLE "code_items" ADD COLUMN "effective_to" date;