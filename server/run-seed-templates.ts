// Script to seed templates into the database
import { storage } from "./storage";

async function runSeedTemplates() {
  try {
    console.log('Starting templates seeding...');
    
    // Call the seedTemplates method from storage
    await storage.seedTemplates();
    
    // Verify the templates were seeded
    const templates = await storage.getAllTemplates();
    console.log(`✓ Successfully seeded ${templates.length} templates`);
    console.log('Templates in database:');
    templates.forEach(t => {
      console.log(`  - ${t.name} (${t.slug})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  }
}

// Run the seeding
runSeedTemplates();