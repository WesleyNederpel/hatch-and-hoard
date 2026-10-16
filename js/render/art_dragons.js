(function (HH) {
  'use strict';
  // Dragon art, drawn in code on Canvas 2D. No images.
  // HH.render.artDragons = { ready, draw(ctx, dragon, t, opts), drawIcon(ctx, type, x, y, size) }
  // Dragons are designed facing +x. The whole body is mirrored when aim points left, so it never turns upside down.

  var PI = Math.PI, TAU = Math.PI * 2, LW = 1.6;
  var cos = Math.cos, sin = Math.sin, sqrt = Math.sqrt, abs = Math.abs;

  // ---- module-level draw state (avoids passing everything around / allocating) ----
  var g, OUT, M, SH, HI, PL, P, T, PH;
  var CX = [], CY = [], CR = [];
  for (var ci = 0; ci < 24; ci++) { CX.push(0); CY.push(0); CR.push(0); }

  // ---- palettes ----
  var ELEMENT_OF = { ember: 'fire', frost: 'frost', venom: 'venom' };
  var BELLY = { fire: '#FFE3A8', frost: '#F4FDFF', venom: '#EEF9C4' };
  var FORM_PAL = {
    pyre_phoenix:   { m: '#FFA52E', s: '#E5530F', h: '#FFE680', belly: '#FFF1B0', flash: '#FFD93D', flashHi: '#FFF6C2', acc: '#FF4B1F', acc2: '#FFD93D', beak: '#FFC83D', beakS: '#C98A10' },
    magma_drake:    { m: '#5E4856', s: '#33262F', h: '#8E7484', belly: '#FF8A2E', flash: '#FF7A2F', flashHi: '#FFD08A', lava: '#FF7A2F', lavaHi: '#FFD08A', eye: '#FFD08A', horn: '#8E7484', hornS: '#33262F' },
    glacier_wyrm:   { m: '#C9F1FF', s: '#78BEDC', h: '#FFFFFF', belly: '#F3FCFF', flash: '#9BE8FF', flashHi: '#FFFFFF', horn: '#FFFFFF', hornS: '#8FCBE6', acc: '#8FE3FF' },
    crystal_lancer: { m: '#6FE3FF', s: '#2A9CC4', h: '#E8FBFF', belly: '#E8FBFF', flash: '#6FE3FF', flashHi: '#FFFFFF', cr: '#B6F4FF', crS: '#4FC3E8' },
    plague_mother:  { m: '#9ACD4B', s: '#55802A', h: '#E0F5A0', belly: '#E5EDAA', flash: '#B6F04A', flashHi: '#F2FFB0', sac: '#C6E84A', sacS: '#7BA51E', sacH: '#F2FFB0', drip: '#9BE04A', horn: '#D9D27A', hornS: '#A09A45' },
    basilisk:       { m: '#4DAE5C', s: '#2B6F3A', h: '#A8E6A0', belly: '#E6E7A0', flash: '#C8F04A', flashHi: '#FFF6A0', eye: '#FFE14A', frill: '#E1C93C', frillS: '#9C8A1C', frillH: '#FFF08A' }
  };
  var palCache = {};
  function palette(type, form) {
    var key = type + '|' + (form || '');
    var p = palCache[key];
    if (p) return p;
    var K = HH.data.config.COLORS;
    var el = (HH.data.dragons && HH.data.dragons[type] && HH.data.dragons[type].element) || ELEMENT_OF[type] || 'fire';
    var b = K[el] || K.fire;
    p = { m: b[0], s: b[1], h: b[2], belly: BELLY[el] || b[2], flash: b[0], flashHi: b[2], eye: '#FFFFFF',
          horn: '#FFF1CE', hornS: '#D9B882', el: el };
    var o = form && FORM_PAL[form];
    if (o) for (var k in o) p[k] = o[k];
    palCache[key] = p;
    return p;
  }

  // ---- profiles (shape numbers per stage / evolution form) ----
  var BASE = [
    { rx: 10, ry: 8.5, bx: -1, by: 3, neck: 4, neckW: 10, hr: 9.5, snout: 0.7, eye: 1.3,
      tailN: 4, tailSeg: 3.2, tailR0: 4, tailR1: 1.8, tailAmp: 0.35, tailDroop: 0.3, tailCurl: 0.5, tip: 'nub',
      wing: 'stub', wingS: 7, flapSpd: 9, flapAmp: 0.45, horns: 'none', hornLen: 0, spines: 0, spineLen: 0, shell: true, feet: false, bob: 1.0 },
    { rx: 12, ry: 9.5, bx: -1, by: 3, neck: 9, neckW: 9.5, hr: 9.5, snout: 0.85, eye: 1.15,
      tailN: 5, tailSeg: 3.7, tailR0: 5, tailR1: 2, tailAmp: 0.4, tailDroop: 0.3, tailCurl: 0.6, tip: 'spade',
      wing: 'bat', wingS: 15, flapSpd: 6, flapAmp: 0.5, horns: 'small', hornLen: 6.5, spines: 0, spineLen: 0, shell: false, feet: true, bob: 1.2 },
    { rx: 14, ry: 11.5, bx: -1, by: 3, neck: 11, neckW: 10.5, hr: 10.5, snout: 0.95, eye: 1.0,
      tailN: 6, tailSeg: 4, tailR0: 6.5, tailR1: 2.2, tailAmp: 0.4, tailDroop: 0.3, tailCurl: 0.6, tip: 'spade',
      wing: 'bat', wingS: 24, flapSpd: 4.2, flapAmp: 0.42, horns: 'big', hornLen: 12, spines: 4, spineLen: 7, shell: false, feet: true, bob: 1.2 }
  ];
  var FORMS = {
    pyre_phoenix: { rx: 11.5, ry: 9, neck: 15, neckW: 7, hr: 8.4, snout: 0.5, beak: true, tailN: 3, tailSeg: 4, tailR0: 5, tailR1: 3, tip: 'plumes',
      wing: 'feather', wingS: 30, flapSpd: 6.5, flapAmp: 0.6, horns: 'crest', hornLen: 0, spines: 0, feet: 'talons', bob: 1.7, deco: 'phoenix' },
    magma_drake: { rx: 17, ry: 13.5, neck: 7, neckW: 15, hr: 12, snout: 0.7, tailN: 5, tailSeg: 4.5, tailR0: 8.5, tailR1: 4, tailAmp: 0.2, tip: 'lava',
      wing: 'bat', wingS: 19, flapSpd: 3.4, flapAmp: 0.3, horns: 'ram', spines: 0, bob: 0.6, deco: 'magma' },
    glacier_wyrm: { rx: 16.5, ry: 13, neck: 9, neckW: 14, hr: 11.5, snout: 0.7, tailN: 6, tailSeg: 4.2, tailR0: 8, tailR1: 3, tip: 'ice',
      wing: 'bat', wingS: 22, flapSpd: 3.8, flapAmp: 0.36, horns: 'icicle', hornLen: 12, spines: 5, spineLen: 11, spineIce: true, mane: true, bob: 0.8, deco: 'glacier' },
    crystal_lancer: { rx: 13, ry: 8.5, neck: 17, neckW: 7.5, hr: 8.6, snout: 0.9, tailN: 8, tailSeg: 4, tailR0: 4.6, tailR1: 1.6, tip: 'crystal',
      wing: 'crystal', wingS: 29, flapSpd: 5, flapAmp: 0.45, horns: 'lance', hornLen: 30, spines: 4, spineLen: 8, spineIce: true, bob: 1.4, deco: 'crystal' },
    plague_mother: { rx: 18, ry: 15, neck: 5, neckW: 14, hr: 11, snout: 0.6, tailN: 5, tailSeg: 4, tailR0: 8, tailR1: 4, tip: 'blob',
      wing: 'bat', wingS: 14, flapSpd: 5, flapAmp: 0.35, horns: 'small', hornLen: 7, spines: 0, bob: 1.0, deco: 'plague' },
    basilisk: { rx: 14, ry: 8, neck: 12, neckW: 8.5, hr: 9.5, snout: 1.0, tailN: 10, tailSeg: 4.5, tailR0: 7, tailR1: 2, tailAmp: 0.6, tailDroop: 0.15, tip: 'nub',
      wing: 'none', horns: 'none', spines: 5, spineLen: 6, bob: 0.9, deco: 'basilisk', frill: true, slit: true, eye: 1.05 }
  };
  var profCache = {};
  function profile(stage, form) {
    var key = stage + '|' + (form || '');
    var p = profCache[key];
    if (p) return p;
    var b = BASE[stage] || BASE[0];
    p = {};
    var k;
    for (k in b) p[k] = b[k];
    var f = form && FORMS[form];
    if (f) for (k in f) p[k] = f[k];
    profCache[key] = p;
    return p;
  }

  // ---- drawing primitives ----
  function E(x, y, rx, ry, rot, col) {
    g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fill();
  }
  function Ci(x, y, r, col) {
    g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // Chunky part: outline, shade, main (shifted up so shade shows below), highlight.
  function part(x, y, rx, ry, rot, m, s, h) {
    E(x, y, rx + LW, ry + LW, rot, OUT);
    E(x, y, rx, ry, rot, s);
    E(x, y - ry * 0.14, rx * 0.92, ry * 0.82, rot, m);
    if (h) E(x - rx * 0.3, y - ry * 0.5, rx * 0.28, ry * 0.16, -0.4, h);
  }
  // Chain of circles (unified silhouette). Uses CX/CY/CR.
  function chain(n, m, s) {
    var i;
    g.fillStyle = OUT; g.beginPath();
    for (i = 0; i < n; i++) { g.moveTo(CX[i] + CR[i] + LW, CY[i]); g.arc(CX[i], CY[i], CR[i] + LW, 0, TAU); }
    g.fill();
    g.fillStyle = s; g.beginPath();
    for (i = 0; i < n; i++) { g.moveTo(CX[i] + CR[i], CY[i]); g.arc(CX[i], CY[i], CR[i], 0, TAU); }
    g.fill();
    g.fillStyle = m; g.beginPath();
    for (i = 0; i < n; i++) { var r = CR[i] * 0.86; g.moveTo(CX[i] + r, CY[i] - CR[i] * 0.14); g.arc(CX[i], CY[i] - CR[i] * 0.14, r, 0, TAU); }
    g.fill();
  }
  function outlineStroke() { g.lineWidth = 2.6; g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke(); }
  // Triangle spike from base centre. fill = body, shade = shaded half (optional).
  function spike(bx, by, ang, len, w, fill, shade) {
    var c = cos(ang), s = sin(ang), px = -s * w / 2, py = c * w / 2, tx = bx + c * len, ty = by + s * len;
    g.fillStyle = fill; g.beginPath(); g.moveTo(bx + px, by + py); g.lineTo(tx, ty); g.lineTo(bx - px, by - py); g.closePath(); g.fill();
    if (shade) {
      g.fillStyle = shade; g.beginPath(); g.moveTo(bx, by); g.lineTo(tx, ty); g.lineTo(bx - px, by - py); g.closePath(); g.fill();
    }
    g.beginPath(); g.moveTo(bx + px, by + py); g.lineTo(tx, ty); g.lineTo(bx - px, by - py); g.closePath(); outlineStroke();
  }
  function kite(x, y, ang, len, w, fill, shade) {
    var c = cos(ang), s = sin(ang), nx = -s * w, ny = c * w, mx = x + c * len * 0.45, my = y + s * len * 0.45;
    g.fillStyle = fill; g.beginPath(); g.moveTo(x, y); g.lineTo(mx + nx, my + ny); g.lineTo(x + c * len, y + s * len); g.lineTo(mx - nx, my - ny); g.closePath(); g.fill();
    g.fillStyle = shade; g.beginPath(); g.moveTo(x, y); g.lineTo(x + c * len, y + s * len); g.lineTo(mx - nx, my - ny); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x, y); g.lineTo(mx + nx, my + ny); g.lineTo(x + c * len, y + s * len); g.lineTo(mx - nx, my - ny); g.closePath(); outlineStroke();
  }
  // Feather / flame leaf. wob = sideways wave of the tip.
  function leaf(x0, y0, ang, len, wid, wob, fill, inner) {
    var c = cos(ang), s = sin(ang), nx = -s, ny = c;
    var tx = x0 + c * len + nx * wob, ty = y0 + s * len + ny * wob;
    var mx = x0 + c * len * 0.5 + nx * wob * 0.5, my = y0 + s * len * 0.5 + ny * wob * 0.5;
    g.beginPath(); g.moveTo(x0, y0);
    g.quadraticCurveTo(mx + nx * wid, my + ny * wid, tx, ty);
    g.quadraticCurveTo(mx - nx * wid, my - ny * wid, x0, y0);
    g.fillStyle = fill; g.fill(); outlineStroke();
    if (inner) {
      var w2 = wid * 0.5, l2 = 0.72;
      var tx2 = x0 + c * len * l2 + nx * wob * l2, ty2 = y0 + s * len * l2 + ny * wob * l2;
      var mx2 = x0 + c * len * 0.36 + nx * wob * 0.36, my2 = y0 + s * len * 0.36 + ny * wob * 0.36;
      g.beginPath(); g.moveTo(x0 + c * 1.5, y0 + s * 1.5);
      g.quadraticCurveTo(mx2 + nx * w2, my2 + ny * w2, tx2, ty2);
      g.quadraticCurveTo(mx2 - nx * w2, my2 - ny * w2, x0 + c * 1.5, y0 + s * 1.5);
      g.fillStyle = inner; g.fill();
    }
  }

  // ---- parts ----
  var NO_OPTS = {};
  var geo = { bx: 0, by: 0, nx: 0, ny: 0, hx: 0, hy: 0, ha: 0, la: 0, open: 0, lunge: 0, tx: 0, ty: 0, tang: 0 };

  function drawTail() {
    var n = P.tailN, x = geo.bx - P.rx * 0.78, y = geo.by + P.ry * 0.25, ang = PI;
    for (var i = 0; i < n; i++) {
      var u = n > 1 ? i / (n - 1) : 0;
      ang = PI - P.tailDroop + (P.tailCurl || 0) * u + sin(T * 2.3 + PH - i * 0.65) * P.tailAmp * (0.35 + u);
      CX[i] = x; CY[i] = y; CR[i] = P.tailR0 + (P.tailR1 - P.tailR0) * u;
      x += cos(ang) * P.tailSeg; y += sin(ang) * P.tailSeg;
    }
    var tipX = CX[n - 1], tipY = CY[n - 1], r = CR[n - 1];
    // tail tip is drawn behind the chain so the chain's last circle caps it
    switch (P.tip) {
      case 'spade': kite(tipX, tipY, ang, 8.5, 5.2, HI, SH); break;
      case 'crystal':
        spike(tipX, tipY, ang - 0.55, 9, 4.6, PL.cr, PL.crS); spike(tipX, tipY, ang + 0.55, 9, 4.6, PL.cr, PL.crS);
        spike(tipX, tipY, ang, 13, 5, PL.cr, PL.crS); break;
      case 'ice':
        spike(tipX, tipY, ang - 0.6, 10, 5, '#FFFFFF', PL.s); spike(tipX, tipY, ang + 0.6, 10, 5, '#FFFFFF', PL.s);
        spike(tipX, tipY, ang, 15, 6, '#FFFFFF', PL.s); break;
      case 'plumes':
        for (var k = -1; k <= 1; k++) {
          var pa = PI - 0.15 + k * 0.42 + sin(T * 2.4 + PH + k) * 0.18;
          leaf(tipX, tipY, pa, 34 - abs(k) * 7, 7, sin(T * 3.1 + k * 2 + PH) * 5, k === 0 ? PL.m : (k < 0 ? PL.acc : PL.acc2), k === 0 ? PL.h : PL.h);
        }
        break;
      default: break;
    }
    chain(n, M, SH);
    if (P.tip === 'lava') {
      var pu = 0.75 + 0.25 * sin(T * 4 + PH);
      Ci(tipX, tipY, r + 1.5 + LW, OUT); Ci(tipX, tipY, r + 1.5, PL.lava); Ci(tipX, tipY, (r + 1.5) * 0.55 * pu, PL.lavaHi);
    } else if (P.tip === 'blob') {
      part(tipX, tipY, r + 1.5, r + 1.2, 0, PL.sac, PL.sacS, PL.sacH);
    }
  }

  function wingShape(S, mem, vein) {
    switch (P.wing) {
      case 'stub':
        part(S * 0.5, 0, S * 0.6, S * 0.34, 0, mem, SH, null);
        break;
      case 'feather': {
        var n = 6, i;
        for (i = n - 1; i >= 0; i--) {
          var a = -0.15 + i * 0.26, l = S * (1.0 - i * 0.09);
          leaf(S * 0.1, 0, a, l, S * 0.17, sin(T * 3 + i + PH) * 1.4, i % 2 ? PL.acc2 : mem, PL.h);
        }
        break;
      }
      case 'crystal':
        g.lineWidth = 2.4; g.strokeStyle = OUT; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(S * 0.5, -S * 0.17); g.lineTo(S * 0.3, S * 0.45); g.closePath(); g.fillStyle = SH; g.fill(); g.stroke();
        g.beginPath(); g.moveTo(S * 0.5, -S * 0.17); g.lineTo(S * 0.98, -S * 0.02); g.lineTo(S * 0.72, S * 0.62); g.lineTo(S * 0.3, S * 0.45); g.closePath(); g.fillStyle = mem; g.fill(); g.stroke();
        g.beginPath(); g.moveTo(S * 0.98, -S * 0.02); g.lineTo(S * 1.1, S * 0.5); g.lineTo(S * 0.72, S * 0.62); g.closePath(); g.fillStyle = HI; g.fill(); g.stroke();
        break;
      default: { // bat
        g.beginPath();
        g.moveTo(0, 0); g.lineTo(S * 0.42, -S * 0.16); g.lineTo(S, -S * 0.02);
        g.lineTo(S * 0.86, S * 0.5); g.lineTo(S * 0.62, S * 0.3); g.lineTo(S * 0.5, S * 0.64);
        g.lineTo(S * 0.3, S * 0.34); g.lineTo(S * 0.12, S * 0.52); g.lineTo(0, S * 0.2); g.closePath();
        g.fillStyle = mem; g.fill(); outlineStroke();
        // finger lines
        g.strokeStyle = OUT; g.globalAlpha *= 0.55; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(S * 0.42, -S * 0.16); g.lineTo(S * 0.86, S * 0.5); g.moveTo(S * 0.42, -S * 0.16); g.lineTo(S * 0.5, S * 0.64); g.moveTo(S * 0.42, -S * 0.16); g.lineTo(S * 0.12, S * 0.52);
        g.stroke(); g.globalAlpha /= 0.55;
        // highlight along arm
        g.strokeStyle = vein || HI; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(S * 0.05, 2); g.lineTo(S * 0.42, -S * 0.16 + 2); g.lineTo(S * 0.93, 1.5); g.stroke();
      }
    }
  }
  function drawWing(far) {
    if (P.wing === 'none') return;
    var S = P.wingS * (far ? 0.82 : 1);
    var ax = geo.bx + P.rx * 0.08 + (far ? P.rx * 0.28 : 0), ay = geo.by - P.ry * 0.7;
    var flap = sin(T * P.flapSpd + PH + (far ? 0.5 : 0)) * P.flapAmp;
    var ang = (far ? -1.55 : -1.95) + flap;
    g.save(); g.translate(ax, ay); g.rotate(ang); g.scale(1, -1);
    var mem = far ? SH : M;
    if (P.deco === 'magma') wingShape(S, far ? '#33262F' : '#5E4856', PL.lava);
    else if (P.deco === 'glacier') wingShape(S, far ? SH : '#A9E2F7', '#FFFFFF');
    else if (P.deco === 'plague') wingShape(S, far ? SH : M, PL.h);
    else if (P.deco === 'crystal') wingShape(S, far ? PL.crS : PL.cr, HI);
    else wingShape(S, mem, null);
    g.restore();
  }

  function drawFeet() {
    if (!P.feet) return;
    var by = geo.by + P.ry * 0.82, w = P.rx * 0.3, h = P.ry * 0.32;
    if (P.feet === 'talons') {
      g.lineCap = 'round';
      for (var k = 0; k < 2; k++) {
        var fx = geo.bx + (k ? -P.rx * 0.35 : P.rx * 0.4), fy = geo.by + P.ry * 0.7;
        g.strokeStyle = OUT; g.lineWidth = 5; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy + 8); g.moveTo(fx - 4, fy + 9); g.lineTo(fx, fy + 8); g.lineTo(fx + 5, fy + 9); g.stroke();
        g.strokeStyle = PL.beak; g.lineWidth = 2.2; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy + 8); g.moveTo(fx - 4, fy + 9); g.lineTo(fx, fy + 8); g.lineTo(fx + 5, fy + 9); g.stroke();
      }
      g.lineCap = 'butt';
      return;
    }
    part(geo.bx + P.rx * 0.45, by, w, h, 0, SH, SH, null);
    part(geo.bx - P.rx * 0.42, by + 1, w, h, 0, SH, SH, null);
  }

  function drawSpines() {
    if (!P.spines) return;
    var n = P.spines;
    for (var i = 0; i < n; i++) {
      var u = (i + 0.5) / n, dx = -0.72 + u * 1.25, sx = geo.bx + P.rx * dx;
      var sy = geo.by - P.ry * sqrt(1 - dx * dx) + 2.5;
      var len = P.spineLen * (0.75 + 0.25 * sin(u * PI));
      if (P.spineIce) spike(sx, sy, -PI / 2 - 0.2, len, 6.5, P.deco === 'crystal' ? PL.cr : '#FFFFFF', P.deco === 'crystal' ? PL.crS : PL.s);
      else spike(sx, sy, -PI / 2 - 0.25, len, 6, HI, SH);
    }
  }

  function drawBody() {
    var bx = geo.bx, by = geo.by, rx = P.rx, ry = P.ry * (1 + sin(T * 2.4 + PH) * 0.025);
    part(bx, by, rx, ry, 0, M, SH, HI);
    // belly
    E(bx + rx * 0.1, by + ry * 0.4, rx * 0.66, ry * 0.5, 0, PL.belly);
    if (P.deco === 'plague') { // bloated belly spots
      Ci(bx + rx * 0.05, by + ry * 0.45, 2.2, PL.sac); Ci(bx + rx * 0.4, by + ry * 0.3, 1.6, PL.sac); Ci(bx - rx * 0.3, by + ry * 0.55, 1.8, PL.sac);
    } else if (P.stageIdx === 2 && P.deco !== 'magma') {
      g.strokeStyle = SH; g.lineWidth = 1.2; g.lineCap = 'round'; g.beginPath();
      for (var i = 0; i < 3; i++) { var ox = bx - rx * 0.22 + i * rx * 0.3; g.moveTo(ox - 3, by + ry * 0.28 + i * 0.5); g.quadraticCurveTo(ox, by + ry * 0.4, ox + 3, by + ry * 0.28 + i * 0.5); }
      g.stroke(); g.lineCap = 'butt';
    }
    // form decorations
    switch (P.deco) {
      case 'magma': {
        // rock plates
        part(bx - rx * 0.45, by - ry * 0.62, 6.2, 4, -0.25, PL.h, PL.s, null);
        part(bx + rx * 0.05, by - ry * 0.78, 6.8, 4.2, 0.0, PL.h, PL.s, null);
        part(bx + rx * 0.5, by - ry * 0.55, 5.6, 3.8, 0.3, PL.h, PL.s, null);
        part(bx - rx * 0.1, by + ry * 0.05, 5, 3.4, 0.4, PL.h, PL.s, null);
        // lava cracks
        var pu = 0.75 + 0.25 * sin(T * 3 + PH);
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = PL.lava; g.lineWidth = 2.2; g.globalAlpha *= pu;
        g.beginPath();
        g.moveTo(bx - rx * 0.78, by - ry * 0.1); g.lineTo(bx - rx * 0.5, by + ry * 0.12); g.lineTo(bx - rx * 0.38, by - ry * 0.18); g.lineTo(bx - rx * 0.1, by + ry * 0.2);
        g.moveTo(bx + rx * 0.2, by + ry * 0.05); g.lineTo(bx + rx * 0.45, by + ry * 0.3); g.lineTo(bx + rx * 0.75, by + ry * 0.1);
        g.moveTo(bx + rx * 0.1, by - ry * 0.35); g.lineTo(bx + rx * 0.3, by - ry * 0.15);
        g.stroke();
        g.strokeStyle = PL.lavaHi; g.lineWidth = 0.9; g.stroke();
        g.globalAlpha /= pu; g.lineCap = 'butt';
        break;
      }
      case 'plague': {
        var s1 = 1 + sin(T * 3 + PH) * 0.08, s2 = 1 + sin(T * 3.6 + PH + 1.3) * 0.08, s3 = 1 + sin(T * 2.7 + PH + 2.6) * 0.08;
        part(bx - rx * 0.5, by - ry * 0.82, 5.5 * s1, 5 * s1, 0, PL.sac, PL.sacS, PL.sacH);
        part(bx + rx * 0.12, by - ry * 0.98, 6.5 * s2, 6 * s2, 0, PL.sac, PL.sacS, PL.sacH);
        part(bx + rx * 0.62, by - ry * 0.66, 4.6 * s3, 4.2 * s3, 0, PL.sac, PL.sacS, PL.sacH);
        // bubbles rising
        for (var b = 0; b < 3; b++) {
          var u = (T * 0.55 + PH * 0.3 + b * 0.34) % 1;
          var bxx = bx - rx * 0.4 + b * rx * 0.45 + sin(u * 9 + b) * 2, byy = by - ry * 1.05 - u * 15;
          g.globalAlpha *= (1 - u * 0.8);
          Ci(bxx, byy, 2.7 * (1 - u * 0.4) + LW * 0.7, OUT); Ci(bxx, byy, 2.7 * (1 - u * 0.4), PL.sacH);
          g.globalAlpha /= (1 - u * 0.8);
        }
        break;
      }
      case 'glacier':
        part(bx - rx * 0.3, by - ry * 0.2, 4, 2.6, 0.3, HI, SH, null); // frosty patches
        part(bx + rx * 0.4, by - ry * 0.45, 3.4, 2.4, -0.2, HI, SH, null);
        break;
      case 'crystal':
        part(bx - rx * 0.05, by - ry * 0.3, 3.2, 2.2, 0.5, PL.cr, PL.crS, null);
        break;
      case 'basilisk':
        for (var q = 0; q < 4; q++) E(bx - rx * 0.5 + q * rx * 0.33, by - ry * 0.35, 2.4, 1.6, 0.3, SH);
        break;
      default: break;
    }
  }

  function drawShell() {
    var bx = geo.bx, by = geo.by, rx = P.rx, ry = P.ry;
    var xL = bx - rx * 1.02, xR = bx + rx * 1.02, y0 = by + ry * 0.22;
    g.beginPath(); g.moveTo(xL, y0 + 2);
    for (var i = 1; i <= 6; i++) g.lineTo(xL + (xR - xL) * i / 6, y0 + (i % 2 ? -3.5 : 3));
    g.bezierCurveTo(xR, by + ry * 1.7, xL, by + ry * 1.7, xL, y0 + 2);
    g.closePath(); g.fillStyle = '#FFF3D6'; g.fill(); outlineStroke();
    Ci(bx - rx * 0.35, by + ry * 0.85, 1.6, '#E7D3AA'); Ci(bx + rx * 0.3, by + ry * 0.7, 1.2, '#E7D3AA'); Ci(bx + rx * 0.62, by + ry * 0.95, 1, '#E7D3AA');
  }

  function drawNeck() {
    if (P.neck < 6) return;
    var n = P.neck > 14 ? 7 : (P.neck > 9 ? 5 : 3);
    var x0 = geo.nx - 2, y0 = geo.ny + 3, x1 = geo.hx, y1 = geo.hy;
    var cx = (x0 + x1) / 2 - P.neck * 0.12, cy = (y0 + y1) / 2 - P.neck * 0.05;
    for (var i = 0; i < n; i++) {
      var u = i / (n - 1), v = 1 - u;
      CX[i] = v * v * x0 + 2 * u * v * cx + u * u * x1;
      CY[i] = v * v * y0 + 2 * u * v * cy + u * u * y1;
      CR[i] = P.neckW * (0.5 + 0.0 * u) * (1 - 0.08 * u);
    }
    chain(n, M, SH);
  }

  function drawHorns(layer) { // layer 0 = far horn (behind head), 1 = near horn (in front of head silhouette)
    var h = P.horns, hr = P.hr, hx = geo.hx, hy = geo.hy, ha = geo.ha;
    if (h === 'none') return;
    var hc = PL.horn, hs = PL.hornS;
    if (h === 'small' || h === 'big' || h === 'icicle') {
      var len = P.hornLen, w = h === 'big' ? 6.5 : (h === 'icicle' ? 6 : 5);
      var a = layer ? ha - 1.75 : ha - 1.35, off = layer ? ha - 1.15 : ha - 0.85;
      var bxh = hx + cos(off) * hr * 0.8, byh = hy + sin(off) * hr * 0.8;
      if (layer === 0) { bxh += 3; }
      spike(bxh, byh, a, len * (layer ? 1 : 0.82), w, hc, hs);
    } else if (h === 'ram') {
      var up = -1; // curl direction
      var sx = hx + cos(ha - 1.2) * hr * 0.75, sy = hy + sin(ha - 1.2) * hr * 0.75;
      var ux = sin(ha), uy = -cos(ha), bk = -1, bkx = cos(ha) * bk, bky = sin(ha) * bk;
      var ex = sx + bkx * hr * 1.35 - ux * hr * 0.15, ey = sy + bky * hr * 1.35 - uy * hr * 0.15;
      var qx = sx + ux * hr * 0.9 + bkx * hr * 0.6, qy = sy + uy * hr * 0.9 + bky * hr * 0.6;
      if (layer === 0) { sx += 2.5; ex += 2.5; qx += 2.5; }
      var n = 5;
      for (var i = 0; i < n; i++) {
        var u = i / (n - 1), v = 1 - u;
        CX[i] = v * v * sx + 2 * u * v * qx + u * u * ex;
        CY[i] = v * v * sy + 2 * u * v * qy + u * u * ey;
        CR[i] = 4.6 - u * 2.4;
      }
      chain(n, layer ? PL.horn : PL.hornS, PL.hornS);
    } else if (h === 'lance') {
      if (layer === 1) {
        var lx = hx + cos(ha) * hr * 0.2 + sin(ha) * hr * 0.7, ly = hy + sin(ha) * hr * 0.2 - cos(ha) * hr * 0.7;
        spike(lx, ly, ha - 0.3, P.hornLen, hr * 0.62, PL.cr, PL.crS);
        // facet line + glint
        var la2 = ha - 0.3, tx = lx + cos(la2) * P.hornLen, ty = ly + sin(la2) * P.hornLen;
        g.strokeStyle = HI; g.lineWidth = 1.4; g.beginPath(); g.moveTo(lx + cos(la2) * 3, ly + sin(la2) * 3 - 1.5); g.lineTo(lx + (tx - lx) * 0.8, ly + (ty - ly) * 0.8 - 0.8); g.stroke();
        var gl = 0.5 + 0.5 * sin(T * 4 + PH);
        g.globalAlpha *= gl; Ci(tx, ty, 2.2, '#FFFFFF'); g.globalAlpha /= gl;
      } else {
        spike(hx + cos(ha - 1.3) * hr * 0.8, hy + sin(ha - 1.3) * hr * 0.8, ha - 1.9, 9, 5, PL.cr, PL.crS);
      }
    }
  }

  function drawHeadBack() { // things behind the head
    var hr = P.hr, hx = geo.hx, hy = geo.hy, ha = geo.ha, i;
    if (P.mane) { // frosty mane
      for (i = 0; i < 7; i++) {
        var a = ha + PI * 0.5 + i * 0.42 + sin(T * 2 + i + PH) * 0.05;
        part(hx + cos(a) * hr * 0.95, hy + sin(a) * hr * 0.95, hr * 0.42, hr * 0.38, 0, '#FFFFFF', PL.s, null);
      }
    }
    if (P.frill) { // basilisk frilled crown: fan of spokes with scalloped membrane
      var n = 7, tipsX = [], tipsY = [];
      for (i = 0; i < n; i++) {
        var fa = ha + PI + (i - 3) * 0.36 + sin(T * 3 + PH) * 0.04, fl = hr * (1.55 + 0.4 * cos((i - 3) * 0.5)) + sin(T * 4 + i) * 0.8;
        tipsX.push(hx + cos(fa) * fl); tipsY.push(hy + sin(fa) * fl);
      }
      g.beginPath(); g.moveTo(hx, hy);
      g.lineTo(tipsX[0], tipsY[0]);
      for (i = 1; i < n; i++) {
        var mx = (tipsX[i - 1] + tipsX[i]) / 2, my = (tipsY[i - 1] + tipsY[i]) / 2;
        g.quadraticCurveTo(hx + (mx - hx) * 0.72, hy + (my - hy) * 0.72, tipsX[i], tipsY[i]);
      }
      g.closePath(); g.fillStyle = PL.frill; g.fill(); outlineStroke();
      g.strokeStyle = PL.frillS; g.lineWidth = 1.6; g.beginPath();
      for (i = 0; i < n; i++) { g.moveTo(hx + (tipsX[i] - hx) * 0.2, hy + (tipsY[i] - hy) * 0.2); g.lineTo(tipsX[i], tipsY[i]); }
      g.stroke();
      for (i = 0; i < n; i++) { Ci(tipsX[i], tipsY[i], 2.4 + LW, OUT); Ci(tipsX[i], tipsY[i], 2.4, PL.frillH); }
    }
    if (P.horns === 'crest') { // phoenix flame crest
      for (i = 0; i < 3; i++) {
        var ca = ha - 1.95 + i * 0.42 + sin(T * 3 + i * 1.5 + PH) * 0.12;
        leaf(hx + cos(ha - 1.6) * hr * 0.6, hy + sin(ha - 1.6) * hr * 0.6, ca, hr * (1.9 - i * 0.2), 5.5, sin(T * 4 + i * 2 + PH) * 3.5, i === 1 ? PL.acc2 : PL.acc, i === 1 ? PL.flashHi : PL.m);
      }
    }
  }

  function drawHead(lookX, lookY) {
    var hr = P.hr, hx = geo.hx, hy = geo.hy, ha = geo.ha, open = geo.open;
    var dx = cos(ha), dy = sin(ha), px = sin(ha), py = -cos(ha); // forward, "up"
    var i;
    drawHeadBack();
    drawHorns(0);
    if (P.beak) {
      // jaw first, upper beak over it
      spike(hx + dx * hr * 0.55 - px * hr * 0.1, hy + dy * hr * 0.55 - py * hr * 0.1 + 0, ha + open * 0.55 + 0.1, hr * 0.95, hr * 0.5, PL.beakS, PL.beakS);
      spike(hx + dx * hr * 0.5 + px * hr * 0.15, hy + dy * hr * 0.5 + py * hr * 0.15, ha - open * 0.15, hr * 1.2, hr * 0.8, PL.beak, PL.beakS);
      // head
      part(hx, hy, hr, hr * 0.95, 0, M, SH, HI);
    } else {
      var srx = hr * 0.78 * P.snout, sry = hr * 0.52;
      var sx = hx + dx * hr * 0.66, sy = hy + dy * hr * 0.66;
      // lower jaw (rotates open about a hinge)
      var hjx = hx + dx * hr * 0.1 - px * hr * 0.32, hjy = hy + dy * hr * 0.1 - py * hr * 0.32;
      var ja = ha + open * 0.55;
      part(hjx + cos(ja) * hr * 0.52 * (0.6 + P.snout * 0.4) , hjy + sin(ja) * hr * 0.52 * (0.6 + P.snout * 0.4), hr * 0.6 * P.snout + hr * 0.1, hr * 0.3, ja, SH, SH, null);
      // head + snout silhouette
      E(hx, hy, hr + LW, hr + LW, 0, OUT); E(sx, sy, srx + LW, sry + LW, ha, OUT);
      E(hx, hy, hr, hr, 0, SH); E(sx, sy, srx, sry, ha, SH);
      E(hx, hy - hr * 0.12, hr * 0.92, hr * 0.84, 0, M); E(sx - px * sry * 0.12, sy - py * sry * 0.12 - sry * 0.1, srx * 0.9, sry * 0.76, ha, M);
      E(hx - hr * 0.3, hy - hr * 0.5, hr * 0.3, hr * 0.16, -0.4, HI);
      if (P.deco === 'plague') { // droopy jowls
        part(hx + dx * hr * 0.2 - px * hr * 0.7, hy + dy * hr * 0.2 - py * hr * 0.7 + 1, hr * 0.5, hr * 0.38, ha, M, SH, null);
      }
      // nostril
      Ci(sx + dx * srx * 0.72 + px * sry * 0.38, sy + dy * srx * 0.72 + py * sry * 0.38, 1.1 + (hr > 10 ? 0.2 : 0), OUT);
      // mouth interior
      if (open > 0.06) {
        E(hx + dx * hr * 1.0 - px * hr * 0.2, hy + dy * hr * 1.0 - py * hr * 0.2, hr * (0.22 + 0.28 * open), hr * (0.1 + 0.2 * open), ha + open * 0.3, '#4A1428');
      }
    }
    drawHorns(1);
    // eye
    var er = hr * 0.42 * P.eye;
    var ex = hx + dx * hr * 0.22 + px * hr * 0.28, ey = hy + dy * hr * 0.22 + py * hr * 0.28;
    var tt = (T + PH * 2.1) % 3.7, bl = tt < 0.14 ? 0.12 + abs(tt - 0.07) / 0.07 * 0.88 : 1;
    var sclera = PL.eye;
    if (P.slit || P.deco === 'magma') { g.globalAlpha *= 0.4; Ci(ex, ey, er + 3, PL.eye); g.globalAlpha *= 0.6; Ci(ex, ey, er + 5, PL.eye); g.globalAlpha /= 0.24; }
    E(ex, ey, er + LW, (er + LW) * bl + (bl < 1 ? 0.6 : 0), 0, OUT);
    E(ex, ey, er, er * bl, 0, sclera);
    if (bl > 0.3) {
      var pr = er * 0.58, pox = lookX * er * 0.36, poy = lookY * er * 0.36;
      if (P.slit) E(ex + pox, ey + poy, pr * 0.42, pr * 1.25 * bl, 0, OUT);
      else E(ex + pox, ey + poy, pr, pr * bl, 0, OUT);
      if (!P.slit && bl > 0.7) Ci(ex + pox + er * 0.2, ey + poy - er * 0.24, Math.max(1, er * 0.2), '#FFFFFF');
    }
    // magma brow / phoenix glow nothing extra
    // plague drips
    if (P.deco === 'plague') {
      for (i = 0; i < 2; i++) {
        var u = (T * 0.7 + PH * 0.2 + i * 0.5) % 1;
        var dxp = hx + dx * hr * 0.9 + px * hr * (-0.1) + i * 3, dyp = hy + dy * hr * 0.9 + hr * 0.45 + u * 18;
        g.globalAlpha *= (1 - u * u);
        Ci(dxp, dyp, 2.1 + LW * 0.6, OUT); Ci(dxp, dyp, 2.1, PL.drip);
        g.globalAlpha /= (1 - u * u);
      }
    }
    // tongue flick for basilisk
    if (P.frill && open < 0.1 && ((T * 0.8 + PH) % 3) < 0.45) {
      var tf = sin(((T * 0.8 + PH) % 3) / 0.45 * PI), tx0 = hx + dx * hr * 1.5, ty0 = hy + dy * hr * 1.5 + hr * 0.1;
      g.strokeStyle = '#D9344F'; g.lineWidth = 1.8; g.lineCap = 'round'; g.beginPath();
      g.moveTo(tx0, ty0); g.lineTo(tx0 + dx * 6 * tf, ty0 + dy * 6 * tf);
      g.lineTo(tx0 + dx * 8 * tf + 2.5 * tf, ty0 + dy * 8 * tf - 2 * tf); g.moveTo(tx0 + dx * 6 * tf, ty0 + dy * 6 * tf); g.lineTo(tx0 + dx * 8 * tf - 2 * tf, ty0 + dy * 8 * tf + 2.5 * tf);
      g.stroke(); g.lineCap = 'butt';
    }
    // attack mouth flash
    if (open > 0.05) {
      var fx = hx + dx * hr * 1.5, fy = hy + dy * hr * 1.5, ga = g.globalAlpha;
      g.globalAlpha = ga * Math.min(1, open) * 0.9; Ci(fx, fy, hr * (0.4 + 0.55 * open), PL.flash);
      g.globalAlpha = ga * Math.min(1, open); Ci(fx, fy, hr * (0.2 + 0.28 * open), PL.flashHi);
      g.globalAlpha = ga;
    }
  }

  // ---- main render ----
  function renderDragon(ctx, x, y, type, stage, form, aim, attackT, id, t, selected) {
    var K = HH.data.config;
    g = ctx; OUT = K.COLORS.outline;
    PL = palette(type, form); M = PL.m; SH = PL.s; HI = PL.h;
    stage = stage | 0; if (stage < 0) stage = 0; if (stage > 2) stage = 2;
    P = profile(stage, form); P.stageIdx = stage;
    var size = (K.STAGES[stage] || K.STAGES[0]).size;
    T = t; PH = (id | 0) * 1.7 + 0.3;
    var ca = cos(aim), sa = sin(aim), fl = ca < 0 ? -1 : 1;
    var la = Math.atan2(sa, ca * fl);
    var at = attackT == null ? 9 : attackT, p = at / 0.15;
    var lunge = (p >= 0 && p < 1) ? sin(p * PI) : 0;
    var open = (p >= 0 && p < 1.15) ? Math.min(1, sin(Math.min(p, 1) * PI) * 1.25) : 0;

    g.save();
    g.translate(x, y);
    // ground shadow
    g.fillStyle = 'rgba(30,18,40,0.22)';
    g.beginPath(); g.ellipse(0, 14 * size, 19 * size, 6.5 * size, 0, 0, TAU); g.fill();
    if (selected) {
      var pul = 0.5 + 0.5 * sin(t * 4);
      var rr = (K.DRAGON_RADIUS + 5) * size * 0.95 + pul * 1.5;
      g.fillStyle = 'rgba(255,230,140,' + (0.16 + pul * 0.06).toFixed(3) + ')';
      g.beginPath(); g.arc(0, 2, rr, 0, TAU); g.fill();
      g.lineWidth = 3; g.strokeStyle = 'rgba(255,235,150,' + (0.65 + pul * 0.25).toFixed(3) + ')';
      g.beginPath(); g.arc(0, 2, rr, 0, TAU); g.stroke();
      g.lineWidth = 7; g.strokeStyle = 'rgba(255,225,120,0.18)';
      g.beginPath(); g.arc(0, 2, rr + 2, 0, TAU); g.stroke();
    }
    g.scale(fl * size, size);
    g.lineJoin = 'round';
    var bob = sin(t * 2.4 + PH) * 1.3 * P.bob * 0.6;
    g.translate(0, bob);

    var cla = cos(la), sla = sin(la);
    geo.bx = P.bx - cla * lunge * 2; geo.by = P.by + (stage === 0 ? 0 : 0) - sla * lunge * 1.2;
    geo.nx = geo.bx + P.rx * 0.55; geo.ny = geo.by - P.ry * 0.35;
    var da = Math.max(-1.3, Math.min(1.3, la)) * 0.55 - 0.45;
    geo.hx = geo.nx + cos(da) * P.neck + cla * lunge * 6;
    geo.hy = geo.ny + sin(da) * P.neck + sla * lunge * 6 + sin(t * 2.4 + PH + 0.6) * 0.8;
    geo.la = la; geo.ha = la * 0.85; geo.open = open; geo.lunge = lunge;

    drawTail();
    drawWing(true);
    drawFeet();
    drawSpines();
    drawBody();
    if (P.shell) drawShell();
    drawWing(false);
    drawNeck();
    drawHead(cla, sla);
    g.restore();
  }

  // offscreen buffer for ghost (so overlapping parts don't show through each other)
  var ghostCanvas = null, ghostCtx = null, GH = 240;
  function getGhost() {
    if (ghostCtx || typeof document === 'undefined') return ghostCtx;
    try {
      ghostCanvas = document.createElement('canvas'); ghostCanvas.width = GH; ghostCanvas.height = GH;
      ghostCtx = ghostCanvas.getContext('2d');
    } catch (e) { ghostCtx = null; }
    return ghostCtx;
  }

  function draw(ctx, d, t, opts) {
    if (!d) return;
    opts = opts || NO_OPTS;
    var aim = d.aim || 0;
    if (opts.ghost) {
      var gc = getGhost();
      if (gc) {
        gc.setTransform(1, 0, 0, 1, 0, 0); gc.clearRect(0, 0, GH, GH);
        renderDragon(gc, GH / 2, GH / 2, d.type, d.stage, d.form, aim, d.attackT, d.id, t, false);
        ctx.save(); ctx.globalAlpha *= 0.5;
        ctx.drawImage(ghostCanvas, d.x - GH / 2, d.y - GH / 2);
        ctx.restore();
        if (opts.selected) renderRing(ctx, d);
        return;
      }
      ctx.save(); ctx.globalAlpha *= 0.5;
      renderDragon(ctx, d.x, d.y, d.type, d.stage, d.form, aim, d.attackT, d.id, t, !!opts.selected);
      ctx.restore();
      return;
    }
    renderDragon(ctx, d.x, d.y, d.type, d.stage, d.form, aim, d.attackT, d.id, t, !!opts.selected);
  }
  function renderRing(ctx, d) {
    var K = HH.data.config, size = (K.STAGES[d.stage | 0] || K.STAGES[0]).size, rr = (K.DRAGON_RADIUS + 5) * size * 0.95;
    ctx.save(); ctx.translate(d.x, d.y);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,235,150,0.8)'; ctx.beginPath(); ctx.arc(0, 2, rr, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // ---- shop icon: front-facing hatchling portrait ----
  function drawIcon(ctx, type, x, y, size) {
    var K = HH.data.config;
    g = ctx; OUT = K.COLORS.outline;
    PL = palette(type, null); M = PL.m; SH = PL.s; HI = PL.h;
    size = size || 56;
    var s = size / 70; // portrait spans about 66 units, so it fits inside a size x size box centred on (x, y)
    g.save(); g.translate(x, y); g.scale(s, s); g.lineJoin = 'round';
    var el = PL.el;
    // wing nubs
    part(-23, 4, 8, 5.5, -0.7, SH, SH, null);
    part(23, 4, 8, 5.5, 0.7, SH, SH, null);
    // shoulders / chest
    part(0, 21, 20, 12, 0, M, SH, HI);
    E(0, 24, 11, 7, 0, PL.belly);
    // head features behind
    if (el === 'frost') {
      spike(-8, -14, -PI / 2 - 0.25, 12, 6, '#FFFFFF', SH); spike(8, -14, -PI / 2 + 0.25, 12, 6, '#FFFFFF', SH); spike(0, -18, -PI / 2, 14, 6.5, '#FFFFFF', SH);
    } else if (el === 'fire') {
      leaf(-6, -13, -PI / 2 - 0.35, 14, 5, 0, '#FF5A1F', PL.h); leaf(6, -13, -PI / 2 + 0.35, 14, 5, 0, '#FF5A1F', PL.h); leaf(0, -15, -PI / 2, 17, 5.5, 0, PL.m, PL.h);
    } else {
      spike(-10, -13, -PI / 2 - 0.7, 11, 5.5, PL.horn, PL.hornS); spike(10, -13, -PI / 2 + 0.7, 11, 5.5, PL.horn, PL.hornS);
    }
    // ears
    spike(-18, -6, PI + 0.5, 9, 6, M, SH); spike(18, -6, -0.5, 9, 6, M, SH);
    // head
    part(0, -3, 21, 18, 0, M, SH, HI);
    // muzzle
    part(0, 8, 11, 7.5, 0, PL.belly, SH, null);
    Ci(-4.2, 7.5, 1.5, OUT); Ci(4.2, 7.5, 1.5, OUT);
    // cheeks
    g.globalAlpha = 0.5; E(-14, 5, 3.4, 2.2, 0, PL.flash); E(14, 5, 3.4, 2.2, 0, PL.flash); g.globalAlpha = 1;
    // eyes
    for (var k = -1; k <= 1; k += 2) {
      var ex = k * 9.5, ey = -5, er = 6.6;
      E(ex, ey, er + LW, er + LW, 0, OUT); E(ex, ey, er, er, 0, '#FFFFFF');
      E(ex + 1.6, ey + 0.6, 3.9, 4.3, 0, OUT);
      Ci(ex + 3, ey - 1.2, 1.5, '#FFFFFF');
    }
    // type extras
    if (el === 'venom') { Ci(-2, -14, 1.8, SH); Ci(3, -12.5, 1.4, SH); Ci(-12, 1, 1.4, SH); }
    if (el === 'frost') { Ci(-12, 0, 1.3, HI); Ci(12, 1, 1.3, HI); }
    g.restore();
  }

  HH.render.artDragons = { ready: true, draw: draw, drawIcon: drawIcon };
})(globalThis.HH);
