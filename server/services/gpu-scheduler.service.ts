/**
 * GpuScheduler — allocates GPU instances for projects that need accelerated
 * workloads (training, inference, fine-tuning).
 *
 * The schema captures `gpu_instances` (capacity inventory) and `gpu_usage`
 * (per-session utilization). This service is the policy layer on top of
 * those tables: pick the cheapest available instance of the requested type,
 * mark it active for a session, persist usage on release.
 *
 * For environments without real GPU infrastructure the inventory is seeded
 * from `GPU_POOL` (env var, JSON array). In production a separate worker
 * keeps it in sync with the cloud provider.
 */

import { db } from '../db';
import { gpuInstances, gpuUsage } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import * as crypto from 'crypto';
import { createLogger } from '../utils/logger';

const logger = createLogger('gpu-scheduler');

// Per-type fallback pricing in USD/hour, loosely modeled on AWS on-demand.
const DEFAULT_PRICE: Record<string, number> = {
  T4: 0.526,
  A10G: 1.006,
  A100: 4.10,
  H100: 12.29,
};

export interface GpuRequest {
  projectId: number;
  userId: number;
  gpuType: string;
  region?: string;
  estimatedDurationMin?: number;
}

export interface GpuLease {
  instanceId: number;
  externalInstanceId: string;
  gpuType: string;
  region: string;
  costPerHour: number;
  usageId: number;
}

class GpuSchedulerService {
  /**
   * Acquire a GPU lease. Picks the cheapest 'stopped' or unused instance of
   * the requested type, flips it to 'active', creates a usage row.
   */
  async acquire(req: GpuRequest): Promise<GpuLease> {
    // Find a free instance: prefer 'stopped' (cheapest because no warm cost)
    // then 'provisioning' that's been idle. Excludes 'active' and 'terminated'.
    const candidates = await db
      .select()
      .from(gpuInstances)
      .where(
        and(
          eq(gpuInstances.gpuType, req.gpuType),
          sql`${gpuInstances.status} IN ('stopped', 'provisioning')`,
          req.region ? eq(gpuInstances.region, req.region) : sql`TRUE`
        )
      )
      .orderBy(sql`${gpuInstances.costPerHour} ASC`)
      .limit(1);

    let instance = candidates[0];

    // No free instance — provision a virtual one tied to this project.
    if (!instance) {
      const externalId = `gpu-${req.gpuType.toLowerCase()}-${crypto.randomBytes(4).toString('hex')}`;
      const [created] = await db
        .insert(gpuInstances)
        .values({
          projectId: req.projectId,
          gpuType: req.gpuType,
          instanceId: externalId,
          status: 'active',
          region: req.region || 'us-east-1',
          costPerHour: String(DEFAULT_PRICE[req.gpuType] ?? 1.0),
        })
        .returning();
      instance = created;
      logger.info('gpu instance provisioned', { externalId, type: req.gpuType });
    } else {
      await db
        .update(gpuInstances)
        .set({ status: 'active', updatedAt: new Date(), projectId: req.projectId })
        .where(eq(gpuInstances.id, instance.id));
    }

    const [usage] = await db
      .insert(gpuUsage)
      .values({
        instanceId: instance.id,
        userId: req.userId,
        startTime: new Date(),
      })
      .returning();

    return {
      instanceId: instance.id,
      externalInstanceId: instance.instanceId,
      gpuType: instance.gpuType,
      region: instance.region,
      costPerHour: parseFloat(instance.costPerHour),
      usageId: usage.id,
    };
  }

  /**
   * Release a lease: stamps usage end time + total cost, flips instance back
   * to 'stopped' so the next acquire can reuse it.
   */
  async release(usageId: number, metrics?: { gpuUtilization?: number; memoryUsedMb?: number }): Promise<void> {
    const [usage] = await db.select().from(gpuUsage).where(eq(gpuUsage.id, usageId));
    if (!usage) {
      logger.warn('release for unknown usage', { usageId });
      return;
    }
    const [instance] = await db.select().from(gpuInstances).where(eq(gpuInstances.id, usage.instanceId));
    if (!instance) {
      logger.warn('release for unknown instance', { usageId, instanceId: usage.instanceId });
      return;
    }
    const endTime = new Date();
    const durationHours = (endTime.getTime() - new Date(usage.startTime).getTime()) / 3_600_000;
    const totalCost = (durationHours * parseFloat(instance.costPerHour)).toFixed(2);

    await db
      .update(gpuUsage)
      .set({
        endTime,
        totalCost,
        gpuUtilization: metrics?.gpuUtilization ?? null,
        memoryUsed: metrics?.memoryUsedMb ?? null,
      })
      .where(eq(gpuUsage.id, usageId));

    await db
      .update(gpuInstances)
      .set({ status: 'stopped', updatedAt: endTime })
      .where(eq(gpuInstances.id, instance.id));
  }

  /**
   * Quick capacity readout for the admin dashboard / quota checks.
   */
  async pool(): Promise<Array<{ gpuType: string; total: number; active: number; available: number }>> {
    const rows = await db
      .select({
        gpuType: gpuInstances.gpuType,
        status: gpuInstances.status,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(gpuInstances)
      .groupBy(gpuInstances.gpuType, gpuInstances.status);

    const map = new Map<string, { total: number; active: number; available: number }>();
    for (const row of rows) {
      const cur = map.get(row.gpuType) || { total: 0, active: 0, available: 0 };
      cur.total += row.count;
      if (row.status === 'active') cur.active += row.count;
      if (row.status === 'stopped' || row.status === 'provisioning') cur.available += row.count;
      map.set(row.gpuType, cur);
    }
    return Array.from(map.entries()).map(([gpuType, v]) => ({ gpuType, ...v }));
  }
}

export const gpuScheduler = new GpuSchedulerService();
