/* ==========================================================================
   Site interactions: reveal, nav, lightbox (figures + photo), email.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  /* ---------- reveal on scroll ---------- */
  (function () {
    var els = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) { root.classList.add('reveal-all'); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
    els.forEach(function (el) { io.observe(el); });
    window.addEventListener('beforeprint', function () { root.classList.add('reveal-all'); });
  })();
  window.__hjReady = true;

  /* ---------- nav: scrolled state, progress, active link ---------- */
  var nav = $('[data-nav]');
  var bar = $('.progress__bar');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      if (nav) nav.classList.toggle('is-scrolled', y > 8);
      var h = root.scrollHeight - window.innerHeight;
      if (bar) bar.style.setProperty('--p', (h > 0 ? Math.min(100, y / h * 100) : 0).toFixed(2) + '%');
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (nav && 'IntersectionObserver' in window) {
    var links = $$('.nav__links a[href^="#"]', nav);
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('is-active'); });
        var a = map[en.target.id];
        if (a) a.classList.add('is-active');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('main section[id]').forEach(function (s) { spy.observe(s); });
  }

  /* ---------- mobile menu ---------- */
  var menuBtn = $('[data-menu-btn]');
  var menu = $('[data-menu]');
  function setMenu(open) {
    if (!nav || !menuBtn) return;
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { var first = $('a', menu); if (first) setTimeout(function () { first.focus(); }, 60); }
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
    });
    var desk = window.matchMedia('(min-width: 961px)');
    var onDesk = function (e) { if (e.matches) setMenu(false); };
    if (desk.addEventListener) desk.addEventListener('change', onDesk); else if (desk.addListener) desk.addListener(onDesk);
  }

  /* ---------- lightbox: publication figures + the full photo ---------- */
  (function () {
    var lb = $('[data-lightbox]');
    if (!lb) return;
    var img = $('[data-lightbox-img]', lb), cap = $('[data-lightbox-cap]', lb), closeBtn = $('.lightbox__close', lb);
    var last = null;
    function open(src, alt, caption, isFigure) {
      last = document.activeElement;
      img.src = src; img.alt = alt || '';
      cap.innerHTML = caption || '';
      lb.classList.toggle('is-figure', !!isFigure);
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }
    function close() {
      lb.hidden = true;
      document.body.style.overflow = '';
      img.removeAttribute('src');
      if (last) last.focus();
    }
    $$('.paper__zoom').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fig = btn.closest('figure');
        if (!fig || !fig.classList.contains('has-image')) return;
        var im = $('img', btn), fc = $('figcaption', fig);
        // Figures get a white mat; journal covers are shown full-bleed
        open(im.currentSrc || im.src, im.alt, fc ? fc.innerHTML : '', !fig.classList.contains('thumb--cover'));
      });
    });
    var ill = $('[data-photo]');
    if (ill) {
      var webp = document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
      ill.addEventListener('click', function () {
        open('assets/img/photo-1200.' + (webp ? 'webp' : 'jpg'), 'HJ Lee smiling, holding a small black-and-white kitten', '', false);
      });
    }
    $$('[data-lightbox-close]', lb).forEach(function (el) { el.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }
    });
  })();

  /* ---------- email (assembled on interaction to deter scrapers) ---------- */
  function addr(el) { return el.getAttribute('data-user') + '@' + el.getAttribute('data-domain'); }
  $$('[data-email]').forEach(function (a) {
    var arm = function () { a.setAttribute('href', 'mailto:' + addr(a)); };
    ['pointerenter', 'focus', 'touchstart', 'click'].forEach(function (ev) { a.addEventListener(ev, arm, { passive: true }); });
  });

  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
