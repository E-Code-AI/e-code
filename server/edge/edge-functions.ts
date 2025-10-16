// @ts-nocheck
import { EventEmitter } from 'events';

interface EdgeFunction {
  id: string;
  name: string;
  code: string;
  runtime: 'javascript' | 'typescript' | 'wasm';
  triggers: {
    http?: {
      path: string;
      methods: string[];
    };
    cron?: string;
    event?: string;
  };
  env: Record<string, string>;
  regions: string[];
  timeout: number;
  memory: number;
  status: 'deploying' | 'active' | 'failed' | 'inactive';
  deployedAt?: Date;
  lastInvocation?: Date;
  invocationCount: number;
  averageLatency?: number;
}

interface EdgeFunctionInvocation {
  functionId: string;
  region: string;
  requestId: string;
  status: 'success' | 'error' | 'timeout';
  duration: number;
  memory: number;
  logs: string[];
  result?: any;
  error?: string;
  timestamp: Date;
}

export class EdgeFunctionsService extends EventEmitter {
  private functions: Map<string, EdgeFunction> = new Map();
  private invocations: Map<string, EdgeFunctionInvocation[]> = new Map();
  private deploymentQueue: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeService();
  }

  private initializeService(): void {
    console.log('[2025-07-30T20:58:00.000Z] [edge-functions] INFO: Edge Functions service initialized');
    
    // Start deployment worker
    setInterval(() => this.processDeploymentQueue(), 5000);
    
    // Start health checker
    setInterval(() => this.checkFunctionHealth(), 30000);
  }

  async deployFunction(
    projectId: number,
    name: string,
    code: string,
    config: {
      runtime?: 'javascript' | 'typescript' | 'wasm';
      triggers?: EdgeFunction['triggers'];
      env?: Record<string, string>;
      regions?: string[];
      timeout?: number;
      memory?: number;
    }
  ): Promise<EdgeFunction> {
    const functionId = `ef_${projectId}_${Date.now()}`;
    
    const edgeFunction: EdgeFunction = {
      id: functionId,
      name,
      code,
      runtime: config.runtime || 'javascript',
      triggers: config.triggers || { http: { path: `/${name}`, methods: ['GET', 'POST'] } },
      env: config.env || {},
      regions: config.regions || ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
      timeout: config.timeout || 30,
      memory: config.memory || 128,
      status: 'deploying',
      invocationCount: 0,
    };

    this.functions.set(functionId, edgeFunction);
    this.deploymentQueue.set(functionId, edgeFunction);
    
    // Simulate deployment process
    setTimeout(() => {
      edgeFunction.status = 'active';
      edgeFunction.deployedAt = new Date();
      this.emit('functionDeployed', edgeFunction);
    }, 3000);

    return edgeFunction;
  }

  async invokeFunction(
    functionId: string,
    request: {
      method?: string;
      path?: string;
      headers?: Record<string, string>;
      body?: any;
      query?: Record<string, string>;
    }
  ): Promise<EdgeFunctionInvocation> {
    const func = this.functions.get(functionId);
    if (!func || func.status !== 'active') {
      throw new Error('Function not found or not active');
    }

    const invocation: EdgeFunctionInvocation = {
      functionId,
      region: this.selectOptimalRegion(func.regions),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'success',
      duration: 0,
      memory: 0,
      logs: [],
      timestamp: new Date(),
    };

    const startTime = Date.now();

    try {
      // Execute function based on runtime
      let result: any;
      
      switch (func.runtime) {
        case 'javascript':
        case 'typescript':
          result = await this.executeJavaScriptFunction(func, request);
          break;
        case 'wasm':
          result = await this.executeWasmFunction(func, request);
          break;
        default:
          throw new Error(`Unsupported runtime: ${func.runtime}`);
      }

      invocation.result = result;
      invocation.duration = Date.now() - startTime;
      invocation.memory = Math.floor(Math.random() * func.memory * 0.8 + func.memory * 0.2);
      invocation.logs.push(`Function executed successfully in ${invocation.duration}ms`);

      // Update function stats
      func.lastInvocation = new Date();
      func.invocationCount++;
      func.averageLatency = func.averageLatency 
        ? (func.averageLatency + invocation.duration) / 2 
        : invocation.duration;

    } catch (error: any) {
      invocation.status = 'error';
      invocation.error = error.message;
      invocation.logs.push(`Error: ${error.message}`);
    }

    // Store invocation
    if (!this.invocations.has(functionId)) {
      this.invocations.set(functionId, []);
    }
    this.invocations.get(functionId)!.push(invocation);

    return invocation;
  }

  private async executeJavaScriptFunction(
    func: EdgeFunction,
    request: any
  ): Promise<any> {
    // Create isolated context for function execution
    const context = {
      request,
      env: func.env,
      console: {
        log: (msg: string) => console.log(`[EdgeFunction ${func.id}] ${msg}`),
        error: (msg: string) => console.error(`[EdgeFunction ${func.id}] ${msg}`),
      },
      fetch: global.fetch,
      Response: global.Response,
      Request: global.Request,
      Headers: global.Headers,
    };

    // Execute function code (in production, use V8 isolates)
    try {
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const handler = new AsyncFunction('context', func.code);
      return await handler.call(null, context);
    } catch (error) {
      throw new Error(`Function execution failed: ${error}`);
    }
  }

  private async executeWasmFunction(
    func: EdgeFunction,
    request: any
  ): Promise<any> {
    // WebAssembly execution (placeholder for real WASM runtime)
    return {
      message: 'WASM function executed',
      functionId: func.id,
      request,
    };
  }

  async updateFunction(
    functionId: string,
    updates: Partial<EdgeFunction>
  ): Promise<EdgeFunction> {
    const func = this.functions.get(functionId);
    if (!func) {
      throw new Error('Function not found');
    }

    // Update function
    Object.assign(func, updates);
    func.status = 'deploying';
    
    // Redeploy
    this.deploymentQueue.set(functionId, func);
    
    setTimeout(() => {
      func.status = 'active';
      func.deployedAt = new Date();
    }, 2000);

    return func;
  }

  async deleteFunction(functionId: string): Promise<void> {
    const func = this.functions.get(functionId);
    if (!func) {
      throw new Error('Function not found');
    }

    func.status = 'inactive';
    
    // Clean up after grace period
    setTimeout(() => {
      this.functions.delete(functionId);
      this.invocations.delete(functionId);
    }, 60000); // 1 minute grace period
  }

  async getFunctions(projectId?: number): Promise<EdgeFunction[]> {
    const functions = Array.from(this.functions.values());
    
    if (projectId) {
      return functions.filter(f => f.id.includes(`ef_${projectId}_`));
    }
    
    return functions;
  }

  async getFunctionMetrics(functionId: string): Promise<{
    invocations: EdgeFunctionInvocation[];
    stats: {
      totalInvocations: number;
      successRate: number;
      averageLatency: number;
      errorRate: number;
      memoryUsage: {
        avg: number;
        max: number;
      };
    };
  }> {
    const invocations = this.invocations.get(functionId) || [];
    const successful = invocations.filter(i => i.status === 'success');
    
    const stats = {
      totalInvocations: invocations.length,
      successRate: invocations.length > 0 ? (successful.length / invocations.length) * 100 : 0,
      averageLatency: successful.reduce((sum, i) => sum + i.duration, 0) / (successful.length || 1),
      errorRate: invocations.length > 0 ? ((invocations.length - successful.length) / invocations.length) * 100 : 0,
      memoryUsage: {
        avg: successful.reduce((sum, i) => sum + i.memory, 0) / (successful.length || 1),
        max: Math.max(...successful.map(i => i.memory), 0),
      },
    };

    return { invocations, stats };
  }

  async setFunctionTrigger(
    functionId: string,
    trigger: EdgeFunction['triggers']
  ): Promise<void> {
    const func = this.functions.get(functionId);
    if (!func) {
      throw new Error('Function not found');
    }

    func.triggers = trigger;
    await this.updateFunction(functionId, { triggers: trigger });
  }

  private selectOptimalRegion(regions: string[]): string {
    // In production, select based on user location and load
    return regions[Math.floor(Math.random() * regions.length)];
  }

  private processDeploymentQueue(): void {
    for (const [functionId, func] of Array.from(this.deploymentQueue)) {
      console.log(`[edge-functions] Deploying function ${functionId} to regions: ${func.regions.join(', ')}`);
      this.deploymentQueue.delete(functionId);
    }
  }

  private checkFunctionHealth(): void {
    for (const [functionId, func] of Array.from(this.functions)) {
      if (func.status === 'active' && func.lastInvocation) {
        const inactiveDuration = Date.now() - func.lastInvocation.getTime();
        
        // Scale down inactive functions
        if (inactiveDuration > 300000) { // 5 minutes
          console.log(`[edge-functions] Scaling down inactive function: ${functionId}`);
        }
      }
    }
  }

  // WebSocket support for real-time logs
  streamFunctionLogs(functionId: string, callback: (log: string) => void): () => void {
    const interval = setInterval(() => {
      const invocations = this.invocations.get(functionId) || [];
      const latest = invocations[invocations.length - 1];
      
      if (latest && latest.logs.length > 0) {
        latest.logs.forEach(log => callback(log));
      }
    }, 1000);

    return () => clearInterval(interval);
  }
}

// Export singleton instance
export const edgeFunctionsService = new EdgeFunctionsService();