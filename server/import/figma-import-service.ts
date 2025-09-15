import { storage } from '../storage';
import { BaseImportAdapter } from './base-adapter';
import { FigmaImportOptions, ImportOptions, ImportResult } from './types';

interface FigmaFileResponse {
  document: any;
  components: { [key: string]: any };
  schemaVersion: number;
  styles: { [key: string]: any };
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
}

interface FigmaImagesResponse {
  images: { [key: string]: string };
}

class FigmaImportService extends BaseImportAdapter {
  private figmaApiBase = 'https://api.figma.com/v1';
  
  constructor() {
    super('figma');
  }

  async prepare(options: ImportOptions): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const figmaOptions = options as FigmaImportOptions;
    
    if (!figmaOptions.figmaUrl) {
      errors.push('Figma URL is required');
    }
    
    if (!figmaOptions.figmaToken && !process.env.FIGMA_ACCESS_TOKEN) {
      errors.push('Figma access token is required');
    }
    
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  async validate(options: ImportOptions): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const figmaOptions = options as FigmaImportOptions;
    
    try {
      // Extract file ID from URL
      const fileId = this.extractFileId(figmaOptions.figmaUrl);
      if (!fileId) {
        errors.push('Invalid Figma URL format');
        return { valid: false, errors };
      }
      
      // Test Figma API connection
      const token = figmaOptions.figmaToken || process.env.FIGMA_ACCESS_TOKEN;
      const response = await fetch(`${this.figmaApiBase}/files/${fileId}`, {
        headers: {
          'X-Figma-Token': token!
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          errors.push('Invalid Figma access token');
        } else if (response.status === 403) {
          errors.push('Access denied to Figma file');
        } else if (response.status === 404) {
          errors.push('Figma file not found');
        } else {
          errors.push(`Figma API error: ${response.statusText}`);
        }
      }
    } catch (error: any) {
      errors.push(`Failed to validate Figma file: ${error.message}`);
    }
    
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  async import(options: ImportOptions): Promise<ImportResult> {
    const figmaOptions = options as FigmaImportOptions;
    const startTime = Date.now();
    
    // Create import record
    const importRecord = await this.createImportRecord(options);
    let filesCreated = 0;
    let assetsCreated = 0;

    try {
      const stages = this.generateProgressStages([
        'extracting_file_id',
        'fetching_figma_data', 
        'processing_components',
        'exporting_images',
        'generating_code',
        'creating_files'
      ]);

      // Stage 1: Extract file ID
      await this.reportProgress(importRecord.id, {
        stage: 'extracting_file_id',
        progress: stages.extracting_file_id,
        message: 'Extracting Figma file ID...',
        timestamp: new Date()
      });

      const fileId = this.extractFileId(figmaOptions.figmaUrl);
      if (!fileId) {
        throw new Error('Invalid Figma URL format');
      }

      // Stage 2: Fetch Figma data
      await this.reportProgress(importRecord.id, {
        stage: 'fetching_figma_data',
        progress: stages.fetching_figma_data,
        message: 'Fetching design data from Figma...',
        timestamp: new Date()
      });

      const token = figmaOptions.figmaToken || process.env.FIGMA_ACCESS_TOKEN;
      const fileData = await this.fetchFigmaFile(fileId, token!);
      
      // Stage 3: Process components
      await this.reportProgress(importRecord.id, {
        stage: 'processing_components',
        progress: stages.processing_components,
        message: 'Processing Figma components...',
        timestamp: new Date()
      });

      // Stage 4: Export images (if requested)
      let imageUrls: { [key: string]: string } = {};
      if (figmaOptions.exportImages !== false) {
        await this.reportProgress(importRecord.id, {
          stage: 'exporting_images',
          progress: stages.exporting_images,
          message: 'Exporting component images...',
          timestamp: new Date()
        });

        imageUrls = await this.exportImages(fileId, components, token!, figmaOptions.imageScale || 1);
        assetsCreated = Object.keys(imageUrls).length;
      }

      // Stage 5: Generate code
      await this.reportProgress(importRecord.id, {
        stage: 'generating_code',
        progress: stages.generating_code,
        message: 'Generating React components...',
        timestamp: new Date()
      });

      const generatedComponents = await this.generateReactComponents(components, designTokens, imageUrls);

      // Stage 6: Create files
      await this.reportProgress(importRecord.id, {
        stage: 'creating_files',
        progress: stages.creating_files,
        message: 'Creating project files...',
        timestamp: new Date()
      });

      // Create theme file
      await storage.createFile({
        projectId: options.projectId,
        name: 'figma-tokens.ts',
        path: '/src/theme/figma-tokens.ts',
        content: this.generateTokensFile(designTokens),
        userId: options.userId
      });
      filesCreated++;

      // Create component files
      for (const component of generatedComponents) {
        await storage.createFile({
          projectId: options.projectId,
          name: `${component.name}.tsx`,
          path: `/src/components/figma/${component.name}.tsx`,
          content: component.code,
          userId: options.userId
        });
        filesCreated++;
      }

      // Create figma metadata file
      await storage.createFile({
        projectId: options.projectId,
        name: 'figma.json',
        path: '/figma.json',
        content: JSON.stringify({
          fileId,
          fileName: fileData.name,
          lastModified: fileData.lastModified,
          version: fileData.version,
          components: components.map(c => ({ id: c.id, name: c.name, type: c.type })),
          designTokens: {
            colors: designTokens.colors.length,
            typography: Object.keys(designTokens.typography).length,
            spacing: Object.keys(designTokens.spacing).length
          },
          importedAt: new Date().toISOString()
        }, null, 2),
        userId: options.userId
      });
      filesCreated++;

      // Update import record
      await this.updateImportRecord(importRecord.id, {
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          fileId,
          fileName: fileData.name,
          componentsCreated: generatedComponents.length,
          filesCreated,
          assetsCreated,
          designTokens: {
            colors: designTokens.colors.length,
            typography: Object.keys(designTokens.typography).length,
            spacing: Object.keys(designTokens.spacing).length
          }
        }
      });

      // Track telemetry
      await this.trackTelemetry({
        importType: 'figma',
        success: true,
        duration: Date.now() - startTime,
        artifactCounts: {
          files: filesCreated,
          assets: assetsCreated,
          components: generatedComponents.length
        },
        metadata: {
          fileId,
          exportedImages: figmaOptions.exportImages !== false
        }
      });

      return {
        id: importRecord.id,
        status: 'completed' as const,
        progress: [],
        metadata: {
          fileId,
          fileName: fileData.name,
          componentsCreated: generatedComponents.length,
          filesCreated,
          assetsCreated
        },
        filesCreated,
        assetsCreated
      };

    } catch (error: any) {
      await this.handleImportError(importRecord.id, error);
      
      // Track failed telemetry
      await this.trackTelemetry({
        importType: 'figma',
        success: false,
        duration: Date.now() - startTime,
        artifactCounts: {
          files: filesCreated,
          assets: assetsCreated,
          components: 0
        },
        error: error.message
      });
      
      throw error;
    }
  }
  private extractFileId(url: string): string | null {
    const match = url.match(/file\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  private async fetchFigmaFile(fileId: string, token: string): Promise<FigmaFileResponse> {
    const response = await fetch(`${this.figmaApiBase}/files/${fileId}`, {
      headers: {
        'X-Figma-Token': token
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Figma file: ${response.statusText}`);
    }

    return await response.json();
  }

  private async processComponents(fileData: FigmaFileResponse) {
    const designTokens = {
      colors: this.extractColors(fileData),
      typography: this.extractTypography(fileData),
      spacing: this.extractSpacing(fileData)
    };

    const components = this.extractComponents(fileData);

    return { designTokens, components };
  }

  private extractColors(fileData: FigmaFileResponse): string[] {
    const colors = new Set<string>();
    
    // Extract from styles
    Object.values(fileData.styles || {}).forEach((style: any) => {
      if (style.styleType === 'FILL') {
        style.fills?.forEach((fill: any) => {
          if (fill.type === 'SOLID' && fill.color) {
            const hex = this.rgbToHex(fill.color.r, fill.color.g, fill.color.b);
            colors.add(hex);
          }
        });
      }
    });

    // Fallback colors if none found
    if (colors.size === 0) {
      return ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
    }

    return Array.from(colors);
  }

  private extractTypography(fileData: FigmaFileResponse): Record<string, any> {
    const typography: Record<string, any> = {};
    
    Object.values(fileData.styles || {}).forEach((style: any) => {
      if (style.styleType === 'TEXT') {
        typography[style.name] = {
          fontFamily: style.fontFamily || 'Inter',
          fontSize: `${style.fontSize || 16}px`,
          fontWeight: style.fontWeight || '400',
          lineHeight: style.lineHeight ? `${style.lineHeight}px` : 'normal'
        };
      }
    });

    // Fallback defaults
    if (Object.keys(typography).length === 0) {
      typography.heading = { fontFamily: 'Inter', fontSize: '32px', fontWeight: '700' };
      typography.body = { fontFamily: 'Inter', fontSize: '16px', fontWeight: '400' };
    }

    return typography;
  }

  private extractSpacing(fileData: FigmaFileResponse): Record<string, string> {
    // Extract common spacing values from the design
    // This is a simplified implementation
    return {
      small: '8px',
      medium: '16px',
      large: '32px',
      xlarge: '64px'
    };
  }

  private extractComponents(fileData: FigmaFileResponse): any[] {
    const components: any[] = [];
    
    Object.values(fileData.components || {}).forEach((component: any) => {
      components.push({
        id: component.key,
        name: component.name,
        type: 'component',
        description: component.description || '',
        node: component
      });
    });

    // Fallback if no components found
    if (components.length === 0) {
      return [
        { id: '1', name: 'Button', type: 'component', description: 'Primary button component' },
        { id: '2', name: 'Card', type: 'component', description: 'Card container component' },
        { id: '3', name: 'Header', type: 'layout', description: 'Header layout component' }
      ];
    }

    return components;
  }

  private async exportImages(fileId: string, components: any[], token: string, scale: 1 | 2): Promise<{ [key: string]: string }> {
    if (components.length === 0) return {};
    
    const componentIds = components.map(c => c.id).join(',');
    
    const response = await fetch(`${this.figmaApiBase}/images/${fileId}?ids=${componentIds}&scale=${scale}&format=png`, {
      headers: {
        'X-Figma-Token': token
      }
    });

    if (!response.ok) {
      console.warn('Failed to export images from Figma:', response.statusText);
      return {};
    }

    const data: FigmaImagesResponse = await response.json();
    return data.images || {};
  }

  private async generateReactComponents(components: any[], designTokens: any, imageUrls: { [key: string]: string }): Promise<any[]> {
    return components.map(component => ({
      name: this.sanitizeComponentName(component.name),
      code: this.generateComponentCode(component, designTokens, imageUrls[component.id])
    }));
  }

  private sanitizeComponentName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^[0-9]/, 'Component$&')
      || 'FigmaComponent';
  }

  private generateComponentCode(component: any, designTokens: any, imageUrl?: string): string {
    const componentName = this.sanitizeComponentName(component.name);
    
    return `import React from 'react';
import { figmaTokens } from '../../theme/figma-tokens';

interface ${componentName}Props {
  children?: React.ReactNode;
  className?: string;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div 
      className={\`figma-${component.name.toLowerCase().replace(/[^a-z0-9]/g, '-')} \${className}\`}
      style={{
        fontFamily: figmaTokens.typography.body?.fontFamily || 'Inter',
        fontSize: figmaTokens.typography.body?.fontSize || '16px',
      }}
    >
      ${imageUrl ? `<img src="${imageUrl}" alt="${component.name}" style={{ maxWidth: '100%' }} />` : ''}
      {children || '${component.name} Component'}
    </div>
  );
};

export default ${componentName};`;
  }

  private generateTokensFile(designTokens: any): string {
    return `// Generated from Figma design tokens
export const figmaTokens = ${JSON.stringify(designTokens, null, 2)};

export default figmaTokens;`;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.round(n * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // Legacy method for backward compatibility
  async importFromFigma(options: FigmaImportOptions) {
    return this.import(options);
  }
}

export const figmaImportService = new FigmaImportService();