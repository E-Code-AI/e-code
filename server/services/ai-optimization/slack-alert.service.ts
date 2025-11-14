/**
 * Slack Alert Service
 * Sends real-time alerts to Slack webhooks for production monitoring
 * 
 * Configuration: Set SLACK_WEBHOOK_URL environment variable
 * Get webhook URL from: https://api.slack.com/messaging/webhooks
 */

export interface SlackAlertPayload {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  context?: Record<string, any>;
  timestamp: Date;
}

export class SlackAlertService {
  private webhookUrl: string | null = null;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || null;
  }

  /**
   * Update Slack webhook URL at runtime (for testing)
   */
  setWebhookUrl(url: string | null): void {
    this.webhookUrl = url;
  }

  /**
   * Get current webhook URL (for admin UI)
   */
  getWebhookUrl(): string | null {
    return this.webhookUrl;
  }

  /**
   * Check if Slack alerts are enabled
   */
  isEnabled(): boolean {
    return this.webhookUrl !== null && this.webhookUrl.length > 0;
  }

  /**
   * Send alert to Slack webhook
   */
  async sendAlert(alert: SlackAlertPayload): Promise<boolean> {
    if (!this.isEnabled() || !this.webhookUrl) {
      return false;
    }

    try {
      const color = this.getSeverityColor(alert.severity);
      const emoji = this.getSeverityEmoji(alert.severity);

      const payload = {
        attachments: [
          {
            color,
            title: `${emoji} ${alert.title}`,
            text: alert.message,
            fields: alert.context
              ? Object.entries(alert.context).map(([key, value]) => ({
                  title: key,
                  value: String(value),
                  short: true,
                }))
              : [],
            footer: 'E-Code Platform AI Optimization',
            ts: Math.floor(alert.timestamp.getTime() / 1000),
          },
        ],
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('[Slack Alert] Failed to send alert:', error);
      return false;
    }
  }

  /**
   * Get Slack color for severity level
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#d32f2f'; // Red
      case 'warning':
        return '#f57c00'; // Orange
      case 'info':
        return '#0288d1'; // Blue
      default:
        return '#757575'; // Gray
    }
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📌';
    }
  }

  /**
   * Test webhook connection
   */
  async testWebhook(): Promise<{ success: boolean; error?: string }> {
    if (!this.webhookUrl) {
      return { success: false, error: 'No webhook URL configured' };
    }

    try {
      await this.sendAlert({
        severity: 'info',
        title: 'Slack Integration Test',
        message: 'This is a test message from E-Code Platform AI Optimization alerts.',
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const slackAlertService = new SlackAlertService();
