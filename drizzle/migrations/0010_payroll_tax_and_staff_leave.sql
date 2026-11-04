CREATE TABLE "staff_unpaid_leave" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "income_tax_slabs" jsonb;--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "income_tax" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "salary_profiles" ADD COLUMN "auto_income_tax" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_unpaid_leave" ADD CONSTRAINT "staff_unpaid_leave_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_unpaid_leave" ADD CONSTRAINT "staff_unpaid_leave_profile_id_salary_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."salary_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_unpaid_leave" ADD CONSTRAINT "staff_unpaid_leave_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_unpaid_leave_profile_id_idx" ON "staff_unpaid_leave" USING btree ("profile_id");