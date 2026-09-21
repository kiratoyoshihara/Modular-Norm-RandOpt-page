import { escapeHTML as esc } from './radar-svg.js';

export const ITERATIVE_LAYOUT = { width: 540, height: 374, left: 52, top: 24, plotWidth: 458, plotHeight: 286, maxBudget: 700000 };
export function mainRunBudget(data, task, point) {
  const b = data.budget;
  if (point.method === 'modular' || point.method === 'modular_single') return b.trainingPrompts * point.n + point.k * task.testExamples;
  const search = b.trainingPrompts * b.iterativePerturbations;
  if (point.method === 'es') return search + task.testExamples;
  if (point.method === 'mezo' || point.method === 'zo') return search + b.developmentEvaluations + task.testExamples;
  throw new Error(`Unknown method: ${point.method}`);
}
export const iterativeX = (budget) => budget / ITERATIVE_LAYOUT.maxBudget * ITERATIVE_LAYOUT.plotWidth;
export const iterativeY = (value, domain) => (domain[1] - value) / (domain[1] - domain[0]) * ITERATIVE_LAYOUT.plotHeight;
const num = (n) => Number(n.toFixed(4));

export function iterativeMarker(method, x, y, r = 5) {
  const attrs = `stroke="${method.color}" stroke-width="1.8"`;
  if (method.marker === 'diamond') return `<path d="M${x} ${y-r-1}L${x+r+1} ${y}L${x} ${y+r+1}L${x-r-1} ${y}Z" fill="${method.color}" ${attrs}/>`;
  if (method.marker === 'triangle') return `<path d="M${x} ${y-r-2}L${x+r+1} ${y+r}H${x-r-1}Z" fill="${method.color}" ${attrs}/>`;
  if (method.marker === 'square') return `<rect x="${x-r}" y="${y-r}" width="${r*2}" height="${r*2}" fill="${method.color}" ${attrs}/>`;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${method.marker === 'open-circle' ? '#fff' : method.color}" ${attrs}/>`;
}

export function iterativeLegend(data) {
  return data.methods.map((method) => {
    const reported = data.tasks.some((task) => task.points.some((point) => point.method === method.id && point.mean != null));
    const icon = `<svg viewBox="0 0 32 20" width="32" height="20" aria-hidden="true">${method.id === 'modular' ? `<path d="M1 10H31" stroke="${method.color}" stroke-width="2.3"/>` : ''}${iterativeMarker(method,16,10,4)}</svg>`;
    return reported
      ? `<button type="button" data-iterative-method="${method.id}" aria-pressed="false" disabled style="--method-color:${method.color}">${icon}${esc(method.label)}</button>`
      : `<span class="iterative-unreported" style="--method-color:${method.color}">${icon}${esc(method.label)} <small>not reported</small></span>`;
  }).join('\n');
}

export function renderIterativePanel(data, task, { interactive = true } = {}) {
  const l = ITERATIVE_LAYOUT, id = `iterative-${task.id}`;
  const series = data.methods.map((method) => {
    const points = task.points.filter((p) => p.method === method.id && p.mean != null).map((p) => ({ ...p, budget: mainRunBudget(data,task,p) })).sort((a,b) => a.budget-b.budget);
    if (!points.length) return '';
    const line = method.id === 'modular' && points.length > 1 ? `<path class="iterative-curve" d="M${points.map((p) => `${num(iterativeX(p.budget))},${num(iterativeY(p.mean,task.domain))}`).join('L')}" fill="none" stroke="${method.color}" stroke-width="2.5" stroke-linejoin="round"/>` : '';
    const bars = points.map((p) => {
      const x = num(iterativeX(p.budget)), low = num(iterativeY(p.mean-p.sd,task.domain)), high = num(iterativeY(p.mean+p.sd,task.domain));
      return `<path class="iterative-error" d="M${x} ${high}V${low}M${x-4} ${high}H${x+4}M${x-4} ${low}H${x+4}" fill="none" stroke="${method.color}" stroke-width="1.2" opacity=".55"/>`;
    }).join('');
    const dots = points.map((p) => {
      const x = num(iterativeX(p.budget)), y = num(iterativeY(p.mean,task.domain));
      const label = `${method.label}, ${task.label}: ${p.mean.toFixed(2)} ± ${p.sd.toFixed(2)} percent; ${p.budget.toLocaleString('en-US')} main-run model-prompt evaluations; N=${p.n}, K=${p.k}.`;
      const attrs = interactive ? `role="button" tabindex="0" aria-label="${esc(label)}" aria-controls="iterative-tooltip" data-iterative-point="${task.id}-${p.id}" data-method="${method.id}" data-label="${esc(method.label)}" data-task="${task.label}" data-mean="${p.mean}" data-sd="${p.sd}" data-budget="${p.budget}" data-n="${p.n}" data-k="${p.k}" style="--method-color:${method.color}"` : '';
      return `<g class="iterative-point" ${attrs}><title>${esc(label)}</title>${interactive ? `<circle class="iterative-hit" cx="${x}" cy="${y}" r="9" fill="transparent"/>` : ''}${iterativeMarker(method,x,y)}</g>`;
    }).join('');
    return `<g class="iterative-series" data-iterative-series="${method.id}">${line}${bars}${dots}</g>`;
  }).join('');
  const grids = task.ticks.map((tick) => {
    const y = num(iterativeY(tick,task.domain));
    return `<path d="M0 ${y}H${l.plotWidth}" fill="none" stroke="#e5e7eb"/><text x="-13" y="${y+4}" text-anchor="end">${tick}%</text>`;
  }).join('');
  const ticks = [0,200000,400000,600000].map((tick) => `<text x="${num(iterativeX(tick))}" y="${l.plotHeight+26}" text-anchor="middle">${tick === 0 ? '0' : `${tick/1000}k`}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${l.width} ${l.height}" class="iterative-svg" role="${interactive ? 'group' : 'img'}" aria-labelledby="${id}-title ${id}-desc">
    <title id="${id}-title">${task.label}: accuracy versus main-run evaluation budget</title>
    <desc id="${id}-desc">${task.testExamples} test examples. Means and sample standard deviations over three seeds. MN RandOpt K=25 has three measured settings connected as a visual guide. Iterative methods and the MN K=1 control return single models. Unreported scores are omitted, not plotted as zero.</desc>
    <style>.iterative-svg{font-family:Inter,Arial,Helvetica,sans-serif;background:#fff}.iterative-axes text{font-size:12px;fill:#7b818b}.iterative-point[role=button]{cursor:pointer}.iterative-point:focus{outline:none}.iterative-point:focus .iterative-hit{stroke:#303030;stroke-width:1}.iterative-series{transition:opacity .15s ease}</style>
    <defs><clipPath id="${id}-reveal"><rect class="f2-sweep" x="-12" y="-12" width="482" height="310" style="transform-origin:-12px 0px"/></clipPath></defs>
    <g class="figure2-row" data-row="${task.id}" transform="translate(${l.left} ${l.top})"><g class="f2-panel" style="--panel-delay:0ms"><g class="f2-axes iterative-axes">${grids}<path d="M0 ${l.plotHeight}H${l.plotWidth}" fill="none" stroke="#d0d3d8"/>${ticks}</g><g class="f2-data" clip-path="url(#${id}-reveal)">${series}</g></g></g>
  </svg>`;
}
