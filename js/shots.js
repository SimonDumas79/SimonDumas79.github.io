// Screenshot cycler: advances on its own every few seconds, or click the frame for the next shot
// and a dot to jump straight to one. The dwell time is --shots-interval in the CSS, which is also
// the fill animation's duration, so the bar under the shot always reads as the real countdown.
// Delegated from the document because detail.js clones this markup in fresh every time a card
// opens, so anything bound directly to the elements would die on the first clone.
(() => {
  let figure = null;   // the gallery currently in the open card, if any
  let timer = null;
  let dueAt = 0;
  let left = 0;

  // CSS owns the dwell time so the bar and the advance cannot be set to different numbers.
  function hold() {
    const raw = figure && getComputedStyle(figure).getPropertyValue('--shots-interval').trim();
    const n = parseFloat(raw);
    if (!n) return 5000;
    return raw.endsWith('ms') ? n : n * 1000;
  }

  // Held while the pointer is over the gallery, while it has visible keyboard focus, and whenever
  // the card is shut. The same three conditions pause the fill animation in the CSS.
  function held() {
    if (!figure) return true;
    const wrap = figure.closest('.detail-wrap');
    if (wrap && !wrap.classList.contains('open')) return true;
    if (figure.matches(':hover')) return true;
    try { if (figure.querySelector(':focus-visible')) return true; } catch (e) { /* older engines */ }
    return false;
  }

  function stop() { clearTimeout(timer); timer = null; }

  function start(ms) {
    stop();
    if (!figure) return;
    left = ms;
    dueAt = Date.now() + ms;
    timer = setTimeout(tick, ms);
  }

  function tick() {
    timer = null;
    if (!figure || !figure.isConnected) { figure = null; return; }
    if (held()) { left = 0; return; } // resume() fires it the moment the hold lifts
    show(figure, Number(figure.dataset.at || 0) + 1);
  }

  function pause() {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    left = Math.max(0, dueAt - Date.now());
  }

  function resume() { if (!timer && figure && !held()) start(left); }

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
    // Moving is-on to another dot restarts its fill animation from zero, which is why the bar
    // resets on a manual click as well as on an automatic advance.
    dots.forEach((dot, k) => dot.classList.toggle('is-on', k === i));
    fig.dataset.at = i;
    const frame = fig.querySelector('.shots-frame');
    if (frame) frame.setAttribute('aria-label', `Screenshot ${i + 1} of ${n}. Click for the next.`);
    start(hold());
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
