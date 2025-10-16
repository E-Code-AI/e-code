import { setupTestGlobals } from './setup/globals';
import { testRunner } from './setup/test-runner';

// Register global testing utilities
setupTestGlobals();

// Import test suites
import './security.test';
import './ai-ux-features.test';

(async () => {
  const pattern = process.argv[2];
  const results = await testRunner.run(pattern);

  if (results.failed > 0) {
    process.exitCode = 1;
  }
})();
