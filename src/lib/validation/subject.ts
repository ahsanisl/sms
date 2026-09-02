import { z } from "zod";

export const SubjectInputSchema = z.object({
  name: z.string().trim().min(1, "Subject name is required."),
  code: z.string().trim().min(1, "Code is required."),
});

export type SubjectInput = z.infer<typeof SubjectInputSchema>;
