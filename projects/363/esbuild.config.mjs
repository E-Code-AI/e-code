import { build, context } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWatch = process.argv.includes('--watch') || process.argv.includes('-w');
const isProd = process.env.NODE_ENV === 'production';

const outdir = path.resolve(__dirname, 'dist');
const entryFile = path.resolve(__dirname, 'src', 'index.tsx');

const commonOptions = {
  entryPoints: [entryFile],
  bundle: true,
  outdir,
  platform: 'browser',
  format: 'esm',
  target: ['es2017'],
  sourcemap: isProd ? 'external' : 'inline',
  minify: isProd,
  logLevel: 'info',
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.js': 'js',
    '.jsx': 'jsx',
    '.css': 'css',
    '.json': 'json',
  },
  jsx: 'automatic',
  jsxImportSource: 'react',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || (isProd ? 'production' : 'development')),
  },
  metafile: !isProd,
};

async function run() {
  if (isWatch) {
    const ctx = await context({
      ...commonOptions,
      watch: true,
    });

    await ctx.watch();

    // Optional: simple serve for static files from dist
    const port = Number(process.env.PORT || 3000);
    await ctx.serve({
      servedir: outdir,
      port,
      host: '0.0.0.0',
    });

    // Keep process alive
    // eslint-disable-next-line no-console
    console.log(`esbuild is watching and serving on http://localhost:undefined`);
  } else {
    const result = await build(commonOptions);
    if (!isProd && result.metafile) {
      // eslint-disable-next-line no-console
      console.log('Build complete. Outputs:');
      // eslint-disable-next-line no-console
      console.log(
        Object.keys(result.metafile.outputs)
          .map((file) => ` - undefined`)
          .join('\n'),
      );
    }
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});