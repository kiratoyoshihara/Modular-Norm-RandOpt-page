// Figure 2 is reconstructed from seed-level counts, not the paper image.
export const FIGURE2 = {
  width: 1120, height: 728,
  populations: [25, 50, 100, 200, 300],
  methods: [
    { id: 'randopt', name: 'RandOpt', color: '#C76526' },
    { id: 'modular', name: 'Modular Norm RandOpt', color: '#306FAD' },
  ],
  tasks: [
    { id: 'countdown', name: 'Countdown', domain: [25, 42], ticks: [25, 30, 35, 40], examples: 500, selectedN: 100, saving: '3×' },
    { id: 'gsm8k', name: 'GSM8K', domain: [64, 75], ticks: [64, 66, 68, 70, 72, 74], examples: 1319, selectedN: 25, saving: '≥12×' },
  ],
};

export function figure2Data(csv) {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const keys = header.split(',');
  return lines.map((line) => {
    const row = Object.fromEntries(line.split(',').map((value, i) => [keys[i], value]));
    const correct = [42, 43, 44].map((seed) => Number(row[`correct_seed_${seed}`]));
    const examples = Number(row.evaluation_examples);
    if (!correct.every((n) => Number.isInteger(n) && n >= 0 && n <= examples) || examples <= 0) throw new Error('Invalid Figure 2 seed counts');
    const accuracy = correct.map((n) => 100 * n / examples);
    const mean = accuracy.reduce((sum, n) => sum + n, 0) / accuracy.length;
    const sd = Math.sqrt(accuracy.reduce((sum, n) => sum + (n - mean) ** 2, 0) / (accuracy.length - 1));
    const method = FIGURE2.methods.find((entry) => entry.name === row.method)?.id;
    if (!method) throw new Error(`Unknown Figure 2 method: ${row.method}`);
    return { task: row.task, k: Number(row.K), n: Number(row.N), method, examples, correct, mean, sd, lower: mean - sd, upper: mean + sd };
  });
}

export function figure2Panel(taskIndex, column, compact = false) {
  if (compact) return { x: 64, y: 160 + (taskIndex * 2 + column) * 370, width: 308, height: 190 };
  return { x: column === 0 ? 82 : 640, y: taskIndex === 0 ? 122 : 440, width: 448, height: 220 };
}

const number = (n) => Number(n.toFixed(4));
export const figure2X = (n, width = 448) => {
  const index = FIGURE2.populations.indexOf(n);
  if (index < 0) throw new Error(`Unknown candidate population: ${n}`);
  return width * index / (FIGURE2.populations.length - 1);
};
export const figure2Y = (value, domain, height = 220) => height * (1 - (value - domain[0]) / (domain[1] - domain[0]));
const path = (points, close = false) => `M${points.map(([x, y]) => `${number(x)},${number(y)}`).join('L')}${close ? 'Z' : ''}`;
const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function marker(method, x, y, outer = false) {
  const attrs = `stroke="${method.color}" stroke-width="${outer ? 1.25 : 1.8}"`;
  if (method.id === 'modular') return `<circle cx="${number(x)}" cy="${number(y)}" r="${outer ? 7.5 : 3.9}" fill="${outer ? 'none' : method.color}" ${attrs}/>`;
  const size = outer ? 14.5 : 7;
  return `<rect x="${number(x - size / 2)}" y="${number(y - size / 2)}" width="${size}" height="${size}" fill="${outer ? 'none' : '#ffffff'}" ${attrs}/>`;
}

