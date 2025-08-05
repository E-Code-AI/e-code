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

const logger = createLogger('test-database');

export class TestDatabase {
  private pool: Pool;
  private db: ReturnType<typeof drizzle>;

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
      
      // Run migrations
      await migrate(this.db, { migrationsFolder: './drizzle' });
      
      // Seed test data
      await this.seedTestData();
      
      logger.info('Test database setup complete');
    } catch (error) {
      logger.error('Failed to setup test database:', error);
      throw error;
    }
  }

  async teardown() {
    try {
      logger.info('Tearing down test database...');
      
      // Clear all tables
      await this.clearAllTables();
      
      // Close connections
      await this.pool.end();
      
      logger.info('Test database teardown complete');
    } catch (error) {
      logger.error('Failed to teardown test database:', error);
      throw error;
    }
  }

  async clearAllTables() {
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