import z from "zod";

export const createMailboxSchema = z.object({
  address: z
    .string()
    .trim()
    .min(1, "Address is required")
    .regex(
      /^[a-zA-Z0-9.-]+$/,
      "Only letters, numbers, dots and hyphens are allowed",
    ),
});
