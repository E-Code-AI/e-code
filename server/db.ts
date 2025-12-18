import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { databaseQueryOptimizer } from './services/database-query-optimizer';
import { 
  databaseManager, 
  databaseContextMiddleware, 
  getDatabase, 
  getDatabaseClient,
  type DatabaseEnvironment 
} from './config/database';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced postgres client with enterprise-grade connection management
const baseClient = postgres(process.env.DATABASE_URL, {
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
});

// FIXED: Bypassing databaseQueryOptimizer to prevent breaking postgres-js methods
// The optimizer's Proxy breaks .unsafe().values() chain needed by Drizzle
export const client = baseClient; // databaseQueryOptimizer.instrument(baseClient);

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
export async function connectWithRetry(maxRetries = 5, delay = 2000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await db.execute(sql`SELECT 1`);
      console.log('Database connected successfully');
      return true;
    } catch (error: any) {
      console.error(`DB connection attempt ${attempt}/${maxRetries} failed`);
      if (attempt === maxRetries) return false;
      await new Promise(r => setTimeout(r, delay * attempt));
    }
  }
  return false;
}

// Initialize database connection with retry on module load
connectWithRetry().then(connected => {
  if (!connected) {
    console.error('Failed to connect to database after all retries');
  }
}).catch(err => {
  console.error('Database initialization error:', err.message);
});