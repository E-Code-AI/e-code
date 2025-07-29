import { createLogger } from '../utils/logger';

const logger = createLogger('simple-analytics');

interface AnalyticsEvent {
  projectId: number;
  type: 'pageview' | 'visit' | 'click' | 'conversion';
  path?: string;
  userId?: number;
  sessionId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ProjectAnalytics {
  totalVisits: number;
  uniqueVisitors: Set<string>;
  pageViews: number;
  events: AnalyticsEvent[];
  sessions: Map<string, { start: Date; end: Date; pages: string[] }>;
}

export class SimpleAnalytics {
  private analytics: Map<number, ProjectAnalytics> = new Map();
  
  constructor() {
    // Initialize with some sample data
    this.initializeSampleData();
  }
  
  private initializeSampleData() {
    // Add some sample analytics for testing
    const sampleProjectId = 1;
    const sampleAnalytics: ProjectAnalytics = {
      totalVisits: 150,
      uniqueVisitors: new Set(['user1', 'user2', 'user3', 'user4', 'user5']),
      pageViews: 450,
      events: [],
      sessions: new Map()
    };
    
    // Generate some sample events
    const now = new Date();
    for (let i = 0; i < 20; i++) {
      const event: AnalyticsEvent = {
        projectId: sampleProjectId,
        type: i % 3 === 0 ? 'pageview' : 'visit',
        path: ['/', '/about', '/features', '/pricing'][i % 4],
        sessionId: `session${i % 5}`,
        timestamp: new Date(now.getTime() - i * 60 * 60 * 1000) // Past hours
      };
      sampleAnalytics.events.push(event);
    }
    
    this.analytics.set(sampleProjectId, sampleAnalytics);
  }
  
  async trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>): Promise<void> {
    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date()
    };
    
    let projectAnalytics = this.analytics.get(event.projectId);
    if (!projectAnalytics) {
      projectAnalytics = {
        totalVisits: 0,
        uniqueVisitors: new Set(),
        pageViews: 0,
        events: [],
        sessions: new Map()
      };
      this.analytics.set(event.projectId, projectAnalytics);
    }
    
    // Update counters
    if (event.type === 'visit') {
      projectAnalytics.totalVisits++;
      if (event.sessionId) {
        projectAnalytics.uniqueVisitors.add(event.sessionId);
      }
    } else if (event.type === 'pageview') {
      projectAnalytics.pageViews++;
    }
    
    // Track session
    if (event.sessionId && event.path) {
      const session = projectAnalytics.sessions.get(event.sessionId);
      if (session) {
        session.end = fullEvent.timestamp;
        session.pages.push(event.path);
      } else {
        projectAnalytics.sessions.set(event.sessionId, {
          start: fullEvent.timestamp,
          end: fullEvent.timestamp,
          pages: [event.path]
        });
      }
    }
    
    projectAnalytics.events.push(fullEvent);
    
