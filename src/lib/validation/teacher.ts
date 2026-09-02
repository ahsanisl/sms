import { z } from "zod";

export const TeacherInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  employeeId: z.string().trim().min(1, "Employee ID is required."),
  campusId: z.string().uuid("Select a campus."),
  subjectIds: z.array(z.string().uuid()).min(1, "Select at least one subject."),
  phone: z.string().trim().min(1, "Phone number is required."),
  email: z.string().trim().default(""),
  qualification: z.string().trim().default(""),
  joinDate: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type TeacherInput = z.infer<typeof TeacherInputSchema>;
