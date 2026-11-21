/* ==========================================================================
   ARTIST interactive explainer (schematic, not data)
   - Canvas scene: DNA templates with an aptamer next to the promoter.
     Target proteins dock onto aptamers; a docked protein blocks RNA polymerase,
     so fewer RNA outputs reach the fluorescent reporters.
   - Panel: concentration slider, aptamer swap, analog/digital circuit,
     schematic dose-response chart (hover for values, click/drag to set).
   Binding uses a simple Langmuir isotherm: fraction bound = c / (c + Kd).
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('artist-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var root = document.documentElement;
  var wrap = document.querySelector('.artist');
  var section = document.getElementById('research');
  var slider = document.getElementById('artist-conc');
  var concLabel = document.getElementById('artist-conc-label');
  var outEl = document.getElementById('artist-output');
  var meter = document.getElementById('artist-meter');
  var statusEl = document.getElementById('artist-status');
  var chart = document.getElementById('artist-chart');
  var targetBtns = [].slice.call(document.querySelectorAll('.artist-targets [data-target]'));
  var modeBtns = [].slice.call(document.querySelectorAll('.artist-mode [data-mode]'));
  var modeGroup = document.querySelector('.artist-mode');
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var TARGETS = {
    thrombin: { label: 'Thrombin', shape: 'globule', dark: '#ffc857', light: '#c08400' },
    il6:      { label: 'IL-6',     shape: 'bundle',  dark: '#c79bff', light: '#8a4fe0' },
    tnfa:     { label: 'TNF-α',    shape: 'trimer',  dark: '#95a3ff', light: '#4757d6' },
    ifng:     { label: 'IFN-γ',    shape: 'dimer',   dark: '#5aa9ff', light: '#2a78dd' }
  };

  var state = { x: sliderToX(+slider.value), target: 'thrombin', mode: 'analog' };

  /* ---------- model ---------- */
  function sliderToX(v) { return -2 + 4 * v / 100; }          // log10([target]/Kd), -2..+2
  function analog(x) { return 1 / (1 + Math.pow(10, x)); }      // 1 - fraction bound
  function digital(x) { return 1 / (1 + Math.pow(10, 4 * x)); } // thresholded, switch-like
  function output(x) { return state.mode === 'digital' ? digital(x) : analog(x); }
  function fracBound(x) { return 1 - analog(x); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function concWord(x) {
    if (x <= -1.9) return 'None';
    if (x < -1.1) return 'Trace';
    if (x < -0.35) return 'Low';
    if (x < 0.35) return 'Medium';
    if (x < 1.1) return 'High';
    return 'Saturating';
  }
  function statusWord(o) {
    if (o > 0.85) return 'Transcription on';
    if (o > 0.6) return 'Mostly on';
    if (o > 0.35) return 'Partly repressed';
    if (o > 0.12) return 'Mostly repressed';
    return 'Repressed';
  }

  /* ---------- colors ---------- */
  var C = {}, glow = {};
  function hexToRgb(h) {
    h = (h || '').trim().replace('#', '');
    if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
    var n = parseInt(h, 16);
    return isNaN(n) ? [200, 200, 200] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(rgb, a) { return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')'; }
  function makeGlow(rgb) {
    var S = 64, c = document.createElement('canvas');
    c.width = c.height = S;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grd.addColorStop(0, rgba(rgb, 0.9));
    grd.addColorStop(0.35, rgba(rgb, 0.35));
    grd.addColorStop(1, rgba(rgb, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, S, S);
    return c;
  }
  function readColors() {
    var cs = getComputedStyle(root);
    var v = function (n) { return cs.getPropertyValue(n).trim(); };
    var dark = root.getAttribute('data-theme') === 'dark';
    var tcol = TARGETS[state.target][dark ? 'dark' : 'light'];
    C = {
      dark: dark,
      text: hexToRgb(v('--text')),
      muted: hexToRgb(v('--muted')),
      faint: hexToRgb(v('--faint')),
      rna: hexToRgb(v('--nt-u')),
      glow: hexToRgb(v('--reporter') || v('--nt-a')),
      bg: hexToRgb(v('--bg')),
      target: hexToRgb(tcol),
      targetHex: tcol
    };
    glow.target = makeGlow(C.target);
    glow.rep = makeGlow(C.glow);
    glow.rna = makeGlow(C.rna);
    if (wrap) wrap.style.setProperty('--protein', tcol);
    targetBtns.forEach(function (b) { b.style.setProperty('--c', TARGETS[b.dataset.target][dark ? 'dark' : 'light']); });
  }

  /* ---------- layout ---------- */
  var W = 0, H = 0, DPR = 1, L = {};
  var templates = [], proteins = [], rnas = [], reporters = [];

  function layout() {
    var r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);

    var compact = W < 560;
    L.u = compact ? 0.82 : 1;
    L.x0 = W * 0.05;
    L.x1 = W * (compact ? 0.64 : 0.67);
    L.gate = W * (compact ? 0.685 : 0.705);
    L.poolX = W * (compact ? 0.72 : 0.74);
    L.poolY = H * 0.08;
    L.poolW = W - L.poolX - W * 0.035;
    L.poolH = H * 0.84;
    L.ty = [H * 0.33, H * 0.58, H * 0.83];
    L.apt = L.x0 + (L.x1 - L.x0) * 0.19;
    L.maxP = compact ? 14 : 22;

    if (!templates.length) {
      templates = L.ty.map(function (_, k) { return { k: k, bound: false, protein: null, pol: null, cool: rnd(0, 1.2), flash: 0, swap: 0 }; });
    }
    // reporters: a loose grid inside the pool
    var cols = compact ? 3 : 4, rows = 6;
    var order = [];
    reporters = [];
    for (var j = 0; j < cols * rows; j++) order.push(j);
    for (var s = order.length - 1; s > 0; s--) { var q = Math.floor(Math.random() * (s + 1)); var tmp = order[s]; order[s] = order[q]; order[q] = tmp; }
    var gx = L.poolW / (cols + 0.4), gy = (L.poolH - 30) / (rows + 0.2);
    var onCount = Math.round(output(state.x) * cols * rows);
    for (var i = 0; i < cols * rows; i++) {
      var c = i % cols, rr = Math.floor(i / cols);
      reporters.push({
        x: L.poolX + gx * (c + 0.7) + rnd(-gx, gx) * 0.18,
        y: L.poolY + 30 + gy * (rr + 0.6) + rnd(-gy, gy) * 0.18,
        rank: order[i], lit: order[i] < onCount ? 1 : 0, flash: 0, ph: rnd(0, 6.28)
      });
    }
  }

  /* ---------- proteins ---------- */
  function desiredFree() {
    var c = (state.x + 2) / 4;
    return Math.round(L.maxP * Math.pow(c, 1.1));
  }
  function spawnProtein(fromEdge) {
    var p = {
      x: rnd(L.x0, L.x1), y: rnd(H * 0.06, H * 0.94),
      vx: rnd(-14, 14), vy: rnd(-14, 14),
      rot: rnd(0, 6.28), vr: rnd(-0.6, 0.6),
      st: 'free', a: 0, tpl: null, t: 0, shape: TARGETS[state.target].shape
    };
    if (fromEdge) { p.y = Math.random() < 0.5 ? -12 : H + 12; p.a = 1; }
    proteins.push(p);
    return p;
  }
  function dockPos(tp) { return { x: L.apt, y: L.ty[tp.k] - 30 * L.u - 7 * L.u }; }

  /* ---------- simulation ---------- */
  var gateA = 0, timeAcc = 0;
  function step(dt) {
    timeAcc += dt;
    var f = fracBound(state.x);
    var out = output(state.x);
    var tau = 2.0;
    gateA += ((state.mode === 'digital' ? 1 : 0) - gateA) * Math.min(1, dt * 5);

    // keep the free-protein population in line with concentration
    var free = proteins.filter(function (p) { return p.st === 'free'; });
    var want = desiredFree();
    if (free.length < want) { for (var n = free.length; n < want; n++) spawnProtein(false); }
    else if (free.length > want) { free.slice(0, free.length - want).forEach(function (p) { p.st = 'fade'; }); }

    // binding / unbinding (stationary P(bound) = f)
    templates.forEach(function (tp) {
      tp.flash = Math.max(0, tp.flash - dt * 2.5);
      tp.swap = Math.max(0, tp.swap - dt * 2);
      if (!tp.protein) {
        if (Math.random() < (f / tau) * dt) {
          var cand = null, best = 1e9, d = dockPos(tp);
          proteins.forEach(function (p) {
            if (p.st !== 'free') return;
            var dd = (p.x - d.x) * (p.x - d.x) + (p.y - d.y) * (p.y - d.y);
            if (dd < best) { best = dd; cand = p; }
          });
          if (!cand) cand = spawnProtein(true);
          cand.st = 'dock'; cand.tpl = tp; cand.t = 0;
          tp.protein = cand;
        }
      } else if (tp.bound && Math.random() < ((1 - f) / tau) * dt) {
        var p = tp.protein;
        p.st = 'free'; p.tpl = null; p.vx = rnd(-30, 30); p.vy = -rnd(20, 40);
        tp.protein = null; tp.bound = false;
      }

      // RNA polymerase cycle
      var ty = L.ty[tp.k];
      if (!tp.pol) {
        tp.cool -= dt;
        if (tp.cool <= 0) tp.pol = { x: L.x0 - 22, ph: 'approach', t: 0, a: 0, rna: 0, jig: 0 };
      } else {
        var pol = tp.pol;
        pol.t += dt;
        if (pol.ph === 'approach') {
          pol.a = Math.min(1, pol.a + dt * 4);
          pol.x += (L.x0 + 10 - pol.x) * Math.min(1, dt * 7);
          if (pol.t > 0.5) { pol.ph = tp.bound ? 'blocked' : 'go'; pol.t = 0; }
        } else if (pol.ph === 'blocked') {
          pol.jig = Math.sin(pol.t * 42) * 1.8 * Math.max(0, 1 - pol.t / 0.7);
          tp.flash = Math.max(tp.flash, pol.t < 0.25 ? 1 : 0);
          if (pol.t > 0.55) pol.a -= dt * 3;
          if (pol.a <= 0) { tp.pol = null; tp.cool = rnd(0.5, 1.2); }
        } else if (pol.ph === 'go') {
          var speed = (L.x1 - L.x0) / 2.3;
          pol.x += speed * dt;
          pol.rna = Math.min(34 * L.u, pol.rna + speed * dt * 0.42);
          if (pol.x >= L.x1) {
            rnas.push({ x: pol.x + 6, y: ty - 14, vx: rnd(55, 75), vy: rnd(-8, 8), len: pol.rna, st: 'drift', a: 1, wob: rnd(0, 6), passed: false, rep: null });
            pol.ph = 'leave'; pol.t = 0;
          }
        } else if (pol.ph === 'leave') {
          pol.a -= dt * 3.5; pol.x += 24 * dt;
          if (pol.a <= 0) { tp.pol = null; tp.cool = rnd(0.15, 0.9); }
        }
      }
    });

    // proteins move
    for (var i = proteins.length - 1; i >= 0; i--) {
      var p = proteins[i];
      p.rot += p.vr * dt;
      if (p.st === 'free') {
        p.a = Math.min(1, p.a + dt * 2.5);
        p.vx += rnd(-60, 60) * dt; p.vy += rnd(-60, 60) * dt;
        p.vx *= 0.985; p.vy *= 0.985;
        p.vx = clamp(p.vx, -30, 30); p.vy = clamp(p.vy, -30, 30);
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < L.x0 - 6) { p.x = L.x0 - 6; p.vx = Math.abs(p.vx); }
        if (p.x > L.x1 + 4) { p.x = L.x1 + 4; p.vx = -Math.abs(p.vx); }
        if (p.y < 10) { p.y = 10; p.vy = Math.abs(p.vy); }
        if (p.y > H - 10) { p.y = H - 10; p.vy = -Math.abs(p.vy); }
      } else if (p.st === 'dock') {
        var d = dockPos(p.tpl);
        p.t += dt;
        p.a = Math.min(1, p.a + dt * 3);
        var k = Math.min(1, dt * 7);
        p.x += (d.x - p.x) * k; p.y += (d.y - p.y) * k;
        p.rot += (0 - p.rot) * k * 0.5;
        if (Math.abs(d.x - p.x) < 1.2 && Math.abs(d.y - p.y) < 1.2) {
          p.st = 'docked'; p.x = d.x; p.y = d.y;
          p.tpl.bound = true; p.tpl.flash = 1;
        }
      } else if (p.st === 'docked') {
        var dp = dockPos(p.tpl);
        p.x = dp.x + Math.sin(timeAcc * 3 + p.tpl.k) * 0.6; p.y = dp.y;
      } else if (p.st === 'fade') {
        p.a -= dt * 2.5;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.a <= 0) proteins.splice(i, 1);
      }
    }

    // reporters follow the readout; RNA arrivals make them flash
    var onCount = Math.round(out * reporters.length);
    reporters.forEach(function (r) {
      var tgt = r.rank < onCount ? 1 : 0;
      r.lit += (tgt - r.lit) * Math.min(1, dt * 1.8);
      r.flash = Math.max(0, r.flash - dt * 1.6);
      r.ph += dt;
    });

    // RNA outputs
    var passFrac = clamp(digital(state.x) / Math.max(analog(state.x), 0.02), 0, 1);
    for (var m = rnas.length - 1; m >= 0; m--) {
      var R = rnas[m];
      R.wob += dt * 6;
      if (R.st === 'drift') {
        R.x += R.vx * dt; R.y += R.vy * dt + Math.sin(R.wob) * 0.3;
        if (!R.passed && R.x >= L.gate) {
          R.passed = true;
          if (state.mode === 'digital' && Math.random() > passFrac) { R.st = 'absorbed'; continue; }
        }
        if (R.x >= L.poolX + 10) {
          var choices = reporters.filter(function (r) { return r.rank < Math.max(1, onCount); });
          R.rep = choices[Math.floor(Math.random() * choices.length)] || reporters[0];
          R.st = 'seek';
        }
      } else if (R.st === 'seek') {
        var kk = Math.min(1, dt * 5);
        R.x += (R.rep.x - R.x) * kk; R.y += (R.rep.y - R.y) * kk;
        if (Math.abs(R.rep.x - R.x) < 2 && Math.abs(R.rep.y - R.y) < 2) { R.rep.flash = 1; rnas.splice(m, 1); continue; }
      } else if (R.st === 'absorbed') {
        R.a -= dt * 2.2; R.x += 10 * dt;
        if (R.a <= 0) { rnas.splice(m, 1); continue; }
      }
      if (R.x > W + 20) rnas.splice(m, 1);
    }
  }

  /* ---------- drawing ---------- */
  var MONO = '"JetBrains Mono", ui-monospace, monospace';

  function drawProtein(p, s) {
    var col = C.target;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (C.dark) {
      ctx.globalAlpha = p.a * 0.55;
      ctx.drawImage(glow.target, -s * 2.4, -s * 2.4, s * 4.8, s * 4.8);
    }
    ctx.globalAlpha = p.a;
    ctx.fillStyle = rgba(col, C.dark ? 0.92 : 0.88);
    ctx.strokeStyle = rgba(C.bg, 0.55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (p.shape === 'globule') {
      ctx.arc(0, 0, s, 0.5, Math.PI * 2 - 0.5);
      ctx.lineTo(s * 0.25, 0);
      ctx.closePath();
    } else if (p.shape === 'bundle') {
      var w = s * 2, h = s * 1.5, r = s * 0.45;
      ctx.moveTo(-w / 2 + r, -h / 2);
      ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
      ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
      ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
      ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
    } else if (p.shape === 'trimer') {
      for (var i = 0; i < 3; i++) {
        var a = -Math.PI / 2 + i * Math.PI * 2 / 3;
        ctx.moveTo(Math.cos(a) * s * 0.58 + s * 0.6, Math.sin(a) * s * 0.58);
        ctx.arc(Math.cos(a) * s * 0.58, Math.sin(a) * s * 0.58, s * 0.6, 0, Math.PI * 2);
      }
    } else {
      ctx.ellipse(-s * 0.48, 0, s * 0.72, s * 0.95, 0, 0, Math.PI * 2);
      ctx.moveTo(s * 0.48 + s * 0.72, 0);
      ctx.ellipse(s * 0.48, 0, s * 0.72, s * 0.95, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    if (p.shape === 'bundle') { // four-helix bundle stripes
      ctx.strokeStyle = rgba(C.bg, 0.45);
      ctx.beginPath();
      for (var j = -1.5; j <= 1.5; j++) { ctx.moveTo(j * s * 0.42, -s * 0.5); ctx.lineTo(j * s * 0.42, s * 0.5); }
      ctx.stroke();
    }
    ctx.restore();
  }

  function render() {
    var u = L.u;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    var out = output(state.x);

    /* reporter pool */
    var px = L.poolX, py = L.poolY, pw = L.poolW, ph = L.poolH;
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 14); else ctx.rect(px, py, pw, ph);
    ctx.fillStyle = rgba(C.bg, C.dark ? 0.55 : 0.6);
    ctx.fill();
    ctx.clip();
    var g = ctx.createRadialGradient(px + pw / 2, py + ph * 0.6, 0, px + pw / 2, py + ph * 0.6, ph * 0.7);
    g.addColorStop(0, rgba(C.glow, (C.dark ? 0.3 : 0.18) * out));
    g.addColorStop(1, rgba(C.glow, 0));
    ctx.fillStyle = g;
    ctx.fillRect(px, py, pw, ph);
    ctx.restore();
    ctx.strokeStyle = rgba(C.faint, 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px + 0.5, py + 0.5, pw - 1, ph - 1, 14); else ctx.rect(px, py, pw, ph);
    ctx.stroke();
    ctx.fillStyle = rgba(C.muted, 0.9);
    ctx.font = '500 ' + Math.round(9.5 * u + 0.5) + 'px ' + MONO;
    ctx.textAlign = 'center';
    ctx.fillText('reporters', px + pw / 2, py + 18);

    reporters.forEach(function (r) {
      var y = r.y + Math.sin(r.ph * 1.3) * 1.2;
      var lit = clamp(r.lit + r.flash * 0.6, 0, 1.4);
      var rad = 4.2 * u;
      if (lit > 0.05) {
        ctx.globalAlpha = Math.min(1, lit) * (C.dark ? 0.85 : 0.6);
        var gs = rad * (C.dark ? 7 : 5) * (1 + r.flash * 0.5);
        ctx.drawImage(glow.rep, r.x - gs / 2, y - gs / 2, gs, gs);
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(r.x, y, rad, 0, Math.PI * 2);
      ctx.fillStyle = lit > 0.05 ? rgba(C.glow, 0.25 + 0.75 * Math.min(1, lit)) : rgba(C.faint, 0.12);
      ctx.fill();
      ctx.strokeStyle = lit > 0.05 ? rgba(C.glow, 0.9) : rgba(C.faint, 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    /* threshold gate (digital circuit) */
    if (gateA > 0.02) {
      ctx.globalAlpha = gateA;
      ctx.strokeStyle = rgba(C.muted, 0.7);
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(L.gate, py + 26); ctx.lineTo(L.gate, py + ph - 8);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.save();
      ctx.translate(L.gate - 6, py + ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = rgba(C.muted, 0.95);
      ctx.font = '500 ' + Math.round(9 * u + 0.5) + 'px ' + MONO;
      ctx.textAlign = 'center';
      ctx.fillText('threshold', 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    /* templates */
    templates.forEach(function (tp) {
      var ty = L.ty[tp.k];
      var x0 = L.x0, x1 = L.x1;
      // DNA duplex
      ctx.strokeStyle = rgba(C.muted, 0.55);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x0, ty - 3); ctx.lineTo(x1, ty - 3);
      ctx.moveTo(x0, ty + 3); ctx.lineTo(x1, ty + 3);
      ctx.stroke();
      ctx.strokeStyle = rgba(C.muted, 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var x = x0 + 4; x < x1; x += 7) { ctx.moveTo(x, ty - 3); ctx.lineTo(x, ty + 3); }
      ctx.stroke();
      // promoter: highlighted region + bent arrow (transcription start)
      ctx.strokeStyle = rgba(C.text, 0.9);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x0, ty - 3); ctx.lineTo(x0 + (x1 - x0) * 0.1, ty - 3);
      ctx.moveTo(x0, ty + 3); ctx.lineTo(x0 + (x1 - x0) * 0.1, ty + 3);
      ctx.stroke();
      var xp = x0 + 5;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(xp, ty - 4); ctx.lineTo(xp, ty - 18 * u); ctx.lineTo(xp + 15 * u, ty - 18 * u);
      ctx.moveTo(xp + 11 * u, ty - 22 * u); ctx.lineTo(xp + 15.5 * u, ty - 18 * u); ctx.lineTo(xp + 11 * u, ty - 14 * u);
      ctx.stroke();

      // aptamer hairpin
      var xa = L.apt, r = 7 * u, cyL = ty - 27 * u, dx = r * Math.sin(0.45), stemTop = cyL + r * Math.cos(0.45);
      var bump = 1 + tp.swap * 0.35;
      ctx.save();
      ctx.translate(xa, ty);
      ctx.scale(bump, bump);
      ctx.translate(-xa, -ty);
      if (tp.bound || tp.flash > 0) {
        ctx.globalAlpha = Math.max(tp.bound ? 0.5 : 0, tp.flash);
        var gs = 46 * u;
        ctx.drawImage(glow.target, xa - gs / 2, cyL - gs / 2, gs, gs);
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = rgba(C.target, 1);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(xa - dx, ty - 3); ctx.lineTo(xa - dx, stemTop);
      ctx.moveTo(xa + dx, ty - 3); ctx.lineTo(xa + dx, stemTop);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(xa, cyL, r, Math.PI / 2 + 0.45, Math.PI / 2 - 0.45 + Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = rgba(C.target, 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var sy = ty - 7; sy > stemTop + 1; sy -= 4.5 * u) { ctx.moveTo(xa - dx, sy); ctx.lineTo(xa + dx, sy); }
      ctx.stroke();
      ctx.restore();

      // blocked flash at the promoter
      if (tp.flash > 0 && tp.pol && tp.pol.ph === 'blocked') {
        ctx.strokeStyle = rgba(C.rna, tp.flash * 0.9);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(L.x0 + 10, ty, 16 * u + (1 - tp.flash) * 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      // RNA polymerase + nascent RNA
      var pol = tp.pol;
      if (pol) {
        var a = clamp(pol.a, 0, 1);
        var pxp = pol.x + pol.jig;
        if (pol.rna > 1) {
          ctx.globalAlpha = a;
          ctx.strokeStyle = rgba(C.rna, 0.95);
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (var sN = 0; sN <= pol.rna; sN += 1.5) {
            var rx = pxp + 2 - sN * 0.72, ry = ty - 9 * u - sN * 0.5 + Math.sin(sN * 0.33 + timeAcc * 5) * 2.2;
            if (sN === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.ellipse(pxp, ty, 13 * u, 10 * u, 0, 0, Math.PI * 2);
        ctx.fillStyle = C.dark ? rgba(C.text, 0.16) : rgba(C.muted, 0.18);
        ctx.fill();
        ctx.strokeStyle = rgba(C.text, C.dark ? 0.75 : 0.6);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pxp + 4 * u, ty - 2 * u, 1.8 * u, 0, Math.PI * 2);
        ctx.fillStyle = rgba(C.rna, 0.9);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    /* labels on the first template */
    var t0y = L.ty[0];
    ctx.font = '500 ' + Math.round(9.5 * u + 0.5) + 'px ' + MONO;
    ctx.fillStyle = rgba(C.muted, 0.95);
    ctx.textAlign = 'left';
    ctx.fillText('promoter', L.x0, t0y - 25 * u);
    ctx.fillText('aptamer', L.apt + 14 * u, t0y - 34 * u);
    ctx.textAlign = 'right';
    ctx.fillText('output domain', L.x1, t0y + 17 * u);

    /* RNA outputs in flight */
    rnas.forEach(function (R) {
      var col = R.st === 'absorbed' ? C.faint : C.rna;
      ctx.globalAlpha = clamp(R.a, 0, 1);
      if (C.dark && R.st !== 'absorbed') {
        ctx.globalAlpha *= 0.5;
        ctx.drawImage(glow.rna, R.x - 16, R.y - 16, 32, 32);
        ctx.globalAlpha = clamp(R.a, 0, 1);
      }
      ctx.strokeStyle = rgba(col, 0.95);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      var len = Math.max(10, Math.min(R.len, 22));
      for (var s = 0; s <= len; s += 1.5) {
        var x = R.x - s, y = R.y + Math.sin(s * 0.45 + R.wob) * 2.2;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    /* proteins on top */
    var s = 7.2 * u;
    proteins.forEach(function (p) { if (p.a > 0.01) drawProtein(p, s); });
    ctx.globalAlpha = 1;
  }

  /* ---------- chart (SVG) ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  var CH = { l: 30, r: 308, t: 30, b: 140 };
  var chartEls = {};
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    (parent || chart).appendChild(e);
    return e;
  }
  function cX(x) { return CH.l + (x + 2) / 4 * (CH.r - CH.l); }
  function cY(y) { return CH.b - y * (CH.b - CH.t); }
  function curvePath(fn) {
    var d = '';
    for (var i = 0; i <= 120; i++) {
      var x = -2 + 4 * i / 120;
      d += (i ? 'L' : 'M') + cX(x).toFixed(1) + ' ' + cY(fn(x)).toFixed(1);
    }
    return d;
  }
  function buildChart() {
    if (!chart) return;
    chart.innerHTML = '';
    [0, 0.5, 1].forEach(function (y) { el('line', { class: 'grid', x1: CH.l, x2: CH.r, y1: cY(y), y2: cY(y) }); });
    el('path', { class: 'axis', d: 'M' + CH.l + ' ' + CH.t + 'V' + CH.b + 'H' + CH.r });
    var t;
    t = el('text', { class: 'tick-label', x: CH.l - 6, y: cY(1) + 3, 'text-anchor': 'end' }); t.textContent = 'hi';
    t = el('text', { class: 'tick-label', x: CH.l - 6, y: cY(0) + 3, 'text-anchor': 'end' }); t.textContent = 'lo';
    t = el('text', { class: 'tick-label', x: CH.r, y: CH.b + 16, 'text-anchor': 'end' }); t.textContent = 'log [target] →';
    t = el('text', { class: 'tick-label', x: CH.l, y: CH.b + 16 }); t.textContent = 'RNA output ↑';
    el('line', { class: 'axis', x1: cX(0), x2: cX(0), y1: CH.b, y2: CH.b + 4 });
    t = el('text', { class: 'tick-label', x: cX(0), y: CH.b + 16, 'text-anchor': 'middle' });
    t.innerHTML = 'K<tspan dy="2" font-size="7.5">d</tspan>';

    // legend (identity is never color-alone: solid vs dashed + labels)
    var lg = el('g', { transform: 'translate(' + CH.l + ',' + (CH.t - 18) + ')' });
    el('line', { class: 'legend-swatch', x1: 0, x2: 16, y1: 0, y2: 0, stroke: 'var(--series-1)' }, lg);
    t = el('text', { class: 'legend-label', x: 21, y: 3 }, lg); t.textContent = 'Analog';
    el('line', { class: 'legend-swatch', x1: 74, x2: 90, y1: 0, y2: 0, stroke: 'var(--series-2)', 'stroke-dasharray': '5 3' }, lg);
    t = el('text', { class: 'legend-label', x: 95, y: 3 }, lg); t.textContent = 'Digital';

    chartEls.analog = el('path', { class: 'curve curve--analog', d: curvePath(analog) });
    chartEls.digital = el('path', { class: 'curve curve--digital', d: curvePath(digital) });

    // direct labels in open space next to each curve (clear of the legend)
    t = el('text', { class: 'direct-label', x: cX(1.0) + 2, y: cY(analog(1.0)) - 8 }); t.textContent = 'analog';
    t = el('text', { class: 'direct-label', x: cX(0.092) - 7, y: cY(0.3) + 3, 'text-anchor': 'end' }); t.textContent = 'digital';

    // marker for the current setting
    chartEls.mLine = el('line', { class: 'marker-line' });
    chartEls.mDot = el('circle', { class: 'marker', r: 5 });

    // hover crosshair + tooltip
    chartEls.hover = el('g', { visibility: 'hidden' });
    chartEls.hLine = el('line', { class: 'hover-line', y1: CH.t, y2: CH.b }, chartEls.hover);
    chartEls.hDotA = el('circle', { r: 4, fill: 'var(--series-1)', class: 'marker-ring' }, chartEls.hover);
    chartEls.hDotD = el('circle', { r: 4, fill: 'var(--series-2)', class: 'marker-ring' }, chartEls.hover);
    chartEls.tipBg = el('rect', { class: 'tip-bg', rx: 6, ry: 6, width: 112, height: 34 }, chartEls.hover);
    chartEls.tip1 = el('text', { class: 'tip-text' }, chartEls.hover);
    chartEls.tip2 = el('text', { class: 'tip-text' }, chartEls.hover);

    // hit area bigger than the marks
    chartEls.hit = el('rect', { x: CH.l, y: CH.t - 8, width: CH.r - CH.l, height: CH.b - CH.t + 16, fill: 'transparent' });
    bindChart();
  }

  function svgPoint(evt) {
    var r = chart.getBoundingClientRect();
    var vb = chart.viewBox.baseVal;
    return { x: (evt.clientX - r.left) / r.width * vb.width, y: (evt.clientY - r.top) / r.height * vb.height };
  }
  function showHover(xv) {
    var A = analog(xv), D = digital(xv);
    var X = cX(xv);
    chartEls.hover.setAttribute('visibility', 'visible');
    chartEls.hLine.setAttribute('x1', X); chartEls.hLine.setAttribute('x2', X);
    chartEls.hDotA.setAttribute('cx', X); chartEls.hDotA.setAttribute('cy', cY(A));
    chartEls.hDotD.setAttribute('cx', X); chartEls.hDotD.setAttribute('cy', cY(D));
    var tx = X + 10 + 112 > CH.r + 8 ? X - 122 : X + 10;
    chartEls.tipBg.setAttribute('x', tx); chartEls.tipBg.setAttribute('y', CH.t + 2);
    chartEls.tip1.setAttribute('x', tx + 9); chartEls.tip1.setAttribute('y', CH.t + 16);
    chartEls.tip2.setAttribute('x', tx + 9); chartEls.tip2.setAttribute('y', CH.t + 28);
    chartEls.tip1.innerHTML = '<tspan class="tip-sub">analog </tspan>' + Math.round(A * 100) + '%';
    chartEls.tip2.innerHTML = '<tspan class="tip-sub">digital </tspan>' + Math.round(D * 100) + '%';
  }
  function bindChart() {
    var dragging = false;
    function xFromEvt(e) { return clamp((svgPoint(e).x - CH.l) / (CH.r - CH.l) * 4 - 2, -2, 2); }
    function setFromEvt(e) {
      var xv = xFromEvt(e);
      slider.value = Math.round((xv + 2) / 4 * 100);
      onSlider();
    }
    chartEls.hit.addEventListener('pointerdown', function (e) {
      dragging = true;
      try { chartEls.hit.setPointerCapture(e.pointerId); } catch (err) {}
      setFromEvt(e);
      showHover(xFromEvt(e));
    });
    chartEls.hit.addEventListener('pointermove', function (e) {
      if (dragging) setFromEvt(e);
      if (e.pointerType !== 'touch' || dragging) showHover(xFromEvt(e));
    });
    function end() { dragging = false; }
    chartEls.hit.addEventListener('pointerup', end);
    chartEls.hit.addEventListener('pointercancel', end);
    chartEls.hit.addEventListener('pointerleave', function () { if (!dragging) chartEls.hover.setAttribute('visibility', 'hidden'); });
  }
  function updateChart() {
    if (!chartEls.analog) return;
    var dig = state.mode === 'digital';
    chartEls.analog.classList.toggle('is-off', dig);
    chartEls.digital.classList.toggle('is-off', !dig);
    var X = cX(state.x), Y = cY(output(state.x));
    chartEls.mLine.setAttribute('x1', X); chartEls.mLine.setAttribute('x2', X);
    chartEls.mLine.setAttribute('y1', Y); chartEls.mLine.setAttribute('y2', CH.b);
    chartEls.mDot.setAttribute('cx', X); chartEls.mDot.setAttribute('cy', Y);
    chartEls.mDot.setAttribute('stroke', dig ? 'var(--series-2)' : 'var(--series-1)');
  }

  /* ---------- UI ---------- */
  function updateUI() {
    var out = output(state.x);
    var pct = Math.round(out * 100);
    outEl.textContent = pct;
    if (meter) meter.style.setProperty('--o', pct + '%');
    slider.style.setProperty('--p', slider.value + '%');
    var word = concWord(state.x);
    concLabel.textContent = word;
    slider.setAttribute('aria-valuetext', word + ' target concentration, RNA output ' + pct + ' percent');
    statusEl.textContent = statusWord(out);
    updateChart();
    if (mqReduce.matches) settleAndRender();
  }
  function onSlider() {
    state.x = sliderToX(+slider.value);
    updateUI();
  }

  function selectRadio(btns, btn) {
    btns.forEach(function (b) {
      var on = b === btn;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
  }
  function radioKeys(btns, onPick) {
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { onPick(b); });
      b.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = btns[(i + 1) % btns.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = btns[(i - 1 + btns.length) % btns.length];
        else if (e.key === 'Home') n = btns[0];
        else if (e.key === 'End') n = btns[btns.length - 1];
        if (n) { e.preventDefault(); n.focus(); onPick(n); }
      });
    });
  }

  function setTarget(key) {
    if (key === state.target) return;
    state.target = key;
    readColors();
    // the old protein no longer binds the new aptamer: release and fade it out
    proteins.forEach(function (p) { p.st = 'fade'; p.vx = rnd(-20, 20); p.vy = rnd(-20, 20); });
    templates.forEach(function (tp) { tp.protein = null; tp.bound = false; tp.swap = 1; });
    updateUI();
  }
  function setMode(m) {
    state.mode = m;
    if (modeGroup) modeGroup.setAttribute('data-active', m);
    updateUI();
  }

  /* ---------- loop ---------- */
  var running = false, visible = false, raf = 0, last = 0;
  function frame(t) {
    if (!running) return;
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    step(dt);
    render();
    raf = requestAnimationFrame(frame);
  }
  function settleAndRender() {
    for (var i = 0; i < 300; i++) step(1 / 60);
    render();
  }
  function update() {
    var should = visible && !document.hidden && !mqReduce.matches;
    if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!should && running) { running = false; cancelAnimationFrame(raf); }
  }

  function init() {
    readColors();
    layout();
    buildChart();
    slider.addEventListener('input', onSlider);
    radioKeys(targetBtns, function (b) { selectRadio(targetBtns, b); setTarget(b.dataset.target); });
    radioKeys(modeBtns, function (b) { selectRadio(modeBtns, b); setMode(b.dataset.mode); });
    if (modeGroup) modeGroup.setAttribute('data-active', state.mode);
    settleAndRender();
    updateUI();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; update(); }, { rootMargin: '100px' }).observe(canvas);
    } else { visible = true; update(); }
    document.addEventListener('visibilitychange', update);
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', function () { update(); if (mqReduce.matches) settleAndRender(); });

    var rt = 0;
    function relayout() { clearTimeout(rt); rt = setTimeout(function () { layout(); render(); }, 60); }
    if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(canvas);
    else window.addEventListener('resize', relayout);

    document.addEventListener('hj:themechange', function () { readColors(); render(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { render(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
