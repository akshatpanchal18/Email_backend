import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";

class MailboxRepository {
  static create(
    data: Prisma.MailboxCreateInput,
    select?: Prisma.MailboxSelect,
  ) {
    return prisma.mailbox.create({
      data,
      select,
    });
  }

  static findById(id: string, select?: Prisma.MailboxSelect) {
    return prisma.mailbox.findUnique({
      where: { id },
      select,
    });
  }

  static findByPrefix(prefix: string, select?: Prisma.MailboxSelect) {
    return prisma.mailbox.findUnique({
      where: { prefix },
      select,
    });
  }
  static findByOwnerId(id: string, select?: Prisma.MailboxSelect) {
    return prisma.mailbox.findFirst({
      where: { owner_id: id },
      select,
    });
  }

  static findByIdAndOwnerId(
    id: string,
    owner_id: string,
    select?: Prisma.MailboxSelect,
  ) {
    return prisma.mailbox.findFirst({
      where: {
        id,
        owner_id,
      },
      select,
    });
  }

  static findByIdAndPrefix(
    id: string,
    prefix: string,
    select?: Prisma.MailboxSelect,
  ) {
    return prisma.mailbox.findFirst({
      where: {
        id,
        prefix,
      },
      select,
    });
  }

  static findMany(
    where: Prisma.MailboxWhereInput = {},
    select?: Prisma.MailboxSelect,
  ) {
    return prisma.mailbox.findMany({
      where,
      select,
    });
  }

  static existsByPrefix(prefix: string) {
    return prisma.mailbox.findUnique({
      where: { prefix },
      select: { id: true },
    });
  }
  static existsByOwnerId(owner_id: string) {
    return prisma.mailbox.findFirst({
      where: { owner_id },
      select: { id: true },
    });
  }
  static update(
    id: string,
    data: Prisma.MailboxUpdateInput,
    select?: Prisma.MailboxSelect,
  ) {
    return prisma.mailbox.update({
      where: { id },
      data,
      select,
    });
  }

  static deleteManyByMailboxId(mailbox_id: string) {
    return prisma.emailMessage.deleteMany({
      where: { mailbox_id },
    });
  }
}

export default MailboxRepository;
