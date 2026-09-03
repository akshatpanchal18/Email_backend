import logger from "../../config/pino";
import { OwnerShip } from "../../generated/prisma/enums";
import EmailMessageRepository from "../../repository/email-message";
import MailboxRepository from "../../repository/mailbox";
import SocketService from "../../service/socket";
import { MailgunInboundWebhookInput } from "./mailgun.types";

class MailgunService {
  static async handleInboundEmail(data: MailgunInboundWebhookInput) {
    const recipient = data.recipient.split(",")[0].trim().toLowerCase();

    const messageId = data["Message-Id"];

    if (!messageId) {
      throw new Error("Message-Id missing");
    }

    // 1. Find mailbox
    const mailbox = await MailboxRepository.findByAddress(recipient, {
      id: true,
      address: true,
      owner_id: true,
      expiresAt: true,
      status: true,
    });

    if (!mailbox) {
      throw new Error("Mailbox not found");
    }

    // 2. Check mailbox expiration
    if (mailbox.expiresAt && mailbox.expiresAt <= new Date()) {
      throw new Error("Mailbox expired");
    }

    // 3. Check duplicate
    const existingEmail =
      await EmailMessageRepository.findByMailboxIdAndMessageId(
        mailbox.id,
        messageId,
      );

    if (existingEmail) {
      return existingEmail;
    }

    // 4. Calculate email expiry
    const EMAIL_MESSAGE_EXPIRY_DAYS = 15;

    const emailMessageExpiry =
      mailbox.status === OwnerShip.GUEST
        ? mailbox.expiresAt!
        : new Date(
            Date.now() + EMAIL_MESSAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
          );

    // 5. Create email
    const email = await EmailMessageRepository.create({
      mailbox: {
        connect: {
          id: mailbox.id,
        },
      },

      ...(mailbox.owner_id
        ? {
            user: {
              connect: {
                id: mailbox.owner_id,
              },
            },
          }
        : {}),

      message_id: messageId,

      from: data.sender,
      to: recipient,

      subject: data.subject ?? null,

      text: data["body-plain"] ?? null,
      html: data["body-html"] ?? null,

      raw_size_bytes: data["Content-Length"]
        ? Number(data["Content-Length"])
        : null,

      expiresAt: emailMessageExpiry,
    });
    logger.info(
      {
        event: "new_message",
        room: mailbox.id,
        email,
      },
      "emitting to...",
    );
    SocketService.emitToMailbox(mailbox.id, "new_message", email);
    logger.info("emitted");
    return email;
  }
}

export default MailgunService;
