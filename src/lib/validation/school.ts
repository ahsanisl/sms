import { z } from "zod";

export const SchoolProfileInputSchema = z.object({
  name: z.string().trim().min(1, "School name is required."),
  tagline: z.string().trim().default(""),
  address: z.string().trim().min(1, "Address is required."),
  phone: z.string().trim().default(""),
  email: z.string().trim().default(""),
  logoEmoji: z.string().trim().default("🏫"),
  reportCardFooter: z.string().trim().default(""),
  showSignatureLines: z.boolean().default(true),
});

export const CreateSchoolWithOwnerSchema = SchoolProfileInputSchema.extend({
  ownerName: z.string().trim().min(1, "Owner name is required."),
  ownerEmail: z.string().trim().email("Enter a valid email."),
  ownerPassword: z.string().min(8, "Password must be at least 8 characters."),
});

export type SchoolProfileInput = z.infer<typeof SchoolProfileInputSchema>;
export type CreateSchoolWithOwnerInput = z.infer<typeof CreateSchoolWithOwnerSchema>;
