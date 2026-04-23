import type postgres from 'postgres';

export function normalizePostgresJsConnection(connectionString: string): {
  connectionString: string;
  options: Pick<postgres.Options<Record<string, postgres.PostgresType>>, 'host' | 'path'>;
} {
  try {
    const url = new URL(connectionString);
    const host = url.searchParams.get('host') || undefined;

    if (!host) {
      return { connectionString, options: {} };
    }

    url.searchParams.delete('host');
    const port = Number(url.port || 5432);
    const options = host.startsWith('/')
      ? { path: `${host.replace(/\/$/, '')}/.s.PGSQL.${port}` }
      : { host };

    return { connectionString: url.toString(), options };
  } catch {
    return { connectionString, options: {} };
  }
}
