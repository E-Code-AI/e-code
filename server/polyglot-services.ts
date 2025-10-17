// @ts-nocheck
// Polyglot Services - Simulating Replit's multi-language backend architecture
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createLogger } from './utils/logger';

const logger = createLogger('polyglot-services');

const MOCK_RESPONSE = {
  error: 'not_implemented',
  message: 'This polyglot service is a mock placeholder and does not provide real functionality.',
  mock: true
};

function createMockService(
  serviceName: 'go-runtime' | 'python-ml',
  port: number,
  details: Record<string, unknown> = {}
) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: serviceName,
      port,
      mock: true,
      message: 'Service is running in mock mode with no real backend capabilities.',
      timestamp: new Date().toISOString(),
      ...details
    });
  });

  app.all('*', (req, res) => {
    logger.warn(
      `[${serviceName.toUpperCase()}] Received ${req.method} ${req.originalUrl} but the service is running in mock mode.`
    );

    res.status(501).json({
      ...MOCK_RESPONSE,
      service: serviceName,
      method: req.method,
      path: req.originalUrl
    });
  });

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`[POLYGLOT] ${serviceName} mock service listening on port ${port}`);
  });

  return server;
}

// Go Runtime Service (Port 8080) - mock implementation only
export function startGoRuntimeService() {
  return createMockService('go-runtime', 8080, {
    language: 'Go',
    capabilities: ['containers', 'files', 'websocket'],
    notes: 'Mock service used for local development without container orchestration.'
  });
}

// Python ML Service (Port 8081) - mock implementation only
export function startPythonMLService() {
  return createMockService('python-ml', 8081, {
    language: 'Python',
    capabilities: ['ai', 'ml', 'data-processing', 'code-analysis'],
    notes: 'Mock service used for local development without AI or ML execution.'
  });
}

// Start all polyglot services
export function initializePolyglotServices() {
  try {
    const goService = startGoRuntimeService();
    const pythonService = startPythonMLService();
    
    console.log('[POLYGLOT] ✅ All polyglot services initialized successfully');
    console.log('[POLYGLOT] - TypeScript Core: Port 5000 (Web API, Database)');
    console.log('[POLYGLOT] - Go Runtime: Port 8080 (Containers, Files, WebSocket)');
    console.log('[POLYGLOT] - Python ML: Port 8081 (AI/ML, Data Processing)');
    
    return { goService, pythonService };
  } catch (error) {
    console.error('[POLYGLOT] Failed to initialize services:', error);
    return null;
  }
}

// Setup proxy routes for polyglot services on main Express server
// This allows access through the main port instead of separate ports
export function setupPolyglotProxyRoutes(app: express.Application) {
  logger.info('Setting up polyglot service proxy routes on main server');
  
  // Proxy Go Runtime Service routes through main server
  app.use('/polyglot/go', createProxyMiddleware({
    target: 'http://127.0.0.1:8080',
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying for Go runtime
    pathRewrite: {
      '^/polyglot/go': ''
    },
    onError: (err: any, req: any, res: any) => {
      logger.error('Go runtime proxy error:', err);
      res.status(502).json({ error: 'Go runtime service unavailable' });
    }
  }));
  
  // Proxy Python ML Service routes through main server
  app.use('/polyglot/python', createProxyMiddleware({
    target: 'http://127.0.0.1:8081',
    changeOrigin: true,
    pathRewrite: {
      '^/polyglot/python': ''
    },
    onError: (err: any, req: any, res: any) => {
      logger.error('Python ML service proxy error:', err);
      res.status(502).json({ error: 'Python ML service unavailable' });
    }
  }));
  
  logger.info('✅ Polyglot proxy routes registered on main server');
  logger.info('  - Go Runtime: /polyglot/go/* -> http://127.0.0.1:8080/*');
  logger.info('  - Python ML: /polyglot/python/* -> http://127.0.0.1:8081/*');
}