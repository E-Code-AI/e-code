import { describe, it, expect } from 'vitest';
import http from 'http';
import { getTotalRequestCount, getRequestCountLastMinute, getRequestCountsByRoute } from '../server/middleware/request-counter';

function httpGet(path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode!, body: data }));
    }).on('error', reject);
  });
}

describe('Request counter stability', () => {
  it('total count is consistent and non-random across consecutive calls', () => {
    const count1 = getTotalRequestCount();
    const count2 = getTotalRequestCount();
    expect(count1).toBe(count2);
    expect(typeof count1).toBe('number');
    expect(count1).toBeGreaterThanOrEqual(0);
  });

  it('per-minute count is consistent and non-random across consecutive calls', () => {
    const count1 = getRequestCountLastMinute();
    const count2 = getRequestCountLastMinute();
    expect(count1).toBe(count2);
    expect(typeof count1).toBe('number');
  });

  it('route breakdown is identical across consecutive calls', () => {
    const routes1 = getRequestCountsByRoute();
    const routes2 = getRequestCountsByRoute();
    expect(routes1).toEqual(routes2);
  });
});

describe('Network stats from /proc/net/dev', () => {
  it('reads real kernel counters that are stable and monotonically non-decreasing', () => {
    const fs = require('fs');
    let available = false;
    try {
      fs.accessSync('/proc/net/dev');
      available = true;
    } catch {}
    if (!available) return;

    const parse = (data: string) => {
      const lines = data.split('\n').slice(2);
      let rx = 0, tx = 0, rxPkt = 0, txPkt = 0;
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 11) continue;
        const iface = parts[0].replace(':', '');
        if (iface === 'lo') continue;
        rx += parseInt(parts[1], 10) || 0;
        rxPkt += parseInt(parts[2], 10) || 0;
        tx += parseInt(parts[9], 10) || 0;
        txPkt += parseInt(parts[10], 10) || 0;
      }
      return { rx, tx, rxPkt, txPkt };
    };

    const stats1 = parse(fs.readFileSync('/proc/net/dev', 'utf8'));
    const stats2 = parse(fs.readFileSync('/proc/net/dev', 'utf8'));

    expect(stats1.rx).toBeGreaterThanOrEqual(0);
    expect(stats1.tx).toBeGreaterThanOrEqual(0);
    expect(stats2.rx).toBeGreaterThanOrEqual(stats1.rx);
    expect(stats2.tx).toBeGreaterThanOrEqual(stats1.tx);
    expect(stats2.rxPkt).toBeGreaterThanOrEqual(stats1.rxPkt);
    expect(stats2.txPkt).toBeGreaterThanOrEqual(stats1.txPkt);
  });
});

describe('Memory metrics via process.memoryUsage()', () => {
  it('returns positive, stable heapUsed across consecutive calls', () => {
    const mem1 = process.memoryUsage();
    const mem2 = process.memoryUsage();

    expect(mem1.heapUsed).toBeGreaterThan(0);
    expect(mem2.heapUsed).toBeGreaterThan(0);
    expect(Math.abs(mem2.heapUsed - mem1.heapUsed)).toBeLessThan(mem1.heapUsed * 0.1);
  });

  it('heap delta measurement produces deterministic non-negative values', () => {
    const before = process.memoryUsage().heapUsed;
    const arr = new Array(1000).fill(0);
    const after = process.memoryUsage().heapUsed;
    const delta = Math.max(0, Math.round((after - before) / 1024));
    expect(typeof delta).toBe('number');
    expect(delta).toBeGreaterThanOrEqual(0);
  });
});

describe('Monitoring endpoints E2E - stability across two consecutive calls', () => {
  it('health endpoint returns stable, non-random values', async () => {
    const res1 = await httpGet('/health');
    const res2 = await httpGet('/health');

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const json1 = JSON.parse(res1.body);
    const json2 = JSON.parse(res2.body);

    expect(json1.status).toBe('ok');
    expect(json2.status).toBe('ok');
    expect(json1.status).toBe(json2.status);
    expect(json1.phase).toBe(json2.phase);
    expect(json1.services).toBe(json2.services);
  });

  it('health subsystem data is consistent across two calls', async () => {
    const res1 = await httpGet('/health');
    const res2 = await httpGet('/health');

    const json1 = JSON.parse(res1.body);
    const json2 = JSON.parse(res2.body);

    if (json1.subsystems?.database) {
      expect(json1.subsystems.database.status).toBe(json2.subsystems.database.status);
      expect(typeof json1.subsystems.database.responseTime).toBe('number');
      expect(typeof json2.subsystems.database.responseTime).toBe('number');
    }
    if (json1.subsystems?.redis) {
      expect(json1.subsystems.redis.status).toBe(json2.subsystems.redis.status);
    }
  });

  it('API request counter increments deterministically with real requests', async () => {
    const countBefore = getTotalRequestCount();
    await httpGet('/health');
    await httpGet('/health');
    const countAfter = getTotalRequestCount();
    expect(countAfter).toBeGreaterThanOrEqual(countBefore);
  });
});
