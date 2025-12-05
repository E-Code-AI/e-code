import { User } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user attached by authentication middleware.
       * Will be undefined if the request is not authenticated.
       */
      user?: User | null;

      /**
       * Unique correlation ID for tracing requests across services.
       */
      correlationId?: string;

      /**
       * Optional request ID, may be the same as correlationId or distinct
       * depending on your logging/tracing strategy.
       */
      requestId?: string;

      /**
       * Optional tenant identifier for multi-tenant applications.
       */
      tenantId?: string;

      /**
       * Arbitrary context object for passing request-scoped data
       * through middleware and handlers.
       */
      context?: {
        [key: string]: unknown;
      };
    }
  }
}

export {};