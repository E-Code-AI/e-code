#!/usr/bin/env node
/**
 * Fix .replit configuration for publishing
 * Problem: Replit only allows 1 external port for deployments
 * Solution: Remove all extra port configurations, keep only port 5000 -> 80
 */

const fs = require('fs');
const path = require('path');

const REPLIT_FILE = path.join(__dirname, '.replit');

console.log('🔧 Fixing .replit configuration for publishing...\n');

try {
  // Read current .replit file
  const content = fs.readFileSync(REPLIT_FILE, 'utf8');
  console.log('✓ Read .replit file');

  // Split into lines
  const lines = content.split('\n');
  
  // Find the first [[ports]] section and remove all subsequent ones
  let insideFirstPort = false;
  let insideOtherPort = false;
  let firstPortEndLine = -1;
  
  const filteredLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect [[ports]] sections
    if (line === '[[ports]]') {
      if (!insideFirstPort) {
        // This is the first port section - keep it
        insideFirstPort = true;
        filteredLines.push(lines[i]);
      } else {
        // This is an extra port section - skip it
        insideOtherPort = true;
        console.log(`✗ Removing port at line ${i + 1}`);
        continue;
      }
    }
    // Detect end of first port section
    else if (insideFirstPort && !insideOtherPort && (line.startsWith('[') || line === '')) {
      insideFirstPort = false;
      firstPortEndLine = i;
      filteredLines.push(lines[i]);
    }
    // Detect end of other port sections
    else if (insideOtherPort && (line.startsWith('[') || (line === '' && i + 1 < lines.length && lines[i + 1].trim().startsWith('[')))) {
      insideOtherPort = false;
      // Don't add the line yet, check next iteration
      filteredLines.push(lines[i]);
    }
    // Keep lines that are not inside extra port sections
    else if (!insideOtherPort) {
      filteredLines.push(lines[i]);
    }
  }
  
  // Join and write
  const newContent = filteredLines.join('\n');
  
  // Count ports before and after
  const portsBefore = (content.match(/\[\[ports\]\]/g) || []).length;
  const portsAfter = (newContent.match(/\[\[ports\]\]/g) || []).length;
  
  console.log(`\n📊 Statistics:`);
  console.log(`   Ports before: ${portsBefore}`);
  console.log(`   Ports after:  ${portsAfter}`);
  console.log(`   Removed:      ${portsBefore - portsAfter} extra ports\n`);
  
  if (portsBefore === portsAfter) {
    console.log('✓ Configuration already correct (only 1 port)');
    process.exit(0);
  }
  
  // Backup original file
  const backupFile = REPLIT_FILE + '.backup';
  fs.writeFileSync(backupFile, content, 'utf8');
  console.log(`✓ Created backup: .replit.backup`);
  
  // Write fixed file
  fs.writeFileSync(REPLIT_FILE, newContent, 'utf8');
  console.log('✓ Updated .replit file');
  
  console.log('\n✅ SUCCESS! Your .replit is now configured for publishing.');
  console.log('   You can now click "Publish" again.');
  console.log('\n💡 If something goes wrong, restore with:');
  console.log('   cp .replit.backup .replit\n');
  
} catch (error) {
  console.error('❌ Error fixing .replit:', error.message);
  process.exit(1);
}
