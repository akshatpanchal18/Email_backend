import { Guest, Mailbox, Session, User } from "../generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
      mailbox?: Mailbox;
    }
  }
}

export {};
