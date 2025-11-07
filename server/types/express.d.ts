/**
 * Type augmentation for Express Request
 * Adds proper typing for req.user after Passport authentication
 * User ID is a UUID string from the database schema
 */

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string | null;
      email: string | null;
      isAdmin: boolean | null;
    }
  }
}

export {};
