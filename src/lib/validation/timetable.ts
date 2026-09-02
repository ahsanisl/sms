import { z } from "zod";

export const TimetableSlotInputSchema = z.object({
  classId: z.string().uuid(),
  day: z.enum(["Mon", "Tue", "Wed", "Thu", "Fri"]),
  period: z.coerce.number().int().positive(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  subjectId: z.string().uuid(),
  teacherId: z.string().uuid(),
  roomId: z.string().uuid().optional(),
});

export type TimetableSlotInput = z.infer<typeof TimetableSlotInputSchema>;
