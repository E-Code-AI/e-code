import { EventEmitter } from 'events';
import { db } from '../db';
import { projects, deployments } from '@shared/schema';
import { eq, and, gte } from 'drizzle-orm';

interface ABTestConfig {
    id: string;
    projectId: number;
    name: string;
    description?: string;
    variants: ABVariant[];
    trafficSplit: Record<string, number>; // variant -> percentage
    metrics: string[];
    startDate: Date;
    endDate?: Date;
    enabled: boolean;
    targetingRules?: TargetingRule[];
}

interface ABVariant {
    id: string;
    name: string;
    deploymentId: number;
    isControl: boolean;
    customizations?: Record<string, any>;
}

interface TargetingRule {
    type: 'geo' | 'device' | 'user-segment' | 'custom';
    condition: any;
    variantId: string;
}

interface ABTestResult {
    testId: string;
    variant: string;
    metrics: Record<string, number>;
    conversions: number;
    impressions: number;
    conversionRate: number;
    confidence: number;
}

export class ABTestingService extends EventEmitter {
    private tests: Map<string, ABTestConfig> = new Map();
    private results: Map<string, ABTestResult[]> = new Map();
    private userAssignments: Map<string, Map<string, string>> = new Map(); // userId -> testId -> variantId

    constructor() {
        super();
        this.startMetricsCollection();
    }

