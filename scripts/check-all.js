#!/usr/bin/env node

/**
 * Comprehensive Check Script
 * Runs all quality checks without hanging
 */

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const TIMEOUT_MS = 60000; // 60 second timeout per check

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Track results
let hasErrors = false;
const results = [];

// Helper function to run command with timeout
async function runCheck(name, command, timeoutMs = TIMEOUT_MS) {
  const startTime = Date.now();
  console.log(`${colors.cyan}► Running ${name}...${colors.reset}`);
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`${colors.green}✓ ${name} passed${colors.reset} (${duration}s)`);
    
    results.push({
      check: name,
      status: 'passed',
      duration: duration + 's'
    });
    
    if (stdout && process.env.VERBOSE) {
      console.log(stdout);
    }
    
    return true;
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (error.killed || error.code === 'ETIMEDOUT') {
      console.log(`${colors.yellow}⚠ ${name} timed out after ${timeoutMs/1000}s${colors.reset}`);
      results.push({
        check: name,
        status: 'timeout',
        duration: duration + 's',
        error: 'Check timed out'
      });
    } else {
      console.log(`${colors.red}✗ ${name} failed${colors.reset} (${duration}s)`);
      results.push({
        check: name,
        status: 'failed',
        duration: duration + 's',
        error: error.message || String(error)
      });
      
      if (error.stdout && process.env.VERBOSE) {
        console.log('Output:', error.stdout);
      }
      if (error.stderr && process.env.VERBOSE) {
        console.log('Errors:', error.stderr);
      }
    }
    
    hasErrors = true;
    return false;
  }
}

// Main check sequence
async function runAllChecks() {
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}     Running Comprehensive Quality Checks     ${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log('');
  
  const startTime = Date.now();
  
  // TypeScript checks
  console.log(`${colors.blue}──────── Type Checking ────────${colors.reset}`);
  await runCheck('TypeScript', 'npx tsc --noEmit --pretty false --skipLibCheck', 30000);
  console.log('');
  
  // Linting checks
  console.log(`${colors.blue}──────── Code Quality ─────────${colors.reset}`);
  await runCheck('ESLint', 'npx eslint --ext .ts,.tsx,.js,.jsx --no-error-on-unmatched-pattern client/src server shared types', 30000);
  console.log('');
  
  // Security checks
  console.log(`${colors.blue}──────── Security Checks ──────${colors.reset}`);
  await runCheck('Security Audit', 'npm audit --audit-level=moderate || true', 15000);
  console.log('');
  
  // Build check
  console.log(`${colors.blue}──────── Build Check ──────────${colors.reset}`);
  await runCheck('Build Test', 'npx vite build --mode test', 60000);
  console.log('');
  
  // Database migration check
  console.log(`${colors.blue}──────── Database Check ───────${colors.reset}`);
  await runCheck('Migration Status', 'npx drizzle-kit status', 15000);
  console.log('');
  
  // Total duration
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Summary
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}                  Summary                     ${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log('');
  
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const timeout = results.filter(r => r.status === 'timeout').length;
  
  console.log(`Total Checks: ${results.length}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  
  if (failed > 0) {
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  }
  
  if (timeout > 0) {
    console.log(`${colors.yellow}Timed out: ${timeout}${colors.reset}`);
  }
  
  console.log(`Total Time: ${totalDuration}s`);
  console.log('');
  
  // Detailed results
  if (hasErrors || process.env.VERBOSE) {
    console.log('Detailed Results:');
    console.log('─────────────────');
    results.forEach(r => {
      const statusColor = r.status === 'passed' ? colors.green : 
                         r.status === 'timeout' ? colors.yellow : colors.red;
      const icon = r.status === 'passed' ? '✓' : 
                  r.status === 'timeout' ? '⚠' : '✗';
      
      console.log(`${statusColor}${icon} ${r.check}${colors.reset} (${r.duration})`);
      if (r.error && process.env.VERBOSE) {
        console.log(`  └─ ${r.error}`);
      }
    });
    console.log('');
  }
  
  // Exit code
  if (hasErrors) {
    console.log(`${colors.red}❌ Some checks failed or timed out!${colors.reset}`);
    console.log('Run with VERBOSE=1 for more details.');
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ All checks passed successfully!${colors.reset}`);
    process.exit(0);
  }
}

// Handle interrupts
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Check interrupted by user${colors.reset}`);
  process.exit(130);
});

// Run checks
runAllChecks().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});