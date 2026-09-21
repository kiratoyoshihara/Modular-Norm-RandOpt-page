import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { radarLayout, radarPoint, renderRadar, renderLegend, seriesGeometry, taskRanges, relativeValue } from '../assets/js/radar-svg.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(await readFile(resolve(root, 'assets/data/transfer-results.json'), 'utf8'));
assert.equal(data.tasks.length, 7);
assert.deepEqual(Object.keys(data.scales), ['0.5B', '1.5B', '3B']);
assert.equal(data.conditions.population, 100);
assert.equal(data.conditions.ensemble, 25);
assert.deepEqual(data.conditions.seeds, [42, 43, 44]);
let count = 0;
let wins = 0;
let ties = 0;
for (const scale of Object.values(data.scales)) {
  for (const method of data.methods) {
    for (const task of data.tasks) {
      const { mean, sd } = scale.scores[method.id][task.id];
      assert.ok(Number.isFinite(mean) && mean >= 0 && mean <= 100);
      assert.ok(Number.isFinite(sd) && sd >= 0);
      count += 1;
    }
  }
  for (const task of data.tasks) {
    const difference = scale.scores.modular[task.id].mean - scale.scores.randopt[task.id].mean;
    if (difference > 0) wins += 1;
    if (difference === 0) ties += 1;
  }
}
assert.equal(count, 63);
assert.equal(wins, 14);
assert.equal(ties, 1);
for (const [scaleId, scale] of Object.entries(data.scales)) {
  const ranges = taskRanges(data, scaleId);
  ranges.forEach((range, index) => {
    assert.deepEqual(range, [0, 100], 'Every task and model size uses the same score scale');
    assert.equal(relativeValue(range[0], range), 0);
    assert.equal(relativeValue(range[1], range), 100);
    for (const method of data.methods) {
      const score = scale.scores[method.id][data.tasks[index].id];
      assert.ok(range[0] <= Math.max(0, score.mean - score.sd) + 1e-9);
      assert.ok(range[1] >= Math.min(100, score.mean + score.sd) - 1e-9);
    }
  });
}

// When the supplied paper is available, independently compare every table cell.
let tex;
try { tex = await readFile(resolve(root, '../main (1).tex'), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (tex) {
  const table = tex.split('% (a): one group of three methods per model scale.')[1].split('% (b) and (c):')[0];
  const blocks = table.split(/\\multirow\{3\}\{\*\}\{(0\.5B|1\.5B|3B)\}/);
  for (let i = 1; i < blocks.length; i += 2) {
    const size = blocks[i];
    const rows = blocks[i + 1].split(/&\s*(RandOpt|RMSNorm-only|MN RandOpt)\s*\n/);
    for (let j = 1; j < rows.length; j += 2) {
      const method = { RandOpt: 'randopt', 'RMSNorm-only': 'rmsnorm', 'MN RandOpt': 'modular' }[rows[j]];
      const clean = rows[j + 1].replace(/\\boldsymbol\{([^{}]*)\}/g, '$1');
      const numbers = [...clean.matchAll(/([0-9]+\.[0-9]+)\\pm([0-9]+\.[0-9]+)/g)];
      assert.equal(numbers.length, 7);
      numbers.forEach((match, index) => assert.deepEqual(data.scales[size].scores[method][data.tasks[index].id], { mean: Number(match[1]), sd: Number(match[2]) }));
    }
  }
  console.log('All 63 mean/SD pairs match the supplied TeX.');
}

for (const compact of [false, true]) {
  const layout = radarLayout(compact);
  assert.deepEqual(radarPoint(0, 0, 7, layout), [layout.cx, layout.cy]);
  assert.deepEqual(radarPoint(0, 100, 7, layout), [layout.cx, layout.cy - layout.radius]);
  const partial = seriesGeometry([100, null, 0, 50, 60, 70, 80], layout);
  assert.equal(partial.fill, null);
  assert.equal(partial.points[1], null);
  assert.deepEqual(partial.points[2], [layout.cx, layout.cy]);
  assert.ok(!partial.line.endsWith('Z'));
  for (const scale of Object.keys(data.scales)) {
    const svg = renderRadar(data, scale, { compact, interactive: true });
    assert.ok(!svg.includes('NaN'));
    assert.equal((svg.match(/class="radar-label"/g) || []).length, 7);
    assert.equal((svg.match(/data-series=/g) || []).length, 3);
  }
  const file = compact ? 'transfer-radar-mobile.svg' : 'transfer-radar.svg';
  assert.equal(await readFile(resolve(root, `assets/figures/${file}`), 'utf8'), renderRadar(data, '1.5B', { compact }));
}
const html = await readFile(resolve(root, 'index.html'), 'utf8');
assert.ok(html.includes(renderLegend(data)));
for (const file of ['assets/js/main.js', 'assets/js/scale-story.js', 'assets/js/scale-timing.js', 'assets/js/scale-diagrams.js', 'assets/js/radar-chart.js', 'assets/js/radar-svg.js', 'assets/js/method-animation.js', 'assets/js/method-svg.js', 'assets/js/motion.js', 'assets/js/research-visuals.js', 'assets/js/research-experience.js']) {
  const result = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
assert.ok(!html.includes('population-scaling.png'));
console.log('Passed: scientific data, shared 0–100 radar scale, missing-value gaps, static fallbacks, matching legend, and JS syntax.');
