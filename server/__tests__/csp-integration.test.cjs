/**
 * CSP Integration Tests
 * 
 * Practical tests to verify Content Security Policy is properly configured
 * and prevents XSS attacks in production
 */

const http = require('http');

// Test helpers
async function makeRequest(path = '/api/health') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: {}
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testCSPConfiguration() {
  console.log('=== Content Security Policy Integration Tests ===\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: CSP header is present
  console.log('1. Testing CSP header presence...');
  try {
    const response = await makeRequest('/api/health');
    const cspHeader = response.headers['content-security-policy'];
    
    if (cspHeader) {
      console.log('   ✓ PASS: Content-Security-Policy header present');
      console.log('   Header length:', cspHeader.length, 'characters\n');
      passed++;
    } else {
      console.log('   ✗ FAIL: Content-Security-Policy header missing\n');
      failed++;
    }
  } catch (error) {
    console.log('   ✗ FAIL: Could not verify CSP header\n');
    failed++;
  }

  // Test 2: Production CSP does NOT contain unsafe-inline
  console.log('2. Testing production CSP for unsafe-inline...');
  try {
    const response = await makeRequest('/api/health');
    const cspHeader = response.headers['content-security-policy'];
    
    if (cspHeader) {
      const hasUnsafeInline = cspHeader.includes("'unsafe-inline'");
      
      // In development, unsafe-inline is expected
      // In production, it should NOT be present
      const nodeEnv = process.env.NODE_ENV || 'development';
      
      if (nodeEnv === 'production' && !hasUnsafeInline) {
        console.log('   ✓ PASS: Production CSP does NOT contain unsafe-inline');
        passed++;
      } else if (nodeEnv !== 'production' && hasUnsafeInline) {
        console.log('   ✓ PASS: Development CSP contains unsafe-inline (expected)');
        passed++;
      } else if (nodeEnv === 'production' && hasUnsafeInline) {
        console.log('   ✗ FAIL: CRITICAL - Production CSP contains unsafe-inline!');
        console.log('   This is a security vulnerability!');
        failed++;
      } else {
        console.log('   ✓ PASS: CSP configuration matches environment');
        passed++;
      }
    } else {
      console.log('   ✗ FAIL: No CSP header to test\n');
      failed++;
    }
  } catch (error) {
    console.log('   ✗ FAIL: Could not verify unsafe-inline\n');
    failed++;
  }

  // Test 3: Production CSP does NOT contain unsafe-eval
  console.log('\n3. Testing production CSP for unsafe-eval...');
  try {
    const response = await makeRequest('/api/health');
    const cspHeader = response.headers['content-security-policy'];
    
    if (cspHeader) {
      const hasUnsafeEval = cspHeader.includes("'unsafe-eval'");
      const nodeEnv = process.env.NODE_ENV || 'development';
      
      if (nodeEnv === 'production' && !hasUnsafeEval) {
        console.log('   ✓ PASS: Production CSP does NOT contain unsafe-eval');
        passed++;
      } else if (nodeEnv !== 'production' && hasUnsafeEval) {
        console.log('   ✓ PASS: Development CSP contains unsafe-eval (expected)');
        passed++;
      } else if (nodeEnv === 'production' && hasUnsafeEval) {
        console.log('   ✗ FAIL: CRITICAL - Production CSP contains unsafe-eval!');
        console.log('   This is a security vulnerability!');
        failed++;
      } else {
        console.log('   ✓ PASS: CSP configuration matches environment');
        passed++;
      }
    }
  } catch (error) {
    console.log('   ✗ FAIL: Could not verify unsafe-eval\n');
    failed++;
  }

  // Test 4: CSP includes nonce support
  console.log('\n4. Testing CSP nonce support...');
  try {
    const response = await makeRequest('/api/health');
    const cspHeader = response.headers['content-security-policy'];
    
    if (cspHeader) {
      const hasNonce = /nonce-[A-Za-z0-9+/=]+/.test(cspHeader);
      
      if (hasNonce) {
        console.log('   ✓ PASS: CSP includes nonce for inline scripts');
        const nonceMatch = cspHeader.match(/nonce-([A-Za-z0-9+/=]+)/);
        if (nonceMatch) {
          console.log('   Nonce value:', nonceMatch[1].substring(0, 16) + '...');
        }
        passed++;
      } else {
        console.log('   ✗ FAIL: CSP does not include nonce');
        failed++;
      }
    }
  } catch (error) {
    console.log('   ✗ FAIL: Could not verify nonce\n');
    failed++;
  }

  // Test 5: CSP includes critical directives
  console.log('\n5. Testing CSP critical directives...');
  try {
    const response = await makeRequest('/api/health');
    const cspHeader = response.headers['content-security-policy'];
    
    if (cspHeader) {
      const requiredDirectives = [
        'default-src',
        'script-src',
        'style-src',
        'object-src',
        'base-uri'
      ];
      
      const missingDirectives = requiredDirectives.filter(d => !cspHeader.includes(d));
      
      if (missingDirectives.length === 0) {
        console.log('   ✓ PASS: All critical directives present');
        passed++;
      } else {
        console.log('   ✗ FAIL: Missing directives:', missingDirectives.join(', '));
        failed++;
      }
    }
  } catch (error) {
    console.log('   ✗ FAIL: Could not verify directives\n');
    failed++;
  }

  // Test 6: CSP blocks object-src
  console.log('\n6. Testing CSP object-src blocking...');
  try {
    const response = await makeRequest('/api/health');
    const cspHeader = response.headers['content-security-policy'];
    
    if (cspHeader) {
      const objectSrcNone = cspHeader.includes("object-src 'none'");
      
      if (objectSrcNone) {
        console.log('   ✓ PASS: object-src is set to none (blocks Flash, Java, etc.)');
        passed++;
      } else {
        console.log('   ✗ FAIL: object-src is not properly blocked');
        failed++;
      }
    }
  } catch (error) {
    console.log('   ✗ FAIL: Could not verify object-src\n');
    failed++;
  }

  // Test 7: Nonce is unique per request
  console.log('\n7. Testing nonce uniqueness...');
  try {
    const response1 = await makeRequest('/api/health');
    const response2 = await makeRequest('/api/health');
    
    const nonce1 = response1.headers['content-security-policy'].match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
    const nonce2 = response2.headers['content-security-policy'].match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
    
    if (nonce1 && nonce2 && nonce1 !== nonce2) {
      console.log('   ✓ PASS: Nonces are unique per request');
      console.log('   Request 1:', nonce1.substring(0, 16) + '...');
      console.log('   Request 2:', nonce2.substring(0, 16) + '...');
      passed++;
    } else if (!nonce1 || !nonce2) {
      console.log('   ✗ FAIL: Could not extract nonces');
      failed++;
    } else {
      console.log('   ✗ FAIL: Nonces are the same (security issue)');
      failed++;
    }
  } catch (error) {
    console.log('   ✗ FAIL: Could not verify nonce uniqueness\n');
    failed++;
  }

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n✓ All CSP security tests passed!');
    return true;
  } else {
    console.log('\n✗ Some CSP security tests failed!');
    return false;
  }
}

// Run tests if executed directly
if (require.main === module) {
  testCSPConfiguration()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testCSPConfiguration, makeRequest };
