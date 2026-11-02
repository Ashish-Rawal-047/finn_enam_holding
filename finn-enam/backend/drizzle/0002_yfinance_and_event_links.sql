CREATE TABLE "data_syncs" (
	"company_id" uuid NOT NULL,
	"dataset" text NOT NULL,
	"provider" text NOT NULL,
	"status" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"error" text,
	CONSTRAINT "data_syncs_company_id_dataset_provider_pk" PRIMARY KEY("company_id","dataset","provider")
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "yahoo_symbol" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "exchange" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "employees" integer;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "currency" text;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "currency" text DEFAULT 'INR' NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "unit" text DEFAULT 'crore' NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "cost_of_revenue" double precision;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "gross_profit" double precision;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "operating_expenses" double precision;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "operating_income" double precision;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "interest_expense" double precision;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "tax_expense" double precision;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "depreciation" double precision;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "current_assets" double precision;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "current_liabilities" double precision;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "retained_earnings" double precision;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "long_term_debt" double precision;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "short_term_debt" double precision;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "investing_cash_flow" double precision;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "financing_cash_flow" double precision;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "free_cash_flow" double precision;--> statement-breakpoint
ALTER TABLE "financial_statements" ADD COLUMN "fetched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "market_prices" ADD COLUMN "day_high" double precision;--> statement-breakpoint
ALTER TABLE "market_prices" ADD COLUMN "day_low" double precision;--> statement-breakpoint
ALTER TABLE "market_prices" ADD COLUMN "fifty_two_week_high" double precision;--> statement-breakpoint
ALTER TABLE "market_prices" ADD COLUMN "fifty_two_week_low" double precision;--> statement-breakpoint
ALTER TABLE "market_prices" ADD COLUMN "average_volume" double precision;--> statement-breakpoint
ALTER TABLE "market_prices" ADD COLUMN "market_cap" double precision;--> statement-breakpoint
ALTER TABLE "market_prices" ADD COLUMN "enterprise_value" double precision;--> statement-breakpoint
ALTER TABLE "market_prices" ADD COLUMN "quote_timing" text DEFAULT 'end_of_day' NOT NULL;--> statement-breakpoint
ALTER TABLE "market_prices" ADD COLUMN "delay_minutes" integer;--> statement-breakpoint
ALTER TABLE "research_reports" ADD COLUMN "data_as_of" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "data_syncs" ADD CONSTRAINT "data_syncs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_event_id_corporate_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."corporate_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_yahoo_symbol_uq" ON "companies" USING btree ("yahoo_symbol");--> statement-breakpoint
CREATE INDEX "signals_event_idx" ON "signals" USING btree ("event_id");--> statement-breakpoint
-- Backfill: link announcement alerts to the Event Memory entry extracted from the same filing.
UPDATE "signals" s SET "event_id" = e."id"
FROM "corporate_events" e
WHERE s."event_id" IS NULL
  AND s."type" IN ('corporate_announcement', 'financial_result', 'management_change')
  AND s."source_document_id" IS NOT NULL
  AND e."source_document_id" = s."source_document_id"
  AND e."company_id" = s."company_id";
--> statement-breakpoint
-- Demo quotes are synthetic, not end-of-day exchange data.
UPDATE "market_prices" SET "quote_timing" = 'synthetic' WHERE "is_demo" = true;
