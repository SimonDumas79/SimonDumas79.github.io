// The content panel and the detail card light up around the cursor. Each is opaque, so neither can
// borrow a light from behind it - they carry their own, and the backdrop mesh carries none.
//
// The gradient is painted once by CSS and only ever translated, so following the cursor costs a
// composite rather than a repaint. The pointer handler does no DOM work at all: it records a
// position and asks for a frame. Inside the frame every rect is read before anything is written,
// so a write never dirties layout that a later read has to recompute, and the lit class is only
// touched when it actually changes.
(() => {
  const REACH = 220; // px beyond a panel's edge where its light starts to come up
  const lights = [
    ['.surface', 'panelGlow'],
    ['.detail', 'detailGlow'],
  ].map(([sel, id]) => ({ box: document.querySelector(sel), el: document.getElementById(id), lit: false }))
   .filter(l => l.box && l.el);
  if (!lights.length) return;

  let mx = 0, my = 0, queued = false;

  function light(l, on) {
    if (l.lit === on) return;
    l.lit = on;
    l.el.classList.toggle('is-lit', on);
  }

  function draw() {
    queued = false;
    const rects = lights.map(l => l.box.getBoundingClientRect()); // every read first
    lights.forEach((l, i) => {
      const r = rects[i];
      if (!r.width) { light(l, false); return; } // a closed card has nothing to light
      const x = mx - r.left, y = my - r.top;
      const on = x > -REACH && y > -REACH && x < r.width + REACH && y < r.height + REACH;
      // Only one panel is ever lit, so the other is left alone rather than written every frame.
      if (on || l.lit) l.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      light(l, on);
    });
  }

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (!queued) { queued = true; requestAnimationFrame(draw); }
  }, { passive: true });

  document.addEventListener('mouseleave', () => lights.forEach(l => light(l, false)));
})();
