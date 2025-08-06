import { Router } from 'express';
import { ensureAuthenticated } from '../../middleware/auth';
import { PostgreSQLMCP } from '../servers/postgres-mcp';
import { db } from '../../db';

const router = Router();
const postgresMCP = new PostgreSQLMCP();

// Get database tables
router.get('/tables', ensureAuthenticated, async (req, res) => {
  try {
    const result = await postgresMCP.execute({
      method: 'tools/call',
      params: {
        name: 'postgres_list_tables',
        arguments: {}
      }
    });
    
    // Enhance with actual database metadata
    const tables = result.content || [];
    const enhancedTables = await Promise.all(tables.map(async (table: any) => {
      try {
        const countResult = await db.execute(`SELECT COUNT(*) as count FROM ${table.name}`);
        return {
          ...table,
          rowCount: countResult.rows[0]?.count || 0,
          size: 'N/A'
        };
      } catch {
        return {
          ...table,
          rowCount: 0,
          size: 'N/A'
        };
      }
    }));
    
    res.json(enhancedTables);
  } catch (error: any) {
    console.error('PostgreSQL MCP tables error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tables',
      message: error.message 
    });
  }
});

// Get table schema
router.get('/schema/:table', ensureAuthenticated, async (req, res) => {
  try {
    const { table } = req.params;
    
    const result = await postgresMCP.execute({
      method: 'tools/call',
      params: {
        name: 'postgres_get_schema',
        arguments: {
          table
        }
      }
    });
    
    res.json(result.content || []);
  } catch (error: any) {
    console.error('PostgreSQL MCP schema error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch table schema',
      message: error.message 
    });
  }
});

// Execute query
router.post('/query', ensureAuthenticated, async (req, res) => {
  try {
    const { query } = req.body;
    
    // Validate query (basic safety check)
    const lowerQuery = query.toLowerCase().trim();
    const isDangerous = lowerQuery.includes('drop') || 
                       lowerQuery.includes('truncate') ||
                       (lowerQuery.includes('delete') && !lowerQuery.includes('where'));
    
    if (isDangerous && !req.user?.isAdmin) {
      return res.status(403).json({ 
        error: 'Dangerous query detected',
        message: 'This query requires admin privileges' 
      });
    }
    
    const startTime = Date.now();
    const result = await postgresMCP.execute({
      method: 'tools/call',
      params: {
        name: 'postgres_query',
        arguments: {
          query
        }
      }
    });
    const executionTime = Date.now() - startTime;
    
    // Format response
    const queryResult = result.content || { rows: [], columns: [] };
    res.json({
      columns: queryResult.columns || [],
      rows: queryResult.rows || [],
      rowCount: queryResult.rows?.length || 0,
      executionTime
    });
  } catch (error: any) {
    console.error('PostgreSQL MCP query error:', error);
    res.status(500).json({ 
      error: 'Query execution failed',
      message: error.message 
    });
  }
});

// Backup database
router.post('/backup', ensureAuthenticated, async (req, res) => {
  try {
    const result = await postgresMCP.execute({
      method: 'tools/call',
      params: {
        name: 'postgres_backup',
        arguments: {}
      }
    });
    
    const filename = `backup_${new Date().toISOString().split('T')[0]}.sql`;
    res.json({ 
      success: true,
      filename,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('PostgreSQL MCP backup error:', error);
    res.status(500).json({ 
      error: 'Failed to create backup',
      message: error.message 
    });
  }
});

export default router;