CREATE TYPE "public"."bill_frequency" AS ENUM('monthly', 'quarterly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."expense_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."payroll_run_status" AS ENUM('draft', 'finalized');--> statement-breakpoint
CREATE TYPE "public"."payslip_status" AS ENUM('unpaid', 'paid');--> statement-breakpoint
ALTER TYPE "public"."leave_type" ADD VALUE 'unpaid';--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "archivable_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"campus_id" uuid,
	"category_id" uuid NOT NULL,
	"bill_id" uuid,
	"date" date NOT NULL,
	"amount" integer NOT NULL,
	"payee" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"method" "payment_method" DEFAULT 'cash' NOT NULL,
	"reference" text,
	"status" "expense_status" DEFAULT 'pending' NOT NULL,
	"submitted_by" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"campus_id" uuid,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"payee" text DEFAULT '' NOT NULL,
	"amount" integer NOT NULL,
	"frequency" "bill_frequency" DEFAULT 'monthly' NOT NULL,
	"next_due_date" date NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" "archivable_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"month" text NOT NULL,
	"status" "payroll_run_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"finalized_by" uuid,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"campus_id" uuid,
	"name" text NOT NULL,
	"designation" text DEFAULT '' NOT NULL,
	"basic_salary" integer NOT NULL,
	"allowances" integer DEFAULT 0 NOT NULL,
	"fixed_deductions" integer DEFAULT 0 NOT NULL,
	"unpaid_leave_days" integer DEFAULT 0 NOT NULL,
	"leave_deduction" integer DEFAULT 0 NOT NULL,
	"bonus" integer DEFAULT 0 NOT NULL,
	"other_deduction" integer DEFAULT 0 NOT NULL,
	"net_pay" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" "payslip_status" DEFAULT 'unpaid' NOT NULL,
	"paid_date" date,
	"method" "payment_method",
	"reference" text,
	"paid_by" uuid
);
--> statement-breakpoint
CREATE TABLE "salary_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"campus_id" uuid,
	"teacher_id" uuid,
	"name" text NOT NULL,
	"designation" text DEFAULT '' NOT NULL,
	"basic_salary" integer NOT NULL,
	"allowances" integer DEFAULT 0 NOT NULL,
	"deductions" integer DEFAULT 0 NOT NULL,
	"bank_account" text DEFAULT '' NOT NULL,
	"status" "archivable_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_bill_id_recurring_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."recurring_bills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_finalized_by_users_id_fk" FOREIGN KEY ("finalized_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_run_id_payroll_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_profile_id_salary_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."salary_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_profiles" ADD CONSTRAINT "salary_profiles_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_profiles" ADD CONSTRAINT "salary_profiles_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_profiles" ADD CONSTRAINT "salary_profiles_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_categories_school_id_idx" ON "expense_categories" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "expenses_school_id_date_idx" ON "expenses" USING btree ("school_id","date");--> statement-breakpoint
CREATE INDEX "expenses_bill_id_idx" ON "expenses" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "recurring_bills_school_id_idx" ON "recurring_bills" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_runs_school_month_idx" ON "payroll_runs" USING btree ("school_id","month");--> statement-breakpoint
CREATE INDEX "payslips_run_id_idx" ON "payslips" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payslips_run_profile_idx" ON "payslips" USING btree ("run_id","profile_id");--> statement-breakpoint
CREATE INDEX "salary_profiles_school_id_idx" ON "salary_profiles" USING btree ("school_id");--> statement-breakpoint
-- Data: every existing school starts with the default expense categories (same list as DEFAULT_EXPENSE_CATEGORIES in src/lib/constants.ts)...
INSERT INTO "expense_categories" ("school_id", "name")
SELECT s."id", c."name"
FROM "schools" s
CROSS JOIN (VALUES ('Rent'), ('Utilities'), ('Maintenance & Repairs'), ('Stationery & Supplies'), ('Transport'), ('IT & Internet'), ('Cleaning & Security'), ('Events & Activities'), ('Marketing'), ('Miscellaneous')) AS c("name");
--> statement-breakpoint
-- ...and every existing role gets a row for the four new permission modules: default roles at their
-- built-in defaults (src/lib/permissions.ts), custom roles switched off until a school opts them in.
INSERT INTO "school_role_permissions" ("role_id", "module", "allowed")
SELECT sr."id", d."module", CASE WHEN sr."is_system" THEN d."allowed" ELSE false END
FROM "school_roles" sr
JOIN (VALUES
	('school_owner', 'expenses', true), ('school_owner', 'expensesApprove', true), ('school_owner', 'payroll', true), ('school_owner', 'financeReport', true),
	('school_admin', 'expenses', true), ('school_admin', 'expensesApprove', true), ('school_admin', 'payroll', true), ('school_admin', 'financeReport', true),
	('campus_admin', 'expenses', true), ('campus_admin', 'expensesApprove', false), ('campus_admin', 'payroll', false), ('campus_admin', 'financeReport', false),
	('accountant', 'expenses', true), ('accountant', 'expensesApprove', false), ('accountant', 'payroll', true), ('accountant', 'financeReport', true),
	('teacher', 'expenses', false), ('teacher', 'expensesApprove', false), ('teacher', 'payroll', false), ('teacher', 'financeReport', false),
	('parent', 'expenses', false), ('parent', 'expensesApprove', false), ('parent', 'payroll', false), ('parent', 'financeReport', false)
) AS d("base_role", "module", "allowed") ON d."base_role" = sr."base_role"::text
ON CONFLICT ("role_id", "module") DO NOTHING;
