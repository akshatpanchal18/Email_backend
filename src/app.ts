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
import authRoutes from "./feature/auth/auth.routes";
import { requestLogger } from "./middleware/request-info";
app.use(requestLogger);
app.get("/", (_req, res) => {
  res.json({
    message: "Backend is running",
  });
});
app.get("/health", checkHealth);
app.use("/api/v2/auth", authRoutes);

app.use(errorMiddleware);
export default app;
