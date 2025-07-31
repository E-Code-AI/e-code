import { EventEmitter } from 'events';
import axios from 'axios';
import os from 'os';
import { db } from '../db';
import { projects, deployments } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface MonitoringIntegration {
    id: string;
    projectId: number;
    type: 'datadog' | 'newrelic';
    name: string;
    enabled: boolean;
    config: DatadogConfig | NewRelicConfig;
    metricSettings: MetricSettings;
    created: Date;
}

interface DatadogConfig {
    apiKey: string;
    applicationKey: string;
    site: string; // e.g., 'datadoghq.com', 'datadoghq.eu'
    tags?: string[];
    service?: string;
    env?: string;
}

interface NewRelicConfig {
    accountId: string;
    apiKey: string;
    region: 'us' | 'eu';
    appId?: string;
    insightsInsertKey?: string;
}

interface MetricSettings {
    collectSystemMetrics: boolean;
    collectCustomMetrics: boolean;
    collectLogs: boolean;
    collectTraces: boolean;
    collectErrors: boolean;
    sampleRate: number; // 0.0 to 1.0
    customMetrics?: CustomMetricConfig[];
}

interface CustomMetricConfig {
    name: string;
    type: 'counter' | 'gauge' | 'histogram' | 'distribution';
    tags?: string[];
}

interface MetricData {
    name: string;
    value: number;
    tags?: Record<string, string>;
    timestamp?: Date;
    type: 'counter' | 'gauge' | 'histogram' | 'distribution';
}

interface LogData {
    message: string;
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    timestamp: Date;
    context?: Record<string, any>;
    tags?: Record<string, string>;
}

interface TraceData {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    operationName: string;
    startTime: Date;
    duration: number;
    tags?: Record<string, any>;
    status?: 'ok' | 'error';
}

interface ErrorData {
    message: string;
    stack?: string;
    type?: string;
    timestamp: Date;
    context?: Record<string, any>;
    userId?: string;
    sessionId?: string;
}

export class DatadogNewRelicService extends EventEmitter {
    private integrations: Map<string, MonitoringIntegration> = new Map();
    private metricBuffers: Map<string, MetricData[]> = new Map();
    private logBuffers: Map<string, LogData[]> = new Map();
    private flushInterval: NodeJS.Timeout | null = null;

    constructor() {
        super();
        this.startFlushInterval();
    }

