import { z } from "zod";

export const AnnouncementInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  body: z.string().trim().min(1, "Message content is required."),
  audience: z.enum(["all", "teachers", "parents", "students"]),
  priority: z.enum(["normal", "important"]),
  campusId: z.string().uuid().optional(),
});

export type AnnouncementInput = z.infer<typeof AnnouncementInputSchema>;
