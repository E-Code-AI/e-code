import { Response } from "express";

export type SuccessStatus = 200 | 201 | 202 | 204;
export type ErrorStatus =
  | 400
  | 401
  | 403
  | 404
  | 409
  | 422
  | 429
  | 500
  | 502
  | 503;

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: ApiMeta;
}

export interface ApiErrorDetails {
  field?: string;
  code?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetails[] | Record<string, unknown>;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface SendSuccessOptions<T = unknown> {
  res: Response;
  data?: T;
  message?: string;
  statusCode?: SuccessStatus;
  meta?: ApiMeta;
}

export interface SendErrorOptions {
  res: Response;
  statusCode?: ErrorStatus;
  code?: string;
  message?: string;
  details?: ApiErrorDetails[] | Record<string, unknown>;
  error?: unknown;
  log?: boolean;
}

const DEFAULT_ERROR_MESSAGES: Record<ErrorStatus, string> = {
  400: "Bad request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Resource not found",
  409: "Conflict",
  422: "Unprocessable entity",
  429: "Too many requests",
  500: "Internal server error",
  502: "Bad gateway",
  503: "Service unavailable",
};

const DEFAULT_ERROR_CODES: Record<ErrorStatus, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
  502: "BAD_GATEWAY",
  503: "SERVICE_UNAVAILABLE",
};

export function buildSuccessResponse<T = unknown>(
  data: T,
  message?: string,
  meta?: ApiMeta
): ApiSuccessResponse<T> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  if (meta && Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  return response;
}

export function buildErrorResponse(
  statusCode: ErrorStatus,
  message?: string,
  code?: string,
  details?: ApiErrorDetails[] | Record<string, unknown>
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code: code || DEFAULT_ERROR_CODES[statusCode] || "ERROR",
      message: message || DEFAULT_ERROR_MESSAGES[statusCode] || "Error",
      ...(details ? { details } : {}),
    },
  };
}

export function sendSuccess<T = unknown>({
  res,
  data,
  message,
  statusCode = 200,
  meta,
}: SendSuccessOptions<T>): Response<ApiSuccessResponse<T>> {
  const payload = buildSuccessResponse<T>(
    (data ?? null) as T,
    message,
    meta
  );
  return res.status(statusCode).json(payload);
}

export function sendCreated<T = unknown>({
  res,
  data,
  message,
  meta,
}: Omit<SendSuccessOptions<T>, "statusCode">): Response<ApiSuccessResponse<T>> {
  return sendSuccess<T>({ res, data, message, meta, statusCode: 201 });
}

export function sendNoContent(res: Response): Response<void> {
  return res.status(204).send();
}

export function sendError({
  res,
  statusCode = 500,
  code,
  message,
  details,
  error,
  log = true,
}: SendErrorOptions): Response<ApiErrorResponse> {
  if (log && error) {
    // eslint-disable-next-line no-console
    console.error(
      "[API_ERROR]",
      JSON.stringify(
        {
          statusCode,
          code: code || DEFAULT_ERROR_CODES[statusCode],
          message: message || DEFAULT_ERROR_MESSAGES[statusCode],
          details,
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : error,
        },
        null,
        2
      )
    );
  }

  const payload = buildErrorResponse(
    statusCode,
    message,
    code,
    details
  );

  return res.status(statusCode).json(payload);
}

export function sendBadRequest(
  res: Response,
  message?: string,
  details?: ApiErrorDetails[] | Record<string, unknown>
): Response<ApiErrorResponse> {
  return sendError({
    res,
    statusCode: 400,
    message,
    details,
  });
}

export function sendUnauthorized(
  res: Response,
  message?: string,
  details?: ApiErrorDetails[] | Record<string, unknown>
): Response<ApiErrorResponse> {
  return sendError({
    res,
    statusCode: 401,
    message,
    details,
  });
}

export function sendForbidden(
  res: Response,
  message?: string,
  details?: ApiErrorDetails[] | Record<string, unknown>
): Response<ApiErrorResponse> {
  return sendError({
    res,
    statusCode: 403,
    message,
    details,
  });
}

export function sendNotFound(
  res: Response,
  message?: string,
  details?: ApiErrorDetails[] | Record<string, unknown>
): Response<ApiErrorResponse> {
  return sendError({
    res,
    statusCode: 404,
    message,
    details,
  });
}

export function sendConflict(
  res: Response,
  message?: string,
  details?: ApiErrorDetails[] | Record<string, unknown>
): Response<ApiErrorResponse> {
  return sendError({
    res,
    statusCode: 409,
    message,
    details,
  });
}

export function sendUnprocessableEntity(
  res: Response,
  message?: string,
  details?: ApiErrorDetails[] | Record<string, unknown>
): Response<ApiErrorResponse> {
  return sendError({
    res,
    statusCode: 422,
    message,
    details,
  });
}

export function sendTooManyRequests(
  res: Response,
  message?: string,
  details?: ApiErrorDetails[] | Record<string, unknown>
): Response<ApiErrorResponse> {
  return sendError({
    res,
    statusCode: 429,
    message,
    details,
  });
}

export function sendServerError(
  res: Response,
  error?: unknown,
  message?: string,
  details?: ApiErrorDetails[] | Record<string, unknown>
): Response<ApiErrorResponse> {
  return sendError({
    res,
    statusCode: 500,
    message,
    details,
    error,
  });
}

export function isSuccessResponse<T = unknown>(
  payload: ApiResponse<T>
): payload is ApiSuccessResponse<T> {
  return payload.success === true;
}

export function isErrorResponse(
  payload: ApiResponse<unknown>
): payload is ApiErrorResponse {
  return payload.success === false;
}