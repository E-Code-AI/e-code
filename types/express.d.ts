/**
 * Type definitions for Express and related modules
 * This ensures proper type checking across the application
 */

import '@shared/schema';

declare global {
  namespace Express {
    /**
     * Extend Express.User to use our User type from shared schema
     * This ensures type safety across authentication and route handlers
     */
    interface User extends import('@shared/schema').User {}
    
    /**
     * Extend Express.Request to include additional properties
     */
    interface Request {
      /**
       * User object attached by authentication middleware
       */
      user?: User;
      
      /**
       * Session ID for tracking
       */
      sessionID?: string;
      
      /**
       * CSP nonce for inline scripts/styles
       */
      cspNonce?: string;
    }
  }
  
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      DATABASE_URL: string;
      JWT_SECRET: string;
      JWT_REFRESH_SECRET: string;
      SESSION_SECRET: string;
      ANTHROPIC_API_KEY?: string;
      OPENAI_API_KEY?: string;
      APP_URL?: string;
      FRONTEND_URL?: string;
      ALLOWED_ORIGINS?: string;
      FIREBASE_SERVICE_ACCOUNT_JSON?: string;
      ZOOM_CLIENT_ID?: string;
      ZOOM_CLIENT_SECRET?: string;
      ZOOM_ACCOUNT_ID?: string;
      SENDGRID_API_KEY?: string;
    }
  }
}

/**
 * Extend Express Response to include CSP nonce
 */
declare module 'express-serve-static-core' {
  interface Response {
    locals: {
      cspNonce?: string;
      user?: Express.User;
      [key: string]: any;
    };
  }
}

export {};
