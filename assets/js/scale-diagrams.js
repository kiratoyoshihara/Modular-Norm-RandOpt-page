import { matrixFills, renderMethodPopulation, renderMethodVotes, METHOD_TIMING, METHOD_DURATIONS } from './method-svg.js';
import { NORM_ROW_INTERVAL, VOTE_START, SCALE_TRANSFORM_TIMING, SCALE_TIMELINES, SCALE_STEP_INTERVAL, ALLOCATION_STEP_INTERVAL, ALLOCATION_REVEAL_DURATION, ENSEMBLE_TRANSITION_TIMING } from './scale-timing.js';

// Appendix A.3, Table A2 and Eq. (20). These are architectural weights,
// not measured sensitivities, parameter counts, or final perturbation sizes.
export const MASS_GROUPS = [
  { label: 'Embedding', mass: 1, value: '1', color: '#528fbe' },
  { label: 'Attention', mass: .5, value: '½', color: '#9070c4' },
  { label: 'MLP', mass: .5, value: '½', color: '#cf8b5d' },
  { label: 'Head', mass: 1, value: '1', color: '#4d998b' },
  { label: 'Norm', mass: .1, value: '1/10', color: '#7e94bd' },
  { label: 'Other', mass: .1, value: '1/10', color: '#939da9' },
];
export const LAYER_COUNT = 28;
export const SELECTED_LAYER = 12;
export const tensorMass = ({ groupMass, layers, multiplicity, totalMultiplicity, physicalTensors }) =>
  groupMass / layers * multiplicity / totalMultiplicity / physicalTensors;
// The worked example uses all six active groups.
export const ALLOCATION_EXAMPLE = {
  modelMass: Number(MASS_GROUPS.reduce((sum, group) => sum + group.mass, 0).toFixed(1)),
  qMass: tensorMass({ groupMass: .5, layers: LAYER_COUNT, multiplicity: 1, totalMultiplicity: 4, physicalTensors: 1 }),
};

function matrix(seed, palette = 'warm', className = '') {
  const fills = matrixFills({ seed, palette });
  return `<svg class="scale-tensor ${className}" viewBox="0 0 72 72" aria-hidden="true">${fills.map((fill, i) => `<rect x="${(i % 4) * 18}" y="${Math.floor(i / 4) * 18}" width="16" height="16" rx="1.5" fill="${fill}" style="--tile-delay:${((i * 7 + seed * 3) % 16) * 45}ms"/>`).join('')}</svg>`;
}

export function sampleDiagram() {
  return `<figure class="scale-sampling" aria-label="Three independent Gaussian noise tensors for three different candidates, with the same tensor index p.">
    <div class="scale-tensor-row">${[1, 2, 3].map(i => `<div class="scale-tensor-item" style="--draw-delay:${(i - 1) * 260}ms">${matrix(i, 'warm', 'scale-random-tensor')}<span>Z<sub>${i},p</sub></span></div>`).join('')}</div>
    <figcaption>A fresh draw for each candidate and each tensor.</figcaption>
  </figure>`;
}

export function normDiagram(math) {
  const cells = Array.from({ length: 18 }, (_, i) => `<rect x="${8 + (i % 6) * 11}" y="${10 + Math.floor(i / 6) * 13}" width="8" height="9" rx="1" fill="${Math.floor(i / 6) === 1 ? '#cf926c' : '#eeded1'}"/>`).join('');
  const rows = [
    {
      label: 'Linear maps', norm: 'Spectral norm', note: 'The strongest amplification direction.',
      icon: '<circle cx="28" cy="32" r="18" fill="none" stroke="#cbd7e1"/><path d="M29 32H72m-5-4 5 4-5 4" stroke="#6c98b7" fill="none"/><ellipse class="scale-spectral-shape" cx="61" cy="32" rx="24" ry="12" fill="#e4edf4" fill-opacity=".6" stroke="#6c98b7"/>',
      formulas: [String.raw`\lVert Z\rVert_2=\sigma_{\max}(Z)`, String.raw`=\max_{\lVert v\rVert_2=1}\lVert Zv\rVert_2`],
    },
    {
      label: 'Embeddings', norm: 'Maximum-row ℓ₂', note: 'The largest Euclidean norm of any row.',
      icon: `${cells}<rect class="scale-row-highlight" x="5" y="20" width="70" height="16" rx="2" fill="none" stroke="#bc652c"/>`,
      formulas: [String.raw`\max_r\lVert Z_{r,:}\rVert_2`, String.raw`=\max_r\sqrt{\textstyle\sum_c Z_{rc}^{\,2}}`],
    },
    {
      label: '1-D parameters', norm: 'ℓ∞ norm', note: 'The largest absolute coordinate.',
      icon: `${[.3, .6, .4, 1, .5, .2].map((opacity, i) => `<rect x="${7 + i * 12}" y="24" width="9" height="16" rx="1" fill="#947ab8" opacity="${opacity}"/>`).join('')}<rect class="scale-element-highlight" x="40" y="21" width="15" height="22" rx="2" fill="none" stroke="#947ab8"/>`,
      formulas: [String.raw`\lVert z\rVert_\infty=\max_j|z_j|`],
    },
  ];
  return `<div class="scale-norm-list" style="--norm-interval:${NORM_ROW_INTERVAL}ms">${rows.map((row, i) => `<div class="scale-norm-row" style="--norm-delay:${i * NORM_ROW_INTERVAL}ms"><svg viewBox="0 0 90 64" aria-hidden="true">${row.icon}</svg><div class="scale-norm-label"><strong>${row.label}</strong><span>${row.norm}</span><small>${row.note}</small></div><div class="scale-norm-formula">${row.formulas.map(tex => `<div>${math(tex)}</div>`).join('')}</div></div>`).join('')}</div>`;
}

