import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderIterativePanel, iterativeLegend } from '../assets/js/iterative-svg.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(await readFile(resolve(root,'assets/data/iterative-baselines.json'),'utf8'));
for (const task of data.tasks) await writeFile(resolve(root,`assets/figures/iterative-${task.id}.svg`),renderIterativePanel(data,task,{interactive:false}));
const missing = data.methods.filter((method) => !data.tasks.some((task) => task.points.some((p) => p.method === method.id && p.mean != null))).map((method) => method.label);
const fragment = `<section class="section iterative-section" id="iterative-baselines" aria-labelledby="iterative-title">
  <div class="section-intro"><h2 id="iterative-title">Comparison with iterative baselines</h2><p class="iterative-model">Qwen2.5-1.5B-Instruct</p></div>
  <figure class="figure2 iterative-chart" id="iterative-chart">
    <div class="iterative-legend" aria-label="Methods">${iterativeLegend(data)}</div>
    <div class="figure2-toolbar"><button class="figure2-replay" type="button" data-figure2-replay aria-label="Replay the iterative baseline comparison" hidden>↺ Replay</button></div>
    <div class="iterative-grid">${data.tasks.map((task)=>`<div class="iterative-panel"><h3>${task.label}</h3><p>${task.testExamples.toLocaleString('en-US')} test examples</p>${renderIterativePanel(data,task)}</div>`).join('')}</div>
    <p class="iterative-axis-label">Number of candidates / perturbations, N</p>
    <div class="iterative-tooltip" id="iterative-tooltip" role="tooltip" hidden></div>
    <figcaption>Points show mean accuracy over 3 seeds. Iterative baselines use K=1.<br>N counts sampled candidates for RandOpt methods and perturbations for iterative baselines.${missing.length ? ` ${missing.join(', ')} accuracy is not reported.` : ''}</figcaption>
  </figure>
</section>`;
const htmlPath=resolve(root,'index.html');
const html=await readFile(htmlPath,'utf8');
const pattern=/<!-- iterative-section:start -->[\s\S]*?<!-- iterative-section:end -->/;
if(!pattern.test(html)) throw new Error('Missing iterative comparison section markers');
await writeFile(htmlPath,html.replace(pattern,`<!-- iterative-section:start -->\n${fragment}\n<!-- iterative-section:end -->`));
console.log('Rebuilt accuracy versus N from the supplied iterative comparison results.');
