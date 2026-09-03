import { Router } from "express";
import MailgunController from "./mailgun.controller";

const router = Router();
router.post("/webhook-test", MailgunController.testWebhook);
router.post("/webhook", MailgunController.createEmailMessage);

export default router;
