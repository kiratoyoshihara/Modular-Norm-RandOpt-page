// Progressive enhancement: the generated SVG is complete without JavaScript.
export class Figure2Chart {
  constructor(root) {
    this.root = root;
    this.rows = [...root.querySelectorAll('.figure2-row')];
    this.replay = root.querySelector('[data-figure2-replay]');
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.globalPaused = document.documentElement.dataset.motion === 'paused';
    this.visible = new Set();
    this.visibilityFrame = null;
    this.scheduleVisibility = () => {
      if (this.visibilityFrame !== null) return;
      this.visibilityFrame = window.requestAnimationFrame(() => {
        this.visibilityFrame = null;
        this.checkVisibility();
      });
    };
    this.onPreference = () => { if (this.reduced.matches) this.finishAll(); this.updateReplay(); };
    this.onGlobalMotion = (event) => {
      this.globalPaused = !event.detail.playing;
      if (this.globalPaused) this.finishAll();
      this.updateReplay();
    };
    this.onVisibility = () => {
      root.dataset.paused = String(document.hidden);
      if (!document.hidden) this.scheduleVisibility();
    };
    this.onEnd = (event) => {
      if (event.animationName === 'figure2-sequence' && this.rows.includes(event.target)) event.target.dataset.reveal = 'complete';
    };
    this.onReplay = () => {
      if (this.reduced.matches || this.globalPaused) return;
      this.rows.forEach((row) => { row.dataset.reveal = 'waiting'; });
      // Commit the reset so a completed CSS sequence can run again.
      root.getBoundingClientRect();
      if (this.observer) this.checkVisibility();
      else this.rows.forEach((row) => { row.dataset.reveal = 'playing'; });
    };
    if ('IntersectionObserver' in window) {
      // Observe the HTML figure; SVG group intersections vary across browsers.
      // Scroll/resize checks also catch panels entering a tall mobile figure.
      this.observer = new window.IntersectionObserver(() => this.checkVisibility(), { threshold: 0 });
      this.observer.observe(root);
      window.addEventListener('scroll', this.scheduleVisibility, { passive: true });
      window.addEventListener('resize', this.scheduleVisibility);
      window.visualViewport?.addEventListener('scroll', this.scheduleVisibility, { passive: true });
      window.visualViewport?.addEventListener('resize', this.scheduleVisibility);
      if ('ResizeObserver' in window) {
        this.resizeObserver = new window.ResizeObserver(this.scheduleVisibility);
        this.resizeObserver.observe(root);
      }
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

  checkVisibility() {
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const left = viewport?.offsetLeft ?? 0;
    const height = viewport?.height ?? window.innerHeight;
    const width = viewport?.width ?? window.innerWidth;
    this.rows.forEach((row) => {
      const bounds = row.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(bounds.bottom, top + height) - Math.max(bounds.top, top));
      // Wait until a meaningful slice of the panel is actually on screen.
      // Ignore the responsive SVG variant hidden with display:none.
      const visible = bounds.width > 0 && bounds.height > 0
        && bounds.right > left && bounds.left < left + width
        && visibleHeight >= Math.min(bounds.height, height) * .22;
      row.dataset.visible = String(visible);
      if (visible) this.visible.add(row);
      else this.visible.delete(row);
      if (visible && row.dataset.reveal === 'waiting') row.dataset.reveal = 'playing';
      // A quick scroll past a panel leaves its results ready for the next visit.
      else if (!visible && row.dataset.reveal === 'playing') row.dataset.reveal = 'complete';
    });
  }

  finishAll() { this.rows.forEach((row) => { row.dataset.reveal = 'complete'; }); }
  updateReplay() { this.replay.disabled = this.reduced.matches || this.globalPaused; }

  destroy() {
    this.finishAll();
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    window.cancelAnimationFrame(this.visibilityFrame);
    window.removeEventListener('scroll', this.scheduleVisibility);
    window.removeEventListener('resize', this.scheduleVisibility);
    window.visualViewport?.removeEventListener('scroll', this.scheduleVisibility);
    window.visualViewport?.removeEventListener('resize', this.scheduleVisibility);
    this.replay.removeEventListener('click', this.onReplay);
    this.root.removeEventListener('animationend', this.onEnd);
    document.removeEventListener('visibilitychange', this.onVisibility);
    document.removeEventListener('research-motion-change', this.onGlobalMotion);
    this.reduced.removeEventListener('change', this.onPreference);
  }
}
