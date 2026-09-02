import { z } from "zod";

export const StudentInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  rollNumber: z.string().trim().default(""),
  admissionNo: z.string().trim().default(""),
  classId: z.string().uuid("Select a class."),
  campusId: z.string().uuid("Select a campus."),
  gender: z.enum(["male", "female"]),
  dob: z.string().min(1, "Date of birth is required."),
  bloodGroup: z.string().trim().default(""),
  parentName: z.string().trim().min(1, "Parent/Guardian name is required."),
  parentPhone: z.string().trim().min(1, "Phone number is required."),
  parentEmail: z.string().trim().default(""),
  address: z.string().trim().default(""),
  admissionDate: z.string().optional(),
  status: z.enum(["active", "inactive", "withdrawn", "alumni"]).default("active"),
});

export const WithdrawStudentSchema = z.object({
  date: z.string().min(1),
  reason: z.string().optional(),
  resultingStatus: z.enum(["withdrawn", "alumni"]),
  leavingCertificateIssued: z.boolean().optional(),
});

export const TransferStudentSchema = z.object({
  date: z.string().min(1),
  reason: z.string().optional(),
  toClassId: z.string().uuid().optional(),
  toCampusId: z.string().uuid().optional(),
});

export const PromoteStudentsSchema = z
  .object({
    studentIds: z.array(z.string().uuid()).min(1, "Select at least one student to promote."),
    fromClassId: z.string().uuid(),
    date: z.string().min(1),
    toClassId: z.string().uuid().optional(),
    toAlumni: z.boolean().optional(),
  })
  .refine((data) => data.toAlumni || data.toClassId, { message: "Pick a target class, or graduate to Alumni." });

export type StudentInput = z.infer<typeof StudentInputSchema>;
