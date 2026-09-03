import { Router } from "express";
import AuthMiddleware from "../../middleware/auth";
import MailboxController from "./mailbox.controller";

const router = Router();

router.post(
  "/create",
  AuthMiddleware.optionalToken,
  MailboxController.createMailbox,
);
router.get("/mailbox/:address", MailboxController.getMailbox);
router.get(
  "/my-mailboxes",
  AuthMiddleware.validateAccessToken,
  MailboxController.getMyMailbox,
);
router.get("/my-messages/:mailboxId", MailboxController.getEmailMessages);
router.patch(
  "/:mailboxId/messages/:messageId/read",
  MailboxController.markMessageAsRead,
);
export default router;
