import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mainRunBudget, iterativeX, renderIterativePanel } from '../assets/js/iterative-svg.js';
import { IterativeChart } from '../assets/js/iterative-chart.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(await readFile(resolve(root,'assets/data/iterative-baselines.json'),'utf8'));
const expectedBudgets={countdown:[57500,601500,637500,601500,609500,609500,601500],gsm8k:[52975,601175,632975,601319,609319,609319,601319]};
for(const task of data.tasks) {
  assert.deepEqual(task.points.map(p=>mainRunBudget(data,task,p)),expectedBudgets[task.id]);
  assert.equal(task.points.find(p=>p.method==='mezo').mean,null);
  for(const p of task.points.filter(p=>p.mean!=null)) {
    assert.ok(p.mean-p.sd>=task.domain[0] && p.mean+p.sd<=task.domain[1]);
    assert.ok(mainRunBudget(data,task,p)<=700000);
  }
  assert.equal(await readFile(resolve(root,`assets/figures/iterative-${task.id}.svg`),'utf8'),renderIterativePanel(data,task,{interactive:false}));
}
assert.equal((601500/57500).toFixed(2),'10.46');
assert.equal((601319/52975).toFixed(2),'11.35');
assert.ok(Math.abs(iterativeX(400000)-2*iterativeX(200000))<1e-9,'Budget axis is linear');
let tex;
try { tex=await readFile(resolve(root,'../main (1).tex'),'utf8'); } catch(error) { if(error.code!=='ENOENT') throw error; }
if(tex) {
  const primary=tex.split('\\sbox{\\iterativebaselinebox}{')[1].split('\\end{tabular*}')[0];
  let compared=0;
  for(const task of data.tasks) {
    const block=primary.split(`{${task.label}}`)[1].split('\\midrule')[0].replace(/\\boldsymbol\{([^{}]*)\}/g,'$1');
    const rows=[...block.matchAll(/(Iterative ES|ZO-Finetuner|MeZO|MN RandOpt)\s*&\s*([\d,]+)\s*&\s*(\d+)\s*&\s*([^&]+)&/g)];
    assert.equal(rows.length,6);
    for(const [,name,n,k,score] of rows) {
      const method=name==='MN RandOpt'?(k==='1'?'modular_single':'modular'):{'Iterative ES':'es','ZO-Finetuner':'zo','MeZO':'mezo'}[name];
      const point=task.points.find(p=>p.method===method&&p.n===Number(n.replaceAll(',',''))&&p.k===Number(k));
      assert.ok(point);
      const pair=score.match(/([\d.]+)\\pm([\d.]+)/);
      assert.equal(point.mean,pair?Number(pair[1]):null);
      assert.equal(point.sd,pair?Number(pair[2]):null);
      compared++;
    }
  }
  const appendix=tex.split('\\label{tab:es_full_endpoints}')[1].split('\\end{tabular}')[0];
  const row=appendix.match(/MN RandOpt\s*&\s*25\s*&\s*\$([\d.]+)\\pm([\d.]+)\$\s*&\s*\$([\d.]+)\\pm([\d.]+)\$/);
  assert.ok(row);
  data.tasks.forEach((task,i)=>{
    const point=task.points.find(p=>p.id==='mn3000');
    assert.deepEqual([point.mean,point.sd],[Number(row[1+i*2]),Number(row[2+i*2])]);
  });
  assert.equal(compared,12);
}
const {JSDOM}=createRequire(resolve(root,'.local/verification/package.json'))('jsdom');
const dom=new JSDOM(await readFile(resolve(root,'index.html'),'utf8'),{pretendToBeVisual:true});
globalThis.window=dom.window;
globalThis.document=window.document;
window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
class Observer {
  constructor(fn){this.fn=fn;}
  observe(){}
  disconnect(){}
  emit(target){this.fn([{target,isIntersecting:true,intersectionRatio:.8}]);}
}
window.IntersectionObserver=Observer;
document.documentElement.dataset.motion='running';
const figure=document.querySelector('#iterative-chart');
const chart=new IterativeChart(figure);
const tooltip=figure.querySelector('#iterative-tooltip');
const point=id=>figure.querySelector(`[data-iterative-point='${id}']`);
assert.equal(figure.querySelectorAll('.iterative-point').length,12);
assert.equal(figure.querySelectorAll('.iterative-curve').length,2);
assert.equal(figure.querySelectorAll('.iterative-error').length,12);
assert.equal(figure.querySelector('[data-iterative-series="mezo"]'),null,'Unreported scores are not drawn as zero');
assert.match(figure.querySelector('.iterative-unreported').textContent,/MeZO.*not reported/);
chart.motion.observer.emit(chart.motion.rows[0]);
assert.equal(chart.motion.rows[0].dataset.reveal,'playing');
assert.equal(chart.motion.rows[1].dataset.reveal,'waiting');
point('countdown-mn100').focus();
assert.equal(tooltip.hidden,false);
assert.match(tooltip.textContent,/38\.40 ± 2\.71%/);
assert.match(tooltip.textContent,/57,500/);
assert.equal(point('countdown-mn100').getAttribute('aria-describedby'),'iterative-tooltip');
assert.equal(figure.querySelector('[data-iterative-series="es"]').style.opacity,'0.18');
point('gsm8k-es').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
assert.match(tooltip.textContent,/73\.11 ± 0\.52%/);
assert.match(tooltip.textContent,/601,319/);
point('gsm8k-mnmatched').dispatchEvent(new window.MouseEvent('pointerover',{bubbles:true,clientX:300,clientY:100}));
assert.match(tooltip.textContent,/601,175/);
document.body.dispatchEvent(new window.MouseEvent('pointerdown',{bubbles:true}));
assert.equal(tooltip.hidden,true);
const es=figure.querySelector('[data-iterative-method="es"]');
es.click();
assert.equal(es.getAttribute('aria-pressed'),'true');
assert.equal(figure.querySelector('[data-iterative-series="modular"]').style.opacity,'0.18');
es.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
assert.equal(es.getAttribute('aria-pressed'),'false');
assert.equal(figure.querySelector('[data-iterative-series="modular"]').style.opacity,'1');
chart.motion.replay.click();
assert.equal(chart.motion.rows[0].dataset.reveal,'playing');
document.dispatchEvent(new window.CustomEvent('research-motion-change',{detail:{playing:false}}));
assert.ok(chart.motion.rows.every(row=>row.dataset.reveal==='complete'));
chart.destroy();
dom.window.close();
console.log('Passed: iterative results match TeX; main-run budget accounting, unreported MeZO, SDs, static SVGs, reveal, tooltip, legend, keyboard/tap, and pause.');
