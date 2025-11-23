/**
 * Agent Content Generator Service
 * Phase 2 Executor: Converts file outlines into concrete file content
 * 
 * CRITICAL: This service materializes outline-based file descriptors from fallback plans
 * into actual, runnable file content that can be written to disk.
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('agent-content-generator');

export interface FileOutline {
  path: string;
  outline: string;
  language?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language?: string;
}

/**
 * Generate concrete file content from outline descriptions
 * Used when AI providers fail and fallback plan provides only outlines
 */
class AgentContentGeneratorService {
  /**
   * Expand a file outline into concrete content
   * Uses template-based generation for common file types
   */
  async expandOutline(outline: FileOutline): Promise<GeneratedFile> {
    logger.info(`[ContentGenerator] Expanding outline for ${outline.path}`, {
      language: outline.language
    });

    // Match outline to template based on file path and description
    const content = this.generateContentFromOutline(outline);

    return {
      path: outline.path,
      content,
      language: outline.language
    };
  }

  /**
   * Batch expand multiple outlines
   */
  async expandOutlines(outlines: FileOutline[]): Promise<GeneratedFile[]> {
    const results = await Promise.all(
      outlines.map(outline => this.expandOutline(outline))
    );
    return results;
  }

  /**
   * Template-based content generation
   * Matches file paths and outline descriptions to generate appropriate content
   * ✅ FIX (Nov 23, 2025): Use endsWith() for path matching to handle subdirectories
   */
  private generateContentFromOutline(outline: FileOutline): string {
    const { path, outline: description } = outline;
    const fileName = path.toLowerCase();

    // Package.json - React + TypeScript + Vite + Tailwind starter
    if (fileName.endsWith('package.json')) {
      return JSON.stringify({
        name: 'starter-project',
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build',
          preview: 'vite preview'
        },
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          '@vitejs/plugin-react': '^4.2.0',
          'autoprefixer': '^10.4.16',
          'postcss': '^8.4.32',
          'tailwindcss': '^3.3.6',
          'typescript': '^5.3.3',
          'vite': '^5.0.8'
        }
      }, null, 2);
    }

    // index.html entry point
    if (fileName.endsWith('index.html')) {
      return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Starter Project</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
    }

    // React main entry point
    if (fileName.endsWith('main.tsx') || fileName.endsWith('main.jsx')) {
      return `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
    }

    // Tailwind CSS imports - check outline OR filename for Tailwind indication
    if (fileName.endsWith('index.css') && (description.toLowerCase().includes('tailwind') || description.includes('@tailwind'))) {
      return `@tailwind base;
@tailwind components;
@tailwind utilities;`;
    }

    // Vite configuration
    if (fileName.endsWith('vite.config.ts') || fileName.endsWith('vite.config.js')) {
      return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
})`;
    }

    // PostCSS configuration
    if (fileName.endsWith('postcss.config.js')) {
      return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
    }

    // Tailwind configuration
    if (fileName.endsWith('tailwind.config.js') || fileName.endsWith('tailwind.config.ts')) {
      return `export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}`;
    }

    // TypeScript configuration
    if (fileName.endsWith('tsconfig.json')) {
      return JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true
        },
        include: ['src']
      }, null, 2);
    }

    // App component - extract goal from outline if present
    if (fileName.endsWith('app.tsx') || fileName.endsWith('app.jsx')) {
      const goalMatch = description.match(/goal:\s*"([^"]+)"/i) || 
                       description.match(/goal:\s*([^\n.]+)/i);
      const goal = goalMatch ? goalMatch[1] : 'Welcome to your new project';

      return `export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Project Initialized</h1>
        <p className="text-gray-600">${goal}</p>
      </div>
    </div>
  );
}`;
    }

    // Default fallback - provide sensible content based on file extension
    logger.warn(`[ContentGenerator] No template match for ${path}, using outline-based default`);
    
    // TypeScript/JavaScript files
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx') || fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
      const isReactComponent = fileName.endsWith('.tsx') || fileName.endsWith('.jsx') || 
                              description.toLowerCase().includes('component') || 
                              description.toLowerCase().includes('react');
      
      if (isReactComponent) {
        const componentName = path.split('/').pop()?.replace(/\.(tsx|jsx)$/, '') || 'Component';
        return `export default function ${componentName}() {
  // ${description}
  return (
    <div>
      <h1>${componentName}</h1>
      <p>TODO: Implement component based on outline</p>
    </div>
  );
}`;
      }
      
      // Regular TS/JS file
      return `/**
 * ${description}
 */

// TODO: Implement based on outline
export {};
`;
    }
    
    // CSS files
    if (fileName.endsWith('.css')) {
      return `/* ${description} */

/* TODO: Add styles based on outline */
`;
    }
    
    // JSON files
    if (fileName.endsWith('.json')) {
      return JSON.stringify({
        description: description,
        todo: 'Configure based on outline'
      }, null, 2);
    }
    
    // Markdown files
    if (fileName.endsWith('.md')) {
      return `# ${path.split('/').pop()?.replace('.md', '') || 'Document'}

${description}

TODO: Add content based on outline
`;
    }
    
    // Plain text fallback with outline as comment
    return `${description}\n\nTODO: Implement file content based on outline\n`;
  }
}

export const agentContentGenerator = new AgentContentGeneratorService();
