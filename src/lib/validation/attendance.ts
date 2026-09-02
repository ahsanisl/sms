import { z } from "zod";

export const AttendanceEntrySchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  date: z.string().min(1),
  status: z.enum(["present", "absent", "leave", "late"]),
});

export const MarkAttendanceBulkSchema = z.array(AttendanceEntrySchema).min(1);

export const AttendanceCorrectionInputSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  date: z.string().min(1),
  currentStatus: z.enum(["present", "absent", "leave", "late"]),
  requestedStatus: z.enum(["present", "absent", "leave", "late"]),
  reason: z.string().trim().min(1, "A reason is required."),
});
