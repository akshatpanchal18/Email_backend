import { Request, Response } from "express";
import asyncHandler from "../../helper/asyncHandler";
import MailboxService from "./mailbox.service";
import { ApiResponse } from "../../helper/apiResponse";
import logger from "../../config/pino";

class MailboxController {
  static createMailbox = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body;
    const user = req.user;
    const meta = req.meta;
    const meta_data = {
      ip: meta.ip ?? "unknown",
      userAgent: meta.userAgent,
      deviceInfo: meta.device,
    };

    const mailbox = await MailboxService.createMailbox(data, meta_data, user);

    // Guest mailbox
    return res.status(201).json(
      new ApiResponse(201, "mailbox created", {
        mailbox,
      }),
    );
  });
  static getMailbox = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]!
      : req.params.id!;
    logger.info({ id }, "HIT: getMailbox");
    const mailbox = await MailboxService.getMailbox(id);

    return res
      .status(200)
      .json(new ApiResponse(200, "mailbox retrieved", { mailbox }));
  });
  static getMyMailbox = asyncHandler(async (req: Request, res: Response) => {
    logger.info("HIT: getMyMailbox");
    const user = req.user!;
    // logger.info({ user });
    const mailbox = await MailboxService.getMyMailbox(user);
    return res
      .status(200)
      .json(new ApiResponse(200, "mailbox retrieved", { mailbox }));
  });
  static getEmailMessages = asyncHandler(
    async (req: Request, res: Response) => {
      const mailboxId = Array.isArray(req.params.mailboxId)
        ? req.params.mailboxId[0]!
        : req.params.mailboxId!;
      const messages = await MailboxService.getEmailMessages(mailboxId);
      return res
        .status(200)
        .json(new ApiResponse(200, "messages retrieved", { messages }));
    },
  );
  static markMessageAsRead = asyncHandler(
    async (req: Request, res: Response) => {
      const mailboxId = Array.isArray(req.params.mailboxId)
        ? req.params.mailboxId[0]!
        : req.params.mailboxId!;
      const messageId = Array.isArray(req.params.messageId)
        ? req.params.messageId[0]!
        : req.params.messageId!;

      const message = await MailboxService.markMessageAsRead(
        mailboxId,
        messageId,
      );

      return res
        .status(200)
        .json(new ApiResponse(200, "message marked as read", { message }));
    },
  );
}

export default MailboxController;
