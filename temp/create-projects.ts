import { db } from '../server/db';
import { projects, files } from '../shared/schema';

async function createProjects() {
  try {
    // Create AI Chat Application
    const [chatApp] = await db.insert(projects).values({
      name: 'WhatsApp++ AI Chat',
      description: 'Advanced AI-powered chat application with intelligent features, end-to-end encryption, and multi-modal messaging',
      language: 'typescript',
      visibility: 'public',
      ownerId: 1
    }).returning();

    console.log('Created AI Chat App:', chatApp.id);

    // Create CRM Application
    const [crmApp] = await db.insert(projects).values({
      name: 'SalesForcePro CRM',
      description: 'Enterprise-grade CRM system with full sales pipeline management, customer analytics, and automation',
      language: 'typescript', 
      visibility: 'public',
      ownerId: 1
    }).returning();

    console.log('Created CRM App:', crmApp.id);

    // Create E-commerce Application
    const [ecommerceApp] = await db.insert(projects).values({
      name: 'SolarTech Fortune500 Store',
      description: 'Enterprise e-commerce platform for solar products with Fortune 500 design standards',
      language: 'typescript',
      visibility: 'public', 
      ownerId: 1
    }).returning();

    console.log('Created E-commerce App:', ecommerceApp.id);

    console.log('All projects created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating projects:', error);
    process.exit(1);
  }
}

createProjects();