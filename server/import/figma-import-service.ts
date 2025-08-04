import { createLogger } from '../utils/logger';
import { storage } from '../storage';
import { ProjectImport } from '@shared/schema/imports';

const logger = createLogger('figma-import-service');

export interface FigmaDesign {
  id: string;
  name: string;
  components: FigmaComponent[];
  colors: FigmaColor[];
  typography: FigmaTypography[];
}

export interface FigmaComponent {
  id: string;
  name: string;
  type: string;
  properties: Record<string, any>;
  children?: FigmaComponent[];
}

export interface FigmaColor {
  name: string;
  value: string;
  type: 'primary' | 'secondary' | 'accent' | 'neutral';
}

export interface FigmaTypography {
  name: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  fontFamily: string;
}

export class FigmaImportService {
  private figmaApiKey?: string;
  
  constructor() {
    this.figmaApiKey = process.env.FIGMA_API_KEY;
  }

  async importFromFigma(importData: {
    projectId: number;
    userId: number;
    figmaUrl: string;
  }): Promise<ProjectImport> {
    logger.info(`Starting Figma import for project ${importData.projectId}`);
    
    // Create import record
    const importRecord = await storage.createProjectImport({
      projectId: importData.projectId,
      userId: importData.userId,
      importType: 'figma',
      sourceUrl: importData.figmaUrl,
      status: 'processing'
    });

    try {
      // Extract file key from Figma URL
      const fileKey = this.extractFileKey(importData.figmaUrl);
      if (!fileKey) {
        throw new Error('Invalid Figma URL');
      }

      // Fetch design from Figma API
      const design = await this.fetchFigmaDesign(fileKey);
      
      // Convert Figma design to React components
      const components = await this.convertToReactComponents(design);
      
      // Generate theme from design tokens
      const theme = this.generateTheme(design);
      
      // Create project files
      await this.createProjectFiles(importData.projectId, components, theme);
      
      // Update import status
      await storage.updateProjectImport(importRecord.id, {
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          componentsCreated: components.length,
          designName: design.name
        }
      });
      
      logger.info(`Figma import completed for project ${importData.projectId}`);
      return importRecord;
    } catch (error: any) {
      logger.error('Figma import error:', error);
      
      await storage.updateProjectImport(importRecord.id, {
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }

  private extractFileKey(figmaUrl: string): string | null {
    const match = figmaUrl.match(/figma\.com\/file\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  private async fetchFigmaDesign(fileKey: string): Promise<FigmaDesign> {
    if (!this.figmaApiKey) {
      throw new Error('Figma API key not configured');
    }

    // In production, this would call Figma API
    // For now, return mock structure
    return {
      id: fileKey,
      name: 'Imported Design',
      components: [
        {
          id: '1',
          name: 'Button',
          type: 'COMPONENT',
          properties: {
            backgroundColor: '#007bff',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '4px'
          }
        },
        {
          id: '2',
          name: 'Card',
          type: 'COMPONENT',
          properties: {
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '16px'
          }
        }
      ],
      colors: [
        { name: 'primary', value: '#007bff', type: 'primary' },
        { name: 'secondary', value: '#6c757d', type: 'secondary' }
      ],
      typography: [
        {
          name: 'heading',
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1.2,
          fontFamily: 'Inter'
        }
      ]
    };
  }

  private async convertToReactComponents(design: FigmaDesign): Promise<any[]> {
    const components = [];
    
    for (const component of design.components) {
      const reactComponent = this.generateReactComponent(component);
      components.push({
        name: component.name,
        content: reactComponent
      });
    }
    
    return components;
  }

  private generateReactComponent(component: FigmaComponent): string {
    const { name, properties } = component;
    const propsString = Object.entries(properties)
      .map(([key, value]) => `${key}: '${value}'`)
      .join(',\n    ');

    return `import React from 'react';

interface ${name}Props {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const ${name}: React.FC<${name}Props> = ({ children, className, onClick }) => {
  const styles = {
    ${propsString}
  };

  return (
    <div 
      className={className}
      style={styles}
      onClick={onClick}
    >
      {children}
    </div>
  );
};`;
  }

  private generateTheme(design: FigmaDesign): any {
    return {
      colors: design.colors.reduce((acc, color) => {
        acc[color.type] = color.value;
        return acc;
      }, {} as Record<string, string>),
      typography: design.typography.reduce((acc, typo) => {
        acc[typo.name] = {
          fontSize: `${typo.fontSize}px`,
          fontWeight: typo.fontWeight,
          lineHeight: typo.lineHeight,
          fontFamily: typo.fontFamily
        };
        return acc;
      }, {} as Record<string, any>)
    };
  }

  private async createProjectFiles(projectId: number, components: any[], theme: any): Promise<void> {
    // Create components directory
    await storage.createFile({
      projectId,
      name: 'FigmaComponents',
      path: '/src/components/figma',
      type: 'folder'
    });

    // Create individual component files
    for (const component of components) {
      await storage.createFile({
        projectId,
        name: `${component.name}.tsx`,
        path: `/src/components/figma/${component.name}.tsx`,
        type: 'file',
        content: component.content
      });
    }

    // Create theme file
    await storage.createFile({
      projectId,
      name: 'figma-theme.ts',
      path: '/src/styles/figma-theme.ts',
      type: 'file',
      content: `export const figmaTheme = ${JSON.stringify(theme, null, 2)};`
    });
  }
}

export const figmaImportService = new FigmaImportService();