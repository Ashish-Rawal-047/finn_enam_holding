CREATE TYPE "public"."announcement_category" AS ENUM('results', 'acquisition', 'merger', 'fund_raise', 'expansion', 'new_project', 'capacity_addition', 'order_win', 'management_change', 'regulatory', 'litigation', 'credit_rating', 'debt', 'dividend', 'corporate_action', 'promoter_pledge', 'insider_trading', 'earnings_call', 'investor_meeting', 'routine');--> statement-breakpoint
CREATE TYPE "public"."claim_type" AS ENUM('reported_fact', 'calculated_metric', 'ai_interpretation', 'analyst_note');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('exchange_filing', 'annual_report', 'quarterly_results', 'investor_presentation', 'earnings_call_transcript', 'press_release', 'other');--> statement-breakpoint
CREATE TYPE "public"."event_category" AS ENUM('manufacturing_facility', 'capacity_expansion', 'acquisition', 'merger', 'rnd_project', 'new_business_division', 'restructuring', 'financial_target', 'fundraise', 'other');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('announced', 'initiated', 'in_progress', 'on_track', 'delayed', 'completed', 'abandoned', 'outcome_unverified');--> statement-breakpoint
CREATE TYPE "public"."period_type" AS ENUM('quarterly', 'annual', 'ttm');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."research_status" AS ENUM('complete', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."signal_type" AS ENUM('price_move', 'volume_spike', 'management_change', 'corporate_announcement', 'financial_result', 'historical_precedent', 'event_update');--> statement-breakpoint
CREATE TABLE "alert_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"price_move_threshold_pct" double precision DEFAULT 2.5 NOT NULL,
	"volume_surge_multiple" double precision DEFAULT 2 NOT NULL,
	"announcement_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"management_change_alerts" boolean DEFAULT true NOT NULL,
	"financial_result_alerts" boolean DEFAULT true NOT NULL,
	"event_alerts" boolean DEFAULT true NOT NULL,
	"minimum_priority" "priority" DEFAULT 'medium' NOT NULL,
	"in_app_notifications" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"nse_symbol" text,
	"bse_code" text,
	"isin" text,
	"sector" text,
	"industry" text,
	"market_cap_category" text,
	"description" text,
	"website" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_document_id" uuid,
	"category" "announcement_category" NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"announced_at" timestamp with time zone NOT NULL,
	"exchange" text,
	"materiality_score" integer DEFAULT 0 NOT NULL,
	"dedup_hash" text NOT NULL,
	"provider" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category" "event_category" NOT NULL,
	"project_type" text,
	"title" text NOT NULL,
	"original_announcement" text NOT NULL,
	"announced_at" date NOT NULL,
	"source_document_id" uuid,
	"investment_significance" text,
	"expected_capex_cr" double precision,
	"expected_capacity_value" double precision,
	"expected_capacity_unit" text,
	"expected_completion_date" date,
	"expected_impact" text,
	"commitments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "event_status" DEFAULT 'announced' NOT NULL,
	"status_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"extraction_method" text DEFAULT 'manual' NOT NULL,
	"dedup_hash" text NOT NULL,
	"embedding" vector(1024),
	"created_by" uuid,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_execution_records" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"outcome" "event_status" NOT NULL,
	"actual_completion_date" date,
	"actual_capex_cr" double precision,
	"actual_capacity_value" double precision,
	"delay_days" integer,
	"planned_duration_days" integer,
	"actual_duration_days" integer,
	"capex_variance_pct" double precision,
	"capacity_variance_pct" double precision,
	"guidance_accuracy" text,
	"source_document_id" uuid,
	"evidence_excerpt" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"milestone_date" date NOT NULL,
	"status_after" "event_status" NOT NULL,
	"description" text NOT NULL,
	"reported_metric" text,
	"source_document_id" uuid,
	"evidence_excerpt" text,
	"created_by" uuid,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_similarities" (
	"event_id" uuid NOT NULL,
	"similar_event_id" uuid NOT NULL,
	"structured_score" double precision NOT NULL,
	"semantic_score" double precision,
	"combined_score" double precision NOT NULL,
	"matched_on" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"explanation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_similarities_event_id_similar_event_id_pk" PRIMARY KEY("event_id","similar_event_id")
);
--> statement-breakpoint
CREATE TABLE "financial_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"period_type" "period_type" NOT NULL,
	"period_label" text NOT NULL,
	"period_end" date NOT NULL,
	"revenue" double precision,
	"ebitda" double precision,
	"ebit" double precision,
	"pbt" double precision,
	"pat" double precision,
	"eps" double precision,
	"total_assets" double precision,
	"total_liabilities" double precision,
	"total_equity" double precision,
	"cash_and_equivalents" double precision,
	"borrowings" double precision,
	"receivables" double precision,
	"inventory" double precision,
	"payables" double precision,
	"contingent_liabilities" double precision,
	"operating_cash_flow" double precision,
	"capex" double precision,
	"capital_employed" double precision,
	"market_cap" double precision,
	"source_document_id" uuid,
	"provider" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "management_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"announcement_id" uuid,
	"person_name" text NOT NULL,
	"role" text NOT NULL,
	"change_type" text NOT NULL,
	"effective_date" date,
	"background" text,
	"source_document_id" uuid,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_prices" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"trade_date" date NOT NULL,
	"last_price" numeric(14, 2) NOT NULL,
	"previous_close" numeric(14, 2) NOT NULL,
	"change_percent" double precision NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"provider" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"signal_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"priority" "priority" NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_holdings" (
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_holdings_user_id_company_id_pk" PRIMARY KEY("user_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "price_candles" (
	"company_id" uuid NOT NULL,
	"interval" text DEFAULT '1d' NOT NULL,
	"trade_date" date NOT NULL,
	"open" numeric(14, 2) NOT NULL,
	"high" numeric(14, 2) NOT NULL,
	"low" numeric(14, 2) NOT NULL,
	"close" numeric(14, 2) NOT NULL,
	"volume" numeric(20, 0) NOT NULL,
	"provider" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	CONSTRAINT "price_candles_company_id_interval_trade_date_pk" PRIMARY KEY("company_id","interval","trade_date")
);
--> statement-breakpoint
CREATE TABLE "research_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"section" text NOT NULL,
	"claim" text NOT NULL,
	"claim_type" "claim_type" NOT NULL,
	"source_document_id" uuid,
	"excerpt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"requested_by" uuid,
	"status" "research_status" NOT NULL,
	"generator" text NOT NULL,
	"sections" jsonb NOT NULL,
	"limitations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"type" "signal_type" NOT NULL,
	"category" text NOT NULL,
	"priority" "priority" NOT NULL,
	"materiality_score" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_document_id" uuid,
	"announcement_id" uuid,
	"event_id" uuid,
	"dedup_key" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"document_type" "document_type" NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"published_at" timestamp with time zone,
	"period_label" text,
	"provider" text NOT NULL,
	"excerpt" text,
	"content_hash" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trading_volumes" (
	"company_id" uuid NOT NULL,
	"trade_date" date NOT NULL,
	"volume" numeric(20, 0) NOT NULL,
	"avg_volume_20d" numeric(20, 2),
	"volume_ratio" double precision,
	"is_demo" boolean DEFAULT false NOT NULL,
	CONSTRAINT "trading_volumes_company_id_trade_date_pk" PRIMARY KEY("company_id","trade_date")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"bio" text,
	"theme" text DEFAULT 'light' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlist_companies" (
	"watchlist_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_companies_watchlist_id_company_id_pk" PRIMARY KEY("watchlist_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_preferences" ADD CONSTRAINT "alert_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_announcements" ADD CONSTRAINT "corporate_announcements_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_announcements" ADD CONSTRAINT "corporate_announcements_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_events" ADD CONSTRAINT "corporate_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_events" ADD CONSTRAINT "corporate_events_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_events" ADD CONSTRAINT "corporate_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_execution_records" ADD CONSTRAINT "event_execution_records_event_id_corporate_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."corporate_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_execution_records" ADD CONSTRAINT "event_execution_records_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_milestones" ADD CONSTRAINT "event_milestones_event_id_corporate_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."corporate_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_milestones" ADD CONSTRAINT "event_milestones_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_milestones" ADD CONSTRAINT "event_milestones_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_similarities" ADD CONSTRAINT "event_similarities_event_id_corporate_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."corporate_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_similarities" ADD CONSTRAINT "event_similarities_similar_event_id_corporate_events_id_fk" FOREIGN KEY ("similar_event_id") REFERENCES "public"."corporate_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD CONSTRAINT "financial_statements_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD CONSTRAINT "financial_statements_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_changes" ADD CONSTRAINT "management_changes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_changes" ADD CONSTRAINT "management_changes_announcement_id_corporate_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."corporate_announcements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_changes" ADD CONSTRAINT "management_changes_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_candles" ADD CONSTRAINT "price_candles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_evidence" ADD CONSTRAINT "research_evidence_report_id_research_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."research_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_evidence" ADD CONSTRAINT "research_evidence_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_reports" ADD CONSTRAINT "research_reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_reports" ADD CONSTRAINT "research_reports_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_announcement_id_corporate_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."corporate_announcements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_volumes" ADD CONSTRAINT "trading_volumes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_companies" ADD CONSTRAINT "watchlist_companies_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_companies" ADD CONSTRAINT "watchlist_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_hash_uq" ON "auth_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_nse_symbol_uq" ON "companies" USING btree ("nse_symbol");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_bse_code_uq" ON "companies" USING btree ("bse_code");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_isin_uq" ON "companies" USING btree ("isin");--> statement-breakpoint
CREATE INDEX "companies_name_idx" ON "companies" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "announcements_dedup_uq" ON "corporate_announcements" USING btree ("dedup_hash");--> statement-breakpoint
CREATE INDEX "announcements_company_time_idx" ON "corporate_announcements" USING btree ("company_id","announced_at");--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_events_dedup_uq" ON "corporate_events" USING btree ("dedup_hash");--> statement-breakpoint
CREATE INDEX "corporate_events_company_idx" ON "corporate_events" USING btree ("company_id","announced_at");--> statement-breakpoint
CREATE INDEX "corporate_events_category_idx" ON "corporate_events" USING btree ("category","project_type");--> statement-breakpoint
CREATE INDEX "event_milestones_event_idx" ON "event_milestones" USING btree ("event_id","milestone_date");--> statement-breakpoint
CREATE INDEX "event_similarities_similar_idx" ON "event_similarities" USING btree ("similar_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financials_period_uq" ON "financial_statements" USING btree ("company_id","period_type","period_end");--> statement-breakpoint
CREATE INDEX "job_runs_job_idx" ON "job_runs" USING btree ("job","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "management_changes_uq" ON "management_changes" USING btree ("company_id",lower("person_name"),lower("role"),"change_type");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_user_signal_uq" ON "notifications" USING btree ("user_id","signal_id");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "portfolio_company_idx" ON "portfolio_holdings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "research_evidence_report_idx" ON "research_evidence" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "research_company_created_idx" ON "research_reports" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "signals_dedup_uq" ON "signals" USING btree ("dedup_key");--> statement-breakpoint
CREATE INDEX "signals_company_time_idx" ON "signals" USING btree ("company_id","occurred_at");--> statement-breakpoint
CREATE INDEX "signals_priority_idx" ON "signals" USING btree ("priority","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "source_documents_content_hash_uq" ON "source_documents" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "source_documents_company_idx" ON "source_documents" USING btree ("company_id","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "watchlists_user_name_uq" ON "watchlists" USING btree ("user_id",lower("name"));