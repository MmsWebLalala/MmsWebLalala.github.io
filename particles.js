// Shared particle-cloud renderer. The floating Mm mark on the home page and the
// one pinned to the corner of every inner page are the same construction — a
// stencil sampled into dots that breathe on a sine wave — so both draw from
// here and cannot drift apart.
window.MmParticles = (function () {
  const SIZE = 260;

  // Same per-area weight as the home page's nav symbols (0.55 × 0.50 dots/px²)
  // so no cloud on the site reads thinner than its neighbours.
  function glyphStep(density) {
    return 1 / Math.sqrt(0.55 * 0.50 * (density || 1));
  }

  // Renders "Mm" into an offscreen stencil, slides the lowercase m so its left
  // stem sits under the uppercase M's right stem, centres the pair, then samples
  // the opaque pixels on a fixed grid.
  function sampleMmMark(step) {
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
    for (let y = 18; y < 226; y += step) {
      for (let x = 8; x < 252; x += step) {
        // Sub-pixel jitter so the sampling grid never shows through as banding.
        if (pixels[(Math.round(y) * SIZE + Math.round(x)) * 4 + 3] > 180) {
          points.push({ x: x + (Math.random() - .5), y: y + (Math.random() - .5) });
        }
      }
    }
    return points.sort(() => Math.random() - .5);
  }

  // Samples any drawing into a cloud on the same grid as the Mm mark. `draw`
  // receives a SIZE×SIZE 2D context and two callbacks — ink() and accent() —
  // that switch which layer the following fills and strokes land on; accent
  // points come back flagged so the cloud can colour them separately.
  function sampleDrawing(draw, step) {
    const layers = { ink: [], accent: [] };
    const stencil = document.createElement('canvas');
    stencil.width = SIZE;
    stencil.height = SIZE;
    const context = stencil.getContext('2d', { willReadFrequently: true });
    for (const layer of Object.keys(layers)) {
      context.clearRect(0, 0, SIZE, SIZE);
      context.fillStyle = context.strokeStyle = '#000';
      context.save();
      // Drawing on the other layer still happens, just at zero alpha, so the
      // callback never has to know which pass it is in. Ink is the default.
      context.globalAlpha = layer === 'ink' ? 1 : 0;
      draw(context, {
        ink: () => { context.globalAlpha = layer === 'ink' ? 1 : 0; },
        accent: () => { context.globalAlpha = layer === 'accent' ? 1 : 0; }
      });
      context.restore();
      const pixels = context.getImageData(0, 0, SIZE, SIZE).data;
      for (let y = 0; y < SIZE; y += step) {
        for (let x = 0; x < SIZE; x += step) {
          if (pixels[(Math.round(y) * SIZE + Math.round(x)) * 4 + 3] > 180) {
            layers[layer].push({ x: x + (Math.random() - .5), y: y + (Math.random() - .5), accent: layer === 'accent' });
          }
        }
      }
    }
    return layers.ink.concat(layers.accent).sort(() => Math.random() - .5);
  }

  // getColor is a function, not a value, so each page keeps reading its own ink
  // variable and the cloud recolours itself when the theme flips. getAccent is
  // optional and only used for points sampled with the accent flag.
  //
  // `scale` is for clouds shown far smaller than the Mm mark: the canvas is
  // always SIZE px inside, so a small icon would shrink its dots and motion to
  // dust. Sample with glyphStep × scale and pass the same scale here, and the
  // dots, their spacing and their movement read at the Mm mark's size on screen.
  class ParticleCloud {
    constructor(canvas, points, getColor, getAccent, { scale = 1 } = {}) {
      this.context = canvas.getContext('2d');
      this.getColor = getColor;
      this.getAccent = getAccent || getColor;
      this.scale = scale;
      this.points = points.map((point) => ({
        ...point,
        phase: Math.random() * Math.PI * 2,
        direction: Math.random() * Math.PI * 2
      }));
      this.hover = 0;
      this.hoverTarget = 0;
      this.time = 0;
      // Ambient breathing is decorative; the OS preference turns it off and
      // leaves only the user-triggered hover swell.
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    setHover(value) { this.hoverTarget = value ? 1 : 0; }
    bindHover(element) {
      element.addEventListener('mouseenter', () => this.setHover(true));
      element.addEventListener('mouseleave', () => this.setHover(false));
      element.addEventListener('focus', () => this.setHover(true));
      element.addEventListener('blur', () => this.setHover(false));
    }
    draw() {
      this.hover += (this.hoverTarget - this.hover) * .08;
      this.time += .025;
      this.context.clearRect(0, 0, SIZE, SIZE);
      const ink = this.getColor();
      const accent = this.getAccent();
      this.points.forEach((point) => {
        this.context.fillStyle = point.accent ? accent : ink;
        const movement = this.reducedMotion ? 0
          : (Math.sin(this.time * 1.5 + point.phase) * (1.1 + this.hover * 3)
            + this.hover * (5 + Math.sin(this.time + point.phase) * 3)) * this.scale;
        this.context.beginPath();
        this.context.arc(
          point.x + Math.cos(point.direction) * movement,
          point.y + Math.sin(point.direction) * movement,
          (1.35 + this.hover * .55) * this.scale, 0, Math.PI * 2
        );
        this.context.fill();
      });
    }
  }

  return { SIZE, glyphStep, sampleMmMark, sampleDrawing, ParticleCloud };
})();
