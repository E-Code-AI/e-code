import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AnyZodObject, ZodError, ZodSchema } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

export interface ValidationSchemas {
  body?: AnyZodObject | ZodSchema<unknown>;
  query?: AnyZodObject | ZodSchema<unknown>;
  params?: AnyZodObject | ZodSchema<unknown>;
}

interface ValidationErrorDetail {
  path: string;
  message: string;
}

interface ValidationErrorResponse {
  error: string;
  details: ValidationErrorDetail[];
}

const formatZodError = (error: ZodError): ValidationErrorDetail[] => {
  return error.errors.map((issue) => ({
    path: issue.path.join('.') || '',
    message: issue.message,
  }));
};

const validateTarget =
  (schema: AnyZodObject | ZodSchema<unknown>, target: ValidationTarget): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[target];
      const parsed = schema.parse(data);

      // Assign parsed data back to request to ensure correct types and defaults
      (req as any)[target] = parsed;

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const response: ValidationErrorResponse = {
          error: `Invalid request undefined`,
          details: formatZodError(err),
        };
        res.status(400).json(response);
        return;
      }

      next(err);
    }
  };

export const validate =
  (schemas: ValidationSchemas): RequestHandler[] =>
  [
    ...(schemas.params ? [validateTarget(schemas.params, 'params')] : []),
    ...(schemas.query ? [validateTarget(schemas.query, 'query')] : []),
    ...(schemas.body ? [validateTarget(schemas.body, 'body')] : []),
  ];

export const validateBody = (schema: AnyZodObject | ZodSchema<unknown>): RequestHandler =>
  validateTarget(schema, 'body');

export const validateQuery = (schema: AnyZodObject | ZodSchema<unknown>): RequestHandler =>
  validateTarget(schema, 'query');

export const validateParams = (schema: AnyZodObject | ZodSchema<unknown>): RequestHandler =>
  validateTarget(schema, 'params');