import { escapeHTML as esc } from './radar-svg.js';

const colors = ['#222222', '#777777', '#aaaaaa'];
const moduleColors = ['#41755b', '#577fa5', '#b28b50'];
const star = (x, y, r = 13) => `<path d="M${x} ${y-r}l${r*.25} ${r*.75} ${r*.75} ${r*.25}-${r*.75} ${r*.25}-${r*.25} ${r*.75}-${r*.25}-${r*.75}-${r*.75}-${r*.25} ${r*.75}-${r*.25}Z" fill="#434343"/>`;
const svg = (body, label, width = 240, height = 180) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">${body}</svg>`;

export function renderSampling(mode = 'modular') {
  const points = [[62,48],[167,39],[48,107],[193,97],[91,147],[159,145]];
  const modular = mode === 'modular';
  return svg(`<path d="M18 92H222M120 10V169" stroke="#e5e5e5" stroke-width=".8"/>
    <ellipse cx="120" cy="91" rx="90" ry="73" fill="#f2f2f2" fill-opacity=".55" stroke="#b4b4b4" stroke-dasharray="3 5"/>
    <path d="M45 76C64 34 98 32 99 69S154 76 161 43M65 135C91 113 157 169 193 104" fill="none" stroke="#d5d5d5" stroke-width="12" stroke-linecap="round" opacity=".38"/>
    ${points.map(([x,y], i) => `<path class="sample-ray" d="M120 91L${x} ${y}" stroke="${modular ? '#868686' : '#999999'}" stroke-width=".8" stroke-dasharray="2 3"/><g class="flow-seed" style="--dx:${120-x}px;--dy:${91-y}px;--delay:${i*.12}s"><circle cx="${x}" cy="${y}" r="12" fill="#fcfcfc" stroke="${modular?'#6a6a6a':'#8a8a8a'}" stroke-width="1.2"/>${modular ? colors.map((c,j)=>`<rect x="${x-6+j*4.5}" y="${y-4+j%2*2}" width="3" height="${8-j%2*4}" rx=".8" fill="${c}"/>`).join('') : `<circle cx="${x}" cy="${y}" r="3.5" fill="#8a8a8a"/>`}<text x="${x+14}" y="${y+4}" font-size="9" font-family="Arial,sans-serif" fill="#727272">${i+1}</text></g>`).join('')}
    <circle cx="120" cy="91" r="21" fill="#fcfcfc"/>${star(120,91)}<text x="120" y="121" text-anchor="middle" font-family="Georgia,serif" font-size="14" fill="#616161">θ</text>`, `${modular ? 'Module-normalized' : 'Isotropic Gaussian'} perturbations around pretrained weights. Six schematic seeds; positions are not measured.`);
}

export function renderPipeline(mode = 'modular') {
  const scores = [37,75,28,92,44,61];
  return `<div class="flow-node flow-generate" data-flow-stage="0"><div class="flow-label"><span>01</span><strong>Generate</strong><em>${mode==='modular'?'Our change':'RandOpt'}</em></div><div id="sampling-illustration">${renderSampling(mode)}</div><p id="sampling-label">${mode==='modular'?'Module-aware perturbations':'Gaussian search window'}</p></div>
    <div class="flow-node" data-flow-stage="1"><div class="flow-label"><span>02</span><strong>Evaluate</strong></div><div class="seed-scores">${scores.map((score,i)=>`<div class="seed-score ${[1,3,5].includes(i)?'seed-keep':''}"><span>${String(i+1).padStart(2,'0')}</span><div><i style="--score:${score}%;--delay:${i*.16}s"></i></div></div>`).join('')}</div><p>Score on D<sub>sel</sub></p></div>
    <div class="flow-node" data-flow-stage="2"><div class="flow-label"><span>03</span><strong>Top-K</strong></div><div class="selected-experts">${[4,2,6].map((seed,i)=>`<div class="expert-ticket" style="--delay:${i*.18}s"><span class="expert-symbol" aria-hidden="true">✧</span><span>Seed ${String(seed).padStart(2,'0')}</span><span class="expert-rank">${i+1}</span></div>`).join('')}</div><p>Keep the best K seeds</p></div>
    <div class="flow-node" data-flow-stage="3"><div class="flow-label"><span>04</span><strong>Vote</strong></div><div class="vote-mini"><div class="mini-answers"><span>A</span><span>A</span><span>B</span></div><svg viewBox="0 0 160 54" aria-hidden="true"><path d="M30 2C30 30 80 21 80 52M80 2V52M130 2C130 30 80 21 80 52" fill="none" stroke="#cdcdcd"/><path class="vote-trace" d="M30 2C30 30 80 21 80 52M80 2V52M130 2C130 30 80 21 80 52" fill="none" stroke="#808080" pathLength="1"/></svg><div class="mini-result">A<span>ensemble answer</span></div></div><p>Plurality over K experts</p></div>`;
}

