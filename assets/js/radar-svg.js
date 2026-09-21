export const DEFAULT_SCALE = '1.5B';

export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export function radarLayout(compact = false) {
  return compact
    ? { width: 440, height: 355, cx: 220, cy: 170, radius: 111, labelRadius: 137, compact }
    : { width: 860, height: 545, cx: 430, cy: 278, radius: 198, labelRadius: 247, compact };
}

export function taskRanges(data) {
  return data.tasks.map(() => [0, 100]);
}

export function relativeValue(value, range) {
  return value === null ? null : (value - range[0]) / (range[1] - range[0]) * 100;
}

const rangeLabel = (range) => `${Number(range[0].toFixed(2))}–${Number(range[1].toFixed(2))}%`;

export function radarPoint(index, value, count, layout) {
  const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
  const radius = layout.radius * value / 100;
  return [layout.cx + Math.cos(angle) * radius, layout.cy + Math.sin(angle) * radius];
}

// A missing measurement breaks the line; it is never plotted as zero.
export function seriesGeometry(values, layout) {
  const points = values.map((value, index) => value === null ? null : radarPoint(index, value, values.length, layout));
  if (points.every(Boolean)) {
    return { fill: points.map((point) => point.join(',')).join(' '), line: `M${points.map((point) => point.join(',')).join('L')}Z`, points };
  }
  const gap = points.findIndex((point) => point === null);
  let line = '';
  let connected = false;
  for (let step = 1; step <= points.length; step += 1) {
    const point = points[(gap + step) % points.length];
    if (point) {
      line += `${connected ? 'L' : 'M'}${point.join(',')}`;
      connected = true;
    } else connected = false;
  }
  return { fill: null, line, points };
}

export function formatScore(score) {
  return score?.mean == null ? 'N/A' : `${score.mean.toFixed(2)} ± ${score.sd.toFixed(2)}`;
}

