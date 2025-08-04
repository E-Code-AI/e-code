import { db } from '../server/db';
import { projects } from '../shared/schema';
import { generateUniqueSlug } from '../server/utils/slug';
import { eq, isNull } from 'drizzle-orm';

async function updateProjectSlugs() {
  console.log('Starting project slug update...');
  
  try {
    // Get all projects without slugs
    const projectsWithoutSlugs = await db
      .select()
      .from(projects)
      .where(isNull(projects.slug));
    
    console.log(`Found ${projectsWithoutSlugs.length} projects without slugs`);
    
    for (const project of projectsWithoutSlugs) {
      const slug = await generateUniqueSlug(
        project.name,
        async (slug) => {
          const [existing] = await db
            .select()
            .from(projects)
            .where(eq(projects.slug, slug));
          return !!existing;
        }
      );
      
      await db
        .update(projects)
        .set({ slug })
        .where(eq(projects.id, project.id));
      
      console.log(`Updated project ${project.id} (${project.name}) with slug: ${slug}`);
    }
    
    console.log('Project slug update completed successfully!');
  } catch (error) {
    console.error('Error updating project slugs:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

updateProjectSlugs();