import { RadarChart } from './radar-chart.js';
import { Figure2Chart } from './figure2-chart.js';
import { SectionNav } from './section-nav.js';
import { IterativeChart } from './iterative-chart.js';

const sectionNav = document.querySelector('.section-nav');
if (sectionNav) new SectionNav(sectionNav);
// Chart motion is independent of the temporarily removed Method section.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const syncMotionPreference = () => {
  const playing = !motionPreference.matches;
  document.documentElement.dataset.motion = playing ? 'running' : 'paused';
  document.dispatchEvent(new window.CustomEvent('research-motion-change', { detail: { playing } }));
};
motionPreference.addEventListener('change', syncMotionPreference);
syncMotionPreference();
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
