import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';
let authCookie = '';

async function login() {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });
  
  const cookies = response.headers.get('set-cookie');
  if (cookies) {
    authCookie = cookies.split(';')[0];
  }
  
  const data = await response.json();
  console.log('✓ Login successful');
  return data;
}

async function createProject() {
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify({
      name: 'AI Agent Test Project',
      description: 'Testing AI agent file creation',
      language: 'javascript',
      isPublic: false
    })
  });
  
  const project = await response.json();
  console.log('✓ Created project:', project.name);
  return project;
}

async function testAIAgentBuild(projectId: number) {
  console.log('\n3. Testing AI Agent build functionality...');
  
  const response = await fetch(`${API_BASE}/projects/${projectId}/ai/chat`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify({
      message: 'Build me a simple todo app',
      context: {
        mode: 'agent',
        thinking: false,
        highPower: false,
        webSearch: false
      },
      provider: 'openai'
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.log('✗ AI Agent response failed:', error);
    return;
  }
  
  const result = await response.json();
  console.log('✓ AI Agent response received');
  console.log('  Actions:', result.actions?.length || 0);
  
  if (result.actions && result.actions.length > 0) {
    console.log('  Sample actions:');
    result.actions.slice(0, 3).forEach((action: any) => {
      console.log(`    - ${action.type}: ${action.data?.name || action.data?.path || 'N/A'}`);
    });
    
    // Execute the actions
    console.log('\n  Executing actions...');
    const folderMap = new Map<string, number>();
    
    for (const action of result.actions) {
      if (action.type === 'create_folder') {
        const folderResponse = await fetch(`${API_BASE}/projects/${projectId}/files`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': authCookie
          },
          body: JSON.stringify({
            name: action.data.name || action.data.path,
            isFolder: true,
            parentId: action.parentRef ? folderMap.get(action.parentRef) : null
          })
        });
        
        if (folderResponse.ok) {
          const folder = await folderResponse.json();
          if (action.folderRef) {
            folderMap.set(action.folderRef, folder.id);
          }
          console.log(`    ✓ Created folder: ${folder.name}`);
        }
      } else if (action.type === 'create_file') {
        const fileName = action.data.name || (action.data.path && action.data.path.split('/').pop());
        const fileResponse = await fetch(`${API_BASE}/projects/${projectId}/files`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': authCookie
          },
          body: JSON.stringify({
            name: fileName,
            content: action.data.content || '',
            parentId: action.parentRef ? folderMap.get(action.parentRef) : null
          })
        });
        
        if (fileResponse.ok) {
          const file = await fileResponse.json();
          console.log(`    ✓ Created file: ${file.name}`);
        } else {
          const error = await fileResponse.text();
          console.log(`    ✗ Failed to create file ${fileName}: ${error}`);
        }
      }
    }
  }
  
  return result;
}

async function checkProjectFiles(projectId: number) {
  console.log('\n4. Checking created files...');
  
  const response = await fetch(`${API_BASE}/projects/${projectId}/files`, {
    headers: { 'Cookie': authCookie }
  });
  
  const files = await response.json();
  console.log('✓ Project files:', files.length);
  
  if (files.length > 0) {
    console.log('  Created files:');
    files.slice(0, 5).forEach((file: any) => {
      console.log(`    - ${file.name} ${file.isFolder ? '(folder)' : ''}`);
    });
  }
  
  return files;
}

async function main() {
  console.log('Testing AI Agent Build Functionality\n');
  
  try {
    // 1. Login
    console.log('1. Logging in...');
    await login();
    
    // 2. Create a test project
    console.log('\n2. Creating test project...');
    const project = await createProject();
    
    if (!project.id) {
      console.error('Failed to create project');
      return;
    }
    
    // 3. Test AI agent build
    const aiResponse = await testAIAgentBuild(project.id);
    
    // Give it a moment for files to be created
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. Check if files were created
    const files = await checkProjectFiles(project.id);
    
    console.log('\n✅ AI Agent test complete!');
    console.log(`   Total files created: ${files.length}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main().catch(console.error);