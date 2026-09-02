import { z } from "zod";

export const InquiryInputSchema = z.object({
  campusId: z.string().uuid(),
  childName: z.string().trim().min(1, "Child's name is required."),
  gradeAppliedFor: z.string().trim().min(1, "Grade is required."),
  parentName: z.string().trim().min(1, "Parent name is required."),
  parentPhone: z.string().trim().min(1, "Phone number is required."),
  parentEmail: z.string().trim().default(""),
  source: z.string().trim().default(""),
  notes: z.string().optional(),
});

export const InquiryStageSchema = z.enum(["inquiry", "applied", "interview", "offered", "admitted", "rejected"]);
