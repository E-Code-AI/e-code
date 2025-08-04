import { db } from '../server/db';
import { files } from '../shared/schema';
import fs from 'fs/promises';
import path from 'path';

async function copyFilesToProject() {
  const projectId = 2; // WhatsApp++ AI Chat project
  const sourceDir = 'temp/chat-app';
  
  async function processDirectory(dir: string, relativePath: string = '') {
    const entries = await fs.readdir(path.join(dir), { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const fileRelativePath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        // Create directory entry
        await db.insert(files).values({
          projectId,
          name: entry.name,
          path: fileRelativePath,
          content: '',
          isDirectory: true
        });
        
        // Process subdirectory
        await processDirectory(fullPath, fileRelativePath);
      } else if (entry.isFile()) {
        // Read file content
        const content = await fs.readFile(fullPath, 'utf-8');
        
        // Create file entry
        await db.insert(files).values({
          projectId,
          name: entry.name,
          path: fileRelativePath,
          content,
          isDirectory: false
        });
        
        console.log(`Added file: ${fileRelativePath}`);
      }
    }
  }
  
  try {
    await processDirectory(sourceDir);
    console.log('All chat app files copied successfully!');
  } catch (error) {
    console.error('Error copying files:', error);
  }
  
  process.exit(0);
}

copyFilesToProject();