export function renderCode(mode = 'modular') {
  const modular = mode === 'modular';
  const lines = modular ? [
    [-1,'# Calibrate once on Countdown; reuse across tasks'],
    [-1,'scales = calibrate_modular_scales(theta, D_cal)'],
    [0,'for seed in seeds:'],
    [0,'    rng = generator(seed)'],
    [0,'    delta = zeros_like(theta)'],
    [0,'    for p in active_modules:'],
    [0,'        z = gaussian_like(theta[p], rng)'],
    [0,'        delta[p] = R * z / (scales[p] * norm_p(z))',true],
    [0,'    candidates.append(theta + delta)'],
  ] : [
    [-1,'# Each seed is assigned a global noise scale'],
    [-1,'sigmas = assign_scales(seeds, sigma_grid)'],
    [0,'for seed in seeds:'],
    [0,'    rng = generator(seed)'],
    [0,'    z = gaussian_like(theta, rng)'],
    [0,'    delta = sigmas[seed] * z',true],
    [0,'    candidates.append(theta + delta)'],
  ];
  lines.push([-1,''],[1,'scores = evaluate(candidates, D_sel)'],[2,'experts = topk(candidates, scores, K)'],[-1,'# Inference on a new input x'],[3,'answers = [generate(expert, x) for expert in experts]'],[3,'prediction = plurality_vote(answers)']);
  return lines.map(([phase,line,change],i)=>`<span class="code-line${line.startsWith('#')?' code-comment':''}${change?' code-change':''}" data-code-stage="${phase}"><span class="line-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><code>${esc(line)||' '}</code></span>`).join('');
}

export const geometryContent = {
  norms: { number:'01', title:'Respect what each module does.', text:'An embedding row, a linear map, and a normalization weight act differently. Normalize each noise tensor with the norm matched to its role, before assigning its perturbation size.', formula:'Z<sub>p</sub> / ‖Z<sub>p</sub>‖<sub>ℳp</sub>', detail:'Direction: Gaussian. Normalization: module specific.', comparison:'With natural norms', control:'Frobenius-norm control' },
  mass: { number:'02', title:'Allocate across the architecture.', text:'Fixed module masses define the base scales recursively. A module’s share of the root mass sets its natural-norm perturbation magnitude; mass is an architectural weight, not a parameter count.', formula:'s<sub>p</sub><sup>base</sup> = m<sub>root</sub> / m<sub>p</sub>', detail:'Base magnitude: R · mₚ / mᵣₒₒₜ, before sensitivity correction.', comparison:'With recursive scaling', control:'Without recursive scaling' },
  sensitivity: { number:'03', title:'Account for local sensitivity.', text:'A one-time calibration measures input sensitivity within each transformer layer. A bounded correction adjusts the base scales. The calibrated profile stays fixed during search and transfers across tasks.', formula:'s<sub>p</sub> = (m<sub>root</sub> / m<sub>p</sub>) · ρ<sub>p</sub>', detail:'ρₚ ∈ [½, 2]. More correction means a smaller perturbation.', comparison:'With sensitivity correction', control:'Without sensitivity correction' },
};

