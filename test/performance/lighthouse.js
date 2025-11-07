#!/usr/bin/env node

/**
 * Lighthouse Performance Testing Script
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

// Performance budgets
const PERFORMANCE_BUDGETS = {
  performance: 90,
  accessibility: 95,
  bestPractices: 90,
  seo: 90,
  pwa: 80,
  
  // Specific metrics
  firstContentfulPaint: 1800, // 1.8s
  largestContentfulPaint: 2500, // 2.5s
  totalBlockingTime: 200, // 200ms
  cumulativeLayoutShift: 0.1,
  speedIndex: 3400, // 3.4s
};

// Lighthouse configuration
const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
    formFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false,
    },
  },
};

// Pages to test
const PAGES_TO_TEST = [
  { url: 'http://localhost:5000', name: 'Homepage' },
  { url: 'http://localhost:5000/login', name: 'Login' },
  { url: 'http://localhost:5000/register', name: 'Register' },
  { url: 'http://localhost:5000/features', name: 'Features' },
  { url: 'http://localhost:5000/pricing', name: 'Pricing' },
];

async function launchChromeAndRunLighthouse(url, config) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] });
  const options = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: config.settings.onlyCategories,
    port: chrome.port,
  };

  try {
    const runnerResult = await lighthouse(url, options, config);
    await chrome.kill();
    return runnerResult;
  } catch (error) {
    await chrome.kill();
    throw error;
  }
}

function checkBudgets(result) {
  const { categories, audits } = result.lhr;
  const failures = [];
  
  // Check category scores
  for (const [category, minScore] of Object.entries(PERFORMANCE_BUDGETS)) {
    if (categories[category]) {
      const score = categories[category].score * 100;
      if (score < minScore) {
        failures.push({
          type: 'category',
          name: category,
          actual: score.toFixed(1),
          expected: minScore,
        });
      }
    }
  }
  
  // Check specific metrics
  if (audits['first-contentful-paint']) {
    const fcp = audits['first-contentful-paint'].numericValue;
    if (fcp > PERFORMANCE_BUDGETS.firstContentfulPaint) {
      failures.push({
        type: 'metric',
        name: 'First Contentful Paint',
        actual: `${(fcp / 1000).toFixed(2)}s`,
        expected: `${(PERFORMANCE_BUDGETS.firstContentfulPaint / 1000).toFixed(2)}s`,
      });
    }
  }
  
  if (audits['largest-contentful-paint']) {
    const lcp = audits['largest-contentful-paint'].numericValue;
    if (lcp > PERFORMANCE_BUDGETS.largestContentfulPaint) {
      failures.push({
        type: 'metric',
        name: 'Largest Contentful Paint',
        actual: `${(lcp / 1000).toFixed(2)}s`,
        expected: `${(PERFORMANCE_BUDGETS.largestContentfulPaint / 1000).toFixed(2)}s`,
      });
    }
  }
  
  if (audits['total-blocking-time']) {
    const tbt = audits['total-blocking-time'].numericValue;
    if (tbt > PERFORMANCE_BUDGETS.totalBlockingTime) {
      failures.push({
        type: 'metric',
        name: 'Total Blocking Time',
        actual: `${tbt.toFixed(0)}ms`,
        expected: `${PERFORMANCE_BUDGETS.totalBlockingTime}ms`,
      });
    }
  }
  
  if (audits['cumulative-layout-shift']) {
    const cls = audits['cumulative-layout-shift'].numericValue;
    if (cls > PERFORMANCE_BUDGETS.cumulativeLayoutShift) {
      failures.push({
        type: 'metric',
        name: 'Cumulative Layout Shift',
        actual: cls.toFixed(3),
        expected: PERFORMANCE_BUDGETS.cumulativeLayoutShift,
      });
    }
  }
  
  return failures;
}

async function runPerformanceTests() {
  console.log('🚀 Starting Lighthouse Performance Tests...\n');
  
  const results = [];
  let hasFailures = false;
  
  for (const page of PAGES_TO_TEST) {
    console.log(`Testing: ${page.name} (${page.url})`);
    
    try {
      const result = await launchChromeAndRunLighthouse(page.url, LIGHTHOUSE_CONFIG);
      const failures = checkBudgets(result);
      
      const pageResult = {
        name: page.name,
        url: page.url,
        scores: {
          performance: (result.lhr.categories.performance.score * 100).toFixed(1),
          accessibility: (result.lhr.categories.accessibility.score * 100).toFixed(1),
          bestPractices: (result.lhr.categories['best-practices'].score * 100).toFixed(1),
          seo: (result.lhr.categories.seo.score * 100).toFixed(1),
          pwa: (result.lhr.categories.pwa.score * 100).toFixed(1),
        },
        metrics: {
          fcp: `${(result.lhr.audits['first-contentful-paint'].numericValue / 1000).toFixed(2)}s`,
          lcp: `${(result.lhr.audits['largest-contentful-paint'].numericValue / 1000).toFixed(2)}s`,
          tbt: `${result.lhr.audits['total-blocking-time'].numericValue.toFixed(0)}ms`,
          cls: result.lhr.audits['cumulative-layout-shift'].numericValue.toFixed(3),
          si: `${(result.lhr.audits['speed-index'].numericValue / 1000).toFixed(2)}s`,
        },
        failures,
        passed: failures.length === 0,
      };
      
      results.push(pageResult);
      
      // Print results
      console.log(`  ✓ Performance: ${pageResult.scores.performance}`);
      console.log(`  ✓ Accessibility: ${pageResult.scores.accessibility}`);
      console.log(`  ✓ Best Practices: ${pageResult.scores.bestPractices}`);
      console.log(`  ✓ SEO: ${pageResult.scores.seo}`);
      console.log(`  ✓ PWA: ${pageResult.scores.pwa}`);
      
      if (failures.length > 0) {
        hasFailures = true;
        console.log(`  ✗ Budget violations:`);
        failures.forEach(f => {
          console.log(`    - ${f.name}: ${f.actual} (expected: ${f.expected})`);
        });
      }
      
      console.log('');
      
      // Save detailed report
      const reportDir = path.join(__dirname, '..', '..', 'lighthouse-reports');
      await fs.mkdir(reportDir, { recursive: true });
      const reportPath = path.join(reportDir, `${page.name.toLowerCase().replace(/\s+/g, '-')}.json`);
      await fs.writeFile(reportPath, JSON.stringify(result.lhr, null, 2));
      
    } catch (error) {
      console.error(`  ✗ Error testing ${page.name}: ${error.message}`);
      hasFailures = true;
      results.push({
        name: page.name,
        url: page.url,
        error: error.message,
        passed: false,
      });
    }
  }
  
  // Generate summary report
  console.log('\n📊 Performance Test Summary:');
  console.log('================================');
  
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Total Pages Tested: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${results.length - passedCount}`);
  
  // Save summary report
  const summaryPath = path.join(__dirname, '..', '..', 'lighthouse-reports', 'summary.json');
  await fs.writeFile(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    budgets: PERFORMANCE_BUDGETS,
    hasFailures,
  }, null, 2));
  
  if (hasFailures) {
    console.log('\n❌ Performance tests failed! Some pages did not meet performance budgets.');
    process.exit(1);
  } else {
    console.log('\n✅ All performance tests passed!');
    process.exit(0);
  }
}

// Run tests if called directly
if (require.main === module) {
  runPerformanceTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runPerformanceTests, PERFORMANCE_BUDGETS };