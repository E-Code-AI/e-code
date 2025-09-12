import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database? " +
    "For production, use Neon PostgreSQL. For development, see DATABASE_ARCHITECTURE_GUIDE.md"
  );
}

// Optimized postgres client configuration for Neon PostgreSQL
// This configuration is optimized for serverless PostgreSQL (Neon)
export const client = postgres(process.env.DATABASE_URL, {
  // Connection pool configuration for Neon
  max: process.env.NODE_ENV === 'production' ? 10 : 5, // Smaller pool for serverless
  idle_timeout: 60, // Keep connections alive for 1 minute when idle
  max_lifetime: 60 * 30, // 30 minutes connection lifetime for serverless
  connect_timeout: 10, // 10 second connection timeout
  prepare: false, // Disable prepared statements for better Neon compatibility
  
  // Data transformation for PostgreSQL compatibility
  transform: {
    undefined: null, // Transform undefined to null for PostgreSQL compatibility
  },
  
  // Logging configuration
  onnotice: () => {}, // Suppress PostgreSQL notices for cleaner logs
  debug: process.env.NODE_ENV === 'development' && process.env.DEBUG_SQL === 'true',
  
  // Connection metadata for Neon analytics
  connection: {
    application_name: 'e-code-platform',
    // Add additional connection parameters for Neon optimization
    ...(process.env.NODE_ENV === 'production' && {
      'idle_in_transaction_session_timeout': '300000', // 5 minutes
      'statement_timeout': '60000', // 1 minute
    }),
  },
  
  // Enhanced error handling for Neon
  onclose: (connection_id) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Database connection ${connection_id} closed`);
    }
  },
  
  // Retry configuration for Neon's serverless nature
  retry: {
    attempts: 3,
    delay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 5000), // Exponential backoff
  },
});

// Create drizzle database instance with our schema
export const db = drizzle(client, { schema });

// Export pool for direct SQL queries (used by database management service)
export const pool = client;

// Database health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Connection info for debugging
export function getDatabaseInfo() {
  const url = new URL(process.env.DATABASE_URL!);
  return {
    host: url.hostname,
    database: url.pathname.slice(1),
    ssl: url.searchParams.get('sslmode') || 'prefer',
    isNeon: url.hostname.includes('neon.tech'),
    poolSize: client.options.max,
  };
}