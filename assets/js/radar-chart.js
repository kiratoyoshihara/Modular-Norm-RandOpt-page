import { DEFAULT_SCALE, escapeHTML, formatDifference, formatScore, renderRadar } from './radar-svg.js';

export class RadarChart {
  constructor(root, data) {
    this.root = root;
    this.data = data;
    this.scale = DEFAULT_SCALE;
    this.task = 'gsm8k';
    this.pinnedMethod = null;
    this.hoverMethod = null;
    this.focusMethod = null;
    this.mount = root.querySelector('#radar-mount');
    this.stage = root.querySelector('#radar-stage');
    this.tooltip = root.querySelector('#radar-tooltip');
    this.panel = root.querySelector('#radar-panel');
    this.replay = root.querySelector('[data-radar-replay]');
    this.tabs = [...root.querySelectorAll('[data-scale]')];
    this.legend = [...root.querySelectorAll('[data-method]')];
    this.mobile = window.matchMedia('(max-width: 620px)');
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.globalPaused = document.documentElement.dataset.motion === 'paused';
    this.revealState = !this.reducedMotion.matches && !this.globalPaused && 'IntersectionObserver' in window ? 'waiting' : 'complete';
    this.mount.dataset.reveal = this.revealState;
    this.render();
    this.bindEvents();
    this.bindReveal();
    this.legend.forEach((button) => { button.disabled = false; });
    root.querySelectorAll('[data-interactive]').forEach((element) => { element.hidden = false; });
    root.querySelector('#radar-fallback').hidden = true;
    this.panel.setAttribute('role', 'tabpanel');
    this.panel.removeAttribute('aria-label');
  }

