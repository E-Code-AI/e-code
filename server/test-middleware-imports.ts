// Test middleware imports one by one
console.log('[MW-TEST] 1. Starting middleware import test');

import express from "express";
console.log('[MW-TEST] 2. Express imported');

console.log('[MW-TEST] 3. About to import compression middleware...');
import compressionMiddleware from "./middleware/compression";
console.log('[MW-TEST] 4. Compression middleware imported!');

console.log('[MW-TEST] 5. About to import cookie-parser...');
import cookieParser from "cookie-parser";
console.log('[MW-TEST] 6. Cookie parser imported!');

console.log('[MW-TEST] 7. About to import security middleware...');
import { securityMiddleware, sanitizeInput, securityMonitoring, ipSecurity, csrfProtection } from "./middleware/security";
console.log('[MW-TEST] 8. Security middleware imported!');

const app = express();
const port = 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`[MW-TEST] Server listening on port ${port}`);
});

console.log('[MW-TEST] 9. Server started');