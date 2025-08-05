import { db } from '../db';
import { storage } from '../storage';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as csv from 'csv-parse';
import { faker } from '@faker-js/faker';
import { sql } from 'drizzle-orm';

export interface DataProvisioningConfig {
  projectId: number;
  type: 'generate' | 'import' | 'seed' | 'migrate' | 'fixture';
  source?: 'csv' | 'json' | 'sql' | 'api' | 'faker';
  target?: 'database' | 'file' | 'api';
  options?: Record<string, any>;
}

export interface DataSchema {
  tableName: string;
  fields: DataField[];
  relationships?: DataRelationship[];
  constraints?: DataConstraint[];
}

export interface DataField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'uuid' | 'json' | 'custom';
  nullable?: boolean;
  unique?: boolean;
  default?: any;
  generator?: string; // faker method name
  pattern?: string; // regex pattern
  min?: number;
  max?: number;
  enum?: any[];
}

export interface DataRelationship {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  targetTable: string;
  foreignKey: string;
  localKey: string;
}

export interface DataConstraint {
  type: 'unique' | 'check' | 'foreign_key';
  fields: string[];
  condition?: string;
}

export interface GeneratedData {
  table: string;
  records: number;
  data: any[];
  metadata?: {
    generatedAt: Date;
    schema: DataSchema;
    relationships: Record<string, any>;
  };
}

export class DataProvisioningService {
  private generators: Map<string, (field: DataField) => any> = new Map();

  constructor() {
    this.initializeGenerators();
  }

  private initializeGenerators() {
    this.generators = new Map([
      ['string', (field) => this.generateString(field)],
      ['number', (field) => this.generateNumber(field)],
      ['boolean', () => faker.datatype.boolean()],
      ['date', () => faker.date.recent()],
      ['email', () => faker.internet.email()],
      ['uuid', () => faker.string.uuid()],
      ['json', () => this.generateJSON()],
      ['custom', (field) => this.generateCustom(field)]
    ]);
  }

  /**
   * Generate test data based on schema
   */
  async generateData(schema: DataSchema, count: number = 100): Promise<GeneratedData> {
    const data: any[] = [];
    const relationships: Record<string, any> = {};

    // Generate base data
    for (let i = 0; i < count; i++) {
      const record: Record<string, any> = {};
      
      for (const field of schema.fields) {
        const generator = this.generators.get(field.type);
        if (generator) {
          record[field.name] = generator(field);
        }
      }
      
      data.push(record);
    }

    // Handle relationships
    if (schema.relationships) {
      for (const rel of schema.relationships) {
        relationships[rel.targetTable] = await this.generateRelatedData(
          schema.tableName,
          rel,
          data
        );
      }
    }

    return {
      table: schema.tableName,
      records: count,
      data,
      metadata: {
        generatedAt: new Date(),
        schema,
        relationships
      }
    };
  }

  /**
   * Import data from various sources
   */
  async importData(config: DataProvisioningConfig): Promise<any> {
    switch (config.source) {
      case 'csv':
        return await this.importCSV(config);
      case 'json':
        return await this.importJSON(config);
      case 'sql':
        return await this.importSQL(config);
      case 'api':
        return await this.importFromAPI(config);
      default:
        throw new Error(`Unsupported import source: ${config.source}`);
    }
  }

