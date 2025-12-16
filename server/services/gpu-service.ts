/**
 * GPU Service
 * DEPRECATED: GPU compute is now handled via AI providers directly
 */

import { EventEmitter } from 'events';

const DEPRECATION_MESSAGE = 'GPU providers deprecated - use AI providers directly';

const deprecatedResponse = {
  available: false,
  message: 'GPU compute is handled via AI providers'
};

console.log(DEPRECATION_MESSAGE);

export interface GpuType {
  id: string;
  name: string;
  description: string;
  specs: {
    vram: number;
    cores: number;
    tensorCores?: number;
    computeCapability: string;
    fp32Performance: number;
    fp16Performance: number;
  };
  costPerHour: number;
  availability: 'high' | 'medium' | 'low';
  regions: string[];
}

export interface GpuRegion {
  id: string;
  name: string;
  displayName: string;
  location: string;
  latency: { [region: string]: number };
  available: boolean;
}

export class GpuService extends EventEmitter {
  constructor() {
    super();
    console.log(DEPRECATION_MESSAGE);
  }

  async provisionGpuInstance(): Promise<typeof deprecatedResponse> {
    console.log(DEPRECATION_MESSAGE);
    return deprecatedResponse;
  }

  async terminateGpuInstance(): Promise<typeof deprecatedResponse> {
    console.log(DEPRECATION_MESSAGE);
    return deprecatedResponse;
  }

  getAvailableGpuTypes(): GpuType[] {
    console.log(DEPRECATION_MESSAGE);
    return [];
  }

  getAvailableRegions(): GpuRegion[] {
    console.log(DEPRECATION_MESSAGE);
    return [];
  }

  getGpuType(): GpuType | undefined {
    console.log(DEPRECATION_MESSAGE);
    return undefined;
  }

  getRegion(): GpuRegion | undefined {
    console.log(DEPRECATION_MESSAGE);
    return undefined;
  }

  async getProjectGpuInstances(): Promise<[]> {
    console.log(DEPRECATION_MESSAGE);
    return [];
  }

  async trackGpuUsage(): Promise<typeof deprecatedResponse> {
    console.log(DEPRECATION_MESSAGE);
    return deprecatedResponse;
  }

  calculateEstimatedCost(): number {
    console.log(DEPRECATION_MESSAGE);
    return 0;
  }

  getBestGpuForWorkload(): GpuType | null {
    console.log(DEPRECATION_MESSAGE);
    return null;
  }
}

let gpuServiceInstance: GpuService | null = null;

export function getGpuService(): GpuService {
  if (!gpuServiceInstance) {
    gpuServiceInstance = new GpuService();
  }
  return gpuServiceInstance;
}

export const gpuService = {
  available: false,
  message: 'GPU compute is handled via AI providers'
};
