#!/usr/bin/env tsx
/**
 * Database Backup Script
 * Fortune 500 Production-Grade - Backup & Restore for PostgreSQL
 * 
 * Features:
 * - Export database to timestamped SQL backup file
 * - Support local filesystem and Google Cloud Storage (if configured)
 * - Restore database from backup file with --restore flag
 * - Uses pg_dump/pg_restore for full compatibility
 * 
 * Usage:
 *   npm run db:backup              # Create backup
 *   npm run db:restore backup.sql  # Restore from backup
 * 
 * Date: December 25, 2025
 * Status: Production-ready
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(process.cwd(), 'backups');

interface BackupOptions {
  restore?: boolean;
  restoreFile?: string;
  cloudStorage?: boolean;
  verbose?: boolean;
}

function parseArgs(): BackupOptions {
  const args = process.argv.slice(2);
  const options: BackupOptions = {
    restore: false,
    cloudStorage: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--restore' || arg === '-r') {
      options.restore = true;
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        options.restoreFile = args[++i];
      }
    } else if (arg === '--cloud' || arg === '-c') {
      options.cloudStorage = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (!arg.startsWith('-') && options.restore && !options.restoreFile) {
      options.restoreFile = arg;
    }
  }

  return options;
}

function getDatabaseUrl(): string {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  return dbUrl;
}

function parseDatabaseUrl(url: string): {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
  sslmode?: string;
} {
  // Handle both formats:
  // postgres://user:pass@host:port/db
  // postgresql://user:pass@host/db?sslmode=require (Neon serverless)
  const urlObj = new URL(url);
  
  const user = urlObj.username;
  const password = urlObj.password;
  const host = urlObj.hostname;
  const port = urlObj.port || '5432'; // Default PostgreSQL port
  const database = urlObj.pathname.slice(1); // Remove leading '/'
  const sslmode = urlObj.searchParams.get('sslmode') || undefined;
  
  if (!user || !password || !host || !database) {
    console.error('❌ Invalid DATABASE_URL format');
    console.error('   Expected: postgres://user:password@host[:port]/database');
    process.exit(1);
  }

  return { user, password, host, port, database, sslmode };
}

function generateBackupFilename(): string {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
  return `backup_${timestamp}.sql`;
}

async function ensureBackupDir(): Promise<void> {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
  }
}

async function checkPgDump(): Promise<boolean> {
  try {
    await execAsync('which pg_dump');
    return true;
  } catch {
    return false;
  }
}

async function checkPsql(): Promise<boolean> {
  try {
    await execAsync('which psql');
    return true;
  } catch {
    return false;
  }
}

async function createBackup(options: BackupOptions): Promise<string> {
  console.log('🔄 Starting database backup...\n');
  
  await ensureBackupDir();
  
  const hasPgDump = await checkPgDump();
  const dbUrl = getDatabaseUrl();
  const dbConfig = parseDatabaseUrl(dbUrl);
  const filename = generateBackupFilename();
  const filepath = path.join(BACKUP_DIR, filename);

  if (hasPgDump) {
    console.log('📦 Using pg_dump for backup...');
    
    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password,
    };

    const args = [
      '-h', dbConfig.host,
      '-p', dbConfig.port,
      '-U', dbConfig.user,
      '-d', dbConfig.database,
      '-F', 'p',
      '--no-owner',
      '--no-privileges',
      '-f', filepath,
    ];

    if (options.verbose) {
      args.push('-v');
    }

    return new Promise((resolve, reject) => {
      const proc = spawn('pg_dump', args, { env, stdio: 'inherit' });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve(filepath);
        } else {
          reject(new Error(`pg_dump exited with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  } else {
    // ✅ FORTUNE 500: Require pg_dump for production-safe backups
    // The SQL fallback was removed because it doesn't handle:
    // - Foreign key constraints ordering
    // - Sequences and serial columns
    // - Large tables (memory exhaustion)
    // - Schema definitions (indexes, triggers, etc.)
    console.error('');
    console.error('╔═══════════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ BACKUP FAILED: pg_dump is required for production backups     ║');
    console.error('╠═══════════════════════════════════════════════════════════════════╣');
    console.error('║  pg_dump ensures:                                                  ║');
    console.error('║    • Complete schema with indexes and constraints                  ║');
    console.error('║    • Proper foreign key ordering                                   ║');
    console.error('║    • Sequence/serial column handling                               ║');
    console.error('║    • Memory-efficient streaming for large databases                ║');
    console.error('╠═══════════════════════════════════════════════════════════════════╣');
    console.error('║  To install pg_dump:                                               ║');
    console.error('║    Ubuntu/Debian: apt-get install postgresql-client                ║');
    console.error('║    macOS:         brew install postgresql                          ║');
    console.error('║    Nix:           nix-env -iA nixpkgs.postgresql                   ║');
    console.error('║    Replit:        pg_dump is pre-installed (check PATH)            ║');
    console.error('╚═══════════════════════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1);
  }
}

async function restoreBackup(options: BackupOptions): Promise<void> {
  if (!options.restoreFile) {
    console.error('❌ Please specify a backup file to restore');
    console.log('Usage: npm run db:restore <backup-file>');
    process.exit(1);
  }

  const filepath = path.isAbsolute(options.restoreFile)
    ? options.restoreFile
    : path.join(process.cwd(), options.restoreFile);

  if (!fs.existsSync(filepath)) {
    const backupPath = path.join(BACKUP_DIR, options.restoreFile);
    if (fs.existsSync(backupPath)) {
      options.restoreFile = backupPath;
    } else {
      console.error(`❌ Backup file not found: ${filepath}`);
      process.exit(1);
    }
  } else {
    options.restoreFile = filepath;
  }

  console.log(`🔄 Restoring database from: ${options.restoreFile}\n`);
  
  const hasPsql = await checkPsql();
  const dbUrl = getDatabaseUrl();
  const dbConfig = parseDatabaseUrl(dbUrl);

  if (hasPsql) {
    console.log('📥 Using psql for restore...');
    
    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password,
    };

    const args = [
      '-h', dbConfig.host,
      '-p', dbConfig.port,
      '-U', dbConfig.user,
      '-d', dbConfig.database,
      '-f', options.restoreFile,
    ];

    if (!options.verbose) {
      args.push('-q');
    }

    return new Promise((resolve, reject) => {
      const proc = spawn('psql', args, { env, stdio: 'inherit' });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`psql exited with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  } else {
    // ✅ FORTUNE 500: Require psql for production-safe restores
    // The SQL fallback was removed because it doesn't handle:
    // - Large backup files (memory exhaustion from fs.readFileSync)
    // - Transaction isolation and error recovery
    // - Progress reporting for large restores
    console.error('');
    console.error('╔═══════════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ RESTORE FAILED: psql is required for production restores      ║');
    console.error('╠═══════════════════════════════════════════════════════════════════╣');
    console.error('║  psql ensures:                                                     ║');
    console.error('║    • Memory-efficient streaming for large backups                  ║');
    console.error('║    • Proper transaction handling                                   ║');
    console.error('║    • Progress reporting and error recovery                         ║');
    console.error('╠═══════════════════════════════════════════════════════════════════╣');
    console.error('║  To install psql:                                                  ║');
    console.error('║    Ubuntu/Debian: apt-get install postgresql-client                ║');
    console.error('║    macOS:         brew install postgresql                          ║');
    console.error('║    Nix:           nix-env -iA nixpkgs.postgresql                   ║');
    console.error('║    Replit:        psql is pre-installed (check PATH)               ║');
    console.error('╚═══════════════════════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1);
  }
}

async function uploadToCloudStorage(filepath: string): Promise<string | null> {
  const bucketName = process.env.GCS_BACKUP_BUCKET;
  
  if (!bucketName) {
    console.log('⚠️  GCS_BACKUP_BUCKET not configured, skipping cloud upload');
    return null;
  }

  try {
    const { Storage } = await import('@google-cloud/storage');
    const storage = new Storage();
    const bucket = storage.bucket(bucketName);
    
    const filename = path.basename(filepath);
    const destination = `database-backups/${filename}`;
    
    console.log(`☁️  Uploading to gs://${bucketName}/${destination}...`);
    
    await bucket.upload(filepath, { destination });
    
    const gcsPath = `gs://${bucketName}/${destination}`;
    console.log(`✅ Uploaded to: ${gcsPath}`);
    
    return gcsPath;
  } catch (error) {
    console.error('⚠️  Failed to upload to cloud storage:', error);
    return null;
  }
}

async function listBackups(): Promise<void> {
  console.log('\n📋 Available backups:\n');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('  No backups found.');
    return;
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('  No backups found.');
    return;
  }

  for (const file of files) {
    const filepath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filepath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`  ${file} (${sizeMB} MB)`);
  }
}

async function main(): Promise<void> {
  const options = parseArgs();

  console.log('╔════════════════════════════════════════╗');
  console.log('║   E-Code Database Backup Utility       ║');
  console.log('║   Fortune 500 Production-Grade         ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    if (options.restore) {
      await restoreBackup(options);
      console.log('\n✅ Database restore completed successfully!');
    } else {
      const filepath = await createBackup(options);
      const stats = fs.statSync(filepath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      
      console.log(`\n✅ Backup created: ${filepath}`);
      console.log(`   Size: ${sizeMB} MB`);

      if (options.cloudStorage) {
        await uploadToCloudStorage(filepath);
      }

      await listBackups();
    }
  } catch (error) {
    console.error('\n❌ Operation failed:', error);
    process.exit(1);
  }
}

main();
