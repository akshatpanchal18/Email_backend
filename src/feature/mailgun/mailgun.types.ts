import z from "zod";
import { MailgunInboundWebhookSchema } from "./mailgun.schema";

export type MailgunInboundWebhookInput = z.infer<
  typeof MailgunInboundWebhookSchema
>;
