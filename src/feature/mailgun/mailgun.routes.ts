import { Router } from "express";
import MailgunController from "./mailgun.controller";
import mailgunUpload from "../../middleware/mailgun-upload";

const router = Router();
router.post("/webhook-test", MailgunController.testWebhook);
router.post("/webhook", mailgunUpload.any(), MailgunController.createEmailMessage);

export default router;
