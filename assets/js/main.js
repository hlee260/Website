/* ==========================================================================
   Site interactions: reveal, nav, theme, scramble text, lightbox (figures +
   photo), email, DNA-encoded footer.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
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
    var links = $$('.nav__links a', nav);
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

  /* ---------- theme toggle (circular reveal where supported) ---------- */
  var themeBtn = $('[data-theme-toggle]');
  var metaTheme = $('meta[name="theme-color"]');
  function labelTheme() {
    var t = root.getAttribute('data-theme');
    if (themeBtn) themeBtn.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    if (metaTheme) metaTheme.setAttribute('content', t === 'light' ? '#f7f6f1' : '#07090f');
  }
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('hj-theme', t); } catch (e) {}
    labelTheme();
    document.dispatchEvent(new CustomEvent('hj:themechange', { detail: t }));
  }
  labelTheme();
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      if (!document.startViewTransition || reduce.matches) { applyTheme(next); return; }
      var r = themeBtn.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var rad = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      var vt = document.startViewTransition(function () { applyTheme(next); });
      vt.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 700, easing: 'cubic-bezier(.2,.75,.2,1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(function () {});
    });
  }

  /* ---------- nucleotide scramble for the rotating word ---------- */
  function Scrambler(el, chars) { this.el = el; this.chars = chars; this.raf = 0; }
  Scrambler.prototype.set = function (text) {
    var self = this, old = this.el.textContent, n = Math.max(old.length, text.length);
    this.q = [];
    for (var i = 0; i < n; i++) {
      var s = Math.floor(Math.random() * 12);
      this.q.push({ from: old[i] || '', to: text[i] || '', s: s, e: s + 8 + Math.floor(Math.random() * 14), ch: '' });
    }
    this.f = 0;
    cancelAnimationFrame(this.raf);
    return new Promise(function (res) { self.done = res; self.tick(); });
  };
  Scrambler.prototype.tick = function () {
    var out = '', complete = 0;
    for (var i = 0; i < this.q.length; i++) {
      var q = this.q[i];
      if (this.f >= q.e) { complete++; out += q.to; }
      else if (this.f >= q.s) {
        if (!q.ch || Math.random() < 0.3) q.ch = this.chars[Math.floor(Math.random() * this.chars.length)];
        out += '<span class="s-dim">' + q.ch + '</span>';
      } else out += q.from;
    }
    this.el.innerHTML = out;
    if (complete === this.q.length) this.done();
    else { this.f++; this.raf = requestAnimationFrame(this.tick.bind(this)); }
  };
  (function () {
    var el = $('.scramble');
    if (!el) return;
    var words = (el.getAttribute('data-words') || '').split(',').filter(Boolean);
    if (words.length < 2) return;
    el.setAttribute('aria-hidden', 'true');
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1];
    el.parentNode.insertBefore(sr, el);
    if (reduce.matches) return;
    var sc = new Scrambler(el, 'AUGC'), i = 0;
    function next() {
      i = (i + 1) % words.length;
      sc.set(words[i]).then(function () { setTimeout(next, 2400); });
    }
    setTimeout(next, 2600);
  })();

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
        open(im.currentSrc || im.src, im.alt, fc ? fc.innerHTML : '', true);
      });
    });
    var ill = $('[data-photo]');
    if (ill) {
      var webp = document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
      ill.addEventListener('click', function () {
        open('assets/img/photo-1200.' + (webp ? 'webp' : 'jpg'), 'HJ Lee smiling, holding a small black-and-white kitten', 'HJ, with feline co-investigator', false);
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
  var toastEl = $('[data-toast]'), toastT = 0;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }
  function addr(el) { return el.getAttribute('data-user') + '@' + el.getAttribute('data-domain'); }
  $$('[data-email]').forEach(function (a) {
    var arm = function () { a.setAttribute('href', 'mailto:' + addr(a)); };
    ['pointerenter', 'focus', 'touchstart', 'click'].forEach(function (ev) { a.addEventListener(ev, arm, { passive: true }); });
  });
  $$('[data-copy-email]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = addr(b);
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        toast(ok ? 'Copied ' + t : t);
      }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(function () { toast('Copied ' + t); }, fallback);
      else fallback();
    });
  });

  /* ---------- DNA-encoded footer message (2 bits per base) ---------- */
  (function () {
    var btn = $('[data-dna]');
    if (!btn) return;
    var out = $('[data-dna-out]', btn);
    var msg = btn.getAttribute('data-dna');
    var B = 'ACGT';
    var groups = msg.split('').map(function (ch) {
      var c = ch.charCodeAt(0), s = '';
      for (var k = 6; k >= 0; k -= 2) s += B[(c >> k) & 3];
      return s;
    });
    function encoded(n) {
      return groups.map(function (g, i) {
        if (i < n) return '<span class="dec">' + (msg[i] === ' ' ? '&nbsp;' : msg[i]) + '</span>';
        return g.split('').map(function (b) { return '<span class="n' + b + '">' + b + '</span>'; }).join('');
      }).join('');
    }
    out.innerHTML = encoded(0);
    var decoded = false, timer = 0, hoverAt = 0;
    function run(toDecoded) {
      clearInterval(timer);
      decoded = toDecoded;
      btn.setAttribute('aria-label', toDecoded ? 'Decoded message: ' + msg : 'A DNA-encoded message. Activate to decode.');
      if (reduce.matches) { out.innerHTML = encoded(toDecoded ? groups.length : 0); return; }
      var n = toDecoded ? 0 : groups.length;
      timer = setInterval(function () {
        n += toDecoded ? 1 : -1;
        out.innerHTML = encoded(n);
        if (n <= 0 || n >= groups.length) clearInterval(timer);
      }, 55);
    }
    // Hover decodes on desktop; tap/keyboard toggles (a click right after hover-decode is ignored).
    btn.addEventListener('click', function () { if (Date.now() - hoverAt > 700) run(!decoded); });
    btn.addEventListener('mouseenter', function () { if (!decoded) { hoverAt = Date.now(); run(true); } });
    btn.addEventListener('mouseleave', function () { if (decoded) run(false); });
  })();

  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  try {
    console.log('%c5′-ATGGCTAGC…-3′  hello, curious one 🧬', 'color:#6ef2c8;font:600 14px ui-monospace,monospace');
  } catch (e) {}
})();
