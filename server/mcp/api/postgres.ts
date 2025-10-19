// @ts-nocheck
import { Router } from 'express';
import { ensureAuthenticated } from '../../middleware/auth';
import { DatabaseManagementService } from '../../services/database-management-service';

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
      }))
    );
  } catch (error: any) {
    console.error('PostgreSQL MCP tables error:', error);
    res.status(500).json({
      error: 'Failed to fetch tables',
      message: error.message,
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
  } catch (error: any) {
    console.error('PostgreSQL MCP schema error:', error);
    res.status(500).json({
      error: 'Failed to fetch table schema',
      message: error.message,
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
    });
  } catch (error: any) {
    console.error('PostgreSQL MCP backup error:', error);
    res.status(500).json({
      error: 'Failed to create backup',
      message: error.message,
    });
  }
});

export default router;