  /**
   * Seed database with predefined data sets
   */
  async seedDatabase(projectId: number, seedType: string): Promise<void> {
    const seedConfigs: Record<string, DataSchema[]> = {
      'ecommerce': [
        {
          tableName: 'products',
          fields: [
            { name: 'id', type: 'uuid', unique: true },
            { name: 'name', type: 'string', generator: 'commerce.productName' },
            { name: 'description', type: 'string', generator: 'commerce.productDescription' },
            { name: 'price', type: 'number', min: 10, max: 1000 },
            { name: 'category', type: 'string', enum: ['Electronics', 'Clothing', 'Food', 'Books'] },
            { name: 'stock', type: 'number', min: 0, max: 100 },
            { name: 'created_at', type: 'date' }
          ]
        },
        {
          tableName: 'customers',
          fields: [
            { name: 'id', type: 'uuid', unique: true },
            { name: 'name', type: 'string', generator: 'person.fullName' },
            { name: 'email', type: 'email', unique: true },
            { name: 'phone', type: 'string', generator: 'phone.number' },
            { name: 'address', type: 'json' },
            { name: 'created_at', type: 'date' }
          ]
        }
      ],
      'blog': [
        {
          tableName: 'posts',
          fields: [
            { name: 'id', type: 'uuid', unique: true },
            { name: 'title', type: 'string', generator: 'lorem.sentence' },
            { name: 'content', type: 'string', generator: 'lorem.paragraphs' },
            { name: 'author', type: 'string', generator: 'person.fullName' },
            { name: 'tags', type: 'json' },
            { name: 'published', type: 'boolean' },
            { name: 'published_at', type: 'date' }
          ]
        }
      ],
      'saas': [
        {
          tableName: 'users',
          fields: [
            { name: 'id', type: 'uuid', unique: true },
            { name: 'email', type: 'email', unique: true },
            { name: 'name', type: 'string', generator: 'person.fullName' },
            { name: 'role', type: 'string', enum: ['admin', 'user', 'guest'] },
            { name: 'subscription', type: 'string', enum: ['free', 'basic', 'pro', 'enterprise'] },
            { name: 'active', type: 'boolean' },
            { name: 'created_at', type: 'date' }
          ]
        },
        {
          tableName: 'organizations',
          fields: [
            { name: 'id', type: 'uuid', unique: true },
            { name: 'name', type: 'string', generator: 'company.name' },
            { name: 'domain', type: 'string', generator: 'internet.domainName' },
            { name: 'plan', type: 'string', enum: ['startup', 'growth', 'enterprise'] },
            { name: 'employees', type: 'number', min: 1, max: 1000 },
            { name: 'created_at', type: 'date' }
          ]
        }
      ]
    };

    const schemas = seedConfigs[seedType];
    if (!schemas) {
      throw new Error(`Unknown seed type: ${seedType}`);
    }

    for (const schema of schemas) {
      const data = await this.generateData(schema, 50);
      await this.insertDataToDatabase(projectId, data);
    }
  }

