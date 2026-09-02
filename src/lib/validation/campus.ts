import { z } from "zod";

export const CampusInputSchema = z.object({
  name: z.string().trim().min(1, "Campus name is required."),
  city: z.string().trim().default(""),
  address: z.string().trim().min(1, "Address is required."),
  phone: z.string().trim().default(""),
  email: z.string().trim().default(""),
});

export type CampusInput = z.infer<typeof CampusInputSchema>;
