import { z } from "zod";

export const LeaveRequestInputSchema = z
  .object({
    type: z.enum(["sick", "casual", "annual", "other"]),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    reason: z.string().trim().min(1, "Please add a reason for your leave request."),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date can't be before the start date.",
    path: ["endDate"],
  });

export type LeaveRequestInput = z.infer<typeof LeaveRequestInputSchema>;

export const ReviewLeaveRequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().trim().optional(),
});
