// Test script to verify package management system
import fetch from 'node-fetch';

async function testPackageSystem() {
  const baseUrl = 'http://localhost:5000';
  
  // First, login to get a session
  console.log('1. Logging in...');
  const loginResponse = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });
  
  if (!loginResponse.ok) {
    console.error('Login failed:', await loginResponse.text());
    return;
  }
  
  // Get the session cookie
  const setCookie = loginResponse.headers.get('set-cookie');
  const cookie = setCookie?.split(';')[0];
  console.log('✓ Login successful');
  
  // Test 1: Get packages for a project
  console.log('\n2. Testing GET /api/projects/1/packages...');
  try {
    const packagesResponse = await fetch(`${baseUrl}/api/projects/1/packages`, {
      headers: { 'Cookie': cookie }
    });
    
    if (packagesResponse.ok) {
      const packages = await packagesResponse.json();
      console.log('✓ Get packages successful:', packages);
    } else {
      console.error('✗ Get packages failed:', await packagesResponse.text());
    }
  } catch (error) {
    console.error('✗ Get packages error:', error);
  }
  
  // Test 2: Search packages
  console.log('\n3. Testing GET /api/packages/search...');
  try {
    const searchResponse = await fetch(`${baseUrl}/api/packages/search?q=nodejs`, {
      headers: { 'Cookie': cookie }
    });
    
    if (searchResponse.ok) {
      const results = await searchResponse.json();
      console.log('✓ Search packages successful, found:', results.length, 'results');
    } else {
      console.error('✗ Search packages failed:', await searchResponse.text());
    }
  } catch (error) {
    console.error('✗ Search packages error:', error);
  }
  
  // Test 3: Export environment
  console.log('\n4. Testing GET /api/projects/1/packages/environment...');
  try {
    const exportResponse = await fetch(`${baseUrl}/api/projects/1/packages/environment`, {
      headers: { 'Cookie': cookie }
    });
    
    if (exportResponse.ok) {
      const env = await exportResponse.json();
      console.log('✓ Export environment successful:', env.environment);
    } else {
      console.error('✗ Export environment failed:', await exportResponse.text());
    }
  } catch (error) {
    console.error('✗ Export environment error:', error);
  }
  
  console.log('\n✅ Package system test complete!');
}

testPackageSystem().catch(console.error);