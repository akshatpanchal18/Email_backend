import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";

class EmailMessageRepository {
  static create(
    data: Prisma.EmailMessageCreateInput,
    select?: Prisma.EmailMessageSelect,
  ) {
    return prisma.emailMessage.create({
      data,
      select,
    });
  }

  static findById(id: string, select?: Prisma.EmailMessageSelect) {
    return prisma.emailMessage.findUnique({
      where: { id },
      select,
    });
  }

  static findByMessageId(
    message_id: string,
    select?: Prisma.EmailMessageSelect,
  ) {
    return prisma.emailMessage.findFirst({
      where: { message_id },
      select,
    });
  }

  static findByMailboxId(
    mailbox_id: string,
    select?: Prisma.EmailMessageSelect,
  ) {
    return prisma.emailMessage.findMany({
      where: { mailbox_id },
      select,
      orderBy: {
        receivedAt: "desc",
      },
    });
  }

  static findByOwnerId(owner_id: string, select?: Prisma.EmailMessageSelect) {
    return prisma.emailMessage.findMany({
      where: { owner_id },
      select,
      orderBy: {
        receivedAt: "desc",
      },
    });
  }

  static findByIdAndMailboxId(
    id: string,
    mailbox_id: string,
    select?: Prisma.EmailMessageSelect,
  ) {
    return prisma.emailMessage.findFirst({
      where: {
        id,
        mailbox_id,
      },
      select,
    });
  }
  static findByMailboxIdAndMessageId(
    mailbox_id: string,
    message_id: string,
    select?: Prisma.EmailMessageSelect,
  ) {
    return prisma.emailMessage.findFirst({
      where: {
        mailbox_id,
        message_id,
      },
      select,
    });
  }
  static findByIdAndOwnerId(
    id: string,
    owner_id: string,
    select?: Prisma.EmailMessageSelect,
  ) {
    return prisma.emailMessage.findFirst({
      where: {
        id,
        owner_id,
      },
      select,
    });
  }

  static findMany(
    where: Prisma.EmailMessageWhereInput = {},
    select?: Prisma.EmailMessageSelect,
  ) {
    return prisma.emailMessage.findMany({
      where,
      select,
      orderBy: {
        receivedAt: "desc",
      },
    });
  }

  static update(
    id: string,
    data: Prisma.EmailMessageUpdateInput,
    select?: Prisma.EmailMessageSelect,
  ) {
    return prisma.emailMessage.update({
      where: { id },
      data,
      select,
    });
  }

  static markAsRead(id: string, select?: Prisma.EmailMessageSelect) {
    return prisma.emailMessage.update({
      where: { id },
      data: {
        is_read: true,
      },
      select,
    });
  }

  static markAsUnread(id: string, select?: Prisma.EmailMessageSelect) {
    return prisma.emailMessage.update({
      where: { id },
      data: {
        is_read: false,
      },
      select,
    });
  }

  static delete(id: string) {
    return prisma.emailMessage.delete({
      where: { id },
      select: {
        id: true,
      },
    });
  }

  static deleteExpired() {
    return prisma.emailMessage.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}

export default EmailMessageRepository;
