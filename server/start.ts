// Minimal server entry point to debug startup issues
console.log('[START] Server start.ts is executing');

async function startServer() {
  console.log('[START] About to import server/index');
  try {
    await import('./index.js');
    console.log('[START] Server module imported successfully');
  } catch (error) {
    console.error('[START] Failed to import server module:', error);
    process.exit(1);
  }
}

startServer().catch(error => {
  console.error('[START] Fatal error starting server:', error);
  process.exit(1);
});