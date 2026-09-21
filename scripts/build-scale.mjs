import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import katex from 'katex';
import { sampleDiagram, normDiagram, normalizeDiagram, allocationDiagram, voteDiagram } from '../assets/js/scale-diagrams.js';
import { ALGORITHM_TARGETS } from '../assets/js/scale-timing.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const math = (tex, display = false) => katex.renderToString(tex, {
  displayMode: display, output: 'htmlAndMathml', throwOnError: true, strict: 'error', trust: false,
});
const lines = [
  ['require', String.raw`s_p=\frac{m_{\mathcal M}}{m_p}\,\rho_p`, 'scale-algorithm-require'],
  ['1', String.raw`\text{for }i=1,\ldots,N`, 'scale-algorithm-loop'],
  ['2', String.raw`Z_{i,p}\sim\mathcal N(0,I)`],
  ['3', String.raw`n_{i,p}\gets\lVert Z_{i,p}\rVert_{M_p}`],
  ['4', String.raw`\Delta\theta_{i,p}\gets\frac{R}{s_p}\,\frac{Z_{i,p}}{n_{i,p}}`],
  ['5', String.raw`\theta'_i\gets\theta+\Delta\theta_i`],
  ['6', String.raw`\mathrm{score}_i\gets\operatorname{Evaluate}(\theta'_i,D_{\mathrm{sel}})`],
  ['7', String.raw`\text{end for}`, 'scale-algorithm-loop'],
  ['8', String.raw`I_{\mathrm{top}}\gets\operatorname{TopK}(\{\mathrm{score}_i\},K)`],
  ['9', String.raw`\text{for test input }x`, 'scale-algorithm-loop'],
  ['10', String.raw`A(x)\gets\{\operatorname{Generate}(\theta'_i,x)\}_{i\in I_{\mathrm{top}}}`, 'scale-algorithm-long'],
  ['11', String.raw`\hat y(x)\gets\operatorname{PluralityVote}(A(x))`],
  ['12', String.raw`\text{end for}`, 'scale-algorithm-loop'],
  ['13', String.raw`\text{return }\hat y`, 'scale-algorithm-loop'],
];
const steps = [
  {
    name: 'Allocate', title: 'Where the tensor scales come from.',
    text: 'Computed once, then shared by every candidate.',
    diagram: allocationDiagram(math),
  },
  {
    name: 'Sample', title: 'Independent noise, every time.',
    text: 'Draw fresh Gaussian noise for each candidate and each tensor. Every candidate starts from the same pretrained weights.',
    diagram: sampleDiagram(),
  },
  {
    name: 'Measure', title: 'Measure what the tensor does.',
    text: 'Match the norm to the tensor’s role: the strongest linear direction, the largest embedding row, or the largest coordinate.',
    diagram: normDiagram(math),
  },
  {
    name: 'Scale', title: 'Normalize the direction. Set its size.',
    text: 'Normalize to unit natural norm, then set the size to R/sₚ. The direction is preserved; the scale follows the architecture.',
    diagram: normalizeDiagram()+`<div class="scale-randopt-comparison"><span>RandOpt</span>${math(String.raw`\Delta\theta_{i,p}=\sigma Z_{i,p}`)}<small>One coefficient across tensors.</small></div>`,
  },
  {
    name: 'Unchanged', title: 'Keep the same selection and voting.',
    text: 'Evaluate N candidates, keep the top K, and combine their answers by plurality voting. Only the perturbation geometry changes.',
    diagram: voteDiagram(),
  },
];
const algorithm = `<aside class="scale-algorithm" aria-labelledby="scale-algorithm-title">
  <h3 id="scale-algorithm-title">Modular Norm RandOpt</h3>
  <p class="scale-inputs">Inputs ${math(String.raw`\theta,\ D_{\mathrm{sel}},\ N,\ K,\ R`)}</p>
  <div class="scale-algorithm-code">${Array.from({ length: 2 }, () => '<div class="scale-algorithm-marker" aria-hidden="true" hidden></div>').join('')}<ol>${lines.map(([line, tex, className = '']) => {
    const target = ALGORITHM_TARGETS[line];
    const id = steps.findIndex(step => step.name.toLowerCase() === target.kind) + 1;
    return `<li class="scale-algorithm-line ${className}" data-algorithm-line="${line}"><span class="scale-line-number">${line === 'require' ? '' : line}</span><div>${line === 'require' ? '<small>Fix before search</small>' : ''}${math(tex)}</div><a class="scale-algorithm-link" href="#scale-scene-${id}" data-scale-target="${target.kind}" data-scale-at="${target.at}" aria-label="${target.label}"></a></li>`;
  }).join('')}</ol></div>
</aside>`;
const cues = [[0, 2], [2, 1], [3, 1], [4, 1], [5, 1]];
const section = `<section class="section scale-section" id="scale" aria-labelledby="scale-title">
  <div class="section-intro"><h2 id="scale-title">Scale each tensor in its own geometry.</h2><p>RandOpt uses one noise scale across tensors. Modular Norm RandOpt gives each tensor its own size, measured in its own norm.</p></div>
  <div class="scale-track"><div class="scale-sticky">
    <nav class="scale-progress" aria-label="Explore the scale algorithm" hidden>${steps.map((step, i) => `<button type="button" data-scale-step="${i + 1}" aria-controls="scale-scene-${i + 1}" aria-pressed="false"><span>0${i + 1}</span>${step.name}</button>`).join('')}</nav>
    <div class="scale-workspace">${algorithm}<div class="scale-scenes">${steps.map((step, i) => `
      <article class="scale-scene" id="scale-scene-${i + 1}" data-step="${i + 1}" data-kind="${step.name.toLowerCase()}" aria-labelledby="scale-step-${i + 1}">
        <div class="scale-scene-toolbar"><h3 id="scale-step-${i + 1}"><span>0${i + 1}</span>${step.name}</h3><div class="scale-playback" hidden><button type="button" data-scale-toggle aria-label="Pause the ${step.name} animation">Pause</button><button type="button" data-scale-replay aria-label="Replay the ${step.name} animation">↺ Replay</button></div></div>
        <h4>${step.title}</h4><p class="scale-copy">${step.text}</p><div class="scale-concept">${step.diagram}</div>
      </article>`).join('')}</div></div>
  </div><div class="scale-cues" aria-hidden="true">${cues.map(([offset, length], i) => `<div class="scale-cue" data-cue-step="${i + 1}" style="--cue-index:${offset};--cue-length:${length}"></div>`).join('')}</div></div>
</section>`;

