import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { iterativeComparison, iterativeX, renderIterativePanel } from '../assets/js/iterative-svg.js';
import { IterativeChart } from '../assets/js/iterative-chart.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(await readFile(resolve(root,'assets/data/iterative-baselines.json'),'utf8'));
// User-supplied results, restricted to the three requested MN-RandOpt settings.
const expectedResults = {
  countdown: [
    ['modular',100,25,38.40,2.71],
    ['es',3000,1,35.67,5.08],
    ['modular_single',3000,1,16.18,1.08],
    ['zo',3000,1,29.56,.82],
    ['mezo',3000,1,29.22,1.93],
    ['modular',3000,25,38.44,1.20],
    ['randopt',3000,25,35.29,1.60],
  ],
  gsm8k: [
    ['modular',100,25,73.16,.66],
    ['es',3000,1,73.11,.52],
    ['modular_single',3000,1,64.42,.29],
    ['zo',3000,1,72.53,.58],
    ['mezo',3000,1,71.72,.27],
    ['modular',3000,25,74.45,.95],
    ['randopt',3000,25,69.95,1.11],
  ],
};
const sortRows = rows => rows.map(row => JSON.stringify(row)).sort();
for (const task of data.tasks) {
  assert.deepEqual(sortRows(task.points.map(p => [p.method,p.n,p.k,p.mean,p.sd])), sortRows(expectedResults[task.id]));
  for (const p of task.points) {
    assert.ok(p.mean>=task.domain[0] && p.mean<=task.domain[1], 'Every mean fits the accuracy axis');
  }
  const comparison = iterativeComparison(task);
  assert.equal(comparison.ratio, 30);
  assert.equal(comparison.difference.toFixed(2), task.id === 'countdown' ? '2.73' : '0.05');
  assert.equal(await readFile(resolve(root,`assets/figures/iterative-${task.id}.svg`),'utf8'),renderIterativePanel(data,task,{interactive:false}));
}
assert.equal(iterativeX(0),0);
assert.ok(Math.abs(iterativeX(3000)-30*iterativeX(100))<1e-9,'N uses a linear scale');
const missing = structuredClone(data.tasks[0]);
missing.points.find(p => p.method === 'mezo').mean = null;
assert.ok(!renderIterativePanel(data,missing).includes('data-iterative-point="countdown-mezo"'), 'Missing scores remain omitted');
const {JSDOM}=createRequire(resolve(root,'.local/verification/package.json'))('jsdom');
const dom=new JSDOM(await readFile(resolve(root,'index.html'),'utf8'),{pretendToBeVisual:true});
globalThis.window=dom.window;
globalThis.document=window.document;
window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
class Observer {
  constructor(fn){this.fn=fn;}
  observe(){}
  disconnect(){}
  emit(target){this.fn([{target,isIntersecting:true,intersectionRatio:.8}]);}
}
window.IntersectionObserver=Observer;
document.documentElement.dataset.motion='running';
const figure=document.querySelector('#iterative-chart');
const chart=new IterativeChart(figure);
const tooltip=figure.querySelector('#iterative-tooltip');
const point=id=>figure.querySelector(`[data-iterative-point='${id}']`);
assert.equal(figure.querySelectorAll('.iterative-point').length,14);
assert.equal(figure.querySelectorAll('.iterative-curve').length,0);
assert.equal(figure.querySelectorAll('.iterative-error').length,0);
assert.equal(figure.querySelectorAll('[data-iterative-series="mezo"] .iterative-point').length,2);
assert.equal(figure.querySelectorAll('[data-iterative-series="randopt"] .iterative-point').length,2);
assert.equal(figure.querySelector('.iterative-unreported'),null);
assert.deepEqual([...document.querySelectorAll('main > .section')].map(section=>section.id),['overview','population-scaling','results','iterative-baselines']);
assert.deepEqual([...document.querySelectorAll('.section-nav a')].map(link=>link.hash),['#overview','#population-scaling','#results','#iterative-baselines']);
for (const marker of figure.querySelectorAll('.iterative-point')) {
  assert.equal(marker.closest('[clip-path]'),null,'Points are not clipped during their reveal');
}
chart.motion.observer.emit(chart.motion.rows[0]);
assert.equal(chart.motion.rows[0].dataset.reveal,'playing');
assert.equal(chart.motion.rows[1].dataset.reveal,'waiting');
point('countdown-mn100').focus();
assert.equal(tooltip.hidden,false);
assert.match(tooltip.textContent,/38\.40 ± 2\.71%/);
assert.match(tooltip.textContent,/N=100 · K=25/);
assert.equal(point('countdown-mn100').getAttribute('aria-describedby'),'iterative-tooltip');
assert.equal(figure.querySelector('[data-iterative-series="es"]').style.opacity,'0.18');
point('gsm8k-es').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
assert.match(tooltip.textContent,/73\.11 ± 0\.52%/);
assert.match(tooltip.textContent,/N=3,000 · K=1/);
point('gsm8k-mn3000').dispatchEvent(new window.MouseEvent('pointerover',{bubbles:true,clientX:300,clientY:100}));
assert.match(tooltip.textContent,/74\.45 ± 0\.95%/);
assert.match(tooltip.textContent,/N=3,000 · K=25/);
point('gsm8k-mn_single').focus();
assert.match(tooltip.textContent,/64\.42 ± 0\.29%/);
assert.match(tooltip.textContent,/N=3,000 · K=1/);
point('countdown-mezo').focus();
assert.match(tooltip.textContent,/29\.22 ± 1\.93%/);
point('gsm8k-randopt3000').focus();
assert.match(tooltip.textContent,/69\.95 ± 1\.11%/);
document.body.dispatchEvent(new window.MouseEvent('pointerdown',{bubbles:true}));
assert.equal(tooltip.hidden,true);
const es=figure.querySelector('[data-iterative-method="es"]');
es.click();
assert.equal(es.getAttribute('aria-pressed'),'true');
assert.equal(figure.querySelector('[data-iterative-series="modular"]').style.opacity,'0.18');
assert.equal(figure.querySelector('[data-iterative-series="modular"]').style.pointerEvents,'none','Pinned methods can be inspected where points overlap');
es.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
assert.equal(es.getAttribute('aria-pressed'),'false');
assert.equal(figure.querySelector('[data-iterative-series="modular"]').style.opacity,'1');
assert.equal(figure.querySelector('[data-iterative-series="modular"]').style.pointerEvents,'');
chart.motion.replay.click();
assert.equal(chart.motion.rows[0].dataset.reveal,'playing');
document.dispatchEvent(new window.CustomEvent('research-motion-change',{detail:{playing:false}}));
assert.ok(chart.motion.rows.every(row=>row.dataset.reveal==='complete'));
chart.destroy();
dom.window.close();
console.log('Passed: 14 selected results, linear N axis, mean differences, missing-value handling, section order, no connecting lines or SD bars, static SVGs, point reveal, tooltip, legend, keyboard/tap, replay, and pause.');
