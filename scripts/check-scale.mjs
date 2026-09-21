import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ScaleStory } from '../assets/js/scale-story.js';
import { SCALE_TIMELINES, SCALE_TRANSFORM_TIMING, ENSEMBLE_TRANSITION_TIMING, VOTE_START } from '../assets/js/scale-timing.js';
import { MASS_GROUPS, LAYER_COUNT, tensorMass, ALLOCATION_EXAMPLE } from '../assets/js/scale-diagrams.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { JSDOM } = createRequire(resolve(root, '.local/verification/package.json'))('jsdom');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const section = document.querySelector('#scale');
const scenes = [...section.querySelectorAll('.scale-scene')];
const scene = kind => scenes.find(scene => scene.dataset.kind === kind);
const cues = [...section.querySelectorAll('.scale-cue')];
const progress = section.querySelector('.scale-progress');
assert.ok(!section.classList.contains('is-live'));
assert.equal(document.querySelector('#overview').nextElementSibling, section);
assert.equal(section.nextElementSibling.id, 'population-scaling');
assert.equal(document.querySelector('.section-nav a[href="#scale"]').textContent, 'Scale');
assert.equal(document.querySelector('#overview-method a[href="#scale"]'), null);
assert.equal(document.querySelector('#overview-method button[data-method-step="1"]').textContent, 'Scale');
assert.equal(section.querySelectorAll('.scale-algorithm').length, 1, 'One permanent algorithm remains visible across every scene');
assert.deepEqual([...section.querySelectorAll('[data-algorithm-line]')].map(row => row.dataset.algorithmLine), ['require', ...Array.from({ length: 13 }, (_, i) => String(i + 1))]);
assert.equal(section.querySelectorAll('.scale-algorithm math').length, 15);
assert.equal(section.querySelectorAll('.scale-algorithm-link').length, 14);
for (const link of section.querySelectorAll('.scale-algorithm-link')) {
  assert.ok(document.querySelector(link.getAttribute('href')), 'Each algorithm row has a native scene destination');
  assert.ok(link.getAttribute('aria-label'), 'Each row link has an accessible action name');
}
assert.ok(!section.textContent.includes('Algorithm 1 · compact notation'));
assert.deepEqual(scenes.map(scene => scene.querySelector('h3').lastChild.textContent), ['Allocate', 'Sample', 'Measure', 'Scale', 'Unchanged']);
assert.equal(cues.length, 5, 'Scroll selects tabs, not the internal allocation frames');
assert.equal(scene('measure').querySelectorAll('.scale-norm-formula math').length, 5);
assert.equal(section.querySelectorAll('.katex-error').length, 0);
assert.equal(scene('allocate').querySelectorAll('.allocation-static > li').length, 5);
assert.equal(scene('scale').querySelectorAll('.scale-normalization-connector').length, 2);
assert.deepEqual([...scene('scale').querySelectorAll('[data-normalization-step]')].map(el => el.dataset.normalizationStep), ['noise', 'normalize', 'scale']);
assert.equal(SCALE_TRANSFORM_TIMING.normalize, SCALE_TRANSFORM_TIMING.firstArrow + SCALE_TRANSFORM_TIMING.arrowDuration, 'Normalization waits for the first arrow to finish');
assert.equal(SCALE_TRANSFORM_TIMING.secondArrow, SCALE_TRANSFORM_TIMING.normalize + SCALE_TRANSFORM_TIMING.normalizeDuration, 'The second arrow waits for normalization to finish');
assert.equal(SCALE_TRANSFORM_TIMING.scale, SCALE_TRANSFORM_TIMING.secondArrow + SCALE_TRANSFORM_TIMING.arrowDuration, 'Scaling waits for the second arrow to finish');
assert.equal(ENSEMBLE_TRANSITION_TIMING.arrowStart, ENSEMBLE_TRANSITION_TIMING.selectionStart + ENSEMBLE_TRANSITION_TIMING.selectionDuration, 'The voting arrow waits for TopK selection to finish');
assert.equal(VOTE_START, ENSEMBLE_TRANSITION_TIMING.arrowStart + ENSEMBLE_TRANSITION_TIMING.arrowDuration, 'Voting waits for the connector to finish');
assert.ok(scene('unchanged').querySelector('.scale-flow-arrow .scale-arrow-line'));
assert.deepEqual(SCALE_TIMELINES.allocate.events.map(event => event.at), [0, 1560, 3120, 4680, 6240]);
assert.deepEqual(SCALE_TIMELINES.measure.events.map(event => event.at), [0, 1200, 2400]);
assert.deepEqual(SCALE_TIMELINES.scale.events.map(event => event.at), [0, 1200, 2400, 3600, 4800]);
for (const view of ['.allocation-live', '.allocation-static']) {
  assert.equal(scene('allocate').querySelector(`${view} .allocation-example annotation`).textContent, String.raw`m_{\mathrm Q}=\dfrac{1/2}{28}\times\dfrac14\times1=\dfrac1{224}`);
  assert.deepEqual([...scene('allocate').querySelectorAll(`${view} [data-calculation]`)].map(row => row.dataset.calculation), ['mass', 'scale']);
  assert.match(scene('allocate').querySelector(`${view} .allocation-total-mass annotation`).textContent, /m_\{\\mathcal M\}.*=3\.2$/);
  assert.match(scene('allocate').querySelector(view).textContent, /is set once by a Jacobian-based calibration on 64 Countdown prompts and bounded to/);
  assert.match(scene('allocate').querySelector(view).textContent, /See Section 3\.2 and Appendix A\./);
  assert.equal(scene('allocate').querySelector(`${view} .allocation-correction`), null);
}
assert.ok(!scene('unchanged').textContent.includes('RMSNorm-only perturbs only RMSNorm weights.'));
assert.equal(scene('unchanged').querySelector('.method-voting').outerHTML, document.querySelector('#overview-method .method-diagram-desktop .method-voting').outerHTML, 'The vote diagram is exactly the Overview drawing');
assert.ok(progress.hidden);
scenes.forEach(scene => assert.ok(scene.querySelector('.scale-playback').hidden));

