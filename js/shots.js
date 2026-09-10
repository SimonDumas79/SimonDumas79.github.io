// Screenshot cycler: click the frame for the next shot, or a dot to jump straight to one.
// Delegated from the document because detail.js clones this markup in fresh every time a card
// opens, so anything bound directly to the elements would die on the first clone.
(() => {
  function show(figure, i) {
    const imgs = figure.querySelectorAll('.shots-frame img');
    const dots = figure.querySelectorAll('.shots-dots button');
    const n = imgs.length;
    if (!n) return;
    i = ((i % n) + n) % n; // wrap in both directions
    imgs.forEach((img, k) => {
      img.classList.toggle('is-shown', k === i);
      img.setAttribute('aria-hidden', k === i ? 'false' : 'true');
    });
    dots.forEach((dot, k) => dot.classList.toggle('is-on', k === i));
    figure.dataset.at = i;
    const frame = figure.querySelector('.shots-frame');
    if (frame) frame.setAttribute('aria-label', `Screenshot ${i + 1} of ${n}. Click for the next.`);
  }

  document.addEventListener('click', e => {
    const dot = e.target.closest('.shots-dots button');
    if (dot) {
      const figure = dot.closest('.shots');
      show(figure, [...dot.parentElement.children].indexOf(dot));
      return;
    }
    const frame = e.target.closest('.shots-frame');
    if (frame) {
      const figure = frame.closest('.shots');
      show(figure, Number(figure.dataset.at || 0) + 1);
    }
  });
})();
