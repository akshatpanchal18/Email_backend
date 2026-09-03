import logger from "../../config/pino";
import { OwnerShip, User } from "../../generated/prisma/client";
import EmailMessageRepository from "../../repository/email-message";
import MailboxRepository from "../../repository/mailbox";
import EncryptionService from "../../service/encryption";
import PasswordService from "../../service/password";
import SocketService from "../../service/socket";
import { CreateMailboxInput } from "./mailbox.types";

class MailboxService {
  private static readonly DOMAIN_ADDRESS = process.env.DOMAIN_ADDRESS ?? "";

  static async createMailbox(data: CreateMailboxInput, user?: User) {
    const { address } = data;
    const mailboxAddress = `${address}${this.DOMAIN_ADDRESS}`;

    const existingMailbox =
      await MailboxRepository.findByAddress(mailboxAddress);

    // =========================================================
    // MAILBOX EXISTS
    // =========================================================

    if (existingMailbox) {
      // Guest-owned
      if (existingMailbox.status === OwnerShip.GUEST) {
        if (!user?.id) {
          throw new Error("Mailbox is temporarily taken");
        }

        // Guest -> logged-in user
        return await MailboxRepository.update(existingMailbox.id, {
          user: {
            connect: { id: user.id },
          },
          status: OwnerShip.OWNED,
          guest_secret_hash: null,
          expiresAt: null,
        });
      }

      // User-owned
      if (existingMailbox.status === OwnerShip.OWNED) {
        if (user?.id && existingMailbox.owner_id === user.id) {
          return existingMailbox;
        }

        throw new Error("Mailbox is permanently taken");
      }

      // Unowned
      if (existingMailbox.status === OwnerShip.NONE) {
        // Logged-in user
        if (user?.id) {
          return await MailboxRepository.update(existingMailbox.id, {
            user: {
              connect: { id: user.id },
            },
            status: OwnerShip.OWNED,
          });
        }

        // Guest
        return await this.claimAsGuest(existingMailbox.id);
      }
    }

    // =========================================================
    // MAILBOX DOES NOT EXIST
    // =========================================================

    // Logged-in user
    if (user?.id) {
      return await MailboxRepository.create({
        address: mailboxAddress,
        status: OwnerShip.OWNED,
        user: {
          connect: { id: user.id },
        },
      });
    }

    // Guest
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    const secret = await EncryptionService.generateSecret();
    const guest_secret_hash = await PasswordService.hash(secret);

    const mailbox = await MailboxRepository.create({
      address: mailboxAddress,
      status: OwnerShip.GUEST,
      guest_secret_hash,
      expiresAt,
    });

    const cookie = EncryptionService.generateSessionCookie(
      "g",
      mailbox.id,
      secret,
    );

    return {
      mailbox,
      cookie,
    };
  }

  private static async claimAsGuest(mailboxId: string) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    const secret = await EncryptionService.generateSecret();
    const guest_secret_hash = await PasswordService.hash(secret);

    const mailbox = await MailboxRepository.update(
      mailboxId,
      {
        status: OwnerShip.GUEST,
        guest_secret_hash,
        expiresAt,
      },
      {
        id: true,
        owner_id: true,
        expiresAt: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    );

    const cookie = EncryptionService.generateSessionCookie(
      "g",
      mailbox.id,
      secret,
    );

    return {
      mailbox,
      cookie,
    };
  }
  static async getMailbox(address: string) {
    const mailboxAddress = `${address}${this.DOMAIN_ADDRESS}`;

    const find_mailbox = await MailboxRepository.findByAddress(mailboxAddress, {
      id: true,
      owner_id: true,
      address: true,
      expiresAt: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    });
    return find_mailbox;
  }
  static async getMyMailbox(user: User) {
    const { id } = user;
    // logger.info({id})

    const mailbox = await MailboxRepository.findByUserId(id, {
      id: true,
      owner_id: true,
      address: true,
      expiresAt: true,
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
