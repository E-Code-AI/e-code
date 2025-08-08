/**
 * Polyglot Backend Routes
 * Integrates TypeScript, Go, and Python services into unified API
 */

import { Router } from 'express';
import { PolyglotCoordinator } from './services/polyglot-coordinator';

const router = Router();
const coordinator = new PolyglotCoordinator();

// Health check for all services
router.get('/api/polyglot/health', async (req, res) => {
  const healthStatus = coordinator.getHealthStatus();
  const overallHealth = healthStatus.every(service => service.status === 'healthy');
  
  res.json({
    status: overallHealth ? 'healthy' : 'degraded',
    services: healthStatus,
    timestamp: new Date().toISOString(),
    architecture: 'polyglot',
    languages: ['TypeScript', 'Go', 'Python']
  });
});

// Container Operations (Go Service)
router.post('/api/containers/create', async (req, res) => {
  try {
    const result = await coordinator.forwardRequest(
      'container-orchestration',
      '/api/containers',
      'POST',
      req.body,
      { authorization: req.headers.authorization }
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(503).json({ 
      error: 'Container service unavailable',
      message: error.message,
      service: 'go-runtime'
    });
  }
});

router.get('/api/containers/list', async (req, res) => {
  try {
    const result = await coordinator.forwardRequest(
      'container-orchestration',
      '/api/containers',
      'GET'
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(503).json({ 
      error: 'Container service unavailable',
      message: error.message,
      service: 'go-runtime'
    });
  }
});

// High-Performance File Operations (Go Service)
router.post('/api/files/batch-operations', async (req, res) => {
  try {
    const result = await coordinator.forwardRequest(
      'file-operations',
      '/api/files/batch',
      'POST',
      req.body
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(503).json({ 
      error: 'File operations service unavailable',
      message: error.message,
      service: 'go-runtime'
    });
  }
});

// Fast Build Pipeline (Go Service)
router.post('/api/builds/fast-build', async (req, res) => {
  try {
    const result = await coordinator.forwardRequest(
      'builds',
      '/api/build',
      'POST',
      req.body
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(503).json({ 
      error: 'Build service unavailable',
      message: error.message,
      service: 'go-runtime'
    });
  }
});

// AI/ML Code Analysis (Python Service)
router.post('/api/ai/code-analysis', async (req, res) => {
  try {
    const result = await coordinator.forwardRequest(
      'ai-ml',
      '/api/code/analyze',
      'POST',
      req.body
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(503).json({ 
      error: 'AI analysis service unavailable',
      message: error.message,
      service: 'python-ml'
    });
  }
});

// Machine Learning Training (Python Service)
router.post('/api/ml/train-model', async (req, res) => {
  try {
    const result = await coordinator.forwardRequest(
      'ai-ml',
      '/api/ml/train',
      'POST',
      req.body
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(503).json({ 
      error: 'ML training service unavailable',
      message: error.message,
      service: 'python-ml'
    });
  }
});

// ML Training Status (Python Service)
router.get('/api/ml/training-status/:jobId', async (req, res) => {
  try {
    const result = await coordinator.forwardRequest(
      'ai-ml',
      `/api/ml/training/${req.params.jobId}`,
      'GET'
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(503).json({ 
      error: 'ML training service unavailable',
      message: error.message,
      service: 'python-ml'
    });
  }
});

// Text Analysis (Python Service)
router.post('/api/ai/text-analysis', async (req, res) => {
  try {
    const result = await coordinator.forwardRequest(
      'ai-ml',
      '/api/text/analyze',
      'POST',
      req.body
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(503).json({ 
      error: 'Text analysis service unavailable',
      message: error.message,
      service: 'python-ml'
    });
  }
});

// Advanced Data Processing (Python Service)
router.post('/api/data/advanced-processing', async (req, res) => {
  try {
    const result = await coordinator.forwardRequest(
      'data-analysis',
      '/api/data/process',
      'POST',
      req.body
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(503).json({ 
      error: 'Data processing service unavailable',
      message: error.message,
      service: 'python-ml'
    });
  }
});

// AI Inference (Python Service)
router.post('/api/ai/inference', async (req, res) => {
  try {
    const result = await coordinator.forwardRequest(
      'ai-ml',
      '/api/ai/inference',
      'POST',
      req.body
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(503).json({ 
      error: 'AI inference service unavailable',
      message: error.message,
      service: 'python-ml'
    });
  }
});

// Smart Service Router - automatically routes based on request characteristics
router.post('/api/smart-route', async (req, res) => {
  try {
    const { operation, data, requestType } = req.body;
    const dataSize = JSON.stringify(data || {}).length;
    
    const serviceUrl = coordinator.selectOptimalService(requestType, dataSize);
    
    if (!serviceUrl) {
      return res.status(503).json({
        error: 'No available service for request type',
        requestType,
        dataSize
      });
    }

    // Route to optimal service based on characteristics
    let endpoint = '/';
    if (requestType.includes('ml') || requestType.includes('ai')) {
      endpoint = '/api/ai/inference';
    } else if (requestType.includes('file') || requestType.includes('container')) {
      endpoint = '/api/files/batch';
    }

    const response = await fetch(`${serviceUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, data, requestType })
    });

    const result = await response.json();
    
    res.json({
      result,
      routedTo: serviceUrl,
      requestType,
      dataSize,
      processingTime: Date.now() - parseInt(req.headers['x-start-time'] || '0')
    });

  } catch (error) {
    res.status(500).json({
      error: 'Smart routing failed',
      message: error.message
    });
  }
});

// Service Capabilities Discovery
router.get('/api/polyglot/capabilities', (req, res) => {
  res.json({
    services: {
      typescript: {
        port: process.env.PORT || 5000,
        capabilities: [
          'User authentication and session management',
          'Database operations with Drizzle ORM', 
          'REST API endpoints',
          'Project management',
          'File serving and basic operations'
        ],
        endpoints: ['/api/projects', '/api/users', '/api/auth', '/api/files']
      },
      'go-runtime': {
        port: process.env.GO_RUNTIME_PORT || 8080,
        capabilities: [
          'High-performance container orchestration',
          'Batch file operations with concurrent processing',
          'Real-time WebSocket connections at scale',
          'Fast build pipelines and Docker operations',
          'Terminal session management'
        ],
        endpoints: ['/api/containers', '/api/files/batch', '/api/build', '/ws']
      },
      'python-ml': {
        port: process.env.PYTHON_ML_PORT || 8081,
        capabilities: [
          'Advanced code analysis and optimization suggestions',
          'Machine learning model training and inference',
          'Natural language processing and text analysis',
          'Data processing with NumPy/Pandas', 
          'AI-powered code completion and generation'
        ],
        endpoints: ['/api/code/analyze', '/api/ml/train', '/api/text/analyze', '/api/data/process']
      }
    },
    routing: {
      'file-operations': 'go-runtime',
      'container-orchestration': 'go-runtime',
      'real-time': 'go-runtime',
      'builds': 'go-runtime',
      'ai-ml': 'python-ml',
      'data-analysis': 'python-ml',
      'text-processing': 'python-ml',
      'code-analysis': 'python-ml',
      'web-api': 'typescript',
      'user-management': 'typescript',
      'database': 'typescript'
    }
  });
});

// Performance benchmarking endpoint
router.get('/api/polyglot/benchmark', async (req, res) => {
  const benchmarks = [];
  const testData = { test: 'performance', size: 1000 };
  
  for (const [serviceName, endpoint] of [
    ['typescript', `http://localhost:${process.env.PORT || 5000}/api/health`],
    ['go-runtime', `http://localhost:${process.env.GO_RUNTIME_PORT || 8080}/health`],
    ['python-ml', `http://localhost:${process.env.PYTHON_ML_PORT || 8081}/health`]
  ]) {
    const startTime = Date.now();
    try {
      const response = await fetch(endpoint as string);
      const responseTime = Date.now() - startTime;
      benchmarks.push({
        service: serviceName,
        responseTime,
        status: response.ok ? 'healthy' : 'unhealthy'
      });
    } catch (error) {
      benchmarks.push({
        service: serviceName,
        responseTime: -1,
        status: 'unavailable',
        error: error.message
      });
    }
  }
  
  res.json({
    benchmarks,
    timestamp: new Date().toISOString(),
    fastest: benchmarks.reduce((prev, curr) => 
      prev.responseTime < curr.responseTime && prev.responseTime > 0 ? prev : curr
    )
  });
});

export default router;