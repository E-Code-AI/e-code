import { createLogger } from '../utils/logger';
import { storage } from '../storage';
import { ProjectImport } from '@shared/schema/imports';

const logger = createLogger('lovable-import-service');

export interface LovableProject {
  id: string;
  name: string;
  description: string;
  stack: LovableStack;
  pages: LovablePage[];
  components: LovableComponent[];
  apiEndpoints: LovableApiEndpoint[];
  database?: LovableDatabase;
}

export interface LovableStack {
  frontend: string;
  backend: string;
  database?: string;
  styling: string;
  deployment: string;
}

export interface LovablePage {
  name: string;
  path: string;
  components: string[];
  layout: string;
}

export interface LovableComponent {
  name: string;
  type: string;
  props: Record<string, any>;
  styles: Record<string, any>;
}

export interface LovableApiEndpoint {
  method: string;
  path: string;
  handler: string;
  authentication: boolean;
}

export interface LovableDatabase {
  type: string;
  schema: Record<string, any>;
}

export class LovableImportService {
  async importFromLovable(importData: {
    projectId: number;
    userId: number;
    lovableUrl: string;
    lovableExportData?: any; // For direct export file upload
  }): Promise<ProjectImport> {
    logger.info(`Starting Lovable import for project ${importData.projectId}`);
    
    // Create import record
    const importRecord = await storage.createProjectImport({
      projectId: importData.projectId,
      userId: importData.userId,
      importType: 'lovable',
      sourceUrl: importData.lovableUrl,
      status: 'processing'
    });

    try {
      // Parse Lovable project
      const lovableProject = importData.lovableExportData
        ? this.parseLovableExport(importData.lovableExportData)
        : await this.fetchLovableProject(importData.lovableUrl);
      
      // Generate project structure
      await this.generateProjectStructure(importData.projectId, lovableProject);
      
      // Create components
      await this.createComponents(importData.projectId, lovableProject);
      
      // Set up API routes
      await this.setupApiRoutes(importData.projectId, lovableProject);
      
      // Configure database if needed
      if (lovableProject.database) {
        await this.setupDatabase(importData.projectId, lovableProject.database);
      }
      
      // Update import status
      await storage.updateProjectImport(importRecord.id, {
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          stack: lovableProject.stack,
          pagesCreated: lovableProject.pages.length,
          componentsCreated: lovableProject.components.length,
          apiEndpoints: lovableProject.apiEndpoints.length
        }
      });
      
      logger.info(`Lovable import completed for project ${importData.projectId}`);
      return importRecord;
    } catch (error: any) {
      logger.error('Lovable import error:', error);
      
      await storage.updateProjectImport(importRecord.id, {
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }

  private parseLovableExport(exportData: any): LovableProject {
    // Parse Lovable export format
    return {
      id: exportData.id || 'lovable-project',
      name: exportData.name || 'Lovable Project',
      description: exportData.description || '',
      stack: exportData.stack || {
        frontend: 'react',
        backend: 'express',
        database: 'postgresql',
        styling: 'tailwind',
        deployment: 'vercel'
      },
      pages: exportData.pages || [],
      components: exportData.components || [],
      apiEndpoints: exportData.endpoints || [],
      database: exportData.database
    };
  }

  private async fetchLovableProject(lovableUrl: string): Promise<LovableProject> {
    // Extract project ID from URL
    const projectId = this.extractProjectId(lovableUrl);
    if (!projectId) {
      throw new Error('Invalid Lovable URL');
    }

    // In production, this would fetch from Lovable API
    // For now, return a sample project
    return {
      id: projectId,
      name: 'E-Commerce Dashboard',
      description: 'A modern e-commerce admin dashboard built with Lovable',
      stack: {
        frontend: 'react',
        backend: 'express',
        database: 'postgresql',
        styling: 'tailwind',
        deployment: 'vercel'
      },
      pages: [
        {
          name: 'Dashboard',
          path: '/',
          components: ['Navbar', 'Sidebar', 'StatsGrid', 'RevenueChart'],
          layout: 'DashboardLayout'
        },
        {
          name: 'Products',
          path: '/products',
          components: ['Navbar', 'Sidebar', 'ProductsTable', 'ProductFilters'],
          layout: 'DashboardLayout'
        },
        {
          name: 'Orders',
          path: '/orders',
          components: ['Navbar', 'Sidebar', 'OrdersList', 'OrderDetails'],
          layout: 'DashboardLayout'
        }
      ],
      components: [
        {
          name: 'Navbar',
          type: 'navigation',
          props: { logo: true, user: true, notifications: true },
          styles: { height: '64px', background: 'white', shadow: 'sm' }
        },
        {
          name: 'Sidebar',
          type: 'navigation',
          props: { collapsible: true, width: '240px' },
          styles: { background: 'gray.50', borderRight: '1px solid gray.200' }
        },
        {
          name: 'StatsGrid',
          type: 'data-display',
          props: { columns: 4, gap: '24px' },
          styles: { marginBottom: '32px' }
        }
      ],
      apiEndpoints: [
        {
          method: 'GET',
          path: '/api/dashboard/stats',
          handler: 'getDashboardStats',
          authentication: true
        },
        {
          method: 'GET',
          path: '/api/products',
          handler: 'getProducts',
          authentication: true
        },
        {
          method: 'POST',
          path: '/api/products',
          handler: 'createProduct',
          authentication: true
        }
      ],
      database: {
        type: 'postgresql',
        schema: {
          users: {
            id: 'serial primary key',
            email: 'varchar(255) unique not null',
            password: 'varchar(255) not null',
            role: 'varchar(50) default \'user\'',
            createdAt: 'timestamp default current_timestamp'
          },
          products: {
            id: 'serial primary key',
            name: 'varchar(255) not null',
            description: 'text',
            price: 'decimal(10, 2) not null',
            stock: 'integer default 0',
            createdAt: 'timestamp default current_timestamp'
          },
          orders: {
            id: 'serial primary key',
            userId: 'integer references users(id)',
            total: 'decimal(10, 2) not null',
            status: 'varchar(50) default \'pending\'',
            createdAt: 'timestamp default current_timestamp'
          }
        }
      }
    };
  }

  private extractProjectId(lovableUrl: string): string | null {
    const match = lovableUrl.match(/lovable\.(?:dev|ai)\/(?:project\/)?([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  private async generateProjectStructure(projectId: number, project: LovableProject): Promise<void> {
    // Create main directories
    const directories = [
      '/src',
      '/src/components',
      '/src/pages',
      '/src/layouts',
      '/src/api',
      '/src/styles',
      '/src/utils',
      '/server',
      '/server/routes',
      '/server/controllers',
      '/server/models',
      '/server/middleware'
    ];

    for (const dir of directories) {
      await storage.createFile({
        projectId,
        name: dir.split('/').pop() || 'folder',
        path: dir,
        type: 'folder'
      });
    }

    // Create configuration files
    await this.createConfigFiles(projectId, project);
  }

  private async createConfigFiles(projectId: number, project: LovableProject): Promise<void> {
    // Package.json
    const packageJson = {
      name: project.name.toLowerCase().replace(/\s+/g, '-'),
      version: "1.0.0",
      description: project.description,
      scripts: {
        dev: "concurrently \"npm run server\" \"npm run client\"",
        server: "tsx watch server/index.ts",
        client: "vite",
        build: "vite build",
        start: "NODE_ENV=production tsx server/index.ts"
      },
      dependencies: {
        express: "^4.18.0",
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        "react-router-dom": "^6.0.0",
        axios: "^1.0.0",
        ...(project.database ? { pg: "^8.0.0", drizzle: "^0.28.0" } : {})
      },
      devDependencies: {
        "@types/react": "^18.0.0",
        "@types/react-dom": "^18.0.0",
        "@vitejs/plugin-react": "^4.0.0",
        typescript: "^5.0.0",
        vite: "^4.0.0",
        concurrently: "^7.0.0",
        tsx: "^3.0.0",
        ...(project.stack.styling === 'tailwind' ? {
          tailwindcss: "^3.0.0",
          autoprefixer: "^10.0.0",
          postcss: "^8.0.0"
        } : {})
      }
    };

    await storage.createFile({
      projectId,
      name: 'package.json',
      path: '/package.json',
      type: 'file',
      content: JSON.stringify(packageJson, null, 2)
    });

    // Tailwind config if using Tailwind
    if (project.stack.styling === 'tailwind') {
      const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;

      await storage.createFile({
        projectId,
        name: 'tailwind.config.js',
        path: '/tailwind.config.js',
        type: 'file',
        content: tailwindConfig
      });
    }
  }

  private async createComponents(projectId: number, project: LovableProject): Promise<void> {
    for (const component of project.components) {
      const componentCode = this.generateComponentCode(component, project.stack);
      
      await storage.createFile({
        projectId,
        name: `${component.name}.tsx`,
        path: `/src/components/${component.name}.tsx`,
        type: 'file',
        content: componentCode
      });
    }

    // Create pages
    for (const page of project.pages) {
      const pageCode = this.generatePageCode(page, project.stack);
      
      await storage.createFile({
        projectId,
        name: `${page.name}.tsx`,
        path: `/src/pages/${page.name}.tsx`,
        type: 'file',
        content: pageCode
      });
    }
  }

  private generateComponentCode(component: LovableComponent, stack: LovableStack): string {
    const { name, type, props } = component;
    const useTailwind = stack.styling === 'tailwind';

    return `import React from 'react';
${useTailwind ? '' : "import './styles/" + name + ".css';"}

interface ${name}Props {
  ${Object.entries(props).map(([key, value]) => 
    `${key}?: ${typeof value === 'boolean' ? 'boolean' : 
               typeof value === 'number' ? 'number' : 'string'};`
  ).join('\n  ')}
}

export const ${name}: React.FC<${name}Props> = (props) => {
  return (
    <div className="${useTailwind ? this.generateTailwindClasses(component) : name.toLowerCase()}">
      {/* ${type} component implementation */}
      <div>
        ${name} Component
      </div>
    </div>
  );
};

export default ${name};`;
  }

  private generatePageCode(page: LovablePage, stack: LovableStack): string {
    const imports = page.components.map(comp => 
      `import ${comp} from '../components/${comp}';`
    ).join('\n');

    return `import React from 'react';
${imports}
${page.layout ? `import ${page.layout} from '../layouts/${page.layout}';` : ''}

export const ${page.name}Page: React.FC = () => {
  return (
    ${page.layout ? `<${page.layout}>` : '<div>'}
      <div className="page-${page.name.toLowerCase()}">
        ${page.components.map(comp => `<${comp} />`).join('\n        ')}
      </div>
    ${page.layout ? `</${page.layout}>` : '</div>'}
  );
};

export default ${page.name}Page;`;
  }

  private generateTailwindClasses(component: LovableComponent): string {
    const { styles } = component;
    const classes = [];

    if (styles.background) classes.push(`bg-${styles.background}`);
    if (styles.shadow) classes.push(`shadow-${styles.shadow}`);
    if (styles.height) classes.push('h-16'); // Convert to Tailwind units
    if (styles.marginBottom) classes.push('mb-8');

    return classes.join(' ');
  }

  private async setupApiRoutes(projectId: number, project: LovableProject): Promise<void> {
    // Create API routes file
    const routesCode = this.generateApiRoutes(project.apiEndpoints);
    
    await storage.createFile({
      projectId,
      name: 'routes.ts',
      path: '/server/routes/api.ts',
      type: 'file',
      content: routesCode
    });

    // Create controllers
    for (const endpoint of project.apiEndpoints) {
      const controllerCode = this.generateController(endpoint);
      
      await storage.createFile({
        projectId,
        name: `${endpoint.handler}.ts`,
        path: `/server/controllers/${endpoint.handler}.ts`,
        type: 'file',
        content: controllerCode
      });
    }
  }

  private generateApiRoutes(endpoints: LovableApiEndpoint[]): string {
    const controllerImports = [...new Set(endpoints.map(e => e.handler))]
      .map(handler => `import { ${handler} } from '../controllers/${handler}';`)
      .join('\n');

    const routes = endpoints.map(endpoint => {
      const middleware = endpoint.authentication ? ', authenticate' : '';
      return `router.${endpoint.method.toLowerCase()}('${endpoint.path}'${middleware}, ${endpoint.handler});`;
    }).join('\n');

    return `import { Router } from 'express';
import { authenticate } from '../middleware/auth';
${controllerImports}

const router = Router();

${routes}

export default router;`;
  }

  private generateController(endpoint: LovableApiEndpoint): string {
    return `import { Request, Response } from 'express';

export const ${endpoint.handler} = async (req: Request, res: Response) => {
  try {
    // TODO: Implement ${endpoint.handler} logic
    res.json({
      success: true,
      message: '${endpoint.handler} endpoint',
      data: {}
    });
  } catch (error) {
    console.error('Error in ${endpoint.handler}:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};`;
  }

  private async setupDatabase(projectId: number, database: LovableDatabase): Promise<void> {
    // Create database schema file
    const schemaCode = this.generateDatabaseSchema(database);
    
    await storage.createFile({
      projectId,
      name: 'schema.ts',
      path: '/server/models/schema.ts',
      type: 'file',
      content: schemaCode
    });

    // Create migration file
    const migrationCode = this.generateMigration(database);
    
    await storage.createFile({
      projectId,
      name: '001_initial_schema.sql',
      path: '/migrations/001_initial_schema.sql',
      type: 'file',
      content: migrationCode
    });
  }

  private generateDatabaseSchema(database: LovableDatabase): string {
    const tables = Object.entries(database.schema).map(([tableName, columns]) => {
      const columnDefs = Object.entries(columns as Record<string, string>)
        .map(([colName, colType]) => `  ${colName}: ${this.convertToTsType(colType)},`)
        .join('\n');

      return `export interface ${this.capitalize(tableName)} {
${columnDefs}
}`;
    }).join('\n\n');

    return `// Database schema types
${tables}`;
  }

  private generateMigration(database: LovableDatabase): string {
    const tables = Object.entries(database.schema).map(([tableName, columns]) => {
      const columnDefs = Object.entries(columns as Record<string, string>)
        .map(([colName, colType]) => `  ${colName} ${colType}`)
        .join(',\n');

      return `CREATE TABLE ${tableName} (
${columnDefs}
);`;
    }).join('\n\n');

    return `-- Initial database schema
${tables}`;
  }

  private convertToTsType(sqlType: string): string {
    if (sqlType.includes('int')) return 'number';
    if (sqlType.includes('decimal') || sqlType.includes('numeric')) return 'number';
    if (sqlType.includes('varchar') || sqlType.includes('text')) return 'string';
    if (sqlType.includes('timestamp') || sqlType.includes('date')) return 'Date';
    if (sqlType.includes('boolean')) return 'boolean';
    return 'any';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export const lovableImportService = new LovableImportService();