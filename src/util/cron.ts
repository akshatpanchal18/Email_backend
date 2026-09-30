import { Request, Response, Router } from "express";
import { ApiError } from "../helper/apiError";
import { ApiResponse } from "../helper/apiResponse";
import EmailMessageRepository from "../repository/email-message";
import CloudinaryService from "../service/cloudinary";

type ResourceType = "image" | "video" | "raw";
const BATCH_SIZE = 50;
const MAX_BATCHES = 20;
class Cronjob {
  private static readonly CRON_SECRET = process.env.CRON_SECRET;

  static async deleteStaleEmailMessage(req: Request, res: Response) {
    try {
      const secret = Cronjob.CRON_SECRET;
      if (!secret || req.headers["x-cron-secret"] !== secret) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const now = new Date();
      let deletedCount = 0;
      let deletedFiles = 0;
      const skipped: string[] = []; // emails whose Cloudinary delete failed, retried next run

      for (let i = 0; i < MAX_BATCHES; i++) {
        const batch = await EmailMessageRepository.findExpiredBatch(BATCH_SIZE, skipped);
        if (batch.length === 0) break;

        // 1. delete files from Cloudinary
        const tasks = batch.flatMap((email) => email.attachments.map((a) => ({ emailId: email.id, a })));

        const results = await Promise.allSettled(tasks.map((t) => CloudinaryService.delete(t.a.storageKey, t.a.resource_type as ResourceType)));

        const failed = new Set<string>();
        results.forEach((r, idx) => {
          if (r.status === "rejected") {
            failed.add(tasks[idx].emailId);
            console.error("Cloudinary delete failed:", tasks[idx].a.storageKey, r.reason);
          } else {
            deletedFiles++;
          }
        });

        // 2. only delete emails whose files are all gone
        const deletable = batch.filter((e) => !failed.has(e.id));
        skipped.push(...failed);

        if (deletable.length > 0) {
          // 3. bytes to give back per owner (guest emails never counted)
          const storageByUser = new Map<string, number>();
          for (const email of deletable) {
            if (!email.owner_id) continue;
            const bytes = email.attachments.reduce((sum, a) => sum + a.size, 0);
            if (bytes > 0) {
              storageByUser.set(email.owner_id, (storageByUser.get(email.owner_id) ?? 0) + bytes);
            }
          }

          await EmailMessageRepository.deleteBatch(
            deletable.map((e) => e.id),
            storageByUser,
          );
          deletedCount += deletable.length;
        }
      }
      console.log("CRON_JOB :", {
        deletedCount,
        deletedFiles,
        skippedCount: skipped.length,
        executedAt: now.toISOString(),
      });
      return res.status(200).json(
        new ApiResponse(200, "Expired email messages deleted successfully", {
          deletedCount,
          deletedFiles,
          skippedCount: skipped.length,
          executedAt: now.toISOString(),
        }),
      );
    } catch (error) {
      console.error("Failed to delete stale email messages:", error);
      return res.status(500).json(ApiError.internal("Failed to delete stale email messages"));
    }
  }
}

export default Cronjob;

export const cronjobRoutes = Router();
cronjobRoutes.delete("/email-message", Cronjob.deleteStaleEmailMessage);
