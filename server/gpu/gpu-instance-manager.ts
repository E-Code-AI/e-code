/**
 * GPU Instance Manager
 * DEPRECATED: GPU providers have been completely removed from the codebase.
 * AI compute is now handled directly through integrated AI providers.
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('gpu-instance-manager');

export const gpuInstanceManager = {
  available: false,
  deprecated: true,
  message: 'GPU compute is now handled via AI providers directly',
  
  async getInstance(_id: string) {
    logger.warn('GPU providers deprecated - use AI providers directly');
    return null;
  },
  
  async listInstances() {
    return [];
  },
  
  async createInstance() {
    return { success: false, message: 'GPU providers deprecated' };
  },
  
  async deleteInstance(_id: string) {
    return { success: false, message: 'GPU providers deprecated' };
  },
  
  async getInstanceStatus(_id: string) {
    return null;
  }
};

export class GPUInstanceManager {
  available = false;
  deprecated = true;
  message = 'GPU compute is now handled via AI providers directly';
  
  async getInstance(_id: string) {
    logger.warn('GPU providers deprecated - use AI providers directly');
    return null;
  }
  
  async listInstances() {
    return [];
  }
  
  async createInstance() {
    return { success: false, message: 'GPU providers deprecated' };
  }
  
  async deleteInstance(_id: string) {
    return { success: false, message: 'GPU providers deprecated' };
  }
  
  async getInstanceStatus(_id: string) {
    return null;
  }
}