    async createIntegration(config: Omit<MonitoringIntegration, 'id' | 'created'>): Promise<MonitoringIntegration> {
        const integrationId = `mon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Validate configuration
        if (config.type === 'datadog') {
            await this.validateDatadogConfig(config.config as DatadogConfig);
        } else if (config.type === 'newrelic') {
            await this.validateNewRelicConfig(config.config as NewRelicConfig);
        }

        const integration: MonitoringIntegration = {
            ...config,
            id: integrationId,
            created: new Date()
        };

        this.integrations.set(integrationId, integration);
        this.metricBuffers.set(integrationId, []);
        this.logBuffers.set(integrationId, []);
        
        this.emit('integration:created', integration);
        
        // Start collecting system metrics if enabled
        if (config.metricSettings.collectSystemMetrics) {
            this.startSystemMetricsCollection(integrationId);
        }
        
        return integration;
    }

    async updateIntegration(integrationId: string, updates: Partial<MonitoringIntegration>): Promise<MonitoringIntegration> {
        const integration = this.integrations.get(integrationId);
        if (!integration) {
            throw new Error('Integration not found');
        }

        const updated = { ...integration, ...updates };
        
        // Re-validate if config changed
        if (updates.config) {
            if (updated.type === 'datadog') {
                await this.validateDatadogConfig(updated.config as DatadogConfig);
            } else if (updated.type === 'newrelic') {
                await this.validateNewRelicConfig(updated.config as NewRelicConfig);
            }
        }

        this.integrations.set(integrationId, updated);
        this.emit('integration:updated', updated);
        
        return updated;
    }

    async deleteIntegration(integrationId: string): Promise<void> {
        const integration = this.integrations.get(integrationId);
        if (!integration) {
            throw new Error('Integration not found');
        }

        // Flush any remaining data
        await this.flush(integrationId);

        this.integrations.delete(integrationId);
        this.metricBuffers.delete(integrationId);
        this.logBuffers.delete(integrationId);
        
        this.emit('integration:deleted', integrationId);
    }

    async getIntegration(integrationId: string): Promise<MonitoringIntegration | undefined> {
        return this.integrations.get(integrationId);
    }

    async listIntegrations(projectId?: number): Promise<MonitoringIntegration[]> {
        const integrations = Array.from(this.integrations.values());
        
        if (projectId) {
            return integrations.filter(i => i.projectId === projectId);
        }
        
        return integrations;
    }

    async sendMetric(integrationId: string, metric: MetricData): Promise<void> {
        const integration = this.integrations.get(integrationId);
        if (!integration || !integration.enabled) {
            return;
        }

        if (!integration.metricSettings.collectCustomMetrics) {
            return;
        }

        // Apply sample rate
        if (Math.random() > integration.metricSettings.sampleRate) {
            return;
        }

        const buffer = this.metricBuffers.get(integrationId) || [];
        buffer.push({
            ...metric,
            timestamp: metric.timestamp || new Date()
        });
        this.metricBuffers.set(integrationId, buffer);

        // Flush if buffer is large
        if (buffer.length >= 100) {
            await this.flushMetrics(integrationId);
        }
    }

    async sendLog(integrationId: string, log: LogData): Promise<void> {
        const integration = this.integrations.get(integrationId);
        if (!integration || !integration.enabled) {
            return;
        }

        if (!integration.metricSettings.collectLogs) {
            return;
        }

        const buffer = this.logBuffers.get(integrationId) || [];
        buffer.push(log);
        this.logBuffers.set(integrationId, buffer);

        // Flush if buffer is large
        if (buffer.length >= 50) {
            await this.flushLogs(integrationId);
        }
    }

    async sendTrace(integrationId: string, trace: TraceData): Promise<void> {
        const integration = this.integrations.get(integrationId);
        if (!integration || !integration.enabled) {
            return;
        }

        if (!integration.metricSettings.collectTraces) {
            return;
        }

        if (integration.type === 'datadog') {
            await this.sendDatadogTrace(integration, trace);
        } else if (integration.type === 'newrelic') {
            await this.sendNewRelicTrace(integration, trace);
        }
    }

    async sendError(integrationId: string, error: ErrorData): Promise<void> {
        const integration = this.integrations.get(integrationId);
        if (!integration || !integration.enabled) {
            return;
        }

        if (!integration.metricSettings.collectErrors) {
            return;
        }

        if (integration.type === 'datadog') {
            await this.sendDatadogError(integration, error);
        } else if (integration.type === 'newrelic') {
            await this.sendNewRelicError(integration, error);
        }
    }

    async trackDeployment(projectId: number, deployment: any): Promise<void> {
        const integrations = await this.listIntegrations(projectId);
        
        for (const integration of integrations) {
            try {
                if (integration.type === 'datadog') {
                    await this.sendDatadogEvent(integration, {
                        title: 'Deployment',
                        text: `Deployed version ${deployment.version} to ${deployment.environment}`,
                        tags: ['deployment', `env:${deployment.environment}`, `version:${deployment.version}`],
                        alertType: 'info'
                    });
                } else if (integration.type === 'newrelic') {
                    await this.sendNewRelicDeployment(integration, deployment);
                }
            } catch (error) {
                console.error(`Failed to track deployment in ${integration.type}:`, error);
            }
        }
    }

    async trackIncident(projectId: number, incident: any): Promise<void> {
        const integrations = await this.listIntegrations(projectId);
        
        for (const integration of integrations) {
            try {
                if (integration.type === 'datadog') {
                    await this.sendDatadogEvent(integration, {
                        title: 'Incident',
                        text: incident.description,
                        tags: ['incident', `severity:${incident.severity}`, `status:${incident.status}`],
                        alertType: incident.severity === 'critical' ? 'error' : 'warning'
                    });
                } else if (integration.type === 'newrelic') {
                    await this.sendNewRelicEvent(integration, 'Incident', {
                        description: incident.description,
                        severity: incident.severity,
                        status: incident.status
                    });
                }
            } catch (error) {
                console.error(`Failed to track incident in ${integration.type}:`, error);
            }
        }
    }

    async createDashboard(integrationId: string, name: string, widgets: any[]): Promise<any> {
        const integration = this.integrations.get(integrationId);
        if (!integration) {
            throw new Error('Integration not found');
        }

        if (integration.type === 'datadog') {
            return await this.createDatadogDashboard(integration, name, widgets);
        } else if (integration.type === 'newrelic') {
            return await this.createNewRelicDashboard(integration, name, widgets);
        }
    }

    async createAlert(integrationId: string, alert: any): Promise<any> {
        const integration = this.integrations.get(integrationId);
        if (!integration) {
            throw new Error('Integration not found');
        }

        if (integration.type === 'datadog') {
            return await this.createDatadogMonitor(integration, alert);
        } else if (integration.type === 'newrelic') {
            return await this.createNewRelicAlert(integration, alert);
        }
    }

    private async validateDatadogConfig(config: DatadogConfig): Promise<void> {
        try {
            const response = await axios.get(
                `https://api.${config.site}/api/v1/validate`,
                {
                    headers: {
                        'DD-API-KEY': config.apiKey,
                        'DD-APPLICATION-KEY': config.applicationKey
                    }
                }
            );
            
