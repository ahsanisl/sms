CREATE TYPE "public"."announcement_audience" AS ENUM('all', 'teachers', 'parents', 'students');--> statement-breakpoint
CREATE TYPE "public"."announcement_priority" AS ENUM('normal', 'important');--> statement-breakpoint
CREATE TYPE "public"."archivable_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'leave', 'late');--> statement-breakpoint
CREATE TYPE "public"."concession_type" AS ENUM('sibling_discount', 'staff_discount', 'scholarship', 'financial_aid', 'other');--> statement-breakpoint
CREATE TYPE "public"."correction_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."exam_status" AS ENUM('scheduled', 'ongoing', 'completed');--> statement-breakpoint
CREATE TYPE "public"."fee_frequency" AS ENUM('monthly', 'quarterly', 'annual', 'one_time');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."inquiry_stage" AS ENUM('inquiry', 'applied', 'interview', 'offered', 'admitted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('paid', 'unpaid', 'overdue', 'partial');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('sick', 'casual', 'annual', 'other');--> statement-breakpoint
CREATE TYPE "public"."marks_status" AS ENUM('draft', 'submitted', 'published');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'bank_transfer', 'card', 'cheque');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('platform_admin', 'school_owner', 'school_admin', 'campus_admin', 'teacher', 'accountant', 'parent');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('classroom', 'lab', 'hall', 'other');--> statement-breakpoint
CREATE TYPE "public"."student_lifecycle_event_type" AS ENUM('withdrawal', 'transfer', 'reactivation', 'promotion');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('active', 'inactive', 'withdrawn', 'alumni');--> statement-breakpoint
CREATE TYPE "public"."teacher_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."timetable_day" AS ENUM('Mon', 'Tue', 'Wed', 'Thu', 'Fri');--> statement-breakpoint
CREATE TYPE "public"."timetable_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"logo_emoji" text DEFAULT '🏫' NOT NULL,
	"report_card_footer" text DEFAULT '' NOT NULL,
	"show_signature_lines" boolean DEFAULT true NOT NULL,
	"status" "archivable_status" DEFAULT 'active' NOT NULL,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"status" "archivable_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"label" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"status" "archivable_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_subjects" (
	"teacher_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campus_id" uuid NOT NULL,
	"name" text NOT NULL,
	"employee_id" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"qualification" text DEFAULT '' NOT NULL,
	"join_date" date,
	"status" "teacher_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_subjects" (
	"department_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campus_id" uuid NOT NULL,
	"name" text NOT NULL,
	"head_teacher_id" uuid,
	"status" "archivable_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_subjects" (
	"class_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campus_id" uuid NOT NULL,
	"grade" text NOT NULL,
	"section" text NOT NULL,
	"class_teacher_id" uuid NOT NULL,
	"student_capacity" integer DEFAULT 35 NOT NULL,
	"status" "archivable_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_lifecycle_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"type" "student_lifecycle_event_type" NOT NULL,
	"date" date NOT NULL,
	"reason" text,
	"resulting_status" "student_status",
	"from_class_id" uuid,
	"to_class_id" uuid,
	"from_campus_id" uuid,
	"to_campus_id" uuid,
	"leaving_certificate_issued" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campus_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"name" text NOT NULL,
	"roll_number" text DEFAULT '' NOT NULL,
	"admission_no" text DEFAULT '' NOT NULL,
	"gender" "gender" NOT NULL,
	"dob" date,
	"blood_group" text DEFAULT '' NOT NULL,
	"parent_name" text DEFAULT '' NOT NULL,
	"parent_phone" text DEFAULT '' NOT NULL,
	"parent_email" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"admission_date" date,
	"status" "student_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parent_children" (
	"parent_user_id" uuid NOT NULL,
	"student_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid,
	"campus_id" uuid,
	"teacher_id" uuid,
	"role" "role" NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"avatar_seed" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campus_id" uuid NOT NULL,
	"child_name" text NOT NULL,
	"grade_applied_for" text NOT NULL,
	"parent_name" text DEFAULT '' NOT NULL,
	"parent_phone" text DEFAULT '' NOT NULL,
	"parent_email" text DEFAULT '' NOT NULL,
	"stage" "inquiry_stage" DEFAULT 'inquiry' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"notes" text,
	"converted_student_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campus_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "room_type" DEFAULT 'classroom' NOT NULL,
	"capacity" integer DEFAULT 30 NOT NULL,
	"status" "archivable_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"period" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timetable_configs" (
	"school_id" uuid PRIMARY KEY NOT NULL,
	"working_days" jsonb DEFAULT '["Mon","Tue","Wed","Thu","Fri"]'::jsonb NOT NULL,
	"break_after_period" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timetable_drafts" (
	"class_id" uuid PRIMARY KEY NOT NULL,
	"slots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timetable_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"day" timetable_day NOT NULL,
	"period" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"subject_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"room_id" uuid
);
--> statement-breakpoint
CREATE TABLE "class_timetable_status" (
	"class_id" uuid PRIMARY KEY NOT NULL,
	"status" timetable_status DEFAULT 'published' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"date" date NOT NULL,
	"current_status" "attendance_status" NOT NULL,
	"requested_status" "attendance_status" NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"status" "correction_status" DEFAULT 'pending' NOT NULL,
	"requested_by" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" uuid,
	"review_note" text
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"date" date NOT NULL,
	"status" "attendance_status" NOT NULL,
	"marked_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "archivable_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_concessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"invoice_id" uuid,
	"type" "concession_type" NOT NULL,
	"label" text NOT NULL,
	"amount" integer,
	"percentage" integer,
	"reason" text DEFAULT '' NOT NULL,
	"approved_by" uuid,
	"effective_date" date,
	"status" "archivable_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount" integer NOT NULL,
	"is_discount" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"invoice_no" text NOT NULL,
	"month" text NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"total_amount" integer NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"status" "invoice_status" DEFAULT 'unpaid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_payment_reversals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"date" date NOT NULL,
	"reversed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"method" "payment_method" NOT NULL,
	"date" date NOT NULL,
	"received_by" uuid,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_structure_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campus_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount" integer NOT NULL,
	"frequency" "fee_frequency" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_classes" (
	"exam_id" uuid NOT NULL,
	"class_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_subjects" (
	"exam_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campus_id" uuid NOT NULL,
	"name" text NOT NULL,
	"term" text DEFAULT '' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_marks" integer DEFAULT 100 NOT NULL,
	"passing_marks" integer DEFAULT 40 NOT NULL,
	"status" "exam_status" DEFAULT 'scheduled' NOT NULL,
	"results_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grade_bands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"grade" text NOT NULL,
	"min_percentage" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marks_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"obtained_marks" integer NOT NULL,
	"total_marks" integer NOT NULL,
	"status" "marks_status" DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"campus_id" uuid,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"audience" "announcement_audience" DEFAULT 'all' NOT NULL,
	"priority" "announcement_priority" DEFAULT 'normal' NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"type" "leave_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"status" "leave_status" DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" uuid,
	"review_note" text
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role" "role" NOT NULL,
	"module" text NOT NULL,
	"allowed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "role_permissions_role_module_pk" PRIMARY KEY("role","module")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"school_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campuses" ADD CONSTRAINT "campuses_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_sessions" ADD CONSTRAINT "academic_sessions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_session_id_academic_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_subjects" ADD CONSTRAINT "department_subjects_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_subjects" ADD CONSTRAINT "department_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_teacher_id_teachers_id_fk" FOREIGN KEY ("head_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_class_teacher_id_teachers_id_fk" FOREIGN KEY ("class_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_lifecycle_events" ADD CONSTRAINT "student_lifecycle_events_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_lifecycle_events" ADD CONSTRAINT "student_lifecycle_events_from_class_id_classes_id_fk" FOREIGN KEY ("from_class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_lifecycle_events" ADD CONSTRAINT "student_lifecycle_events_to_class_id_classes_id_fk" FOREIGN KEY ("to_class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_lifecycle_events" ADD CONSTRAINT "student_lifecycle_events_from_campus_id_campuses_id_fk" FOREIGN KEY ("from_campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_lifecycle_events" ADD CONSTRAINT "student_lifecycle_events_to_campus_id_campuses_id_fk" FOREIGN KEY ("to_campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_children" ADD CONSTRAINT "parent_children_parent_user_id_users_id_fk" FOREIGN KEY ("parent_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_children" ADD CONSTRAINT "parent_children_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_converted_student_id_students_id_fk" FOREIGN KEY ("converted_student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periods" ADD CONSTRAINT "periods_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_configs" ADD CONSTRAINT "timetable_configs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_drafts" ADD CONSTRAINT "timetable_drafts_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_timetable_status" ADD CONSTRAINT "class_timetable_status_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_categories" ADD CONSTRAINT "fee_categories_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_concessions" ADD CONSTRAINT "fee_concessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_concessions" ADD CONSTRAINT "fee_concessions_invoice_id_fee_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."fee_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoice_items" ADD CONSTRAINT "fee_invoice_items_invoice_id_fee_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."fee_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payment_reversals" ADD CONSTRAINT "fee_payment_reversals_payment_id_fee_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."fee_payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payment_reversals" ADD CONSTRAINT "fee_payment_reversals_invoice_id_fee_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."fee_invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payment_reversals" ADD CONSTRAINT "fee_payment_reversals_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_invoice_id_fee_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."fee_invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structure_items" ADD CONSTRAINT "fee_structure_items_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structure_items" ADD CONSTRAINT "fee_structure_items_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_classes" ADD CONSTRAINT "exam_classes_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_classes" ADD CONSTRAINT "exam_classes_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_bands" ADD CONSTRAINT "grade_bands_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks_entries" ADD CONSTRAINT "marks_entries_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks_entries" ADD CONSTRAINT "marks_entries_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks_entries" ADD CONSTRAINT "marks_entries_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_leave_requests" ADD CONSTRAINT "staff_leave_requests_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campuses_school_id_idx" ON "campuses" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "academic_sessions_school_id_idx" ON "academic_sessions" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "terms_session_id_idx" ON "terms" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "subjects_school_id_idx" ON "subjects" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_school_id_code_idx" ON "subjects" USING btree ("school_id","code");--> statement-breakpoint
CREATE INDEX "teacher_subjects_teacher_id_idx" ON "teacher_subjects" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "teachers_campus_id_idx" ON "teachers" USING btree ("campus_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_campus_id_employee_id_idx" ON "teachers" USING btree ("campus_id","employee_id");--> statement-breakpoint
CREATE INDEX "department_subjects_department_id_idx" ON "department_subjects" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "departments_campus_id_idx" ON "departments" USING btree ("campus_id");--> statement-breakpoint
CREATE INDEX "class_subjects_class_id_idx" ON "class_subjects" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "classes_campus_id_idx" ON "classes" USING btree ("campus_id");--> statement-breakpoint
CREATE UNIQUE INDEX "classes_campus_id_grade_section_idx" ON "classes" USING btree ("campus_id","grade","section");--> statement-breakpoint
CREATE INDEX "student_lifecycle_events_student_id_idx" ON "student_lifecycle_events" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "students_campus_id_idx" ON "students" USING btree ("campus_id");--> statement-breakpoint
CREATE INDEX "students_class_id_idx" ON "students" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "parent_children_parent_user_id_idx" ON "parent_children" USING btree ("parent_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parent_children_parent_student_idx" ON "parent_children" USING btree ("parent_user_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_school_id_idx" ON "users" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "inquiries_campus_id_idx" ON "inquiries" USING btree ("campus_id");--> statement-breakpoint
CREATE INDEX "rooms_campus_id_idx" ON "rooms" USING btree ("campus_id");--> statement-breakpoint
CREATE INDEX "periods_school_id_idx" ON "periods" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "periods_school_id_period_idx" ON "periods" USING btree ("school_id","period");--> statement-breakpoint
CREATE INDEX "timetable_slots_class_id_idx" ON "timetable_slots" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "timetable_slots_teacher_id_idx" ON "timetable_slots" USING btree ("teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "timetable_slots_class_day_period_idx" ON "timetable_slots" USING btree ("class_id","day","period");--> statement-breakpoint
CREATE INDEX "attendance_corrections_class_id_idx" ON "attendance_corrections" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "attendance_records_class_id_idx" ON "attendance_records" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "attendance_records_date_idx" ON "attendance_records" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_records_student_date_idx" ON "attendance_records" USING btree ("student_id","date");--> statement-breakpoint
CREATE INDEX "fee_categories_school_id_idx" ON "fee_categories" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "fee_concessions_student_id_idx" ON "fee_concessions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "fee_invoice_items_invoice_id_idx" ON "fee_invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "fee_invoices_student_id_idx" ON "fee_invoices" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fee_invoices_invoice_no_idx" ON "fee_invoices" USING btree ("invoice_no");--> statement-breakpoint
CREATE INDEX "fee_payment_reversals_invoice_id_idx" ON "fee_payment_reversals" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "fee_payments_invoice_id_idx" ON "fee_payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "fee_payments_student_id_idx" ON "fee_payments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "fee_structure_items_campus_id_idx" ON "fee_structure_items" USING btree ("campus_id");--> statement-breakpoint
CREATE INDEX "fee_structure_items_class_id_idx" ON "fee_structure_items" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "exam_classes_exam_id_idx" ON "exam_classes" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "exam_subjects_exam_id_idx" ON "exam_subjects" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "exams_campus_id_idx" ON "exams" USING btree ("campus_id");--> statement-breakpoint
CREATE INDEX "grade_bands_school_id_idx" ON "grade_bands" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "marks_entries_exam_id_idx" ON "marks_entries" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "marks_entries_student_id_idx" ON "marks_entries" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "announcements_school_id_idx" ON "announcements" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "staff_leave_requests_teacher_id_idx" ON "staff_leave_requests" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "audit_logs_school_id_idx" ON "audit_logs" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");