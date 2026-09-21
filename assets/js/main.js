import { RadarChart } from './radar-chart.js';
import { Figure2Chart } from './figure2-chart.js?v=chart-reveal-3';
import { SectionNav } from './section-nav.js';
import { IterativeChart } from './iterative-chart.js?v=chart-reveal-3';
import { MethodAnimation } from './method-animation.js?v=scale-controls-2';
import { ScaleStory } from './scale-story.js?v=allocation-timing-14';

const sectionNav = document.querySelector('.section-nav');
if (sectionNav) new SectionNav(sectionNav);
// Shared motion preference; each illustration controls its own playback.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const syncMotionPreference = () => {
  const playing = !motionPreference.matches;
  document.documentElement.dataset.motion = playing ? 'running' : 'paused';
  document.dispatchEvent(new window.CustomEvent('research-motion-change', { detail: { playing } }));
};
motionPreference.addEventListener('change', syncMotionPreference);
syncMotionPreference();
const method = document.querySelector('#overview-method');
if (method) {
  try { new MethodAnimation(method); }
  catch (error) {
    method.removeAttribute('data-enhanced');
    method.removeAttribute('data-animate');
    method.querySelector('.method-playback').hidden = true;
    method.querySelector('.method-step-controls').hidden = true;
    console.error('Using the static method illustration.', error);
  }
}
const scale = document.querySelector('#scale');
if (scale) {
  try { new ScaleStory(scale); }
  catch (error) {
    scale.classList.remove('is-live', 'has-playback');
    delete scale.dataset.active;
    delete scale.dataset.allocation;
    delete scale.dataset.inView;
    scale.querySelector('.scale-progress').hidden = true;
    scale.querySelector('.scale-algorithm-marker').hidden = true;
    scale.querySelectorAll('.scale-scene').forEach(scene => {
      scene.removeAttribute('aria-hidden');
      scene.removeAttribute('inert');
      scene.dataset.animated = 'false';
      scene.querySelector('.scale-playback').hidden = true;
    });
    console.error('Using the static scale explanation.', error);
  }
}
const figure2 = document.querySelector('#figure2');
if (figure2) {
  try { new Figure2Chart(figure2); }
  catch (error) {
    figure2.querySelectorAll('.figure2-row').forEach((row) => row.removeAttribute('data-reveal'));
    figure2.querySelector('[data-figure2-replay]').hidden = true;
    console.error('Using the complete static Figure 2.', error);
  }
}

const iterative = document.querySelector('#iterative-chart');
if (iterative) {
  try { new IterativeChart(iterative); }
  catch (error) {
    iterative.querySelectorAll('.figure2-row').forEach((row) => row.removeAttribute('data-reveal'));
    iterative.querySelector('[data-figure2-replay]').hidden = true;
    console.error('Using the static iterative comparison.', error);
  }
}

const root = document.querySelector('#radar-component');
try {
  const response = await fetch(new URL('../data/transfer-results.json', import.meta.url));
  if (!response.ok) throw new Error(`Unable to load chart data (${response.status}).`);
  const data = await response.json();
  new RadarChart(root, data);
} catch (error) {
  // Keep the static chart available if interactive enhancement fails.
  console.error('Interactive chart unavailable; showing the static chart.', error);
  root.querySelector('#radar-mount').replaceChildren();
  root.querySelector('#radar-fallback').hidden = false;
  root.querySelectorAll('[data-interactive]').forEach((element) => { element.hidden = true; });
}