            if (!response.data.valid) {
                throw new Error('Invalid Datadog credentials');
            }
        } catch (error: any) {
            throw new Error(`Datadog validation failed: ${error.response?.data?.errors?.[0] || error.message}`);
        }
    }

    private async validateNewRelicConfig(config: NewRelicConfig): Promise<void> {
        try {
            const baseUrl = config.region === 'eu' ? 'https://api.eu.newrelic.com' : 'https://api.newrelic.com';
            const response = await axios.get(
                `${baseUrl}/v2/accounts/${config.accountId}.json`,
                {
                    headers: {
                        'Api-Key': config.apiKey
                    }
                }
            );
            
            if (!response.data.account) {
                throw new Error('Invalid New Relic credentials');
            }
        } catch (error: any) {
            throw new Error(`New Relic validation failed: ${error.response?.data?.error?.title || error.message}`);
        }
    }

    private async flushMetrics(integrationId: string): Promise<void> {
        const integration = this.integrations.get(integrationId);
        const metrics = this.metricBuffers.get(integrationId) || [];
        
        if (!integration || metrics.length === 0) {
            return;
        }

        try {
            if (integration.type === 'datadog') {
                await this.sendDatadogMetrics(integration, metrics);
            } else if (integration.type === 'newrelic') {
                await this.sendNewRelicMetrics(integration, metrics);
            }
            
            this.metricBuffers.set(integrationId, []);
        } catch (error) {
            console.error(`Failed to flush metrics for ${integrationId}:`, error);
        }
    }

    private async flushLogs(integrationId: string): Promise<void> {
        const integration = this.integrations.get(integrationId);
        const logs = this.logBuffers.get(integrationId) || [];
        
        if (!integration || logs.length === 0) {
            return;
        }

        try {
            if (integration.type === 'datadog') {
                await this.sendDatadogLogs(integration, logs);
            } else if (integration.type === 'newrelic') {
                await this.sendNewRelicLogs(integration, logs);
            }
            
            this.logBuffers.set(integrationId, []);
        } catch (error) {
            console.error(`Failed to flush logs for ${integrationId}:`, error);
        }
    }

    private async sendDatadogMetrics(integration: MonitoringIntegration, metrics: MetricData[]): Promise<void> {
        const config = integration.config as DatadogConfig;
        const series = metrics.map(metric => ({
            metric: metric.name,
            points: [[Math.floor((metric.timestamp?.getTime() || Date.now()) / 1000), metric.value]],
            type: metric.type,
            tags: [
                ...(config.tags || []),
                ...(metric.tags ? Object.entries(metric.tags).map(([k, v]) => `${k}:${v}`) : [])
            ]
        }));

        await axios.post(
            `https://api.${config.site}/api/v1/series`,
            { series },
            {
                headers: {
                    'DD-API-KEY': config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    private async sendNewRelicMetrics(integration: MonitoringIntegration, metrics: MetricData[]): Promise<void> {
        const config = integration.config as NewRelicConfig;
        const baseUrl = config.region === 'eu' ? 'https://metric-api.eu.newrelic.com' : 'https://metric-api.newrelic.com';
        
        const metricsData = metrics.map(metric => ({
            name: metric.name,
            type: metric.type,
            value: metric.value,
            timestamp: Math.floor((metric.timestamp?.getTime() || Date.now()) / 1000),
            attributes: metric.tags || {}
        }));

        await axios.post(
            `${baseUrl}/metric/v1`,
            [{
                metrics: metricsData
            }],
            {
                headers: {
                    'Api-Key': config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    private async sendDatadogLogs(integration: MonitoringIntegration, logs: LogData[]): Promise<void> {
        const config = integration.config as DatadogConfig;
        const logData = logs.map(log => ({
            message: log.message,
            level: log.level,
            timestamp: log.timestamp.toISOString(),
            service: config.service,
            env: config.env,
            tags: [
                ...(config.tags || []),
                ...(log.tags ? Object.entries(log.tags).map(([k, v]) => `${k}:${v}`) : [])
            ],
            ...log.context
        }));

        await axios.post(
            `https://http-intake.logs.${config.site}/v1/input/${config.apiKey}`,
            logData,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    private async sendNewRelicLogs(integration: MonitoringIntegration, logs: LogData[]): Promise<void> {
        const config = integration.config as NewRelicConfig;
        const baseUrl = config.region === 'eu' ? 'https://log-api.eu.newrelic.com' : 'https://log-api.newrelic.com';
        
        const logData = logs.map(log => ({
            message: log.message,
            level: log.level,
            timestamp: log.timestamp.getTime(),
            attributes: {
                ...log.context,
                ...log.tags
            }
        }));

        await axios.post(
            `${baseUrl}/log/v1`,
            [{
                logs: logData
            }],
            {
                headers: {
                    'Api-Key': config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    private async sendDatadogTrace(integration: MonitoringIntegration, trace: TraceData): Promise<void> {
        const config = integration.config as DatadogConfig;
        const traceData = [{
            trace_id: trace.traceId,
            span_id: trace.spanId,
            parent_id: trace.parentSpanId,
            name: trace.operationName,
            start: trace.startTime.getTime() * 1000000, // nanoseconds
            duration: trace.duration * 1000000, // nanoseconds
            error: trace.status === 'error' ? 1 : 0,
            meta: trace.tags,
            metrics: {}
        }];

        await axios.put(
            `https://trace.agent.${config.site}/v0.3/traces`,
            [[traceData]],
            {
                headers: {
                    'DD-API-KEY': config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    private async sendNewRelicTrace(integration: MonitoringIntegration, trace: TraceData): Promise<void> {
        const config = integration.config as NewRelicConfig;
        const baseUrl = config.region === 'eu' ? 'https://trace-api.eu.newrelic.com' : 'https://trace-api.newrelic.com';
        
        const traceData = {
            'trace.id': trace.traceId,
            id: trace.spanId,
            attributes: {
                name: trace.operationName,
                parent: { id: trace.parentSpanId },
                timestamp: trace.startTime.getTime(),
                duration: { ms: trace.duration },
                ...trace.tags
            }
        };

        await axios.post(
            `${baseUrl}/trace/v1`,
            [{
                spans: [traceData]
            }],
            {
                headers: {
                    'Api-Key': config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    private async sendDatadogError(integration: MonitoringIntegration, error: ErrorData): Promise<void> {
        const config = integration.config as DatadogConfig;
        
        // Send as log with error level
        await this.sendDatadogLogs(integration, [{
            message: error.message,
            level: 'error',
            timestamp: error.timestamp,
            context: {
                error: {
                    kind: error.type,
                    message: error.message,
                    stack: error.stack
                },
                usr: {
                    id: error.userId,
                    session_id: error.sessionId
                },
                ...error.context
            },
            tags: {}
        }]);
    }

    private async sendNewRelicError(integration: MonitoringIntegration, error: ErrorData): Promise<void> {
        const config = integration.config as NewRelicConfig;
        const baseUrl = config.region === 'eu' ? 'https://api.eu.newrelic.com' : 'https://api.newrelic.com';
        
        await axios.post(
            `${baseUrl}/v1/accounts/${config.accountId}/events`,
            [{
                eventType: 'JavaScriptError',
                errorMessage: error.message,
                errorClass: error.type,
                stackTrace: error.stack,
                timestamp: error.timestamp.getTime(),
                userAgent: error.context?.userAgent,
                session: error.sessionId,
                userId: error.userId,
                ...error.context
            }],
            {
                headers: {
                    'Api-Key': config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    private async sendDatadogEvent(integration: MonitoringIntegration, event: any): Promise<void> {
        const config = integration.config as DatadogConfig;
        
        await axios.post(
            `https://api.${config.site}/api/v1/events`,
            {
                title: event.title,
                text: event.text,
                tags: event.tags,
                alert_type: event.alertType
            },
            {
                headers: {
                    'DD-API-KEY': config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    private async sendNewRelicDeployment(integration: MonitoringIntegration, deployment: any): Promise<void> {
        const config = integration.config as NewRelicConfig;
        const baseUrl = config.region === 'eu' ? 'https://api.eu.newrelic.com' : 'https://api.newrelic.com';
        
        await axios.post(
            `${baseUrl}/v2/applications/${config.appId}/deployments.json`,
            {
                deployment: {
                    revision: deployment.version,
                    description: `Deployed to ${deployment.environment}`,
                    user: deployment.userId
                }
            },
            {
                headers: {
                    'Api-Key': config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    private async sendNewRelicEvent(integration: MonitoringIntegration, eventType: string, data: any): Promise<void> {
        const config = integration.config as NewRelicConfig;
        const baseUrl = config.region === 'eu' ? 'https://insights-collector.eu01.nr-data.net' : 'https://insights-collector.newrelic.com';
        
        await axios.post(
            `${baseUrl}/v1/accounts/${config.accountId}/events`,
            [{
                eventType,
                timestamp: Date.now(),
                ...data
            }],
            {
                headers: {
                    'X-Insert-Key': config.insightsInsertKey || config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    private async createDatadogDashboard(integration: MonitoringIntegration, name: string, widgets: any[]): Promise<any> {
        const config = integration.config as DatadogConfig;
        
        const response = await axios.post(
            `https://api.${config.site}/api/v1/dashboard`,
            {
                title: name,
                layout_type: 'ordered',
                widgets
            },
            {
                headers: {
                    'DD-API-KEY': config.apiKey,
                    'DD-APPLICATION-KEY': config.applicationKey,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data;
    }

    private async createNewRelicDashboard(integration: MonitoringIntegration, name: string, widgets: any[]): Promise<any> {
        const config = integration.config as NewRelicConfig;
        const baseUrl = config.region === 'eu' ? 'https://api.eu.newrelic.com' : 'https://api.newrelic.com';
        
        const mutation = `
            mutation CreateDashboard($dashboard: DashboardInput!) {
                dashboardCreate(accountId: ${config.accountId}, dashboard: $dashboard) {
                    entityResult {
                        guid
                    }
                    errors {
                        description
                    }
                }
            }
        `;
        
        const response = await axios.post(
            `${baseUrl}/graphql`,
            {
                query: mutation,
                variables: {
                    dashboard: {
                        name,
                        permissions: 'PUBLIC_READ_WRITE',
                        pages: [{
                            name: 'Page 1',
                            widgets
                        }]
                    }
                }
            },
            {
                headers: {
                    'Api-Key': config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data.data.dashboardCreate;
    }

    private async createDatadogMonitor(integration: MonitoringIntegration, alert: any): Promise<any> {
        const config = integration.config as DatadogConfig;
        
        const response = await axios.post(
            `https://api.${config.site}/api/v1/monitor`,
            {
                name: alert.name,
                type: alert.type || 'metric alert',
                query: alert.query,
                message: alert.message,
                tags: alert.tags || [],
                options: alert.options || {}
            },
            {
                headers: {
                    'DD-API-KEY': config.apiKey,
                    'DD-APPLICATION-KEY': config.applicationKey,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data;
    }

    private async createNewRelicAlert(integration: MonitoringIntegration, alert: any): Promise<any> {
        const config = integration.config as NewRelicConfig;
        const baseUrl = config.region === 'eu' ? 'https://api.eu.newrelic.com' : 'https://api.newrelic.com';
        
        const response = await axios.post(
            `${baseUrl}/v2/alerts_policies.json`,
            {
                policy: {
                    name: alert.name,
                    incident_preference: alert.incidentPreference || 'PER_CONDITION'
                }
            },
            {
                headers: {
                    'Api-Key': config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const policyId = response.data.policy.id;
        
        // Create condition
        await axios.post(
            `${baseUrl}/v2/alerts_conditions.json`,
            {
                condition: {
                    policy_id: policyId,
                    name: alert.conditionName,
                    type: alert.conditionType || 'apm_app_metric',
                    entities: alert.entities || [],
                    metric: alert.metric,
                    terms: alert.terms
                }
            },
            {
                headers: {
                    'Api-Key': config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data;
    }

    private startSystemMetricsCollection(integrationId: string): void {
        // Collect system metrics every minute
        const interval = setInterval(async () => {
            const integration = this.integrations.get(integrationId);
            if (!integration || !integration.enabled || !integration.metricSettings.collectSystemMetrics) {
                clearInterval(interval);
                return;
            }

            const cpuUsage = process.cpuUsage();
            const memUsage = process.memoryUsage();
            const loadAvg = os.loadavg();

            await this.sendMetric(integrationId, {
                name: 'system.cpu.usage',
                value: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
                type: 'gauge',
                tags: { project_id: integration.projectId.toString() }
            });

            await this.sendMetric(integrationId, {
                name: 'system.memory.rss',
                value: memUsage.rss / 1024 / 1024, // Convert to MB
                type: 'gauge',
                tags: { project_id: integration.projectId.toString() }
            });

            await this.sendMetric(integrationId, {
                name: 'system.memory.heap_used',
                value: memUsage.heapUsed / 1024 / 1024, // Convert to MB
                type: 'gauge',
                tags: { project_id: integration.projectId.toString() }
            });

            await this.sendMetric(integrationId, {
                name: 'system.load.1m',
                value: loadAvg[0],
                type: 'gauge',
                tags: { project_id: integration.projectId.toString() }
            });
        }, 60000); // Every minute
    }

    private startFlushInterval(): void {
        this.flushInterval = setInterval(async () => {
            await this.flush();
        }, 30000); // Every 30 seconds
    }

    async flush(integrationId?: string): Promise<void> {
        if (integrationId) {
            await this.flushMetrics(integrationId);
            await this.flushLogs(integrationId);
        } else {
            // Flush all integrations
            const integrations = Array.from(this.integrations.keys());
            for (const id of integrations) {
                await this.flushMetrics(id);
                await this.flushLogs(id);
            }
        }
    }

    destroy(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
    }
}