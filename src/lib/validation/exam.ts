import { z } from "zod";

export const ExamInputSchema = z.object({
  campusId: z.string().uuid(),
  name: z.string().trim().min(1, "Exam name is required."),
  term: z.string().trim().default(""),
  classIds: z.array(z.string().uuid()).min(1, "Select at least one class."),
  subjectIds: z.array(z.string().uuid()).min(1, "Select at least one subject."),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  totalMarks: z.coerce.number().int().positive().default(100),
  passingMarks: z.coerce.number().int().positive().default(40),
});

export const MarksEntrySchema = z.object({
  examId: z.string().uuid(),
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  obtainedMarks: z.coerce.number().int().nonnegative(),
  totalMarks: z.coerce.number().int().positive(),
});

export const EnterMarksBulkSchema = z.array(MarksEntrySchema).min(1);
