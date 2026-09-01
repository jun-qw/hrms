CREATE TABLE "grid_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grid_key" text NOT NULL,
	"name" text NOT NULL,
	"owner_user_id" uuid,
	"is_shared" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_grid_views_owner_name" UNIQUE("grid_key","owner_user_id","name")
);
--> statement-breakpoint
ALTER TABLE "grid_views" ADD CONSTRAINT "grid_views_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_grid_views_key" ON "grid_views" USING btree ("grid_key","owner_user_id");