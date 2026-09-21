import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { JSDOM } = createRequire(resolve(root, '.local/verification/package.json'))('jsdom');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const originalFetch = globalThis.fetch;
// Exercise the real entry point: the Overview method and charts initialize independently.
for (const reducedOnLoad of [false, true]) {
  const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'http://127.0.0.1:8000/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  const preference = new window.EventTarget();
  preference.matches = reducedOnLoad;
  window.matchMedia = query => query.includes('reduced-motion') ? preference : {
    matches: false, addEventListener() {}, removeEventListener() {}
  };
  const observers = [];
  window.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; this.targets = new Set(); observers.push(this); }
    observe(target) { this.targets.add(target); }
    disconnect() { this.targets.clear(); }
    emit(visible) {
      this.callback([...this.targets].map(target => ({ target, isIntersecting: visible, intersectionRatio: visible ? 1 : 0 })));
    }
  };
  const requests = [];
  globalThis.fetch = async url => {
    requests.push(url.pathname);
    return { ok: true, json: async () => JSON.parse(await readFile(url, 'utf8')) };
  };
  try {
    await import(`../assets/js/main.js?motion-check=${reducedOnLoad}`);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].endsWith('/transfer-results.json'), 'Only the active chart data is loaded');
    assert.equal(document.querySelector('#method'), null);
    const method = document.querySelector('#overview-method');
    assert.equal(method.dataset.enhanced,'true');
    assert.equal(method.querySelector('[data-method-replay]').disabled,reducedOnLoad);
    const rows = [...document.querySelectorAll('.figure2-row')];
    assert.equal(rows.length, 8, 'Desktop rows, mobile population panels, and iterative panels initialize');
    const radar = document.querySelector('#radar-mount');
    const charts = [...rows, radar];
    const replay = [...document.querySelectorAll('[data-figure2-replay], [data-radar-replay]')];
    assert.equal(document.documentElement.dataset.motion, reducedOnLoad ? 'paused' : 'running');
    charts.forEach(chart => assert.equal(chart.dataset.reveal, reducedOnLoad ? 'complete' : 'waiting'));
    replay.forEach(button => assert.equal(button.disabled, reducedOnLoad));
    if (!reducedOnLoad) {
      observers.forEach(observer => observer.emit(true));
      charts.forEach(chart => assert.equal(chart.dataset.reveal, 'playing', 'Each chart responds to its own scroll observer'));
      assert.equal(method.dataset.playing,'true');
      for (const hidden of [true, false]) {
        Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
        document.dispatchEvent(new window.Event('visibilitychange'));
        document.querySelectorAll('#figure2, #iterative-chart').forEach(chart => assert.equal(chart.dataset.paused, String(hidden)));
        assert.equal(radar.dataset.revealPaused, String(hidden));
        assert.equal(method.dataset.playing,String(!hidden));
      }
    }
    preference.matches = true;
    preference.dispatchEvent(new window.Event('change'));
    assert.equal(document.documentElement.dataset.motion, 'paused');
    charts.forEach(chart => assert.equal(chart.dataset.reveal, 'complete'));
    replay.forEach(button => assert.equal(button.disabled, true));
    assert.equal(method.dataset.playing,'false');
    assert.equal(method.querySelector('[data-method-replay]').disabled,true);
    preference.matches = false;
    preference.dispatchEvent(new window.Event('change'));
    assert.equal(document.documentElement.dataset.motion, 'running');
    replay.forEach(button => assert.equal(button.disabled, false));
  } finally {
    dom.window.close();
    globalThis.fetch = originalFetch;
    delete globalThis.window;
    delete globalThis.document;
  }
}
console.log('Passed: independent Overview method and chart initialization, scroll reveals, visibility pause, reduced motion on load and preference changes.');
