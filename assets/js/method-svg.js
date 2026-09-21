export const METHOD_STEPS = [
  { label: 'Noise', title: 'Sample fresh Gaussian noise', description: 'Start each candidate with a new independent Gaussian draw Zᵢ.' },
  { label: 'Scale', title: 'Modular perturbations', description: 'Normalize each direction with its module’s natural norm, then apply fixed architecture- and sensitivity-based scales to obtain Δθ.' },
  { label: 'Sample', title: 'Add one candidate', description: 'Add Δθᵢ to the same pretrained weights to obtain exactly one candidate θ′ᵢ. Repeat with fresh noise until N candidates are ready.' },
  { label: 'Select', title: 'Select the top K', description: 'Score the candidates on the task’s selection set and keep the best K models.' },
  { label: 'Vote', title: 'Ensemble predictions', description: 'For a new input, combine the selected models’ answers by plurality voting.' },
];

export const METHOD_SELECTED = [3, 5, 7];
export const METHOD_CANDIDATE_COUNT = 9;
const CANDIDATE_ROW_SPACING = 60;
const VOTER_SPACING = 141 / (METHOD_SELECTED.length - 1);
const TRANSFER_SPEED = 1.15 * 1.1;
const SAMPLE_TRAVEL = Math.round(800 / TRANSFER_SPEED);
export const METHOD_TIMING = {
  normalizeTravel: SAMPLE_TRAVEL,
  normalizeHold: 450,
  normalizeDuration: 2200,
  sampleTravel: SAMPLE_TRAVEL,
  sampleInterval: Math.round(1050 / TRANSFER_SPEED),
  voteTravel: Math.round(950 / TRANSFER_SPEED),
  voteInterval: Math.round(1350 / TRANSFER_SPEED),
  arrive: 380,
  connect: 450,
  result: 550,
  settle: 450,
  selectionHold: 950, // Keep the completed population for 500ms longer.
};
const sampleArrival = index => index * METHOD_TIMING.sampleInterval + METHOD_TIMING.sampleTravel;
const voteArrival = index => index * METHOD_TIMING.voteInterval + METHOD_TIMING.voteTravel;
const resultDelay = voteArrival(METHOD_SELECTED.length - 1) + METHOD_TIMING.arrive + METHOD_TIMING.connect + 180;
export const METHOD_DURATIONS = [
  2300, // Noise tiles finish at 1200ms; hold for 1100ms before sending them.
  METHOD_TIMING.normalizeTravel + METHOD_TIMING.normalizeHold + METHOD_TIMING.normalizeDuration + 400,
  sampleArrival(METHOD_CANDIDATE_COUNT - 1) + METHOD_TIMING.arrive + METHOD_TIMING.selectionHold,
  2000,
  resultDelay + METHOD_TIMING.result + METHOD_TIMING.settle,
];

// Update indices and colors at each dispatch without replaying Noise or Scale.
export const methodStepDuration = (phase, draw = 1) => phase === 2
  ? draw < METHOD_CANDIDATE_COUNT ? METHOD_TIMING.sampleInterval : METHOD_TIMING.sampleTravel + METHOD_TIMING.arrive + METHOD_TIMING.selectionHold
  : METHOD_DURATIONS[phase];

const PALETTES = {
  blue: ['#E2EDF1', '#C7DDE5', '#9CC1D0', '#6DA3B8', '#377E99'],
  warm: ['#FCE5D3', '#F8CCAF', '#F1AE87', '#E78D67', '#CD6656'],
  combined: ['#F0EBF8', '#DDD1EE', '#C2AEDF', '#9E83C4', '#795AA6'],
};

// Each candidate's noise, perturbation, transmitted model, population entry,
// and voter share a distinct schematic pattern, using their respective palettes.
export function matrixFills({ seed = 0, palette = 'blue', count = 16 } = {}) {
  let state = Math.imul(seed + 1, 0x9E3779B1) >>> 0;
  return Array.from({length:count}, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return PALETTES[palette][Math.floor(state / 0x100000000 * 5)];
  });
}
const drawSymbol = symbol => `${symbol}<tspan baseline-shift="sub" font-size=".65em" data-method-index="">i</tspan>`;

