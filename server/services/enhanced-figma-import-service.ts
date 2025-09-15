import { storage } from '../storage';

interface FigmaImportOptions {
  projectId: number;
  userId: number;
  figmaUrl: string;
  accessToken: string;
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fills?: any[];
  strokes?: any[];
  effects?: any[];
  cornerRadius?: number;
  characters?: string;
  style?: any;
}

interface FigmaFile {
  document: FigmaNode;
  components: Record<string, any>;
  styles: Record<string, any>;
}

interface DesignToken {
  name: string;
  value: string;
  type: 'color' | 'typography' | 'spacing' | 'shadow' | 'border-radius';
  description?: string;
}

export class EnhancedFigmaImportService {
  private readonly figmaApiUrl = 'https://api.figma.com/v1';
  
  async importFromFigma(options: FigmaImportOptions) {
    const { projectId, userId, figmaUrl, accessToken } = options;
    
    // Create import record
    const importRecord = await storage.createProjectImport({
      projectId,
      userId,
      type: 'figma',
      url: figmaUrl,
      status: 'processing',
      metadata: {}
    });

    try {
      // Extract Figma file ID from URL
      const fileId = this.extractFileId(figmaUrl);
      if (!fileId) {
        throw new Error('Invalid Figma URL format');
      }
      
      // Fetch file data from Figma API
      const fileData = await this.fetchFigmaFile(fileId, accessToken);
      
      // Extract design tokens
      const designTokens = await this.extractDesignTokens(fileData, accessToken);
      
      // Extract components
      const components = await this.extractComponents(fileData, fileId, accessToken);
      
      // Generate code files
      const generatedFiles = await this.generateCodeFiles(designTokens, components);
      
      // Store files in project
      await this.storeGeneratedFiles(generatedFiles, projectId, userId);
      
      // Update import record
      await storage.updateProjectImport(importRecord.id, {
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          fileId,
          componentsCount: components.length,
          tokensCount: designTokens.length,
          filesGenerated: generatedFiles.length
        }
      });
      
      return {
        importRecord,
        designTokens,
        components,
        filesGenerated: generatedFiles
      };
    } catch (error: any) {
      // Update import record with error
      await storage.updateProjectImport(importRecord.id, {
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });
      
      throw error;
    }
  }
  
  async validateFigmaToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.figmaApiUrl}/me`, {
        headers: {
          'X-Figma-Token': accessToken,
        },
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }
  
  async getFigmaUserInfo(accessToken: string): Promise<any> {
    const response = await fetch(`${this.figmaApiUrl}/me`, {
      headers: {
        'X-Figma-Token': accessToken,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user info from Figma');
    }
    
    return response.json();
  }
  
  private extractFileId(figmaUrl: string): string | null {
    const patterns = [
      /figma\.com\/file\/([a-zA-Z0-9]+)/,
      /figma\.com\/design\/([a-zA-Z0-9]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = figmaUrl.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }
  
  private async fetchFigmaFile(fileId: string, accessToken: string): Promise<FigmaFile> {
    const response = await fetch(`${this.figmaApiUrl}/files/${fileId}`, {
      headers: {
        'X-Figma-Token': accessToken,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Figma file: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  }
  
  private async extractDesignTokens(fileData: FigmaFile, accessToken: string): Promise<DesignToken[]> {
    const tokens: DesignToken[] = [];
    
    // Extract color tokens from styles
    for (const [styleId, style] of Object.entries(fileData.styles)) {
      if (style.styleType === 'FILL') {
        tokens.push({
          name: style.name.replace(/\s+/g, '_').toLowerCase(),
          value: this.extractColorValue(style),
          type: 'color',
          description: style.description,
        });
      } else if (style.styleType === 'TEXT') {
        tokens.push({
          name: style.name.replace(/\s+/g, '_').toLowerCase(),
          value: this.extractTypographyValue(style),
          type: 'typography',
          description: style.description,
        });
      }
    }
    
    // Extract spacing tokens from frame structures
    const spacingTokens = this.extractSpacingTokens(fileData.document);
    tokens.push(...spacingTokens);
    
    return tokens;
  }
  
  private async extractComponents(fileData: FigmaFile, fileId: string, accessToken: string): Promise<any[]> {
    const components = [];
    
    for (const [componentId, component] of Object.entries(fileData.components)) {
      try {
        // Get component image
        const imageUrl = await this.getComponentImage(fileId, componentId, accessToken);
        
        components.push({
          id: componentId,
          name: component.name,
          description: component.description,
          imageUrl,
          props: this.extractComponentProps(component),
          node: component,
        });
      } catch (error) {
        console.warn(`Failed to process component ${componentId}:`, error);
      }
    }
    
    return components;
  }
  
  private async getComponentImage(fileId: string, componentId: string, accessToken: string): Promise<string> {
    const response = await fetch(
      `${this.figmaApiUrl}/images/${fileId}?ids=${componentId}&format=png&scale=2`,
      {
        headers: {
          'X-Figma-Token': accessToken,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to get component image');
    }
    
    const data = await response.json();
    return data.images[componentId];
  }
  
  private extractColorValue(style: any): string {
    if (style.fills && style.fills.length > 0) {
      const fill = style.fills[0];
      if (fill.type === 'SOLID') {
        const { r, g, b, a = 1 } = fill.color;
        return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
      }
    }
    return '#000000';
  }
  
  private extractTypographyValue(style: any): string {
    const { fontFamily = 'Inter', fontSize = 16, fontWeight = 400 } = style;
    return `${fontFamily}, ${fontSize}px, ${fontWeight}`;
  }
  
  private extractSpacingTokens(node: FigmaNode, tokens: DesignToken[] = []): DesignToken[] {
    // Simple spacing extraction based on common patterns
    const spacingValues = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64];
    
    spacingValues.forEach((value, index) => {
      tokens.push({
        name: `spacing_${index + 1}`,
        value: `${value}px`,
        type: 'spacing',
        description: `Spacing token ${value}px`,
      });
    });
    
    return tokens;
  }
  
  private extractComponentProps(component: any): Array<{ name: string; type: string; defaultValue?: any }> {
    const props = [];
    
    // Basic props that most components might have
    props.push(
      { name: 'className', type: 'string' },
      { name: 'children', type: 'React.ReactNode' },
    );
    
    // Extract props based on component name patterns
    const componentName = component.name.toLowerCase();
    
    if (componentName.includes('button')) {
      props.push(
        { name: 'onClick', type: '() => void' },
        { name: 'variant', type: '"primary" | "secondary" | "ghost"', defaultValue: '"primary"' },
        { name: 'size', type: '"sm" | "md" | "lg"', defaultValue: '"md"' },
        { name: 'disabled', type: 'boolean', defaultValue: 'false' },
      );
    } else if (componentName.includes('input')) {
      props.push(
        { name: 'value', type: 'string' },
        { name: 'onChange', type: '(value: string) => void' },
        { name: 'placeholder', type: 'string' },
        { name: 'disabled', type: 'boolean', defaultValue: 'false' },
      );
    } else if (componentName.includes('card')) {
      props.push(
        { name: 'title', type: 'string' },
        { name: 'subtitle', type: 'string' },
      );
    }
    
    return props;
  }
  
  private async generateCodeFiles(tokens: DesignToken[], components: any[]): Promise<Array<{ name: string; content: string; path: string }>> {
    const files = [];
    
    // Generate design tokens file
    files.push({
      name: 'design-tokens.ts',
      path: '/src/design-tokens.ts',
      content: this.generateDesignTokensFile(tokens),
    });
    
    // Generate theme file
    files.push({
      name: 'theme.ts',
      path: '/src/theme.ts',
      content: this.generateThemeFile(tokens),
    });
    
    // Generate component files
    for (const component of components) {
      const componentFile = this.generateComponentFile(component);
      files.push({
        name: `${component.name}.tsx`,
        path: `/src/components/${component.name}.tsx`,
        content: componentFile,
      });
    }
    
    // Generate index file
    files.push({
      name: 'index.ts',
      path: '/src/components/index.ts',
      content: this.generateIndexFile(components),
    });
    
    return files;
  }
  
  private generateDesignTokensFile(tokens: DesignToken[]): string {
    const tokensByType = tokens.reduce((acc, token) => {
      if (!acc[token.type]) acc[token.type] = [];
      acc[token.type].push(token);
      return acc;
    }, {} as Record<string, DesignToken[]>);
    
    let content = '// Design tokens extracted from Figma\n\n';
    
    for (const [type, typeTokens] of Object.entries(tokensByType)) {
      content += `export const ${type}Tokens = {\n`;
      typeTokens.forEach(token => {
        content += `  ${token.name}: '${token.value}',${token.description ? ` // ${token.description}` : ''}\n`;
      });
      content += '};\n\n';
    }
    
    return content;
  }
  
  private generateThemeFile(tokens: DesignToken[]): string {
    const colorTokens = tokens.filter(t => t.type === 'color');
    const spacingTokens = tokens.filter(t => t.type === 'spacing');
    const typographyTokens = tokens.filter(t => t.type === 'typography');
    
    return `import { colorTokens, spacingTokens, typographyTokens } from './design-tokens';

export const theme = {
  colors: {
    ${colorTokens.map(t => `${t.name}: colorTokens.${t.name}`).join(',\n    ')}
  },
  spacing: {
    ${spacingTokens.map(t => `${t.name}: spacingTokens.${t.name}`).join(',\n    ')}
  },
  typography: {
    ${typographyTokens.map(t => `${t.name}: typographyTokens.${t.name}`).join(',\n    ')}
  }
};

export type Theme = typeof theme;
`;
  }
  
  private generateComponentFile(component: any): string {
    const componentName = component.name;
    const props = component.props || [];
    
    const propsInterface = props.length > 0 ? `
interface ${componentName}Props {
  ${props.map(prop => {
    const optional = prop.defaultValue ? '?' : '';
    return `${prop.name}${optional}: ${prop.type};`;
  }).join('\n  ')}
}` : '';
    
    const defaultProps = props.filter(p => p.defaultValue).length > 0 ? 
      props.filter(p => p.defaultValue).map(p => `${p.name}: ${p.defaultValue}`).join(',\n  ') : '';
    
    return `import React from 'react';
import { theme } from '../theme';

${propsInterface}

export const ${componentName}: React.FC<${componentName}Props${props.length === 0 ? ' = {}' : ''}> = ({
  ${props.map(p => p.name).join(',\n  ')}${defaultProps ? `,\n  ...props` : ''}
}) => {
  // TODO: Implement component based on Figma design
  // Component image: ${component.imageUrl || 'N/A'}
  
  return (
    <div>
      {/* Implement ${componentName} component */}
      ${component.name} Component
    </div>
  );
};

${componentName}.displayName = '${componentName}';
`;
  }
  
  private generateIndexFile(components: any[]): string {
    return components.map(component => 
      `export { ${component.name} } from './${component.name}';`
    ).join('\n') + '\n';
  }
  
  private async storeGeneratedFiles(files: Array<{ name: string; content: string; path: string }>, projectId: number, userId: number): Promise<void> {
    for (const file of files) {
      await storage.createProjectFile({
        projectId,
        userId,
        name: file.name,
        content: file.content,
        path: file.path,
        type: 'file',
        size: file.content.length,
      });
    }
  }
}

export const enhancedFigmaImportService = new EnhancedFigmaImportService();