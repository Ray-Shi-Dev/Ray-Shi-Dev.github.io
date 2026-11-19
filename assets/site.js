// Shared behaviour: nav border, hero reveal safety net, card spotlight,
// charts that draw when they scroll into view, and the case-study table of contents.
(() => {
  const nav = document.querySelector('.nav');
  const onScroll = () => nav && nav.classList.toggle('is-stuck', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  setTimeout(() => { const h = document.querySelector('.hero'); if (h) h.classList.add('is-ready'); }, 2000);

  // Spotlight follows the pointer on cards (pointer devices only).
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.spot').forEach(el => {
      el.addEventListener('pointermove', ev => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${ev.clientX - r.left}px`);
        el.style.setProperty('--my', `${ev.clientY - r.top}px`);
      });
    });
  }

  // Charts draw once when they become visible.
  const charts = document.querySelectorAll('.viz');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { threshold: 0.35 });
    charts.forEach(c => io.observe(c));
  } else charts.forEach(c => c.classList.add('in'));

  // Case-study contents: highlight the section in view.
  const links = [...document.querySelectorAll('.case-toc a')];
  if (links.length && 'IntersectionObserver' in window) {
    const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const sio = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { links.forEach(a => a.classList.remove('is-active')); const a = map.get(en.target.id); if (a) a.classList.add('is-active'); }
    }), { rootMargin: '-30% 0px -60% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) sio.observe(s); });
  }
})();

// Featured card: before/after tabs (arrow keys move between tabs).
(() => {
  document.querySelectorAll('.diff-switch').forEach(win => {
    const tabs = [...win.querySelectorAll('.diff-tab')];
    const select = i => tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    tabs.forEach((t, i) => {
      t.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); select(i); });
      t.addEventListener('keydown', ev => {
        if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
        ev.preventDefault();
        const n = (i + (ev.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        select(n); tabs[n].focus();
      });
    });
  });
})();

// Metrics count up once when they scroll into view.
(() => {
  const els = [...document.querySelectorAll('[data-count]')];
  if (!els.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (el, v) => `${el.dataset.pre || ''}${v.toFixed(+el.dataset.dec || 0)}${el.dataset.suf || ''}`;
  const run = el => {
    const target = parseFloat(el.dataset.count), t0 = performance.now(), dur = 1400;
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(el, target * e);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (reduce || !('IntersectionObserver' in window)) return;
  els.forEach(el => { el.textContent = fmt(el, 0); });
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
  }), { threshold: 0.6 });
  els.forEach(el => io.observe(el));
})();
