#!/usr/bin/env node
import 'dotenv/config';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

function walkTsFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkTsFiles(full, acc);
    } else if (entry.endsWith('.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function extractSchemaTables() {
  // The Drizzle schema is split across `shared/schema.ts` and `shared/schema/*`.
  // The audit must walk every `.ts` file under shared/ so re-exported tables
  // (e.g. shared/schema/imports.ts) are not flagged as drift.
  const sharedDir = fileURLToPath(new URL('../shared', import.meta.url));
  const tables = new Set();
  const regex = /pgTable\(\s*['"`]([^'"`]+)['"`]/g;
  for (const file of walkTsFiles(sharedDir)) {
    const source = readFileSync(file, 'utf8');
    let match;
    while ((match = regex.exec(source))) {
      tables.add(match[1]);
    }
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
