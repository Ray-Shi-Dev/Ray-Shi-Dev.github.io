// Full-size viewer for portfolio sheets, with keyboard navigation.
(() => {
  const dlg = document.querySelector('.viewer');
  const buttons = [...document.querySelectorAll('.sheet')];
  if (!dlg || !buttons.length) return;
  const img = dlg.querySelector('img');
  const count = dlg.querySelector('.viewer-count');
  let i = 0, opener = null;

  function show(n) {
    i = (n + buttons.length) % buttons.length;
    const b = buttons[i];
    img.src = b.dataset.full;
    img.alt = b.querySelector('img').alt;
    count.textContent = `${i + 1} / ${buttons.length}`;
    const next = buttons[(i + 1) % buttons.length];
    new Image().src = next.dataset.full;
  }
  buttons.forEach((b, n) => b.addEventListener('click', () => { opener = b; show(n); dlg.showModal(); }));
  dlg.addEventListener('click', ev => {
    const act = ev.target.dataset && ev.target.dataset.act;
    if (act === 'prev') show(i - 1);
    else if (act === 'next') show(i + 1);
    else if (act === 'close' || ev.target === dlg) dlg.close();
  });
  dlg.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowRight') { ev.preventDefault(); show(i + 1); }
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); show(i - 1); }
  });
  dlg.addEventListener('close', () => { img.removeAttribute('src'); if (opener) opener.focus(); });
})();
