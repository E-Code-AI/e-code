import { EventEmitter } from 'events';
import axios from 'axios';
import { db } from '../db';
import { projects, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface ProjectManagementIntegration {
    id: string;
    projectId: number;
    type: 'jira' | 'linear';
    name: string;
    enabled: boolean;
    config: JiraConfig | LinearConfig;
    syncSettings: SyncSettings;
    created: Date;
}

interface JiraConfig {
    domain: string; // e.g., 'yourcompany.atlassian.net'
    email: string;
    apiToken: string;
    projectKey: string;
    defaultIssueType: string;
}

interface LinearConfig {
    apiKey: string;
    teamId: string;
    projectId?: string;
    defaultStateId?: string;
}

interface SyncSettings {
    syncIssues: boolean;
    syncComments: boolean;
    syncAttachments: boolean;
    syncStatus: boolean;
    autoCreateIssues: boolean;
    issuePrefix?: string;
    labelMapping?: Record<string, string>;
}

interface Issue {
    id: string;
    key?: string;
    title: string;
    description: string;
    status: string;
    assignee?: string;
    priority?: string;
    labels: string[];
    created: Date;
    updated: Date;
    externalId: string;
    externalUrl: string;
}

interface CreateIssueOptions {
    title: string;
    description: string;
    priority?: 'urgent' | 'high' | 'medium' | 'low';
    assignee?: string;
    labels?: string[];
    parentId?: string;
    customFields?: Record<string, any>;
}

export class JiraLinearService extends EventEmitter {
    private integrations: Map<string, ProjectManagementIntegration> = new Map();
    private issueCache: Map<string, Issue[]> = new Map();

    constructor() {
        super();
        this.setupSyncInterval();
    }

    async createIntegration(config: Omit<ProjectManagementIntegration, 'id' | 'created'>): Promise<ProjectManagementIntegration> {
        const integrationId = `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Validate configuration
        if (config.type === 'jira') {
            await this.validateJiraConfig(config.config as JiraConfig);
        } else if (config.type === 'linear') {
            await this.validateLinearConfig(config.config as LinearConfig);
        }

        const integration: ProjectManagementIntegration = {
            ...config,
            id: integrationId,
            created: new Date()
        };

        this.integrations.set(integrationId, integration);
        this.emit('integration:created', integration);
        
        // Initial sync
        if (config.syncSettings.syncIssues) {
            await this.syncIssues(integrationId);
        }
        
        return integration;
    }

    async updateIntegration(integrationId: string, updates: Partial<ProjectManagementIntegration>): Promise<ProjectManagementIntegration> {
        const integration = this.integrations.get(integrationId);
        if (!integration) {
            throw new Error('Integration not found');
        }

        const updated = { ...integration, ...updates };
        
        // Re-validate if config changed
        if (updates.config) {
            if (updated.type === 'jira') {
                await this.validateJiraConfig(updated.config as JiraConfig);
            } else if (updated.type === 'linear') {
                await this.validateLinearConfig(updated.config as LinearConfig);
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

        this.integrations.delete(integrationId);
        this.issueCache.delete(integrationId);
        
        this.emit('integration:deleted', integrationId);
    }

    async getIntegration(integrationId: string): Promise<ProjectManagementIntegration | undefined> {
        return this.integrations.get(integrationId);
    }

    async listIntegrations(projectId?: number): Promise<ProjectManagementIntegration[]> {
        const integrations = Array.from(this.integrations.values());
        
        if (projectId) {
            return integrations.filter(i => i.projectId === projectId);
        }
        
        return integrations;
    }

    async createIssue(integrationId: string, options: CreateIssueOptions): Promise<Issue> {
        const integration = this.integrations.get(integrationId);
        if (!integration || !integration.enabled) {
            throw new Error('Integration not found or disabled');
        }

        let issue: Issue;
        
        if (integration.type === 'jira') {
            issue = await this.createJiraIssue(integration, options);
        } else {
            issue = await this.createLinearIssue(integration, options);
        }

        // Add to cache
        const cached = this.issueCache.get(integrationId) || [];
        cached.push(issue);
        this.issueCache.set(integrationId, cached);

        this.emit('issue:created', { integrationId, issue });
        
        return issue;
    }

    async updateIssue(integrationId: string, issueId: string, updates: Partial<CreateIssueOptions>): Promise<Issue> {
        const integration = this.integrations.get(integrationId);
        if (!integration || !integration.enabled) {
            throw new Error('Integration not found or disabled');
        }

        let issue: Issue;
        
        if (integration.type === 'jira') {
            issue = await this.updateJiraIssue(integration, issueId, updates);
        } else {
            issue = await this.updateLinearIssue(integration, issueId, updates);
        }

        // Update cache
        const cached = this.issueCache.get(integrationId) || [];
        const index = cached.findIndex(i => i.id === issueId);
        if (index !== -1) {
            cached[index] = issue;
            this.issueCache.set(integrationId, cached);
        }

        this.emit('issue:updated', { integrationId, issue });
        
        return issue;
    }

    async linkIssue(integrationId: string, issueId: string, projectFileId: number): Promise<void> {
        const integration = this.integrations.get(integrationId);
        if (!integration) {
            throw new Error('Integration not found');
        }

        // Store link in database
        // This would be implemented with a proper linking table
        
        this.emit('issue:linked', { integrationId, issueId, projectFileId });
    }

    async syncIssues(integrationId: string): Promise<Issue[]> {
        const integration = this.integrations.get(integrationId);
        if (!integration || !integration.enabled) {
            return [];
        }

        let issues: Issue[];
        
        if (integration.type === 'jira') {
            issues = await this.syncJiraIssues(integration);
        } else {
            issues = await this.syncLinearIssues(integration);
        }

        this.issueCache.set(integrationId, issues);
        this.emit('issues:synced', { integrationId, count: issues.length });
        
        return issues;
    }

    async getIssues(integrationId: string, filter?: any): Promise<Issue[]> {
        const cached = this.issueCache.get(integrationId);
        if (cached && cached.length > 0) {
            return cached;
        }

        return await this.syncIssues(integrationId);
    }

    async searchIssues(integrationId: string, query: string): Promise<Issue[]> {
        const integration = this.integrations.get(integrationId);
        if (!integration) {
            throw new Error('Integration not found');
        }

        if (integration.type === 'jira') {
            return await this.searchJiraIssues(integration, query);
        } else {
            return await this.searchLinearIssues(integration, query);
        }
    }

    async createFromError(integrationId: string, error: Error, context?: any): Promise<Issue> {
        const integration = this.integrations.get(integrationId);
        if (!integration) {
            throw new Error('Integration not found');
        }

        const prefix = integration.syncSettings.issuePrefix || '[E-Code]';
        
        const options: CreateIssueOptions = {
            title: `${prefix} ${error.name}: ${error.message}`,
            description: `## Error Details\n\n**Message:** ${error.message}\n\n**Stack:**\n\`\`\`\n${error.stack}\n\`\`\`\n\n## Context\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``,
            priority: 'high',
            labels: ['bug', 'error', 'auto-created']
        };

        return await this.createIssue(integrationId, options);
    }

    async createFromDeployment(integrationId: string, deployment: any, status: string): Promise<Issue> {
        const integration = this.integrations.get(integrationId);
        if (!integration) {
            throw new Error('Integration not found');
        }

        const prefix = integration.syncSettings.issuePrefix || '[E-Code]';
        
        const options: CreateIssueOptions = {
            title: `${prefix} Deployment ${status}: ${deployment.version}`,
            description: `## Deployment Information\n\n- **ID:** ${deployment.id}\n- **Version:** ${deployment.version}\n- **Environment:** ${deployment.environment}\n- **Status:** ${status}\n- **URL:** ${deployment.url}`,
            priority: status === 'failed' ? 'urgent' : 'medium',
            labels: ['deployment', status]
        };

        return await this.createIssue(integrationId, options);
    }

    private async validateJiraConfig(config: JiraConfig): Promise<void> {
        try {
            const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
            const response = await axios.get(
                `https://${config.domain}/rest/api/3/myself`,
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Accept': 'application/json'
                    }
                }
            );
            
            if (!response.data.accountId) {
                throw new Error('Invalid JIRA credentials');
            }
            
            // Verify project exists
            await axios.get(
                `https://${config.domain}/rest/api/3/project/${config.projectKey}`,
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Accept': 'application/json'
                    }
                }
            );
        } catch (error: any) {
            throw new Error(`JIRA validation failed: ${error.response?.data?.errorMessages?.[0] || error.message}`);
        }
    }

    private async validateLinearConfig(config: LinearConfig): Promise<void> {
        try {
            const response = await axios.post(
                'https://api.linear.app/graphql',
                {
                    query: `
                        query {
                            viewer {
                                id
                                email
                            }
                            team(id: "${config.teamId}") {
                                id
                                name
                            }
                        }
                    `
                },
                {
                    headers: {
                        'Authorization': config.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (response.data.errors || !response.data.data.viewer) {
                throw new Error('Invalid Linear API key');
            }
            
            if (!response.data.data.team) {
                throw new Error('Invalid team ID');
            }
        } catch (error: any) {
            throw new Error(`Linear validation failed: ${error.message}`);
        }
    }

    private async createJiraIssue(integration: ProjectManagementIntegration, options: CreateIssueOptions): Promise<Issue> {
        const config = integration.config as JiraConfig;
        const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
        
        const issueData = {
            fields: {
                project: { key: config.projectKey },
                summary: options.title,
                description: {
                    type: 'doc',
                    version: 1,
                    content: [{
                        type: 'paragraph',
                        content: [{
                            type: 'text',
                            text: options.description
                        }]
                    }]
                },
                issuetype: { name: config.defaultIssueType || 'Task' },
                priority: options.priority ? { name: this.mapPriorityToJira(options.priority) } : undefined,
                labels: options.labels || []
            }
        };

        const response = await axios.post(
            `https://${config.domain}/rest/api/3/issue`,
            issueData,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        return this.mapJiraIssueToIssue(response.data, config.domain);
    }

    private async updateJiraIssue(integration: ProjectManagementIntegration, issueId: string, updates: Partial<CreateIssueOptions>): Promise<Issue> {
        const config = integration.config as JiraConfig;
        const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
        
        const updateData: any = { fields: {} };
        
        if (updates.title) {
            updateData.fields.summary = updates.title;
        }
        
        if (updates.description) {
            updateData.fields.description = {
                type: 'doc',
                version: 1,
                content: [{
                    type: 'paragraph',
                    content: [{
                        type: 'text',
                        text: updates.description
                    }]
                }]
            };
        }
        
        if (updates.priority) {
            updateData.fields.priority = { name: this.mapPriorityToJira(updates.priority) };
        }
        
        if (updates.labels) {
            updateData.fields.labels = updates.labels;
        }

        await axios.put(
            `https://${config.domain}/rest/api/3/issue/${issueId}`,
            updateData,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        // Fetch updated issue
        const response = await axios.get(
            `https://${config.domain}/rest/api/3/issue/${issueId}`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                }
            }
        );

        return this.mapJiraIssueToIssue(response.data, config.domain);
    }

    private async syncJiraIssues(integration: ProjectManagementIntegration): Promise<Issue[]> {
        const config = integration.config as JiraConfig;
        const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
        
        const response = await axios.get(
            `https://${config.domain}/rest/api/3/search`,
            {
                params: {
                    jql: `project = ${config.projectKey} ORDER BY updated DESC`,
                    maxResults: 100
                },
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                }
            }
        );

        return response.data.issues.map((issue: any) => this.mapJiraIssueToIssue(issue, config.domain));
    }

    private async searchJiraIssues(integration: ProjectManagementIntegration, query: string): Promise<Issue[]> {
        const config = integration.config as JiraConfig;
        const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
        
        const response = await axios.get(
            `https://${config.domain}/rest/api/3/search`,
            {
                params: {
                    jql: `project = ${config.projectKey} AND text ~ "${query}" ORDER BY updated DESC`,
                    maxResults: 50
                },
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                }
            }
        );

        return response.data.issues.map((issue: any) => this.mapJiraIssueToIssue(issue, config.domain));
    }

    private async createLinearIssue(integration: ProjectManagementIntegration, options: CreateIssueOptions): Promise<Issue> {
        const config = integration.config as LinearConfig;
        
        const mutation = `
            mutation CreateIssue($input: IssueCreateInput!) {
                issueCreate(input: $input) {
                    success
                    issue {
                        id
                        identifier
                        title
                        description
                        state {
                            name
                        }
                        assignee {
                            name
                        }
                        priority
                        labels {
                            nodes {
                                name
                            }
                        }
                        createdAt
                        updatedAt
                        url
                    }
                }
            }
        `;

        const variables = {
            input: {
                teamId: config.teamId,
                projectId: config.projectId,
                title: options.title,
                description: options.description,
                priority: this.mapPriorityToLinear(options.priority),
                labelIds: [] // Would need to fetch label IDs first
            }
        };

        const response = await axios.post(
            'https://api.linear.app/graphql',
            { query: mutation, variables },
            {
                headers: {
                    'Authorization': config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.data.data.issueCreate.success) {
            throw new Error('Failed to create Linear issue');
        }

        return this.mapLinearIssueToIssue(response.data.data.issueCreate.issue);
    }

    private async updateLinearIssue(integration: ProjectManagementIntegration, issueId: string, updates: Partial<CreateIssueOptions>): Promise<Issue> {
        const config = integration.config as LinearConfig;
        
        const mutation = `
            mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
                issueUpdate(id: $id, input: $input) {
                    success
                    issue {
                        id
                        identifier
                        title
                        description
                        state {
                            name
                        }
                        assignee {
                            name
                        }
                        priority
                        labels {
                            nodes {
                                name
                            }
                        }
                        createdAt
                        updatedAt
                        url
                    }
                }
            }
        `;

        const input: any = {};
        
        if (updates.title) input.title = updates.title;
        if (updates.description) input.description = updates.description;
        if (updates.priority) input.priority = this.mapPriorityToLinear(updates.priority);

        const variables = { id: issueId, input };

        const response = await axios.post(
            'https://api.linear.app/graphql',
            { query: mutation, variables },
            {
                headers: {
                    'Authorization': config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.data.data.issueUpdate.success) {
            throw new Error('Failed to update Linear issue');
        }

        return this.mapLinearIssueToIssue(response.data.data.issueUpdate.issue);
    }

    private async syncLinearIssues(integration: ProjectManagementIntegration): Promise<Issue[]> {
        const config = integration.config as LinearConfig;
        
        const query = `
            query GetIssues {
                issues(
                    filter: {
                        team: { id: { eq: "${config.teamId}" } }
                        ${config.projectId ? `project: { id: { eq: "${config.projectId}" } }` : ''}
                    }
                    orderBy: updatedAt
                ) {
                    nodes {
                        id
                        identifier
                        title
                        description
                        state {
                            name
                        }
                        assignee {
                            name
                        }
                        priority
                        labels {
                            nodes {
                                name
                            }
                        }
                        createdAt
                        updatedAt
                        url
                    }
                }
            }
        `;

        const response = await axios.post(
            'https://api.linear.app/graphql',
            { query },
            {
                headers: {
                    'Authorization': config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.data.issues.nodes.map((issue: any) => this.mapLinearIssueToIssue(issue));
    }

    private async searchLinearIssues(integration: ProjectManagementIntegration, query: string): Promise<Issue[]> {
        const config = integration.config as LinearConfig;
        
        const graphqlQuery = `
            query SearchIssues($query: String!) {
                issueSearch(query: $query) {
                    nodes {
                        id
                        identifier
                        title
                        description
                        state {
                            name
                        }
                        assignee {
                            name
                        }
                        priority
                        labels {
                            nodes {
                                name
                            }
                        }
                        createdAt
                        updatedAt
                        url
                    }
                }
            }
        `;

        const response = await axios.post(
            'https://api.linear.app/graphql',
            { query: graphqlQuery, variables: { query } },
            {
                headers: {
                    'Authorization': config.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.data.issueSearch.nodes.map((issue: any) => this.mapLinearIssueToIssue(issue));
    }

    private mapJiraIssueToIssue(jiraIssue: any, domain: string): Issue {
        return {
            id: jiraIssue.id,
            key: jiraIssue.key,
            title: jiraIssue.fields.summary,
            description: this.extractTextFromJiraDescription(jiraIssue.fields.description),
            status: jiraIssue.fields.status.name,
            assignee: jiraIssue.fields.assignee?.displayName,
            priority: jiraIssue.fields.priority?.name,
            labels: jiraIssue.fields.labels || [],
            created: new Date(jiraIssue.fields.created),
            updated: new Date(jiraIssue.fields.updated),
            externalId: jiraIssue.key,
            externalUrl: `https://${domain}/browse/${jiraIssue.key}`
        };
    }

    private mapLinearIssueToIssue(linearIssue: any): Issue {
        return {
            id: linearIssue.id,
            key: linearIssue.identifier,
            title: linearIssue.title,
            description: linearIssue.description || '',
            status: linearIssue.state.name,
            assignee: linearIssue.assignee?.name,
            priority: this.mapLinearPriorityToString(linearIssue.priority),
            labels: linearIssue.labels?.nodes?.map((l: any) => l.name) || [],
            created: new Date(linearIssue.createdAt),
            updated: new Date(linearIssue.updatedAt),
            externalId: linearIssue.id,
            externalUrl: linearIssue.url
        };
    }

    private extractTextFromJiraDescription(description: any): string {
        if (!description) return '';
        if (typeof description === 'string') return description;
        
        // Handle Atlassian Document Format
        if (description.type === 'doc' && description.content) {
            return description.content
                .map((node: any) => this.extractTextFromNode(node))
                .join('\n');
        }
        
        return '';
    }

    private extractTextFromNode(node: any): string {
        if (node.type === 'text') return node.text;
        if (node.content) {
            return node.content.map((n: any) => this.extractTextFromNode(n)).join('');
        }
        return '';
    }

    private mapPriorityToJira(priority?: 'urgent' | 'high' | 'medium' | 'low'): string {
        switch (priority) {
            case 'urgent': return 'Highest';
            case 'high': return 'High';
            case 'medium': return 'Medium';
            case 'low': return 'Low';
            default: return 'Medium';
        }
    }

    private mapPriorityToLinear(priority?: 'urgent' | 'high' | 'medium' | 'low'): number {
        switch (priority) {
            case 'urgent': return 1;
            case 'high': return 2;
            case 'medium': return 3;
            case 'low': return 4;
            default: return 3;
        }
    }

    private mapLinearPriorityToString(priority: number): string {
        switch (priority) {
            case 1: return 'Urgent';
            case 2: return 'High';
            case 3: return 'Medium';
            case 4: return 'Low';
            default: return 'Medium';
        }
    }

    private setupSyncInterval(): void {
        // Sync issues every 5 minutes for enabled integrations
        setInterval(async () => {
            const integrations = Array.from(this.integrations.values());
            for (const integration of integrations) {
                if (integration.enabled && integration.syncSettings.syncIssues) {
                    try {
                        await this.syncIssues(integration.id);
                    } catch (error) {
                        console.error(`Failed to sync issues for ${integration.id}:`, error);
                    }
                }
            }
        }, 5 * 60 * 1000);
    }
}