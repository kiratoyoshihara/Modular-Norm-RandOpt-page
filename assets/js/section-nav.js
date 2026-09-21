export class SectionNav {
  constructor(root) {
    this.root = root;
    this.entries = [...root.querySelectorAll('a[href^="#"]')]
      .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
      .filter(({ section }) => section);
    this.frame = null;
    this.onScroll = () => {
      if (this.frame !== null) return;
      this.frame = window.requestAnimationFrame(() => {
        this.frame = null;
        this.update();
      });
    };
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onScroll);
    window.addEventListener('pageshow', this.onScroll);
    this.update();
  }

  update() {
    const visible = window.scrollY > 200;
    this.root.dataset.visible = String(visible);
    this.root.toggleAttribute('inert', !visible);

    // The last heading above the reading line stays active through long figures.
    const readingLine = window.innerHeight * .25;
    let active = this.entries[0];
    for (const entry of this.entries) {
      if (entry.section.getBoundingClientRect().top <= readingLine) active = entry;
    }
    // A short final section may not reach the reading line before scrolling ends.
    if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      active = this.entries.at(-1);
    }
    for (const entry of this.entries) {
      if (entry === active) entry.link.setAttribute('aria-current', 'location');
      else entry.link.removeAttribute('aria-current');
    }
  }

  destroy() {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    window.removeEventListener('pageshow', this.onScroll);
    if (this.frame !== null) window.cancelAnimationFrame(this.frame);
  }
}
