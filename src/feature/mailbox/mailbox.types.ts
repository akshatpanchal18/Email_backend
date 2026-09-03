import z from "zod";
import { createMailboxSchema } from "./mailbox.schema";

export type CreateMailboxInput = z.infer<typeof createMailboxSchema>;
