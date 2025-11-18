import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db, pool } from '../db';
import * as schema from '@shared/schema';
import { ensureAuthenticated } from '../middleware/auth';
import { eq, sql } from 'drizzle-orm';

const databaseRouter = Router();

/**
 * Database API Router
 * Fortune 500 production-ready endpoints for database inspection and queries
 * 
 * Security: Read-only operations, authenticated users, project-scoped
 */

interface TableInfo {
  name: string;
  rowCount: number;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: string;
  }>;
}

interface QueryResult {
  rows: any[];
  rowCount: number;
  executionTime: number;
  fields: Array<{
    name: string;
    dataTypeID: number;
  }>;
}

/**
 * GET /api/database/:projectId/tables
 * Liste toutes les tables disponibles avec leurs métadonnées
 */
databaseRouter.get('/tables/:projectId', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const startTime = Date.now();

    // Query PostgreSQL system tables to get all user tables
    const result = await pool.unsafe(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    // Get row counts for each table (expensive but necessary for UI)
    const tables: TableInfo[] = await Promise.all(
      result.map(async (table: any) => {
        try {
          const countResult = await pool.unsafe(`
            SELECT COUNT(*) as count FROM "${table.table_name}"
          `);
          
          const columnsResult = await pool.unsafe(`
            SELECT 
              column_name,
              data_type,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_name = '${table.table_name}'
            ORDER BY ordinal_position
          `);

          return {
            name: table.table_name,
            rowCount: parseInt(countResult[0]?.count || '0', 10),
            columns: columnsResult.map((col: any) => ({
              name: col.column_name,
              type: col.data_type,
              nullable: col.is_nullable === 'YES',
              defaultValue: col.column_default
            }))
          };
        } catch (error) {
          console.error(`[Database API] Error getting table info for ${table.table_name}:`, error);
          return {
            name: table.table_name,
            rowCount: 0,
            columns: []
          };
        }
      })
    );

    const executionTime = Date.now() - startTime;

    return res.json({
      tables,
      executionTime,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Database API] List tables error:', error);
    return res.status(500).json({ error: error.message || 'Failed to list tables' });
  }
});

/**
 * GET /api/database/:projectId/table/:tableName/schema
 * Retourne le schéma détaillé d'une table
 */
databaseRouter.get('/table/:projectId/:tableName/schema', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId, tableName } = req.params;

    // Security: Validate table name to prevent SQL injection
    if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) {
      return res.status(400).json({ error: 'Invalid table name format' });
    }

    const columnsResult = await pool.unsafe(`
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        tc.constraint_type,
        kcu.constraint_name
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu 
        ON c.table_name = kcu.table_name 
        AND c.column_name = kcu.column_name
      LEFT JOIN information_schema.table_constraints tc 
        ON kcu.constraint_name = tc.constraint_name
      WHERE c.table_name = '${tableName}'
      ORDER BY c.ordinal_position
    `);

    const indexesResult = await pool.unsafe(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = '${tableName}'
    `);

    return res.json({
      tableName,
      columns: columnsResult.map((col: any) => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        defaultValue: col.column_default,
        maxLength: col.character_maximum_length,
        constraint: col.constraint_type,
        isPrimaryKey: col.constraint_type === 'PRIMARY KEY',
        isForeignKey: col.constraint_type === 'FOREIGN KEY',
        isUnique: col.constraint_type === 'UNIQUE'
      })),
      indexes: indexesResult.map((idx: any) => ({
        name: idx.indexname,
        definition: idx.indexdef
      }))
    });
  } catch (error: any) {
    console.error('[Database API] Get table schema error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get table schema' });
  }
});

/**
 * POST /api/database/:projectId/query
 * ⚠️ DISABLED FOR SECURITY
 * 
 * Reason: User-supplied SQL queries cannot be safely executed without proper
 * SQL parser/sanitizer. Substring checks are insufficient and bypassable.
 * Example bypass: SELECT data; DROP TABLE users with comment delimiters.
 * 
 * Fortune 500 Security Requirements:
 * - No user-supplied raw SQL execution
 * - Use predefined safe operations only (GET /table/:name/data)
 * 
 * Future: Implement with:
 * - Proper SQL parser (e.g. pgsql-parser)
 * - Read-only database connection
 * - Project-scoped access control
 */
databaseRouter.post('/query/:projectId', ensureAuthenticated, async (req: Request, res: Response) => {
  return res.status(501).json({ 
    error: 'Custom SQL queries disabled for security',
    message: 'Use GET /api/database/table/:tableName/data for safe data access',
    documentation: 'https://docs.e-code.dev/api/database'
  });
});

/**
 * GET /api/database/:projectId/table/:tableName/data
 * Retourne les données d'une table avec pagination
 */
databaseRouter.get('/table/:projectId/:tableName/data', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId, tableName } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = (page - 1) * limit;

    // Security: Validate table name
    if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) {
      return res.status(400).json({ error: 'Invalid table name format' });
    }

    const startTime = Date.now();

    // Get total count
    const countResult = await pool.unsafe(`
      SELECT COUNT(*) as total FROM "${tableName}"
    `);
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Get paginated data
    const rows = await pool.unsafe(`
      SELECT * FROM "${tableName}"
      ORDER BY (SELECT column_name FROM information_schema.columns 
                WHERE table_name = '${tableName}' 
                LIMIT 1) 
      LIMIT ${limit} OFFSET ${offset}
    `);

    const executionTime = Date.now() - startTime;

    return res.json({
      tableName,
      rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: offset + limit < total,
        hasPrevPage: page > 1
      },
      executionTime
    });
  } catch (error: any) {
    console.error('[Database API] Get table data error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get table data' });
  }
});

/**
 * GET /api/database/:projectId/stats
 * Retourne les statistiques globales de la base de données
 */
databaseRouter.get('/stats/:projectId', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const startTime = Date.now();

    // Get database size
    const sizeResult = await pool.unsafe(`
      SELECT pg_database_size(current_database()) as size
    `);

    // Get table count
    const tableCountResult = await pool.unsafe(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    // Get total row count across all tables
    const tables = await pool.unsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    let totalRows = 0;
    for (const table of tables) {
      try {
        const result = await pool.unsafe(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
        totalRows += parseInt(result[0]?.count || '0', 10);
      } catch (error) {
        console.error(`Error counting rows in ${table.table_name}:`, error);
      }
    }

    const executionTime = Date.now() - startTime;

    return res.json({
      databaseSize: parseInt(sizeResult[0]?.size || '0', 10),
      tableCount: parseInt(tableCountResult[0]?.count || '0', 10),
      totalRows,
      executionTime,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Database API] Get stats error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get database stats' });
  }
});

export default databaseRouter;