// Schematic matrix entries vary in shade; they do not encode measured weights.
export function matrixTiles({ x = 0, y = 0, size = 16, gap = 1.3, rows = 4, cols = 4, seed = 0, palette = 'blue', animate = false } = {}) {
  const fills = matrixFills({seed,palette,count:rows*cols});
  return Array.from({length:rows},(_,row) => Array.from({length:cols},(_,col) => {
    // Purple represents the combined model θ + Δθ throughout sampling and voting.
    const fill = fills[row * cols + col];
    return `<rect class="method-matrix-cell${animate ? ' method-noise-cell' : ''}" x="${x + col * (size + gap)}" y="${y + row * (size + gap)}" width="${size}" height="${size}" rx="1.4" fill="${fill}" style="--cell-delay:${(row * cols + col) * 40}ms"/>`;
  }).join('')).join('');
}

// Show one representative parameter tensor as a continuous matrix. Its entries
// are scaled together; the displayed strength is illustrative, not a measured norm.
function noiseMatrix({ shaped = false, animate = false } = {}) {
  const matrix = `<g class="method-noise-values" data-draw-palette="warm" opacity="${shaped ? .72 : 1}" style="--raw-strength:1;--shaped-strength:.72">${matrixTiles({seed:1,palette:'warm',animate})}</g>`;
  return shaped ? `<g class="method-noise-arrival" style="--receive-delay:${METHOD_TIMING.normalizeTravel}ms">${matrix}</g>` : matrix;
}

const rawNoise = () => `<g class="method-source" data-method-stage="0">
  <text x="34" y="-16" text-anchor="middle" class="method-svg-note">Fresh noise</text>
  ${noiseMatrix({animate:true})}
  <text x="34" y="96" text-anchor="middle" class="method-math method-math-noise">${drawSymbol('Z')}</text>
</g>`;

const source = () => `<g class="method-addition" data-method-stage="1">
  <g class="method-shaped" data-method-stage="1">
    <text x="34" y="-16" text-anchor="middle" class="method-svg-note">Shaped perturbation</text>
    ${noiseMatrix({shaped:true})}
    <text x="34" y="96" text-anchor="middle" class="method-math method-math-noise">${drawSymbol('Δθ')}</text>
  </g>
  <text x="87" y="43" text-anchor="middle" class="method-plus">+</text>
  <text x="141" y="-16" text-anchor="middle" class="method-svg-note">Pretrained weights</text>
  ${matrixTiles({x:107,seed:2})}
  <text x="141" y="96" text-anchor="middle" class="method-math">θ</text>
</g>`;

const population = () => `<g class="method-population" data-method-stage="2">
  <text x="60.25" y="-15" text-anchor="middle" class="method-svg-note">N candidates</text>
  ${Array.from({length:METHOD_CANDIDATE_COUNT},(_,index) => {
    const id=index+1, x=index%3*48, y=Math.floor(index/3)*CANDIDATE_ROW_SPACING;
    return `<g class="method-candidate" data-candidate="${id}" data-selected="${METHOD_SELECTED.includes(id)}" style="--candidate-delay:${sampleArrival(index)}ms">${matrixTiles({x,y,size:5.375,gap:1,seed:id,palette:'combined'})}<text x="${x+12.25}" y="${y+45}" text-anchor="middle" class="method-candidate-label">θ′<tspan dy="2.5" font-size=".7em">${id}</tspan></text></g>`;
  }).join('')}
</g>
<g class="method-selection" data-method-stage="3">
  ${METHOD_SELECTED.map(id => {
    const index=id-1, x=index%3*48, y=Math.floor(index/3)*CANDIDATE_ROW_SPACING;
    return `<rect class="method-selection-frame" data-selected-candidate="${id}" x="${x-5}" y="${y-5}" width="34.5" height="34.5" rx="4"/>`;
  }).join('')}
  <text x="60.25" y="183" text-anchor="middle" class="method-selection-note">Keep K models</text>
</g>`;

