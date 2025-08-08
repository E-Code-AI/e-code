const fetch = require('node-fetch');

async function testAIWithMCP() {
  console.log('Testing AI Agent MCP Integration...\n');
  
  // Login first
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  });
  
  const cookie = loginResponse.headers.get('set-cookie');
  console.log('✓ Logged in as admin\n');
  
  // Create a project with AI
  console.log('Creating project with AI prompt...');
  const createResponse = await fetch('http://localhost:5000/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
    body: JSON.stringify({
      name: 'Test MCP Integration',
      template: 'ai-generated',
      prompt: 'Create a simple hello world HTML page'
    })
  });
  
  const project = await createResponse.json();
  console.log('✓ Project created:', project.id, '\n');
  
  // Wait a bit for AI to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check the logs to see if MCP was used
  console.log('Checking server logs for MCP usage...');
  console.log('Look for "[MCP]" messages in the server output above');
}

testAIWithMCP().catch(console.error);
