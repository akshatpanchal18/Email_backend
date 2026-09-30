import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";

class EmailAttachmentRepository {
  static create(data: Prisma.EmailAttachmentCreateInput, select?: Prisma.EmailAttachmentSelect) {
    return prisma.emailAttachment.create({
      data,
      select,
    });
  }

  static createMany(data: Prisma.EmailAttachmentCreateManyInput[]) {
    return prisma.emailAttachment.createMany({
      data,
    });
  }

  static findById(id: string, select?: Prisma.EmailAttachmentSelect) {
    return prisma.emailAttachment.findUnique({
      where: {
        id,
      },
      select,
    });
  }

  static findByMessageId(message_id: string, select?: Prisma.EmailAttachmentSelect) {
    return prisma.emailAttachment.findMany({
      where: {
        message_id,
      },
      select,
      orderBy: {
        id: "asc",
      },
    });
  }

  static findByIdAndMessageId(id: string, message_id: string, select?: Prisma.EmailAttachmentSelect) {
    return prisma.emailAttachment.findFirst({
      where: {
        id,
        message_id,
      },
      select,
    });
  }
  static findByUser(userId: string, opts: { mailboxId?: string; skip?: number; take?: number } = {}) {
    const where: Prisma.EmailAttachmentWhereInput = {
      email: {
        owner_id: userId,
        ...(opts.mailboxId ? { mailbox_id: opts.mailboxId } : {}),
      },
    };

    return prisma.$transaction([
      prisma.emailAttachment.findMany({
        where,
        select: {
          id: true,
          filename: true,
          content_type: true,
          size: true,
          url: true,
          email: { select: { id: true, subject: true, mailbox_id: true } },
        },
        orderBy: { size: "desc" }, // biggest first, useful for a storage view
        skip: opts.skip ?? 0,
        take: opts.take ?? 20,
      }),
      prisma.emailAttachment.count({ where }),
      prisma.emailAttachment.aggregate({ where, _sum: { size: true } }),
    ]);
  }
  static findByStorageKey(storageKey: string, select?: Prisma.EmailAttachmentSelect) {
    return prisma.emailAttachment.findFirst({
      where: {
        storageKey,
      },
      select,
    });
  }

  static findMany(where: Prisma.EmailAttachmentWhereInput = {}, select?: Prisma.EmailAttachmentSelect) {
    return prisma.emailAttachment.findMany({
      where,
      select,
      orderBy: {
        id: "asc",
      },
    });
  }

  static update(id: string, data: Prisma.EmailAttachmentUpdateInput, select?: Prisma.EmailAttachmentSelect) {
    return prisma.emailAttachment.update({
      where: {
        id,
      },
      data,
      select,
    });
  }

  static delete(id: string) {
    return prisma.emailAttachment.delete({
      where: {
        id,
      },
      select: {
        id: true,
        storageKey: true,
      },
    });
  }

  static deleteByMessageId(message_id: string) {
    return prisma.emailAttachment.deleteMany({
      where: {
        message_id,
      },
    });
  }

  static countByMessageId(message_id: string) {
    return prisma.emailAttachment.count({
      where: {
        message_id,
      },
    });
  }
}

export default EmailAttachmentRepository;