const votes = () => `<g class="method-voting" data-method-stage="4">
  <text x="83" y="-17" text-anchor="middle" class="method-svg-note">New input</text>
  ${METHOD_SELECTED.map((id,index) => `<g class="method-voter" data-voter="${id}" style="--vote-delay:${voteArrival(index)}ms">
    ${matrixTiles({x:index*VOTER_SPACING,size:5.375,gap:1,seed:id,palette:'combined'})}
    <path d="M${12+index*VOTER_SPACING} 32V45" class="method-answer-stem"/>
    <rect x="${index*VOTER_SPACING-1}" y="49" width="27" height="27" rx="4" fill="${index===2?'#FCE7D7':'#EAF2F6'}"/>
    <text x="${12.5+index*VOTER_SPACING}" y="68" text-anchor="middle" class="method-answer" fill="${index===2?'#B86638':'#377E99'}">${index===2?'B':'A'}</text>
  </g>`).join('')}
  <g class="method-vote-paths" fill="none" stroke="#B5C9D3" stroke-width="1.5">
    ${METHOD_SELECTED.map((id,index) => {
      const x=12.5+index*VOTER_SPACING, direction=x<83?1:-1;
      const path = x === 83 ? 'M83 83V115' : `M${x} 83V94Q${x} 101 ${x+7*direction} 101H${83-6*direction}Q83 101 83 108V115`;
      return `<path pathLength="1" style="--path-delay:${voteArrival(index) + METHOD_TIMING.arrive}ms" d="${path}"/>`;
    }).join('')}
  </g>
  <g class="method-vote-result"><rect x="61" y="117" width="44" height="39" rx="5" fill="#377E99"/><text x="83" y="144" text-anchor="middle" class="method-answer-final">A</text></g>
</g>`;

function scaleConnector(x1,y1,x2,y2,variant) {
  const horizontal = x1 !== x2;
  return `<g class="method-connector method-scale-connector" data-method-stage="1">
    <path d="M${x1} ${y1}L${x2} ${y2}" marker-end="url(#method-arrow-${variant})"/>
    <text x="${horizontal?(x1+x2)/2:x1+14}" y="${horizontal?y1-20:(y1+y2)/2+3}" text-anchor="${horizontal?'middle':'start'}" class="method-scale-label">Normalize + scale</text>
    <g transform="translate(${x1} ${y1})"><g class="method-noise-transfer" style="--travel-x:${x2-x1-(horizontal?4:0)}px;--travel-y:${y2-y1-(horizontal?0:4)}px;--transfer-duration:${METHOD_TIMING.normalizeTravel}ms;--transfer-delay:0ms"><g transform="translate(-6.8 -6.8) scale(.2)">${noiseMatrix()}</g></g></g>
  </g>`;
}

function connector(x1,y1,x2,y2,stage,variant) {
  const sampling = stage === 2;
  const ids = sampling ? Array.from({length:METHOD_CANDIDATE_COUNT},(_,index)=>index+1) : METHOD_SELECTED;
  const interval = sampling ? METHOD_TIMING.sampleInterval : METHOD_TIMING.voteInterval;
  const duration = sampling ? METHOD_TIMING.sampleTravel : METHOD_TIMING.voteTravel;
  const horizontal = x1 !== x2;
  return `<g class="method-connector" data-method-stage="${stage}">
    <path d="M${x1} ${y1}L${x2} ${y2}" marker-end="url(#method-arrow-${variant})"/>
    ${sampling ? `<text x="${horizontal?(x1+x2)/2:x1+14}" y="${horizontal?y1-20:(y1+y2)/2+3}" text-anchor="${horizontal?'middle':'start'}" class="method-model-formula">${drawSymbol('θ′')} = θ + ${drawSymbol('Δθ')}</text>` : ''}${ids.map((id,index) => `<g transform="translate(${x1} ${y1})"><g class="method-transfer${sampling?' method-sample-transfer':''}" data-transfer-candidate="${id}" ${sampling?'data-draw-palette="combined"':''} style="--travel-x:${x2-x1-(horizontal?4:0)}px;--travel-y:${y2-y1-(horizontal?0:4)}px;--transfer-duration:${duration}ms;--transfer-delay:${index*interval}ms">${matrixTiles({x:-5.35,y:-5.35,size:2.3,gap:.5,seed:id,palette:'combined'})}</g></g>`).join('')}
  </g>`;
}

function captions(x,y,title,lines,stage) {
  return `<g class="method-caption" data-method-stage="${stage}" data-caption-stage="${stage}" transform="translate(${x} ${y})"><text text-anchor="middle" class="method-caption-title">${title}</text>${lines.map((line,index)=>`<text y="${26+index*19}" text-anchor="middle" class="method-caption-description">${line}</text>`).join('')}</g>`;
}

