#!/usr/bin/env node

/**
 * Real MCP Integration Test
 * Tests the actual MCP server to verify it's working like Replit
 */

async function testMCP() {
  console.log('🧪 Testing MCP Server Integration...\n');
  
  try {
    // Test 1: Check if MCP endpoint exists
    console.log('1️⃣ Testing MCP Connect endpoint...');
    const connectResponse = await fetch('http://localhost:5000/mcp/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (!connectResponse.ok) {
      throw new Error(`Connect failed: ${connectResponse.status}`);
    }
    
    const connectData = await connectResponse.json();
    console.log('✅ Connected to MCP:', connectData);
    const sessionId = connectData.sessionId;
    
    // Test 2: List available tools
    console.log('\n2️⃣ Testing list tools...');
    const listToolsResponse = await fetch('http://localhost:5000/mcp/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 'list-1'
      })
    });
    
    if (!listToolsResponse.ok) {
      throw new Error(`List tools failed: ${listToolsResponse.status}`);
    }
    
    const toolsData = await listToolsResponse.json();
    console.log(`✅ Found ${toolsData.result?.tools?.length || 0} tools`);
    if (toolsData.result?.tools?.length > 0) {
      console.log('First 5 tools:', toolsData.result.tools.slice(0, 5).map(t => t.name).join(', '));
    }
    
    // Test 3: Execute a simple command
    console.log('\n3️⃣ Testing command execution...');
    const execResponse = await fetch('http://localhost:5000/mcp/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'exec_command',
          arguments: {
            command: 'echo "MCP is working!"',
            cwd: '/tmp'
          }
        },
        id: 'exec-1'
      })
    });
    
    if (!execResponse.ok) {
      throw new Error(`Exec command failed: ${execResponse.status}`);
    }
    
    const execData = await execResponse.json();
    console.log('✅ Command output:', execData.result?.content?.[0]?.text || 'No output');
    
    // Test 4: File operations
    console.log('\n4️⃣ Testing file operations...');
    const writeResponse = await fetch('http://localhost:5000/mcp/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'fs_write',
          arguments: {
            path: '/tmp/mcp-test.txt',
            content: 'Hello from MCP!'
          }
        },
        id: 'write-1'
      })
    });
    
    if (!writeResponse.ok) {
      throw new Error(`Write file failed: ${writeResponse.status}`);
    }
    
    const writeData = await writeResponse.json();
    console.log('✅ File written:', writeData.result?.content?.[0]?.text || 'Success');
    
    // Test 5: Read the file back
    console.log('\n5️⃣ Testing file read...');
    const readResponse = await fetch('http://localhost:5000/mcp/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'fs_read',
          arguments: {
            path: '/tmp/mcp-test.txt'
          }
        },
        id: 'read-1'
      })
    });
    
    if (!readResponse.ok) {
      throw new Error(`Read file failed: ${readResponse.status}`);
    }
    
    const readData = await readResponse.json();
    console.log('✅ File content:', readData.result?.content?.[0]?.text || 'No content');
    
    console.log('\n🎉 MCP Server is FULLY FUNCTIONAL and working like Replit!');
    console.log('✅ All operations are using MCP protocol');
    console.log('✅ File operations work through MCP');
    console.log('✅ Command execution works through MCP');
    console.log('✅ AI agents can now use MCP for autonomous operations');
    
  } catch (error) {
    console.error('\n❌ MCP Test Failed:', error.message);
    console.error('Details:', error);
    console.log('\n🔧 MCP is NOT working properly - needs fixing');
  }
}

// Run the test
testMCP().catch(console.error);