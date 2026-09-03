import { Request, Response, Router } from "express";
import { ApiError } from "../helper/apiError";
import { ApiResponse } from "../helper/apiResponse";
import EmailMessageRepository from "../repository/email-message";

class Cronjob {
  private static readonly CRON_SECRET = process.env.CRON_SECRET;

  static async deleteStaleEmailMessage(req: Request, res: Response) {
    try {
      // Validate cron secret
      if (req.headers["x-cron-secret"] !== this.CRON_SECRET) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const now = new Date();

      console.log(`Running stale email cleanup at ${now.toISOString()}`);

      // Delete all expired messages
      const result = await EmailMessageRepository.deleteExpired();

      console.log(`Deleted ${result.count} expired email messages`);

      return res.status(200).json(
        new ApiResponse(200, "Expired email messages deleted successfully", {
          deletedCount: result.count,
          executedAt: now.toISOString(),
        }),
      );
    } catch (error) {
      console.error("Failed to delete stale email messages:", error);

      return res
        .status(500)
        .json(ApiError.internal("Failed to delete stale email messages"));
    }
  }
}

export default Cronjob;

export const cronjobRoutes = Router();
cronjobRoutes.delete("/email-message", Cronjob.deleteStaleEmailMessage);
