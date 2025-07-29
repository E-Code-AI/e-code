import { DatabaseStorage } from '../storage';
import { DeploymentManager } from '../deployment/deployment';

export interface CustomDomain {
  id: number;
  deploymentId: number;
  domain: string;
  status: 'pending' | 'active' | 'failed';
  sslStatus: 'pending' | 'active' | 'failed';
  dnsRecords: {
    type: string;
    name: string;
    value: string;
    verified: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CronJob {
  id: number;
  projectId: number;
  name: string;
  schedule: string; // Cron expression
  command: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  logs?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EnvironmentDeployment {
  id: number;
  projectId: number;
  environment: 'development' | 'staging' | 'production';
  deploymentId: number;
  variables: Record<string, string>;
  active: boolean;
  createdAt: Date;
}

export interface ABTest {
  id: number;
  deploymentId: number;
  name: string;
  variants: {
    name: string;
    traffic: number; // Percentage
    deploymentId: number;
  }[];
  status: 'active' | 'paused' | 'completed';
  metrics: {
    impressions: number;
    conversions: number;
    conversionRate: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export class AdvancedDeploymentService {
  constructor(
    private storage: DatabaseStorage,
    private deploymentManager: DeploymentManager
  ) {}

  async addCustomDomain(deploymentId: number, domain: string): Promise<CustomDomain> {
    // Validate domain format
    if (!this.isValidDomain(domain)) {
      throw new Error('Invalid domain format');
    }
    
    // Generate DNS records for verification
    const dnsRecords = [
      {
        type: 'A',
        name: '@',
        value: '76.76.21.21', // E-Code's IP
        verified: false
      },
      {
        type: 'CNAME',
        name: 'www',
        value: 'cname.e-code.app',
        verified: false
      },
      {
        type: 'TXT',
        name: '_ecode-verify',
        value: `ecode-verify-${Date.now()}`,
        verified: false
      }
    ];
    
    const customDomain = {
      deploymentId,
      domain,
      status: 'pending' as const,
      sslStatus: 'pending' as const,
      dnsRecords,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const id = await this.storage.createCustomDomain(customDomain);
    
    // Start DNS verification process
    this.startDNSVerification(id);
    
    return { ...customDomain, id };
  }

  private isValidDomain(domain: string): boolean {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    return domainRegex.test(domain);
  }

  private async startDNSVerification(domainId: number): Promise<void> {
    // Perform real DNS verification
    try {
      const dns = require('dns').promises;
      const domain = await this.storage.getCustomDomain(domainId);
      
      if (!domain) return;
      
      // Verify DNS records
      const verifiedRecords: any[] = [];
      for (const record of domain.dnsRecords) {
        try {
          if (record.type === 'A') {
            const addresses = await dns.resolve4(domain.domain);
            record.verified = addresses.includes(record.value);
          } else if (record.type === 'CNAME') {
            const cname = await dns.resolveCname(domain.domain);
            record.verified = cname.includes(record.value);
          }
          verifiedRecords.push(record);
        } catch (error) {
          record.verified = false;
          verifiedRecords.push(record);
        }
      }
      
      const allVerified = verifiedRecords.every(r => r.verified);
      
      await this.storage.updateCustomDomain(domainId, {
        status: allVerified ? 'active' : 'pending',
        sslStatus: allVerified ? 'active' : 'pending',
        dnsRecords: verifiedRecords,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('DNS verification failed:', error);
    }
  }

  async createCronJob(data: {
    projectId: number;
    name: string;
    schedule: string;
    command: string;
  }): Promise<CronJob> {
    // Validate cron expression
    if (!this.isValidCronExpression(data.schedule)) {
      throw new Error('Invalid cron expression');
    }
    
    const cronJob = {
      ...data,
      enabled: true,
      nextRun: this.calculateNextRun(data.schedule),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const id = await this.storage.createCronJob(cronJob);
    
    // Schedule the cron job
    this.scheduleCronJob(id, data.schedule, data.command);
    
    return { ...cronJob, id };
  }

  private isValidCronExpression(expression: string): boolean {
    // Simple validation - in production use a proper cron parser
    const parts = expression.split(' ');
    return parts.length === 5;
  }

  private calculateNextRun(schedule: string): Date {
    // Simplified - in production use a proper cron parser
    return new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  }

  private scheduleCronJob(jobId: number, schedule: string, command: string): void {
    // In production, use a proper job scheduler like node-cron
    console.log(`Scheduled cron job ${jobId} with schedule ${schedule}`);
  }

  async createEnvironmentDeployment(data: {
    projectId: number;
    environment: 'development' | 'staging' | 'production';
    variables: Record<string, string>;
  }): Promise<EnvironmentDeployment> {
    // Create deployment for specific environment
    const deployment = await this.deploymentManager.deployProject(data.projectId);
    
    const envDeployment = {
      ...data,
      deploymentId: deployment.id,
      active: true,
      createdAt: new Date()
    };
    
    const id = await this.storage.createEnvironmentDeployment(envDeployment);
    
    return { ...envDeployment, id };
  }

  async createABTest(data: {
    deploymentId: number;
    name: string;
    variants: {
      name: string;
      traffic: number;
    }[];
  }): Promise<ABTest> {
    // Validate traffic percentages sum to 100
    const totalTraffic = data.variants.reduce((sum, v) => sum + v.traffic, 0);
    if (totalTraffic !== 100) {
      throw new Error('Variant traffic must sum to 100%');
    }
    
    // Create deployments for each variant
    const variantsWithDeployments = await Promise.all(
      data.variants.map(async (variant) => {
        const deployment = await this.storage.getDeployment(data.deploymentId);
        const variantDeployment = await this.deploymentManager.deployProject(deployment.projectId);
        return {
          ...variant,
          deploymentId: variantDeployment.id
        };
      })
    );
    
    const abTest = {
      deploymentId: data.deploymentId,
      name: data.name,
      variants: variantsWithDeployments,
      status: 'active' as const,
      metrics: variantsWithDeployments.map(() => ({
        impressions: 0,
        conversions: 0,
        conversionRate: 0
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const id = await this.storage.createABTest(abTest);
    
    return { ...abTest, id };
  }

  async getDeploymentCustomDomains(deploymentId: number): Promise<CustomDomain[]> {
    return this.storage.getDeploymentCustomDomains(deploymentId);
  }

  async getProjectCronJobs(projectId: number): Promise<CronJob[]> {
    return this.storage.getProjectCronJobs(projectId);
  }

  async getProjectEnvironments(projectId: number): Promise<EnvironmentDeployment[]> {
    return this.storage.getProjectEnvironments(projectId);
  }

  async getDeploymentABTests(deploymentId: number): Promise<ABTest[]> {
    return this.storage.getDeploymentABTests(deploymentId);
  }

  async updateCronJob(jobId: number, updates: Partial<CronJob>): Promise<void> {
    await this.storage.updateCronJob(jobId, updates);
  }

  async deleteCronJob(jobId: number): Promise<void> {
    await this.storage.deleteCronJob(jobId);
  }

  async pauseABTest(testId: number): Promise<void> {
    await this.storage.updateABTest(testId, { status: 'paused' });
  }

  async completeABTest(testId: number, winnerVariantIndex: number): Promise<void> {
    const test = await this.storage.getABTest(testId);
    if (!test) throw new Error('A/B test not found');
    
    // Make winner variant 100% traffic
    const updatedVariants = test.variants.map((v, i) => ({
      ...v,
      traffic: i === winnerVariantIndex ? 100 : 0
    }));
    
    await this.storage.updateABTest(testId, {
      status: 'completed',
      variants: updatedVariants
    });
  }
}