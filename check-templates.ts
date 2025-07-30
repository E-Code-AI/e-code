import { db } from './server/db';
import { templates } from './shared/schema';

async function checkTemplates() {
  const allTemplates = await db.select().from(templates);
  console.log('Total templates in database:', allTemplates.length);
  console.log('\nTemplates by category:');
  
  const byCategory = allTemplates.reduce((acc, t) => {
    acc[t.category] = acc[t.category] || [];
    acc[t.category].push(t.name);
    return acc;
  }, {} as Record<string, string[]>);
  
  Object.entries(byCategory).forEach(([category, names]) => {
    console.log(`\n${category}: ${names.length} templates`);
    names.forEach(name => console.log(`  - ${name}`));
  });
  
  process.exit(0);
}

checkTemplates().catch(console.error);