// Minimal server with all imports from server/index.ts
console.log('[FULL-TEST] 1. Starting full test server');

import express, { type Request, Response, NextFunction } from "express";
console.log('[FULL-TEST] 2. Express imported');

import { registerRoutes } from "./routes";
console.log('[FULL-TEST] 3. Routes imported');

import { setupVite, serveStatic, log } from "./vite";
console.log('[FULL-TEST] 4. Vite imported');

import { initializeDatabase } from "./db-init";
console.log('[FULL-TEST] 5. db-init imported');

import cors from "cors";
console.log('[FULL-TEST] 6. cors imported');

// Skip remaining imports for now and just try to start the server
const app = express();
console.log('[FULL-TEST] 7. Express app created');

app.use(cors());
console.log('[FULL-TEST] 8. CORS middleware added');

// Try to start server
const port = 5000;
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`[FULL-TEST] Server listening on port ${port}`);
});

console.log('[FULL-TEST] 9. Server listen call made');

// Register routes using the server
(async () => {
  console.log('[FULL-TEST] 10. About to register routes');
  try {
    await registerRoutes(app);
    console.log('[FULL-TEST] 11. Routes registered successfully');
  } catch (error) {
    console.error('[FULL-TEST] Failed to register routes:', error);
  }
})();