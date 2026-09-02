import { z } from "zod";

export const ClassInputSchema = z.object({
  grade: z.string().trim().min(1, "Grade is required."),
  section: z.string().trim().min(1, "Section is required."),
  campusId: z.string().uuid("Select a campus."),
  classTeacherId: z.string().uuid("Select a class teacher."),
  subjectIds: z.array(z.string().uuid()).default([]),
  studentCapacity: z.coerce.number().int().positive().default(35),
});

export type ClassInput = z.infer<typeof ClassInputSchema>;
