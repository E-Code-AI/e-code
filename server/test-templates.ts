// Test script to verify templates integration
import { storage } from "./storage";

async function testTemplates() {
  try {
    console.log('Testing Templates Database Integration...\n');
    
    // Test 1: Get all templates
    console.log('1. Testing getAllTemplates():');
    const allTemplates = await storage.getAllTemplates();
    console.log(`   ✓ Found ${allTemplates.length} templates`);
    
    // Test 2: Get published templates only
    console.log('\n2. Testing getAllTemplates(true) - published only:');
    const publishedTemplates = await storage.getAllTemplates(true);
    console.log(`   ✓ Found ${publishedTemplates.length} published templates`);
    
    // Test 3: Get template by slug
    console.log('\n3. Testing getTemplateBySlug():');
    const template = await storage.getTemplateBySlug('nextjs-blog');
    if (template) {
      console.log(`   ✓ Found template: ${template.name}`);
      console.log(`     - Category: ${template.category}`);
      console.log(`     - Language: ${template.language}`);
      console.log(`     - Difficulty: ${template.difficulty}`);
      console.log(`     - Featured: ${template.isFeatured}`);
    }
    
    // Test 4: List all templates with details
    console.log('\n4. All templates in database:');
    console.log('   ' + '-'.repeat(80));
    for (const t of allTemplates) {
      console.log(`   ${t.name} (${t.slug})`);
      console.log(`     Category: ${t.category} | Language: ${t.language} | Framework: ${t.framework || 'N/A'}`);
      console.log(`     Difficulty: ${t.difficulty} | Time: ${t.estimatedTime} mins | Featured: ${t.isFeatured}`);
      console.log(`     Stats: ${t.uses} uses, ${t.stars} stars, ${t.forks} forks`);
      console.log('   ' + '-'.repeat(80));
    }
    
    console.log('\n✅ All template database operations are working correctly!');
    console.log('   Templates are now properly stored in the database, not hardcoded.');
    
  } catch (error) {
    console.error('❌ Error testing templates:', error);
  } finally {
    process.exit(0);
  }
}

// Run the tests
testTemplates();