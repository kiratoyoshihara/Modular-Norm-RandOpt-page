import { METHOD_STEPS, METHOD_CANDIDATE_COUNT, METHOD_SELECTED, methodStepDuration, matrixFills } from './method-svg.js?v=indexed-colors-1';

export class MethodAnimation {
  constructor(root) {
    this.root = root;
    this.stages = [...root.querySelectorAll('[data-method-stage]')];
    this.steps = [...root.querySelectorAll('[data-method-step]')];
    this.toggle = root.querySelector('[data-method-toggle]');
    this.replay = root.querySelector('[data-method-replay]');
    this.preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.globalPaused = document.documentElement.dataset.motion === 'paused';
    this.phase = 0;
    this.draw = 1;
    this.candidates = [...root.querySelectorAll('[data-candidate]')];
    this.noiseMatrices = [...root.querySelectorAll('[data-draw-palette="warm"]')].map(matrix => [...matrix.querySelectorAll('.method-matrix-cell')]);
    this.remaining = methodStepDuration(this.phase,this.draw);
    this.userPaused = false;
    this.complete = false;
    this.visible = !('IntersectionObserver' in window);
    this.timer = null;
    this.listeners = [];
    const listen = (target, event, handler) => {
      target.addEventListener(event, handler);
      this.listeners.push([target, event, handler]);
    };
    root.dataset.enhanced = 'true';
    root.querySelector('.method-playback').hidden = false;
    root.querySelector('.method-step-controls').hidden = false;
    this.steps.forEach((button) => listen(button, 'click', () => {
      this.stopTimer();
      this.userPaused = true;
      this.complete = false;
      this.phase = Number(button.dataset.methodStep);
      this.draw = this.phase < 3 ? 1 : METHOD_CANDIDATE_COUNT;
      this.remaining = methodStepDuration(this.phase,this.draw);
      this.render(false);
      root.querySelector('[data-method-announcement]').textContent = `${METHOD_STEPS[this.phase].title}. ${METHOD_STEPS[this.phase].description}`;
      this.sync();
    }));
    listen(this.toggle, 'click', () => {
      if (this.complete) return this.restart();
      this.userPaused = !this.userPaused;
      if (!this.userPaused && root.dataset.animate === 'false') {
        if (this.phase === 0) this.shuffleNoise();
        this.render(true);
      }
      this.sync();
    });
    listen(this.replay, 'click', () => this.restart());
    listen(document, 'visibilitychange', () => this.sync());
    listen(document, 'research-motion-change', (event) => {
      this.globalPaused = !event.detail.playing;
      if (this.globalPaused) this.render(false);
      this.sync();
    });
    listen(this.preference, 'change', () => {
      if (this.preference.matches) this.render(false);
      this.sync();
    });
    if ('IntersectionObserver' in window) {
      this.observer = new window.IntersectionObserver((entries) => {
        this.visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .15);
        this.sync();
      }, { threshold: [0, .15] });
      this.observer.observe(root);
    }
    this.shuffleNoise();
    this.render(!this.preference.matches && !this.globalPaused);
    this.sync();
  }

  shuffleNoise() {
    const sources = [...this.root.querySelectorAll('.method-source')];
    const order = Array.from({ length: sources[0]?.querySelectorAll('.method-noise-cell').length || 0 }, (_, index) => index);
    for (let index = order.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [order[index], order[other]] = [order[other], order[index]];
    }
    // Use the same shuffled timing in both responsive versions of the diagram.
    sources.forEach(source => source.querySelectorAll('.method-noise-cell').forEach((cell, index) => {
      cell.style.setProperty('--cell-delay', `${order[index] * 40}ms`);
    }));
  }

  render(animate) {
    if (this.renderedDraw !== this.draw) {
      const fills = matrixFills({seed:this.draw,palette:'warm'});
      this.noiseMatrices.forEach(cells => cells.forEach((cell,index) => cell.setAttribute('fill',fills[index])));
      this.renderedDraw = this.draw;
    }
    this.root.dataset.phase = String(this.phase);
    this.root.dataset.draw = String(this.draw);
    this.root.dataset.building = String(this.phase < 3);
    this.root.dataset.animate = String(animate);
    this.stages.forEach((stage) => {
      const index = Number(stage.dataset.methodStage);
      stage.dataset.active = String(index === this.phase);
      stage.dataset.stageState = index < this.phase || this.complete ? 'complete' : index === this.phase ? 'active' : 'upcoming';
    });
    this.candidates.forEach(candidate => {
      const id = Number(candidate.dataset.candidate);
      candidate.dataset.candidateState = this.phase >= 3 || id < this.draw ? 'complete' : id === this.draw && this.phase === 2 ? 'current' : 'upcoming';
    });
    this.steps.forEach((button, index) => button.setAttribute('aria-pressed', String(index === this.phase)));
  }

  stopTimer() {
    if (this.timer !== null) {
      this.remaining = Math.max(0, this.remaining - (window.performance.now() - this.startedAt));
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  sync() {
    const disabled = this.preference.matches || this.globalPaused;
    this.root.dataset.reduced = String(disabled);
    this.root.querySelectorAll('[data-method-index]').forEach(label => { label.textContent = disabled ? 'i' : String(this.draw); });
    this.root.querySelector('[data-method-progress]').textContent = disabled
      ? `Repeat independently for i = 1, …, ${METHOD_CANDIDATE_COUNT}`
      : this.phase < 3 ? `Independent draw ${this.draw} / ${METHOD_CANDIDATE_COUNT}`
      : this.phase === 3 ? `${METHOD_CANDIDATE_COUNT} candidates ready · Select the top ${METHOD_SELECTED.length}`
      : `Ensemble the top ${METHOD_SELECTED.length} models`;
    const running = !disabled && !this.userPaused && !this.complete && this.visible && !document.hidden;
    this.root.dataset.playing = String(running);
    this.toggle.disabled = disabled;
    this.replay.disabled = disabled;
    this.toggle.textContent = this.userPaused || this.complete ? 'Play' : 'Pause';
    this.toggle.setAttribute('aria-label', `${this.userPaused || this.complete ? 'Play' : 'Pause'} the method animation`);
    if (!running) return this.stopTimer();
    if (this.timer !== null) return;
    this.startedAt = window.performance.now();
    this.timer = window.setTimeout(() => {
      this.timer = null;
      if (this.phase === METHOD_STEPS.length - 1) {
        this.complete = true;
        this.render(false);
      } else {
        if (this.phase === 2 && this.draw < METHOD_CANDIDATE_COUNT) {
          this.draw += 1;
        } else {
          this.phase += 1;
        }
        this.remaining = methodStepDuration(this.phase,this.draw);
        this.render(true);
      }
      this.sync();
    }, this.remaining);
  }

  restart() {
    if (this.preference.matches || this.globalPaused) return;
    this.stopTimer();
    this.phase = 0;
    this.draw = 1;
    this.remaining = methodStepDuration(this.phase,this.draw);
    this.userPaused = false;
    this.complete = false;
    this.render(false);
    this.shuffleNoise();
    this.root.getBoundingClientRect();
    this.render(true);
    this.sync();
  }

  destroy() {
    this.stopTimer();
    this.observer?.disconnect();
    this.listeners.forEach(([target,event,handler]) => target.removeEventListener(event,handler));
  }
}
