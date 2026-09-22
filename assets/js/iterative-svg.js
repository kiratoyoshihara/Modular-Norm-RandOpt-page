import { escapeHTML as esc } from './radar-svg.js';

export const ITERATIVE_LAYOUT = { width: 540, height: 420, left: 80, top: 76, plotWidth: 430, plotHeight: 286, maxEvaluations: 680000 };
export const iterativeX = (evaluations) => evaluations / ITERATIVE_LAYOUT.maxEvaluations * ITERATIVE_LAYOUT.plotWidth;
export const iterativeY = (value, domain) => (domain[1] - value) / (domain[1] - domain[0]) * ITERATIVE_LAYOUT.plotHeight;
const num = (n) => Number(n.toFixed(4));

// Appendix D.2: N counts candidate/perturbation evaluations on 200 prompts.
// MeZO and ZO-Finetuner also select a checkpoint from 16 development evaluations.
export function iterativeEvaluationBudget(data, task, point) {
  const protocol = data.evaluationProtocol;
  const search = protocol.searchPrompts * point.n;
  const development = protocol.checkpointSelection;
  const checkpointSelection = development.methods.includes(point.method) ? development.prompts * development.checkpoints : 0;
  const finalTest = point.k * task.testExamples;
  return { search, checkpointSelection, finalTest, total: search + checkpointSelection + finalTest };
}

export function iterativeComparison(data, task) {
  const ours = task.points.find((point) => point.method === 'modular' && point.n === 100 && point.k === 25 && point.mean != null);
  const baseline = task.points.find((point) => point.method === 'es' && point.mean != null);
  if (!ours || !baseline) return null;
  const oursEvaluations = iterativeEvaluationBudget(data, task, ours).total;
  const baselineEvaluations = iterativeEvaluationBudget(data, task, baseline).total;
  return { ours, baseline, oursEvaluations, baselineEvaluations, ratio: baselineEvaluations / oursEvaluations, difference: ours.mean - baseline.mean };
}

export function iterativeMarker(method, x, y, r = 5) {
  const attrs = `class="iterative-marker" stroke="${method.color}" stroke-width="1.8"`;
  if (method.marker === 'star' || method.marker === 'open-star') {
    const points = Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + index * Math.PI / 5;
      const radius = index % 2 ? (r + 2) * .44 : r + 2;
      return `${num(x + Math.cos(angle) * radius)},${num(y + Math.sin(angle) * radius)}`;
    }).join(' ');
    return `<polygon points="${points}" fill="${method.marker === 'open-star' ? '#fff' : method.color}" ${attrs}/>`;
  }
  if (method.marker === 'diamond') return `<path d="M${x} ${y-r-1}L${x+r+1} ${y}L${x} ${y+r+1}L${x-r-1} ${y}Z" fill="${method.color}" ${attrs}/>`;
  if (method.marker === 'triangle') return `<path d="M${x} ${y-r-2}L${x+r+1} ${y+r}H${x-r-1}Z" fill="${method.color}" ${attrs}/>`;
  if (method.marker === 'square') return `<rect x="${x-r}" y="${y-r}" width="${r*2}" height="${r*2}" fill="${method.color}" ${attrs}/>`;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${method.marker === 'open-circle' ? '#fff' : method.color}" ${attrs}/>`;
}

export function iterativeLegend(data) {
  return data.methods.map((method) => {
    const reported = data.tasks.some((task) => task.points.some((point) => point.method === method.id && point.mean != null));
    const icon = `<svg viewBox="0 0 32 20" width="32" height="20" aria-hidden="true">${iterativeMarker(method,16,10,4)}</svg>`;
    return reported
      ? `<button type="button" data-iterative-method="${method.id}" aria-pressed="false" disabled style="--method-color:${method.color}">${icon}${esc(method.label)}</button>`
      : `<span class="iterative-unreported" style="--method-color:${method.color}">${icon}${esc(method.label)} <small>not reported</small></span>`;
  }).join('\n');
}

