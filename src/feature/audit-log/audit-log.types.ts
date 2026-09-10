import { AuditAction } from "../../generated/prisma/enums";

export interface LogInput {
  mailboxId: string;
  action: AuditAction;
  userId?: string;
  ip: string;
  userAgent: string;
  deviceInfo?: object;
}
