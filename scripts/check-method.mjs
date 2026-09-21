import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MethodAnimation } from '../assets/js/method-animation.js';
import { renderMethodFigure, METHOD_DURATIONS, METHOD_TIMING, methodStepDuration } from '../assets/js/method-svg.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(resolve(root,'index.html'),'utf8');
assert.ok(html.includes(renderMethodFigure()), 'The static illustration matches its generator');
const { JSDOM } = createRequire(resolve(root,'.local/verification/package.json'))('jsdom');

for (const reduced of [false, true]) {
  const dom = new JSDOM(html,{pretendToBeVisual:true});
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  document.documentElement.dataset.motion = reduced ? 'paused' : 'running';
  const preference = new window.EventTarget();
  preference.matches = reduced;
  window.matchMedia = () => preference;
  let observer;
  window.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; observer = this; }
    observe(target) { this.target = target; }
    disconnect() { this.target = null; }
    emit(visible) { this.callback([{target:this.target,isIntersecting:visible,intersectionRatio:visible ? 1 : 0}]); }
  };
  let now = 0, timerId = 0;
  const timers = new Map();
  Object.defineProperty(window.performance,'now',{value:()=>now});
  window.setTimeout = (callback,delay) => { const id = ++timerId; timers.set(id,{callback,at:now+delay}); return id; };
  window.clearTimeout = id => timers.delete(id);
  const advance = duration => {
    const end = now + duration;
    while (true) {
      const next = [...timers].sort((a,b)=>a[1].at-b[1].at)[0];
      if (!next || next[1].at > end) break;
      timers.delete(next[0]); now = next[1].at; next[1].callback();
    }
    now = end;
  };
  const figure = document.querySelector('#overview-method');
  const randoptLink = document.querySelector('.overview-explanation a');
  assert.equal(randoptLink.getAttribute('href'),'https://thickets.mit.edu/');
  assert.equal(randoptLink.getAttribute('target'),null);
  for (const diagram of figure.querySelectorAll('.method-diagram')) {
    assert.equal(diagram.querySelectorAll('.method-candidate').length,9);
    assert.equal(diagram.querySelectorAll('.method-candidate[data-selected="true"]').length,3);
    assert.deepEqual([...diagram.querySelectorAll('[data-selected-candidate]')].map(frame=>Number(frame.dataset.selectedCandidate)),[3,5,7]);
    assert.deepEqual([...diagram.querySelectorAll('[data-voter]')].map(voter=>Number(voter.dataset.voter)),[3,5,7]);
    assert.deepEqual([...diagram.querySelectorAll('.method-voter .method-answer')].map(answer=>answer.textContent),['A','A','B']);
    assert.equal(diagram.querySelector('.method-answer-final').textContent,'A');
  }
  assert.equal(figure.dataset.enhanced,undefined,'All five steps are available before JavaScript enhancement');
  const animation = new MethodAnimation(figure);
  const mobileHeight = () => Number(figure.querySelector('.method-diagram-mobile').getAttribute('viewBox').split(' ')[3]);
  assert.equal(mobileHeight(), reduced ? 1105 : 204, 'Mobile reserves space only for revealed steps; reduced motion shows the full method');
  const diagram = figure.querySelector('.method-diagram-desktop');
  const fills = selector => [...diagram.querySelectorAll(`${selector} .method-matrix-cell`)].map(cell=>cell.getAttribute('fill'));
  const pattern = colors => colors.map(color=>colors.indexOf(color));
  const assertDraw = draw => {
    assert.equal(animation.draw,draw);
    assert.equal(diagram.querySelectorAll('.method-sample-transfer').length,9,'Each index has its own model packet');
    assert.deepEqual(fills('.method-source'),fills('.method-shaped'),'The received perturbation preserves the current noise pattern');
    assert.deepEqual(fills('.method-source'),fills('.method-noise-transfer'));
    assert.deepEqual(fills(`.method-sample-transfer[data-transfer-candidate="${draw}"]`),fills(`[data-candidate="${draw}"]`),'The packet belongs to the matching candidate');
    assert.deepEqual(pattern(fills('.method-source')),pattern(fills(`[data-candidate="${draw}"]`)),'Noise and its candidate share the same tile pattern across their palettes');
    assert.ok([...figure.querySelectorAll('[data-method-index]')].every(label=>label.textContent===String(draw)));
  };
  assert.equal(animation.phase,0);
  assert.equal(timers.size,0,'Offscreen and reduced-motion views do not advance');
  observer.emit(true);
  if (reduced) {
    advance(10000);
    assert.equal(animation.phase,0);
    assert.equal(animation.toggle.disabled,true);
    figure.querySelector('[data-method-step="3"]').click();
    assert.equal(animation.phase,3,'Reduced-motion users can inspect any step');
    assert.equal(figure.dataset.animate,'false');
  } else {
    assertDraw(1);
    const firstPattern = fills('.method-source');
    const sourcePatterns = new Set();
    advance(1000);
    animation.toggle.click();
    advance(10000);
    assert.equal(animation.phase,0,'Pause holds the current stage');
    animation.toggle.click();
    advance(METHOD_DURATIONS[0] - 1000 - 1);
    assert.equal(animation.phase,0,'Resume preserves elapsed stage time');
    advance(1);
    assert.equal(animation.phase,1);
    assert.equal(mobileHeight(),444);
    observer.emit(false);
    advance(5000);
    assert.equal(animation.phase,1,'Offscreen playback is paused');
    observer.emit(true);
    advance(METHOD_DURATIONS[1]);
    assert.equal(animation.phase,2);
    assert.equal(mobileHeight(),584, 'Unfilled candidate rows do not reserve blank space');
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    document.dispatchEvent(new window.Event('visibilitychange'));
    advance(5000);
    assert.equal(animation.phase,2,'Hidden tabs do not advance');
    Object.defineProperty(document,'hidden',{configurable:true,value:false});
    document.dispatchEvent(new window.Event('visibilitychange'));
    for (let draw=1; draw<=9; draw+=1) {
      assert.equal(animation.phase,2,'Subsequent sends do not replay Noise or Scale');
      assertDraw(draw);
      sourcePatterns.add(fills('.method-source').join(','));
      assert.equal(diagram.querySelectorAll('[data-candidate-state="complete"]').length,draw-1);
      assert.equal(diagram.querySelectorAll('[data-candidate-state="upcoming"]').length,9-draw);
      assert.equal(diagram.querySelectorAll('[data-candidate-state="current"]').length,1);
      assert.equal(diagram.querySelector('[data-candidate-state="current"]').dataset.candidate,String(draw));
      if (draw===2) {
        advance(200);
        animation.toggle.click();
        advance(3000);
        assertDraw(2);
        animation.toggle.click();
        advance(methodStepDuration(2,draw)-201);
        assertDraw(2);
        advance(1);
      } else if (draw===9) {
        advance(METHOD_TIMING.sampleTravel+METHOD_TIMING.arrive);
        assert.equal(animation.phase,2,'Selection waits after the last candidate finishes appearing');
        advance(949);
        assert.equal(animation.phase,2,'The completed population remains visible for the extended hold');
        assert.equal(diagram.querySelector('.method-selection').dataset.stageState,'upcoming');
        advance(1);
      } else {
        advance(methodStepDuration(2,draw));
      }
    }
    assert.equal(sourcePatterns.size,9,'The noise colors change with all nine indices');
    assert.equal(new Set(Array.from({length:9},(_,index)=>fills(`[data-candidate="${index+1}"]`).join(','))).size,9);
    assert.equal(animation.phase,3);
    assert.equal(diagram.querySelectorAll('[data-candidate-state="complete"]').length,9,'Selection starts only after all nine candidates arrive');
    advance(METHOD_DURATIONS[3]);
    assert.equal(animation.phase,4);
    advance(METHOD_DURATIONS[4]);
    assert.equal(animation.complete,true);
    assert.equal(figure.dataset.playing,'false');
    assert.ok(animation.stages.every(stage=>stage.dataset.stageState==='complete'));
    animation.replay.click();
    assert.equal(animation.phase,0);
    assert.equal(animation.draw,1);
    assert.deepEqual(fills('.method-source'),firstPattern,'Replay restores the first draw’s colors');
    assert.equal(diagram.querySelectorAll('[data-candidate-state="upcoming"]').length,9,'Replay clears the entire population');
    assert.equal(animation.complete,false);
    figure.querySelector('[data-method-step="3"]').click();
    advance(10000);
    assert.equal(animation.phase,3,'Manual selection stays on the requested step');
    assert.equal(figure.querySelector('[data-method-step="3"]').getAttribute('aria-pressed'),'true');
    assert.match(figure.querySelector('[data-method-announcement]').textContent,/Select the top K/);
    animation.toggle.click();
    assert.equal(figure.dataset.animate,'true');
    advance(2000);
    assert.equal(animation.phase,4);
    preference.matches = true;
    preference.dispatchEvent(new window.Event('change'));
    assert.equal(animation.toggle.disabled,true);
    assert.equal(animation.replay.disabled,true);
    assert.equal(figure.dataset.animate,'false');
    assert.equal(timers.size,0);
    preference.matches = false;
    preference.dispatchEvent(new window.Event('change'));
    assert.equal(animation.replay.disabled,false);
    document.dispatchEvent(new window.CustomEvent('research-motion-change',{detail:{playing:false}}));
    assert.equal(figure.dataset.playing,'false');
    assert.equal(timers.size,0);
  }
  animation.destroy();
  assert.equal(timers.size,0);
  assert.equal(observer.target,null);
  dom.window.close();
}
delete globalThis.window;
delete globalThis.document;
console.log('Passed: detailed first draw, nine sends with synchronized indices, accumulated candidates, extended selection hold, pause/resume, replay, visibility, reduced motion, and cleanup.');
