// Minimal server with routes import
console.log('[MINIMAL+ROUTES] 1. Starting minimal server with routes');

import express from "express";
console.log('[MINIMAL+ROUTES] 2. Express imported');

console.log('[MINIMAL+ROUTES] 3. About to import routes...');
import { registerRoutes } from "./routes";
console.log('[MINIMAL+ROUTES] 4. Routes imported successfully!');

const app = express();
console.log('[MINIMAL+ROUTES] 5. Express app created');

// Try to start server
const port = 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`[MINIMAL+ROUTES] Server listening on port ${port}`);
});

console.log('[MINIMAL+ROUTES] 6. Server listen call made');