import logger from "../../config/pino";
import { OwnerShip, User } from "../../generated/prisma/client";
import { ApiError } from "../../helper/apiError";
import EmailMessageRepository from "../../repository/email-message";
import MailboxRepository from "../../repository/mailbox";
import EncryptionService from "../../service/encryption";
import PasswordService from "../../service/password";
import SocketService from "../../service/socket";
import { CreateMailboxInput } from "./mailbox.types";

class MailboxService {
  private static readonly DOMAIN_ADDRESS = process.env.DOMAIN_ADDRESS ?? "";
  private static readonly MailboxFields = {
    id: true,
    owner_id: true,
    address: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  };
  static async createMailbox(data: CreateMailboxInput, user?: User) {
    const { address } = data;
    const mailboxAddress = `${address}${this.DOMAIN_ADDRESS}`;

    const existingMailbox =
      await MailboxRepository.findByAddress(mailboxAddress);

    // =========================================================
    // MAILBOX EXISTS
    // =========================================================

    if (existingMailbox) {
      logger.fatal(
        { existingMailbox: existingMailbox.address },
        "found existing mailbox",
      );

      // Owned — always blocked, regardless of who's asking
      if (existingMailbox.status === OwnerShip.OWNED) {
        throw ApiError.validation([
          {
            field: "address",
            message: "Mailbox is permanently taken",
          },
        ]);
      }

      // Unowned (NONE)
      if (existingMailbox.status === OwnerShip.NONE) {
        // Logged-in user claims it
        if (user?.id) {
          return await MailboxRepository.update(
            existingMailbox.id,
            {
              user: { connect: { id: user.id } },
              status: OwnerShip.OWNED,
            },
            this.MailboxFields,
          );
        }

        // Guest just gets it back as-is
        return existingMailbox;
      }
    }

    // =========================================================
    // MAILBOX DOES NOT EXIST
    // =========================================================

    // Logged-in user
    if (user?.id) {
      return await MailboxRepository.create(
        {
          address: mailboxAddress,
          status: OwnerShip.OWNED,
          user: { connect: { id: user.id } },
        },
        this.MailboxFields,
      );
    }

    // Guest
    return await MailboxRepository.create(
      {
        address: mailboxAddress,
        status: OwnerShip.NONE,
      },
      this.MailboxFields,
    );
  }
  static async getMailbox(address: string, userId?: string) {
    const mailboxAddress = `${address}${this.DOMAIN_ADDRESS}`;

    const find_mailbox = await MailboxRepository.findByAddress(
      mailboxAddress,
      this.MailboxFields,
    );
    if (!find_mailbox) {
      // Authenticated user:
      // requested mailbox doesn't exist, so return their mailbox.
      if (userId) {
        return await MailboxRepository.findByUserId(userId, this.MailboxFields);
      }

      // Guest:
      // requested mailbox doesn't exist, so create it.
      return await MailboxRepository.create(
        {
          address: mailboxAddress,
          status: OwnerShip.NONE,
        },
        this.MailboxFields,
      );
    }

    // Mailbox exists and is owned
    if (find_mailbox.status === OwnerShip.OWNED) {
      // No user → cannot access private mailbox
      if (!userId) {
        throw ApiError.unauthorized(
          "Authentication required",
          "MAILBOX_ACCESS_DENIED",
        );
      }

      // Mailbox belongs to another user
      if (find_mailbox.owner_id !== userId) {
        return await MailboxRepository.findByUserId(userId, this.MailboxFields);
      }
      // Owned by current user → return requested mailbox
      return find_mailbox;
    }
    // Mailbox is not owned → accessible
    return find_mailbox;
  }
  static async getMyMailbox(user: User) {
    const { id } = user;
    // logger.info({id})

    const mailbox = await MailboxRepository.findByUserId(id, {
      id: true,
      owner_id: true,
      address: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    });
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
