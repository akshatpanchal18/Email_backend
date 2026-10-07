import z from "zod";

export const createMailboxSchema = z.object({
  address: z
    .string()
    .trim()
    .min(1, "Address is required")
    .regex(/^[a-zA-Z0-9.-]+$/, "Only letters, numbers, dots and hyphens are allowed"),
});
export const messageIdParamSchema = z.object({
  messageId: z.string().uuid(),
});

export const bulkDeleteSchema = z.object({
  messageIds: z
    .array(z.string().uuid())
    .min(1)
    .max(100)
    .transform((ids) => [...new Set(ids)]), // dedupe
});