// Table A2 and Eq. (20): mass is conserved through each level, including fused
// logical modules and modules represented by several physical tensors.
assert.deepEqual(MASS_GROUPS.map(({ label, mass }) => [label, mass]), [
  ['Embedding', 1], ['Attention', .5], ['MLP', .5], ['Head', 1], ['Norm', .1], ['Other', .1],
]);
assert.equal(LAYER_COUNT, 28);
const share = (multiplicity, physicalTensors = 1, totalMultiplicity = 4) => tensorMass({ groupMass: .5, layers: LAYER_COUNT, multiplicity, totalMultiplicity, physicalTensors });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} should equal ${b}`);
close(share(1) * 4 * LAYER_COUNT, .5);
close(share(1), 1 / 224);
close(ALLOCATION_EXAMPLE.qMass, 1 / 224);
close(ALLOCATION_EXAMPLE.modelMass, 3.2);
close(ALLOCATION_EXAMPLE.modelMass / ALLOCATION_EXAMPLE.qMass, 716.8);
close(share(1, 2) * 2, share(1));
close(share(3), 3 * share(1));
close(share(3) + share(1), .5 / LAYER_COUNT);
close(share(2, 1, 3) + share(1, 1, 3), .5 / LAYER_COUNT);
const groups = scene('allocate').querySelector('[data-tree-phase="2"]');
const bars = [...groups.children].filter(el => el.tagName === 'rect' && el.getAttribute('y') === '98');
bars.forEach((bar, i) => close(Number(bar.getAttribute('width')) / 80, MASS_GROUPS[i].mass));
assert.equal(scene('allocate').querySelectorAll('[data-tree-phase="3"] rect').length, 2 * LAYER_COUNT);
const katexCSS = await readFile(resolve(root, 'assets/vendor/katex/katex.min.css'), 'utf8');
for (const [, file] of katexCSS.matchAll(/url\(([^)]+)\)/g)) await access(resolve(root, 'assets/vendor/katex', file));

const layout = new window.EventTarget(), reduced = new window.EventTarget();
layout.matches = true; reduced.matches = false;
window.matchMedia = query => query.includes('reduced-motion') ? reduced : layout;
Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
document.documentElement.dataset.motion = 'running';
let scroll = 0, now = 0, timerId = 0, stageVisible = true;
const timers = new Map();
Object.defineProperty(window, 'scrollY', { get: () => scroll });
Object.defineProperty(window.performance, 'now', { value: () => now });
window.setTimeout = (callback, delay) => { const id = ++timerId; timers.set(id, { callback, at: now + delay }); return id; };
window.clearTimeout = id => timers.delete(id);
const advance = ms => {
  const end = now + ms;
  while (true) {
    const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
    if (!next || next[1].at > end) break;
    timers.delete(next[0]); now = next[1].at; next[1].callback();
  }
  now = end;
};
const offsets = cues.map(cue => Number(cue.style.getPropertyValue('--cue-index')) * 200);
cues.forEach((cue, i) => { cue.getBoundingClientRect = () => ({ top: 1450 + offsets[i] - scroll, bottom: 1650 + offsets[i] - scroll }); });
section.querySelector('.scale-sticky').getBoundingClientRect = () => {
  const top = stageVisible ? Math.max(100, 1100 - scroll) : 1200;
  return { top, bottom: top + 700 };
};
let observer, scrollRequest;
window.IntersectionObserver = class {
  constructor(callback, options) { this.callback = callback; this.options = options; this.targets = new Set(); observer = this; }
  observe(target) { this.targets.add(target); }
  disconnect() { this.targets.clear(); }
  emit() { this.callback([...this.targets].reverse().map(target => ({ target, isIntersecting: true }))); }
};
window.scrollTo = options => { scrollRequest = options; scroll = options.top; observer.emit(); };
const story = new ScaleStory(section);
const phase = kind => scene(kind).dataset.phase;
const currentLine = () => section.querySelector('.is-current')?.dataset.algorithmLine;
const currentLines = () => [...section.querySelectorAll('.is-current')].map(row => row.dataset.algorithmLine);
const goto = kind => { scroll = 1005 + offsets[scenes.indexOf(scene(kind))]; observer.emit(); };
assert.ok(section.classList.contains('is-live'));
assert.equal(section.dataset.inView, 'false');
assert.equal(timers.size, 0, 'Animations do not run before the scene is visible');
assert.equal(observer.targets.size, 6);
goto('allocate');
assert.equal(currentLine(), 'require', 'Playback begins with Fix before search');
assert.equal(phase('allocate'), '1');
goto('measure');
assert.equal(currentLine(), '3');
advance(600);
observer.emit();
advance(600);
assert.equal(phase('measure'), '2', 'An observer update inside the same tab must not reset playback');
advance(1200);
assert.equal(phase('measure'), '3');

goto('allocate');
assert.equal(phase('allocate'), '1');
assert.equal(currentLine(), 'require');
advance(1560);
assert.equal(phase('allocate'), '2', 'Allocation begins branching after 1.56 seconds without further scrolling');
scene('allocate').querySelector('[data-scale-toggle]').click();
advance(30000);
assert.equal(phase('allocate'), '2', 'Pause freezes the timeline');
assert.equal(scene('allocate').dataset.running, 'false');
scene('allocate').querySelector('[data-scale-toggle]').click();
advance(1560);
assert.equal(phase('allocate'), '3');
stageVisible = false; observer.emit();
advance(30000);
assert.equal(phase('allocate'), '3', 'Offscreen playback retains its elapsed time');
stageVisible = true; observer.emit();
advance(1560);
assert.equal(phase('allocate'), '4');
Object.defineProperty(document, 'hidden', { configurable: true, value: true });
document.dispatchEvent(new window.Event('visibilitychange'));
advance(30000);
assert.equal(phase('allocate'), '4', 'Background tabs do not finish the animation');
Object.defineProperty(document, 'hidden', { configurable: true, value: false });
document.dispatchEvent(new window.Event('visibilitychange'));
advance(1560);
assert.equal(phase('allocate'), '5');
assert.deepEqual(currentLines(), ['require', '4'], 'The final calculation links the fixed scale and its use in line 4');
assert.equal(section.querySelectorAll('.scale-algorithm-marker:not([hidden])').length, 2);
advance(1860);
assert.equal(scene('allocate').dataset.complete, 'true');
assert.equal(scene('allocate').dataset.running, 'false');
const priorScroll = scroll;
scene('allocate').querySelector('[data-scale-replay]').click();
assert.equal(phase('allocate'), '1');
assert.deepEqual(currentLines(), ['require'], 'Replay clears the secondary highlight');
assert.equal(section.querySelectorAll('.scale-algorithm-marker:not([hidden])').length, 1);
assert.equal(scroll, priorScroll, 'Replay never changes the scroll position');
advance(400);
scroll += 50; observer.emit(); advance(1160);
assert.equal(phase('allocate'), '2', 'Scrolling inside Allocate does not seek or restart its movie');

goto('scale');
assert.deepEqual(currentLines(), ['4'], 'Switching scenes clears the allocation pair');
let scaleElapsed = 0;
for (const event of SCALE_TIMELINES.scale.events) {
  advance(event.at - scaleElapsed); scaleElapsed = event.at;
  assert.equal(phase('scale'), String(event.phase));
  assert.equal(currentLine(), '4', 'Both arrow steps keep the perturbation formula highlighted');
}
advance(SCALE_TIMELINES.scale.duration - scaleElapsed);
assert.equal(scene('scale').dataset.complete, 'true');

goto('unchanged');
let elapsed = 0;
for (const event of SCALE_TIMELINES.unchanged.events) {
  advance(event.at - elapsed); elapsed = event.at;
  assert.equal(currentLine(), event.line, 'Unchanged follows construction, scoring, selection, generation, and voting');
}
advance(SCALE_TIMELINES.unchanged.duration - elapsed);
assert.equal(scene('unchanged').dataset.complete, 'true');
assert.equal(timers.size, 0);
section.querySelector('[data-scale-step="1"]').click();
assert.equal(scrollRequest.behavior, 'instant');
assert.equal(phase('allocate'), '1');
goto('sample'); goto('scale'); goto('measure');
assert.equal(phase('measure'), '1', 'Returning to a tab starts a new viewing');
assert.equal(timers.size, 1, 'Inactive scenes cannot leave timers running');

const clickLine = line => section.querySelector(`[data-algorithm-line="${line}"] .scale-algorithm-link`).click();
clickLine('4');
assert.equal(section.dataset.active, scene('scale').dataset.step);
assert.equal(phase('scale'), '1');
assert.equal(currentLine(), '4');
clickLine('8');
assert.equal(section.dataset.active, scene('unchanged').dataset.step);
assert.equal(phase('unchanged'), '3', 'Clicking TopK starts at selection, without replaying earlier construction');
assert.equal(currentLine(), '8');
assert.equal(scene('unchanged').style.getPropertyValue('--scale-seek'), '2500ms', 'CSS animations seek with the JS timeline');
advance(1200);
assert.equal(phase('unchanged'), '4');
scene('unchanged').querySelector('[data-scale-toggle]').click();
advance(5000);
assert.equal(phase('unchanged'), '4', 'Pause also works after entering from an algorithm row');
scene('unchanged').querySelector('[data-scale-toggle]').click();
advance(1200);
assert.equal(phase('unchanged'), '5');
clickLine('11');
assert.equal(phase('unchanged'), '6');
assert.equal(currentLine(), '11');
advance(1700);
assert.equal(scene('unchanged').dataset.complete, 'true');
scene('unchanged').querySelector('[data-scale-replay]').click();
assert.equal(phase('unchanged'), '1', 'Replay restores the full scene after a row jump');
assert.equal(scene('unchanged').style.getPropertyValue('--scale-seek'), '0ms');
clickLine('require');
assert.equal(phase('allocate'), '1');
assert.deepEqual(currentLines(), ['require']);
assert.equal(timers.size, 1);

const assertReadingOrder = () => {
  assert.ok(!section.classList.contains('is-live'));
  assert.ok(progress.hidden);
  assert.ok([...section.querySelectorAll('.scale-algorithm-marker')].every(marker => marker.hidden));
  assert.ok(scenes.every(scene => !scene.hasAttribute('aria-hidden') && !scene.hasAttribute('inert')));
};
reduced.matches = true; reduced.dispatchEvent(new window.Event('change'));
assertReadingOrder();
assert.ok(!section.classList.contains('has-playback'));
assert.ok(scenes.every(scene => scene.dataset.animated === 'false'));
assert.equal(timers.size, 0);
reduced.matches = false; reduced.dispatchEvent(new window.Event('change'));
layout.matches = false; layout.dispatchEvent(new window.Event('change'));
assertReadingOrder();
assert.ok(section.classList.contains('has-playback'), 'Stacked mobile scenes retain Replay');
layout.matches = true; layout.dispatchEvent(new window.Event('change'));
document.dispatchEvent(new window.CustomEvent('research-motion-change', { detail: { playing: false } }));
assertReadingOrder();
document.dispatchEvent(new window.CustomEvent('research-motion-change', { detail: { playing: true } }));
assert.ok(section.classList.contains('is-live'));
story.destroy();
assert.equal(observer.targets.size, 0);
assert.equal(timers.size, 0);
assertReadingOrder();
delete window.IntersectionObserver;
const fallback = new ScaleStory(section);
assertReadingOrder();
assert.ok(!section.classList.contains('has-playback'));
fallback.destroy();
dom.window.close();
console.log('Passed: linked algorithm, symbolic calibration, shared vote diagram, paper mass conservation, timed playback, row navigation, pause/replay, scroll independence, visibility, motion preferences, and cleanup.');
