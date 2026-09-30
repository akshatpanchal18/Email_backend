import z from "zod";
import { MailgunInboundWebhookSchema } from "./mailgun.schema";

export type MailgunInboundWebhookInput = z.infer<typeof MailgunInboundWebhookSchema>;
export interface MailgunAttachmentFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
