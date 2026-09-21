import { SCALE_TIMELINES } from './scale-timing.js?v=allocation-timing-14';

// A scene owns its playback clock. Scrolling within the same tab never seeks it.
export class ScalePlayer {
  constructor(scene, onChange) {
    this.scene = scene;
    this.timeline = SCALE_TIMELINES[scene.dataset.kind];
    this.onChange = onChange;
    this.toggle = scene.querySelector('[data-scale-toggle]');
    this.replay = scene.querySelector('[data-scale-replay]');
    this.label = scene.querySelector('h3').lastChild.textContent;
    this.disabled = true;
    this.visible = false;
    this.running = false;
    this.static();
  }

  stopClock() {
    if (this.running) this.elapsed += window.performance.now() - this.startedAt;
    this.running = false;
    window.clearTimeout(this.timer);
    this.timer = null;
  }

  static() {
    this.stopClock();
    this.elapsed = this.timeline.duration;
    this.started = false;
    this.complete = true;
    this.userPaused = false;
    this.scene.style.removeProperty('--scale-seek');
    this.scene.dataset.animated = 'false';
    this.render();
    this.sync();
  }

  restart(offset = 0) {
    if (this.disabled) return;
    this.stopClock();
    this.scene.dataset.animated = 'false';
    // Remove the previous CSS timelines before replaying, including after finish.
    void this.scene.offsetWidth;
    this.elapsed = Math.max(0, Math.min(offset, this.timeline.duration));
    this.scene.style.setProperty('--scale-seek', `${this.elapsed}ms`);
    this.complete = this.elapsed >= this.timeline.duration;
    this.started = true;
    this.userPaused = false;
    this.scene.dataset.animated = 'true';
    this.render();
    this.sync();
  }

  render() {
    const event = this.timeline.events.findLast(event => event.at <= this.elapsed);
    this.scene.dataset.phase = String(event.phase);
    this.scene.dataset.complete = String(this.complete);
    this.onChange?.(event.line);
  }

  sync() {
    this.stopClock();
    const play = !this.disabled && this.visible && !document.hidden && this.started && !this.complete && !this.userPaused;
    this.scene.dataset.running = String(play);
    this.toggle.disabled = this.disabled || this.complete;
    this.replay.disabled = this.disabled;
    this.toggle.textContent = this.userPaused ? 'Resume' : 'Pause';
    this.toggle.setAttribute('aria-label', `${this.userPaused ? 'Resume' : 'Pause'} the ${this.label} animation`);
    if (!play) return;
    this.running = true;
    this.startedAt = window.performance.now();
    const next = this.timeline.events.find(event => event.at > this.elapsed)?.at ?? this.timeline.duration;
    this.timer = window.setTimeout(() => {
      this.stopClock();
      this.elapsed = Math.min(this.timeline.duration, Math.max(this.elapsed, next));
      this.complete = this.elapsed >= this.timeline.duration;
      this.render();
      this.sync();
    }, Math.max(0, next - this.elapsed));
  }

  setVisible(visible) { this.visible = visible; this.sync(); }
  pause() { this.userPaused = !this.userPaused; this.sync(); }
}

