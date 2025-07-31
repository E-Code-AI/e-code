import { AxiosInstance } from 'axios';
import { Integration, IntegrationCreateOptions, MetricsData, AlertRule } from '../types';

export class IntegrationManager {
  constructor(private client: AxiosInstance) {}

  /**
   * Create new integration
   */
  async create(options: IntegrationCreateOptions): Promise<Integration> {
    const response = await this.client.post('/integrations', options);
    return response.data;
  }

  /**
   * Get integration by ID
   */
  async get(id: string): Promise<Integration> {
    const response = await this.client.get(`/integrations/${id}`);
    return response.data;
  }

  /**
   * List integrations
   */
  async list(projectId?: string, type?: string): Promise<Integration[]> {
    const response = await this.client.get('/integrations', {
      params: { projectId, type }
    });
    return response.data;
  }

  /**
   * Update integration
   */
  async update(id: string, updates: Partial<IntegrationCreateOptions>): Promise<Integration> {
    const response = await this.client.put(`/integrations/${id}`, updates);
    return response.data;
  }

  /**
   * Delete integration
   */
  async delete(id: string): Promise<void> {
    await this.client.delete(`/integrations/${id}`);
  }

  /**
   * Test integration connection
   */
  async test(id: string): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    const response = await this.client.post(`/integrations/${id}/test`);
    return response.data;
  }

  // Slack Integration Methods
  /**
   * Configure Slack integration
   */
  async configureSlack(projectId: string, config: {
    botToken: string;
    channelId: string;
    notifications?: string[];
  }): Promise<void> {
    await this.client.post(`/integrations/slack/configure/${projectId}`, config);
  }

  /**
   * Send Slack message
   */
  async sendSlackMessage(projectId: string, options: {
    channel?: string;
    text: string;
    attachments?: any[];
    blocks?: any[];
  }): Promise<void> {
    await this.client.post(`/integrations/slack/send/${projectId}`, options);
  }

  /**
   * Get Slack channels
   */
  async getSlackChannels(projectId: string): Promise<{
    id: string;
    name: string;
    isPrivate: boolean;
    memberCount: number;
  }[]> {
    const response = await this.client.get(`/integrations/slack/channels/${projectId}`);
    return response.data;
  }

  /**
   * Create Slack webhook
   */
  async createSlackWebhook(projectId: string, channelId: string): Promise<{
    webhookUrl: string;
  }> {
    const response = await this.client.post(`/integrations/slack/webhook/${projectId}`, {
      channelId
    });
    return response.data;
  }

  // Discord Integration Methods
  /**
   * Configure Discord integration
   */
  async configureDiscord(projectId: string, config: {
    botToken: string;
    guildId: string;
    channelId: string;
    notifications?: string[];
  }): Promise<void> {
    await this.client.post(`/integrations/discord/configure/${projectId}`, config);
  }

  /**
   * Send Discord message
   */
  async sendDiscordMessage(projectId: string, options: {
    channel?: string;
    content: string;
    embeds?: any[];
  }): Promise<void> {
    await this.client.post(`/integrations/discord/send/${projectId}`, options);
  }

  /**
   * Get Discord channels
   */
  async getDiscordChannels(projectId: string): Promise<{
    id: string;
    name: string;
    type: string;
    position: number;
  }[]> {
    const response = await this.client.get(`/integrations/discord/channels/${projectId}`);
    return response.data;
  }

  /**
   * Create Discord webhook
   */
  async createDiscordWebhook(projectId: string, channelId: string, name: string): Promise<{
    webhookUrl: string;
  }> {
    const response = await this.client.post(`/integrations/discord/webhook/${projectId}`, {
      channelId,
      name
    });
    return response.data;
  }

  // JIRA Integration Methods
  /**
   * Configure JIRA integration
   */
  async configureJira(projectId: string, config: {
    url: string;
    username: string;
    apiToken: string;
    projectKey: string;
  }): Promise<void> {
    await this.client.post(`/integrations/jira/configure/${projectId}`, config);
  }

  /**
   * Create JIRA issue
   */
  async createJiraIssue(projectId: string, issue: {
    summary: string;
    description: string;
    issueType: string;
    priority?: string;
    assignee?: string;
    labels?: string[];
  }): Promise<{
    id: string;
    key: string;
    url: string;
  }> {
    const response = await this.client.post(`/integrations/jira/issues/${projectId}`, issue);
    return response.data;
  }

  /**
   * Get JIRA issues
   */
  async getJiraIssues(projectId: string, limit: number = 50): Promise<{
    id: string;
    key: string;
    summary: string;
    status: string;
    assignee?: string;
    created: string;
    updated: string;
  }[]> {
    const response = await this.client.get(`/integrations/jira/issues/${projectId}`, {
      params: { limit }
    });
    return response.data;
  }

  /**
   * Update JIRA issue
   */
  async updateJiraIssue(projectId: string, issueId: string, updates: {
    summary?: string;
    description?: string;
    status?: string;
    assignee?: string;
    labels?: string[];
  }): Promise<void> {
    await this.client.put(`/integrations/jira/issues/${projectId}/${issueId}`, updates);
  }

  // Linear Integration Methods
  /**
   * Configure Linear integration
   */
  async configureLinear(projectId: string, config: {
    apiKey: string;
    teamId: string;
  }): Promise<void> {
    await this.client.post(`/integrations/linear/configure/${projectId}`, config);
  }

  /**
   * Create Linear issue
   */
  async createLinearIssue(projectId: string, issue: {
    title: string;
    description: string;
    priority?: number;
    assigneeId?: string;
    labelIds?: string[];
  }): Promise<{
    id: string;
    identifier: string;
    url: string;
  }> {
    const response = await this.client.post(`/integrations/linear/issues/${projectId}`, issue);
    return response.data;
  }

  /**
   * Get Linear issues
   */
  async getLinearIssues(projectId: string, limit: number = 50): Promise<{
    id: string;
    identifier: string;
    title: string;
    state: string;
    assignee?: string;
    createdAt: string;
    updatedAt: string;
  }[]> {
    const response = await this.client.get(`/integrations/linear/issues/${projectId}`, {
      params: { limit }
    });
    return response.data;
  }

  /**
   * Update Linear issue
   */
  async updateLinearIssue(projectId: string, issueId: string, updates: {
    title?: string;
    description?: string;
    stateId?: string;
    assigneeId?: string;
    priority?: number;
  }): Promise<void> {
    await this.client.put(`/integrations/linear/issues/${projectId}/${issueId}`, updates);
  }

  /**
   * Sync project issues
   */
  async syncProjectIssues(projectId: string): Promise<{
    synced: number;
    created: number;
    updated: number;
    errors: string[];
  }> {
    const response = await this.client.get(`/integrations/sync/${projectId}`);
    return response.data;
  }

  // Datadog Integration Methods
  /**
   * Configure Datadog integration
   */
  async configureDatadog(projectId: string, config: {
    apiKey: string;
    appKey: string;
    site?: string;
  }): Promise<void> {
    await this.client.post(`/integrations/datadog/configure/${projectId}`, config);
  }

  /**
   * Send metrics to Datadog
   */
  async sendDatadogMetrics(projectId: string, metrics: MetricsData[]): Promise<void> {
    await this.client.post(`/integrations/datadog/metrics/${projectId}`, { metrics });
  }

  /**
   * Get Datadog metrics
   */
  async getDatadogMetrics(projectId: string, query: string, from: number, to: number): Promise<{
    series: {
      metric: string;
      points: [number, number][];
      tags: string[];
    }[];
  }> {
    const response = await this.client.get(`/integrations/datadog/metrics/${projectId}`, {
      params: { query, from, to }
    });
    return response.data;
  }

  /**
   * Create Datadog alert
   */
  async createDatadogAlert(projectId: string, alert: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    const response = await this.client.post(`/integrations/datadog/alerts/${projectId}`, alert);
    return response.data;
  }

  /**
   * Get Datadog alerts
   */
  async getDatadogAlerts(projectId: string): Promise<AlertRule[]> {
    const response = await this.client.get(`/integrations/datadog/alerts/${projectId}`);
    return response.data;
  }

  // New Relic Integration Methods
  /**
   * Configure New Relic integration
   */
  async configureNewRelic(projectId: string, config: {
    apiKey: string;
    accountId: string;
    region?: 'US' | 'EU';
  }): Promise<void> {
    await this.client.post(`/integrations/newrelic/configure/${projectId}`, config);
  }

  /**
   * Send metrics to New Relic
   */
  async sendNewRelicMetrics(projectId: string, metrics: MetricsData[]): Promise<void> {
    await this.client.post(`/integrations/newrelic/metrics/${projectId}`, { metrics });
  }

  /**
   * Get New Relic metrics
   */
  async getNewRelicMetrics(projectId: string, nrql: string): Promise<{
    results: any[];
    metadata: any;
  }> {
    const response = await this.client.get(`/integrations/newrelic/metrics/${projectId}`, {
      params: { nrql }
    });
    return response.data;
  }

  /**
   * Create New Relic alert
   */
  async createNewRelicAlert(projectId: string, alert: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    const response = await this.client.post(`/integrations/newrelic/alerts/${projectId}`, alert);
    return response.data;
  }

  /**
   * Get New Relic alerts
   */
  async getNewRelicAlerts(projectId: string): Promise<AlertRule[]> {
    const response = await this.client.get(`/integrations/newrelic/alerts/${projectId}`);
    return response.data;
  }

  /**
   * Track application performance
   */
  async trackPerformance(projectId: string, data: {
    metrics: MetricsData[];
    events?: any[];
    traces?: any[];
  }): Promise<void> {
    await this.client.post(`/integrations/performance/track/${projectId}`, data);
  }
}