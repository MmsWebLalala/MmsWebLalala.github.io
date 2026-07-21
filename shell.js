// Shared inner-page shell: Mm returns home; a particle arrow appears when needed.
(function () {
  const SIZE = 260;
  const density = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--symbol-particle-density')) || 1;
  // Same per-area weight as the home page's nav symbols (0.55 × 0.50 dots/px²)
  // so the Mm mark and arrow read with the same cloud density everywhere.
  const GLYPH_STEP = 1 / Math.sqrt(0.55 * 0.50 * density);
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shellInk = getComputedStyle(document.documentElement).getPropertyValue('--shell-ink').trim() || '#1d2020';
  function updateShellInk() {
    shellInk = getComputedStyle(document.documentElement).getPropertyValue('--shell-ink').trim() || '#1d2020';
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('mm-theme')) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      updateShellInk();
    }
  });

  function sampleM() {
    const stencil = document.createElement('canvas');
    stencil.width = SIZE;
    stencil.height = SIZE;
    const context = stencil.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#000';
    context.font = '700 150px DM Sans, Arial, sans-serif';
    context.textBaseline = 'alphabetic';
    const baseline = 182;
    const stemRow = 150;
    const stemCenter = (letter, x, side) => {
      context.clearRect(0, 0, SIZE, SIZE);
      context.fillText(letter, x, baseline);
      const data = context.getImageData(0, stemRow, SIZE, 1).data;
      const runs = [];
      let start = null;
      for (let px = 0; px < SIZE; px++) {
        if (data[px * 4 + 3] > 180 && start === null) start = px;
        if ((data[px * 4 + 3] <= 180 || px === SIZE - 1) && start !== null) {
          runs.push([start, px - 1]);
          start = null;
        }
      }
      const run = side === 'right' ? runs[runs.length - 1] : runs[0];
      return (run[0] + run[1]) / 2;
    };
    const mX = stemCenter('M', 8, 'right') - stemCenter('m', 0, 'left');
    context.clearRect(0, 0, SIZE, SIZE);
    context.fillText('M', 8, baseline);
    context.fillText('m', mX, baseline);

    const mark = context.getImageData(0, 0, SIZE, SIZE);
    let minX = SIZE;
    let maxX = 0;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (mark.data[(y * SIZE + x) * 4 + 3] > 180) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      }
    }
    context.clearRect(0, 0, SIZE, SIZE);
    context.putImageData(mark, Math.round(SIZE / 2 - (minX + maxX) / 2), 0);

    const pixels = context.getImageData(0, 0, SIZE, SIZE).data;
    const points = [];
    for (let y = 18; y < 226; y += GLYPH_STEP) {
      for (let x = 8; x < 252; x += GLYPH_STEP) {
        if (pixels[(Math.round(y) * SIZE + Math.round(x)) * 4 + 3] > 180) points.push({ x, y });
      }
    }
    return points.sort(() => Math.random() - .5);
  }

  function sampleArrow() {
    // A single, filled arrow silhouette gives the sharp tip and clean shoulder
    // transitions that separate thick particle strokes cannot achieve.
    const outline = [
      { x: 130, y: 28 }, { x: 224, y: 124 }, { x: 176, y: 124 },
      { x: 176, y: 224 }, { x: 84, y: 224 }, { x: 84, y: 124 }, { x: 36, y: 124 }
    ];
    const inside = (x, y) => {
      let hit = false;
      for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
        const a = outline[i];
        const b = outline[j];
        if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) hit = !hit;
      }
      return hit;
    };
    // Match Mm's sampling grid and per-area density so both marks carry the
    // same visual weight as the nav symbols.
    const points = [];
    for (let y = 28; y <= 224; y += GLYPH_STEP) {
      for (let x = 36; x <= 224; x += GLYPH_STEP) {
        if (inside(x, y)) points.push({ x: x + (Math.random() - .5), y: y + (Math.random() - .5) });
      }
    }
    return points.sort(() => Math.random() - .5);
  }

  class ParticleGlyph {
    constructor(canvas, points) {
      this.context = canvas.getContext('2d');
      this.points = points.map((point) => ({ ...point, phase: Math.random() * Math.PI * 2, direction: Math.random() * Math.PI * 2 }));
      this.hover = 0;
      this.hoverTarget = 0;
      this.time = 0;
    }
    setHover(value) { this.hoverTarget = value ? 1 : 0; }
    draw() {
      this.hover += (this.hoverTarget - this.hover) * .08;
      this.time += .025;
      this.context.clearRect(0, 0, SIZE, SIZE);
      this.context.fillStyle = shellInk;
      this.points.forEach((point) => {
        const movement = REDUCED_MOTION ? 0 : Math.sin(this.time * 1.5 + point.phase) * (1.1 + this.hover * 3) + this.hover * (5 + Math.sin(this.time + point.phase) * 3);
        this.context.beginPath();
        this.context.arc(point.x + Math.cos(point.direction) * movement, point.y + Math.sin(point.direction) * movement, 1.35 + this.hover * .55, 0, Math.PI * 2);
        this.context.fill();
      });
    }
  }

  function mount() {
    if (document.querySelector('.shell-card')) return;

    const top = document.createElement('button');
    top.type = 'button';
    top.className = 'shell-top';
    top.setAttribute('aria-label', 'Back to top');
    top.innerHTML = '<canvas class="shell-top-symbol" width="260" height="260" aria-hidden="true"></canvas>';
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(top);

    const card = document.createElement('a');
    card.href = 'index.html';
    card.className = 'shell-card';
    card.setAttribute('aria-label', 'Back to home');
    card.innerHTML = '<canvas class="shell-card-symbol" width="260" height="260" aria-hidden="true"></canvas>';
    document.body.appendChild(card);

    const mark = new ParticleGlyph(card.querySelector('.shell-card-symbol'), sampleM());
    const arrow = new ParticleGlyph(top.querySelector('.shell-top-symbol'), sampleArrow());
    card.addEventListener('mouseenter', () => mark.setHover(true));
    card.addEventListener('mouseleave', () => mark.setHover(false));
    card.addEventListener('focus', () => mark.setHover(true));
    card.addEventListener('blur', () => mark.setHover(false));
    top.addEventListener('mouseenter', () => arrow.setHover(true));
    top.addEventListener('mouseleave', () => arrow.setHover(false));
    top.addEventListener('focus', () => arrow.setHover(true));
    top.addEventListener('blur', () => arrow.setHover(false));

    const updateTopControl = () => top.classList.toggle('is-visible', window.scrollY > 160);
    window.addEventListener('scroll', updateTopControl, { passive: true });
    updateTopControl();

    const loop = () => {
      mark.draw();
      arrow.draw();
      requestAnimationFrame(loop);
    };
    loop();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
