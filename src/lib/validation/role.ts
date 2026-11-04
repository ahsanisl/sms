import { z } from "zod";

const roleName = z.string().trim().min(2, "Role name must be at least 2 characters.").max(50, "Role name must be 50 characters or fewer.");

export const CreateRoleSchema = z.object({
  name: roleName,
  description: z.string().trim().max(200).default(""),
  baseRole: z.enum(["school_admin", "campus_admin", "teacher", "accountant"], { message: "Choose what this role is based on." }),
  /** Start from another role's permissions (same school); omitted = the base role's current defaults. */
  copyFromRoleId: z.string().uuid().optional(),
});

export const UpdateRoleSchema = z.object({
  name: roleName,
  description: z.string().trim().max(200).default(""),
});

export const AssignRoleSchema = z.object({
  roleId: z.string().uuid("Choose a role."),
  campusId: z.string().uuid().nullable().optional(),
});

export const CreateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
  roleId: z.string().uuid("Choose a role."),
  campusId: z.string().uuid().nullable().optional(),
  /** Required when the role is teacher-based: the staff record this login belongs to. */
  teacherId: z.string().uuid().nullable().optional(),
});
