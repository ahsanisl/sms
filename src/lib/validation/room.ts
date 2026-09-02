import { z } from "zod";

export const RoomInputSchema = z.object({
  name: z.string().trim().min(1, "Room name is required."),
  campusId: z.string().uuid(),
  type: z.enum(["classroom", "lab", "hall", "other"]),
  capacity: z.coerce.number().int().positive(),
});

export type RoomInput = z.infer<typeof RoomInputSchema>;
