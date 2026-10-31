// Shared inner-page shell: Mm returns home; a particle arrow appears when needed.
(function () {
  const { SIZE, glyphStep, sampleLogoMark, ParticleCloud } = window.MmParticles;
  // Resolved against this script rather than the page, so the home link still
  // works from 404.html, which GitHub Pages serves at whatever path was missing.
  const HOME = new URL('index.html', document.currentScript.src).href;
  const density = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--symbol-particle-density')) || 1;
  const GLYPH_STEP = glyphStep(density);
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

  function sampleArrow(step) {
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
    // Match Mm's per-area density on screen: `step` is scaled up with the dots,
    // since the arrow is drawn far smaller than the mark.
    const points = [];
    for (let y = 28; y <= 224; y += step) {
      for (let x = 36; x <= 224; x += step) {
        if (inside(x, y)) points.push({ x: x + (Math.random() - .5), y: y + (Math.random() - .5) });
      }
    }
    return points.sort(() => Math.random() - .5);
  }

  function mount() {
    if (document.querySelector('.shell-card')) return;

    const top = document.createElement('button');
    top.type = 'button';
    top.className = 'shell-top';
    top.setAttribute('aria-label', 'Back to top');
    top.innerHTML = `<canvas class="shell-top-symbol" width="${SIZE}" height="${SIZE}" aria-hidden="true"></canvas>`;
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(top);

    const card = document.createElement('a');
    card.href = HOME;
    card.className = 'shell-card';
    card.setAttribute('aria-label', 'Back to home');
    card.innerHTML = `<canvas class="shell-card-symbol" width="${SIZE}" height="${SIZE}" aria-hidden="true"></canvas>`;
    document.body.appendChild(card);

    const ink = () => shellInk;
    const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--shell-accent-text').trim() || '#067b85';
    const mark = new ParticleCloud(card.querySelector('.shell-card-symbol'), sampleLogoMark(GLYPH_STEP), ink, accent);
    const arrowCanvas = top.querySelector('.shell-top-symbol');
    const arrowScale = card.querySelector('.shell-card-symbol').clientWidth / arrowCanvas.clientWidth;
    const arrow = new ParticleCloud(arrowCanvas, sampleArrow(GLYPH_STEP * arrowScale), ink, null, { scale: arrowScale });
    mark.bindHover(card);
    arrow.bindHover(top);

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