// Pre-render math and serve its styles/fonts locally, including in the no-JS view.
const vendor = resolve(root, 'assets/vendor/katex');
const distribution = resolve(root, 'node_modules/katex/dist');
await mkdir(resolve(vendor, 'fonts'), { recursive: true });
const css = (await readFile(resolve(distribution, 'katex.min.css'), 'utf8'))
  .replace(/,url\([^)]*\.(?:woff|ttf)\) format\("[^"]+"\)/g, '');
await writeFile(resolve(vendor, 'katex.min.css'), css);
await copyFile(resolve(root, 'node_modules/katex/LICENSE'), resolve(vendor, 'LICENSE'));
for (const font of await readdir(resolve(distribution, 'fonts'))) {
  if (font.endsWith('.woff2')) await copyFile(resolve(distribution, 'fonts', font), resolve(vendor, 'fonts', font));
}
const path = resolve(root, 'index.html');
const html = await readFile(path, 'utf8');
const marker = /<!-- scale-section:start -->[\s\S]*?<!-- scale-section:end -->/;
if (!marker.test(html)) throw new Error('Missing Scale section markers.');
await writeFile(path, html.replace(marker, `<!-- scale-section:start -->\n${section.replace(/ +$/gm, '')}\n<!-- scale-section:end -->`));
console.log('Built the complete algorithm, norm formulas, and five replayable illustrations.');
