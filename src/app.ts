import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import checkHealth from "./util/health";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

import { errorMiddleware } from "./middleware/error";
import { requestLogger } from "./middleware/request-info";
import authRoutes from "./feature/auth/auth.routes";
import mailboxRoutes from "./feature/mailbox/mailbox.routes";
import mailgunRoutes from "./feature/mailgun/mailgun.routes";
import { cronjobRoutes } from "./util/cron";
import { success } from "zod";
app.use(requestLogger);
app.get("/awake", (_req, res) => {
  res.json({
    success: true,
    message: "Backend is running",
  });
});
app.get("/health", checkHealth);
app.get("/api/v1/cron", cronjobRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/mailbox", mailboxRoutes);
app.use("/api/v1/mailgun", mailgunRoutes);

app.use(errorMiddleware);
export default app;
