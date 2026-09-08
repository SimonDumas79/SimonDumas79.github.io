// Tabs follow the scroll; clicking a tab scrolls to its section.
// The glass panel is the scroller on desktop, the document on narrow screens.
(() => {
  const panel = document.getElementById('panel');
  const tabsNav = document.querySelector('.tabs');
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const sections = tabs.map(t => document.getElementById(t.dataset.target));
  const narrow = window.matchMedia('(max-width: 900px)');
  const ACTIVE_LINE = 0.4; // a section is active once its top crosses this fraction of the scroller's height

  const usePanel = () => !narrow.matches;
  const scroller = () => (usePanel() ? panel : window);

  function scrollTop() { return usePanel() ? panel.scrollTop : window.scrollY; }
  function viewH() { return usePanel() ? panel.clientHeight : window.innerHeight; }
  function maxScroll() {
    return usePanel()
      ? panel.scrollHeight - panel.clientHeight
      : document.documentElement.scrollHeight - window.innerHeight;
  }
  function sectionTop(s) {
    if (usePanel()) return s.offsetTop - panel.offsetTop;
    return s.getBoundingClientRect().top + window.scrollY - tabsNav.offsetHeight;
  }

  let raf = 0;
  function update() {
    raf = 0;
    const line = scrollTop() + viewH() * ACTIVE_LINE;
    let active = 0;
    sections.forEach((s, i) => { if (sectionTop(s) <= line) active = i; });
    // at the very bottom the last section wins, even when it is short
    if (maxScroll() > 0 && scrollTop() >= maxScroll() - 2) active = sections.length - 1;
    tabs.forEach((t, i) => t.classList.toggle('is-active', i === active));
  }
  function onScroll() { if (!raf) raf = requestAnimationFrame(update); }

  function bind() {
    panel.removeEventListener('scroll', onScroll);
    window.removeEventListener('scroll', onScroll);
    scroller().addEventListener('scroll', onScroll, { passive: true });
    update();
  }

  tabs.forEach((t, i) => t.addEventListener('click', e => {
    e.preventDefault();
    scroller().scrollTo({ top: sectionTop(sections[i]), behavior: 'smooth' });
    history.replaceState(null, '', '#' + t.dataset.target);
  }));

  // A wheel anywhere on the page drives the panel, so scrolling over the left column still works
  window.addEventListener('wheel', e => {
    if (!usePanel() || panel.contains(e.target)) return;
    panel.scrollBy({ top: e.deltaY, left: 0 });
  }, { passive: true });

  narrow.addEventListener('change', bind);
  window.addEventListener('resize', onScroll);
  bind();
})();
