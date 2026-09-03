import { Request, Response } from "express";
import asyncHandler from "../../helper/asyncHandler";
import MailboxService from "./mailbox.service";
import { ApiResponse } from "../../helper/apiResponse";
import logger from "../../config/pino";

class MailboxController {
  static readonly guestCookieOption = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 2 * 60 * 60 * 1000,
  };
  static createMailbox = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body;
    const user = req.user;

    const result = await MailboxService.createMailbox(data, user);

    // Guest mailbox
    if ("cookie" in result) {
      res.cookie("temp_session", result.cookie, this.guestCookieOption);

      return res.status(201).json(
        new ApiResponse(201, "mailbox created", {
          mailbox: result.mailbox,
        }),
      );
    }

    // Logged-in user mailbox
    return res.status(201).json(
      new ApiResponse(201, "mailbox created", {
        mailbox: result,
      }),
    );
  });
  static getMailbox = asyncHandler(async (req: Request, res: Response) => {
    const address = Array.isArray(req.params.address)
      ? req.params.address[0]!
      : req.params.address!;
    const mailbox = await MailboxService.getMailbox(address);

    return res
      .status(200)
      .json(new ApiResponse(200, "mailbox retrieved", { mailbox }));
  });
  static getMyMailbox = asyncHandler(async (req: Request, res: Response) => {
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
