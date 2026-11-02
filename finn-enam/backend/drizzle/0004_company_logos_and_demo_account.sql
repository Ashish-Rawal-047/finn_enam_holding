CREATE TABLE "company_logos" (
	"symbol" text PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"domain" text,
	"status" text NOT NULL,
	"source" text,
	"source_url" text,
	"content_type" text,
	"width" integer,
	"height" integer,
	"image" "bytea",
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "website_domain" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_demo_account" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "company_logos" ADD CONSTRAINT "company_logos_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Backfill: the verified domain is the hostname of the provider-reported official website ("www." dropped).
UPDATE "companies" SET "website_domain" = regexp_replace(lower(substring("website" from '^(?:[a-zA-Z]+://)?([^/:?#]+)')), '^www\.', '') WHERE "website" IS NOT NULL AND "website_domain" IS NULL;
