# ADR 003: Observability Architecture

**Date:** 2025-11-18
**Status:** Accepted
**Decision Makers:** Platform Team, SRE Team

## Context

Fortune 500 enterprises require comprehensive observability to ensure system reliability, debug issues quickly, and optimize performance. E-Code needs a production-grade observability stack.

## Decision

We will implement the three pillars of observability:

### 1. **Metrics** (`lib/analytics.ts`)

**Web Vitals Monitoring:**
- Largest Contentful Paint (LCP) - < 2.5s
- First Input Delay (FID) - < 100ms
- Cumulative Layout Shift (CLS) - < 0.1
- Time to First Byte (TTFB) - < 800ms

**Performance Metrics:**
- Component render times
- Function execution times
- Memory usage tracking
- Long task detection (> 50ms)
- Bundle size monitoring

**Business Metrics:**
- User engagement (DAU, MAU)
- Feature adoption rates
- Error rates by feature
- Conversion funnels

### 2. **Logs** (`lib/logger.ts`)

**Structured Logging:**
- 5 log levels: DEBUG, INFO, WARN, ERROR, CRITICAL
- JSON format for machine parsing
- Context enrichment (userId, sessionId)
- Automatic batching and sending
- Local buffering (1000 entries)

**Log Retention:**
- DEBUG: 7 days
- INFO: 30 days
- WARN: 90 days
- ERROR: 1 year
- CRITICAL: Indefinite

### 3. **Traces** (via ErrorBoundary + Analytics)

**Error Tracking:**
- Component stack traces
- User interaction replay
- Breadcrumb trail
- Environment context
- Sentry integration

**Distributed Tracing:**
- Request ID propagation
- Service dependency mapping
- Latency breakdown
- Error correlation

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├──► Analytics ──► Google Analytics / Mixpanel
       ├──► Logger ────► CloudWatch / Datadog
       └──► Errors ────► Sentry / Rollbar
```

## Consequences

### Positive
✅ Real-time system visibility
✅ Fast incident response (< 5 min MTTD)
✅ Data-driven optimization
✅ Proactive issue detection
✅ SLA monitoring and reporting
✅ Compliance audit trails

### Negative
⚠️ Data storage costs
⚠️ Network overhead for telemetry
⚠️ Privacy considerations (PII handling)

### Risks
- Data volume may exceed budget
- Performance impact from excessive logging
- Privacy regulations (GDPR, CCPA)

## Implementation

**Files Created:**
- `client/src/lib/analytics.ts` - Analytics manager
- `client/src/lib/logger.ts` - Structured logger
- `client/src/components/ErrorBoundary.tsx` - Error tracking

**Integrations:**
- Google Analytics 4
- Mixpanel
- Sentry
- Datadog (optional)

## Dashboards

**1. Performance Dashboard**
- Web Vitals trends
- Page load time distribution
- API response times
- Error rates

**2. User Behavior Dashboard**
- User flows
- Feature usage heatmap
- Conversion funnels
- Session recordings

**3. System Health Dashboard**
- Uptime percentage
- Error budget consumption
- Deployment frequency
- Mean Time to Recovery (MTTR)

## Alerts

**Critical (P1) - Immediate Response:**
- Error rate > 5%
- API latency > 5s (p95)
- Uptime < 99%

**Warning (P2) - Next Business Day:**
- Error rate > 1%
- LCP > 4s
- Memory leak detected

**Info (P3) - Weekly Review:**
- New error types
- Performance degradation trends
- Unusual traffic patterns

## SLOs (Service Level Objectives)

- **Availability:** 99.9% uptime (< 43 minutes downtime/month)
- **Performance:** 95% of requests < 2s response time
- **Error Rate:** < 0.1% of all requests
- **Data Loss:** 0% for committed transactions

## Privacy & Compliance

**Data Collection:**
- No PII in logs without explicit consent
- IP anonymization enabled
- User opt-out support
- GDPR Article 6 compliance

**Data Retention:**
- Automatic purging per policy
- Encrypted at rest
- Access controls via IAM

## References

- [Three Pillars of Observability](https://www.oreilly.com/library/view/distributed-systems-observability/9781492033431/)
- [Google SRE Book](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Web Vitals](https://web.dev/vitals/)
