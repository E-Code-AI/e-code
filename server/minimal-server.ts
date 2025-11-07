// Minimal server to isolate blocking issue
console.log('[MINIMAL] 1. Starting minimal server');

import express from "express";
console.log('[MINIMAL] 2. Express imported');

const app = express();
console.log('[MINIMAL] 3. Express app created');

// Try to start server immediately without any other imports
const port = 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`[MINIMAL] Server listening on port ${port}`);
});

console.log('[MINIMAL] 4. Server listen call made');

// Keep the process alive
setInterval(() => {
  console.log('[MINIMAL] Server heartbeat - still running');
}, 30000);