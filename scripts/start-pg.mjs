import EmbeddedPostgres from 'embedded-postgres';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dataDir = join(process.cwd(), '.pgdata');
mkdirSync(dataDir, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,
});

const freshInstall = !existsSync(join(dataDir, 'PG_VERSION'));

(async () => {
  if (freshInstall) {
    console.log('[pg] First run — initializing cluster in', dataDir);
    await pg.initialise();
  }
  console.log('[pg] Starting postgres on 127.0.0.1:5432 ...');
  await pg.start();
  if (freshInstall) {
    try { await pg.createDatabase('ecode_dev'); console.log('[pg] Created database ecode_dev'); }
    catch (e) { console.log('[pg] createDatabase:', e.message); }
  }
  console.log('[pg] ✅ postgres ready — DATABASE_URL=postgres://postgres:postgres@localhost:5432/ecode_dev');
  process.on('SIGINT', async () => { await pg.stop(); process.exit(0); });
  process.on('SIGTERM', async () => { await pg.stop(); process.exit(0); });
})().catch(err => { console.error('[pg] fatal:', err); process.exit(1); });