export function renderGeometry(kind = 'norms', rho = 1) {
  if (kind === 'norms') {
    const matrices = [0,1,2].map(row=>Array.from({length:6},(_,col)=>`<rect x="${42+col*13}" y="${38+row*12}" width="9" height="7" rx="1" fill="${row===1?'#52795c':'#d2ddcd'}"/>`).join('')).join('');
    return svg(`<g font-family="Arial,sans-serif" fill="#354c3d"><text x="27" y="20" font-size="10" letter-spacing="1.5" fill="#7c8978">MODULE</text><text x="266" y="20" font-size="10" letter-spacing="1.5" fill="#7c8978">NATURAL NORM</text><path d="M25 84H421M25 159H421" stroke="#dde4d6"/>${matrices}<rect class="norm-scan" x="36" y="46" width="86" height="15" fill="none" stroke="#50734f" rx="2"/><text x="148" y="49" font-size="13">Embeddings</text><text x="148" y="67" font-size="10" fill="#6b7b67">Look up a row</text><text x="266" y="55" font-size="13" fill="#52795c">Maximum-row ℓ₂</text><circle cx="65" cy="123" r="19" fill="none" stroke="#b3c4d2"/><ellipse class="linear-map" cx="101" cy="123" rx="25" ry="12" fill="#cddce8" fill-opacity=".5" stroke="#577fa5"/><path d="M79 123H125m-5-4 5 4-5 4" fill="none" stroke="#577fa5"/><text x="148" y="118" font-size="13">Linear maps</text><text x="148" y="136" font-size="10" fill="#6b7b67">Largest amplification</text><text x="266" y="124" font-size="13" fill="#577fa5">Spectral norm</text>${[9,17,28,13,20].map((h,i)=>`<rect x="${44+i*16}" y="${209-h}" width="9" height="${h}" rx="1.5" fill="${i===2?'#b18a4f':'#ded2bc'}"/>`).join('')}<path d="M38 178H127" stroke="#b18a4f" stroke-dasharray="3 3"/><text x="148" y="192" font-size="13">1D parameters</text><text x="148" y="210" font-size="10" fill="#6b7b67">Largest coordinate</text><text x="266" y="199" font-size="13" fill="#b18a4f">ℓ∞ norm</text></g>`, 'Natural norms: embeddings use maximum-row L2; linear maps use spectral norm; one-dimensional parameters use infinity norm.',448,238);
  }
  if (kind === 'mass') return svg(`<g font-family="Arial,sans-serif"><path class="architecture-branch" d="M224 55V82H79V119M224 82V119M224 82H369V119M79 149V176M224 149V176M369 149V176" fill="none" stroke="#b7c7af" stroke-width="1.4"/><rect x="165" y="20" width="118" height="36" rx="5" fill="#e8efdf" stroke="#b7c7af"/><text x="224" y="43" text-anchor="middle" font-size="13" fill="#35523a">Root mass m<tspan baseline-shift="sub" font-size="9">root</tspan></text>${['Embedding','Attention / MLP','1D weights'].map((label,i)=>`<rect x="${27+i*145}" y="113" width="104" height="37" rx="5" fill="#ffffff" stroke="${moduleColors[i]}"/><text x="${79+i*145}" y="136" text-anchor="middle" font-size="11" fill="#3d5140">${label}</text><circle class="mass-packet" cx="${79+i*145}" cy="93" r="3" fill="${moduleColors[i]}" style="--delay:${i*.25}s"/><text x="${79+i*145}" y="196" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="${moduleColors[i]}">m<tspan baseline-shift="sub" font-size="12">p</tspan> / m<tspan baseline-shift="sub" font-size="12">root</tspan></text>`).join('')}<text x="224" y="227" text-anchor="middle" font-size="10" fill="#768270">Schematic hierarchy · fixed allocation before search</text></g>`, 'A schematic module hierarchy allocates perturbation mass recursively. Each active tensor receives a fraction of the root mass.',448,246);
  const length = 136 / rho;
  return svg(`<g font-family="Arial,sans-serif"><text x="30" y="29" font-size="10" letter-spacing="1.3" fill="#788671">NATURAL-NORM PERTURBATION SIZE</text><text x="30" y="78" font-size="12" fill="#52795c">Before correction</text><rect x="30" y="94" width="136" height="14" rx="2" fill="#ccd8c5"/><path d="M166 48V194" stroke="#b7c7af" stroke-dasharray="3 4"/><text x="30" y="147" font-size="12" fill="#355939">After correction</text><rect class="sensitivity-bar" x="30" y="163" width="${length}" height="14" rx="2" fill="#50734f"/><text x="${Math.min(318,30+length+10)}" y="175" font-size="13" fill="#355939">${(1/rho).toFixed(2)}×</text><text x="30" y="221" font-size="11" fill="#73806c">Illustrated multiplier: 1 / ρ · base size held fixed</text><text x="401" y="81" text-anchor="end" font-size="28" fill="#355939">${rho.toFixed(2)}</text><text x="401" y="102" text-anchor="end" font-size="11" fill="#788671">correction ρ<tspan baseline-shift="sub" font-size="8">p</tspan></text></g>`, `Sensitivity correction ${rho.toFixed(2)} gives ${(1/rho).toFixed(2)} times the base perturbation magnitude. Illustrative input, not a measured calibration.`,448,246);
}

