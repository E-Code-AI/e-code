interface TelemetryEvent {
  eventName: string;
  userId?: number;
  sessionId?: string;
  timestamp: Date;
  properties: Record<string, any>;
  context: {
    userAgent?: string;
    ip?: string;
    feature: string;
    version: string;
  };
}

interface TelemetryConfig {
  enabled: boolean;
  sampleRate: number; // 0.0 to 1.0
  batchSize: number;
  flushInterval: number; // ms
}

export class TelemetryService {
  private static instance: TelemetryService;
  private events: TelemetryEvent[] = [];
  private config: TelemetryConfig = {
    enabled: process.env.NODE_ENV === 'production',
    sampleRate: 0.1, // 10% sampling to prevent noise
    batchSize: 100,
    flushInterval: 30000, // 30 seconds
  };
  
  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }
  
  constructor() {
    // Set up periodic flush
    if (this.config.enabled) {
      setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
  }
  
  track(eventName: string, properties: Record<string, any> = {}, context: Partial<TelemetryEvent['context']> = {}): void {
    if (!this.config.enabled) return;
    
    // Apply sampling
    if (Math.random() > this.config.sampleRate) return;
    
    const event: TelemetryEvent = {
      eventName,
      timestamp: new Date(),
      properties: this.sanitizeProperties(properties),
      context: {
        feature: 'unknown',
        version: '1.0.0',
        ...context,
      },
    };
    
    this.events.push(event);
    
    // Auto-flush if batch is full
    if (this.events.length >= this.config.batchSize) {
      this.flush();
    }
  }
  
  // AI UX Enhancement Events
  trackImprovePrompt(userId: number, sessionId: string, success: boolean, duration: number): void {
    this.track('improve_prompt', {
      userId,
      sessionId,
      success,
      duration,
    }, { feature: 'ai_ux' });
  }
  
  trackAIModeToggle(userId: number, mode: 'extended_thinking' | 'high_power', enabled: boolean): void {
    this.track('ai_mode_toggle', {
      userId,
      mode,
      enabled,
    }, { feature: 'ai_ux' });
  }
  
  trackAgentPause(userId: number, sessionId: string, reason: string): void {
    this.track('agent_pause', {
      userId,
      sessionId,
      reason,
    }, { feature: 'ai_ux' });
  }
  
  trackAgentResume(userId: number, sessionId: string): void {
    this.track('agent_resume', {
      userId,
      sessionId,
    }, { feature: 'ai_ux' });
  }
  
  // Web Content Integration Events
  trackURLImport(userId: number, success: boolean, duration: number, bytesProcessed: number, includeScreenshot: boolean): void {
    this.track('url_import', {
      userId,
      success,
      duration,
      bytesProcessed,
      includeScreenshot,
    }, { feature: 'web_content' });
  }
  
  trackScreenshotCapture(userId: number, success: boolean, duration: number, dimensions: { width: number; height: number }): void {
    this.track('screenshot_capture', {
      userId,
      success,
      duration,
      width: dimensions.width,
      height: dimensions.height,
    }, { feature: 'web_content' });
  }
  
  trackTextExtraction(userId: number, success: boolean, wordCount: number, method: 'html' | 'file'): void {
    this.track('text_extraction', {
      userId,
      success,
      wordCount,
      method,
    }, { feature: 'web_content' });
  }
  
  // Import Tools Events
  trackFigmaImport(userId: number, success: boolean, duration: number, componentsGenerated: number, tokensExtracted: number): void {
    this.track('figma_import', {
      userId,
      success,
      duration,
      componentsGenerated,
      tokensExtracted,
    }, { feature: 'import_tools' });
  }
  
  trackBoltMigration(userId: number, success: boolean, duration: number, filesProcessed: number, framework: string): void {
    this.track('bolt_migration', {
      userId,
      success,
      duration,
      filesProcessed,
      framework,
    }, { feature: 'import_tools' });
  }
  
  trackGitHubImport(userId: number, success: boolean, duration: number, filesImported: number, repoSize: number): void {
    this.track('github_import', {
      userId,
      success,
      duration,
      filesImported,
      repoSize,
    }, { feature: 'import_tools' });
  }
  
  // Feature Flag Events
  trackFeatureFlagChange(userId: number, flagPath: string, oldValue: boolean, newValue: boolean): void {
    this.track('feature_flag_change', {
      userId,
      flagPath,
      oldValue,
      newValue,
    }, { feature: 'feature_flags' });
  }
  
  // Error Events
  trackError(error: Error, userId?: number, context: Record<string, any> = {}): void {
    this.track('error', {
      userId,
      errorMessage: error.message,
      errorStack: error.stack,
      ...context,
    }, { feature: 'error_tracking' });
  }
  
  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(properties)) {
      // Remove sensitive information
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && this.containsSensitiveData(value)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'auth',
      'email', 'phone', 'address', 'credit_card'
    ];
    
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
  }
  
  private containsSensitiveData(value: string): boolean {
    // Simple regex patterns for common sensitive data
    const patterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /sk-[a-zA-Z0-9]{48}/, // OpenAI API key pattern
    ];
    
    return patterns.some(pattern => pattern.test(value));
  }
  
  private async flush(): Promise<void> {
    if (this.events.length === 0) return;
    
    const eventsToFlush = [...this.events];
    this.events = [];
    
    try {
      // In a real implementation, this would send to analytics service
      // For now, we'll just log structured events
      console.log('[TELEMETRY] Flushing events:', {
        count: eventsToFlush.length,
        events: eventsToFlush,
      });
      
      // You could send to services like:
      // - Mixpanel
      // - Amplitude
      // - Google Analytics
      // - Custom analytics endpoint
      
    } catch (error) {
      console.error('Failed to flush telemetry events:', error);
      // Re-add events to queue for retry
      this.events.unshift(...eventsToFlush);
    }
  }
  
  async forceFlush(): Promise<void> {
    await this.flush();
  }
  
  updateConfig(newConfig: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  getStats(): { eventsQueued: number; config: TelemetryConfig } {
    return {
      eventsQueued: this.events.length,
      config: { ...this.config },
    };
  }
}