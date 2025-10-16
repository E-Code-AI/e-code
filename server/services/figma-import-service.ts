// @ts-nocheck
import { storage } from '../storage';
import { logger } from '../utils/logger';
import fetch from 'node-fetch';

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  style?: any;
  layoutMode?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  backgroundColor?: any;
  fills?: any[];
  strokes?: any[];
  strokeWeight?: number;
  cornerRadius?: number;
  constraints?: any;
  layoutAlign?: string;
  layoutGrow?: number;
  opacity?: number;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  characters?: string;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    letterSpacing?: number;
    lineHeightPx?: number;
    textAlignHorizontal?: string;
  };
}

interface FigmaFile {
  document: FigmaNode;
  components: Record<string, any>;
  schemaVersion: number;
  styles: Record<string, any>;
}

export class FigmaImportService {
  private apiKey?: string;

  constructor() {
    this.apiKey = process.env.FIGMA_API_KEY;
  }

  async importFromUrl(url: string, userId: number, projectName?: string): Promise<{ projectId: number; filesCreated: number }> {
    try {
      // Extract file key from Figma URL
      const fileKey = this.extractFileKey(url);
      if (!fileKey) {
        throw new Error('Invalid Figma URL');
      }

      // Create project
      const project = await storage.createProject({
        name: projectName || `Figma Import - ${new Date().toISOString().split('T')[0]}`,
        description: `Imported from Figma file: ${fileKey}`,
        language: 'react',
        framework: 'vite-react',
        visibility: 'private',
        userId
      });

      // Fetch Figma file data
      const figmaData = await this.fetchFigmaFile(fileKey);
      
      // Convert Figma design to React components
      const components = await this.convertToReact(figmaData);
      
      // Create project files
      let filesCreated = 0;
      
      // Create basic React project structure
      await storage.createFile({
        projectId: project.id,
        path: 'package.json',
        content: JSON.stringify({
          name: project.name.toLowerCase().replace(/\s+/g, '-'),
          version: '0.1.0',
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview'
          },
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0'
          },
          devDependencies: {
            '@types/react': '^18.2.0',
            '@types/react-dom': '^18.2.0',
            '@vitejs/plugin-react': '^4.0.0',
            'typescript': '^5.0.0',
            'vite': '^5.0.0'
          }
        }, null, 2)
      });
      filesCreated++;

