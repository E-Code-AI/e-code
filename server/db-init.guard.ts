// Dev guard to optionally skip DB initialization.
// Skips when SKIP_DB_INIT=1 or when NODE_ENV=development and SKIP_DB_INIT is not explicitly "0".

// Check early if we should skip DB initialization and set dummy URL if needed
const shouldSkip = 
  process.env.SKIP_DB_INIT === '1' ||
  (process.env.NODE_ENV === 'development' && process.env.SKIP_DB_INIT !== '0');

if (shouldSkip && !process.env.DATABASE_URL) {
  // Set a dummy DATABASE_URL to allow db module to load without error
  process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
}

export async function initializeDatabase() {
  if (shouldSkip) {
    console.warn('[DB] SKIP_DB_INIT=1 — skipping database initialization (dev mode).');
    return;
  }

  // Dynamic import to avoid loading DB modules when skipping (though they may already be loaded)
  const { initializeDatabase: realInitializeDatabase } = await import('./db-init');
  return realInitializeDatabase();
}