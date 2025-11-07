// Test just vite import
console.log('[VITE-TEST] 1. Starting vite import test');

import express from "express";
console.log('[VITE-TEST] 2. Express imported');

console.log('[VITE-TEST] 3. About to import vite...');
import { setupVite, serveStatic, log } from "./vite";
console.log('[VITE-TEST] 4. Vite imported successfully!');

const app = express();
const port = 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`[VITE-TEST] Server listening on port ${port}`);
});

console.log('[VITE-TEST] 5. Server started');