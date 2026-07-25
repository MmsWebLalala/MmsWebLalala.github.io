// Shared inner-page shell: Mm returns home; a particle arrow appears when needed.
(function () {
  const { SIZE, glyphStep, sampleMmMark, ParticleCloud } = window.MmParticles;
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
    card.href = 'index.html';
    card.className = 'shell-card';
    card.setAttribute('aria-label', 'Back to home');
    card.innerHTML = `<canvas class="shell-card-symbol" width="${SIZE}" height="${SIZE}" aria-hidden="true"></canvas>`;
    document.body.appendChild(card);

    const ink = () => shellInk;
    const mark = new ParticleCloud(card.querySelector('.shell-card-symbol'), sampleMmMark(GLYPH_STEP), ink);
    const arrow = new ParticleCloud(top.querySelector('.shell-top-symbol'), sampleArrow(), ink);
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
