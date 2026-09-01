CREATE TABLE "branding_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"mime_type" text NOT NULL,
	"data" text NOT NULL,
	"file_name" text,
	"byte_size" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "branding_assets_kind_unique" UNIQUE("kind")
);
