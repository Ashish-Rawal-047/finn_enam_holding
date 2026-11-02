CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"feature" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"tier" text NOT NULL,
	"status" text NOT NULL,
	"error_code" text,
	"attempts" integer DEFAULT 1 NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"reasoning_tokens" integer,
	"latency_ms" integer NOT NULL,
	"cost_usd" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"stage" text DEFAULT 'queued' NOT NULL,
	"mode" text DEFAULT 'generate' NOT NULL,
	"progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"partial" jsonb,
	"report_id" uuid,
	"reused" boolean DEFAULT false NOT NULL,
	"timings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "event_similarities" ADD COLUMN "ai_assessment" jsonb;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "favourited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "research_reports" ADD COLUMN "input_hash" text;--> statement-breakpoint
ALTER TABLE "research_reports" ADD COLUMN "timings" jsonb;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_report_id_research_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."research_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_user_created_idx" ON "ai_usage" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_created_idx" ON "ai_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "research_jobs_user_created_idx" ON "research_jobs" USING btree ("requested_by","created_at");--> statement-breakpoint
CREATE INDEX "research_jobs_company_status_idx" ON "research_jobs" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "notifications_user_favourited_idx" ON "notifications" USING btree ("user_id","favourited_at") WHERE "notifications"."favourited_at" is not null;--> statement-breakpoint
CREATE INDEX "research_company_hash_idx" ON "research_reports" USING btree ("company_id","input_hash");