function panelSVG(data, task, taskIndex, column, prefix, compact = false) {
  const k = [10, 25][column];
  const panel = figure2Panel(taskIndex, column, compact);
  const xAt = n => figure2X(n, panel.width);
  const yAt = value => figure2Y(value, task.domain, panel.height);
  const key = `${task.id}-${k}`;
  const rows = data.filter((row) => row.task === task.id && row.k === k);
  const series = FIGURE2.methods.map((method) => {
    const values = FIGURE2.populations.map((n) => {
      const found = rows.filter((row) => row.method === method.id && row.n === n);
      if (found.length !== 1) throw new Error(`Missing or duplicate Figure 2 point: ${key}/${method.id}/${n}`);
      return found[0];
    });
    const points = values.map((value) => [xAt(value.n), yAt(value.mean)]);
    const band = [
      ...values.map((value) => [xAt(value.n), yAt(value.upper)]),
      ...values.toReversed().map((value) => [xAt(value.n), yAt(value.lower)]),
    ];
    return { method, values, points, band };
  });
  const baseline = rows.find((row) => row.method === 'randopt' && row.n === 300);
  const modular = rows.find((row) => row.method === 'modular' && row.n === task.selectedN);
  const difference = (modular.mean - baseline.mean).toFixed(2);
  const ticks = task.ticks.map((tick) => {
    const y = number(yAt(tick));
    return `<path d="M0 ${y}H${panel.width}" class="f2-grid"/>${compact || column === 0 ? `<text x="-13" y="${y + 4.5}" text-anchor="end" class="f2-tick">${tick}</text>` : ''}`;
  }).join('');
  const xTicks = FIGURE2.populations.map((n) => {
    const x = xAt(n);
    return `<path d="M${x} ${panel.height}v5" class="f2-axis"/><text x="${x}" y="${panel.height + 23}" text-anchor="middle" class="f2-tick">${n}</text>`;
  }).join('');
  const title = `${task.name} · K=${k}`;
  const note = `${compact ? 'MN' : 'Modular Norm RandOpt'} N=${task.selectedN} vs RandOpt N=300 · +${difference} pt`;
  return `<g class="f2-panel" data-panel="${key}" transform="translate(${panel.x} ${panel.y})" style="--panel-delay:${compact ? 0 : column * 160}ms">
    <title>${title}. ${task.saving} fewer candidates; mean accuracy difference +${difference} percentage points.</title>
    <defs><clipPath id="${prefix}-${key}-reveal" clipPathUnits="userSpaceOnUse"><rect class="f2-sweep" x="-12" y="-12" width="${panel.width + 24}" height="${panel.height + 24}" style="transform-origin:-12px 0px"/></clipPath></defs>
    <g class="f2-axes"><text x="0" y="${compact ? -70 : -47}" class="f2-panel-title">${title}</text>${ticks}<path d="M0 0V${panel.height}H${panel.width}" class="f2-axis"/>${xTicks}${compact ? `<text x="-44" y="${panel.height / 2}" text-anchor="middle" transform="rotate(-90 -44 ${panel.height / 2})" class="f2-label">Accuracy (%)</text><text x="${panel.width / 2}" y="${panel.height + 52}" text-anchor="middle" class="f2-label">Candidate population N</text>` : ''}</g>
    <g class="f2-data">
      <g class="f2-bands" clip-path="url(#${prefix}-${key}-reveal)">${series.map(({ method, band }) => `<path class="f2-band" data-method="${method.id}" d="${path(band, true)}" fill="${method.color}" fill-opacity=".09"/>`).join('')}</g>
      ${series.map(({ method, values, points }) => `<g class="f2-series" data-method="${method.id}"><path class="f2-curve" clip-path="url(#${prefix}-${key}-reveal)" d="${path(points)}" stroke="${method.color}" ${method.id === 'randopt' ? 'stroke-dasharray="7 4"' : ''}/>${points.map(([x,y], i) => `<g class="f2-point" data-n="${values[i].n}"><title>${esc(method.name)}: ${values[i].mean.toFixed(2)} ± ${values[i].sd.toFixed(2)}% at N=${values[i].n}</title>${marker(method, x, y)}</g>`).join('')}</g>`).join('')}
    </g>
    <g class="f2-emphasis">
      <text x="${compact ? 0 : panel.width}" y="${compact ? -44 : -47}" text-anchor="${compact ? 'start' : 'end'}" class="f2-saving">${task.saving} fewer candidates</text>
      <text x="${compact ? 0 : panel.width}" y="-24" text-anchor="${compact ? 'start' : 'end'}" class="f2-note">${esc(note)}</text>
      ${marker(FIGURE2.methods[0], xAt(300), yAt(baseline.mean), true)}
      ${marker(FIGURE2.methods[1], xAt(task.selectedN), yAt(modular.mean), true)}
    </g>
  </g>`;
}

