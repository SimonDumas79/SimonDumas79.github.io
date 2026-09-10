// The content panel and the detail card light up around the cursor. This is their own light, not
// the mesh's showing through: the panels are only part-transparent, so the mesh behind them reads
// but is far too faint to light them. Both lights are live at once and they overlap by design.
//
// The gradient is painted once by CSS and only ever translated, so following the cursor costs a
// composite rather than a repaint. The pointer handler does no DOM work at all: it records a
// position and asks for a frame. Inside the frame every rect is read before anything is written,
// so a write never dirties layout that a later read has to recompute, and the lit class is only
// touched when it actually changes.
(() => {
  // How far outside a panel the light starts coming up. Half the light's own width, so it fades in
  // exactly as its edge reaches the panel - read from the CSS so --glow-size stays the only dial.
  function reach(el) {
    const n = parseFloat(getComputedStyle(el).getPropertyValue('--glow-size'));
    return (n || 300) / 2;
  }
  const lights = [
    ['.surface', 'panelGlow'],
    ['.detail', 'detailGlow'],
  ].map(([sel, id]) => ({ box: document.querySelector(sel), el: document.getElementById(id), lit: false }))
   .filter(l => l.box && l.el);
  if (!lights.length) return;
  for (const l of lights) l.reach = reach(l.el);
  window.addEventListener('resize', () => { for (const l of lights) l.reach = reach(l.el); }, { passive: true });

  let mx = 0, my = 0, queued = false, seen = false;

  function request() { if (!queued) { queued = true; requestAnimationFrame(draw); } }

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
      const on = x > -l.reach && y > -l.reach && x < r.width + l.reach && y < r.height + l.reach;
      // Only one panel is ever lit, so the other is left alone rather than written every frame.
      if (on || l.lit) l.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      light(l, on);
    });
  }

  function at(x, y) { mx = x; my = y; seen = true; request(); }

  document.addEventListener('mousemove', e => at(e.clientX, e.clientY), { passive: true });

  // Touch never fires mousemove while a finger is down - the compatibility mouse events only arrive
  // once the touch ends, which is why a tap moved the light and a swipe did not. Pointer events do
  // not fix it either: the moment the browser claims a gesture for scrolling it fires pointercancel
  // and the pointermove stream stops, and an up-or-down swipe is exactly that gesture. touchmove
  // keeps firing on a passive listener for the whole scroll, so it is the one that actually tracks.
  const track = e => { const t = e.touches[0]; if (t) at(t.clientX, t.clientY); };
  document.addEventListener('touchstart', track, { passive: true });
  document.addEventListener('touchmove', track, { passive: true });

  // The pointer is in viewport coordinates but the light is positioned inside its panel, so any
  // scroll that moves a panel relative to the viewport moves the light off the cursor. On narrow
  // screens the document scrolls and the panels ride with it, which is exactly that case. Capture,
  // so scrolls inside the panel and the detail card are caught too - those do not bubble.
  document.addEventListener('scroll', () => { if (seen) request(); }, { passive: true, capture: true });

  document.addEventListener('mouseleave', () => lights.forEach(l => light(l, false)));
})();
