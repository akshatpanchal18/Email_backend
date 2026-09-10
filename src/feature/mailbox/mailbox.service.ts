import logger from "../../config/pino";
import {
  AuditAction,
  MailboxStatus,
  User,
} from "../../generated/prisma/client";
import { ApiError } from "../../helper/apiError";
import EmailMessageRepository from "../../repository/email-message";
import MailboxRepository from "../../repository/mailbox";
import SocketService from "../../service/socket";
import AuditLogService from "../audit-log/audit-log.service";
import { CreateMailboxInput } from "./mailbox.types";

class MailboxService {
  private static readonly DOMAIN_ADDRESS = process.env.DOMAIN_ADDRESS ?? "";
  private static readonly MailboxFields = {
    id: true,
    owner_id: true,
    prefix: true,
    address: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  };
  // Guest, new name → create PUBLIC
  // Guest, existing PUBLIC → return it, log accessed
  // Guest, existing PRIVATE → rejected
  // User already owns one → rejected
  // User, new name → create PRIVATE
  // User, existing PUBLIC → wipe messages, claim it, PRIVATE
  // User, existing PRIVATE → rejected
  static async createMailbox(
    data: CreateMailboxInput,
    meta: { ip: string; userAgent: string; deviceInfo?: object },
    user?: User,
  ) {
    const { address } = data; // rename from `address` — this is just the username part, not the full email
    const fullAddress = `${address}${this.DOMAIN_ADDRESS}`;

    const existing = await MailboxRepository.findByPrefix(address);

    // ---------- Guest ----------
    if (!user) {
      if (!existing) {
        const mailbox = await MailboxRepository.create({
          prefix: address,
          address: fullAddress,
          status: MailboxStatus.PUBLIC,
        });
        await AuditLogService.log({
          mailboxId: mailbox.id,
          action: AuditAction.MAILBOX_CREATED,
          ...meta,
        });
        return mailbox;
      }

      if (existing.status === MailboxStatus.PUBLIC) {
        await AuditLogService.log({
          mailboxId: existing.id,
          action: AuditAction.MAILBOX_ACCESSED,
          ...meta,
        });
        return existing;
      }

      throw ApiError.conflict("This name is already taken");
    }

    // ---------- Logged-in user ----------
    const ownsOne = await MailboxRepository.existsByOwnerId(user.id);
    // check for user already have or not
    if (ownsOne) {
      throw ApiError.conflict(
        "You already have a mailbox. Delete or release it before creating another.",
        "MAILBOX_ALREADY_EXISTS",
        [
          {
            field: "address",
            message:
              "You already have a mailbox. Delete or release it before creating another.",
            code: "MAILBOX_ALREADY_EXISTS",
          },
        ],
      );
    }
    // if email not exist
    if (!existing) {
      const mailbox = await MailboxRepository.create({
        prefix: address,
        address: fullAddress,
        status: MailboxStatus.PRIVATE,
        user: { connect: { id: user.id } },
      });
      await AuditLogService.log({
        mailboxId: mailbox.id,
        action: AuditAction.MAILBOX_CREATED,
        userId: user.id,
        ...meta,
      });
      return mailbox;
    }
    // if exist then check status
    if (existing.status === MailboxStatus.PRIVATE) {
      throw ApiError.conflict("This name is already taken", "NAME_TAKEN", [
        {
          field: "address",
          message: "This name is already taken",
          code: "NAME_TAKEN",
        },
      ]);
    }

    // existing.status === "PUBLIC" → implicit claim
    await EmailMessageRepository.deleteManyByMailboxId(existing.id);
    // TODO: also purge this mailbox's attachments from Cloudinary — DB cascade won't touch them

    const claimed = await MailboxRepository.update(
      existing.id,
      {
        status: MailboxStatus.PRIVATE,
        user: { connect: { id: user.id } },
      },
      this.MailboxFields,
    );
    await AuditLogService.log({
      mailboxId: claimed.id,
      action: AuditAction.MAILBOX_CLAIMED,
      userId: user.id,
      ...meta,
    });
    return claimed;
  }
  static async getMailbox(id: string) {
    const find_mailbox = await MailboxRepository.findById(
      id,
      this.MailboxFields,
    );
    if (!find_mailbox) {
      throw ApiError.conflict("invalid req");
    }
    if (find_mailbox?.status === MailboxStatus.PRIVATE) {
      throw ApiError.forbidden("mailbox is private");
    }
    // Mailbox is not owned → accessible
    return find_mailbox;
  }
  static async getMyMailbox(user: User) {
    const { id } = user;
    // logger.info({id})

    const mailbox = await MailboxRepository.findByOwnerId(
      id,
      this.MailboxFields,
    );
    // logger.info({mailbox})

    return Array.isArray(mailbox) ? mailbox : mailbox ? [mailbox] : [];
  }
  static async getEmailMessages(mailboxId: string) {
    const mailbox = await MailboxRepository.findById(mailboxId, {
      id: true,
    });

    if (!mailbox) {
      throw new Error("Mailbox not found");
    }

    return EmailMessageRepository.findByMailboxId(mailbox.id, {
      id: true,
      message_id: true,
      from: true,
      to: true,
      subject: true,
      text: true,
      html: true,
      raw_size_bytes: true,
      is_read: true,
      receivedAt: true,
      expiresAt: true,
      createdAt: true,
      attachments: true,
    });
  }
  static async markMessageAsRead(mailboxId: string, messageId: string) {
    const message = await EmailMessageRepository.findById(messageId, {
      id: true,
      mailbox_id: true,
      is_read: true,
    });

    if (!message) {
      throw new Error("Message not found");
    }

    // ownership check — make sure this message actually belongs to the mailbox being viewed
    if (message.mailbox_id !== mailboxId) {
      throw new Error("Message does not belong to this mailbox");
    }

    if (message.is_read) {
      return message; // already read, skip write + emit
    }

    const updated = await EmailMessageRepository.markAsRead(messageId);

    // notify any other open tab/device viewing the same mailbox
    SocketService.emitToMailbox(mailboxId, "message_read", {
      messageId: updated.id,
    });

    return updated;
  }
}

export default MailboxService;
