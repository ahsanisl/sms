import { z } from "zod";

export const CurriculumTopicInputSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  academicSessionId: z.string().uuid(),
  title: z.string().trim().min(1, "A topic title is required."),
  description: z.string().trim().default(""),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
});

export const CurriculumTopicStatusSchema = z.enum(["not_started", "in_progress", "completed"]);