  /**
   * Create data fixtures for testing
   */
  async createFixtures(projectId: number, fixtureName: string): Promise<void> {
    const fixturesPath = path.join(process.cwd(), 'projects', projectId.toString(), 'fixtures');
    await fs.mkdir(fixturesPath, { recursive: true });

    const fixtures: Record<string, any> = {
      'auth': {
        users: [
          { id: 1, email: 'admin@example.com', password: 'hashed_password', role: 'admin' },
          { id: 2, email: 'user@example.com', password: 'hashed_password', role: 'user' }
        ],
        sessions: [
          { id: 'session_1', userId: 1, token: 'admin_token', expiresAt: new Date(Date.now() + 86400000) }
        ]
      },
      'test': {
        testUsers: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          name: faker.person.fullName(),
          email: faker.internet.email(),
          age: faker.number.int({ min: 18, max: 80 })
        }))
      }
    };

    const fixtureData = fixtures[fixtureName] || fixtures['test'];
    await fs.writeFile(
      path.join(fixturesPath, `${fixtureName}.json`),
      JSON.stringify(fixtureData, null, 2)
    );
  }

  /**
   * Migrate data between different formats or schemas
   */
  async migrateData(config: DataProvisioningConfig): Promise<void> {
    const { projectId, options } = config;
    
    if (!options?.sourceTable || !options?.targetTable) {
      throw new Error('Source and target tables required for migration');
    }

    // Get source data
    const sourceData = await this.getTableData(projectId, options.sourceTable);
    
    // Apply transformations
    const transformedData = await this.transformData(
      sourceData,
      options.transformations || []
    );
    
    // Insert into target
    await this.insertDataToDatabase(projectId, {
      table: options.targetTable,
      records: transformedData.length,
      data: transformedData
    });
  }

  /**
   * Generate realistic data using faker
   */
  private generateString(field: DataField): string {
    if (field.enum) {
      return faker.helpers.arrayElement(field.enum);
    }
    
    if (field.generator) {
      const [category, method] = field.generator.split('.');
      return (faker as any)[category]?.[method]?.() || faker.lorem.word();
    }
    
    if (field.pattern) {
      return faker.helpers.fromRegExp(field.pattern);
    }
    
    return faker.lorem.word();
  }

  private generateNumber(field: DataField): number {
    return faker.number.int({ 
      min: field.min || 0, 
      max: field.max || 100 
    });
  }

  private generateJSON(): any {
    return {
      id: faker.string.uuid(),
      data: faker.lorem.words(3).split(' '),
      timestamp: faker.date.recent()
    };
  }

  private generateCustom(field: DataField): any {
    if (field.generator) {
      // Use Function constructor instead of eval for better security
      try {
        const generatorFunction = new Function('faker', `return ${field.generator}`);
        return generatorFunction(faker);
      } catch (error) {
        console.warn('Invalid generator function:', field.generator);
        return null;
      }
    }
    return null;
  }

  /**
   * Import CSV data
   */
  private async importCSV(config: DataProvisioningConfig): Promise<any> {
    const { projectId, options } = config;
    const filePath = path.join(process.cwd(), 'projects', projectId.toString(), options?.filePath);
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const records: any[] = [];
    
    return new Promise((resolve, reject) => {
      csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true
      })
      .on('data', (data: any) => records.push(data))
      .on('end', () => resolve(records))
      .on('error', reject);
    });
  }

  /**
   * Import JSON data
   */
  private async importJSON(config: DataProvisioningConfig): Promise<any> {
    const { projectId, options } = config;
    const filePath = path.join(process.cwd(), 'projects', projectId.toString(), options?.filePath);
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  }

  /**
   * Import SQL dump
   */
  private async importSQL(config: DataProvisioningConfig): Promise<any> {
    const { projectId, options } = config;
    const filePath = path.join(process.cwd(), 'projects', projectId.toString(), options?.filePath);
    
    const sqlContent = await fs.readFile(filePath, 'utf-8');
    
    // Execute SQL statements
    const statements = sqlContent.split(';').filter(s => s.trim());
    for (const statement of statements) {
      await db.execute(sql.raw(statement));
    }
    
    return { imported: statements.length };
  }

  /**
   * Import data from external API
   */
  private async importFromAPI(config: DataProvisioningConfig): Promise<any> {
    const { options } = config;
    
    if (!options?.url) {
      throw new Error('API URL required');
    }
    
    const response = await fetch(options.url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    return await response.json();
  }

  /**
   * Helper methods
   */
  private async generateRelatedData(
    parentTable: string,
    relationship: DataRelationship,
    parentData: any[]
  ): Promise<any[]> {
    // Generate related data based on relationship type
    const relatedData: any[] = [];
    
    switch (relationship.type) {
      case 'one-to-many':
        for (const parent of parentData) {
          const childCount = faker.number.int({ min: 1, max: 5 });
          for (let i = 0; i < childCount; i++) {
            relatedData.push({
              [relationship.foreignKey]: parent[relationship.localKey],
              ...this.generateRandomRecord(relationship.targetTable)
            });
          }
        }
        break;
      
      case 'one-to-one':
        for (const parent of parentData) {
          relatedData.push({
            [relationship.foreignKey]: parent[relationship.localKey],
            ...this.generateRandomRecord(relationship.targetTable)
          });
        }
        break;
    }
    
    return relatedData;
  }

  private generateRandomRecord(tableName: string): any {
    // Generate a random record based on table name
    const templates: Record<string, any> = {
      'orders': {
        total: faker.number.float({ min: 10, max: 1000, multipleOf: 0.01 }),
        status: faker.helpers.arrayElement(['pending', 'completed', 'cancelled']),
        created_at: faker.date.recent()
      },
      'comments': {
        content: faker.lorem.paragraph(),
        author: faker.person.fullName(),
        created_at: faker.date.recent()
      }
    };
    
    return templates[tableName] || {};
  }

  private async insertDataToDatabase(projectId: number, data: GeneratedData): Promise<void> {
    // Insert data into project's database
    // This would connect to the project's specific database instance
    console.log(`Inserting ${data.records} records into ${data.table} for project ${projectId}`);
    
    // In a real implementation, this would:
    // 1. Connect to project's database
    // 2. Create table if not exists
    // 3. Insert data in batches
    // 4. Handle constraints and relationships
  }

  private async getTableData(projectId: number, tableName: string): Promise<any[]> {
    // Fetch data from project's database table
    // This is a placeholder - would connect to actual project database
    return [];
  }

  private async transformData(data: any[], transformations: any[]): Promise<any[]> {
    // Apply transformations to data
    return data.map(record => {
      const transformed = { ...record };
      
      for (const transform of transformations) {
        if (transform.type === 'rename') {
          transformed[transform.to] = transformed[transform.from];
          delete transformed[transform.from];
        } else if (transform.type === 'convert') {
          transformed[transform.field] = this.convertValue(
            transformed[transform.field],
            transform.targetType
          );
        }
      }
      
      return transformed;
    });
  }

  private convertValue(value: any, targetType: string): any {
    switch (targetType) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return new Date(value);
      default:
        return value;
    }
  }
}

// Export singleton instance
export const dataProvisioningService = new DataProvisioningService();