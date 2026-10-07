import { Request, Response } from "express";
import asyncHandler from "../../helper/asyncHandler";
import MailboxService from "./mailbox.service";
import { ApiResponse } from "../../helper/apiResponse";
import logger from "../../config/pino";
import { bulkDeleteSchema, messageIdParamSchema } from "./mailbox.schema";

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
    const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
    logger.info({ id }, "HIT: getMailbox");
    const mailbox = await MailboxService.getMailbox(id);

    return res.status(200).json(new ApiResponse(200, "mailbox retrieved", { mailbox }));
  });
  static getMyMailbox = asyncHandler(async (req: Request, res: Response) => {
    logger.info("HIT: getMyMailbox");
    const user = req.user!;
    // logger.info({ user });
    const mailbox = await MailboxService.getMyMailbox(user);
    return res.status(200).json(new ApiResponse(200, "mailbox retrieved", { mailbox }));
  });
  static getEmailMessages = asyncHandler(async (req: Request, res: Response) => {
    const mailboxId = Array.isArray(req.params.mailboxId) ? req.params.mailboxId[0]! : req.params.mailboxId!;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const result = await MailboxService.getEmailMessages(mailboxId, page, limit);
    return res.status(200).json(new ApiResponse(200, "messages retrieved", { messages: result }));
  });
  static markMessageAsRead = asyncHandler(async (req: Request, res: Response) => {
    const mailboxId = Array.isArray(req.params.mailboxId) ? req.params.mailboxId[0]! : req.params.mailboxId!;
    const messageId = Array.isArray(req.params.messageId) ? req.params.messageId[0]! : req.params.messageId!;

    const message = await MailboxService.markMessageAsRead(mailboxId, messageId);

    return res.status(200).json(new ApiResponse(200, "message marked as read", { message }));
  });
  // controller
  static getAttachments = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const mailboxId = Array.isArray(req.params.mailboxId) ? req.params.mailboxId[0]! : req.params.mailboxId!;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);

    const { items, total, sum } = await MailboxService.getAttachments(userId, mailboxId, page, limit);

    return res.status(200).json(
      new ApiResponse(200, "fetched successfully", {
        items,
        total,
        totalBytes: sum._sum.size ?? 0,
        page,
        limit,
      }),
    );
  });
  static deleteEmailMessage = asyncHandler(async (req: Request, res: Response) => {
    const { messageId } = messageIdParamSchema.parse(req.params);
    await MailboxService.deleteEmailMessage(req.user!.id, messageId);
    return res.status(200).json(new ApiResponse(200, "deleted successfully"));
  });

  static deleteEmailMessages = asyncHandler(async (req: Request, res: Response) => {
    const { messageIds } = bulkDeleteSchema.parse(req.body);
    const result = await MailboxService.deleteEmailMessages(req.user!.id, messageIds);
    return res.status(200).json(new ApiResponse(200, `${result.deleted} deleted`));
  });

  static emptyInbox = asyncHandler(async (req: Request, res: Response) => {
    const result = await MailboxService.emptyInbox(req.user!.id);
    return res.status(200).json(new ApiResponse(200, `inbox emptied (${result.deleted})`));
  });
}

export default MailboxController;
