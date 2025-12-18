import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const healthLatency = new Trend('health_latency');
const apiLatency = new Trend('api_latency');
const requestCount = new Counter('request_count');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.1'],
    health_latency: ['p(95)<100'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  group('Health Checks', function () {
    const healthRes = http.get(`${BASE_URL}/health`);
    healthLatency.add(healthRes.timings.duration);
    
    check(healthRes, {
      'health status is 200': (r) => r.status === 200,
      'health response time < 100ms': (r) => r.timings.duration < 100,
    });
    
    errorRate.add(healthRes.status !== 200);
    requestCount.add(1);
  });

  group('API Endpoints', function () {
    const corsHealthRes = http.get(`${BASE_URL}/api/cors-health`);
    apiLatency.add(corsHealthRes.timings.duration);
    
    check(corsHealthRes, {
      'CORS health status is 200': (r) => r.status === 200,
      'API response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    errorRate.add(corsHealthRes.status !== 200);
    requestCount.add(1);
  });

  group('Static Assets', function () {
    const indexRes = http.get(`${BASE_URL}/`);
    
    check(indexRes, {
      'index page loads': (r) => r.status === 200,
      'index response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    
    errorRate.add(indexRes.status !== 200);
    requestCount.add(1);
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'results.json': JSON.stringify(data, null, 2),
  };
}