export class ScaleStory {
  constructor(root) {
    this.root = root;
    this.stage = root.querySelector('.scale-sticky');
    this.scenes = [...root.querySelectorAll('.scale-scene')];
    this.cues = [...root.querySelectorAll('.scale-cue')];
    this.progress = root.querySelector('.scale-progress');
    this.buttons = [...root.querySelectorAll('[data-scale-step]')];
    this.lines = [...root.querySelectorAll('[data-algorithm-line]')];
    this.markers = [...root.querySelectorAll('.scale-algorithm-marker')];
    this.layout = window.matchMedia('(min-width: 900px) and (min-height: 600px)');
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.paused = document.documentElement.dataset.motion === 'paused';
    this.listeners = [];
    this.players = new Map(this.scenes.map(scene => [scene.dataset.step, new ScalePlayer(scene, line => {
      if (this.activeId === scene.dataset.step) this.highlight(line);
    })]));
    const listen = (target, type, handler) => {
      target.addEventListener(type, handler);
      this.listeners.push([target, type, handler]);
    };
    const refresh = () => this.syncLayout();
    listen(this.layout, 'change', refresh);
    listen(this.reduced, 'change', refresh);
    listen(window, 'resize', refresh);
    listen(window, 'pageshow', refresh);
    listen(document, 'visibilitychange', () => this.players.forEach(player => player.sync()));
    listen(document, 'research-motion-change', event => { this.paused = !event.detail.playing; refresh(); });
    this.buttons.forEach(button => listen(button, 'click', () => {
      if (!this.live) return;
      this.navigate(button.dataset.scaleStep);
    }));
    this.root.querySelectorAll('[data-scale-target]').forEach(link => listen(link, 'click', event => {
      // Keep native hash navigation for static views and modified link clicks.
      if (!this.enabled || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      event.preventDefault();
      const scene = this.scenes.find(scene => scene.dataset.kind === link.dataset.scaleTarget);
      this.navigate(scene.dataset.step, Number(link.dataset.scaleAt));
    }));
    this.players.forEach((player, id) => {
      listen(player.replay, 'click', () => this.select(id, true, true));
      listen(player.toggle, 'click', () => player.pause());
    });
    this.syncLayout();
  }

  syncLayout() {
    this.observer?.disconnect();
    const enabled = !this.reduced.matches && !this.paused && 'IntersectionObserver' in window;
    const live = enabled && this.layout.matches;
    if (this.enabled !== enabled || this.live !== live) {
      this.activeId = null;
      this.players.forEach(player => { player.visible = false; player.disabled = !enabled; player.static(); });
    }
    this.enabled = enabled;
    this.live = live;
    this.root.classList.toggle('has-playback', enabled);
    this.root.classList.toggle('is-live', live);
    this.progress.hidden = !live;
    this.scenes.forEach(scene => { scene.querySelector('.scale-playback').hidden = !enabled; });
    if (!live) this.restoreReadingOrder();
    if (!enabled) {
      delete this.root.dataset.active;
      delete this.root.dataset.inView;
      return;
    }
    const center = Math.floor(window.innerHeight / 2);
    this.observer = new window.IntersectionObserver(() => live ? this.updatePinned() : this.updateStacked(), live ? {
      rootMargin: `-${center}px 0px -${window.innerHeight - center - 1}px 0px`, threshold: 0,
    } : { threshold: [0, .2, .5, 1] });
    if (live) {
      this.cues.forEach(cue => this.observer.observe(cue));
      this.observer.observe(this.stage);
      this.updatePinned();
    } else {
      this.scenes.forEach(scene => this.observer.observe(scene.querySelector('.scale-concept')));
      this.updateStacked();
    }
  }

  updatePinned() {
    const center = window.innerHeight / 2;
    const stage = this.stage.getBoundingClientRect();
    const visible = stage.top <= center && stage.bottom >= center;
    let current = this.cues[0];
    for (const cue of this.cues) if (cue.getBoundingClientRect().top <= center + 1) current = cue;
    this.select(current.dataset.cueStep, visible);
  }

  updateStacked() {
    const height = window.innerHeight;
    const visible = this.scenes.map(scene => {
      const rect = scene.querySelector('.scale-concept').getBoundingClientRect();
      return { scene, rect, distance: Math.abs(rect.top + Math.min(rect.height, height) / 2 - height / 2) };
    }).filter(({ rect }) => rect.top < height * .75 && rect.bottom > height * .25).sort((a, b) => a.distance - b.distance);
    if (visible.length) this.select(visible[0].scene.dataset.step, true);
    else if (this.activeId) this.players.get(this.activeId).setVisible(false);
  }

  navigate(id, offset = 0) {
    const target = this.live
      ? this.cues.find(cue => cue.dataset.cueStep === id)
      : this.scenes.find(scene => scene.dataset.step === id);
    const top = window.scrollY + target.getBoundingClientRect().top - (this.live ? window.innerHeight / 2 - 5 : 24);
    window.scrollTo({ top, behavior: 'instant' });
    this.select(id, true, true, offset);
  }

  select(id, visible, replay = false, offset = 0) {
    if (!this.enabled) return;
    const changed = id !== this.activeId;
    if (changed && this.activeId) this.players.get(this.activeId).setVisible(false);
    this.activeId = id;
    this.root.dataset.active = id;
    this.root.dataset.inView = String(visible);
    if (this.live) this.scenes.forEach(scene => {
      const active = scene.dataset.step === id;
      scene.setAttribute('aria-hidden', String(!active));
      scene.toggleAttribute('inert', !active);
    });
    this.buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scaleStep === id)));
    const player = this.players.get(id);
    player.visible = visible;
    if (visible && (changed || replay || !player.started)) player.restart(offset);
    else { player.render(); player.sync(); }
  }

  highlight(line) {
    const activeLines = this.live ? (Array.isArray(line) ? line : [line]).filter(Boolean) : [];
    this.lines.forEach(row => {
      const current = activeLines.includes(row.dataset.algorithmLine);
      row.classList.toggle('is-current', current);
      if (row.dataset.algorithmLine === activeLines[0]) row.setAttribute('aria-current', 'step');
      else row.removeAttribute('aria-current');
    });
    this.markers.forEach((marker, index) => {
      const row = this.lines.find(row => row.dataset.algorithmLine === activeLines[index]);
      marker.hidden = !row;
      if (row) {
        marker.style.transform = `translateY(${row.offsetTop}px)`;
        marker.style.height = `${row.offsetHeight}px`;
      }
    });
  }

  restoreReadingOrder() {
    this.scenes.forEach(scene => { scene.removeAttribute('aria-hidden'); scene.removeAttribute('inert'); });
    this.highlight(null);
  }

  destroy() {
    this.observer?.disconnect();
    this.listeners.forEach(([target, type, handler]) => target.removeEventListener(type, handler));
    this.players.forEach(player => { player.disabled = true; player.static(); });
    this.live = false;
    this.root.classList.remove('is-live', 'has-playback');
    delete this.root.dataset.active;
    delete this.root.dataset.inView;
    this.progress.hidden = true;
    this.scenes.forEach(scene => { scene.querySelector('.scale-playback').hidden = true; });
    this.restoreReadingOrder();
  }
}
