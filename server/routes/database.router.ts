import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db, pool } from '../db';
import * as schema from '@shared/schema';
import { ensureAdmin } from '../middleware/admin-auth';
import { eq, sql } from 'drizzle-orm';

const databaseRouter = Router();

/**
 * Admin Database API Router
 * 
 * ⚠️ ADMIN-ONLY ACCESS - System-wide database inspector
 * 
 * Security: Admin-only, read-only operations, full database access
 * Use Case: Database administration, system monitoring, troubleshooting
 * 
 * Note: Regular users should use /api/projects/:projectId/data for project-scoped data
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

// Security: Strict table name validation to prevent SQL injection
// Only allows lowercase letters, numbers, and underscores, starting with letter or underscore
const SAFE_TABLE_NAME_REGEX = /^[a-z_][a-z0-9_]{0,62}$/i;

// Whitelist of allowed tables for data access
// Add new tables here when they are created in the schema
const ALLOWED_TABLES = new Set([
  'users', 'projects', 'files', 'deployments', 'subscriptions',
  'sessions', 'ai_agent_sessions', 'ai_agent_conversations', 'ai_agent_steps',
  'agent_plans', 'agent_step_cache', 'team_members', 'teams', 'invitations',
  'environment_variables', 'api_keys', 'invoices', 'payment_methods',
  'usage_records', 'audit_logs', 'build_logs', 'terminal_logs',
  'test_runs', 'test_cases', 'security_scans', 'vulnerabilities',
  'security_scan_settings', 'resource_metrics', 'pane_configurations',
  'lsp_diagnostics', 'collaboration_sessions', 'collaboration_cursors',
  'collaboration_selections', 'collaboration_changes'
]);

function isValidTableName(name: string): boolean {
  return SAFE_TABLE_NAME_REGEX.test(name) && !name.includes('--') && !name.includes(';');
}

function isAllowedTable(name: string): boolean {
  return ALLOWED_TABLES.has(name.toLowerCase());
}

// Security: Escape identifier for safe use in SQL (double quotes escape)
function escapeIdentifier(identifier: string): string {
  // Replace any double quotes with two double quotes (SQL standard escape)
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * GET /api/admin/database/tables
 * Liste toutes les tables disponibles avec leurs métadonnées
 * ⚠️ ADMIN-ONLY
 */
databaseRouter.get('/tables', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();

    // Query PostgreSQL system tables to get all user tables (no user input - safe)
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
          const tableName = table.table_name;
          
          // Security: Validate table name from database result
          if (!isValidTableName(tableName)) {
            console.warn(`[Database API] Skipping invalid table name: ${tableName}`);
            return { name: tableName, rowCount: 0, columns: [] };
          }
          
          // Use parameterized query for columns (information_schema is safe)
          const columnsResult = await pool`
            SELECT 
              column_name,
              data_type,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_name = ${tableName}
            ORDER BY ordinal_position
          `;

          // For COUNT query, we must use identifier - validated above
          const safeTableName = escapeIdentifier(tableName);
          const countResult = await pool.unsafe(`SELECT COUNT(*) as count FROM ${safeTableName}`);

          return {
            name: tableName,
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
 * GET /api/admin/database/table/:tableName/schema
 * Retourne le schéma détaillé d'une table
 * ⚠️ ADMIN-ONLY
 */
databaseRouter.get('/table/:tableName/schema', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;

    // Security: Validate table name to prevent SQL injection
    if (!isValidTableName(tableName)) {
      return res.status(400).json({ error: 'Invalid table name format' });
    }

    // Use parameterized queries for all user-provided values
    const columnsResult = await pool`
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
      WHERE c.table_name = ${tableName}
      ORDER BY c.ordinal_position
    `;

    const indexesResult = await pool`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = ${tableName}
    `;

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
 * POST /api/admin/database/query
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
databaseRouter.post('/query', ensureAdmin, async (req: Request, res: Response) => {
  return res.status(501).json({ 
    error: 'Custom SQL queries disabled for security',
    message: 'Use GET /api/database/table/:tableName/data for safe data access',
    documentation: 'https://docs.e-code.dev/api/database'
  });
});

/**
 * GET /api/admin/database/table/:tableName/data
 * Retourne les données d'une table avec pagination
 * ⚠️ ADMIN-ONLY
 * 
 * Security: Uses parameterized queries and validated identifiers
 */
databaseRouter.get('/table/:tableName/data', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 100), 1000);
    const offset = (page - 1) * limit;

    // Security: Strict table name validation
    if (!isValidTableName(tableName)) {
      return res.status(400).json({ error: 'Invalid table name format' });
    }

    // Security: Whitelist check - only allow access to known application tables
    if (!isAllowedTable(tableName)) {
      return res.status(403).json({ 
        error: 'Access to this table is not permitted',
        message: 'Table is not in the allowed whitelist'
      });
    }

    const startTime = Date.now();
    const safeTableName = escapeIdentifier(tableName);

    // Get total count - table name validated and escaped
    const countResult = await pool.unsafe(`SELECT COUNT(*) as total FROM ${safeTableName}`);
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Get first column name for ordering using parameterized query
    const firstColumnResult = await pool`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${tableName} 
      ORDER BY ordinal_position 
      LIMIT 1
    `;
    
    // Get paginated data with safe ordering
    // Note: LIMIT and OFFSET are integers, validated above
    let rows;
    if (firstColumnResult.length > 0) {
      const orderColumn = escapeIdentifier(firstColumnResult[0].column_name);
      rows = await pool.unsafe(
        `SELECT * FROM ${safeTableName} ORDER BY ${orderColumn} LIMIT ${limit} OFFSET ${offset}`
      );
    } else {
      // Fallback: no ordering if no columns found
      rows = await pool.unsafe(
        `SELECT * FROM ${safeTableName} LIMIT ${limit} OFFSET ${offset}`
      );
    }

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
 * GET /api/admin/database/stats
 * Retourne les statistiques globales de la base de données
 * ⚠️ ADMIN-ONLY
 * 
 * Security: No user input in these queries - all from system catalog
 */
databaseRouter.get('/stats', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();

    // Get database size (no user input - safe)
    const sizeResult = await pool.unsafe(`
      SELECT pg_database_size(current_database()) as size
    `);

    // Get table count (no user input - safe)
    const tableCountResult = await pool.unsafe(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    // Get total row count across all tables (no user input - safe)
    const tables = await pool.unsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    let totalRows = 0;
    for (const table of tables) {
      try {
        const tableName = table.table_name;
        // Security: Validate table names from database before using
        if (!isValidTableName(tableName)) {
          console.warn(`[Database API] Skipping invalid table name in stats: ${tableName}`);
          continue;
        }
        const safeTableName = escapeIdentifier(tableName);
        const result = await pool.unsafe(`SELECT COUNT(*) as count FROM ${safeTableName}`);
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
