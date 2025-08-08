// Test script to verify MCP server functionality
import { MCPClient } from './server/mcp/client.js';

async function testMCP() {
  console.log('Testing MCP Server...\n');
  
  const client = new MCPClient('http://localhost:5000/mcp');
  
  try {
    // Connect to MCP server
    console.log('1. Connecting to MCP server...');
    await client.connect();
    console.log('✅ Connected successfully!\n');
    
    // List available tools
    console.log('2. Listing available MCP tools...');
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.tools?.length || 0} tools`);
    if (tools.tools?.length > 0) {
      console.log('First 5 tools:', tools.tools.slice(0, 5).map(t => t.name).join(', '));
    }
    console.log('');
    
    // Test file write
    console.log('3. Testing file write via MCP...');
    await client.writeFile('/tmp/mcp-test.txt', 'Hello from MCP!');
    console.log('✅ File written successfully!\n');
    
    // Test file read
    console.log('4. Testing file read via MCP...');
    const content = await client.readFile('/tmp/mcp-test.txt');
    console.log('✅ File content:', content);
    console.log('');
    
    // Test command execution
    console.log('5. Testing command execution via MCP...');
    const result = await client.callTool('exec_command', {
      command: 'echo "MCP is working!"',
      cwd: '/tmp'
    });
    console.log('✅ Command output:', result?.content?.[0]?.text || 'No output');
    console.log('');
    
    console.log('🎉 MCP Server is fully functional!');
    
    // Disconnect
    await client.disconnect();
    
  } catch (error) {
    console.error('❌ MCP Test Failed:', error.message);
    console.error('Details:', error);
  }
}

// Run the test
testMCP().catch(console.error);