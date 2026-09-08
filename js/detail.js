// Detail card: clicking an entry fills the card from the entry's <template class="detail-src"> and opens it.
// Wide screens: the card lives in the left column under the tagline. Narrow: it moves to sit right under the entry.
(() => {
  const wrap = document.getElementById('detailWrap');
  const detail = document.getElementById('detail');
  const title = document.getElementById('detailTitle');
  const body = document.getElementById('detailBody');
  const closeBtn = document.getElementById('detailClose');
  const identity = document.querySelector('.identity');
  const social = document.querySelector('.social');
  const narrow = window.matchMedia('(max-width: 900px)');
  let current = null;

  function place(entry) {
    if (narrow.matches && entry) entry.after(wrap);
    else if (wrap.parentElement !== identity) identity.insertBefore(wrap, social);
  }

  function open(entry) {
    const tpl = entry.querySelector('template.detail-src');
    if (!tpl) return;
    if (current) current.classList.remove('is-selected');
    current = entry;
    entry.classList.add('is-selected');
    title.textContent = entry.querySelector('h4').textContent.replace(/↗/g, '').trim();
    body.replaceChildren(tpl.content.cloneNode(true));
    place(entry);
    wrap.classList.add('open');
    detail.scrollTop = 0;
  }

  function close() {
    if (current) current.classList.remove('is-selected');
    current = null;
    wrap.classList.remove('open');
  }

  function toggle(entry) { current === entry ? close() : open(entry); }

  document.querySelectorAll('.entry').forEach(entry => {
    entry.addEventListener('click', e => {
      if (e.target.closest('a')) return; // the title link still goes where it points
      toggle(entry);
    });
    entry.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('a')) { e.preventDefault(); toggle(entry); }
    });
  });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  narrow.addEventListener('change', () => place(current));
})();
