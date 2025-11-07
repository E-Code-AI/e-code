console.log('[DEBUG] Starting server with error catching...');

process.on('uncaughtException', (error) => {
  console.error('[DEBUG] Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[DEBUG] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

import('./index.js').then(() => {
  console.log('[DEBUG] Server module loaded successfully');
}).catch((error) => {
  console.error('[DEBUG] Failed to load server module:', error);
  process.exit(1);
});