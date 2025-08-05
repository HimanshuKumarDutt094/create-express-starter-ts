import { Response } from "express";

export interface ApiErrorPayload {
  message: string;
  code: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
}

export function sendSuccess<T>(
  res: Response<ApiResponse<T>>,
  data: T,
  statusCode = 200
) {
  return res.status(statusCode).json({ success: true, data });
}

export function sendError(
  res: Response<ApiResponse<never>>,
  message: string,
  code = "INTERNAL_ERROR",
  statusCode = 500,
  details?: unknown
) {
  const errorPayload: ApiErrorPayload = { message, code };
  if (details && typeof details === "object") {
    errorPayload.details = details;
  }
  return res.status(statusCode).json({ success: false, error: errorPayload });
}
