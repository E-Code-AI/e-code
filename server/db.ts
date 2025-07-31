import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced postgres client with enterprise-grade connection management
export const client = postgres(process.env.DATABASE_URL, {
  max: 20, // Connection pool size optimized for concurrent users
  idle_timeout: 60, // Keep connections alive for 1 minute when idle
  max_lifetime: 60 * 60, // 1 hour connection lifetime to prevent stale connections
  connect_timeout: 10, // 10 second connection timeout
  prepare: false, // Disable prepared statements for better stability
  transform: {
    undefined: null, // Transform undefined to null for PostgreSQL compatibility
  },
  onnotice: () => {}, // Suppress PostgreSQL notices for cleaner logs
  debug: process.env.NODE_ENV === 'development', // Enable debug only in development
  // Enhanced connection recovery
  connection: {
    application_name: 'e-code-platform',
  },
  // Better error handling
  onclose: () => {
    // Removed verbose logging to improve performance
  },
  onconnect: () => {
    // Removed verbose logging to improve performance
  },
});

// Create drizzle database instance with our schema
export const db = drizzle(client, { schema });