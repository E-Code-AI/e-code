import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const url = process.env.SHOT_URL || 'http://127.0.0.1:5057/';
const out = process.env.SHOT_OUT || '/Users/hb/dev/e-code/docs/demo-screenshot.png';

mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', m => process.stderr.write(`[console.${m.type()}] ${m.text()}\n`));
page.on('pageerror', e => process.stderr.write(`[pageerror] ${e.message}\n`));

const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => ({ error: e.message }));
if (resp && resp.error) {
  console.error('navigation error:', resp.error);
}
await page.waitForTimeout(2500);
await page.screenshot({ path: out, fullPage: false });
console.log('saved', out);
await browser.close();
