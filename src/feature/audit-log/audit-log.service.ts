import AuditLogRepository from "../../repository/audit-log";
import { LogInput } from "./audit-log.types";

class AuditLogService {
  static async log(input: LogInput) {
    return AuditLogRepository.create({
      mailbox: { connect: { id: input.mailboxId } },
      userId: input.userId || null,
      action: input.action,
      ipAddress: input.ip,
      userAgent: input.userAgent,
      deviceInfo: input.deviceInfo,
    });
  }
}

export default AuditLogService;
