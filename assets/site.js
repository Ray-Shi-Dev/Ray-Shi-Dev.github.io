// Shared: nav border once the page scrolls; safety net for the hero reveal.
(() => {
  const nav = document.querySelector('.nav');
  const onScroll = () => nav && nav.classList.toggle('is-stuck', window.scrollY > 8);
  const hero = document.querySelector('.hero');
  if (nav && hero && 'IntersectionObserver' in window) {
    const navH = () => nav.getBoundingClientRect().height;
    new IntersectionObserver(([en]) => nav.classList.toggle('nav--dark', en.isIntersecting),
      { rootMargin: `-${Math.round(navH())}px 0px 0px 0px`, threshold: 0 }).observe(hero);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  setTimeout(() => { const h = document.querySelector('.hero'); if (h) h.classList.add('is-ready'); }, 2000);
})();
