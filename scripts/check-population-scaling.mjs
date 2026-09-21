import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIGURE2, figure2Data, figure2X, figure2Y, renderFigure2 } from '../assets/js/figure2-svg.js';
import { Figure2Chart } from '../assets/js/figure2-chart.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const csv = await readFile(resolve(root, 'assets/data/figure2.csv'), 'utf8');
const data = figure2Data(csv);
assert.equal(data.length, 40);
assert.equal(data.reduce((sum, row) => sum + row.correct.length, 0), 120);
const [header, ...lines] = csv.trim().split('\n');
const keys = header.split(',');
for (let index = 0; index < lines.length; index++) {
  const row = Object.fromEntries(lines[index].split(',').map((n, i) => [keys[i], n]));
  for (const [source, field] of [['mean_percent', 'mean'], ['sample_sd_pp', 'sd'], ['band_lower_percent', 'lower'], ['band_upper_percent', 'upper']]) {
    assert.ok(Math.abs(data[index][field] - Number(row[source])) < 0.00000051, `${row.task}/${row.K}/${row.N}/${row.method}/${field}`);
  }
}
let source;
try { source = await readFile(resolve(root, '../figure2.md'), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (source) assert.equal(csv.trim(), source.split('```csv\n')[1].split('```')[0].trim(), 'Tracked data agrees with the supplied Markdown');
for (const task of FIGURE2.tasks) {
  const rows = data.filter((row) => row.task === task.id);
  assert.ok(rows.every((row) => row.examples === task.examples && row.lower >= task.domain[0] && row.upper <= task.domain[1]));
  for (const k of [10, 25]) {
    const our = rows.find((row) => row.k === k && row.method === 'modular' && row.n === task.selectedN);
    const baseline = rows.find((row) => row.k === k && row.method === 'randopt' && row.n === 300);
    const expected = { countdown: { 10: '1.53', 25: '0.93' }, gsm8k: { 10: '2.60', 25: '3.11' } };
    assert.equal((our.mean - baseline.mean).toFixed(2), expected[task.id][k]);
  }
}
assert.equal(data.find((row) => row.task === 'countdown' && row.k === 25 && row.n === 100 && row.method === 'modular').sd.toFixed(2), '3.22', 'Do not substitute the ablation SD');
assert.deepEqual(FIGURE2.populations.map((n) => figure2X(n)), [0, 112, 224, 336, 448], 'N is categorical, not a linear numeric axis');
assert.equal(figure2Y(25, [25, 42]), 220);
assert.equal(figure2Y(42, [25, 42]), 0);

const { JSDOM } = createRequire(resolve(root, '.local/verification/package.json'))('jsdom');
const svg = renderFigure2(data);
const mobileSvg = renderFigure2(data, 'figure2-mobile', { compact: true });
assert.equal(await readFile(resolve(root, 'assets/figures/figure2.svg'), 'utf8'), svg);
assert.equal(await readFile(resolve(root, 'assets/figures/figure2-mobile.svg'), 'utf8'), mobileSvg);
const html = await readFile(resolve(root, 'index.html'), 'utf8');
assert.ok(html.includes(svg), 'Page and standalone SVG use identical data');
assert.ok(html.includes(mobileSvg), 'The mobile fallback uses the same scientific data');
const dom = new JSDOM(html, { pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = window.document;
document.documentElement.dataset.motion = 'running';
const figure = document.querySelector('#figure2');
for (const diagram of figure.querySelectorAll('.figure2-svg')) {
  const compact = diagram.classList.contains('figure2-svg-mobile');
  assert.equal(diagram.querySelectorAll('.f2-panel').length, 4);
  assert.equal(diagram.querySelectorAll('.f2-curve').length, 8);
  assert.equal(diagram.querySelectorAll('.f2-band').length, 8);
  assert.equal(diagram.querySelectorAll('.f2-point').length, 40);
  assert.deepEqual([...diagram.querySelectorAll('.f2-panel')].map((panel) => panel.dataset.panel), ['countdown-10', 'countdown-25', 'gsm8k-10', 'gsm8k-25']);
  for (const task of FIGURE2.tasks) {
    assert.equal(diagram.querySelectorAll(`[data-panel='${task.id}-10'] .f2-tick`).length, task.ticks.length + 5);
    assert.equal(diagram.querySelectorAll(`[data-panel='${task.id}-25'] .f2-tick`).length, (compact ? task.ticks.length : 0) + 5);
  }
}
assert.ok([...figure.querySelectorAll('.f2-band')].every((band) => band.getAttribute('fill-opacity') === '.09'));
assert.ok([...figure.querySelectorAll('.f2-emphasis')].every((group) => group.querySelectorAll('circle,rect').length === 2));

const media = { matches: false, listeners: new Set(), addEventListener(event, fn) { this.listeners.add(fn); }, removeEventListener(event, fn) { this.listeners.delete(fn); }, emit() { this.listeners.forEach((fn) => fn()); } };
window.matchMedia = () => media;
class Observer {
  constructor(callback) { this.callback = callback; this.targets = new Set(); }
  observe(target) { this.targets.add(target); }
  disconnect() { this.targets.clear(); }
  emit(target, ratio) { this.callback([{ target, intersectionRatio: ratio, isIntersecting: ratio > 0 }]); }
}
window.IntersectionObserver = Observer;
const chart = new Figure2Chart(figure);
const [top, bottom, ...mobilePanels] = chart.rows;
const state = () => [top, bottom].map((row) => row.dataset.reveal);
assert.equal(mobilePanels.length, 4, 'Each mobile panel animates independently as it enters the viewport');
chart.observer.emit(mobilePanels[0], .5);
assert.deepEqual(mobilePanels.map(panel => panel.dataset.reveal), ['playing', 'waiting', 'waiting', 'waiting']);
assert.deepEqual(state(), ['waiting', 'waiting']);
chart.observer.emit(top, .1);
assert.deepEqual(state(), ['waiting', 'waiting']);
chart.observer.emit(top, .5);
assert.deepEqual(state(), ['playing', 'waiting'], 'Lower panels wait until they are visible');
chart.observer.emit(top, 0);
assert.equal(top.dataset.visible, 'false');
chart.observer.emit(top, .7);
const done = new window.Event('animationend', { bubbles: true });
Object.defineProperty(done, 'animationName', { value: 'figure2-sequence' });
top.dispatchEvent(done);
assert.deepEqual(state(), ['complete', 'waiting']);
chart.observer.emit(top, 0); chart.observer.emit(top, .7);
assert.equal(top.dataset.reveal, 'complete', 'Scrolling back does not restart completed rows');
chart.observer.emit(bottom, .8);
assert.deepEqual(state(), ['complete', 'playing']);
Object.defineProperty(document, 'hidden', { configurable: true, value: true });
document.dispatchEvent(new window.Event('visibilitychange'));
assert.equal(figure.dataset.paused, 'true');
Object.defineProperty(document, 'hidden', { configurable: true, value: false });
document.dispatchEvent(new window.Event('visibilitychange'));
assert.equal(figure.dataset.paused, 'false');
chart.replay.click();
assert.deepEqual(state(), ['playing', 'playing']);
document.dispatchEvent(new window.CustomEvent('research-motion-change', { detail: { playing: false } }));
assert.deepEqual(state(), ['complete', 'complete'], 'Pause leaves all measurements readable');
assert.equal(chart.replay.disabled, true);
document.dispatchEvent(new window.CustomEvent('research-motion-change', { detail: { playing: true } }));
assert.equal(chart.replay.disabled, false);
media.matches = true; media.emit();
chart.replay.click();
assert.deepEqual(state(), ['complete', 'complete']);
chart.destroy();
assert.equal(media.listeners.size, 0);
assert.equal(chart.observer.targets.size, 0);
const quiet = new Figure2Chart(figure);
assert.ok(quiet.rows.every((row) => row.dataset.reveal === 'complete'));
quiet.destroy();
media.matches = false;
delete window.IntersectionObserver;
const fallback = new Figure2Chart(figure);
assert.ok(fallback.rows.every((row) => row.dataset.reveal === 'complete'));
fallback.destroy();
dom.window.close();
console.log('Passed: Figure 2 source/120 counts/40 means and sample SDs, categorical axes, paper layout, static fallback, row visibility, replay, pause, and reduced motion.');
