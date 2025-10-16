// @ts-nocheck
import { Pool } from 'pg';
import { createLogger } from '../../utils/logger';

const logger = createLogger('postgres-mcp');

export interface PostgresMCPConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

export class PostgresMCPServer {
  private pool: Pool;

  constructor(config: PostgresMCPConfig = {}) {
    if (config.connectionString || process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: config.connectionString || process.env.DATABASE_URL
      });
    } else {
      this.pool = new Pool({
        host: config.host || process.env.PGHOST || 'localhost',
        port: config.port || parseInt(process.env.PGPORT || '5432'),
        database: config.database || process.env.PGDATABASE,
        user: config.user || process.env.PGUSER,
        password: config.password || process.env.PGPASSWORD
      });
    }
  }

  // Schema operations
  async listSchemas() {
    try {
      const result = await this.pool.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        ORDER BY schema_name
      `);
      return result.rows.map(row => row.schema_name);
    } catch (error) {
      logger.error('Failed to list schemas:', error);
      throw error;
    }
  }

  async listTables(schema: string = 'public') {
    try {
      const result = await this.pool.query(`
        SELECT 
          table_name,
          table_type,
          pg_size_pretty(pg_total_relation_size(quote_ident(table_schema)||'.'||quote_ident(table_name))) as size,
          obj_description((quote_ident(table_schema)||'.'||quote_ident(table_name))::regclass) as comment
        FROM information_schema.tables 
        WHERE table_schema = $1
        ORDER BY table_name
      `, [schema]);
      
      return result.rows.map(row => ({
        name: row.table_name,
        type: row.table_type,
        size: row.size,
        comment: row.comment
      }));
    } catch (error) {
      logger.error('Failed to list tables:', error);
      throw error;
    }
  }

  async getTableSchema(tableName: string, schema: string = 'public') {
    try {
      const result = await this.pool.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default,
          col_description((table_schema||'.'||table_name)::regclass::oid, ordinal_position) as comment
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [schema, tableName]);
      
      return result.rows.map(row => ({
        columnName: row.column_name,
        dataType: row.data_type,
        maxLength: row.character_maximum_length,
        isNullable: row.is_nullable === 'YES',
        defaultValue: row.column_default,
        comment: row.comment
      }));
    } catch (error) {
      logger.error('Failed to get table schema:', error);
      throw error;
    }
  }

  async getTableIndexes(tableName: string, schema: string = 'public') {
    try {
      const result = await this.pool.query(`
        SELECT 
          indexname,
          indexdef,
          tablespace
        FROM pg_indexes
        WHERE schemaname = $1 AND tablename = $2
        ORDER BY indexname
      `, [schema, tableName]);
      
      return result.rows.map(row => ({
        name: row.indexname,
        definition: row.indexdef,
        tablespace: row.tablespace
      }));
    } catch (error) {
      logger.error('Failed to get table indexes:', error);
      throw error;
    }
  }

  async getTableConstraints(tableName: string, schema: string = 'public') {
    try {
      const result = await this.pool.query(`
        SELECT 
          conname as constraint_name,
          contype as constraint_type,
          pg_get_constraintdef(c.oid) as definition
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class cl ON cl.oid = c.conrelid
        WHERE n.nspname = $1 AND cl.relname = $2
        ORDER BY conname
      `, [schema, tableName]);
      
      return result.rows.map(row => ({
        name: row.constraint_name,
        type: this.getConstraintType(row.constraint_type),
        definition: row.definition
      }));
    } catch (error) {
      logger.error('Failed to get table constraints:', error);
      throw error;
    }
  }

  private getConstraintType(type: string): string {
    const types: Record<string, string> = {
      'p': 'PRIMARY KEY',
      'f': 'FOREIGN KEY',
      'u': 'UNIQUE',
      'c': 'CHECK',
      'x': 'EXCLUDE',
      't': 'TRIGGER'
    };
    return types[type] || type;
  }

  // Query operations
  async executeQuery(query: string, params: any[] = []) {
    try {
      const result = await this.pool.query(query, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields?.map(f => ({
          name: f.name,
          dataTypeID: f.dataTypeID,
          tableID: f.tableID,
          columnID: f.columnID
        }))
      };
    } catch (error) {
      logger.error('Failed to execute query:', error);
      throw error;
    }
  }

  async explainQuery(query: string, params: any[] = [], analyze: boolean = false) {
    try {
      const explainQuery = `EXPLAIN ${analyze ? 'ANALYZE' : ''} ${query}`;
      const result = await this.pool.query(explainQuery, params);
      return result.rows.map(row => row['QUERY PLAN']);
    } catch (error) {
      logger.error('Failed to explain query:', error);
      throw error;
    }
  }

  // Data operations
  async selectData(
    tableName: string,
    schema: string = 'public',
    limit: number = 100,
    offset: number = 0,
    where?: string,
    orderBy?: string
  ) {
    try {
      let query = `SELECT * FROM ${schema}.${tableName}`;
      const params: any[] = [];
      
      if (where) {
        query += ` WHERE ${where}`;
      }
      
      if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
      }
      
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      
      const result = await this.pool.query(query, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount
      };
    } catch (error) {
      logger.error('Failed to select data:', error);
      throw error;
    }
  }

  async insertData(tableName: string, schema: string = 'public', data: Record<string, any>) {
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${schema}.${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to insert data:', error);
      throw error;
    }
  }

  async updateData(
    tableName: string,
    schema: string = 'public',
    data: Record<string, any>,
    where: string
  ) {
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
      
      const query = `
        UPDATE ${schema}.${tableName}
        SET ${setClause}
        WHERE ${where}
        RETURNING *
      `;
      
      const result = await this.pool.query(query, values);
      return {
        rows: result.rows,
        rowCount: result.rowCount
      };
    } catch (error) {
      logger.error('Failed to update data:', error);
      throw error;
    }
  }

  async deleteData(tableName: string, schema: string = 'public', where: string) {
    try {
      const query = `
        DELETE FROM ${schema}.${tableName}
        WHERE ${where}
        RETURNING *
      `;
      
      const result = await this.pool.query(query);
      return {
        rows: result.rows,
        rowCount: result.rowCount
      };
    } catch (error) {
      logger.error('Failed to delete data:', error);
      throw error;
    }
  }

  // Statistics operations
  async getDatabaseStats() {
    try {
      const result = await this.pool.query(`
        SELECT 
          pg_database.datname as database_name,
          pg_size_pretty(pg_database_size(pg_database.datname)) as size,
          numbackends as active_connections,
          xact_commit as transactions_committed,
          xact_rollback as transactions_rolled_back,
          blks_read as blocks_read,
          blks_hit as blocks_hit,
          tup_returned as tuples_returned,
          tup_fetched as tuples_fetched,
          tup_inserted as tuples_inserted,
          tup_updated as tuples_updated,
          tup_deleted as tuples_deleted
        FROM pg_stat_database
        JOIN pg_database ON pg_database.oid = pg_stat_database.datid
        WHERE pg_database.datname = current_database()
      `);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      throw error;
    }
  }

  async getTableStats(tableName: string, schema: string = 'public') {
    try {
      const result = await this.pool.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        WHERE schemaname = $1 AND tablename = $2
      `, [schema, tableName]);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get table stats:', error);
      throw error;
    }
  }

  async getActiveQueries() {
    try {
      const result = await this.pool.query(`
        SELECT 
          pid,
          usename,
          application_name,
          client_addr,
          backend_start,
          state,
          state_change,
          query,
          query_start,
          EXTRACT(EPOCH FROM (now() - query_start)) as query_duration_seconds
        FROM pg_stat_activity
        WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%'
        ORDER BY query_start DESC
      `);
      
      return result.rows.map(row => ({
        pid: row.pid,
        username: row.usename,
        applicationName: row.application_name,
        clientAddress: row.client_addr,
        backendStart: row.backend_start,
        state: row.state,
        stateChange: row.state_change,
        query: row.query,
        queryStart: row.query_start,
        durationSeconds: row.query_duration_seconds
      }));
    } catch (error) {
      logger.error('Failed to get active queries:', error);
      throw error;
    }
  }

  // Backup operations
  async createBackup(tableName?: string, schema: string = 'public') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let backupName: string;
      
      if (tableName) {
        backupName = `${schema}_${tableName}_backup_${timestamp}`;
        await this.pool.query(`
          CREATE TABLE ${backupName} AS 
          SELECT * FROM ${schema}.${tableName}
        `);
      } else {
        // Backup entire schema
        backupName = `${schema}_backup_${timestamp}`;
        await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${backupName}`);
        
        // Get all tables in schema
        const tables = await this.listTables(schema);
        
        // Copy each table
        for (const table of tables) {
          if (table.type === 'BASE TABLE') {
            await this.pool.query(`
              CREATE TABLE ${backupName}.${table.name} AS 
              SELECT * FROM ${schema}.${table.name}
            `);
          }
        }
      }
      
      return {
        backupName,
        timestamp,
        success: true
      };
    } catch (error) {
      logger.error('Failed to create backup:', error);
      throw error;
    }
  }

  // Close connection pool
  async close() {
    await this.pool.end();
  }
}

// Export singleton instance
export const postgresMCP = new PostgresMCPServer();