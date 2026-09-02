import { z } from "zod";

export const TermInputSchema = z.object({
  name: z.string().trim().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export const SessionInputSchema = z.object({
  label: z.string().trim().min(1, "Label is required."),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
  terms: z.array(TermInputSchema).default([]),
});

export type SessionInput = z.infer<typeof SessionInputSchema>;
