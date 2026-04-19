import { previewService } from './server/preview/preview-service';
import { storage } from './server/storage';

async function test() {
  try {
    // 1. Create a dummy project
    const user = await storage.getUserByUsername('admin') || await storage.createUser({ 
      username: 'testuser', 
      password: 'testpassword',
      email: 'test@example.com',
      isAdmin: true,
      stripeCustomerId: null,
      subscriptionPlan: 'free',
      subscriptionStatus: 'active'
    });
    
    const project = await storage.createProject({
      name: 'Test Preview Project',
      description: 'Testing the Preview Service',
      ownerId: user.id,
      framework: 'react',
      isPublic: true,
      forkedFromId: null
    });
    
    // 2. Add some files (package.json and index.html)
    await storage.createFile({
      projectId: project.id,
      name: 'package.json',
      path: 'package.json',
      content: JSON.stringify({
        "name": "test-app",
        "scripts": { "dev": "vite" },
        "dependencies": { "react": "^18.2.0" },
        "devDependencies": { "vite": "^4.0.0" }
      }),
      isDirectory: false,
      isFolder: false,
      language: 'json'
    });
    
    await storage.createFile({
      projectId: project.id,
      name: 'index.html',
      path: 'index.html',
      content: '<h1>Hello</h1>',
      isDirectory: false,
      isFolder: false,
      language: 'html'
    });

    console.log("Created project with ID:", project.id);
    
    // 3. Start preview
    const projectIdStr = String(project.id);
    const preview = await previewService.startPreviewFromProject(projectIdStr);
    console.log("Initial status:", preview.status);
    
    // 4. Poll and wait
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1000));
      console.log(`[${i}s] Status:`, preview.status);
      console.log("Logs:", preview.logs.join('\n'));
      if (preview.status === 'running' || preview.status === 'error') {
        break;
      }
    }
  } catch (err) {
    console.error("Test failed", err);
  } finally {
    process.exit(0);
  }
}

test();
