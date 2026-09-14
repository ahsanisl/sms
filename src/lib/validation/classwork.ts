import { z } from "zod";

export const ClassworkInputSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  // Only meaningful when an admin/campus_admin/owner is the one posting — a
  // teacher's own session.teacherId always wins server-side regardless of
  // what's submitted here, see classwork.service.ts.
  teacherId: z.string().uuid().optional(),
  curriculumTopicId: z.string().uuid().optional(),
  date: z.string().min(1, "A date is required."),
  title: z.string().trim().min(1, "A title is required."),
  description: z.string().trim().default(""),
});

export type ClassworkInput = z.infer<typeof ClassworkInputSchema>;
