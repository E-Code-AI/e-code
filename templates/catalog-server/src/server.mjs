import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const port = Number(process.env.PORT || 8080);
const here = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.resolve(here, '../../catalog.json');

async function loadCatalog() {
  return JSON.parse(await readFile(catalogPath, 'utf8'));
}

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'public, max-age=60, s-maxage=300',
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/health') {
      json(res, 200, { ok: true });
      return;
    }

    if (url.pathname === '/templates') {
      const catalog = await loadCatalog();
      const q = url.searchParams.get('q')?.toLowerCase();
      const category = url.searchParams.get('category');
      const language = url.searchParams.get('language');
      const items = catalog.filter((item) => {
        if (category && item.category !== category) return false;
        if (language && item.language !== language) return false;
        if (q && !`${item.name} ${item.id} ${item.tags.join(' ')}`.toLowerCase().includes(q)) return false;
        return true;
      });
      json(res, 200, { templates: items, count: items.length });
      return;
    }

    if (url.pathname === '/projects/from-template' && req.method === 'POST') {
      json(res, 501, {
        error: 'COORDINATION_REQUIRED',
        message: 'Project creation must be implemented in the main API owner zone so it can write Cloud SQL rows and spawn Cloud Run previews.',
      });
      return;
    }

    json(res, 404, { error: 'not_found' });
  } catch (error) {
    json(res, 500, { error: 'internal_error', message: error instanceof Error ? error.message : 'unknown' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`E-code templates catalog listening on ${port}`);
});
