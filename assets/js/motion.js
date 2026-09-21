import { renderCode, renderSampling } from './research-visuals.js';

const stages = [
  ['Generate candidates', 'Draw Gaussian directions, normalize each active tensor with its natural norm, then scale it using the fixed architecture-aware profile.'],
  ['Evaluate on the selection set', 'Score every candidate on the target task’s selection examples. The calibration profile transfers; this scoring remains task specific.'],
  ['Keep the top K experts', 'Rank the candidates by selection score and retain K experts. This schematic keeps seeds 04, 02, and 06.'],
  ['Combine predictions', 'On a new input, every selected expert produces an answer. Plurality voting chooses the most frequent answer: here, A.'],
];

export class MotionManager {
  constructor(root = document) {
    this.root = root;
    this.media = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.playing = !this.media.matches;
    this.stage = 0;
    this.mode = 'modular';
    this.replay = true;
    this.timer = null;
    this.method = root.querySelector('#method-demo');
    if (!this.method) return;
    this.scenes = [...root.querySelectorAll('.motion-scene')];
    this.toggleButtons = [...root.querySelectorAll('[data-motion-toggle]')];
    this.renderStage();
    this.toggleButtons.forEach((button) => {
      button.hidden = false;
      button.addEventListener('click', () => this.setPlaying(!this.playing));
    });
    root.querySelectorAll('[data-motion-step]').forEach((button) => {
      button.hidden = false;
      button.addEventListener('click', () => { this.setPlaying(false); this.setStage(Number(button.dataset.motionStep), true); });
    });
    root.querySelectorAll('[data-motion-replay]').forEach((button) => {
      button.hidden = false;
      button.addEventListener('click', () => {
        this.replay = !this.replay;
        this.method.dataset.replay = this.replay ? 'a' : 'b';
        this.setStage(0, true);
        this.setPlaying(!this.media.matches);
      });
    });
    root.querySelectorAll('button[data-sampler]').forEach((button) => {
      button.hidden = false;
      button.addEventListener('click', () => this.setMode(button.dataset.sampler));
    });
    if ('IntersectionObserver' in window) {
      this.observer = new window.IntersectionObserver((entries) => {
        entries.forEach((entry) => { entry.target.dataset.visible = String(entry.isIntersecting); });
        this.schedule();
      }, { threshold: .08 });
      this.scenes.forEach((scene) => this.observer.observe(scene));
    } else this.scenes.forEach((scene) => { scene.dataset.visible = 'true'; });
    this.onVisibility = () => { this.updateMotionState(); this.schedule(); };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.onPreference = () => { if (this.media.matches) this.setPlaying(false); };
    this.media.addEventListener('change', this.onPreference);
    this.setPlaying(this.playing);
  }

  setPlaying(playing) {
    this.playing = playing;
    if (playing) {
      document.documentElement.dataset.motionEnabled = 'true';
      this.method.dataset.manual = 'false';
    }
    this.toggleButtons.forEach((button) => {
      button.textContent = playing ? 'Pause animations' : 'Play animations';
    });
    this.updateMotionState();
    document.dispatchEvent(new window.CustomEvent('research-motion-change', { detail: { playing } }));
    this.schedule();
  }

  updateMotionState() {
    document.documentElement.dataset.motion = this.playing && !document.hidden ? 'running' : 'paused';
  }

  setStage(stage, announce = false) {
    this.stage = stage;
    this.method.dataset.manual = String(announce && !this.playing);
    this.renderStage();
    if (announce) this.root.querySelector('#motion-announcement').textContent = `${stages[stage][0]}. ${this.description()}`;
  }

  description() {
    return this.stage === 0 && this.mode === 'randopt'
      ? 'Draw isotropic Gaussian noise with one global scale within each candidate. Different candidates can use different assigned global scales.'
      : stages[this.stage][1];
  }

  setMode(mode) {
    if (!['modular', 'randopt'].includes(mode)) return;
    this.mode = mode;
    this.method.dataset.sampler = mode;
    this.root.querySelectorAll('button[data-sampler]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.sampler === mode)));
    this.root.querySelector('#sampling-illustration').innerHTML = renderSampling(mode);
    this.root.querySelector('#sampling-label').textContent = mode === 'modular' ? 'Module-aware perturbations' : 'Gaussian search window';
    this.root.querySelector('.flow-generate .flow-label em').textContent = mode === 'modular' ? 'Our change' : 'RandOpt';
    this.root.querySelector('#algorithm-code').innerHTML = renderCode(mode);
    this.root.querySelector('#algorithm-name').textContent = mode === 'modular' ? 'Modular Norm RandOpt' : 'RandOpt';
    this.setStage(0, true);
    this.schedule();
  }

  renderStage() {
    this.method.dataset.phase = String(this.stage);
    this.root.querySelector('#stage-title').textContent = stages[this.stage][0];
    this.root.querySelector('#stage-description').textContent = this.description();
    this.root.querySelectorAll('[data-motion-step]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.motionStep) === this.stage)));
    this.method.querySelectorAll('[data-flow-stage]').forEach((item) => item.classList.toggle('active-step', Number(item.dataset.flowStage) === this.stage));
    this.method.querySelectorAll('[data-code-stage]').forEach((item) => item.classList.toggle('code-active', Number(item.dataset.codeStage) === this.stage));
    const count = this.root.querySelector('#stage-count');
    if (count) count.textContent = `0${this.stage+1} / 04`;
  }

  schedule() {
    clearTimeout(this.timer);
    this.timer = null;
    if (!this.playing || document.hidden || this.method.dataset.visible !== 'true') return;
    this.timer = setTimeout(() => { this.setStage((this.stage + 1) % stages.length); this.schedule(); }, this.stage === 0 ? 5600 : 4400);
  }

  destroy() {
    clearTimeout(this.timer);
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.media.removeEventListener('change', this.onPreference);
  }
}
