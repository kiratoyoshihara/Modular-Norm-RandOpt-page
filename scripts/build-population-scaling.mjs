import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { figure2Data, renderFigure2 } from '../assets/js/figure2-svg.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data = figure2Data(await readFile(resolve(root, 'assets/data/figure2.csv'), 'utf8'));
const svg = renderFigure2(data);
const mobileSvg = renderFigure2(data, 'figure2-mobile', { compact: true });
await writeFile(resolve(root, 'assets/figures/figure2.svg'), svg);
await writeFile(resolve(root, 'assets/figures/figure2-mobile.svg'), mobileSvg);
const fragment = `<section class="section figure2-section" id="population-scaling" aria-labelledby="population-title">
  <div class="section-intro">
    <h2 id="population-title">Stronger ensembles. From fewer candidates.</h2>
    <p class="figure2-model">Qwen2.5-1.5B-Instruct</p>
  </div>
  <figure class="figure2" id="figure2">
    <div class="figure2-toolbar"><button type="button" class="figure2-replay" data-figure2-replay aria-label="Replay the Figure 2 animation" hidden><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 5a5.3 5.3 0 1 1-.2 5M3 1.5V5h3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>Replay</button></div>
    <div class="figure2-scroll" role="region" aria-label="Population scaling: Countdown and GSM8K at K=10 and K=25">${svg}${mobileSvg}</div>
    <figcaption>Mean ± sample SD over 3 seeds. Each N uses a nested prefix of the same 300 candidates per run.<br>Candidate counts are equally spaced on the x-axis. Highlighted comparisons are differences in mean accuracy.</figcaption>
  </figure>
</section>`;
const htmlPath = resolve(root, 'index.html');
const html = await readFile(htmlPath, 'utf8');
const pattern = /<!-- figure2-section:start -->[\s\S]*?<!-- figure2-section:end -->/;
if (!pattern.test(html)) throw new Error('Missing Figure 2 section markers');
await writeFile(htmlPath, html.replace(pattern, `<!-- figure2-section:start -->\n${fragment}\n<!-- figure2-section:end -->`));
console.log('Rebuilt Figure 2: 40 means and sample SD bands from 120 seed counts.');
