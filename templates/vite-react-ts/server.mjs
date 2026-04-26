import http from 'node:http';

const portArg = process.argv.indexOf('--port');
const port = Number(portArg >= 0 ? process.argv[portArg + 1] : process.env.PORT || 3000);
const name = "Vite React TypeScript";

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, template: name }));
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html><head><title>${name}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Inter,system-ui;background:#0b1020;color:#f8fafc}main{min-height:100vh;display:grid;place-items:center;padding:32px}.card{max-width:760px;border:1px solid #23304d;border-radius:16px;padding:32px;background:#111936;box-shadow:0 24px 80px #0005}p{color:#b7c4e7}</style></head><body><main><section class="card"><h1>${name}</h1><p>Official E-code Cloud Run ready template. Replace this starter with framework code while preserving .ecode.json, Dockerfile, tests and deployment contract.</p></section></main></body></html>`);
});

server.listen(port, '0.0.0.0', () => console.log(`${name} listening on ${port}`));
