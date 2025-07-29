import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create postgres client with better connection management
export const client = postgres(process.env.DATABASE_URL, {
  max: 20, // Increase connection pool size
  idle_timeout: 60, // Increase idle timeout
  max_lifetime: 60 * 60, // 1 hour connection lifetime
  connect_timeout: 10, // 10 second connection timeout
  prepare: false, // Disable prepared statements for better stability
  transform: {
    undefined: null, // Transform undefined to null for PostgreSQL
  },
  onnotice: () => {}, // Suppress notices
  debug: false, // Disable debug logging
});

// Create drizzle database instance with our schema
export const db = drizzle(client, { schema });