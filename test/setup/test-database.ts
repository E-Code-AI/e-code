/**
 * Test Database Setup
 * Handles test database lifecycle
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from '@shared/schema';
import { testConfig } from './test-config';
import { createLogger } from '../../server/utils/logger';
import fs from 'fs';
import path from 'path';

const logger = createLogger('test-database');

export class TestDatabase {
  private pool: Pool;
  private db: ReturnType<typeof drizzle>;
  private isAvailable = false;

  constructor() {
    this.pool = new Pool({
      connectionString: testConfig.database.url,
      max: testConfig.database.poolSize
    });
    
    this.db = drizzle(this.pool, { schema });
  }

  async setup() {
    try {
      logger.info('Setting up test database...');

      const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
      const journalPath = path.join(migrationsFolder, 'meta/_journal.json');

      if (!fs.existsSync(migrationsFolder) || !fs.existsSync(journalPath)) {
        logger.warn('Drizzle migrations not found. Skipping database setup for tests.');
        return;
      }

      // Run migrations
      await migrate(this.db, { migrationsFolder });

      this.isAvailable = true;

      // Seed test data
      await this.seedTestData();

      logger.info('Test database setup complete');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to setup test database. Continuing with in-memory mocks. Reason: ${message}`);
    }
  }

  async teardown() {
    try {
      logger.info('Tearing down test database...');

      if (this.isAvailable) {
        // Clear all tables
        await this.clearAllTables();
      }

      // Close connections
      await this.pool.end();

      logger.info('Test database teardown complete');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to teardown test database cleanly. Reason: ${message}`);
    }
  }

  async clearAllTables() {
    if (!this.isAvailable) {
      return;
    }

    const tables = Object.keys(schema);

    for (const table of tables) {
      try {
        await this.pool.query(`TRUNCATE TABLE ${table} CASCADE`);
      } catch (error) {
        // Table might not exist
      }
    }
  }

  async seedTestData() {
    if (!this.isAvailable) {
      return;
    }

    // Create test users
    const testUsers = [
      {
        username: 'testuser1',
        email: 'test1@example.com',
        password: 'hashedpassword',
        emailVerified: true
      },
      {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'hashedpassword',
        emailVerified: true
      }
    ];

    // Insert test data using Drizzle
    for (const user of testUsers) {
      await this.db.insert(schema.users).values(user).onConflictDoNothing();
    }
  }

  getDb() {
    return this.db;
  }

  getPool() {
    return this.pool;
  }
}

// Global test database instance
export const testDb = new TestDatabase();