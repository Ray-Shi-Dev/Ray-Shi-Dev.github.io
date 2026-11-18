// Shared: nav border once the page scrolls; safety net for the hero reveal.
(() => {
  const nav = document.querySelector('.nav');
  const onScroll = () => nav && nav.classList.toggle('is-stuck', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  setTimeout(() => { const h = document.querySelector('.hero'); if (h) h.classList.add('is-ready'); }, 2000);
})();
