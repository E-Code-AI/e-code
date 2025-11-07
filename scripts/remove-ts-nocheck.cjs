#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all files with @ts-nocheck
function findFilesWithTsNoCheck(dir) {
  const result = [];
  
  try {
    // Use grep to find files with @ts-nocheck
    const output = execSync(`grep -r "^// @ts-nocheck" ${dir} --include="*.ts" --include="*.tsx" -l 2>/dev/null || true`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });
    
    if (output) {
      result.push(...output.split('\n').filter(Boolean));
    }
  } catch (error) {
    console.error('Error finding files:', error.message);
  }
  
  return result;
}

// Remove @ts-nocheck from a file
function removeTsNoCheck(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Remove @ts-nocheck comment from the beginning of the file
    const newContent = content.replace(/^\/\/ @ts-nocheck\n?/m, '');
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      return true;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
  
  return false;
}

// Main function
function main() {
  console.log('Finding files with @ts-nocheck...\n');
  
  // Process client files
  const clientFiles = findFilesWithTsNoCheck('client/src');
  console.log(`Found ${clientFiles.length} client files with @ts-nocheck`);
  
  // Process server files  
  const serverFiles = findFilesWithTsNoCheck('server');
  console.log(`Found ${serverFiles.length} server files with @ts-nocheck`);
  
  // Process shared files
  const sharedFiles = findFilesWithTsNoCheck('shared');
  console.log(`Found ${sharedFiles.length} shared files with @ts-nocheck`);
  
  const allFiles = [...clientFiles, ...serverFiles, ...sharedFiles];
  console.log(`\nTotal files to process: ${allFiles.length}\n`);
  
  // Process files in batches
  const batchSize = 10;
  let processedCount = 0;
  let modifiedCount = 0;
  
  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allFiles.length/batchSize)}...`);
    
    for (const filePath of batch) {
      if (removeTsNoCheck(filePath)) {
        console.log(`  ✓ Removed @ts-nocheck from: ${filePath}`);
        modifiedCount++;
      }
      processedCount++;
    }
    
    // Show progress
    const progress = Math.round((processedCount / allFiles.length) * 100);
    console.log(`Progress: ${progress}% (${processedCount}/${allFiles.length})\n`);
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total files processed: ${processedCount}`);
  console.log(`Files modified: ${modifiedCount}`);
  console.log(`Files skipped: ${processedCount - modifiedCount}`);
  
  if (modifiedCount > 0) {
    console.log('\n✨ Success! @ts-nocheck has been removed from all files.');
    console.log('Run "npm run type-check" to verify TypeScript compilation.');
  }
}

// Run the script
main();