// Progressive enhancement: the generated SVG is complete without JavaScript.
export class Figure2Chart {
  constructor(root) {
    this.root = root;
    this.rows = [...root.querySelectorAll('.figure2-row')];
    this.replay = root.querySelector('[data-figure2-replay]');
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.globalPaused = document.documentElement.dataset.motion === 'paused';
    this.visible = new Set();
    this.onPreference = () => { if (this.reduced.matches) this.finishAll(); this.updateReplay(); };
    this.onGlobalMotion = (event) => {
      this.globalPaused = !event.detail.playing;
      if (this.globalPaused) this.finishAll();
      this.updateReplay();
    };
    this.onVisibility = () => { root.dataset.paused = String(document.hidden); };
    this.onEnd = (event) => {
      if (event.animationName === 'figure2-sequence' && this.rows.includes(event.target)) event.target.dataset.reveal = 'complete';
    };
    this.onReplay = () => {
      if (this.reduced.matches || this.globalPaused) return;
      this.rows.forEach((row) => { row.dataset.reveal = 'waiting'; });
      // Commit the reset so a completed CSS sequence can run again.
      root.getBoundingClientRect();
      this.rows.forEach((row) => { if (!this.observer || this.visible.has(row)) row.dataset.reveal = 'playing'; });
    };
    if ('IntersectionObserver' in window) {
      this.observer = new window.IntersectionObserver((entries) => {
        for (const entry of entries) {
          const visible = entry.isIntersecting && entry.intersectionRatio >= .18;
          entry.target.dataset.visible = String(visible);
          if (visible) this.visible.add(entry.target);
          else this.visible.delete(entry.target);
          if (visible && entry.target.dataset.reveal === 'waiting') entry.target.dataset.reveal = 'playing';
        }
      }, { threshold: [0, .18] });
      this.rows.forEach((row) => this.observer.observe(row));
    }
    this.rows.forEach((row) => {
      row.dataset.reveal = this.observer && !this.reduced.matches && !this.globalPaused ? 'waiting' : 'complete';
    });
    this.replay.hidden = false;
    this.updateReplay();
    this.onVisibility();
    this.replay.addEventListener('click', this.onReplay);
    root.addEventListener('animationend', this.onEnd);
    document.addEventListener('visibilitychange', this.onVisibility);
    document.addEventListener('research-motion-change', this.onGlobalMotion);
    this.reduced.addEventListener('change', this.onPreference);
  }

  finishAll() { this.rows.forEach((row) => { row.dataset.reveal = 'complete'; }); }
  updateReplay() { this.replay.disabled = this.reduced.matches || this.globalPaused; }

  destroy() {
    this.finishAll();
    this.observer?.disconnect();
    this.replay.removeEventListener('click', this.onReplay);
    this.root.removeEventListener('animationend', this.onEnd);
    document.removeEventListener('visibilitychange', this.onVisibility);
    document.removeEventListener('research-motion-change', this.onGlobalMotion);
    this.reduced.removeEventListener('change', this.onPreference);
  }
}
