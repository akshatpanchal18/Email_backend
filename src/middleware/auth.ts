import { NextFunction, Request, Response } from "express";
import { ApiError } from "../helper/apiError";
import jwt from "jsonwebtoken";
import EncryptionService from "../service/encryption";
import UserRepository from "../repository/user";
import SessionRepository from "../repository/session";
import PasswordService from "../service/password";
import logger from "../config/pino";

class AuthMiddleware {
  static async validateAccessToken(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const authorization = req.headers.authorization;

      if (!authorization) {
        throw ApiError.unauthorized("Authorization token is required");
      }

      const [type, token] = authorization.split(" ");

      if (type !== "Bearer" || !token) {
        throw ApiError.unauthorized("Invalid authorization token");
      }

      const payload = await EncryptionService.verifyAccessToken(token);

      const user = await UserRepository.findById(payload.id);

      if (!user) {
        throw ApiError.unauthorized("User not found");
      }

      req.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return next(
          ApiError.unauthorized("Access token expired", "TOKEN_EXPIRED"),
        );
      }

      next(error);
    }
  }
  static async optionalToken(req: Request, res: Response, next: NextFunction) {
    try {
      const authorization = req.headers.authorization;

      if (authorization) {
        const [type, token] = authorization.split(" ");

        if (type !== "Bearer" || !token) {
          throw ApiError.unauthorized("Invalid authorization token");
        }

        const payload = await EncryptionService.verifyAccessToken(token);

        const user = await UserRepository.findById(payload.id);

        if (!user) {
          throw ApiError.unauthorized("User not found");
        }

        req.user = user;
      }
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return next(
          ApiError.unauthorized("Access token expired", "TOKEN_EXPIRED"),
        );
      }
      next(error);
    }
  }
  static async validateSession(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const cookie = req.cookies.temp_session;

      if (!cookie) {
        return res.status(200).json({
          status: 200,
          message: "Guest session",
        });
        // throw ApiError.conflict("no cookie found");
      }

      const { type, id, secret } =
        await EncryptionService.decryptSessionCookie(cookie);

      if (type === "g") {
        return res.status(200).json({
          status: 200,
          message: "Guest session",
        });
      }

      if (type === "u") {
        const session = await SessionRepository.findById(id);

        if (!session) {
          throw ApiError.unauthorized("Session not found");
        }

        if (session.expiresAt < new Date()) {
          throw ApiError.unauthorized("Session expired");
        }

        const isValid = await PasswordService.compare(
          secret,
          session.secret_hash!,
        );

        if (!isValid) {
          throw ApiError.unauthorized("Invalid session");
        }

        req.session = session;

        return next();
      }

      return res.status(200).json({
        status: 200,
        message: "Unknown session type",
      });
    } catch (error) {
      next(error);
    }
  }
}
export default AuthMiddleware;