// Separate compact drawings preserve readable labels instead of shrinking the desktop SVG.
export function renderGeometryCompact(kind = 'norms', rho = 1) {
  if (kind === 'norms') return svg(`<g font-family="Arial,sans-serif">${[
    ['Embeddings','Maximum-row ℓ₂','#52795c'],['Linear maps','Spectral norm','#577fa5'],['1D parameters','ℓ∞ norm','#b18a4f']
  ].map(([label,norm,color],i)=>`<path d="M12 ${83+i*85}H308" stroke="#dde4d6"/><text x="117" y="${36+i*85}" font-size="14" fill="#354c3d">${label}</text><text x="117" y="${58+i*85}" font-size="13" fill="${color}">${norm}</text>`).join('')}${[0,1,2].map(row=>Array.from({length:5},(_,col)=>`<rect x="${25+col*13}" y="${26+row*12}" width="9" height="7" rx="1" fill="${row===1?'#52795c':'#d2ddcd'}"/>`).join('')).join('')}<rect class="norm-scan" x="20" y="34" width="73" height="15" fill="none" stroke="#52795c" rx="2"/><circle cx="45" cy="130" r="18" fill="none" stroke="#b3c4d2"/><ellipse class="linear-map" style="transform-origin:73px 130px" cx="73" cy="130" rx="24" ry="12" fill="#cddce8" fill-opacity=".5" stroke="#577fa5"/><path d="M52 130H94m-5-4 5 4-5 4" fill="none" stroke="#577fa5"/>${[9,17,29,13,20].map((h,i)=>`<rect x="${26+i*14}" y="${233-h}" width="8" height="${h}" rx="1.5" fill="${i===2?'#b18a4f':'#ded2bc'}"/>`).join('')}<path d="M21 201H96" stroke="#b18a4f" stroke-dasharray="3 3"/></g>`, 'Natural norms for embedding matrices, linear maps, and one-dimensional parameters.',320,259);
  if (kind === 'mass') return svg(`<g font-family="Arial,sans-serif"><rect x="98" y="14" width="124" height="35" rx="4" fill="#e8efdf" stroke="#b7c7af"/><text x="160" y="36" text-anchor="middle" font-size="13" fill="#35523a">Root mass m<tspan baseline-shift="sub" font-size="9">root</tspan></text><path d="M160 49V78H53V107M160 78V107M160 78H267V107" fill="none" stroke="#b7c7af"/>${['Embedding','Linear','1D'].map((label,i)=>`<rect x="${8+i*107}" y="106" width="90" height="34" rx="4" fill="#ffffff" stroke="${moduleColors[i]}"/><text x="${53+i*107}" y="128" text-anchor="middle" font-size="12" fill="#3d5140">${label}</text><path d="M${53+i*107} 140V165" stroke="#b7c7af"/><circle class="mass-packet" cx="${53+i*107}" cy="90" r="2.5" fill="${moduleColors[i]}" style="--delay:${i*.25}s"/><text x="${53+i*107}" y="190" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="${moduleColors[i]}">m<tspan baseline-shift="sub" font-size="11">p</tspan> / m<tspan baseline-shift="sub" font-size="11">root</tspan></text>`).join('')}<text x="160" y="224" text-anchor="middle" font-size="11" fill="#69795e">Schematic module hierarchy</text></g>`, 'Each active tensor receives a fixed fraction of root mass.',320,245);
  const length=110/rho;
  return svg(`<g font-family="Arial,sans-serif"><path d="M127 47V189" stroke="#b7c7af" stroke-dasharray="3 4"/><text x="17" y="43" font-size="13" fill="#52795c">Before correction</text><rect x="17" y="58" width="110" height="15" rx="2" fill="#ccd8c5"/><text x="17" y="123" font-size="13" fill="#355939">After correction</text><rect class="sensitivity-bar" x="17" y="138" width="${length}" height="15" rx="2" fill="#50734f"/><text x="${27+length}" y="151" font-size="14" fill="#355939">${(1/rho).toFixed(2)}×</text><text x="17" y="204" font-size="12" fill="#52795c">Correction ρ = ${rho.toFixed(2)} · base size held fixed</text></g>`, `Correction ${rho.toFixed(2)} scales perturbation magnitude by ${(1/rho).toFixed(2)}.`,320,226);
}