export function renderFigure2(data, id = 'figure2', { compact = false } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${compact ? '400 1532' : `${FIGURE2.width} ${FIGURE2.height}`}" class="figure2-svg figure2-svg-${compact ? 'mobile' : 'desktop'}" role="img" aria-labelledby="${id}-title ${id}-description">
  <title id="${id}-title">Population scaling on Countdown and GSM8K</title>
  <desc id="${id}-description">Qwen2.5-1.5B-Instruct. ${compact ? 'Four panels in one column: Countdown K=10, Countdown K=25, GSM8K K=10, GSM8K K=25.' : 'Four panels: Countdown above GSM8K; K=10 on the left and K=25 on the right.'} Population sizes 25, 50, 100, 200, 300 are equally spaced categories. Curves show means; shaded bands show one sample standard deviation across seeds 42, 43, 44. Modular Norm RandOpt at N=100 exceeds RandOpt at N=300 on Countdown by 1.53 and 0.93 percentage points; at N=25 it exceeds RandOpt at N=300 on GSM8K by 2.60 and 3.11 points. These are comparisons of means, not statistical significance claims. Populations are nested prefixes of the same 300 candidates per run.</desc>
  <style>
    .figure2-svg{font-family:Inter,Arial,Helvetica,sans-serif;background:#fff}
    .f2-axis{fill:none;stroke:#8d96a1;stroke-width:1}
    .f2-grid{fill:none;stroke:#e1e6ed;stroke-width:1}
    .f2-tick{font-size:13px;fill:#687383;font-variant-numeric:tabular-nums}
    .f2-panel-title{font-size:17px;font-weight:600;fill:#272d35}
    .f2-saving{font-size:17px;font-weight:600;fill:#306FAD}
    .f2-note{font-size:11.6px;fill:#687383}
    .f2-label{font-size:17px;font-weight:550;fill:#272d35}
    .f2-curve{fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
    .f2-legend{font-size:14px;font-weight:550}
    .figure2-svg-mobile .f2-tick{font-size:15px}
    .figure2-svg-mobile .f2-panel-title{font-size:20px}
    .figure2-svg-mobile .f2-saving{font-size:18px}
    .figure2-svg-mobile .f2-note{font-size:13px}
    .figure2-svg-mobile .f2-label{font-size:15px}
    .figure2-svg-mobile .f2-legend{font-size:17px}
  </style>
  <g class="f2-legend" transform="translate(${compact ? '60 22' : '360 26'})"><path d="M0 0H30" stroke="#C76526" stroke-width="2.4" stroke-dasharray="7 4"/>${marker(FIGURE2.methods[0],15,0)}<text x="42" y="4.5" fill="#C76526">RandOpt</text><g transform="translate(${compact ? '0 29' : '150 0'})"><path d="M0 0H30" stroke="#306FAD" stroke-width="2.4"/>${marker(FIGURE2.methods[1],15,0)}<text x="42" y="4.5" fill="#306FAD">Modular Norm RandOpt</text></g></g>
${compact ? '' : '  <text x="19" y="384" class="f2-label" text-anchor="middle" transform="rotate(-90 19 384)">Ensemble accuracy (%)</text>'}
  ${FIGURE2.tasks.map((task, row) => compact
    ? [0,1].map(column => `<g class="figure2-row" data-row="${task.id}-${[10,25][column]}">${panelSVG(data,task,row,column,id,true)}</g>`).join('')
    : `<g class="figure2-row" data-row="${task.id}">${[0,1].map(column => panelSVG(data,task,row,column,id)).join('')}</g>`).join('\n')}
${compact ? '' : '  <text x="584" y="719" text-anchor="middle" class="f2-label">Candidate population size N</text>'}
</svg>`;
}
