import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../helper/apiError";

export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    return res.status(400).json(ApiError.validation(errors));
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(err);
  }

  console.error(err);

  return res.status(500).json(ApiError.internal());
};