function flowArrow(className, name, delay, duration = SCALE_STEP_INTERVAL) {
  const animated = delay !== undefined;
  const attributes = animated ? ` data-connector="${name}" style="--arrow-delay:${delay}ms;--arrow-duration:${duration}ms"` : '';
  return `<svg class="scale-connector ${className}" viewBox="0 0 56 26" aria-hidden="true"${attributes}><path${animated ? ' class="scale-arrow-line"' : ''} d="M3 13H50" pathLength="1"/><path${animated ? ' class="scale-arrow-head"' : ''} d="m44 7 6 6-6 6"/></svg>`;
}

export function normalizeDiagram() {
  const timing = SCALE_TRANSFORM_TIMING;
  const arrow = (name, delay) => flowArrow('scale-normalization-connector', name, delay, timing.arrowDuration);
  const item = (name, label, className, detail, delay = 0) => `<div class="scale-tensor-item scale-normalization-item" data-normalization-step="${name}" style="--receive-delay:${delay}ms"><span class="scale-tensor-action">${label}</span>${matrix(4, 'warm', className)}<small>${detail}</small></div>`;
  return `<figure class="scale-normalization" aria-label="The same noise direction, first normalized to unit natural norm and then scaled to size R divided by s p. Colors are schematic tensor values.">
    <div class="scale-tensor-row scale-normalization-row" style="--normalize-delay:${timing.normalize}ms;--normalize-duration:${timing.normalizeDuration}ms;--resize-delay:${timing.scale}ms;--resize-duration:${timing.scaleDuration}ms">${item('noise', 'Noise', '', 'Raw noise')}${arrow('normalize', timing.firstArrow)}${item('normalize', 'Normalize', 'scale-unit-tensor', 'Unit norm', timing.normalize)}${arrow('scale', timing.secondArrow)}${item('scale', 'Scale', 'scale-sized-tensor', 'Size R/sₚ', timing.scale)}</div>
    <figcaption>The direction stays the same; its natural-norm size changes.</figcaption>
  </figure>`;
}

export function voteDiagram() {
  const transition = ENSEMBLE_TRANSITION_TIMING;
  const resultDelay = VOTE_START + METHOD_DURATIONS[4] - METHOD_TIMING.result - METHOD_TIMING.settle;
  return `<figure class="scale-ensemble" aria-label="Nine candidates are evaluated, the best three are selected, and their answers A, A, and B combine into A by plurality voting. Schematic example.">
    <div class="scale-ensemble-flow" style="--selection-start:${transition.selectionStart}ms;--selection-duration:${transition.selectionDuration}ms;--selection-frame-duration:${transition.frameDuration}ms;--vote-start:${VOTE_START}ms;--vote-result-delay:${resultDelay}ms;--arrive-duration:${METHOD_TIMING.arrive}ms;--connect-duration:${METHOD_TIMING.connect}ms;--result-duration:${METHOD_TIMING.result}ms"><svg class="scale-selection-diagram" viewBox="-12 -30 148 230" aria-label="Evaluate nine candidates and select candidates 3, 5 and 7.">${renderMethodPopulation()}</svg>${flowArrow('scale-flow-arrow', 'vote', transition.arrowStart, transition.arrowDuration)}<svg class="scale-vote-diagram" viewBox="-12 -30 190 196" aria-label="The selected models give answers A, A and B; their plurality vote is A.">${renderMethodVotes()}</svg></div>
    <figcaption>The same selection and voting procedure as RandOpt.</figcaption>
  </figure>`;
}

