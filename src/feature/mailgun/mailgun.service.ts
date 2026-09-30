import logger from "../../config/pino";
import { Prisma } from "../../generated/prisma/client";
import EmailMessageRepository from "../../repository/email-message";
import MailboxRepository from "../../repository/mailbox";
import CloudinaryService from "../../service/cloudinary";
import SocketService from "../../service/socket";
import { MailgunInboundWebhookInput } from "./mailgun.types";

type ResourceType = "image" | "video" | "raw";

class MailgunService {
  static async handleInboundEmail(data: MailgunInboundWebhookInput, files: Express.Multer.File[] = []) {
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
      status: true,
    });

    if (!mailbox) {
      throw new Error("Mailbox not found");
    }

    // 2. Duplicate check (Mailgun retries)
    const existingEmail = await EmailMessageRepository.findByMailboxIdAndMessageId(mailbox.id, messageId);
    if (existingEmail) {
      return existingEmail;
    }

    // 3. Expiry
    const EMAIL_MESSAGE_EXPIRY_DAYS = 15;
    const EMAIL_MESSAGE_EXPIRY_HOURS = 2;

    const emailMessageExpiry = mailbox.owner_id ? new Date(Date.now() + EMAIL_MESSAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000) : new Date(Date.now() + EMAIL_MESSAGE_EXPIRY_HOURS * 60 * 60 * 1000);

    // 4. Quota check (before uploading anything)
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > 0) {
      // TODO: plug in your quota logic, e.g.
      // const ok = await StorageQuotaService.canStore(mailbox.id, totalBytes);
      // if (!ok) throw new Error("Storage quota exceeded");
    }

    // 5. Upload attachments to Cloudinary
    const uploaded: { publicId: string; resourceType: ResourceType }[] = [];

    try {
      const results = await Promise.all(
        files.map(async (file) => {
          const res = await CloudinaryService.uploadBuffer(file.buffer, {
            folder: `tempmail/${mailbox.id}`,
            resource_type: "auto",
          });
          uploaded.push({ publicId: res.public_id, resourceType: res.resource_type as ResourceType });
          return { file, res };
        }),
      );

      const attachmentRows: Prisma.EmailAttachmentCreateWithoutEmailInput[] = results.map(({ file, res }) => ({
        filename: file.originalname,
        content_type: file.mimetype,
        size: file.size,
        url: res.secure_url,
        storageKey: res.public_id,
        resource_type: res.resource_type,
      }));

      // 6. Create email + attachments in one go
      const email = await EmailMessageRepository.createWithAttachments({
        mailbox: { connect: { id: mailbox.id } },

        ...(mailbox.owner_id ? { user: { connect: { id: mailbox.owner_id } } } : {}),

        message_id: messageId,
        from: data.from ?? data.sender,
        to: recipient,
        subject: data.subject ?? null,
        text: data["body-plain"] ?? null,
        html: data["body-html"] ?? null,
        raw_size_bytes: data["Content-Length"] ? Number(data["Content-Length"]) : null,
        expiresAt: emailMessageExpiry,

        ...(attachmentRows.length ? { attachments: { create: attachmentRows } } : {}),
      });

      // 7. Push to client
      SocketService.emitToMailbox(mailbox.id, "new_message", email);
      logger.info({ mailboxId: mailbox.id, emailId: email.id }, "new_message emitted");

      return email;
    } catch (err) {
      // roll back Cloudinary uploads if anything failed
      await Promise.allSettled(uploaded.map((u) => CloudinaryService.delete(u.publicId, u.resourceType)));
      throw err;
    }
  }
}

export default MailgunService;
