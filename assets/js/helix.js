/* ==========================================================================
   Hero DNA double helix (canvas 2D, no dependencies)
   - Two canvases: beads behind the viewer's plane go on the back canvas
     (under the portrait), beads in front go on the front canvas (over it),
     so the helix appears to wrap around the photo.
   - Anneals on load, unzips as you scroll, leans toward the pointer.
   - The sequence hides the thrombin-binding aptamer (GGTTGGTGTGGTTGG),
     a classic ARTIST target.
   ========================================================================== */
(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  var cvB = document.querySelector('.helix--back');
  var cvF = document.querySelector('.helix--front');
  var anchor = document.querySelector('[data-portrait] .portrait__ring');
  if (!hero || !cvB || !cvF || !cvB.getContext) return;

  var ctxB = cvB.getContext('2d');
  var ctxF = cvF.getContext('2d');
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- sequence ---------- */
  var COMP = { A: 'T', T: 'A', G: 'C', C: 'G' };
  var N_BP = 48;
  var core = 'GGTTGGTGTGGTTGG';
  var seed = 20240912;
  function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  var seq = [];
  var start = Math.floor((N_BP - core.length) / 2);
  for (var i = 0; i < N_BP; i++) {
    var b = (i >= start && i < start + core.length) ? core[i - start] : 'ATGC'[Math.floor(rand() * 4)];
    seq.push(b);
  }

  /* ---------- palette & sprites ---------- */
  var pal = {}, sprites = {}, dark = true;
  function hexToRgb(h) {
    h = (h || '').trim().replace('#', '');
    if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
    var n = parseInt(h, 16);
    if (isNaN(n)) return [110, 242, 200];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function readPalette() {
    var cs = getComputedStyle(document.documentElement);
    dark = document.documentElement.getAttribute('data-theme') !== 'light';
    pal = {
      s1: hexToRgb(cs.getPropertyValue('--helix-1')),
      s2: hexToRgb(cs.getPropertyValue('--helix-2')),
      A: hexToRgb(cs.getPropertyValue('--nt-a')),
      T: hexToRgb(cs.getPropertyValue('--nt-u')),
      G: hexToRgb(cs.getPropertyValue('--nt-g')),
      C: hexToRgb(cs.getPropertyValue('--nt-c'))
    };
    sprites = {};
    ['s1', 's2', 'A', 'T', 'G', 'C'].forEach(function (k) { sprites[k] = makeSprite(pal[k]); });
  }
  function makeSprite(rgb) {
    var S = 64, c = document.createElement('canvas');
    c.width = c.height = S;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    var col = rgb.join(',');
    if (dark) {
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.12, 'rgba(' + col + ',1)');
      grd.addColorStop(0.3, 'rgba(' + col + ',.55)');
      grd.addColorStop(0.55, 'rgba(' + col + ',.12)');
      grd.addColorStop(1, 'rgba(' + col + ',0)');
    } else {
      grd.addColorStop(0, 'rgba(' + col + ',1)');
      grd.addColorStop(0.3, 'rgba(' + col + ',.95)');
      grd.addColorStop(0.42, 'rgba(' + col + ',.25)');
      grd.addColorStop(1, 'rgba(' + col + ',0)');
    }
    g.fillStyle = grd;
    g.fillRect(0, 0, S, S);
    return c;
  }

  /* ---------- geometry ---------- */
  var W = 0, H = 0, DPR = 1;
  var geo = { cx: 0, cy: 0, len: 600, R: 60, ang: -Math.PI / 2 + 0.2, bead: 4 };
  var TWIST = 2 * Math.PI / 10.5;   // B-DNA: ~10.5 bp per turn
  var GROOVE = Math.PI * 0.78;      // strand offset -> major/minor groove look
  var F = 720;                      // focal length for perspective

  var motes = [];

  function layout() {
    var hr = hero.getBoundingClientRect();
    W = Math.max(1, hr.width);
    H = Math.max(1, hr.height);
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);   // soft glows don't need full retina
    [cvB, cvF].forEach(function (c) {
      c.width = Math.round(W * DPR);
      c.height = Math.round(H * DPR);
    });

    var mobile = W < 960;
    var pr = anchor ? anchor.getBoundingClientRect() : null;
    if (pr && pr.width > 0) {
      var px = pr.left - hr.left, py = pr.top - hr.top;
      geo.cx = px + pr.width * (mobile ? 0.97 : 1.0);
      geo.cy = py + pr.height * (mobile ? 0.5 : 0.56);
      geo.R = Math.max(30, Math.min(64, pr.width * 0.15));
      geo.len = Math.min(H * (mobile ? 0.9 : 0.95), pr.height * (mobile ? 1.55 : 1.55));
    } else {
      geo.cx = W * 0.78; geo.cy = H * 0.5; geo.R = 56; geo.len = H * 0.9;
    }
    geo.ang = -Math.PI / 2 + (mobile ? 0.14 : 0.16);
    geo.bead = mobile ? 3.3 : 4.2;

    var count = mobile ? 26 : 56;
    motes = [];
    for (var m = 0; m < count; m++) {
      motes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
        r: 0.6 + Math.random() * 1.8,
        k: 'ATGC'[Math.floor(Math.random() * 4)],
        a: 0.12 + Math.random() * 0.35,
        tw: Math.random() * Math.PI * 2
      });
    }
  }

  /* ---------- state ---------- */
  var t0 = null, scrollP = 0;
  var mx = 0, my = 0, tmx = 0, tmy = 0;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(x) { return x * x * (3 - 2 * x); }

  function onScroll() {
    var r = hero.getBoundingClientRect();
    scrollP = clamp(-r.top / (r.height * 0.8), 0, 1);
  }

  function openness(i, introP) {
    var fromTop = (N_BP - 1 - i) / (N_BP - 1);           // 0 at the top end
    var sc = smooth(clamp((scrollP * 1.7 - fromTop) / 0.3, 0, 1));
    var local = clamp((introP - (i / (N_BP - 1)) * 0.55) / 0.45, 0, 1);
    var intro = 1 - smooth(local);                         // anneals bottom → top
    return Math.max(sc, intro);
  }

  /* ---------- drawing ---------- */
  var items = [];
  function push(o) { items.push(o); }

  function draw(t) {
    if (t0 === null) t0 = t;
    var introP = mqReduce.matches ? 1 : clamp((t - t0) / 2200, 0, 1);
    var fade = smooth(clamp(introP * 2.2, 0, 1));
    var spin = mqReduce.matches ? 0.9 : t * 0.00042;

    mx += (tmx - mx) * 0.045;
    my += (tmy - my) * 0.045;

    ctxB.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctxF.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctxB.clearRect(0, 0, W, H);
    ctxF.clearRect(0, 0, W, H);
    var mode = dark ? 'lighter' : 'source-over';
    ctxB.globalCompositeOperation = mode;
    ctxF.globalCompositeOperation = mode;

    /* ambient motes (free nucleotides drifting) */
    for (var m = 0; m < motes.length; m++) {
      var p = motes[m];
      if (!mqReduce.matches) {
        p.vx += (Math.random() - 0.5) * 0.02; p.vy += (Math.random() - 0.5) * 0.02;
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy - scrollP * 0.05;
        if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
        p.tw += 0.02;
      }
      var tw = 0.6 + 0.4 * Math.sin(p.tw);
      var s = p.r * 6;
      ctxB.globalAlpha = p.a * tw * fade * (1 - scrollP * 0.5);
      ctxB.drawImage(sprites[p.k], p.x - s / 2, p.y - s / 2, s, s);
    }

    /* helix */
    var ang = geo.ang + mx * 0.07;
    var ax = Math.cos(ang), ay = Math.sin(ang);
    var px = -ay, py = ax;
    var cx0 = geo.cx + mx * 16, cy0 = geo.cy + my * 10 - scrollP * 40;
    var R0 = geo.R, len = geo.len;
    items.length = 0;

    for (var i = 0; i < N_BP; i++) {
      var open = openness(i, introP);
      for (var k = 0; k < 4; k++) {               // k=0: base pair; k>0: backbone interpolation
        if (k > 0 && i === N_BP - 1) break;
        var f = i + k / 4;
        var sN = f / (N_BP - 1) - 0.5;
        var cx = cx0 + ax * sN * len, cy = cy0 + ay * sN * len;
        var th = f * TWIST + spin;
        var o = k === 0 ? open : Math.max(open, openness(Math.min(N_BP - 1, i + 1), introP));
        var R = R0 * (1 + o * 0.55);
        var sep = o * 34;
        var c1 = Math.cos(th), z1 = R * Math.sin(th);
        var c2 = Math.cos(th + GROOVE), z2 = R * Math.sin(th + GROOVE);
        var k1 = F / (F - z1), k2 = F / (F - z2);
        var d1 = (z1 / R + 1) / 2, d2 = (z2 / R + 1) / 2;   // 0 far .. 1 near
        var x1 = cx + px * (R * c1 + sep) * k1, y1 = cy + py * (R * c1 + sep) * k1;
        var x2 = cx + px * (R * c2 - sep) * k2, y2 = cy + py * (R * c2 - sep) * k2;
        var endFade = 1 - Math.pow(Math.abs(sN) * 2, 6);    // soften the ends

        if (k === 0) {
          var b1 = seq[i], b2 = COMP[b1];
          push({ t: 0, x: x1, y: y1, z: z1, d: d1, key: 's1', r: geo.bead * 1.15, a: endFade });
          push({ t: 0, x: x2, y: y2, z: z2, d: d2, key: 's2', r: geo.bead * 1.15, a: endFade });
          var rungA = (1 - o) * endFade;
          if (rungA > 0.02) {
            var mxp = (x1 + x2) / 2, myp = (y1 + y2) / 2, mz = (z1 + z2) / 2;
            push({ t: 1, x: x1, y: y1, x2: mxp, y2: myp, z: (z1 + mz) / 2, d: (d1 + (mz / R + 1) / 2) / 2, key: b1, a: rungA });
            push({ t: 1, x: x2, y: y2, x2: mxp, y2: myp, z: (z2 + mz) / 2, d: (d2 + (mz / R + 1) / 2) / 2, key: b2, a: rungA });
          }
        } else {
          push({ t: 0, x: x1, y: y1, z: z1, d: d1, key: 's1', r: geo.bead * 0.55, a: endFade * 0.9 });
          push({ t: 0, x: x2, y: y2, z: z2, d: d2, key: 's2', r: geo.bead * 0.55, a: endFade * 0.9 });
        }
      }
    }

    items.sort(function (a, b) { return a.z - b.z; });

    for (var n = 0; n < items.length; n++) {
      var it = items[n];
      var ctx = it.z >= 0 ? ctxF : ctxB;
      var depthA = (0.22 + 0.78 * it.d) * it.a * fade;
      if (it.t === 0) {
        var size = it.r * (0.6 + 0.65 * it.d) * (dark ? 5.2 : 3.4);
        ctx.globalAlpha = depthA;
        ctx.drawImage(sprites[it.key], it.x - size / 2, it.y - size / 2, size, size);
      } else {
        var c = pal[it.key];
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (depthA * (dark ? 0.85 : 0.9)).toFixed(3) + ')';
        ctx.lineWidth = (dark ? 1.6 : 1.8) * (0.55 + 0.75 * it.d);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(it.x, it.y);
        ctx.lineTo(it.x2, it.y2);
        ctx.stroke();
      }
    }
    ctxB.globalAlpha = 1;
    ctxF.globalAlpha = 1;
  }

  /* ---------- loop control ---------- */
  var running = false, visible = true, raf = 0;
  function loop(t) {
    if (!running) return;
    draw(t);
    raf = requestAnimationFrame(loop);
  }
  function update() {
    var should = visible && !document.hidden && !mqReduce.matches;
    if (should && !running) {
      running = true;
      raf = requestAnimationFrame(loop);
    } else if (!should && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
    if (!should) draw(performance.now());
  }

  function init() {
    readPalette();
    layout();
    onScroll();
    draw(performance.now());
    update();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        update();
      }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', update);
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', update);

    var rt = 0;
    function relayout() {
      clearTimeout(rt);
      rt = setTimeout(function () { layout(); if (!running) draw(performance.now()); }, 80);
    }
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(relayout);
      ro.observe(hero);
      if (anchor) ro.observe(anchor);
    } else {
      window.addEventListener('resize', relayout);
    }
    window.addEventListener('scroll', function () { onScroll(); if (!running) draw(performance.now()); }, { passive: true });

    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = hero.getBoundingClientRect();
      tmx = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1);
      tmy = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);
    });
    hero.addEventListener('pointerleave', function () { tmx = 0; tmy = 0; });

    document.addEventListener('hj:themechange', function () {
      readPalette();
      if (!running) draw(performance.now());
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
