/**
 * GPU Instance Manager
 * DEPRECATED: GPU compute is now handled via AI providers directly
 */

const DEPRECATION_MESSAGE = 'GPU providers deprecated - use AI providers directly';

const deprecatedResponse = {
  available: false,
  message: 'GPU compute is handled via AI providers'
};

console.log(DEPRECATION_MESSAGE);

export class GPUInstanceManager {
  async provisionInstance(): Promise<typeof deprecatedResponse> {
    console.log(DEPRECATION_MESSAGE);
    return deprecatedResponse;
  }

  async stopInstance(): Promise<typeof deprecatedResponse> {
    console.log(DEPRECATION_MESSAGE);
    return deprecatedResponse;
  }

  async restartInstance(): Promise<typeof deprecatedResponse> {
    console.log(DEPRECATION_MESSAGE);
    return deprecatedResponse;
  }

  async terminateInstance(): Promise<typeof deprecatedResponse> {
    console.log(DEPRECATION_MESSAGE);
    return deprecatedResponse;
  }

  async getInstanceMetrics(): Promise<typeof deprecatedResponse> {
    console.log(DEPRECATION_MESSAGE);
    return deprecatedResponse;
  }

  async getProjectInstances(): Promise<typeof deprecatedResponse> {
    console.log(DEPRECATION_MESSAGE);
    return deprecatedResponse;
  }

  async estimateCost(): Promise<typeof deprecatedResponse> {
    console.log(DEPRECATION_MESSAGE);
    return deprecatedResponse;
  }

  async getAvailableRegions(): Promise<typeof deprecatedResponse> {
    console.log(DEPRECATION_MESSAGE);
    return deprecatedResponse;
  }

  async checkQuota(): Promise<typeof deprecatedResponse> {
    console.log(DEPRECATION_MESSAGE);
    return deprecatedResponse;
  }
}

export const gpuInstanceManager = {
  available: false,
  message: 'GPU compute is handled via AI providers'
};
