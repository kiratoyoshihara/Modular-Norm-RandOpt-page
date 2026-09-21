import { Figure2Chart } from './figure2-chart.js?v=chart-reveal-2';
import { escapeHTML as esc } from './radar-svg.js';

export class IterativeChart {
  constructor(root) {
    this.root = root;
    this.motion = new Figure2Chart(root);
    this.tooltip = root.querySelector('#iterative-tooltip');
    this.legend = [...root.querySelectorAll('[data-iterative-method]')];
    this.pinned = null;
    this.listeners = [];
    const listen = (target,event,handler) => { target.addEventListener(event,handler); this.listeners.push([target,event,handler]); };
    this.legend.forEach((button) => {
      button.disabled = false;
      for (const event of ['pointerenter','focus']) listen(button,event,() => this.highlight(button.dataset.iterativeMethod));
      for (const event of ['pointerleave','blur']) listen(button,event,() => this.highlight(this.pinned));
      listen(button,'click',() => {
        this.pinned = this.pinned === button.dataset.iterativeMethod ? null : button.dataset.iterativeMethod;
        this.highlight(this.pinned);
        this.legend.forEach((item) => item.setAttribute('aria-pressed',String(item.dataset.iterativeMethod === this.pinned)));
      });
    });
    const fromTarget = (event) => {
      const point = event.target.closest('[data-iterative-point]');
      if (point) { const bounds = point.getBoundingClientRect(); this.show(point,bounds.left+bounds.width/2,bounds.bottom); }
    };
    listen(root,'pointerover',(event) => {
      const point = event.target.closest('[data-iterative-point]');
      if (point && event.pointerType !== 'touch') this.show(point,event.clientX,event.clientY);
    });
    listen(root,'pointerout',(event) => {
      const point = event.target.closest('[data-iterative-point]');
      if (point && (!(event.relatedTarget instanceof window.Node) || !point.contains(event.relatedTarget))) this.hide();
    });
    listen(root,'focusin',fromTarget);
    listen(root,'click',fromTarget);
    listen(root,'focusout',() => this.hide());
    listen(root,'keydown',(event) => {
      if (event.key === 'Escape') {
        this.pinned = null;
        this.legend.forEach((button) => button.setAttribute('aria-pressed','false'));
        this.hide();
      }
      if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('[data-iterative-point]')) { event.preventDefault(); fromTarget(event); }
    });
    listen(document,'pointerdown',(event) => { if (!event.target.closest('[data-iterative-point]')) this.hide(); });
  }

  highlight(method) {
    if (method) this.motion.finishAll();
    this.root.querySelectorAll('[data-iterative-series]').forEach((series) => {
      const dimmed = method && series.dataset.iterativeSeries !== method;
      series.style.opacity = dimmed ? '.18' : '1';
      // A pinned method remains selectable where measurements overlap at N=3000.
      series.style.pointerEvents = dimmed ? 'none' : '';
    });
  }

  show(point,clientX,clientY) {
    this.motion.finishAll();
    this.hide();
    const d = point.dataset;
    this.tooltip.innerHTML = `<strong style="color:${point.style.getPropertyValue('--method-color')}">${esc(d.label)}</strong><span>${esc(d.task)} · N=${Number(d.n).toLocaleString('en-US')} · K=${Number(d.k)}</span><dl><div><dt>Accuracy</dt><dd>${Number(d.mean).toFixed(2)} ± ${Number(d.sd).toFixed(2)}%</dd></div></dl><small>Mean ± sample SD · 3 seeds</small>`;
    this.tooltip.hidden = false;
    point.setAttribute('aria-describedby','iterative-tooltip');
    const bounds = this.root.getBoundingClientRect();
    this.tooltip.style.left = `${Math.max(8,Math.min(clientX-bounds.left+12,bounds.width-this.tooltip.offsetWidth-8))}px`;
    this.tooltip.style.top = `${Math.max(8,Math.min(clientY-bounds.top+14,bounds.height-this.tooltip.offsetHeight-8))}px`;
    this.highlight(d.method);
  }

  hide() {
    this.tooltip.hidden = true;
    this.root.querySelectorAll('[aria-describedby="iterative-tooltip"]').forEach((point) => point.removeAttribute('aria-describedby'));
    this.highlight(this.pinned);
  }

  destroy() {
    this.motion.destroy();
    this.listeners.forEach(([target,event,handler]) => target.removeEventListener(event,handler));
  }
}
