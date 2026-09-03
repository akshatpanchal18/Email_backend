import { z } from "zod";

export const MailgunInboundWebhookSchema = z.object({
  recipient: z.string().min(1),
  sender: z.string().min(1),
  subject: z.string().nullable().optional(),

  "body-plain": z.string().nullable().optional(),
  "body-html": z.string().nullable().optional(),

  "Message-Id": z.string().nullable().optional(),

  "Content-Length": z.string().nullable().optional(),

  timestamp: z.string().optional(),
  token: z.string().optional(),
  signature: z.string().optional(),
});