export function renderMethodDiagram(compact = false) {
  const variant=compact?'mobile':'desktop';
  const body=compact ? `
    <g transform="translate(126 30)">${rawNoise()}</g>
    ${captions(160,158,'Sample noise',['Draw Gaussian directions'],0)}
    ${scaleConnector(160,208,160,236,variant)}
    <g transform="translate(73 265)">${source()}</g>
    ${captions(160,397,'Modular perturbations',['Module-wise norms + calibrated scales'],1)}
    ${connector(160,444,160,482,2,variant)}
    <g transform="translate(99.75 519)">${population()}</g>
    ${captions(160,733,'Select top K',['Score the population; keep an ensemble'],3)}
    ${connector(160,781,160,821,4,variant)}
    <g transform="translate(77.5 859)">${votes()}</g>
    ${captions(160,1058,'Vote',['Combine the selected models’ answers'],4)}
  ` : `
    <g transform="translate(42 69)">${rawNoise()}</g>
    ${scaleConnector(127,106,220,106,variant)}
    <g transform="translate(244 69)">${source()}</g>
    ${connector(444,106,543,106,2,variant)}
    <g transform="translate(570 37.75)">${population()}</g>
    ${connector(715,106,802,106,4,variant)}
    <g transform="translate(824 42)">${votes()}</g>
    ${captions(76,250,'Sample noise',['Gaussian directions'],0)}
    ${captions(332,250,'Modular perturbations',['Module-wise norms + calibrated scales'],1)}
    ${captions(630,250,'Select top K',['Score N candidates; keep K models'],3)}
    ${captions(906,250,'Vote',['Combine their answers'],4)}
  `;
  return `<svg class="method-diagram method-diagram-${variant}" viewBox="0 0 ${compact?'320 1105':'1020 304'}" role="img" aria-label="Modular Norm RandOpt: sample noise, scale, select, and vote" aria-describedby="method-diagram-desc-${variant}">
    <desc id="method-diagram-desc-${variant}">Repeat independently for i = 1 through 9: draw fresh Gaussian noise Zᵢ, normalize its direction with its module's natural norm and apply architecture- and sensitivity-based scaling to obtain Δθᵢ, then add it to the same pretrained weights θ to create one candidate θ′ᵢ. Each matrix illustrates a parameter tensor. Keep each completed candidate while drawing the next independent noise. Once all nine candidates are ready, retain candidates 3, 5, and 7 according to their selection scores, then combine their answers A, A, and B into A by plurality voting. Strengths, matrix entries, candidate identities, and answers are schematic.</desc>
    <defs><marker id="method-arrow-${variant}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#637481"/></marker></defs>
    ${body.trim()}
  </svg>`;
}

export function renderMethodFigure() {
  return `<figure class="method-animation" id="overview-method" aria-labelledby="overview-method-title" style="--scale-delay:${METHOD_TIMING.normalizeTravel+METHOD_TIMING.normalizeHold}ms;--scale-duration:${METHOD_TIMING.normalizeDuration}ms;--arrive-duration:${METHOD_TIMING.arrive}ms;--connect-duration:${METHOD_TIMING.connect}ms;--result-duration:${METHOD_TIMING.result}ms;--result-delay:${resultDelay}ms">
    <div class="method-animation-toolbar"><h3 id="overview-method-title">Modular Norm RandOpt</h3><div class="method-playback" hidden><button type="button" data-method-toggle aria-label="Pause the method animation">Pause</button><button type="button" data-method-replay aria-label="Replay the method animation">↺ Replay</button></div></div>
    <p class="method-generation-status" data-method-progress>Repeat independently for i = 1, …, ${METHOD_CANDIDATE_COUNT}</p>
    <div class="method-diagram-wrap" id="overview-method-diagram">${renderMethodDiagram()}${renderMethodDiagram(true)}</div>
    <div class="method-step-controls" role="group" aria-label="Explore the method steps" hidden>${METHOD_STEPS.map((step,index)=>`<button type="button" data-method-step="${index}" aria-pressed="false" aria-controls="overview-method-diagram">${step.label}</button>`).join('')}</div>
    <figcaption>One independent noise draw per candidate. Schematic example: N = ${METHOD_CANDIDATE_COUNT}, K = ${METHOD_SELECTED.length}.</figcaption>
    <p class="sr-only" data-method-announcement role="status" aria-live="polite"></p>
  </figure>`;
}