export function formatDifference(value) {
  if (value === null) return 'N/A';
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(2)} pp`;
}

export function renderLegend(data) {
  return data.methods.map((method) => `<button type="button" data-method="${escapeHTML(method.id)}" aria-pressed="false" disabled style="--series-color:${method.color}"><svg class="legend-key" viewBox="0 0 30 16" width="30" height="16" aria-hidden="true"><path d="M1 8H29" fill="none" stroke="currentColor" stroke-width="2" ${method.dash ? `stroke-dasharray="${method.dash}"` : ''}/><circle cx="15" cy="8" r="3.2" fill="${method.id === 'modular' ? 'currentColor' : '#fff'}" stroke="currentColor" stroke-width="1.6"/></svg>${escapeHTML(method.name)}${method.id === 'modular' ? '<span class="ours-tag">Ours</span>' : ''}</button>`).join('\n');
}

export function renderRadar(data, scale = DEFAULT_SCALE, { compact = false, interactive = false, id = 'radar' } = {}) {
  const layout = radarLayout(compact);
  const count = data.tasks.length;
  const scores = data.scales[scale].scores;
  const ranges = taskRanges(data, scale);
  const pointString = (value) => data.tasks.map((_, index) => radarPoint(index, value, count, layout).join(',')).join(' ');
  const levels = [20, 40, 60, 80, 100];
  const grids = levels.map((level) => `<g class="radar-grid" data-level="${level}"><polygon class="radar-grid-line" points="${pointString(level)}" fill="none" stroke="#dedede" stroke-width="1" stroke-dasharray="3 4" pointer-events="none"/>${interactive ? `<polygon class="radar-grid-hit" points="${pointString(level)}" fill="none" stroke="transparent" stroke-width="12" pointer-events="stroke" aria-hidden="true"/>` : ''}</g>`).join('');
  const guides = `<g class="radar-guides" visibility="${interactive ? 'hidden' : 'visible'}" pointer-events="none" aria-hidden="true">${levels.map((level) => `<text class="radar-tick" x="${layout.cx + 8}" y="${layout.cy - layout.radius * level / 100 + 4}">${level}</text>`).join('')}</g>`;
  const axes = data.tasks.map((_, index) => { const point = radarPoint(index, 100, count, layout); return `<path d="M${layout.cx},${layout.cy}L${point.join(',')}" stroke="#ececec" stroke-width="1"/>`; }).join('');
  const series = [...data.methods].reverse().map((method) => {
    const values = data.tasks.map((task, index) => relativeValue(scores[method.id][task.id]?.mean ?? null, ranges[index]));
    const { fill, line, points } = seriesGeometry(values, layout);
    const isOurs = method.id === 'modular';
    const order = data.methods.findIndex((entry) => entry.id === method.id);
    const mask = `${id}-draw-${method.id}`;
    return `<g data-series="${escapeHTML(method.id)}" class="radar-series" style="color:${method.color};--series-delay:${order * 90}ms">
      ${interactive ? `<defs><mask id="${mask}" maskUnits="userSpaceOnUse" x="0" y="0" width="${layout.width}" height="${layout.height}"><path class="radar-draw-mask" d="${line}" fill="none" stroke="white" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="0"/></mask></defs>` : ''}
      ${fill ? `<g class="radar-fill-layer"><polygon class="radar-area" points="${fill}" fill="currentColor" fill-opacity=".035" pointer-events="none"/></g>` : ''}
      <path class="radar-outline" d="${line}" fill="none" stroke="currentColor" stroke-width="${isOurs ? '2.8' : '2'}" ${method.dash ? `stroke-dasharray="${method.dash}"` : ''} ${interactive ? `mask="url(#${mask})"` : ''} stroke-linejoin="round" pointer-events="none"/>
      ${interactive ? `<path class="radar-line-hit" d="${line}" fill="none" stroke="transparent" stroke-width="14" pointer-events="stroke" aria-hidden="true"/>` : ''}
      ${points.map((point, index) => {
        if (!point) return '';
        const description = `${escapeHTML(method.name)} · ${escapeHTML(data.tasks[index].label)}: ${formatScore(scores[method.id][data.tasks[index].id])}%`;
        return `<g data-task="${data.tasks[index].id}" ${interactive ? `class="radar-point" aria-label="${description}"` : ''} style="--point-delay:${index * 110 + order * 90}ms">${interactive ? `<circle cx="${point[0]}" cy="${point[1]}" r="12" fill="transparent"/>` : `<title>${description}</title>`}<circle class="radar-point-dot" cx="${point[0]}" cy="${point[1]}" r="${compact ? '3.6' : '4'}" fill="${isOurs ? method.color : '#fff'}" stroke="currentColor" stroke-width="1.6"/></g>`;
      }).join('')}
    </g>`;
  }).join('');
  const labels = data.tasks.map((task, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
    const x = layout.cx + Math.cos(angle) * layout.labelRadius;
    const y = layout.cy + Math.sin(angle) * layout.labelRadius - (index === 0 ? 10 : 0);
    const anchor = Math.cos(angle) > .2 ? 'start' : Math.cos(angle) < -.2 ? 'end' : 'middle';
    const lines = task.id === 'olympiad' ? ['Olympiad', 'Bench'] : [task.label];
    const rangeText = rangeLabel(ranges[index]);
    const delta = scores.modular[task.id]?.mean == null || scores.randopt[task.id]?.mean == null ? null : scores.modular[task.id].mean - scores.randopt[task.id].mean;
    const category = escapeHTML(task.category);
    const labelWidth = Math.max(Math.max(...lines.map((text) => text.length)) * (compact ? 9 : 9.1), task.category.length * 7) + 16;
    const rectX = anchor === 'start' ? -8 : anchor === 'end' ? -labelWidth + 8 : -labelWidth / 2;
    const startY = lines.length > 1 ? -13 : -4;
    return `<g transform="translate(${x},${y})" data-task="${task.id}" class="radar-label" ${interactive ? `role="button" tabindex="0" aria-label="Show ${escapeHTML(task.label)} (${category}) scores, axis ${rangeText}, difference ${formatDifference(delta)}" aria-pressed="false"` : ''}><rect class="radar-label-hit" x="${rectX}" y="${startY - 18}" width="${labelWidth}" height="${lines.length * 18 + 30}" rx="5" fill="transparent"/><text text-anchor="${anchor}" y="${startY}">${lines.map((line, lineIndex) => `<tspan x="0" dy="${lineIndex ? 18 : 0}">${escapeHTML(line)}</tspan>`).join('')}<tspan class="radar-category" x="0" dy="18">${category}</tspan></text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" ${interactive ? 'role="group"' : 'role="img"'} aria-label="Performance across seven tasks · ${escapeHTML(data.scales[scale].label)}" aria-describedby="${id}-desc" class="radar-svg${compact ? ' radar-svg-compact' : ''}">
    <desc id="${id}-desc">Three methods at N=100 and K=25. All tasks and model sizes share a 0–100% axis, with guidelines at 20, 40, 60, 80, and 100. Area is not an aggregate score. The tooltip gives the mean difference between Modular Norm RandOpt and RandOpt, in percentage points. Lines show means over three seeds. Each task uses its own selected ensemble.${interactive ? ' Hover or tap a line to show the guidelines. Focus a task label to read all three scores and show the guidelines.' : ''}</desc>
    <style>.radar-label text{font-family:Arial,Helvetica,sans-serif;font-size:${compact ? '15.5' : '16'}px;fill:#393939}.radar-label .radar-category{font-size:12px;fill:#868686}.radar-tick{font-family:Arial,Helvetica,sans-serif;font-size:12px;fill:#737373;stroke:#fff;stroke-width:3.5px;paint-order:stroke;stroke-linejoin:round}.radar-label:focus{outline:none}.radar-label:focus .radar-label-hit{stroke:#5e5e5e;stroke-width:1.5}.radar-label[aria-pressed="true"]>text:first-of-type{fill:#5e5e5e}.radar-series{transition:opacity 140ms ease}.radar-point,.radar-label[role="button"]{cursor:pointer}@media(prefers-reduced-motion:reduce){.radar-series{transition:none}}</style>
    ${axes}${grids}${series}${guides}${labels}
  </svg>`;
}
