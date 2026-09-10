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
        req.session = undefined;
        return next();
      }

      const { id, secret } =
        await EncryptionService.decryptSessionCookie(cookie);
      const session = await SessionRepository.findById(id);

      const isValid =
        session &&
        !session.is_expired &&
        session.expiresAt > new Date() &&
        (await PasswordService.compare(secret, session.secret_hash!));

      if (!isValid) {
        res.clearCookie("temp_session");
        req.session = undefined;
        return next();
      }

      req.session = session;
      next();
    } catch (error) {
      // malformed/tampered cookie — treat as no session, don't crash the request
      res.clearCookie("temp_session");
      req.session = undefined;
      next();
    }
  }
}
export default AuthMiddleware;
