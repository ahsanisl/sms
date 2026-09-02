import { z } from "zod";

export const DepartmentInputSchema = z.object({
  name: z.string().trim().min(1, "A department name is required."),
  campusId: z.string().uuid(),
  subjectIds: z.array(z.string().uuid()).min(1, "Select at least one subject for this department."),
  headTeacherId: z.string().uuid().optional(),
});

export type DepartmentInput = z.infer<typeof DepartmentInputSchema>;