    logger.info(`Tracked ${event.type} event for project ${event.projectId}`);
  }
  
  async getAnalytics(projectId: number, timeRange: string = '7d'): Promise<any> {
    const projectAnalytics = this.analytics.get(projectId);
    if (!projectAnalytics) {
      return this.getEmptyAnalytics();
    }
    
    // Calculate time range
    const now = new Date();
    const rangeMs = this.parseTimeRange(timeRange);
    const startDate = new Date(now.getTime() - rangeMs);
    
    // Filter events by time range
    const recentEvents = projectAnalytics.events.filter(
      event => event.timestamp >= startDate
    );
    
    // Calculate metrics
    const uniqueVisitors = new Set(recentEvents.map(e => e.sessionId).filter(Boolean));
    const pageViews = recentEvents.filter(e => e.type === 'pageview').length;
    const visits = recentEvents.filter(e => e.type === 'visit').length;
    
    // Calculate page stats
    const pageStats = new Map<string, { views: number; uniqueViews: number }>();
    recentEvents.forEach(event => {
      if (event.path) {
        const stats = pageStats.get(event.path) || { views: 0, uniqueViews: 0 };
        if (event.type === 'pageview') {
          stats.views++;
          stats.uniqueViews = new Set([...Array(stats.uniqueViews), event.sessionId]).size;
        }
        pageStats.set(event.path, stats);
      }
    });
    
    // Calculate traffic sources (simulated)
    const sources = [
      { name: 'Direct', visitors: Math.floor(uniqueVisitors.size * 0.4), percentage: 40 },
      { name: 'Search', visitors: Math.floor(uniqueVisitors.size * 0.3), percentage: 30 },
      { name: 'Social', visitors: Math.floor(uniqueVisitors.size * 0.2), percentage: 20 },
      { name: 'Referral', visitors: Math.floor(uniqueVisitors.size * 0.1), percentage: 10 }
    ];
    
    // Calculate countries (simulated)
    const countries = [
      { name: 'United States', visitors: Math.floor(uniqueVisitors.size * 0.5), percentage: 50 },
      { name: 'United Kingdom', visitors: Math.floor(uniqueVisitors.size * 0.2), percentage: 20 },
      { name: 'Canada', visitors: Math.floor(uniqueVisitors.size * 0.15), percentage: 15 },
      { name: 'Other', visitors: Math.floor(uniqueVisitors.size * 0.15), percentage: 15 }
    ];
    
    // Calculate devices (simulated)
    const devices = [
      { name: 'Desktop', visitors: Math.floor(uniqueVisitors.size * 0.6), percentage: 60 },
      { name: 'Mobile', visitors: Math.floor(uniqueVisitors.size * 0.35), percentage: 35 },
      { name: 'Tablet', visitors: Math.floor(uniqueVisitors.size * 0.05), percentage: 5 }
    ];
    
    // Convert page stats to array
    const pages = Array.from(pageStats.entries()).map(([path, stats]) => ({
      path,
      views: stats.views,
      uniqueViews: stats.uniqueViews,
      avgTime: Math.floor(Math.random() * 180) + 30, // 30-210 seconds
      bounceRate: Math.floor(Math.random() * 40) + 20 // 20-60%
    }));
    
    // Calculate realtime (last 5 minutes)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const realtimeEvents = projectAnalytics.events.filter(
      event => event.timestamp >= fiveMinutesAgo
    );
    const realtimeUsers = new Set(realtimeEvents.map(e => e.sessionId).filter(Boolean));
    
    return {
      overview: {
        totalVisits: visits,
        uniqueVisitors: uniqueVisitors.size,
        pageViews: pageViews,
        bounceRate: Math.floor(Math.random() * 30) + 20, // 20-50%
        avgSessionDuration: Math.floor(Math.random() * 300) + 60, // 60-360 seconds
        conversionRate: Math.floor(Math.random() * 10) + 2 // 2-12%
      },
      traffic: {
        sources,
        countries,
        devices
      },
      pages,
      realtime: {
        activeUsers: realtimeUsers.size,
        pageViews: realtimeEvents.filter(e => e.type === 'pageview').length,
        topPages: pages.slice(0, 3).map(p => ({
          path: p.path,
          activeUsers: Math.floor(Math.random() * realtimeUsers.size) + 1
        }))
      }
    };
  }
  
  private parseTimeRange(range: string): number {
    const match = range.match(/(\d+)([dhmy])/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'm': return value * 30 * 24 * 60 * 60 * 1000;
      case 'y': return value * 365 * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }
  
  private getEmptyAnalytics() {
    return {
      overview: {
        totalVisits: 0,
        uniqueVisitors: 0,
        pageViews: 0,
        bounceRate: 0,
        avgSessionDuration: 0,
        conversionRate: 0
      },
      traffic: {
        sources: [],
        countries: [],
        devices: []
      },
      pages: [],
      realtime: {
        activeUsers: 0,
        pageViews: 0,
        topPages: []
      }
    };
  }
  
  async getProjectStats(projectId: number): Promise<any> {
    const analytics = await this.getAnalytics(projectId, '30d');
    
    return {
      views: analytics.overview.pageViews,
      visitors: analytics.overview.uniqueVisitors,
      avgDuration: analytics.overview.avgSessionDuration,
      topCountries: analytics.traffic.countries.slice(0, 3),
      growthRate: Math.floor(Math.random() * 50) - 10 // -10% to +40%
    };
  }
  
  async getAIRequestCount(userId: number): Promise<number> {
    // Find AI requests from tracked events
    let aiRequestCount = 0;
    this.analytics.forEach((projectAnalytics) => {
      projectAnalytics.events.forEach((event) => {
        if (event.userId === userId && 
            event.path?.includes('/ai/')) {
          aiRequestCount++;
        }
      });
    });
    return aiRequestCount;
  }
  
  async getBandwidthUsage(userId: number): Promise<number> {
    // Calculate bandwidth from tracked events
    let bandwidth = 0;
    this.analytics.forEach((projectAnalytics) => {
      projectAnalytics.events.forEach((event) => {
        if (event.userId === userId) {
          // Estimate bandwidth based on page views and API calls
          if (event.type === 'pageview') {
            bandwidth += 500 * 1024; // 500KB per page view
          } else if (event.type === 'click' || event.type === 'conversion') {
            bandwidth += 50 * 1024; // 50KB per API call
          }
        }
      });
    });
    return bandwidth;
  }
}

export const simpleAnalytics = new SimpleAnalytics();
export const analyticsService = simpleAnalytics; // Alias for backward compatibility