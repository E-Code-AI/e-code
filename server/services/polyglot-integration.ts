// Complete Polyglot Backend Integration - Routes all operations through appropriate services
// Exactly like Replit's multi-language architecture

import fetch from 'node-fetch';

export class PolyglotIntegration {
  private services = {
    go: 'http://localhost:8080',
    python: 'http://localhost:8081',
    typescript: 'http://localhost:5000'
  };

  // Container Operations - Route through Go service for performance
  async createContainer(projectId: string, language: string, command: string) {
    const response = await fetch(`${this.services.go}/containers/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, language, command })
    });
    return response.json();
  }

  async startContainer(containerId: string) {
    const response = await fetch(`${this.services.go}/containers/${containerId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  }

  async stopContainer(containerId: string) {
    const response = await fetch(`${this.services.go}/containers/${containerId}`, {
      method: 'DELETE'
    });
    return response.json();
  }

  // File Operations - Route through Go service for high throughput
  async readFile(projectId: string, filePath: string) {
    const response = await fetch(`${this.services.go}/files/${projectId}/${filePath}`);
    return response.json();
  }

  async writeFile(projectId: string, filePath: string, content: string) {
    const response = await fetch(`${this.services.go}/files/${projectId}/${filePath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    return response.json();
  }

  // AI/ML Operations - Route through Python service
  async generateCompletion(prompt: string, model: string = 'gpt-4o') {
    const response = await fetch(`${this.services.python}/ai/completion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model })
    });
    return response.json();
  }

  async analyzeCode(code: string, language: string) {
    const response = await fetch(`${this.services.python}/analyze/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, task: 'analyze' })
    });
    return response.json();
  }

  async processData(data: any[], operation: string) {
    const response = await fetch(`${this.services.python}/process/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, operation })
    });
    return response.json();
  }

  async trainModel(dataset: any, modelType: string, epochs: number) {
    const response = await fetch(`${this.services.python}/ml/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset, modelType, epochs })
    });
    return response.json();
  }

  async scientificCompute(operation: string, parameters: any) {
    const response = await fetch(`${this.services.python}/compute/scientific`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, parameters })
    });
    return response.json();
  }

  // Service Health Monitoring
  async checkServiceHealth(service: 'go' | 'python' | 'typescript') {
    try {
      const url = service === 'typescript' 
        ? `${this.services.typescript}/api/health`
        : `${this.services[service]}/health`;
      
      const response = await fetch(url, {
        timeout: 1000
      });
      
      if (response.ok) {
        return await response.json();
      }
      return { healthy: false };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  // Get service for specific operation
  getServiceForOperation(operation: string): 'go' | 'python' | 'typescript' {
    const operationMap = {
      // Go service operations
      'container': 'go',
      'file': 'go',
      'websocket': 'go',
      'build': 'go',
      'terminal': 'go',
      
      // Python service operations
      'ai': 'python',
      'ml': 'python',
      'analysis': 'python',
      'data': 'python',
      'scientific': 'python',
      
      // TypeScript service operations
      'user': 'typescript',
      'database': 'typescript',
      'auth': 'typescript',
      'project': 'typescript'
    };

    for (const [key, service] of Object.entries(operationMap)) {
      if (operation.toLowerCase().includes(key)) {
        return service as 'go' | 'python' | 'typescript';
      }
    }

    return 'typescript'; // Default fallback
  }
}

export const polyglotIntegration = new PolyglotIntegration();