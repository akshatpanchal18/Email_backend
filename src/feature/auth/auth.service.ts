import logger from "../../config/pino";
import { Mailbox, Session, User } from "../../generated/prisma/client";
import { ApiError } from "../../helper/apiError";
import SessionRepository from "../../repository/session";
import UserRepository from "../../repository/user";
import EncryptionService from "../../service/encryption";
import PasswordService from "../../service/password";
import { CreateUserInput, LoginUserInput } from "./auth.types";

export const STATUS = { USER: "user", GUEST: "guest" };
class AuthService {
  static async createUser(data: CreateUserInput) {
    const { email, password } = data;
    const find_user = await UserRepository.findByEmail(email);
    if (find_user) {
      throw ApiError.badRequest("user already exist");
    }
    const password_hash = await PasswordService.hash(password);
    const create_user = await UserRepository.create({ email, password_hash });
    const token = await EncryptionService.generateAccessToken(create_user.id);
    const secret = await EncryptionService.generateSecret();
    const secret_hash = await PasswordService.hash(secret);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const create_session = await SessionRepository.create({
      secret_hash,
      expiresAt,
      user: {
        connect: {
          id: create_user.id,
        },
      },
    });
    const cookie = EncryptionService.generateSessionCookie(
      "u",
      create_session.id,
      secret,
    );
    return { token, cookie, type: STATUS.USER };
  }
  static async loginUser(data: LoginUserInput) {
    const { email, password } = data;
    const find_user = await UserRepository.findByEmail(email);
    if (!find_user) {
      throw ApiError.notFound("user not found");
    }
    const is_password_valid = await PasswordService.compare(
      password,
      find_user.password_hash,
    );
    if (!is_password_valid) throw ApiError.unauthorized("invalid credentials");
    const token = await EncryptionService.generateAccessToken(find_user.id);
    const secret = await EncryptionService.generateSecret();
    const secret_hash = await PasswordService.hash(secret);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); //30 days
    const delete_old_session = await SessionRepository.deleteByUserId(
      find_user.id,
    );
    const create_session = await SessionRepository.create({
      secret_hash,
      expiresAt,
      user: {
        connect: {
          id: find_user.id,
        },
      },
    });
    const cookie = EncryptionService.generateSessionCookie(
      "u",
      create_session.id,
      secret,
    );
    return { token, cookie, type: STATUS.USER };
  }
  static async logoutUser(session: Session) {
    const { id } = session;
    await SessionRepository.deleteById(id);
    return { deleted: true };
  }
  static async restoreSession(session: Session) {
    // logger.info({ session });
    const { user_id } = session;
    if (session) {
      const token = await EncryptionService.generateAccessToken(user_id);
      return {
        type: STATUS.USER,
        token,
      };
    }
    throw ApiError.unauthorized("invalid session");
  }
}
export default AuthService;
