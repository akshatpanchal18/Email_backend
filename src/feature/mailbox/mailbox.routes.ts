import { Router } from "express";
import AuthMiddleware from "../../middleware/auth";
import MailboxController from "./mailbox.controller";

const router = Router();

// POST
router.post("/create", AuthMiddleware.optionalToken, MailboxController.createMailbox);

// GET: static paths first, then params
router.get("/my-mailboxes", AuthMiddleware.validateAccessToken, MailboxController.getMyMailbox);
router.get("/my-messages/:mailboxId", MailboxController.getEmailMessages);
router.get("/:mailboxId/attachments", AuthMiddleware.validateAccessToken, MailboxController.getAttachments);
router.get("/:id", MailboxController.getMailbox);

// PATCH
router.patch("/:mailboxId/messages/:messageId/read", MailboxController.markMessageAsRead);

// DELETE: static paths first, /:param last
router.delete("/messages", AuthMiddleware.validateAccessToken, MailboxController.deleteEmailMessages);
router.delete("/empty", AuthMiddleware.validateAccessToken, MailboxController.emptyInbox);
router.delete("/:messageId", AuthMiddleware.validateAccessToken, MailboxController.deleteEmailMessage);

export default router;
