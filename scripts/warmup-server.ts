#!/usr/bin/env npx tsx
/**
 * Fortune 500-Grade Server Warmup Script
 * 
 * This script pre-warms the server by:
 * 1. Pre-compiling critical frontend modules via Vite
 * 2. Warming up database connection pools
 * 3. Pre-loading AI provider connections
 * 4. Caching static assets
 * 
 * Usage: npx tsx scripts/warmup-server.ts
 * 
 * Target: Reduce cold-start time from 15s to <5s
 */

import http from 'http';
import https from 'https';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

interface WarmupResult {
  endpoint: string;
  status: 'success' | 'failed' | 'skipped';
  responseTime: number;
  statusCode?: number;
  error?: string;
}

const WARMUP_ENDPOINTS = [
  // Critical UI routes that trigger Vite compilation
  '/',
  '/login',
  '/register',
  
  // API health endpoints (verified existing in health.router.ts)
  '/api/health',
  '/api/liveness',
  '/api/readiness',
  
  // Static assets
  '/favicon.ico',
];

async function warmupEndpoint(endpoint: string): Promise<WarmupResult> {
  const url = `${BASE_URL}${endpoint}`;
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const statusCode = res.statusCode || 0;
        const isSuccess = statusCode >= 200 && statusCode < 400;
        
        resolve({
          endpoint,
          status: isSuccess ? 'success' : 'failed',
          responseTime: Date.now() - startTime,
          statusCode,
          error: isSuccess ? undefined : `HTTP ${statusCode}`,
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        endpoint,
        status: 'failed',
        responseTime: Date.now() - startTime,
        error: error.message,
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        endpoint,
        status: 'failed',
        responseTime: Date.now() - startTime,
        error: 'Request timed out',
      });
    });
  });
}

async function waitForServer(maxWaitMs: number = 120000): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 2000;
  
  console.log(`⏳ Waiting for server at ${BASE_URL}...`);
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const result = await warmupEndpoint('/api/health');
      if (result.status === 'success' && result.statusCode === 200) {
        console.log(`✅ Server ready in ${Date.now() - startTime}ms`);
        return true;
      }
    } catch {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`   Still waiting... (${elapsed}s elapsed)`);
  }
  
  console.log(`❌ Server did not become ready within ${maxWaitMs}ms`);
  return false;
}

async function runWarmup(): Promise<void> {
  console.log('🔥 Fortune 500-Grade Server Warmup');
  console.log('='.repeat(50));
  console.log(`Target: ${BASE_URL}`);
  console.log('');
  
  // Wait for server to be ready
  const serverReady = await waitForServer();
  if (!serverReady) {
    console.log('❌ Warmup aborted: server not available');
    process.exit(1);
  }
  
  console.log('');
  console.log('🚀 Warming up critical endpoints...');
  console.log('-'.repeat(50));
  
  const results: WarmupResult[] = [];
  const startTime = Date.now();
  
  // Warm up endpoints in parallel batches
  const batchSize = 3;
  for (let i = 0; i < WARMUP_ENDPOINTS.length; i += batchSize) {
    const batch = WARMUP_ENDPOINTS.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(warmupEndpoint));
    results.push(...batchResults);
    
    // Log progress
    for (const result of batchResults) {
      const statusIcon = result.status === 'success' ? '✅' : '❌';
      const timeStr = `${result.responseTime}ms`.padStart(6);
      console.log(`${statusIcon} ${result.endpoint.padEnd(30)} ${timeStr} ${result.statusCode || result.error || ''}`);
    }
  }
  
  const totalTime = Date.now() - startTime;
  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  
  console.log('');
  console.log('='.repeat(50));
  console.log('📊 Warmup Summary');
  console.log(`   Total time: ${totalTime}ms`);
  console.log(`   Endpoints: ${successCount} success, ${failedCount} failed`);
  console.log(`   Avg response time: ${Math.round(results.reduce((a, r) => a + r.responseTime, 0) / results.length)}ms`);
  console.log('');
  
  if (failedCount > 0) {
    console.log('⚠️  Some endpoints failed to warm up');
    process.exit(1);
  }
  
  console.log('✅ Server warmup complete - ready for Fortune 500 traffic!');
}

// Run warmup
runWarmup().catch(error => {
  console.error('❌ Warmup failed:', error.message);
  process.exit(1);
});
