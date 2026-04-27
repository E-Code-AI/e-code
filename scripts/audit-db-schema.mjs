#!/usr/bin/env node
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const { Client } = pg;

function extractSchemaTables() {
  const source = readFileSync(new URL('../shared/schema.ts', import.meta.url), 'utf8');
  const tables = new Set();
  const regex = /pgTable\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = regex.exec(source))) {
    tables.add(match[1]);
  }
  return [...tables].sort();
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();
  try {
    const schemaTables = extractSchemaTables();
    const dbResult = await client.query(`
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `);
    const dbTables = dbResult.rows.map((row) => row.table_name);
    const dbSet = new Set(dbTables);
    const schemaSet = new Set(schemaTables);
    const missingInDb = schemaTables.filter((table) => !dbSet.has(table));
    const extraInDb = dbTables.filter((table) => !schemaSet.has(table));

    console.log(JSON.stringify({
      schemaTableCount: schemaTables.length,
      databaseTableCount: dbTables.length,
      missingInDatabaseCount: missingInDb.length,
      extraInDatabaseCount: extraInDb.length,
      missingInDatabase: missingInDb,
      extraInDatabase: extraInDb,
    }, null, 2));

    if (missingInDb.length > 0) {
      process.exitCode = 2;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`DB_SCHEMA_AUDIT_ERROR=${error.message}`);
  process.exit(1);
});