function layerCells(x, y, width, color) {
  const pitch = width / LAYER_COUNT;
  return Array.from({ length: LAYER_COUNT }, (_, i) => `<rect class="allocation-block allocation-layer${i === SELECTED_LAYER - 1 ? ' is-selected' : ''}" x="${x + i * pitch}" y="${y}" width="${pitch - 1.5}" height="12" rx="1.5" fill="${color}" stroke="${color}"/>`).join('');
}

export function allocationTree() {
  const [, attention, mlp] = MASS_GROUPS;
  const centers = [42, 137, 232, 327, 422, 517];
  const unit = 80;
  const total = MASS_GROUPS.reduce((sum, group) => sum + group.mass, 0);
  const rootX = 280 - total * unit / 2;
  let offset = rootX;
  const branches = MASS_GROUPS.map((group, i) => {
    const x = offset, width = group.mass * unit;
    offset += width;
    return `<rect class="allocation-block" x="${x}" y="27" width="${width}" height="10" rx="1.5" fill="${group.color}" stroke="${group.color}"/><path class="allocation-edge" d="M${x + width / 2} 39C${x + width / 2} 58 ${centers[i]} 54 ${centers[i]} 72" pathLength="1"/><text x="${centers[i]}" y="88" text-anchor="middle">${group.label}</text><rect class="allocation-block" x="${centers[i] - width / 2}" y="98" width="${width}" height="7" rx="1.5" fill="${group.color}" stroke="${group.color}"/><text x="${centers[i]}" y="123" text-anchor="middle" class="allocation-mass">${group.value}</text>`;
  }).join('');
  const projections = (xs, labels, color, width) => xs.map((x, i) => `<path class="allocation-edge" d="M${x} 209V221" pathLength="1"/><text x="${x}" y="236" text-anchor="middle">${labels[i]}</text><rect class="allocation-block" x="${x - width / 2}" y="245" width="${width}" height="7" rx="1.5" fill="${color}" stroke="${color}"/>`).join('');
  return `<svg class="allocation-tree" viewBox="0 0 560 288" role="img" aria-label="Mass allocation tree: the model branches into the six groups of Table A2. Attention and MLP each split equally over 28 layers. One layer expands to Q, K, V, O and gate, up, down. QKV gets three shares and O one; gate and up get two shares and down one.">
    <g class="allocation-part" data-tree-phase="1"><text x="280" y="14" text-anchor="middle" class="allocation-root-label">Model · architectural mass</text><rect class="allocation-block allocation-root-block" x="${rootX}" y="27" width="${total * unit}" height="10" rx="1.5" fill="#9aafc1" stroke="#9aafc1"/></g>
    <g class="allocation-part" data-tree-phase="2">${branches}</g>
    <g class="allocation-part" data-tree-phase="3"><path class="allocation-edge" d="M137 127V138M232 127C232 139 417 126 417 138" pathLength="1"/><text x="145" y="153" text-anchor="middle" class="allocation-detail">Attention ÷ 28 layers</text><text x="417" y="153" text-anchor="middle" class="allocation-detail">MLP ÷ 28 layers</text>${layerCells(24, 164, 242, attention.color)}${layerCells(296, 164, 242, mlp.color)}<text x="145" y="193" text-anchor="middle" class="allocation-detail">Layer 12 · mass 1/56</text><text x="417" y="193" text-anchor="middle" class="allocation-detail">Layer 12 · mass 1/56</text></g>
    <g class="allocation-part" data-tree-phase="4"><path class="allocation-edge" d="M123 178V181M123 199V202M54 209V202H216V209M395 178V181M395 199V202M335 209V202H499V209" pathLength="1"/>${projections([54, 108, 162, 216], ['Q', 'K', 'V', 'O'], attention.color, 27)}${projections([335, 417, 499], ['gate', 'up', 'down'], mlp.color, 36)}<text x="137" y="275" text-anchor="middle" class="allocation-detail">Q + K + V : O = 3 : 1</text><text x="417" y="275" text-anchor="middle" class="allocation-detail">gate + up : down = 2 : 1</text></g>
  </svg>`;
}

