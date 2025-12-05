import { Pool, PoolConfig, PoolClient, QueryResult } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema";

export type Database = NodePgDatabase<typeof schema>;

export interface DatabaseConfig extends PoolConfig {
  ssl?: boolean | Record<string, unknown>;
}

const {
  DB_HOST = "localhost",
  DB_PORT = "5432",
  DB_USER = "postgres",
  DB_PASSWORD = "",
  DB_NAME = "postgres",
  DB_SSL = "false",
  DB_MAX_POOL = "10",
  DB_IDLE_TIMEOUT_MS = "10000",
  DB_CONNECTION_TIMEOUT_MS = "10000",
} = process.env;

const sslEnabled = DB_SSL.toLowerCase() === "true";

const poolConfig: DatabaseConfig = {
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  max: Number(DB_MAX_POOL),
  idleTimeoutMillis: Number(DB_IDLE_TIMEOUT_MS),
  connectionTimeoutMillis: Number(DB_CONNECTION_TIMEOUT_MS),
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
};

const pool = new Pool(poolConfig);

pool.on("error", (err: Error) => {
  // In production, you might want to log this to a logging service
  console.error("Unexpected error on idle PostgreSQL client", err);
});

let dbInstance: Database | null = null;

export const getPool = (): Pool => pool;

export const getDb = (): Database => {
  if (!dbInstance) {
    dbInstance = drizzle(pool, { schema });
  }
  return dbInstance;
};

export const withTransaction = async <T>(
  fn: (tx: Database) => Promise<T>
): Promise<T> => {
  const client: PoolClient = await pool.connect();
  const txDb: Database = drizzle(client, { schema });

  try {
    await client.query("BEGIN");
    const result = await fn(txDb);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const query = async <T = unknown>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};

export const healthCheck = async (): Promise<boolean> => {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
};

export const closePool = async (): Promise<void> => {
  await pool.end();
};

export { schema };