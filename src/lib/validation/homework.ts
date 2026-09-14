import { z } from "zod";

export const HomeworkInputSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  // Only meaningful when an admin/campus_admin/owner posts — a teacher's own
  // session.teacherId always wins server-side, see homework.service.ts.
  teacherId: z.string().uuid().optional(),
  title: z.string().trim().min(1, "A title is required."),
  description: z.string().trim().default(""),
  assignedDate: z.string().min(1, "An assigned date is required."),
  dueDate: z.string().min(1, "A due date is required."),
});

export const SubmitHomeworkSchema = z.object({
  submissionText: z.string().trim().default(""),
});

export const GradeSubmissionSchema = z.object({
  grade: z.string().trim().min(1, "Enter a grade."),
  teacherComment: z.string().trim().default(""),
});