export function renderIterativePanel(data, task, { interactive = true } = {}) {
  const l = ITERATIVE_LAYOUT, id = `iterative-${task.id}`;
  const series = [...data.methods].reverse().map((method) => {
    const points = task.points.filter((p) => p.method === method.id && p.mean != null)
      .map(point => ({ ...point, budget: iterativeEvaluationBudget(data, task, point) }))
      .sort((a,b) => a.budget.total-b.budget.total);
    if (!points.length) return '';
    const dots = points.map((p) => {
      const x = num(iterativeX(p.budget.total)), y = num(iterativeY(p.mean,task.domain));
      const label = `${method.label}, ${task.label}: ${p.mean.toFixed(2)} ± ${p.sd.toFixed(2)} percent; ${p.budget.total.toLocaleString('en-US')} total model–prompt evaluations; N=${p.n}, K=${p.k}.`;
      const attrs = interactive ? `role="button" tabindex="0" aria-label="${esc(label)}" aria-controls="iterative-tooltip" data-iterative-point="${task.id}-${p.id}" data-method="${method.id}" data-label="${esc(method.label)}" data-task="${task.label}" data-mean="${p.mean}" data-sd="${p.sd}" data-n="${p.n}" data-k="${p.k}" data-evaluations="${p.budget.total}" data-search-evaluations="${p.budget.search}" data-checkpoint-evaluations="${p.budget.checkpointSelection}" data-test-evaluations="${p.budget.finalTest}" style="--method-color:${method.color}"` : '';
      return `<g class="iterative-point f2-point" ${attrs}>${interactive ? `<circle class="iterative-hit" cx="${x}" cy="${y}" r="9" fill="transparent"/>` : `<title>${esc(label)}</title>`}${iterativeMarker(method,x,y)}</g>`;
    }).join('');
    return `<g class="iterative-series" data-iterative-series="${method.id}">${dots}</g>`;
  }).join('');
  const grids = task.ticks.map((tick) => {
    const y = num(iterativeY(tick,task.domain));
    return `<path d="M0 ${y}H${l.plotWidth}" fill="none" stroke="#e5e7eb"/><text x="-13" y="${y+4}" text-anchor="end">${tick}%</text>`;
  }).join('');
  const ticks = [0,200000,400000,600000].map((tick) => `<path d="M${num(iterativeX(tick))} ${l.plotHeight}v5" stroke="#d0d3d8"/><text x="${num(iterativeX(tick))}" y="${l.plotHeight+26}" text-anchor="middle">${tick ? `${tick / 1000}k` : '0'}</text>`).join('');
  const comparison = iterativeComparison(data, task);
  const emphasis = comparison ? `<g class="f2-emphasis" pointer-events="none"><text class="iterative-callout" x="0" y="-50">${comparison.ours.mean.toFixed(2)}% at ${comparison.oursEvaluations.toLocaleString('en-US')} evals</text><text class="iterative-comparison" x="0" y="-28">${comparison.ratio.toFixed(2)}× fewer evals vs ES-at-Scale · ${comparison.difference >= 0 ? '+' : '−'}${Math.abs(comparison.difference).toFixed(2)} pp</text>${task.points.filter((p) => p.method === 'modular' && p.n <= 100 && p.mean != null).map((p) => `<text class="iterative-small-n" x="${num(iterativeX(iterativeEvaluationBudget(data, task, p).total) + 17)}" y="${num(iterativeY(p.mean,task.domain) + (p.n === 25 ? 22 : -12))}">N=${p.n}</text>`).join('')}<circle cx="${num(iterativeX(comparison.oursEvaluations))}" cy="${num(iterativeY(comparison.ours.mean,task.domain))}" r="11" fill="none" stroke="#306FAD" stroke-width="1"/></g>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${l.width} ${l.height}" class="iterative-svg" role="${interactive ? 'group' : 'img'}" aria-label="${task.label}: accuracy versus total model–prompt evaluations" aria-describedby="${id}-desc">
    <desc id="${id}-desc">${task.testExamples} test examples. Points show mean accuracy over three seeds. The horizontal axis is linear in total model–prompt evaluations: one model generating and scoring one prompt. Main-run totals include search, checkpoint selection, and final evaluation, following Appendix D.2. MN-RandOpt is shown at N=100, K=25; N=3000, K=25; and N=3000, K=1. Iterative methods and the MN K=1 control return single models. Missing scores are omitted, not plotted as zero.</desc>
    <style>.iterative-svg{font-family:Inter,Arial,Helvetica,sans-serif;background:#fff}.iterative-axes text{font-size:12px;fill:#7b818b}.iterative-callout{font-size:18px;font-weight:600;fill:#306FAD}.iterative-comparison{font-size:11.8px;fill:#687383}.iterative-small-n{font-size:12px;fill:#306FAD;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}.iterative-point[role=button]{cursor:pointer}.iterative-point:focus{outline:none}.iterative-point:focus .iterative-hit{stroke:#303030;stroke-width:1}.iterative-series{transition:opacity .15s ease}</style>
    <g class="figure2-row" data-row="${task.id}" transform="translate(${l.left} ${l.top})"><g class="f2-panel" style="--panel-delay:0ms">
      <g class="f2-axes iterative-axes"><text class="iterative-y-label" x="-58" y="${l.plotHeight/2}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 -58 ${l.plotHeight/2})">Accuracy (%)</text>${grids}<path d="M0 0V${l.plotHeight}H${l.plotWidth}" fill="none" stroke="#d0d3d8"/>${ticks}</g><g class="f2-data">${series}</g>${emphasis}
    </g></g>
  </svg>`;
}
