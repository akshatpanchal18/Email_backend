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

  static findByAddress(address: string, select?: Prisma.MailboxSelect) {
    return prisma.mailbox.findUnique({
      where: { address },
      select,
    });
  }

  static findByUserId(owner_id: string, select?: Prisma.MailboxSelect) {
    return prisma.mailbox.findMany({
      where: { owner_id },
      select,
    });
  }

  static findByIdAndUserId(
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

  static findByIdAndAddress(
    id: string,
    address: string,
    select?: Prisma.MailboxSelect,
  ) {
    return prisma.mailbox.findFirst({
      where: {
        id,
        address,
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

  static existsByAddress(address: string) {
    return prisma.mailbox.findUnique({
      where: { address },
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

  static delete(id: string) {
    return prisma.mailbox.delete({
      where: { id },
      select: { id: true },
    });
  }

  static deleteExpired() {
    return prisma.mailbox.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}

export default MailboxRepository;
