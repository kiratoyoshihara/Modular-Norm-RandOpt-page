// Real browser regression checks for the mobile chart reveal.
// Requires Playwright and its Chromium/WebKit browsers in .local/verification.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium, webkit } = createRequire(resolve(root, '.local/verification/package.json'))('playwright');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : decodeURIComponent(pathname)));
    if (!file.startsWith(root + '/')) throw new Error('Outside project');
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }).end(data);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;

async function checkPage(browser, { mobile, missedObserver = false, reduced = false }) {
  const page = await browser.newPage({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1365, height: 900 },
    isMobile: mobile, hasTouch: mobile, reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    if (missedObserver) await page.addInitScript(() => {
      // Model a browser that does not deliver the intersection notification.
      window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    });
    await page.goto(url);
    await page.waitForFunction(() => document.querySelector('#radar-fallback')?.hidden);
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
    if (reduced) {
      assert.ok(await page.locator('.figure2-row').evaluateAll(rows => rows.every(row => row.dataset.reveal === 'complete' && getComputedStyle(row.querySelector('.f2-data')).opacity === '1')));
      assert.ok(await page.locator('[data-figure2-replay]').evaluateAll(buttons => buttons.every(button => button.disabled)));
      return;
    }

    const variant = mobile ? 'mobile' : 'desktop';
    const populationRows = page.locator(`#figure2 .figure2-svg-${variant} .figure2-row`);
    const iterativeRows = page.locator('#iterative-chart .figure2-row');
    const first = populationRows.first();
    const position = (row, below = false) => row.evaluate((element, below) => {
      window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - (below ? window.innerHeight + 60 : 160));
    }, below);
    const waitState = (row, state) => row.evaluate((element, expected) => new Promise((resolve, reject) => {
      const started = performance.now();
      const poll = () => {
        if (element.dataset.reveal === expected) return resolve();
        if (performance.now() - started > 5000) return reject(new Error(`Expected ${expected}, got ${element.dataset.reveal}`));
        requestAnimationFrame(poll);
      };
      poll();
    }), state);

    // Previously the +120px root margin ran the whole reveal below the screen.
    await position(first, true);
    await page.waitForTimeout(3300);
    assert.equal(await first.getAttribute('data-reveal'), 'waiting', 'An offscreen population panel must not complete before the user sees it');
    await position(first);
    await waitState(first, 'playing');
    assert.ok(await first.evaluate(row => row.getAnimations({ subtree: true }).some(animation => animation.animationName === 'figure2-fade')), 'The visible panel animates its measurements');
    await waitState(first, 'complete');
    assert.ok(await first.locator('.f2-point').evaluateAll(points => points.every(point => getComputedStyle(point).opacity === '1')), 'All points are visible after the reveal');
    assert.ok(await page.locator(`#figure2 .figure2-svg-${mobile ? 'desktop' : 'mobile'} .figure2-row`).evaluateAll(rows => rows.every(row => row.dataset.reveal === 'waiting')), 'The hidden responsive layout does not spend its animations');
    if (mobile) {
      const last = populationRows.last();
      assert.equal(await last.getAttribute('data-reveal'), 'waiting', 'A later panel waits inside the tall mobile figure');
      await position(last);
      await waitState(last, 'playing');
    }

    // Touching a legend while beginning a swipe must not skip both reveals.
    await page.locator('[data-iterative-method]').first().evaluate(button => button.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' })));
    assert.ok(await iterativeRows.evaluateAll(rows => rows.every(row => row.dataset.reveal === 'waiting')));
    await position(iterativeRows.first(), true);
    await page.waitForTimeout(2000);
    assert.ok(await iterativeRows.evaluateAll(rows => rows.every(row => row.dataset.reveal === 'waiting')), 'Offscreen iterative panels also wait');
    await position(iterativeRows.first());
    await waitState(iterativeRows.first(), 'playing');
    assert.ok(await iterativeRows.first().evaluate(row => row.getAnimations({ subtree: true }).some(animation => animation.animationName === 'figure2-fade')));
    await waitState(iterativeRows.first(), 'complete');
    assert.ok(await iterativeRows.first().locator('.f2-point').evaluateAll(points => points.every(point => getComputedStyle(point).opacity === '1')));
    await page.locator('#iterative-chart [data-figure2-replay]').evaluate(button => button.click());
    await waitState(iterativeRows.first(), 'playing');
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

try {
  for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
    const browser = await type.launch({ headless: true });
    try {
      for (const configuration of [{ mobile: true }, { mobile: false }, { mobile: true, missedObserver: true }, { mobile: true, reduced: true }]) {
        await checkPage(browser, configuration);
        console.log(`Passed ${name}: ${JSON.stringify(configuration)}`);
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise(resolve => server.close(resolve));
}
