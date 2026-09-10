// Screenshot cycler: advances on its own every few seconds, or click the frame for the next shot
// and a dot to jump straight to one. The dwell time is --shots-interval in the CSS.
// Delegated from the document because detail.js clones this markup in fresh every time a card
// opens, so anything bound directly to the elements would die on the first clone.
//
// The countdown bar is stepped from here rather than run as a CSS animation. The card it sits in
// has a backdrop-filter, and anything animating continuously inside one of those makes the glass
// re-blur every frame: measured at 29fps, against 60fps for the same bar stepped four times a
// second. One interval both paints the bar and advances the shot, so they cannot drift apart.
(() => {
  const STEP = 250; // ms between repaints - 20 steps across a 5s dwell, about 1px each on a 22px bar
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let figure = null;  // the gallery in the open card, if any
  let ticker = null;
  let since = 0;      // when the current run began
  let banked = 0;     // time already served before the last pause

  // CSS owns the dwell time so the bar and the advance cannot be given different numbers.
  function hold() {
    const raw = figure && getComputedStyle(figure).getPropertyValue('--shots-interval').trim();
    const n = parseFloat(raw);
    if (!n) return 5000;
    return raw.endsWith('ms') ? n : n * 1000;
  }

  // Held while the pointer is over the gallery, while it has visible keyboard focus, and whenever
  // the card is shut.
  function held() {
    if (!figure) return true;
    const wrap = figure.closest('.detail-wrap');
    if (wrap && !wrap.classList.contains('open')) return true;
    if (figure.matches(':hover')) return true;
    try { if (figure.querySelector(':focus-visible')) return true; } catch (e) { /* older engines */ }
    return false;
  }

  function elapsed() { return banked + (ticker ? Date.now() - since : 0); }

  function paint() {
    if (figure) figure.style.setProperty('--shots-progress', Math.min(1, elapsed() / hold()).toFixed(3));
  }

  function stop() { clearInterval(ticker); ticker = null; }

  function run() {
    stop();
    if (!figure || reduced.matches || held()) { paint(); return; }
    since = Date.now();
    ticker = setInterval(() => {
      if (elapsed() >= hold()) { show(figure, Number(figure.dataset.at || 0) + 1); return; }
      paint();
    }, STEP);
    paint();
  }

  function pause() {
    if (!ticker) return;
    banked += Date.now() - since;
    stop();
    paint();
  }

  function resume() { if (!ticker && figure) run(); }

  function show(fig, i) {
    const imgs = fig.querySelectorAll('.shots-frame img');
    const dots = fig.querySelectorAll('.shots-dots button');
    const n = imgs.length;
    if (!n) return;
    i = ((i % n) + n) % n; // wrap in both directions
    imgs.forEach((img, k) => {
      img.classList.toggle('is-shown', k === i);
      img.setAttribute('aria-hidden', k === i ? 'false' : 'true');
    });
    dots.forEach((dot, k) => dot.classList.toggle('is-on', k === i));
    fig.dataset.at = i;
    const frame = fig.querySelector('.shots-frame');
    if (frame) frame.setAttribute('aria-label', `Screenshot ${i + 1} of ${n}. Click for the next.`);
    banked = 0;
    run();
  }

  // detail.js replaces the card's contents wholesale, so watch for a gallery arriving or leaving
  // rather than reaching into that file.
  const body = document.getElementById('detailBody');
  if (body) {
    new MutationObserver(() => {
      const fig = body.querySelector('.shots');
      if (fig === figure) return;
      figure = fig;
      if (fig) show(fig, 0); else stop();
    }).observe(body, { childList: true });
  }

  document.addEventListener('click', e => {
    const dot = e.target.closest('.shots-dots button');
    if (dot) {
      show(dot.closest('.shots'), [...dot.parentElement.children].indexOf(dot));
      return;
    }
    const frame = e.target.closest('.shots-frame');
    if (frame) {
      const fig = frame.closest('.shots');
      show(fig, Number(fig.dataset.at || 0) + 1);
    }
  });

  document.addEventListener('mouseover', e => { if (figure && figure.contains(e.target)) pause(); });
  document.addEventListener('mouseout', e => {
    if (!figure || !figure.contains(e.target)) return;
    if (e.relatedTarget && figure.contains(e.relatedTarget)) return; // still inside the gallery
    resume();
  });
  document.addEventListener('focusin', e => { if (figure && figure.contains(e.target)) pause(); });
  document.addEventListener('focusout', e => {
    if (!figure || !figure.contains(e.target)) return;
    if (e.relatedTarget && figure.contains(e.relatedTarget)) return;
    resume();
  });
})();
