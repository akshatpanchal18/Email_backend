export type ApiErrorItem = {
  field?: string;
  message: string;
  code?: string;
};

export class ApiError extends Error {
  status: number;
  statusCode: string;
  errors: ApiErrorItem[];

  constructor(
    status: number,
    statusCode: string,
    message: string,
    errors: ApiErrorItem[] = [],
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.statusCode = statusCode;
    this.errors = errors;

    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static validation(
    errors: ApiErrorItem[],
    statusCode = "VALIDATION_ERROR",
    message = "Validation failed",
  ) {
    return new ApiError(400, statusCode, message, errors);
  }

  static badRequest(message = "Bad request", statusCode = "BAD_REQUEST") {
    return new ApiError(400, statusCode, message);
  }

  static unauthorized(message = "Unauthorized", statusCode = "UNAUTHORIZED") {
    return new ApiError(401, statusCode, message);
  }

  static forbidden(message = "Forbidden", statusCode = "FORBIDDEN") {
    return new ApiError(403, statusCode, message);
  }

  static notFound(message = "Resource not found", statusCode = "NOT_FOUND") {
    return new ApiError(404, statusCode, message);
  }

  static conflict(
    message = "Resource already exists",
    statusCode = "CONFLICT",
  ) {
    return new ApiError(409, statusCode, message);
  }

  static internal(
    message = "Internal Server Error",
    statusCode = "INTERNAL_SERVER_ERROR",
  ) {
    return new ApiError(500, statusCode, message);
  }

  toJSON() {
    return {
      success: false,
      status: this.status,
      statusCode: this.statusCode,
      message: this.message,
      errors: this.errors,
    };
  }
}