export function renderGeometryResponsive(kind = 'norms', rho = 1) {
  return `<div class="geometry-desktop">${renderGeometry(kind,rho)}</div><div class="geometry-mobile">${renderGeometryCompact(kind,rho)}</div>`;
}

export function renderAblation(data, kind = 'norms') {
  const control=data.controls[kind], full=data.full;
  const rows=[full,control].map((row,i)=>`<div class="ablation-row ${i===0?'ablation-full':'ablation-control'}"><div class="ablation-label"><span>${esc(row.label)}</span><strong>${row.mean.toFixed(2)} <small>± ${row.sd.toFixed(2)}</small></strong></div><div class="ablation-track" role="img" aria-label="${esc(row.label)}: ${row.mean.toFixed(2)} percent accuracy, sample standard deviation ${row.sd.toFixed(2)}"><i class="ablation-bar" style="width:${row.mean/40*100}%"></i><span class="ablation-error" style="left:${(row.mean-row.sd)/40*100}%;width:${row.sd*2/40*100}%"></span></div></div>`).join('');
  return `<div class="ablation-heading"><span>Controlled ablation</span><strong>+${(full.mean-control.mean).toFixed(2)} <small>pp</small></strong></div><p class="ablation-subtitle">Full method vs. ${esc(control.label.toLowerCase())}</p><div class="ablation-chart">${rows}<div class="ablation-axis" aria-label="Zero-based accuracy axis from 0 to 40 percent"><span>0</span><span>10</span><span>20</span><span>30</span><span>40%</span></div></div><p class="ablation-note">Countdown · N = 100 · K = 25<br>Qwen2.5-1.5B-Instruct · Mean ± SD, 3 seeds<br>Table 3(c). Mean differences; no significance claim.</p>`;
}
