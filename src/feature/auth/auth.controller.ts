import { Request, Response } from "express";
import asyncHandler from "../../helper/asyncHandler";
import AuthService from "./auth.service";
import { ApiResponse } from "../../helper/apiResponse";
import logger from "../../config/pino";

const MAX_USER_STORAGE_BYTES = 200 * 1024 * 1024;
class AuthController {
  private static readonly cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
  };
  static createUser = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body;
    const { token, cookie, user } = await AuthService.createUser(data);
    return res
      .status(201)
      .cookie("temp_session", cookie, this.cookieOptions)
      .json(
        new ApiResponse(201, "user created", {
          token,
          status: "authenticated",
          user,
        }),
      );
  });
  static loginUser = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body;
    logger.info({ data });
    const { token, cookie, user } = await AuthService.loginUser(data);
    return res
      .status(200)
      .cookie("temp_session", cookie, this.cookieOptions)
      .json(
        new ApiResponse(200, "user logged-in", {
          token,
          status: "authenticated",
          user,
        }),
      );
  });
  static logoutUser = asyncHandler(async (req: Request, res: Response) => {
    const session = req.session!;
    await AuthService.logoutUser(session);
    return res.status(200).clearCookie("temp_session", this.cookieOptions).json(new ApiResponse(200, "user logged-out"));
  });
  static getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const user = await AuthService.getProfile(userId);

    const used = Number(user.storage_used_bytes); // BigInt isn't JSON-serializable

    return res.status(200).json(
      new ApiResponse(200, "profile fetched", {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        mailbox: {
          mailboxCount: user._count.mailboxes,
          emailCount: user._count.email_messages,
          addresses: user.mailboxes,
        },
        storage: {
          usedBytes: used,
          maxBytes: MAX_USER_STORAGE_BYTES,
          percent: Math.min(100, Math.round((used / MAX_USER_STORAGE_BYTES) * 100)),
        },
      }),
    );
  });
  static initialize = asyncHandler(async (req: Request, res: Response) => {
    const session = req.session; // no `!` — this can legitimately be undefined

    if (!session) {
      return res.status(200).json(new ApiResponse(200, "app initialized", { status: "anonymous" }));
    }

    const result = await AuthService.initialize(session);

    if (!result) {
      res.clearCookie("temp_session"); // stale/orphaned session — controller's job to clean up
      return res.status(200).json(new ApiResponse(200, "app initialized", { status: "anonymous" }));
    }

    return res.status(200).json(
      new ApiResponse(200, "app initialized", {
        status: "authenticated",
        token: result.accessToken,
        user: result.user,
      }),
    );
  });
}
export default AuthController;
