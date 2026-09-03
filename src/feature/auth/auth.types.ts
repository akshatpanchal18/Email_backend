import z from "zod";
import { loginUserSchema, createUserSchema } from "./auth.schema";
import { Mailbox, Session, User } from "../../generated/prisma/client";

export type CreateUserInput = z.infer<typeof createUserSchema>;

export type LoginUserInput = z.infer<typeof loginUserSchema>;
