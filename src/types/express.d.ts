import { Guest, Session, User } from "../generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
      guest?: Guest;
    }
  }
}

export {};
