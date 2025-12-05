import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger";

export interface AppErrorOptions {
  statusCode?: number;
  code?: string;
  details?: unknown;
  isOperational?: boolean;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "INTERNAL_SERVER_ERROR";
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  statusCode: number;
  details?: unknown;
  stack?: string;
}

const isProd = process.env.NODE_ENV === "production";

const formatZodError = (error: ZodError): unknown => {
  return error.errors.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
};

const buildErrorResponse = (err: unknown): ErrorResponse => {
  if (err instanceof AppError) {
    return {
      success: false,
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      ...(err.details && { details: err.details }),
      ...(!isProd && err.stack && { stack: err.stack }),
    };
  }

  if (err instanceof ZodError) {
    return {
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      statusCode: 400,
      details: formatZodError(err),
      ...(!isProd && { stack: err.stack }),
    };
  }

  if (err instanceof SyntaxError && "body" in (err as any)) {
    return {
      success: false,
      message: "Invalid JSON payload",
      code: "INVALID_JSON",
      statusCode: 400,
      ...(!isProd && { stack: (err as Error).stack }),
    };
  }

  const unknownError = err as Error | undefined;

  return {
    success: false,
    message: isProd ? "Something went wrong" : unknownError?.message || "Unknown error",
    code: "INTERNAL_SERVER_ERROR",
    statusCode: 500,
    ...(!isProd && unknownError?.stack && { stack: unknownError.stack }),
  };
};

const logError = (err: unknown, req: Request): void => {
  const baseMeta = {
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    requestId: (req as any).requestId,
  };

  if (err instanceof AppError) {
    const level = err.statusCode >= 500 ? "error" : "warn";
    logger[level](
      err.message,
      {
        ...baseMeta,
        code: err.code,
        statusCode: err.statusCode,
        details: err.details,
        stack: err.stack,
        isOperational: err.isOperational,
      }
    );
    return;
  }

  if (err instanceof ZodError) {
    logger.warn("Validation error", {
      ...baseMeta,
      code: "VALIDATION_ERROR",
      details: formatZodError(err),
      stack: err.stack,
    });
    return;
  }

  const unknownError = err as Error | undefined;

  logger.error(unknownError?.message || "Unhandled error", {
    ...baseMeta,
    code: "INTERNAL_SERVER_ERROR",
    stack: unknownError?.stack,
  });
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  logError(err, req);

  const errorResponse = buildErrorResponse(err);

  if (res.headersSent) {
    return;
  }

  res.status(errorResponse.statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const error = new AppError("Resource not found", {
    statusCode: 404,
    code: "NOT_FOUND",
  });

  logError(error, req);

  const response: ErrorResponse = {
    success: false,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    ...(!isProd && error.stack && { stack: error.stack }),
  };

  res.status(404).json(response);
};