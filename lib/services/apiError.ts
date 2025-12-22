/**
 * API Error Utility
 *
 * Custom error class for consistent error handling across all API service functions.
 * Provides structured error information including HTTP status codes and error messages.
 *
 * Usage:
 * ```typescript
 * if (!response.ok) {
 *   throw new ApiError(response.statusText, response.status);
 * }
 * ```
 *
 * This error can be caught in React Query hooks and mutations for proper error handling.
 */

/**
 * Custom API Error class that extends the native Error class.
 * Includes HTTP status code for better error handling and user feedback.
 */
export class ApiError extends Error {
  /**
   * HTTP status code (e.g., 400, 401, 404, 500)
   */
  status: number;

  /**
   * Creates a new ApiError instance.
   *
   * @param message - Error message describing what went wrong
   * @param status - HTTP status code (default: 500 for server errors)
   */
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Returns a user-friendly error message based on the status code.
   * Useful for displaying error messages to users in the UI.
   *
   * @returns A user-friendly error message
   */
  getUserMessage(): string {
    switch (this.status) {
      case 400:
        return "Invalid request. Please check your input and try again.";
      case 401:
        return "You are not authorized to perform this action. Please sign in.";
      case 403:
        return "You don't have permission to access this resource.";
      case 404:
        return "The requested resource was not found.";
      case 409:
        return "This resource already exists or conflicts with existing data.";
      case 422:
        return "The request was well-formed but contains validation errors.";
      case 429:
        return "Too many requests. Please wait a moment and try again.";
      case 500:
        return "An internal server error occurred. Please try again later.";
      case 502:
        return "Bad gateway. The server received an invalid response.";
      case 503:
        return "Service unavailable. The server is temporarily unavailable.";
      default:
        return this.message || "An unexpected error occurred.";
    }
  }

  /**
   * Checks if the error is a client error (4xx status codes).
   *
   * @returns true if status code is between 400-499
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Checks if the error is a server error (5xx status codes).
   *
   * @returns true if status code is between 500-599
   */
  isServerError(): boolean {
    return this.status >= 500 && this.status < 600;
  }
}
