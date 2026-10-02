// MHI BizMate — Structured error types for consistent API responses.
export class ApiError extends Error {
  constructor(message, status = 400, code = null, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class AuthError extends ApiError {
  constructor(message = "Authentication required.") {
    super(message, 401, "AUTH_REQUIRED");
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = "Resource") {
    super(`${resource} not found.`, 404, "NOT_FOUND");
  }
}

export class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(message, 422, "VALIDATION_ERROR", details);
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Conflict.") {
    super(message, 409, "CONFLICT");
  }
}

export class HeartError extends ApiError {
  constructor(message, details = null) {
    super(message, 422, "HEART_REJECTED", details);
  }
}