CREATE TABLE "school_role_permissions" (
	"role_id" uuid NOT NULL,
	"module" text NOT NULL,
	"allowed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "school_role_permissions_role_id_module_pk" PRIMARY KEY("role_id","module")
);
--> statement-breakpoint
CREATE TABLE "school_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"base_role" "role" NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "school_role_id" uuid;--> statement-breakpoint
ALTER TABLE "school_role_permissions" ADD CONSTRAINT "school_role_permissions_role_id_school_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."school_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_roles" ADD CONSTRAINT "school_roles_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "school_roles_school_id_idx" ON "school_roles" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_roles_school_name_idx" ON "school_roles" USING btree ("school_id","name");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_school_role_id_school_roles_id_fk" FOREIGN KEY ("school_role_id") REFERENCES "public"."school_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Data: give every existing school its six default roles...
INSERT INTO "school_roles" ("school_id", "name", "description", "base_role", "is_system")
SELECT s."id", r."name", r."description", r."base_role"::"role", true
FROM "schools" s
CROSS JOIN (VALUES
	('School Owner', 'Full access to everything in the school. Can''t be restricted.', 'school_owner'),
	('School Admin', 'Runs the whole school, across all campuses.', 'school_admin'),
	('Campus Admin', 'Runs one campus; only sees that campus''s data.', 'campus_admin'),
	('Teacher', 'Teaching staff; works with their own classes.', 'teacher'),
	('Accountant', 'Fees and finance only.', 'accountant'),
	('Parent', 'Parent portal; sees only their own children.', 'parent')
) AS r("name", "description", "base_role");
--> statement-breakpoint
-- ...carrying over today's platform-wide permission settings, so nobody's access changes on upgrade.
INSERT INTO "school_role_permissions" ("role_id", "module", "allowed")
SELECT sr."id", rp."module", rp."allowed"
FROM "school_roles" sr
JOIN "role_permissions" rp ON rp."role" = sr."base_role"
WHERE sr."is_system" = true;
