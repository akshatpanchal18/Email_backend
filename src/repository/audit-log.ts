// repository/auditLog.ts
import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";

class AuditLogRepository {
  static create(
    data: Prisma.AuditLogCreateInput,
    select?: Prisma.AuditLogSelect,
  ) {
    return prisma.auditLog.create({
      data,
      select,
    });
  }

  static findById(id: string, select?: Prisma.AuditLogSelect) {
    return prisma.auditLog.findUnique({
      where: { id },
      select,
    });
  }

  static findByMailboxId(mailboxId: string, select?: Prisma.AuditLogSelect) {
    return prisma.auditLog.findMany({
      where: { mailboxId },
      orderBy: { createdAt: "desc" },
      select,
    });
  }

  static findByUserId(userId: string, select?: Prisma.AuditLogSelect) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select,
    });
  }

  static countByIpSince(
    ipAddress: string,
    action: Prisma.AuditLogWhereInput["action"],
    since: Date,
  ) {
    return prisma.auditLog.count({
      where: {
        ipAddress,
        action,
        createdAt: { gte: since },
      },
    });
  }

  static findMany(
    where: Prisma.AuditLogWhereInput = {},
    select?: Prisma.AuditLogSelect,
  ) {
    return prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select,
    });
  }
}

export default AuditLogRepository;
