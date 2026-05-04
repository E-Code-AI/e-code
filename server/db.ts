import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { databaseQueryOptimizer } from './services/database-query-optimizer';
import { normalizePostgresJsConnection } from './utils/postgres-js-url';
import { 
  databaseManager, 
  databaseContextMiddleware, 
  getDatabase, 
  getDatabaseClient,
  type DatabaseEnvironment 
} from './config/database';
import * as fs from 'fs';

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  try {
    const replitDbPath = '/tmp/replitdb';
    if (fs.existsSync(replitDbPath)) {
      const dbUrl = fs.readFileSync(replitDbPath, 'utf-8').trim();
      if (dbUrl) {
        console.log('[Database] Using DATABASE_URL from /tmp/replitdb (production mode)');
        return dbUrl;
      }
    }
  } catch (error) {
    console.warn('[Database] Could not read /tmp/replitdb:', error);
  }
  
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const DATABASE_URL = getDatabaseUrl();
const postgresJsConnection = normalizePostgresJsConnection(DATABASE_URL);

// Enhanced postgres client with enterprise-grade connection management
const baseClient = postgres(postgresJsConnection.connectionString, {
  ...postgresJsConnection.options,
  max: parseInt(process.env.DB_POOL_SIZE || (process.env.NODE_ENV === 'production' ? '25' : '10')),
  idle_timeout: 60, // Keep connections alive for 1 minute when idle
  max_lifetime: 60 * 60, // 1 hour connection lifetime to prevent stale connections
  connect_timeout: 10, // 10 second connection timeout
  // NOTE: prepare: false is REQUIRED for Neon serverless databases
  // This does NOT affect SQL injection protection - Drizzle ORM still uses 
  // parameterized queries. The 'prepare' option controls PostgreSQL's 
  // PREPARE/EXECUTE statement caching which is incompatible with Neon's
  // connection pooler (PgBouncer in transaction mode).
  // See: https://neon.tech/docs/connect/connection-pooling
  prepare: false,
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
});

// Database client with optional query monitoring
// Note: The full Proxy-based instrumentation is disabled because it breaks
// postgres-js method chaining (.unsafe().values()) needed by Drizzle ORM.
// Query monitoring is still available via databaseQueryOptimizer.withCache() for explicit use.
export const client = baseClient;

// Re-export optimizer for explicit slow query monitoring (doesn't break Drizzle)
export { databaseQueryOptimizer };

// Create drizzle database instance with our schema
export const db = drizzle(client, { schema });

// Export pool for direct SQL queries (used by database management service)
export const pool = client;

// Export dev/prod database separation utilities
export { 
  databaseManager, 
  databaseContextMiddleware, 
  getDatabase, 
  getDatabaseClient,
  type DatabaseEnvironment 
};

// Convenience functions for dev/prod database access
export const devDb = databaseManager.getDevDatabase();
export const devClient = databaseManager.getDevClient();

// Production database access (throws if DATABASE_URL_PROD not configured)
export function getProdDb(options?: { agentRequest?: boolean; userId?: number }) {
  return databaseManager.getProdDatabase(options);
}

export function getProdClient(options?: { agentRequest?: boolean; userId?: number }) {
  return databaseManager.getProdClient(options);
}

// Check if production database is available
export function isProdDbAvailable(): boolean {
  return databaseManager.isProdAvailable();
}

// Get connection stats for monitoring
export function getDbConnectionStats() {
  return databaseManager.getConnectionStats();
}

// Database connection retry logic for resilient startup
export async function connectWithRetry(maxRetries = 5, delay = 2000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await db.execute(sql`SELECT 1`);
      console.log('Database connected successfully');
      return;
    } catch (error) {
      console.error(`DB connection attempt ${attempt}/${maxRetries} failed:`, error instanceof Error ? error.message : error);
      if (attempt === maxRetries) {
        throw new Error('Failed to connect to database after maximum retries');
      }
      console.log(`Retrying in ${delay * attempt}ms...`);
      await new Promise(r => setTimeout(r, delay * attempt));
    }
  }
}

// Re-export transaction helpers for convenient access
export { withTransaction, withTransactionAndRetry, type TransactionClient } from './utils/db-transactions';
