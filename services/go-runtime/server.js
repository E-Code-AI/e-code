const express = require('express');
const cors = require('cors');

const PORT = 8080;
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'go-runtime',
    port: PORT,
    mock: true,
    message: 'Go runtime mock service is running. No container orchestration is available.',
    timestamp: new Date().toISOString()
  });
});

app.all('*', (req, res) => {
  console.warn(`[GO-RUNTIME] Mock service received ${req.method} ${req.originalUrl}`);
  res.status(501).json({
    error: 'not_implemented',
    message: 'Go runtime service is running in mock mode and cannot fulfil this request.',
    service: 'go-runtime',
    mock: true,
    method: req.method,
    path: req.originalUrl
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GO-RUNTIME] Mock service listening on port ${PORT}`);
});

