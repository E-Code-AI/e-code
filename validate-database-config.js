#!/usr/bin/env node

/**
 * Database Configuration Validator
 * 
 * This script validates both Neon PostgreSQL and ReplitDB configurations
 * and provides recommendations for the E-Code platform.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function validateDatabaseConfig() {
  const config = {
    neon: { configured: false, issues: [] },
    replitdb: { configured: false, issues: [] },
    recommendation: ''
  };

  // Check environment variables
  const envPath = join(__dirname, '.env');
  let envVars = {};
  
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      if (line.includes('=') && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    });
  }

  // Validate Neon PostgreSQL
  const databaseUrl = process.env.DATABASE_URL || envVars.DATABASE_URL;
  if (databaseUrl) {
    config.neon.configured = true;
    config.neon.url = databaseUrl.replace(/:[^:@]*@/, ':***@'); // Hide password
    
    if (!databaseUrl.includes('neon.tech') && !databaseUrl.includes('postgres')) {
      config.neon.issues.push('Database URL does not appear to be PostgreSQL');
    }
    
    if (databaseUrl.includes('localhost')) {
      config.neon.issues.push('Using localhost - consider Neon for production');
    }
  } else {
    config.neon.issues.push('DATABASE_URL not configured');
  }

  // Validate ReplitDB emulation
  const replitDbPath = join(__dirname, '.replitdb');
  if (existsSync(replitDbPath)) {
    config.replitdb.configured = true;
    config.replitdb.path = replitDbPath;
  } else {
    config.replitdb.issues.push('ReplitDB directory not found (will be created on first use)');
  }

  // Check if database files exist
  const dbFilePath = join(__dirname, 'server', 'db.ts');
  const replitDbFilePath = join(__dirname, 'server', 'database', 'replitdb.ts');
  
  if (!existsSync(dbFilePath)) {
    config.neon.issues.push('Database connection file missing');
  }
  
  if (!existsSync(replitDbFilePath)) {
    config.replitdb.issues.push('ReplitDB implementation file missing');
  }

  // Generate recommendation
  if (config.neon.configured && config.neon.issues.length === 0) {
    config.recommendation = '✅ RECOMMENDED: Continue using Neon PostgreSQL as primary database';
  } else if (config.neon.configured) {
    config.recommendation = '⚠️ Neon is configured but has issues. Review and fix them.';
  } else {
    config.recommendation = '❌ Set up Neon PostgreSQL for production use';
  }

  return config;
}

function printReport(config) {
  console.log('\n🗄️  E-Code Database Configuration Report\n');
  console.log('=' .repeat(50));
  
  // Neon PostgreSQL Status
  console.log('\n📊 Neon PostgreSQL Status:');
  console.log(`   Configured: ${config.neon.configured ? '✅ Yes' : '❌ No'}`);
  if (config.neon.url) {
    console.log(`   URL: ${config.neon.url}`);
  }
  if (config.neon.issues.length > 0) {
    console.log('   Issues:');
    config.neon.issues.forEach(issue => console.log(`   - ⚠️ ${issue}`));
  }
  
  // ReplitDB Status
  console.log('\n🔑 ReplitDB Emulation Status:');
  console.log(`   Configured: ${config.replitdb.configured ? '✅ Yes' : '⚠️ Will be created'}`);
  if (config.replitdb.path) {
    console.log(`   Path: ${config.replitdb.path}`);
  }
  if (config.replitdb.issues.length > 0) {
    console.log('   Issues:');
    config.replitdb.issues.forEach(issue => console.log(`   - ℹ️ ${issue}`));
  }
  
  // Recommendation
  console.log('\n🎯 Recommendation:');
  console.log(`   ${config.recommendation}`);
  
  // Usage Guide
  console.log('\n📚 Usage Guide:');
  console.log('   Primary Database (Neon): Users, projects, files, billing');
  console.log('   Key-Value Store (ReplitDB): Settings, cache, preferences');
  
  console.log('\n🔗 Next Steps:');
  if (!config.neon.configured) {
    console.log('   1. Set up Neon PostgreSQL at https://neon.tech');
    console.log('   2. Add DATABASE_URL to your .env file');
    console.log('   3. Run: npm run db:push');
  } else if (config.neon.issues.length > 0) {
    console.log('   1. Fix the issues listed above');
    console.log('   2. Test connection: npm run db:push');
  } else {
    console.log('   1. Your database is properly configured!');
    console.log('   2. Monitor usage and performance');
    console.log('   3. Follow the DATABASE_ARCHITECTURE_GUIDE.md');
  }
  
  console.log('\n' + '=' .repeat(50));
}

// Run the validation
try {
  const config = validateDatabaseConfig();
  printReport(config);
  
  // Exit with appropriate code
  const hasErrors = config.neon.issues.some(issue => 
    issue.includes('not configured') || issue.includes('missing')
  );
  process.exit(hasErrors ? 1 : 0);
  
} catch (error) {
  console.error('❌ Error validating database configuration:', error);
  process.exit(1);
}