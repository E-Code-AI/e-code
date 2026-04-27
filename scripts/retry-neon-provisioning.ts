import 'dotenv/config';
import { db } from '../server/db';
import { projectDatabases } from '../shared/schema';
import { and, eq } from 'drizzle-orm';

async function main() {
  const projectIdArg = process.argv[2];
  const batchMode = process.argv.includes('--batch');

  const { projectDatabaseService } = await import(
    '../server/services/project-database-provisioning.service'
  );

  let targets: number[] = [];

  if (projectIdArg && !batchMode) {
    targets = [Number(projectIdArg)];
  } else {
    const rows = await db
      .select({ projectId: projectDatabases.projectId })
      .from(projectDatabases)
      .where(
        and(
          eq(projectDatabases.status, 'error'),
          eq(projectDatabases.provider, 'neon')
        )
      );
    targets = rows.map((r) => r.projectId);
    if (!batchMode) targets = targets.slice(0, 1);
  }

  console.log(`\n=== Re-provisioning ${targets.length} project(s) on Neon ===\n`);

  let ok = 0;
  let ko = 0;
  const failures: { projectId: number; error: string }[] = [];

  for (const projectId of targets) {
    process.stdout.write(`[${projectId}] `);
    try {
      const result = await projectDatabaseService.provisionDatabase(
        projectId,
        { provider: 'neon' }
      );
      console.log(
        `✓ status=${result.status} provider=${result.provider} host=${result.host || '(pending)'}`
      );
      if (result.status === 'running') ok++;
      else ko++;
    } catch (err: any) {
      console.log(`✗ ${err?.message || err}`);
      failures.push({ projectId, error: err?.message || String(err) });
      ko++;
    }
    if (batchMode) await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\n=== Résumé : ${ok} succès / ${ko} échecs ===\n`);
  if (failures.length) {
    console.log('Détails échecs :');
    failures.slice(0, 5).forEach((f) =>
      console.log(`  - projet ${f.projectId} : ${f.error.slice(0, 120)}`)
    );
  }

  process.exit(ko === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
