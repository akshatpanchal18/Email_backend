import { Guest, Mailbox, Session, User } from "../generated/prisma/client";
import { RequestMeta } from "../middleware/request-meta";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
      mailbox?: Mailbox;
      meta: RequestMeta;
    }
  }
}

export {};