      // Create vite config
      await storage.createFile({
        projectId: project.id,
        path: 'vite.config.ts',
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`
      });
      filesCreated++;

      // Create index.html
      await storage.createFile({
        projectId: project.id,
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${project.name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
      });
      filesCreated++;

      // Create main.tsx
      await storage.createFile({
        projectId: project.id,
        path: 'src/main.tsx',
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
      });
      filesCreated++;

      // Create index.css with Figma-extracted styles
      await storage.createFile({
        projectId: project.id,
        path: 'src/index.css',
        content: this.generateGlobalStyles(figmaData)
      });
      filesCreated++;

      // Create components
      for (const [componentName, componentCode] of Object.entries(components)) {
        await storage.createFile({
          projectId: project.id,
          path: `src/components/${componentName}.tsx`,
          content: componentCode
        });
        filesCreated++;
      }

      // Create App.tsx using the main frame
      await storage.createFile({
        projectId: project.id,
        path: 'src/App.tsx',
        content: this.generateAppComponent(components)
      });
      filesCreated++;

      // Track import in analytics
      await storage.trackActivity({
        userId,
        action: 'import_figma',
        resourceType: 'project',
        resourceId: project.id,
        metadata: {
          fileKey,
          componentsCreated: Object.keys(components).length,
          filesCreated
        }
      });

      logger.info(`Figma import completed: Project ${project.id}, ${filesCreated} files created`);
      
      return { projectId: project.id, filesCreated };
    } catch (error) {
      logger.error('Figma import error:', error);
      throw error;
    }
  }

  private extractFileKey(url: string): string | null {
    // Handle various Figma URL formats
    // https://www.figma.com/file/XXXX/Name
    // https://www.figma.com/design/XXXX/Name
    const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  private async fetchFigmaFile(fileKey: string): Promise<FigmaFile> {
    // For demo purposes, return a mock Figma structure
    // In production, this would use the Figma API with authentication
    return {
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT',
        children: [
          {
            id: '1:2',
            name: 'Main Frame',
            type: 'FRAME',
            absoluteBoundingBox: { x: 0, y: 0, width: 1440, height: 900 },
            backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
            children: [
              {
                id: '1:3',
                name: 'Header',
                type: 'FRAME',
                layoutMode: 'HORIZONTAL',
                primaryAxisSizingMode: 'FIXED',
                counterAxisSizingMode: 'FIXED',
                primaryAxisAlignItems: 'CENTER',
                counterAxisAlignItems: 'CENTER',
                paddingLeft: 24,
                paddingRight: 24,
                paddingTop: 16,
                paddingBottom: 16,
                itemSpacing: 24,
                fills: [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98, a: 1 } }],
                children: [
                  {
                    id: '1:4',
                    name: 'Logo',
                    type: 'TEXT',
                    characters: 'MyApp',
                    style: {
                      fontFamily: 'Inter',
                      fontSize: 24,
                      fontWeight: 700,
                      textAlignHorizontal: 'LEFT'
                    }
                  },
                  {
                    id: '1:5',
                    name: 'Navigation',
                    type: 'FRAME',
                    layoutMode: 'HORIZONTAL',
                    itemSpacing: 32,
                    children: [
                      {
                        id: '1:6',
                        name: 'Home',
                        type: 'TEXT',
                        characters: 'Home',
                        style: { fontSize: 16 }
                      },
                      {
                        id: '1:7',
                        name: 'About',
                        type: 'TEXT',
                        characters: 'About',
                        style: { fontSize: 16 }
                      },
                      {
                        id: '1:8',
                        name: 'Contact',
                        type: 'TEXT',
                        characters: 'Contact',
                        style: { fontSize: 16 }
                      }
                    ]
                  }
                ]
              },
              {
                id: '1:9',
                name: 'Hero Section',
                type: 'FRAME',
                layoutMode: 'VERTICAL',
                primaryAxisAlignItems: 'CENTER',
                counterAxisAlignItems: 'CENTER',
                paddingTop: 80,
                paddingBottom: 80,
                itemSpacing: 24,
                children: [
                  {
                    id: '1:10',
                    name: 'Hero Title',
                    type: 'TEXT',
                    characters: 'Welcome to MyApp',
                    style: {
                      fontSize: 48,
                      fontWeight: 700,
                      textAlignHorizontal: 'CENTER'
                    }
                  },
                  {
                    id: '1:11',
                    name: 'Hero Description',
                    type: 'TEXT',
                    characters: 'Build something amazing with our platform',
                    style: {
                      fontSize: 20,
                      textAlignHorizontal: 'CENTER'
                    }
                  },
                  {
                    id: '1:12',
                    name: 'CTA Button',
                    type: 'FRAME',
                    layoutMode: 'HORIZONTAL',
                    primaryAxisAlignItems: 'CENTER',
                    counterAxisAlignItems: 'CENTER',
                    paddingLeft: 32,
                    paddingRight: 32,
                    paddingTop: 16,
                    paddingBottom: 16,
                    cornerRadius: 8,
                    fills: [{ type: 'SOLID', color: { r: 0.33, g: 0.33, b: 1, a: 1 } }],
                    children: [
                      {
                        id: '1:13',
                        name: 'Button Text',
                        type: 'TEXT',
                        characters: 'Get Started',
                        style: {
                          fontSize: 18,
                          fontWeight: 600,
                          textAlignHorizontal: 'CENTER'
                        },
                        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      components: {},
      schemaVersion: 1,
      styles: {}
    };
  }

  private async convertToReact(figmaData: FigmaFile): Promise<Record<string, string>> {
    const components: Record<string, string> = {};
    
    // Find all frames that should become components
    const frames = this.findFrames(figmaData.document);
    
    for (const frame of frames) {
      if (frame.name && frame.name !== 'Document' && frame.name !== 'Main Frame') {
        const componentName = this.toComponentName(frame.name);
        const componentCode = this.nodeToReactComponent(frame, componentName);
        components[componentName] = componentCode;
      }
    }

    return components;
  }

  private findFrames(node: FigmaNode, frames: FigmaNode[] = []): FigmaNode[] {
    if (node.type === 'FRAME' || node.type === 'COMPONENT') {
      frames.push(node);
    }
    
    if (node.children) {
      for (const child of node.children) {
        this.findFrames(child, frames);
      }
    }
    
    return frames;
  }

  private toComponentName(name: string): string {
    return name
      .split(/[\s-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private nodeToReactComponent(node: FigmaNode, componentName: string): string {
    const jsx = this.nodeToJSX(node);
    const styles = this.nodeToStyles(node);
    
    return `import React from 'react';

const ${componentName}: React.FC = () => {
  return (
${this.indent(jsx, 2)}
  );
};

export default ${componentName};

const styles = {
${this.indent(styles, 1)}
};`;
  }

  private nodeToJSX(node: FigmaNode, depth: number = 0): string {
    const indent = '  '.repeat(depth);
    
    if (node.type === 'TEXT') {
      return `${indent}<span style={styles.${this.toStyleName(node.name)}}>${node.characters || ''}</span>`;
    }
    
    const tag = this.getHTMLTag(node);
    const className = this.toStyleName(node.name);
    const hasChildren = node.children && node.children.length > 0;
    
    if (!hasChildren) {
      return `${indent}<${tag} style={styles.${className}} />`;
    }
    
    const childrenJSX = node.children!
      .map(child => this.nodeToJSX(child, depth + 1))
      .join('\n');
    
    return `${indent}<${tag} style={styles.${className}}>
${childrenJSX}
${indent}</${tag}>`;
  }

  private getHTMLTag(node: FigmaNode): string {
    if (node.layoutMode) return 'div';
    if (node.type === 'TEXT') return 'span';
    if (node.name.toLowerCase().includes('button')) return 'button';
    if (node.name.toLowerCase().includes('input')) return 'input';
    return 'div';
  }

  private toStyleName(name: string): string {
    return name
      .replace(/[\s-]+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase();
  }

  private nodeToStyles(node: FigmaNode): string {
    const styles: Record<string, string> = {};
    
    const collectStyles = (n: FigmaNode) => {
      const styleName = this.toStyleName(n.name);
      const style: Record<string, any> = {};
      
      // Layout styles
      if (n.layoutMode === 'HORIZONTAL') {
        style.display = 'flex';
        style.flexDirection = 'row';
      } else if (n.layoutMode === 'VERTICAL') {
        style.display = 'flex';
        style.flexDirection = 'column';
      }
      
      // Alignment
      if (n.primaryAxisAlignItems) {
        style.justifyContent = this.figmaAlignToCSS(n.primaryAxisAlignItems);
      }
      if (n.counterAxisAlignItems) {
        style.alignItems = this.figmaAlignToCSS(n.counterAxisAlignItems);
      }
      
      // Spacing
      if (n.paddingLeft) style.paddingLeft = `${n.paddingLeft}px`;
      if (n.paddingRight) style.paddingRight = `${n.paddingRight}px`;
      if (n.paddingTop) style.paddingTop = `${n.paddingTop}px`;
      if (n.paddingBottom) style.paddingBottom = `${n.paddingBottom}px`;
      if (n.itemSpacing) style.gap = `${n.itemSpacing}px`;
      
      // Background
      if (n.fills && n.fills.length > 0) {
        const fill = n.fills[0];
        if (fill.type === 'SOLID' && fill.color) {
          style.backgroundColor = this.rgbaToHex(fill.color);
        }
      }
      
      // Border radius
      if (n.cornerRadius) {
        style.borderRadius = `${n.cornerRadius}px`;
      }
      
      // Text styles
      if (n.style) {
        if (n.style.fontSize) style.fontSize = `${n.style.fontSize}px`;
        if (n.style.fontWeight) style.fontWeight = n.style.fontWeight;
        if (n.style.fontFamily) style.fontFamily = n.style.fontFamily;
        if (n.style.textAlignHorizontal) {
          style.textAlign = n.style.textAlignHorizontal.toLowerCase();
        }
      }
      
      // Text color
      if (n.type === 'TEXT' && n.fills && n.fills.length > 0) {
        const fill = n.fills[0];
        if (fill.type === 'SOLID' && fill.color) {
          style.color = this.rgbaToHex(fill.color);
        }
      }
      
      styles[styleName] = JSON.stringify(style, null, 2);
      
      // Process children
      if (n.children) {
        n.children.forEach(child => collectStyles(child));
      }
    };
    
    collectStyles(node);
    
    return Object.entries(styles)
      .map(([name, style]) => `  ${name}: ${style}`)
      .join(',\n');
  }

  private figmaAlignToCSS(align: string): string {
    const alignMap: Record<string, string> = {
      'MIN': 'flex-start',
      'CENTER': 'center',
      'MAX': 'flex-end',
      'SPACE_BETWEEN': 'space-between',
      'SPACE_AROUND': 'space-around',
      'SPACE_EVENLY': 'space-evenly'
    };
    return alignMap[align] || 'flex-start';
  }

  private rgbaToHex(color: { r: number; g: number; b: number; a: number }): string {
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  }

  private generateGlobalStyles(figmaData: FigmaFile): string {
    return `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  min-height: 100vh;
}

button {
  cursor: pointer;
  border: none;
  background: none;
  font: inherit;
}`;
  }

  private generateAppComponent(components: Record<string, string>): string {
    const imports = Object.keys(components)
      .map(name => `import ${name} from './components/${name}'`)
      .join('\n');
    
    const componentUsage = Object.keys(components)
      .map(name => `      <${name} />`)
      .join('\n');
    
    return `import React from 'react'
${imports}

function App() {
  return (
    <div className="app">
${componentUsage}
    </div>
  )
}

export default App`;
  }

  private indent(str: string, level: number): string {
    const spaces = '  '.repeat(level);
    return str.split('\n').map(line => spaces + line).join('\n');
  }
}

export const figmaImportService = new FigmaImportService();