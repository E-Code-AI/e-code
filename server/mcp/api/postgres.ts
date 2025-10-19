// @ts-nocheck
import { Router } from 'express';
import { ensureAuthenticated } from '../../middleware/auth';
import { DatabaseManagementService } from '../../services/database-management-service';
import { postgresMCP } from '../servers/postgres-mcp';

const router = Router();
const databaseService = new DatabaseManagementService();

const formatBytes = (bytes: number): string => {
  if (!bytes || Number.isNaN(bytes)) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
};

// Get database tables
router.get('/tables', ensureAuthenticated, async (req, res) => {
  try {
    const tables = await databaseService.getTables();

    res.json(
      tables.map((table) => ({
        name: table.tableName,
        schema: table.schema,
        rowCount: table.rowCount,
        sizeBytes: table.sizeInBytes,
        size: formatBytes(table.sizeInBytes),
        columnCount: table.columns.length,
        indexCount: (table.indexes ?? []).length,
    const schema = (req.query.schema as string) || 'public';
    const result = await postgresMCP.executeQuery(
      `
        SELECT
          schemaname,
          relname AS table_name,
          n_live_tup AS row_count,
          pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
          seq_scan,
          idx_scan
        FROM pg_stat_user_tables
        WHERE schemaname = $1
        ORDER BY relname
      `,
      [schema]
    );

    res.json(
      result.rows.map(row => ({
        name: row.table_name,
        schema: row.schemaname,
        rowCount: parseInt(row.row_count) || 0,
        size: row.total_size,
        sequentialScans: parseInt(row.seq_scan) || 0,
        indexScans: parseInt(row.idx_scan) || 0,
      }))
    );
  } catch (error: any) {
    console.error('PostgreSQL MCP tables error:', error);
    res.status(500).json({
      error: 'Failed to fetch tables',
      message: error.message,
      message: error.message
    });
  }
});

// Get table schema
router.get('/schema/:table', ensureAuthenticated, async (req, res) => {
  try {
    const { table } = req.params;
    const schemaName = (req.query.schema as string) || 'public';

    const schema = await databaseService.getTableSchema(table, schemaName);

    res.json(
      schema.map((column) => ({
        column: column.name,
        type: column.type,
        nullable: column.nullable,
        default: column.defaultValue,
        isPrimary: column.isPrimaryKey,
      }))
    );
    const schema = (req.query.schema as string) || 'public';

    const [columns, indexes, constraints] = await Promise.all([
      postgresMCP.getTableSchema(table, schema),
      postgresMCP.getTableIndexes(table, schema),
      postgresMCP.getTableConstraints(table, schema),
    ]);

    res.json({ columns, indexes, constraints });
  } catch (error: any) {
    console.error('PostgreSQL MCP schema error:', error);
    res.status(500).json({
      error: 'Failed to fetch table schema',
      message: error.message,
      message: error.message
    });
  }
});

// Execute query
router.post('/query', ensureAuthenticated, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query must be provided as a string',
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: 0,
      });
    }

    const result = await databaseService.executeQuery(query);

    if (result.error) {
      return res.status(400).json({
        error: result.error,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: result.executionTime,
      });
    }

    const columns = result.rows.length ? Object.keys(result.rows[0]) : [];
    const rows = result.rows.map((row: any) => columns.map((column) => row[column]));

    res.json({
      columns,
      rows,
      rowCount: result.rowCount,
      executionTime: result.executionTime,
    const { query, params } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    const lowered = query.trim().toLowerCase();
    const dangerous = ['drop', 'truncate', 'delete', 'alter', 'grant', 'revoke'];

    if (dangerous.some(keyword => lowered.startsWith(keyword))) {
      return res.status(400).json({ error: `Dangerous operation detected: ${query.split(' ')[0]}` });
    }

    const start = Date.now();
    const result = await postgresMCP.executeQuery(query, params || []);
    const executionTime = Date.now() - start;

    res.json({
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields,
      executionTime,
    });
  } catch (error: any) {
    console.error('PostgreSQL MCP query error:', error);
    res.status(500).json({
      error: 'Query execution failed',
      message: error.message,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime: 0,
      message: error.message
    });
  }
});

// Backup database
router.post('/backup', ensureAuthenticated, async (req, res) => {
  try {
    const { description } = req.body || {};
    const backup = await databaseService.createBackup(description);
    const tables = await databaseService.getTables();

    res.json({
      success: true,
      filename: `${backup.id}.sql`,
      sizeBytes: backup.size,
      size: formatBytes(backup.size),
      tables: tables.map((table) => table.tableName),
      timestamp: backup.timestamp.toISOString(),
    const [{ rows: sizeRows }, { rows: tableRows }] = await Promise.all([
      postgresMCP.executeQuery(`SELECT pg_size_pretty(pg_database_size(current_database())) AS size;`),
      postgresMCP.executeQuery(`
        SELECT relname AS table_name, pg_size_pretty(pg_total_relation_size(relid)) AS total_size
        FROM pg_stat_user_tables
        ORDER BY relname
      `),
    ]);

    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;

    res.json({
      success: true,
      filename,
      size: sizeRows[0]?.size || '0 bytes',
      tables: tableRows.map(row => ({
        name: row.table_name,
        size: row.total_size,
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('PostgreSQL MCP backup error:', error);
    res.status(500).json({
      error: 'Failed to create backup',
      message: error.message,
      message: error.message
    });
  }
});

export default router;