import { z } from "zod";

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "Your new password must be at least 8 characters.").max(200),
  })
  .refine((d) => d.newPassword !== d.currentPassword, { message: "Choose a password different from your current one.", path: ["newPassword"] });

export const ParentAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

export const LinkParentSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter the parent account's email address."),
});
