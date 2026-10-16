(function (HH) {
  'use strict';
  // Map background (cached once to an offscreen canvas) and the hoard pile.
  var W = 1040, H = 672, TAU = Math.PI * 2;
  var C = HH.data.config;
  var OUT = C.COLORS.outline;
  var bgCache = {};
  var pileCache = {};

  function mk(seed) { // local seeded rng (mulberry32), keeps decor deterministic
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function newCanvas(w, h) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    return cv;
  }

  function distSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var l2 = dx * dx + dy * dy;
    var t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    var ex = ax + dx * t - px, ey = ay + dy * t - py;
    return Math.sqrt(ex * ex + ey * ey);
  }
  function distPath(wp, x, y) {
    var best = 1e9;
    for (var i = 0; i < wp.length - 1; i++) {
      var d = distSeg(x, y, wp[i][0], wp[i][1], wp[i + 1][0], wp[i + 1][1]);
      if (d < best) best = d;
    }
    return best;
  }

  function strokePath(c, wp, width, style) {
    c.beginPath();
    c.moveTo(wp[0][0], wp[0][1]);
    for (var i = 1; i < wp.length; i++) c.lineTo(wp[i][0], wp[i][1]);
    c.lineWidth = width; c.strokeStyle = style;
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.stroke();
  }

  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }

  // ---------- decor pieces ----------
  function drawTree(c, x, y, s, v) {
    c.fillStyle = 'rgba(30,60,30,0.28)';
    ell(c, x + s * 0.2, y + s * 0.95, s * 1.15, s * 0.38); c.fill();
    // trunk
    c.lineJoin = 'round';
    c.beginPath(); c.rect(x - s * 0.18, y + s * 0.15, s * 0.36, s * 0.8);
    c.fillStyle = '#8B5A2B'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = '#6B4220'; c.fillRect(x + s * 0.02, y + s * 0.17, s * 0.15, s * 0.76);
    // canopy: union outline then fills
    var cs = [[0, -s * 0.35, s * 0.85], [-s * 0.55, -s * 0.05, s * 0.62], [s * 0.55, -s * 0.05, s * 0.62], [0, -s * 0.8, s * 0.55]];
    var i, q;
    c.strokeStyle = OUT; c.lineWidth = 6;
    for (i = 0; i < cs.length; i++) { q = cs[i]; c.beginPath(); c.arc(x + q[0], y + q[1], q[2], 0, TAU); c.stroke(); }
    var main = v ? '#58B84C' : '#4FAE4A', shade = '#2F8A3A', hl = '#9BE86F';
    for (i = 0; i < cs.length; i++) { q = cs[i]; c.beginPath(); c.arc(x + q[0], y + q[1], q[2], 0, TAU); c.fillStyle = main; c.fill(); }
    // shade crescents (lower right) and highlights (upper left)
    for (i = 0; i < cs.length; i++) {
      q = cs[i];
      c.beginPath(); c.arc(x + q[0], y + q[1], q[2] * 0.82, 0.15, 1.35); c.lineWidth = q[2] * 0.3; c.strokeStyle = shade; c.stroke();
      c.beginPath(); c.arc(x + q[0], y + q[1], q[2] * 0.7, 3.5, 4.5); c.lineWidth = q[2] * 0.18; c.strokeStyle = hl; c.stroke();
    }
  }
  function drawRock(c, x, y, s) {
    c.fillStyle = 'rgba(30,40,30,0.25)';
    ell(c, x + s * 0.1, y + s * 0.5, s * 1.0, s * 0.3); c.fill();
    var parts = [[0, 0, s * 0.9, s * 0.62], [-s * 0.7, s * 0.15, s * 0.5, s * 0.38], [s * 0.65, s * 0.2, s * 0.45, s * 0.34]];
    var i, q;
    c.strokeStyle = OUT; c.lineWidth = 5.5;
    for (i = 0; i < parts.length; i++) { q = parts[i]; ell(c, x + q[0], y + q[1], q[2], q[3]); c.stroke(); }
    for (i = 0; i < parts.length; i++) { q = parts[i]; ell(c, x + q[0], y + q[1], q[2], q[3]); c.fillStyle = '#A8AEB5'; c.fill(); }
    for (i = 0; i < parts.length; i++) {
      q = parts[i];
      c.beginPath(); c.ellipse(x + q[0], y + q[1], q[2] * 0.8, q[3] * 0.8, 0, 0.2, 1.3); c.lineWidth = q[3] * 0.35; c.strokeStyle = '#7C838C'; c.stroke();
      c.beginPath(); c.ellipse(x + q[0] - q[2] * 0.2, y + q[1] - q[3] * 0.3, q[2] * 0.35, q[3] * 0.2, -0.3, 0, TAU); c.fillStyle = '#E3E7EB'; c.fill();
    }
  }
  function drawBush(c, x, y, s) {
    c.fillStyle = 'rgba(30,60,30,0.25)';
    ell(c, x, y + s * 0.5, s * 1.1, s * 0.3); c.fill();
    var cs = [[-s * 0.5, 0, s * 0.55], [s * 0.5, 0, s * 0.55], [0, -s * 0.3, s * 0.65]];
    var i, q;
    c.strokeStyle = OUT; c.lineWidth = 5;
    for (i = 0; i < 3; i++) { q = cs[i]; c.beginPath(); c.arc(x + q[0], y + q[1], q[2], 0, TAU); c.stroke(); }
    for (i = 0; i < 3; i++) { q = cs[i]; c.beginPath(); c.arc(x + q[0], y + q[1], q[2], 0, TAU); c.fillStyle = '#5DBE50'; c.fill(); }
    for (i = 0; i < 3; i++) { q = cs[i]; c.beginPath(); c.arc(x + q[0], y + q[1], q[2] * 0.75, 0.2, 1.3); c.lineWidth = q[2] * 0.3; c.strokeStyle = '#34914A'; c.stroke(); }
    c.beginPath(); c.arc(x - s * 0.1, y - s * 0.55, s * 0.18, 0, TAU); c.fillStyle = '#A5EE7A'; c.fill();
  }
  function drawFlower(c, x, y, col) {
    c.lineWidth = 1.2; c.strokeStyle = 'rgba(43,29,46,0.55)';
    for (var i = 0; i < 5; i++) {
      var a = i / 5 * TAU;
      c.beginPath(); c.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2.3, 0, TAU);
      c.fillStyle = col; c.fill(); c.stroke();
    }
    c.beginPath(); c.arc(x, y, 1.9, 0, TAU); c.fillStyle = '#FFD23D'; c.fill();
  }
  function drawTuft(c, x, y, s) {
    c.lineWidth = 2; c.lineCap = 'round'; c.strokeStyle = '#5BAA48';
    c.beginPath();
    c.moveTo(x - 3 * s, y); c.quadraticCurveTo(x - 4 * s, y - 5 * s, x - 6 * s, y - 7 * s);
    c.moveTo(x, y); c.quadraticCurveTo(x, y - 6 * s, x + 1 * s, y - 9 * s);
    c.moveTo(x + 3 * s, y); c.quadraticCurveTo(x + 4 * s, y - 5 * s, x + 7 * s, y - 6 * s);
    c.stroke();
  }

  function drawGate(c, wp, pw) {
    var y0 = wp[0][1], x = 30;
    var ya = y0 - pw / 2 - 8, yb = y0 + pw / 2 + 8;
    var posts = [ya, yb], i;
    c.lineJoin = 'round';
    for (i = 0; i < 2; i++) {
      var py = posts[i];
      c.fillStyle = 'rgba(40,30,20,0.28)'; ell(c, x + 3, py + 15, 13, 5); c.fill();
      c.beginPath(); c.rect(x - 7, py - 24, 14, 38);
      c.fillStyle = '#9A6A3A'; c.fill(); c.lineWidth = 2.8; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = '#704A28'; c.fillRect(x + 1, py - 22, 5, 34);
      c.fillStyle = '#C48B50'; c.fillRect(x - 5, py - 22, 3, 30);
      // post cap
      c.beginPath(); c.rect(x - 9, py - 30, 18, 8);
      c.fillStyle = '#B07A44'; c.fill(); c.stroke();
      // pennant
      c.beginPath(); c.moveTo(x + 6, py - 28); c.lineTo(x + 28, py - 36); c.lineTo(x + 6, py - 42); c.closePath();
      c.fillStyle = '#C94A3F'; c.fill(); c.lineWidth = 2.4; c.stroke();
      c.beginPath(); c.moveTo(x + 6, py - 28); c.lineTo(x + 6, py - 50);
      c.lineWidth = 3; c.stroke();
    }
    // rope between posts, sagging, behind where enemies walk (decor only)
    c.beginPath(); c.moveTo(x, ya + 10); c.quadraticCurveTo(x - 10, y0, x, yb + 10);
    c.lineWidth = 2.5; c.strokeStyle = 'rgba(43,29,46,0.0)'; c.stroke();
    // sign with arrow
    var sx = 78, sy = y0 - pw / 2 - 40;
    c.fillStyle = 'rgba(40,30,20,0.25)'; ell(c, sx + 2, sy + 26, 20, 5); c.fill();
    c.beginPath(); c.rect(sx - 3, sy + 4, 6, 24);
    c.fillStyle = '#8B5A2B'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.moveTo(sx - 26, sy - 12); c.lineTo(sx + 18, sy - 12); c.lineTo(sx + 30, sy - 1); c.lineTo(sx + 18, sy + 10); c.lineTo(sx - 26, sy + 10); c.closePath();
    c.fillStyle = '#C48B50'; c.fill(); c.stroke();
    c.fillStyle = '#E4B67C'; c.fillRect(sx - 23, sy - 9, 38, 3);
    // skull-ish warning mark: red arrow
    c.beginPath(); c.moveTo(sx - 18, sy - 3); c.lineTo(sx + 8, sy - 3); c.lineTo(sx + 8, sy - 7); c.lineTo(sx + 20, sy - 1); c.lineTo(sx + 8, sy + 5); c.lineTo(sx + 8, sy + 1); c.lineTo(sx - 18, sy + 1); c.closePath();
    c.fillStyle = '#C94A3F'; c.fill(); c.lineWidth = 1.8; c.stroke();
  }

  function build(level) {
    var cv = newCanvas(W, H);
    var c = cv.getContext('2d');
    var rnd = mk(hashStr(level.id || 'level'));
    var wp = level.waypoints, pw = level.pathWidth || 46;
    var hoard = level.hoard || { x: -999, y: -999 };
    var i, k, x, y;

    // base grass + mowed bands
    c.fillStyle = C.COLORS.grass; c.fillRect(0, 0, W, H);
    for (i = 0; i < W; i += 80) {
      if ((i / 80) % 2 === 0) { c.fillStyle = 'rgba(255,255,200,0.045)'; c.fillRect(i, 0, 80, H); }
    }
    // patches
    for (i = 0; i < 70; i++) {
      x = rnd() * W; y = rnd() * H;
      ell(c, x, y, 30 + rnd() * 70, 18 + rnd() * 44, rnd() * 3);
      c.fillStyle = rnd() < 0.6 ? 'rgba(60,140,60,0.15)' : 'rgba(200,240,130,0.17)';
      c.fill();
    }
    // edge vignette
    var g = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
    g.addColorStop(0, 'rgba(30,90,40,0)'); g.addColorStop(1, 'rgba(30,90,40,0.28)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    // ---- path ----
    strokePath(c, wp, pw + 26, 'rgba(50,110,45,0.22)');   // soft grass shadow
    strokePath(c, wp, pw + 10, OUT);                       // dark outline
    strokePath(c, wp, pw + 1, '#B38D55');                  // darker edge
    strokePath(c, wp, pw - 7, C.COLORS.path);              // body
    strokePath(c, wp, pw * 0.42, '#F0DDB1');               // lighter center stripe
    // dust speckles + pebbles
    var segs = [], total = 0, len;
    for (i = 0; i < wp.length - 1; i++) {
      len = Math.sqrt(Math.pow(wp[i + 1][0] - wp[i][0], 2) + Math.pow(wp[i + 1][1] - wp[i][1], 2));
      segs.push(len); total += len;
    }
    function onPath(offMax) {
      var d = rnd() * total, j = 0;
      while (j < segs.length - 1 && d > segs[j]) { d -= segs[j]; j++; }
      var t = d / segs[j];
      var ax = wp[j][0], ay = wp[j][1], bx = wp[j + 1][0], by = wp[j + 1][1];
      var dx = bx - ax, dy = by - ay, l = Math.sqrt(dx * dx + dy * dy) || 1;
      var off = (rnd() * 2 - 1) * offMax;
      return [ax + dx * t - dy / l * off, ay + dy * t + dx / l * off];
    }
    for (i = 0; i < 380; i++) {
      var p = onPath(pw * 0.46);
      c.fillStyle = rnd() < 0.5 ? 'rgba(150,110,60,0.35)' : 'rgba(255,245,215,0.45)';
      c.fillRect(p[0], p[1], 2, 2);
    }
    for (i = 0; i < 210; i++) {
      var q = onPath(pw * 0.44);
      var pr = 1.6 + rnd() * 2.4;
      ell(c, q[0], q[1], pr * 1.25, pr, rnd() * 3);
      c.fillStyle = rnd() < 0.5 ? '#A39A90' : '#8F867D'; c.fill();
      c.lineWidth = 1.2; c.strokeStyle = 'rgba(43,29,46,0.7)'; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.fillRect(q[0] - pr * 0.5, q[1] - pr * 0.5, 1.4, 1);
    }

    // ---- decor placement ----
    var limit = pw / 2 + 8;
    var dec = [];
    function farFromAll(x, y, r) {
      for (var j = 0; j < dec.length; j++) {
        var dx = dec[j].x - x, dy = dec[j].y - y, rr = dec[j].r + r;
        if (dx * dx + dy * dy < rr * rr) return false;
      }
      return true;
    }
    function nearGate(x, y) { return x < 130 && Math.abs(y - wp[0][1]) < pw / 2 + 80; }
    function edgeDist(x, y) { return Math.min(x, W - x, y, H - y); }
    function hoardDist(x, y) { return Math.sqrt((x - hoard.x) * (x - hoard.x) + (y - hoard.y) * (y - hoard.y)); }
    var tries, trees = 0;
    for (tries = 0; tries < 900 && trees < 22; tries++) {
      x = 14 + rnd() * (W - 28); y = 34 + rnd() * (H - 40);
      var s = 22 + rnd() * 10;
      if (edgeDist(x, y) > 80 && rnd() > 0.08) continue;
      if (distPath(wp, x, y) < limit + s * 1.3) continue;
      if (hoardDist(x, y) < 110 || nearGate(x, y)) continue;
      if (!farFromAll(x, y, s * 1.6)) continue;
      dec.push({ t: 0, x: x, y: y, r: s * 1.5, s: s, v: rnd() < 0.5 });
      trees++;
    }
    var rocks = 0;
    for (tries = 0; tries < 600 && rocks < 12; tries++) {
      x = 14 + rnd() * (W - 28); y = 20 + rnd() * (H - 30);
      var rs = 11 + rnd() * 9;
      if (edgeDist(x, y) > 150) continue;
      if (distPath(wp, x, y) < limit + rs * 1.2) continue;
      if (hoardDist(x, y) < 90 || nearGate(x, y)) continue;
      if (!farFromAll(x, y, rs * 1.6)) continue;
      dec.push({ t: 1, x: x, y: y, r: rs * 1.5, s: rs });
      rocks++;
    }
    var bushes = 0;
    for (tries = 0; tries < 500 && bushes < 10; tries++) {
      x = 14 + rnd() * (W - 28); y = 20 + rnd() * (H - 30);
      var bs = 11 + rnd() * 6;
      if (edgeDist(x, y) > 130) continue;
      if (distPath(wp, x, y) < limit + bs * 1.3) continue;
      if (hoardDist(x, y) < 90 || nearGate(x, y)) continue;
      if (!farFromAll(x, y, bs * 1.5)) continue;
      dec.push({ t: 2, x: x, y: y, r: bs * 1.4, s: bs });
      bushes++;
    }

    // flowers and tufts (low, drawn before the big pieces)
    var fcols = ['#FFFFFF', '#FFD6E8', '#FFF08A', '#FF9EC7', '#C7B8FF', '#FFB86B'];
    for (i = 0; i < 160; i++) {
      x = rnd() * W; y = rnd() * H;
      var col = fcols[(rnd() * fcols.length) | 0];
      if (distPath(wp, x, y) < limit + 6 || hoardDist(x, y) < 70) continue;
      drawFlower(c, x, y, col);
    }
    for (i = 0; i < 300; i++) {
      x = rnd() * W; y = rnd() * H;
      var ts = 0.8 + rnd() * 0.6;
      if (distPath(wp, x, y) < limit + 4 || hoardDist(x, y) < 70) continue;
      drawTuft(c, x, y, ts);
    }
    // little tufts hugging the path outline
    for (i = 0; i < 90; i++) {
      var o = onPath(0);
      var a2 = rnd() * TAU;
      x = o[0] + Math.cos(a2) * (pw / 2 + 12 + rnd() * 6); y = o[1] + Math.sin(a2) * (pw / 2 + 12 + rnd() * 6);
      if (x < 0 || x > W || y < 0 || y > H) continue;
      if (distPath(wp, x, y) < pw / 2 + 8) continue;
      drawTuft(c, x, y, 1);
    }

    drawGate(c, wp, pw);

    dec.sort(function (a, b) { return a.y - b.y; });
    for (k = 0; k < dec.length; k++) {
      var d = dec[k];
      if (d.t === 0) drawTree(c, d.x, d.y, d.s, d.v);
      else if (d.t === 1) drawRock(c, d.x, d.y, d.s);
      else drawBush(c, d.x, d.y, d.s);
    }
    return cv;
  }

  function drawBackground(ctx, level) {
    if (!level) return;
    var key = (level.id || 'x') + '|' + level.pathWidth + '|' + level.waypoints.length;
    var cv = bgCache[key];
    if (!cv) cv = bgCache[key] = build(level);
    ctx.drawImage(cv, 0, 0);
  }

  // ---------- hoard ----------
  function coin(c, x, y, r) {
    c.beginPath(); c.arc(x, y, r, 0, TAU);
    c.fillStyle = C.COLORS.gold; c.fill();
    c.save(); c.clip();
    c.fillStyle = '#E39A1B'; c.fillRect(x - r, y + r * 0.25, r * 2, r);
    c.fillRect(x + r * 0.45, y - r, r, r * 2);
    c.restore();
    c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.arc(x - r * 0.08, y - r * 0.08, r * 0.55, 0, TAU);
    c.lineWidth = 1.2; c.strokeStyle = '#B9780F'; c.stroke();
    c.beginPath(); c.arc(x - r * 0.35, y - r * 0.4, r * 0.28, 0, TAU);
    c.fillStyle = '#FFF1A8'; c.fill();
  }
  function chest(c, x, y) {
    c.lineJoin = 'round';
    c.fillStyle = 'rgba(30,20,20,0.3)'; ell(c, x + 2, y + 16, 24, 6); c.fill();
    // body
    c.beginPath(); c.rect(x - 19, y - 2, 38, 18);
    c.fillStyle = '#9A5A2A'; c.fill(); c.lineWidth = 2.8; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = '#7A4620'; c.fillRect(x + 8, y, 9, 14);
    c.fillStyle = '#B8743A'; c.fillRect(x - 17, y, 5, 14);
    // gold coins peeking out of open lid
    c.beginPath(); c.ellipse(x, y - 2, 18, 6, 0, Math.PI, TAU);
    c.fillStyle = C.COLORS.gold; c.fill(); c.stroke();
    // lid (tilted open, behind)
    c.beginPath(); c.moveTo(x - 19, y - 3); c.lineTo(x - 15, y - 17); c.lineTo(x + 15, y - 17); c.lineTo(x + 19, y - 3); c.closePath();
    c.fillStyle = '#B06A32'; c.fill(); c.stroke();
    c.fillStyle = '#D18A4C'; c.fillRect(x - 12, y - 15, 24, 3);
    // gold straps and lock
    c.fillStyle = C.COLORS.gold;
    c.fillRect(x - 11, y - 2, 4, 18); c.fillRect(x + 7, y - 2, 4, 18);
    c.lineWidth = 1.6; c.strokeRect(x - 11, y - 2, 4, 18); c.strokeRect(x + 7, y - 2, 4, 18);
    c.beginPath(); c.arc(x, y + 5, 4, 0, TAU); c.fillStyle = C.COLORS.gold; c.fill(); c.lineWidth = 2; c.stroke();
    c.fillStyle = OUT; c.fillRect(x - 1, y + 3, 2, 4);
    coin(c, x - 8, y - 5, 4.5); coin(c, x + 6, y - 6, 4.5);
  }

  function buildPile(steps) {
    var frac = steps / 20;
    var cv = newCanvas(180, 120);
    var c = cv.getContext('2d');
    var rows = Math.max(1, Math.min(7, 1 + Math.round(frac * 6)));
    var sc = 0.6 + 0.4 * frac;
    var cx = 90, cy = 88;
    var rnd = mk(1234);
    c.save();
    c.translate(cx, cy); c.scale(sc, sc);
    c.fillStyle = 'rgba(30,20,10,0.3)'; ell(c, 0, 10, 52, 13); c.fill();
    // chest sits beside the pile (drawn in drawHoard); here: base coins layered bottom to top
    var r, i, count, px, py;
    for (r = 0; r < rows; r++) {
      count = rows - r + (rows > 1 ? 1 : 2);
      for (i = 0; i < count; i++) {
        px = (i - (count - 1) / 2) * 11.5 + (rnd() - 0.5) * 3;
        py = -r * 8.5 + (rnd() - 0.5) * 2 + (r === 0 ? 0 : 0);
        coin(c, px, py, 6.6);
      }
    }
    // loose coins at the base
    coin(c, -42, 8, 5.6); coin(c, 40, 9, 5.6); coin(c, -30, 12, 5.2);
    // crown jewel on top when the pile is big
    if (frac > 0.6) {
      var ty = -(rows - 1) * 8.5 - 9;
      c.beginPath(); c.moveTo(0, ty - 9); c.lineTo(7, ty); c.lineTo(0, ty + 6); c.lineTo(-7, ty); c.closePath();
      c.fillStyle = '#FF5C7A'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = '#FFC1CD'; c.beginPath(); c.moveTo(-3, ty - 2); c.lineTo(0, ty - 6); c.lineTo(1, ty - 2); c.closePath(); c.fill();
    }
    c.restore();
    return cv;
  }

  function star(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.closePath();
  }

  var SPARK = [[-18, -30, 0], [14, -38, 1.7], [30, -18, 3.1], [-34, -12, 4.4], [2, -50, 5.6]];

  function drawHoard(ctx, level, frac, t) {
    if (!level || !level.hoard) return;
    frac = frac < 0 ? 0 : (frac > 1 ? 1 : frac);
    var key = Math.round(frac * 20);
    var pile = pileCache[key];
    if (!pile) pile = pileCache[key] = buildPile(key);
    var hx = level.hoard.x, hy = level.hoard.y;
    chest(ctx, hx - 64, hy - 4);
    ctx.drawImage(pile, hx - 90, hy - 88 + 8);
    // sparkles
    var cnt = frac > 0.05 ? (frac > 0.5 ? 5 : 3) : 0;
    for (var i = 0; i < cnt; i++) {
      var sp = SPARK[i];
      var ph = Math.sin(t * 2.6 + sp[2]);
      if (ph <= 0.2) continue;
      var r = 3 + ph * ph * 6;
      star(ctx, hx + sp[0] * (0.6 + 0.4 * frac), hy + sp[1] * (0.5 + 0.5 * frac) + 8, r);
      ctx.fillStyle = '#FFFBE0'; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = '#E8B72B'; ctx.stroke();
    }
  }

  HH.render.artMap = { drawBackground: drawBackground, drawHoard: drawHoard };
})(globalThis.HH);
