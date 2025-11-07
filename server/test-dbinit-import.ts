// Test db-init import
console.log('[DBINIT-TEST] 1. Starting db-init import test');

import express from "express";
console.log('[DBINIT-TEST] 2. Express imported');

console.log('[DBINIT-TEST] 3. About to import db-init...');
import { initializeDatabase } from "./db-init";
console.log('[DBINIT-TEST] 4. db-init imported successfully!');

const app = express();
const port = 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`[DBINIT-TEST] Server listening on port ${port}`);
});

console.log('[DBINIT-TEST] 5. Server started');