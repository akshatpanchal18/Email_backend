import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";

export class ConcurrentDeleteError extends Error {}
class EmailMessageRepository {
  static create(data: Prisma.EmailMessageCreateInput, select?: Prisma.EmailMessageSelect) {
    return prisma.emailMessage.create({
      data,
      select,
    });
  }
  // repository
  static createWithAttachments(data: Prisma.EmailMessageCreateInput, quota?: { userId: string; bytes: bigint; max: bigint }) {
    return prisma.$transaction(async (tx) => {
      if (quota && quota.bytes > 0n) {
        // only increments if it stays under the max, atomically
        const { count } = await tx.user.updateMany({
          where: {
            id: quota.userId,
            storage_used_bytes: { lte: quota.max - quota.bytes },
          },
          data: { storage_used_bytes: { increment: quota.bytes } },
        });

        if (count === 0) {
          throw new Error("Storage quota exceeded");
        }
      }

      return tx.emailMessage.create({
        data,
        include: { attachments: true },
      });
    });
  }
  static findById(id: string, select?: Prisma.EmailMessageSelect) {
    return prisma.emailMessage.findUnique({
      where: { id },
      select,
    });
  }

  static findByMessageId(message_id: string, select?: Prisma.EmailMessageSelect) {
    return prisma.emailMessage.findFirst({
      where: { message_id },
      select,
    });
  }

  // static findByMailboxId(
  //   mailbox_id: string,
  //   select?: Prisma.EmailMessageSelect,
  // ) {
  //   return prisma.emailMessage.findMany({
  //     where: {
  //       mailbox_id,
  //       expiresAt: {
  //         gt: new Date(),
  //       },
  //     },
  //     select,
  //     orderBy: {
  //       receivedAt: "desc",
  //     },
  //   });
  // }
  static async findByMailboxId(mailbox_id: string, select: Prisma.EmailMessageSelect, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.emailMessage.findMany({
        where: {
          mailbox_id,
        },
        select,
        skip,
        take: limit,
        orderBy: {
          receivedAt: "desc",
        },
      }),

      prisma.emailMessage.count({
        where: {
          mailbox_id,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
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

  static findByIdAndMailboxId(id: string, mailbox_id: string, select?: Prisma.EmailMessageSelect) {
    return prisma.emailMessage.findFirst({
      where: {
        id,
        mailbox_id,
      },
      select,
    });
  }
  static findByMailboxIdAndMessageId(mailbox_id: string, message_id: string, select?: Prisma.EmailMessageSelect) {
    return prisma.emailMessage.findFirst({
      where: {
        mailbox_id,
        message_id,
      },
      select,
    });
  }
  static findByIdAndOwnerId(id: string, owner_id: string, select?: Prisma.EmailMessageSelect) {
    return prisma.emailMessage.findFirst({
      where: {
        id,
        owner_id,
      },
      select,
    });
  }

  static findMany(where: Prisma.EmailMessageWhereInput = {}, select?: Prisma.EmailMessageSelect) {
    return prisma.emailMessage.findMany({
      where,
      select,
      orderBy: {
        receivedAt: "desc",
      },
    });
  }

  static update(id: string, data: Prisma.EmailMessageUpdateInput, select?: Prisma.EmailMessageSelect) {
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
  static deleteManyByMailboxId(id: string) {
    return prisma.emailMessage.deleteMany({
      where: {
        mailbox_id: id,
      },
    });
  }
  static findExpiredBatch(take: number, excludeIds: string[] = []) {
    return prisma.emailMessage.findMany({
      where: {
        expiresAt: { lte: new Date() },
        ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
      },
      select: {
        id: true,
        owner_id: true,
        attachments: { select: { storageKey: true, resource_type: true, size: true } },
      },
      orderBy: { expiresAt: "asc" },
      take,
    });
  }

  static deleteBatch(ids: string[], storageByUser: Map<string, number>) {
    return prisma.$transaction([
      prisma.emailMessage.deleteMany({ where: { id: { in: ids } } }), // attachments cascade
      ...[...storageByUser].map(([userId, bytes]) =>
        prisma.user.update({
          where: { id: userId },
          data: { storage_used_bytes: { decrement: BigInt(bytes) } },
        }),
      ),
    ]);
  }

  /**
   * Deletes messages matching `where` (attachments cascade) and decrements
   * each owner's storage_used_bytes by exactly the attachment bytes removed.
   * Everything is one transaction. Returns the attachments for storage cleanup.
   */
  static deleteWithQuota(where: Prisma.EmailMessageWhereInput, take?: number) {
    return prisma.$transaction(
      async (tx) => {
        const messages = await tx.emailMessage.findMany({
          where,
          take,
          select: {
            id: true,
            owner_id: true,
            attachments: { select: { storageKey: true, resource_type: true, size: true } },
          },
        });

        if (messages.length === 0) return { count: 0, attachments: [] as { storageKey: string; resource_type: string }[] };

        const ids = messages.map((m) => m.id);
        const { count } = await tx.emailMessage.deleteMany({ where: { id: { in: ids } } });

        // someone else deleted some of these between our read and delete -> roll back,
        // otherwise we'd decrement bytes we didn't actually free
        if (count !== ids.length) throw new ConcurrentDeleteError();

        const bytesByUser = new Map<string, bigint>();
        for (const m of messages) {
          if (!m.owner_id) continue; // guest mail was never charged to a quota
          const bytes = m.attachments.reduce((sum, a) => sum + BigInt(a.size), 0n);
          if (bytes > 0n) bytesByUser.set(m.owner_id, (bytesByUser.get(m.owner_id) ?? 0n) + bytes);
        }

        for (const [userId, bytes] of bytesByUser) {
          await tx.user.update({
            where: { id: userId },
            data: { storage_used_bytes: { decrement: bytes } },
          });
        }

        return {
          count,
          attachments: messages.flatMap((m) => m.attachments),
        };
      },
      { timeout: 15_000 },
    );
  }
}

export default EmailMessageRepository;
