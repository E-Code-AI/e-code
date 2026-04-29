import { chromium } from 'playwright';

const BASE = 'http://localhost:5057';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

page.on('console', msg => console.log('[browser]', msg.type(), msg.text().slice(0, 300)));
page.on('pageerror', err => console.log('[pageerror]', err.message));

// 1) Login via API request — share cookies between request and browser context
console.log('--- login ---');
const csrfRes = await ctx.request.get(BASE + '/api/csrf-token');
const csrf = (await csrfRes.json()).csrfToken;
const loginRes = await ctx.request.post(BASE + '/api/login', {
  headers: { 'X-CSRF-Token': csrf, 'content-type': 'application/json' },
  data: { email: 'dev@test.local', password: 'Test1234!' },
});
console.log('login status', loginRes.status());
const cookies = await ctx.cookies();
console.log('cookies count after login:', cookies.length);

// 2) Open Home, enter prompt, click create
console.log('--- navigate home ---');
await page.goto(BASE + '/', { waitUntil: 'commit', timeout: 90000 });

// Vite cold-compile the e-code IDE bundle on first navigation; on a fresh
// server boot this can take 30s+ before the React tree mounts. Wait for
// the prompt input rather than a fixed timeout.
const input = page.getByTestId('input-app-description').first();
let visible = false;
for (let i = 0; i < 24; i++) {
  visible = await input.isVisible().catch(() => false);
  if (visible) break;
  await page.waitForTimeout(2000);
}
console.log('prompt input visible:', visible);

if (!visible) {
  console.log('prompt input not found, page url:', page.url());
  await page.screenshot({ path: '/tmp/home.png' });
} else {
  const t0 = Date.now();
  await input.fill('Build a clean wine club homepage with hero and CTA');
  await page.waitForTimeout(500);
  await page.getByTestId('button-build-now').click();

  // BuildModeSelector should appear after click
  await page.waitForTimeout(2000);
  const designFirst = page.locator('button:has-text("Design First"), [data-testid*="design"], [data-testid*="prototype"]').first();
  const fullApp = page.locator('button:has-text("Full App"), button:has-text("Build complete"), [data-testid*="full-app"]').first();
  if (await designFirst.isVisible().catch(() => false)) {
    console.log('clicking design first');
    await designFirst.click();
  } else if (await fullApp.isVisible().catch(() => false)) {
    console.log('clicking full app');
    await fullApp.click();
  } else {
    console.log('no build mode button visible, taking screenshot');
    await page.screenshot({ path: '/tmp/build-mode.png' });
  }

  // Wait for redirect to /ide/{id}
  console.log('waiting for /ide redirect...');
  await page.waitForURL(/\/ide\/\d+/, { timeout: 90000 }).catch(e => console.log('redirect failed:', e.message));
  const url = page.url();
  console.log('redirected to', url, 'in', Date.now() - t0, 'ms');

  if (url.match(/\/ide\/\d+/)) {
    // Wait for preview panel to be present
    await page.waitForTimeout(3000);

    // Click preview tab if there's one
    const previewTab = page.locator('[data-testid="activity-preview"], [data-testid="tab-preview"], button[aria-label*="Preview" i], button[title*="Preview" i]').first();
    const tabVisible = await previewTab.isVisible().catch(() => false);
    console.log('preview tab visible:', tabVisible);
    if (tabVisible) {
      await previewTab.click();
      await page.waitForTimeout(2000);
    }

    // Poll the preview state for 90s
    const start = Date.now();
    let lastState = '';
    while (Date.now() - start < 90000) {
      const state = await page.evaluate(() => {
        // ResponsiveWebPreview uses a different iframe id; match any iframe
        // that points at the proxied /preview/ URL space.
        const iframes = Array.from(document.querySelectorAll('iframe')) ;
        const previewIframe = iframes.find(i => /\/preview\//.test(i.src || ''));
        const errorState = document.querySelector('[data-testid="preview-error-state"]');
        const splash = document.querySelector('[data-testid*="splash"], [data-testid="preview-bootstrap-splash"]');
        const spinner = document.querySelector('.animate-spin');
        return {
          hasIframe: !!previewIframe,
          iframeSrc: previewIframe?.getAttribute('src') || null,
          allIframes: iframes.map(i => i.src).slice(0, 5),
          hasError: !!errorState,
          errorText: errorState?.textContent?.slice(0, 200),
          hasSplash: !!splash,
          hasSpinner: !!spinner,
          bodyText: document.body.innerText.slice(0, 400),
        };
      });
      const sig = JSON.stringify({ i: state.hasIframe, e: state.hasError, sp: state.hasSplash });
      if (sig !== lastState) {
        console.log(`t=${Math.round((Date.now()-start)/1000)}s state: hasIframe=${state.hasIframe} iframeSrc=${state.iframeSrc} hasError=${state.hasError} hasSplash=${state.hasSplash} hasSpinner=${state.hasSpinner}`);
        console.log('  body:', state.bodyText.replace(/\n/g, ' | ').slice(0, 200));
        lastState = sig;
      }
      if (state.hasIframe && state.iframeSrc) {
        // Capture iframe console + errors as soon as it loads
        const iframeMsgs = [];
        page.on('frameattached', frame => {
          frame.on('console', m => iframeMsgs.push('[iframe '+m.type()+'] '+m.text().slice(0,300)));
          frame.on('pageerror', e => iframeMsgs.push('[iframe error] '+e.message));
        });
        // Already attached frames
        page.frames().forEach(frame => {
          if (/\/preview\//.test(frame.url())) {
            frame.on('console', m => iframeMsgs.push('[iframe '+m.type()+'] '+m.text().slice(0,300)));
            frame.on('pageerror', e => iframeMsgs.push('[iframe error] '+e.message));
          }
        });
        // Wait for iframe content to actually paint (Vite + React bundle download)
        await page.waitForTimeout(20000);
        const iframeContent = await page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll('iframe'));
          const iframe = iframes.find(i => /\/preview\//.test(i.src));
          if (!iframe) return null;
          try {
            const doc = iframe.contentDocument;
            const win = iframe.contentWindow;
            return {
              src: iframe.src,
              winLocationPathname: win?.location.pathname,
              title: doc?.title,
              hasRoot: !!doc?.querySelector('#root'),
              rootChildren: doc?.querySelector('#root')?.childElementCount ?? 0,
              bodyText: doc?.body?.innerText?.slice(0, 300),
            };
          } catch (e) {
            return { error: String(e), src: iframe.src };
          }
        });
        console.log('iframe content:', JSON.stringify(iframeContent, null, 2));
        console.log('iframe console messages:');
        iframeMsgs.slice(0, 30).forEach(m => console.log('  ', m));
        await page.screenshot({ path: '/tmp/preview-final.png', fullPage: false });
        break;
      }
      await page.waitForTimeout(3000);
    }

    if (lastState === '' || !lastState.includes('"i":true')) {
      console.log('PREVIEW NEVER SHOWED AN IFRAME');
      await page.screenshot({ path: '/tmp/preview-broken.png', fullPage: false });
    }
  }
}

await browser.close();