function allocationCalculation(math) {
  const { modelMass, qMass } = ALLOCATION_EXAMPLE;
  const scale = Number((modelMass / qMass).toFixed(1));
  const parts = equations => equations.map(tex => `<span>${math(tex)}</span>`).join('');
  return `<div class="allocation-calculation">
    <p class="allocation-example-context">Worked example · Q, layer ${SELECTED_LAYER}</p>
    <div class="allocation-derivation-row" data-calculation="mass"><div class="allocation-equation-heading"><span>Tensor mass</span></div><div class="allocation-equation allocation-general-mass">${math(String.raw`m_p=\dfrac{M_g}{L_g}\times\dfrac{w_u}{\sum_v w_v}\times\dfrac1{n_u}`)}</div><div class="allocation-equation allocation-example">${math(String.raw`m_{\mathrm Q}=\dfrac{1/2}{28}\times\dfrac14\times1=\dfrac1{224}`)}</div></div>
    <div class="allocation-derivation-row" data-calculation="scale"><div class="allocation-equation">${parts([String.raw`s_{\mathrm Q}=\dfrac{m_{\mathcal M}}{m_{\mathrm Q}}\,\rho_{\mathrm Q}`, String.raw`=${modelMass}\times224\times\rho_{\mathrm Q}`, String.raw`=${scale}\,\rho_{\mathrm Q}`])}</div><p class="allocation-total-mass">All six groups: ${math(String.raw`m_{\mathcal M}=1+\tfrac12+\tfrac12+1+\tfrac1{10}+\tfrac1{10}=${modelMass}`)}</p></div>
  </div>`;
}

const allocationPhases = math => [
  ['Start with the model', 'Mass is an architectural weight, independent of parameter count. Only active tensors contribute to the total.'],
  ['Allocate to module groups', 'Use the fixed group weights in Table A2. Longer colored marks mean more mass.'],
  ['Split across repeated layers', 'Attention and MLP each share their mass equally across 28 layers in Qwen2.5-1.5B. Expand one layer.'],
  ['Divide among tensors', 'QKV counts as three shares; gate–up as two. Within each logical module, split its share equally over its physical tensors.'],
  ['Apply sensitivity correction', `${math(String.raw`\rho_p`)} is set once by a Jacobian-based calibration on 64 Countdown prompts and bounded to ${math(String.raw`[\tfrac12,\,2]`)}. See Section 3.2 and Appendix A.`],
];

function staticAllocationVisual(index, math) {
  if (index === 0) return `<div class="allocation-budget" aria-label="Model mass is the sum of active tensor masses">${MASS_GROUPS.map(group => `<span style="flex:${group.mass};--allocation-color:${group.color}"></span>`).join('')}</div>`;
  if (index === 1) return `<div class="allocation-group-list">${MASS_GROUPS.map(group => `<div style="--allocation-color:${group.color}"><span>${group.label}<b>${group.value}</b></span><i style="width:${group.mass * 100}%"></i></div>`).join('')}</div>`;
  if (index === 2) return `<div class="allocation-layer-list">${MASS_GROUPS.slice(1, 3).map(group => `<div style="--allocation-color:${group.color}"><span>${group.label} · 28 equal shares</span><div>${Array.from({ length: LAYER_COUNT }, (_, i) => `<i${i === SELECTED_LAYER - 1 ? ' class="selected"' : ''}></i>`).join('')}</div><small>Layer 12 highlighted · mass 1/56</small></div>`).join('')}</div>`;
  if (index === 3) return `<div class="allocation-tensor-list"><div style="--allocation-color:${MASS_GROUPS[1].color}"><span>Attention · QKV : O = 3 : 1</span><div>${['Q', 'K', 'V', 'O'].map(label => `<span>${label}</span>`).join('')}</div></div><div style="--allocation-color:${MASS_GROUPS[2].color}"><span>MLP · gate/up : down = 2 : 1</span><div>${['gate', 'up', 'down'].map(label => `<span>${label}</span>`).join('')}</div></div></div>`;
  return allocationCalculation(math);
}

export function allocationDiagram(math) {
  const phases = allocationPhases(math);
  const delays = SCALE_TIMELINES.allocate.events.slice(1).map(event => `--allocate-phase-${event.phase}:${event.at}ms`).join(';');
  const timing = `--allocate-step:${ALLOCATION_STEP_INTERVAL}ms;--allocate-reveal:${ALLOCATION_REVEAL_DURATION}ms`;
  return `<div class="allocation-live" aria-hidden="true" style="${timing}">${allocationTree()}<div class="allocation-caption-stack">${phases.map(([title, text], i) => `<div class="allocation-caption" data-allocation-caption="${i + 1}"><span>${i + 1} / 5 · ${title}</span><p>${text}</p></div>`).join('')}</div><div class="allocation-final">${allocationCalculation(math)}</div></div>
    <ol class="allocation-static" style="${timing};${delays}">${phases.map(([title, text], i) => `<li><h5><span>0${i + 1}</span>${title}</h5><p>${text}</p>${staticAllocationVisual(i, math)}</li>`).join('')}</ol>`;
}