    async createABTest(config: Omit<ABTestConfig, 'id'>): Promise<ABTestConfig> {
        const testId = `ab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Validate traffic split adds up to 100%
        const totalTraffic = Object.values(config.trafficSplit).reduce((sum, pct) => sum + pct, 0);
        if (Math.abs(totalTraffic - 100) > 0.01) {
            throw new Error('Traffic split must add up to 100%');
        }

        // Validate all variants have deployments
        for (const variant of config.variants) {
            const deployment = await db.select()
                .from(deployments)
                .where(eq(deployments.id, variant.deploymentId))
                .limit(1);
            
            if (deployment.length === 0) {
                throw new Error(`Deployment ${variant.deploymentId} not found for variant ${variant.name}`);
            }
        }

        const test: ABTestConfig = {
            ...config,
            id: testId,
            enabled: config.enabled ?? true
        };

        this.tests.set(testId, test);
        
        // Initialize results tracking
        this.results.set(testId, config.variants.map(v => ({
            testId,
            variant: v.id,
            metrics: Object.fromEntries(config.metrics.map(m => [m, 0])),
            conversions: 0,
            impressions: 0,
            conversionRate: 0,
            confidence: 0
        })));

        this.emit('test:created', test);
        return test;
    }

    async updateABTest(testId: string, updates: Partial<ABTestConfig>): Promise<ABTestConfig> {
        const test = this.tests.get(testId);
        if (!test) {
            throw new Error('A/B test not found');
        }

        const updatedTest = { ...test, ...updates };
        
        // Re-validate traffic split if updated
        if (updates.trafficSplit) {
            const totalTraffic = Object.values(updatedTest.trafficSplit).reduce((sum, pct) => sum + pct, 0);
            if (Math.abs(totalTraffic - 100) > 0.01) {
                throw new Error('Traffic split must add up to 100%');
            }
        }

        this.tests.set(testId, updatedTest);
        this.emit('test:updated', updatedTest);
        return updatedTest;
    }

    async deleteABTest(testId: string): Promise<void> {
        const test = this.tests.get(testId);
        if (!test) {
            throw new Error('A/B test not found');
        }

        this.tests.delete(testId);
        this.results.delete(testId);
        this.emit('test:deleted', testId);
    }

    async getABTest(testId: string): Promise<ABTestConfig | undefined> {
        return this.tests.get(testId);
    }

    async listABTests(projectId?: number): Promise<ABTestConfig[]> {
        const tests = Array.from(this.tests.values());
        
        if (projectId) {
            return tests.filter(t => t.projectId === projectId);
        }
        
        return tests;
    }

    async assignUserToVariant(testId: string, userId: string, context?: any): Promise<string> {
        const test = this.tests.get(testId);
        if (!test || !test.enabled) {
            throw new Error('A/B test not found or disabled');
        }

        // Check if user already assigned
        let userTests = this.userAssignments.get(userId);
        if (!userTests) {
            userTests = new Map();
            this.userAssignments.set(userId, userTests);
        }

        const existingAssignment = userTests.get(testId);
        if (existingAssignment) {
            return existingAssignment;
        }

        // Apply targeting rules if any
        if (test.targetingRules && context) {
            for (const rule of test.targetingRules) {
                if (this.evaluateTargetingRule(rule, context)) {
                    userTests.set(testId, rule.variantId);
                    return rule.variantId;
                }
            }
        }

        // Random assignment based on traffic split
        const variantId = this.selectVariantByTrafficSplit(test);
        userTests.set(testId, variantId);
        
        // Track impression
        this.trackImpression(testId, variantId);
        
        return variantId;
    }

    async trackEvent(testId: string, userId: string, eventName: string, value?: number): Promise<void> {
        const test = this.tests.get(testId);
        if (!test) return;

        const userTests = this.userAssignments.get(userId);
        if (!userTests) return;

        const variantId = userTests.get(testId);
        if (!variantId) return;

        const results = this.results.get(testId);
        if (!results) return;

        const variantResult = results.find(r => r.variant === variantId);
        if (!variantResult) return;

        // Update metrics
        if (test.metrics.includes(eventName)) {
            variantResult.metrics[eventName] = (variantResult.metrics[eventName] || 0) + (value || 1);
        }

        // Track conversion if it's a conversion event
        if (eventName === 'conversion' || eventName.includes('purchase') || eventName.includes('signup')) {
            variantResult.conversions++;
            variantResult.conversionRate = (variantResult.conversions / variantResult.impressions) * 100;
        }

        // Calculate statistical significance
        this.calculateConfidence(testId);
        
        this.emit('event:tracked', { testId, userId, variantId, eventName, value });
    }

    async getTestResults(testId: string): Promise<ABTestResult[]> {
        const results = this.results.get(testId);
        if (!results) {
            throw new Error('A/B test results not found');
        }

        return results;
    }

    async getWinningVariant(testId: string): Promise<{ variantId: string; confidence: number } | null> {
        const results = this.results.get(testId);
        if (!results || results.length < 2) return null;

        // Sort by conversion rate
        const sorted = [...results].sort((a, b) => b.conversionRate - a.conversionRate);
        const winner = sorted[0];
        const control = sorted.find(r => {
            const test = this.tests.get(testId);
            const variant = test?.variants.find(v => v.id === r.variant);
            return variant?.isControl;
        });

        if (!control || winner.confidence < 95) {
            return null; // Not statistically significant
        }

        return {
            variantId: winner.variant,
            confidence: winner.confidence
        };
    }

    async promoteWinner(testId: string): Promise<void> {
        const winner = await this.getWinningVariant(testId);
        if (!winner) {
            throw new Error('No statistically significant winner');
        }

        const test = this.tests.get(testId);
        if (!test) {
            throw new Error('A/B test not found');
        }

        const winningVariant = test.variants.find(v => v.id === winner.variantId);
        if (!winningVariant) {
            throw new Error('Winning variant not found');
        }

        // Update project to use winning deployment
        await db.update(projects)
            .set({ defaultDeploymentId: winningVariant.deploymentId })
            .where(eq(projects.id, test.projectId));

        // Disable the test
        test.enabled = false;
        test.endDate = new Date();
        
        this.emit('winner:promoted', { testId, variantId: winner.variantId });
    }

    private selectVariantByTrafficSplit(test: ABTestConfig): string {
        const random = Math.random() * 100;
        let accumulated = 0;

        for (const [variantId, percentage] of Object.entries(test.trafficSplit)) {
            accumulated += percentage;
            if (random <= accumulated) {
                return variantId;
            }
        }

        // Fallback to first variant
        return test.variants[0].id;
    }

    private evaluateTargetingRule(rule: TargetingRule, context: any): boolean {
        switch (rule.type) {
            case 'geo':
                return context.country === rule.condition.country ||
                       context.region === rule.condition.region;
            
            case 'device':
                return context.device === rule.condition.device ||
                       context.platform === rule.condition.platform;
            
            case 'user-segment':
                return context.segment === rule.condition.segment ||
                       context.tier === rule.condition.tier;
            
            case 'custom':
                // Evaluate custom JavaScript condition
                try {
                    const fn = new Function('context', rule.condition);
                    return fn(context);
                } catch {
                    return false;
                }
            
            default:
                return false;
        }
    }

    private trackImpression(testId: string, variantId: string): void {
        const results = this.results.get(testId);
        if (!results) return;

        const variantResult = results.find(r => r.variant === variantId);
        if (variantResult) {
            variantResult.impressions++;
        }
    }

    private calculateConfidence(testId: string): void {
        const results = this.results.get(testId);
        if (!results || results.length < 2) return;

        // Find control variant
        const test = this.tests.get(testId);
        const controlVariant = test?.variants.find(v => v.isControl);
        if (!controlVariant) return;

        const controlResult = results.find(r => r.variant === controlVariant.id);
        if (!controlResult) return;

        // Calculate z-score for each variant against control
        for (const result of results) {
            if (result.variant === controlVariant.id) continue;

            const p1 = controlResult.conversionRate / 100;
            const p2 = result.conversionRate / 100;
            const n1 = controlResult.impressions;
            const n2 = result.impressions;

            if (n1 === 0 || n2 === 0) continue;

            const pooledP = (controlResult.conversions + result.conversions) / (n1 + n2);
            const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
            
            if (se === 0) continue;

            const z = Math.abs(p2 - p1) / se;
            
            // Convert z-score to confidence percentage
            result.confidence = this.zScoreToConfidence(z);
        }
    }

    private zScoreToConfidence(z: number): number {
        // Simplified conversion for common confidence levels
        if (z >= 2.58) return 99;
        if (z >= 1.96) return 95;
        if (z >= 1.645) return 90;
        if (z >= 1.28) return 80;
        return Math.min(z * 30, 79); // Linear approximation for lower values
    }

    private startMetricsCollection(): void {
        setInterval(() => {
            // Simulate real-time metrics collection
            for (const [testId, test] of this.tests) {
                if (!test.enabled) continue;
                
                const now = new Date();
                if (test.endDate && now > test.endDate) {
                    test.enabled = false;
                    continue;
                }

                // In production, this would collect real metrics from analytics
                this.emit('metrics:collected', { testId, timestamp: now });
            }
        }, 60000); // Every minute
    }
}