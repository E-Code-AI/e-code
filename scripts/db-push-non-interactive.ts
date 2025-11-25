#!/usr/bin/env tsx
/**
 * Non-interactive Database Migration Script
 * 
 * Purpose: Run drizzle-kit push without interactive prompts for automated environments
 * Solves: drizzle-kit asking "Is X table created or renamed?" blocks CI/CD
 * Strategy: Always select "create table" for new schema objects
 */

import { execSync } from 'child_process';
import { createInterface } from 'readline';

const isForce = process.argv.includes('--force');

console.log(`[DB Push] Starting non-interactive migration (force: ${isForce})`);
console.log('[DB Push] Auto-selecting "create table" for all new schema objects...');

try {
  // Run drizzle-kit push with auto-answer stdin
  // The "0" key selects the first option (+ create table)
  const command = isForce ? 'npx drizzle-kit push --force' : 'npx drizzle-kit push';
  
  // Auto-answer with "0\n" repeatedly to select "create table" for all prompts
  const autoAnswer = '0\n'.repeat(50); // Repeat 50 times to handle multiple prompts
  
  execSync(command, {
    stdio: ['pipe', 'inherit', 'inherit'],
    input: autoAnswer
  });
  
  console.log('[DB Push] ✅ Migration completed successfully');
  process.exit(0);
} catch (error: any) {
  console.error('[DB Push] ❌ Migration failed:', error.message);
  process.exit(1);
}
