// Test remaining imports
console.log('[REM-TEST] 1. Starting remaining import test');

import express from "express";
console.log('[REM-TEST] 2. Express imported');

console.log('[REM-TEST] 3. About to import api-key-manager...');
import { apiKeyManager } from "./auth/api-key-manager";
console.log('[REM-TEST] 4. API key manager imported!');

console.log('[REM-TEST] 5. About to import secrets...');
import { secretManager } from "./utils/secrets";
console.log('[REM-TEST] 6. Secret manager imported!');

console.log('[REM-TEST] 7. About to import validators...');
import { validators } from "./utils/validators";
console.log('[REM-TEST] 8. Validators imported!');

console.log('[REM-TEST] 9. About to import cdn-optimization...');
import { cdnOptimization } from "./services/cdn-optimization";
console.log('[REM-TEST] 10. CDN optimization imported!');

console.log('[REM-TEST] 11. About to import database-pool...');
import { dbPool } from "./services/database-pool";
console.log('[REM-TEST] 12. Database pool imported!');

console.log('[REM-TEST] 13. About to import environment config...');
import { config } from "./config/environment";
console.log('[REM-TEST] 14. Environment config imported!');

console.log('[REM-TEST] 15. About to import Sentry...');
import * as Sentry from "@sentry/node";
console.log('[REM-TEST] 16. Sentry imported!');

console.log('[REM-TEST] 17. About to import log-aggregator...');
import { logAggregator } from "./monitoring/log-aggregator";
console.log('[REM-TEST] 18. Log aggregator imported!');

console.log('[REM-TEST] 19. About to import uptime-monitor...');
import { uptimeMonitor } from "./services/uptime-monitor";
console.log('[REM-TEST] 20. Uptime monitor imported!');

console.log('[REM-TEST] 21. About to import database-query-optimizer...');
import { databaseQueryOptimizer } from "./services/database-query-optimizer";
console.log('[REM-TEST] 22. Database query optimizer imported!');

const app = express();
const port = 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`[REM-TEST] Server listening on port ${port}`);
});

console.log('[REM-TEST] 23. Server started');