  render() {
    const focusedTask = document.activeElement?.closest('.radar-label')?.dataset.task;
    this.mount.innerHTML = renderRadar(this.data, this.scale, { compact: this.mobile.matches, interactive: true, id: 'interactive-radar' });
    const selected = this.tabs.find((tab) => tab.dataset.scale === this.scale);
    this.tabs.forEach((tab) => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    this.panel.setAttribute('aria-labelledby', selected.id);
    this.hideTooltip();
    this.setGuidesVisible(false);
    this.updateTaskState();
    this.updateHighlight();
    if (focusedTask) this.mount.querySelector(`.radar-label[data-task="${focusedTask}"]`)?.focus();
  }

  chooseScale(scale) {
    if (!this.data.scales[scale]) return;
    this.completeReveal();
    this.scale = scale;
    this.hoverMethod = null;
    this.render();
  }

  chooseTask(task) {
    if (!this.data.tasks.some((entry) => entry.id === task)) return;
    this.task = task;
    this.updateTaskState();
  }

  updateTaskState() {
    this.mount.querySelectorAll('.radar-label').forEach((label) => {
      label.setAttribute('aria-pressed', String(label.dataset.task === this.task));
      label.setAttribute('aria-controls', 'radar-tooltip');
    });
  }

  updateHighlight() {
    const active = this.hoverMethod ?? this.focusMethod ?? this.pinnedMethod;
    this.mount.querySelectorAll('[data-series]').forEach((series) => {
      series.style.opacity = active && series.dataset.series !== active ? '.18' : '1';
      series.dataset.highlighted = String(series.dataset.series === active);
      const area = series.querySelector('.radar-area');
      if (area) area.style.fillOpacity = series.dataset.series === active ? '.26' : '.035';
    });
    this.legend.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.method === this.pinnedMethod)));
  }

  showTooltip(clientX, clientY) {
    const task = this.data.tasks.find((entry) => entry.id === this.task);
    const scores = this.data.scales[this.scale].scores;
    const ours = scores.modular[this.task]?.mean;
    const baseline = scores.randopt[this.task]?.mean;
    const difference = ours == null || baseline == null ? null : ours - baseline;
    this.tooltip.innerHTML = `<p class="tooltip-title">${escapeHTML(task.label)} · ${escapeHTML(task.metric)} (%)</p>${this.data.methods.map((method) => `<div class="tooltip-row" style="--series-color:${method.color}"><span>${escapeHTML(method.shortName)}</span><strong>${formatScore(scores[method.id][this.task])}</strong></div>`).join('')}<p class="tooltip-difference">MN − RandOpt <strong>${formatDifference(difference)}</strong></p>`;
    this.tooltip.hidden = false;
    this.setGuidesVisible(true);
    this.mount.querySelectorAll('.radar-label').forEach((label) => {
      if (label.dataset.task === this.task) label.setAttribute('aria-describedby', 'radar-tooltip');
      else label.removeAttribute('aria-describedby');
    });
    const bounds = this.stage.getBoundingClientRect();
    const x = Math.max(8, Math.min(clientX - bounds.left + 15, bounds.width - this.tooltip.offsetWidth - 8));
    const y = Math.max(8, Math.min(clientY - bounds.top + 16, bounds.height - this.tooltip.offsetHeight - 8));
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  hideTooltip() {
    this.tooltip.hidden = true;
    this.mount.querySelectorAll('[aria-describedby="radar-tooltip"]').forEach((label) => label.removeAttribute('aria-describedby'));
  }

  setGuidesVisible(visible) {
    this.mount.dataset.guidesVisible = String(visible);
    this.mount.querySelector('.radar-guides')?.setAttribute('visibility', visible ? 'visible' : 'hidden');
  }

  completeReveal() {
    this.revealState = 'complete';
    this.mount.dataset.reveal = 'complete';
  }

  replayAnimation() {
    if (this.reducedMotion.matches || this.globalPaused) return;
    this.hideTooltip();
    this.setGuidesVisible(false);
    this.hoverMethod = null;
    this.focusMethod = null;
    this.updateHighlight();
    this.revealState = 'waiting';
    this.mount.dataset.reveal = 'waiting';
    // Commit the reset before restarting the point → line → fill sequence.
    this.mount.getBoundingClientRect();
    if (!this.revealObserver || this.mount.dataset.revealVisible === 'true') {
      this.revealState = 'playing';
      this.mount.dataset.reveal = 'playing';
    }
  }

  updateReplay() {
    this.replay.disabled = this.reducedMotion.matches || this.globalPaused;
  }

  bindReveal() {
    this.onMotionPreference = () => { if (this.reducedMotion.matches) this.completeReveal(); this.updateReplay(); };
    this.reducedMotion.addEventListener('change', this.onMotionPreference);
    this.onGlobalMotion = (event) => {
      this.globalPaused = !event.detail.playing;
      if (this.globalPaused) this.completeReveal();
      this.updateReplay();
    };
    document.addEventListener('research-motion-change', this.onGlobalMotion);
    this.onVisibility = () => { this.mount.dataset.revealPaused = String(document.hidden); };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.onVisibility();
    this.onRevealEnd = (event) => {
      if (event.animationName === 'radar-sequence' && event.target.classList.contains('radar-svg')) this.completeReveal();
    };
    this.mount.addEventListener('animationend', this.onRevealEnd);
    this.updateReplay();
    if (!('IntersectionObserver' in window)) return;
    this.revealObserver = new window.IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= .22;
        this.mount.dataset.revealVisible = String(visible);
        if (visible && this.revealState === 'waiting') {
          this.revealState = 'playing';
          this.mount.dataset.reveal = 'playing';
        }
      });
    }, { threshold: [0, .22] });
    this.revealObserver.observe(this.stage);
  }

  bindEvents() {
    this.onReplay = () => this.replayAnimation();
    this.replay.addEventListener('click', this.onReplay);
    this.onResize = () => {
      if (this.revealState === 'playing') this.completeReveal();
      this.render();
    };
    this.mobile.addEventListener('change', this.onResize);
    this.tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => this.chooseScale(tab.dataset.scale));
      tab.addEventListener('keydown', (event) => {
        const targets = { ArrowRight: (index + 1) % this.tabs.length, ArrowLeft: (index + this.tabs.length - 1) % this.tabs.length, Home: 0, End: this.tabs.length - 1 };
        if (!(event.key in targets)) return;
        event.preventDefault();
        const next = this.tabs[targets[event.key]];
        next.focus();
        this.chooseScale(next.dataset.scale);
      });
    });
    this.legend.forEach((button) => {
      button.addEventListener('pointerenter', (event) => { if (event.pointerType !== 'touch') { this.completeReveal(); this.hoverMethod = button.dataset.method; this.updateHighlight(); this.setGuidesVisible(true); } });
      button.addEventListener('pointerleave', () => { this.hoverMethod = null; this.updateHighlight(); this.setGuidesVisible(false); });
      button.addEventListener('focus', () => { this.completeReveal(); this.focusMethod = button.dataset.method; this.updateHighlight(); this.setGuidesVisible(true); });
      button.addEventListener('blur', () => { this.focusMethod = null; this.updateHighlight(); this.setGuidesVisible(false); });
      button.addEventListener('click', () => {
        this.completeReveal();
        const method = button.dataset.method;
        this.pinnedMethod = this.pinnedMethod === method ? null : method;
        this.updateHighlight();
      });
    });
    this.mount.addEventListener('pointerover', (event) => {
      if (event.pointerType === 'touch') return;
      const target = event.target.closest('[data-task]');
      const series = event.target.closest('[data-series]');
      const grid = event.target.closest('.radar-grid');
      if (!target && !series && !grid) return;
      this.completeReveal();
      this.setGuidesVisible(true);
      this.hoverMethod = series?.dataset.series ?? null;
      this.updateHighlight();
      if (target) { this.chooseTask(target.dataset.task); this.showTooltip(event.clientX, event.clientY); }
      else this.hideTooltip();
    });
    this.mount.addEventListener('pointermove', (event) => {
      if (!this.tooltip.hidden && event.pointerType !== 'touch') this.showTooltip(event.clientX, event.clientY);
    });
    this.mount.addEventListener('pointerout', (event) => {
      if (event.pointerType === 'touch') return;
      const next = event.relatedTarget;
      const inside = next instanceof window.Element && this.mount.contains(next);
      this.hoverMethod = inside ? next.closest('[data-series]')?.dataset.series ?? null : null;
      this.setGuidesVisible(Boolean(inside && next.closest('.radar-grid, [data-series], [data-task]')));
      if (!inside || !next.closest('[data-task]')) this.hideTooltip();
      this.updateHighlight();
    });
    this.mount.addEventListener('focusin', (event) => {
      const target = event.target.closest('[data-task]');
      if (!target) return;
      this.completeReveal();
      this.chooseTask(target.dataset.task);
      const bounds = target.getBoundingClientRect();
      this.showTooltip(bounds.left + bounds.width / 2, bounds.bottom);
    });
    this.mount.addEventListener('focusout', () => { this.hideTooltip(); this.setGuidesVisible(false); });
    this.mount.addEventListener('click', (event) => {
      const target = event.target.closest('[data-task]');
      if (target) {
        this.completeReveal(); this.chooseTask(target.dataset.task);
        const bounds = target.getBoundingClientRect();
        this.showTooltip(bounds.left + bounds.width / 2, bounds.bottom);
      }
      else if (event.target.closest('.radar-line-hit')) {
        this.completeReveal();
        this.setGuidesVisible(true);
        const method = event.target.closest('[data-series]').dataset.series;
        this.pinnedMethod = this.pinnedMethod === method ? null : method;
        this.updateHighlight();
      }
      else {
        this.hideTooltip();
        const grid = event.target.closest('.radar-grid');
        if (grid) this.completeReveal();
        this.setGuidesVisible(Boolean(grid));
      }
    });
    this.mount.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target.closest('[data-task]');
      if (!target) return;
      event.preventDefault();
      this.completeReveal();
      this.chooseTask(target.dataset.task);
      const bounds = target.getBoundingClientRect();
      this.showTooltip(bounds.left + bounds.width / 2, bounds.bottom);
    });
    this.root.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      this.pinnedMethod = null;
      this.hoverMethod = null;
      this.focusMethod = null;
      this.hideTooltip();
      this.setGuidesVisible(false);
      this.updateHighlight();
    });
    this.onOutsidePointer = (event) => { if (!this.stage.contains(event.target)) { this.hideTooltip(); this.setGuidesVisible(false); } };
    document.addEventListener('pointerdown', this.onOutsidePointer);
  }

  destroy() {
    this.revealObserver?.disconnect();
    this.replay.removeEventListener('click', this.onReplay);
    this.mount.removeEventListener('animationend', this.onRevealEnd);
    this.mobile.removeEventListener('change', this.onResize);
    this.reducedMotion.removeEventListener('change', this.onMotionPreference);
    document.removeEventListener('visibilitychange', this.onVisibility);
    document.removeEventListener('pointerdown', this.onOutsidePointer);
    document.removeEventListener('research-motion-change', this.onGlobalMotion);
  }
}
