#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const checks = [
  {
    file: 'server/services/redis-idempotency.service.ts',
    mustContain: [
      'REDIS_URL is required in production for distributed idempotency',
      'Redis unavailable in production; refusing non-distributed lock',
    ],
  },
  {
    file: 'server/services/agent-session-cache.service.ts',
    mustContain: [
      'if (!isProduction) {',
      'this.setInMemory(sessionId, dbSession)',
    ],
  },
  {
    file: 'server/distributed/task-scheduler.ts',
    mustContain: [
      'scheduler:queue:${queueName}:running',
      'redisCache.sadd(this.getRunningKey(queueName), taskId)',
    ],
  },
  {
    file: 'server/collaboration/unified-collaboration-service.ts',
    mustContain: [
      'collab:presence:${roomId}',
      'redisCache.publish(this.getPresenceChannel(roomId)',
      'await this.hydrateRoomPresence(room)',
    ],
  },
  {
    file: 'server/services/agent-progress-service.ts',
    mustContain: [
      'agent:progress:task:${taskId}',
      'agent:progress:project:${projectId}:active',
      'await redisCache.sadd(this.getProjectTasksKey(projectId), taskId)',
    ],
  },
  {
    file: 'server/routes/agent.router.ts',
    mustContain: [
      'agent:pending-actions:projects',
      'agent:pending-actions:${projectId}',
      'Redis unavailable in production; refusing process-local pending agent actions',
    ],
  },
  {
    file: 'server/auth/auth-complete.ts',
    mustContain: [
      'auth:complete',
      'Redis unavailable in production; refusing process-local auth lockout state',
      'Redis unavailable in production; refusing process-local auth session state',
    ],
  },
  {
    file: 'server/auth/session-manager.ts',
    mustContain: [
      'auth:session-manager:session:${sessionId}',
      'auth:session-manager:user:${userId}:sessions',
      'Redis unavailable in production; refusing process-local session-manager state',
    ],
  },
  {
    file: 'server/services/agent-orchestrator.service.ts',
    mustContain: [
      'agent:orchestrator:recovery:pending',
      'agent:orchestrator:recovery:item:${sessionId}',
      'Redis unavailable in production; refusing process-local agent recovery queue',
    ],
  },
];

let failed = false;
for (const check of checks) {
  const source = readFileSync(check.file, 'utf8');
  for (const expected of check.mustContain) {
    if (!source.includes(expected)) {
      failed = true;
      console.error(`P0_MEMORY_AUDIT_FAIL ${check.file}: missing "${expected}"`);
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('P0_MEMORY_AUDIT_OK');
