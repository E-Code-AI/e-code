// Health check server for user containers
const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy',
      projectId: process.env.PROJECT_ID,
      timestamp: new Date().toISOString()
    }));
  } else if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Project Container</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #333; }
          .status { background: #4CAF50; color: white; padding: 10px 20px; border-radius: 4px; display: inline-block; }
          .info { margin: 20px 0; }
          .info label { font-weight: bold; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 Project Container</h1>
          <div class="status">Ready</div>
          <div class="info">
            <label>Project ID:</label> ${process.env.PROJECT_ID || 'Not Set'}
          </div>
          <div class="info">
            <label>Environment:</label> ${process.env.NODE_ENV || 'production'}
          </div>
          <div class="info">
            <label>Port:</label> ${PORT}
          </div>
          <p>Your application will run here once deployed.</p>
        </div>
      </body>
      </html>
    `);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Health server running on port ${PORT}`);
});