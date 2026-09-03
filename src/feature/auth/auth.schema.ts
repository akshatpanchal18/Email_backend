import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().trim().email("Invalid email address"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must not exceed 72 characters"),
});

export const loginUserSchema = z.object({
  email: z.string().trim().email("Invalid email address"),

  password: z.string().min(1, "Password is required"),
});
