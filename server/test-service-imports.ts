// Test service imports one by one
console.log('[SVC-TEST] 1. Starting service import test');

import express from "express";
console.log('[SVC-TEST] 2. Express imported');

console.log('[SVC-TEST] 3. About to import rate-limiter...');
import { rateLimiters, legacyRateLimiters, logRateLimitViolations, dynamicRateLimiter, createRateLimitMiddleware } from "./middleware/rate-limiter";
console.log('[SVC-TEST] 4. Rate limiter imported!');

console.log('[SVC-TEST] 5. About to import helmet-config...');
import { helmetConfig, additionalSecurityHeaders, applySecurityHeaders } from "./middleware/helmet-config";
console.log('[SVC-TEST] 6. Helmet config imported!');

console.log('[SVC-TEST] 7. About to import session-manager...');
import { sessionManager } from "./auth/session-manager";
console.log('[SVC-TEST] 8. Session manager imported!');

console.log('[SVC-TEST] 9. About to import audit-logger...');
import { auditLogger } from "./services/audit-logger";
console.log('[SVC-TEST] 10. Audit logger imported!');

const app = express();
const port = 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`[SVC-TEST] Server listening on port ${port}`);
});

console.log('[SVC-TEST] 11. Server started');