CREATE TABLE IF NOT EXISTS "company" (
	"id" serial PRIMARY KEY NOT NULL,
	"logo_footer" uuid,
	"logo_navbar" uuid,
	"instagram" varchar(255),
	"linkedin" varchar(255),
	"youtube" varchar(255),
	"address" text,
	"email_address" varchar(255),
	"phone_number" varchar(100),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company" ADD CONSTRAINT "company_logo_footer_files_id_fk" FOREIGN KEY ("logo_footer") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company" ADD CONSTRAINT "company_logo_navbar_files_id_fk" FOREIGN KEY ("logo_navbar") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
