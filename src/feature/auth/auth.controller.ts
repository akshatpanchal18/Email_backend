import { Request, Response } from "express";
import asyncHandler from "../../helper/asyncHandler";
import AuthService from "./auth.service";
import { ApiResponse } from "../../helper/apiResponse";
import logger from "../../config/pino";

class AuthController {
  private static readonly cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none" as const,
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
    return res
      .status(200)
      .clearCookie("temp_session", this.cookieOptions)
      .json(new ApiResponse(200, "user logged-out"));
  });
  // static restoreSession = asyncHandler(async (req: Request, res: Response) => {
  //   const session = req.session!;
  //   const { type, token } = await AuthService.restoreSession(session);
  //   return res
  //     .status(200)
  //     .json(new ApiResponse(200, "session restored", { token, type }));
  // });
  static initialize = asyncHandler(async (req: Request, res: Response) => {
    const session = req.session; // no `!` — this can legitimately be undefined

    if (!session) {
      return res
        .status(200)
        .json(new ApiResponse(200, "app initialized", { status: "anonymous" }));
    }

    const result = await AuthService.initialize(session);

    if (!result) {
      res.clearCookie("temp_session"); // stale/orphaned session — controller's job to clean up
      return res
        .status(200)
        .json(new ApiResponse(200, "app initialized", { status: "anonymous" }));
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
