// The content panel lights up around the cursor. The mesh behind the page does the same thing to
// the triangles, but the panel is opaque, so none of that light reaches it - this is the panel's
// own. The gradient is painted once and then only translated: moving it costs a composite, while
// redrawing a gradient that size every mousemove would not be cheap.
(() => {
  const surface = document.querySelector('.surface');
  const glow = document.getElementById('panelGlow');
  if (!surface || !glow) return;

  let x = 0, y = 0, queued = false;

  function draw() {
    queued = false;
    glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  document.addEventListener('mousemove', e => {
    const r = surface.getBoundingClientRect();
    x = e.clientX - r.left;
    y = e.clientY - r.top;
    // Lit a little beyond the panel too, so the light arrives before the pointer crosses the edge
    // rather than snapping on at it.
    const near = x > -220 && y > -220 && x < r.width + 220 && y < r.height + 220;
    glow.classList.toggle('is-lit', near);
    if (!queued) { queued = true; requestAnimationFrame(draw); }
  }, { passive: true });

  document.addEventListener('mouseleave', () => glow.classList.remove('is-lit'));
})();
