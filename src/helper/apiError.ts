// export class ApiError extends Error {
//   statusCode: number;
//   errors: unknown[];

//   constructor(
//     statusCode = 500,
//     message = "Internal Server Error",
//     errors: unknown[] = [],
//   ) {
//     super(message);

//     this.statusCode = statusCode;
//     this.errors = errors;

//     Object.setPrototypeOf(this, ApiError.prototype);
//     Error.captureStackTrace(this, this.constructor);
//   }

//   toJSON() {
//     return {
//       statusCode: this.statusCode,
//       message: this.message,
//       errors: this.errors,
//     };
//   }
// }
export type ApiErrorItem = {
  field?: string;
  message: string;
  code?: string;
};

export class ApiError extends Error {
  statusCode: number;
  errors: ApiErrorItem[];

  constructor(
    statusCode: number,
    message: string,
    errors: ApiErrorItem[] = [],
  ) {
    super(message);

    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;

    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static validation(errors: ApiErrorItem[]) {
    return new ApiError(400, "Validation failed", errors);
  }

  static badRequest(message = "Bad request") {
    return new ApiError(400, message);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Resource already exists") {
    return new ApiError(409, message);
  }

  static internal(message = "Internal Server Error") {
    return new ApiError(500, message);
  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      message: this.message,
      errors: this.errors,
    };
  }
}
