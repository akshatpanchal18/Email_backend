import { Request, Response } from "express";
import asyncHandler from "../../helper/asyncHandler";
import { ApiResponse } from "../../helper/apiResponse";
import logger from "../../config/pino";
import MailgunService from "./mailgun.service";
import { MailgunInboundWebhookSchema } from "./mailgun.schema";
import { ApiError } from "../../helper/apiError";
import { error } from "node:console";

class MailgunController {
  static testWebhook = asyncHandler(async (req: Request, res: Response) => {
    logger.info(
      {
        event: "mailgun.webhook.received",
        body: req.body,
      },
      "Mailgun webhook called",
    );

    return res.status(200).json(new ApiResponse(200, "data received"));
  });
  static createEmailMessage = asyncHandler(
    async (req: Request, res: Response) => {
      const parsed = MailgunInboundWebhookSchema.safeParse(req.body);

      if (!parsed.success) {
        logger.error(
          { error: parsed.error },
          "Invalid Mailgun webhook payload",
        );
        throw ApiError.badRequest("Invalid Mailgun webhook payload");
      }

      try {
        const email = await MailgunService.handleInboundEmail(parsed.data);

        return res.status(201).json({
          success: true,
          message: "Email received successfully",
          data: email,
        });
      } catch (error) {
        if (error instanceof Error && error.message === "Mailbox not found") {
          return res.status(404).json({
            success: false,
            message: "Mailbox not found",
          });
        }

        if (error instanceof Error && error.message === "Mailbox expired") {
          return res.status(410).json({
            success: false,
            message: "Mailbox expired",
          });
        }

        console.error("Mailgun inbound webhook error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to process email",
        });
      }
    },
  );
}
export default MailgunController;
