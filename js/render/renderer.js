(function (HH) {
  'use strict';
  // Main renderer: panels, map layers, projectiles, zones, placeholder dragons, range circles, particle hookups.
  var C = HH.data.config;
  var OUT = C.COLORS.outline;
  var TAU = Math.PI * 2;
  var MAP_W = 1040, MAP_H = 672, TOP_H = 48;
  var VIEW_W = 1280, VIEW_H = 720;

  var ctx = null;
  var canvas = null;
  var T = 0;                  // render clock (seconds, real time)
  var bound = null;           // { game, handlers: [[name, fn], ...] }
  var panelCache = null;
  var drawList = [];
  var DASH = [10, 7], NODASH = [];
  var dragOpts = { selected: false, ghost: false };
  var ghost = { id: -1, active: true, type: 'ember', def: null, x: 0, y: 0, stage: 0, xp: 0, form: null, instincts: [],
    aim: -Math.PI / 2, attackT: 99, stats: null, ghost: true };

  function particles() { return HH.render.particles; }
  function elementOf(d) {
    if (d.def && d.def.element) return d.def.element;
    if (d.proj) return d.proj;
    return d.type === 'frost' ? 'frost' : (d.type === 'venom' ? 'venom' : 'fire');
  }
  function colsOf(el) { return C.COLORS[el] || C.COLORS.fire; }

  // ---------- panels ----------
  function mkRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rivet(c, x, y) {
    c.beginPath(); c.arc(x, y, 3.4, 0, TAU); c.fillStyle = '#9A8F86'; c.fill();
    c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.arc(x - 1, y - 1, 1.1, 0, TAU); c.fillStyle = '#E3E0DA'; c.fill();
  }
  function woodRect(c, x, y, w, h, horizontalPlanks, rnd) {
    var g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#5A4030'); g.addColorStop(1, '#3B2A22');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    var i, p;
    c.lineWidth = 2;
    if (horizontalPlanks) {
      for (p = y + 56; p < y + h; p += 56) {
        c.strokeStyle = 'rgba(25,15,15,0.55)'; c.beginPath(); c.moveTo(x, p); c.lineTo(x + w, p); c.stroke();
        c.strokeStyle = 'rgba(255,220,170,0.08)'; c.beginPath(); c.moveTo(x, p + 2); c.lineTo(x + w, p + 2); c.stroke();
      }
    } else {
      for (p = x + 80; p < x + w; p += 80) {
        c.strokeStyle = 'rgba(25,15,15,0.55)'; c.beginPath(); c.moveTo(p, y); c.lineTo(p, y + h); c.stroke();
        c.strokeStyle = 'rgba(255,220,170,0.08)'; c.beginPath(); c.moveTo(p + 2, y); c.lineTo(p + 2, y + h); c.stroke();
      }
    }
    // grain
    c.lineWidth = 1;
    for (i = 0; i < 120; i++) {
      var gx = x + rnd() * w, gy = y + rnd() * h, gl = 14 + rnd() * 40;
      c.strokeStyle = rnd() < 0.5 ? 'rgba(20,10,10,0.18)' : 'rgba(255,220,170,0.07)';
      c.beginPath();
      if (horizontalPlanks) { c.moveTo(gx, gy); c.lineTo(Math.min(x + w, gx + gl), gy); }
      else { c.moveTo(gx, gy); c.lineTo(gx, Math.min(y + h, gy + gl)); }
      c.stroke();
    }
  }
  function buildPanels() {
    var cv = document.createElement('canvas');
    cv.width = VIEW_W; cv.height = VIEW_H;
    var c = cv.getContext('2d');
    var rnd = mkRng(777);
    // top bar
    woodRect(c, 0, 0, VIEW_W, TOP_H, false, rnd);
    // sidebar
    woodRect(c, MAP_W, TOP_H, VIEW_W - MAP_W, VIEW_H - TOP_H, true, rnd);
    // trims
    c.fillStyle = '#7A5A36'; c.fillRect(0, TOP_H - 6, VIEW_W, 3);
    c.fillStyle = '#A8814E'; c.fillRect(0, TOP_H - 6, VIEW_W, 1);
    c.fillStyle = '#7A5A36'; c.fillRect(MAP_W + 3, TOP_H, 3, VIEW_H - TOP_H);
    c.fillStyle = '#A8814E'; c.fillRect(MAP_W + 3, TOP_H, 1, VIEW_H - TOP_H);
    c.fillStyle = OUT;
    c.fillRect(0, TOP_H - 3, VIEW_W, 3);
    c.fillRect(MAP_W - 3, TOP_H, 3, VIEW_H - TOP_H);
    // top bar inner shadow under trim
    c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(0, TOP_H - 9, VIEW_W, 3);
    // rivets
    var i;
    for (i = 24; i < VIEW_W; i += 160) rivet(c, i, 10);
    for (i = 90; i < VIEW_H; i += 112) { rivet(c, MAP_W + 16, i); rivet(c, VIEW_W - 14, i); }
    rivet(c, 12, 38); rivet(c, VIEW_W - 12, 38);
    // outer frame
    c.lineWidth = 3; c.strokeStyle = OUT; c.strokeRect(1.5, 1.5, VIEW_W - 3, VIEW_H - 3);
    return cv;
  }
  function drawPanels() {
    if (!panelCache) panelCache = buildPanels();
    ctx.drawImage(panelCache, 0, 0);
  }

  // ---------- events -> particles ----------
  function unbind() {
    if (!bound) return;
    var ev = bound.game && bound.game.events;
    if (ev && ev.off) {
      for (var i = 0; i < bound.handlers.length; i++) ev.off(bound.handlers[i][0], bound.handlers[i][1]);
    }
    bound = null;
  }

  function bind(game) {
    unbind();
    if (!game || !game.events) return;
    var P = particles();
    var H = [];
    var comboTexts = [];   // recent combo floating texts: { t, id }
    if (P && P.clear) P.clear();   // new game: drop leftover particles / floating texts
    function on(name, fn) { game.events.on(name, fn); H.push([name, fn]); }

    on('enemyKilled', function (d) {
      var x = d.x !== undefined ? d.x : d.enemy.x, y = d.y !== undefined ? d.y : d.enemy.y;
      var r = d.reward || 0;
      P.spawn('poof', x, y, { n: 5 });
      P.spawn('coin', x, y - 4, { n: Math.max(1, Math.min(5, 1 + Math.floor(r / 3))) });
      if (r > 0) P.spawn('text', x, y - 16, { text: '+' + r, color: C.COLORS.gold, size: 17 });
    });
    on('enemyHit', function (d) {
      var e = d.enemy; if (!e) return;
      if (d.kind === 'dot') { if (Math.random() < 0.1) P.spawn('spark', e.x, e.y - 4, { n: 1, color: d.dragon ? colsOf(elementOf(d.dragon))[0] : '#FFE9A0' }); return; }
      P.spawn('spark', e.x, e.y - 4, { n: 3, color: d.dragon ? colsOf(elementOf(d.dragon))[2] : '#FFE9A0' });
    });
    on('enemyLeaked', function (d) {
      var e = d.enemy; if (!e) return;
      P.spawn('coin', e.x, e.y - 6, { n: Math.max(1, d.steals || 1), vx: -90, vy: -230, life: 1.0 });
      P.spawn('text', e.x, e.y - 18, { text: '-' + (d.steals || 1), color: '#FF6B5B', size: 18 });
    });
    on('combo', function (d) {
      var blight = d.kind === 'blight';
      var x = d.x !== undefined ? d.x : d.enemy.x, y = d.y !== undefined ? d.y : d.enemy.y;
      P.spawn('ring', x, y, { color: blight ? '#B05CE0' : '#FFFFFF', r0: 8, r1: blight ? 40 : 54, life: 0.55 });
      // throttle combo texts: one per enemy per 0.8 s, at most 3 alive, stacked texts are offset upward
      var now = Date.now(), eid = d.enemy ? d.enemy.id : Math.round(x / 40) + ':' + Math.round(y / 40), live = 0, dup = false;
      comboTexts = comboTexts.filter(function (c) { return now - c.t < 800; });
      for (var ci = 0; ci < comboTexts.length; ci++) { live++; if (comboTexts[ci].id === eid) dup = true; }
      if (!dup && live < 3) {
        comboTexts.push({ t: now, id: eid });
        P.spawn('text', x, y - 22 - live * 16, { text: blight ? 'BLIGHT!' : 'STEAM!', color: blight ? '#D08CFF' : '#FFFFFF', size: 18, life: 1.0 });
      }
      if (blight) P.spawn('goo', x, y, { n: 4, color: '#B05CE0' }); else P.spawn('poof', x, y, { n: 6 });
    });
    on('freeze', function (d) {
      var e = d.enemy; if (!e) return;
      P.spawn('ice', e.x, e.y - 4, { n: 8 });
      P.spawn('ring', e.x, e.y, { color: C.COLORS.frost[0], r0: 6, r1: 32, life: 0.4 });
    });
    on('projectileHit', function (d) {
      var p = d.proj, kind = p ? p.kind : 'fireball', x = d.x, y = d.y;
      if (kind === 'fireball') { P.spawn('ember', x, y, { n: 4 }); P.spawn('spark', x, y, { n: 2, color: C.COLORS.fire[2] }); }
      else if (kind === 'shard') { P.spawn('ice', x, y, { n: 3, size: 3.5 }); }
      else if (kind === 'spit') { P.spawn('goo', x, y, { n: 4 }); }
      else if (kind === 'lava') { P.spawn('ember', x, y, { n: 8 }); P.spawn('poof', x, y, { n: 3 }); P.spawn('ring', x, y, { color: C.COLORS.fire[0], r0: 8, r1: 40, life: 0.4 }); }
      else if (kind === 'lance') { P.spawn('ice', x, y, { n: 3, size: 3.5 }); P.spawn('spark', x, y, { n: 2, color: '#E8FBFF' }); }
    });
    on('dragonPlaced', function (d) {
      var dr = d.dragon; if (!dr) return;
      P.spawn('ring', dr.x, dr.y, { color: colsOf(elementOf(dr))[0], r0: 10, r1: 52, life: 0.55 });
      P.spawn('poof', dr.x, dr.y + 6, { n: 6 });
    });
    on('dragonAttack', function (d) {
      var dr = d.dragon;
      if (!d.cone || !dr) return;
      var len = (dr.stats && dr.stats.range) || (dr.def && dr.def.base && dr.def.base.range) || 120;
      P.spawn('cone', dr.x, dr.y, { angle: dr.aim || 0, len: len, half: C.CONE_ANGLE * Math.PI / 360, color: C.COLORS.fire[0] });
      P.spawn('ember', dr.x + Math.cos(dr.aim || 0) * len * 0.6, dr.y + Math.sin(dr.aim || 0) * len * 0.6, { n: 3 });
    });
    on('dragonSold', function (d) {
      var dr = d.dragon; if (!dr) return;
      P.spawn('poof', dr.x, dr.y, { n: 6 });
      P.spawn('coin', dr.x, dr.y - 6, { n: 3 });
      if (d.refund) P.spawn('text', dr.x, dr.y - 28, { text: '+' + d.refund, color: C.COLORS.gold, size: 17 });
    });
    on('stageUp', function (d) {
      var dr = d.dragon; if (!dr) return;
      var cols = colsOf(elementOf(dr));
      P.spawn('ring', dr.x, dr.y, { color: cols[0], r0: 12, r1: 70, life: 0.7, width: 6 });
      P.spawn('ring', dr.x, dr.y, { color: cols[2], r0: 6, r1: 48, life: 0.5 });
      P.spawn('text', dr.x, dr.y - 40, { text: 'GROW!', color: cols[2], size: 22, life: 1.3 });
      P.spawn('spark', dr.x, dr.y, { n: 8, color: cols[2] });
    });
    bound = { game: game, handlers: H };
  }

  function init(cv) {
    canvas = cv;
    ctx = cv.getContext('2d');
    HH.render.ctx = ctx;
    panelCache = null;
  }

  // ---------- map layers ----------
  function drawZone(z, t) {
    var life = z.maxT > 0 ? Math.max(0, Math.min(1, z.t / z.maxT)) : 1;
    var fade = Math.min(1, life * 3);
    var r = z.r || 40, x = z.x, y = z.y, i, a;
    if (z.kind === 'lava') {
      var pulse = 0.5 + 0.5 * Math.sin(t * 5 + z.id);
      ctx.globalAlpha = 0.35 * fade; ctx.fillStyle = '#FF7A2F';
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.25, r * 1.05, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = fade;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.84, 0, 0, TAU);
      ctx.fillStyle = '#6B1E10'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.84, r * 0.68, 0, 0, TAU);
      ctx.fillStyle = C.COLORS.fire[0]; ctx.fill();
      ctx.beginPath(); ctx.ellipse(x - r * 0.05, y - r * 0.03, r * (0.5 + 0.08 * pulse), r * (0.38 + 0.06 * pulse), 0, 0, TAU);
      ctx.fillStyle = '#FFB347'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(x - r * 0.1, y - r * 0.06, r * 0.22, r * 0.15, 0, 0, TAU);
      ctx.fillStyle = C.COLORS.fire[2]; ctx.fill();
      for (i = 0; i < 3; i++) {
        a = (t * 0.7 + i / 3 + z.id * 0.13) % 1;
        ctx.globalAlpha = fade * Math.sin(a * Math.PI);
        ctx.beginPath(); ctx.arc(x + Math.cos(i * 2.1 + z.id) * r * 0.5, y + Math.sin(i * 2.1 + z.id) * r * 0.35 - a * 6, 2.5 + a * 2, 0, TAU);
        ctx.fillStyle = '#FFD08A'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.stroke();
      }
    } else if (z.kind === 'cloud') {
      ctx.lineWidth = 2.2;
      for (i = 0; i < 7; i++) {
        a = i / 7 * TAU + z.id + t * 0.5;
        var ox = Math.cos(a) * r * 0.5 + Math.sin(t * 1.3 + i) * 3, oy = Math.sin(a) * r * 0.38 + Math.cos(t * 1.1 + i) * 2;
        var pr = r * (0.38 + 0.05 * Math.sin(t * 2 + i * 1.7));
        ctx.globalAlpha = 0.26 * fade;
        ctx.beginPath(); ctx.arc(x + ox, y + oy, pr, 0, TAU);
        ctx.fillStyle = '#8FE06A'; ctx.fill();
        ctx.globalAlpha = 0.5 * fade; ctx.strokeStyle = '#3E9B2F'; ctx.stroke();
      }
      ctx.globalAlpha = 0.3 * fade;
      ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, TAU); ctx.fillStyle = '#B8F090'; ctx.fill();
      for (i = 0; i < 3; i++) {
        a = (t * 0.6 + i / 3 + z.id * 0.2) % 1;
        ctx.globalAlpha = fade * Math.sin(a * Math.PI) * 0.9;
        ctx.beginPath(); ctx.arc(x + Math.cos(i * 2.4 + z.id) * r * 0.4, y + r * 0.2 - a * r * 0.7, 2.5 + (i % 2), 0, TAU);
        ctx.fillStyle = C.COLORS.venom[2]; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = C.COLORS.venom[1]; ctx.stroke();
      }
    } else { // steam
      var pg = 1 - life;
      ctx.lineWidth = 2.2;
      for (i = 0; i < 6; i++) {
        a = i / 6 * TAU + z.id;
        var d = r * (0.25 + 0.55 * pg);
        ctx.globalAlpha = Math.min(0.9, life * 1.5);
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8 - pg * 12, r * (0.2 + 0.2 * pg), 0, TAU);
        ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = 'rgba(160,190,210,0.9)'; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(x, y - pg * 10, r * (0.3 + 0.25 * pg), 0, TAU);
      ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawProjectile(p, t, dt, paused) {
    var ang = Math.atan2(p.vy, p.vx), x = p.x, y = p.y, i;
    var ca = Math.cos(ang), sa = Math.sin(ang);
    var P = particles();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    switch (p.kind) {
      case 'shard':
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(0, 5); ctx.lineTo(-8, 0); ctx.lineTo(0, -5); ctx.closePath();
        ctx.fillStyle = C.COLORS.frost[0]; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = OUT; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(0, -3); ctx.lineTo(-3, 0); ctx.closePath();
        ctx.fillStyle = C.COLORS.frost[2]; ctx.fill();
        ctx.restore();
        break;
      case 'spit':
        var w = 1 + 0.18 * Math.sin(t * 22 + p.id);
        ctx.globalAlpha = 0.5; ctx.fillStyle = C.COLORS.venom[0];
        ctx.beginPath(); ctx.arc(x - ca * 9, y - sa * 9, 3, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.beginPath(); ctx.ellipse(0, 0, 7.5 * w, 6 / w, 0, 0, TAU);
        ctx.fillStyle = C.COLORS.venom[0]; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = OUT; ctx.stroke();
        ctx.beginPath(); ctx.arc(-1.5, -2, 1.9, 0, TAU); ctx.fillStyle = C.COLORS.venom[2]; ctx.fill();
        ctx.restore();
        break;
      case 'lava':
        ctx.globalAlpha = 0.28; ctx.fillStyle = '#FF7A2F';
        ctx.beginPath(); ctx.arc(x, y, 19 + 2 * Math.sin(t * 14), 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 5 + p.id);
        ctx.beginPath();
        ctx.moveTo(11, 0); ctx.lineTo(6, 9); ctx.lineTo(-4, 11); ctx.lineTo(-11, 2); ctx.lineTo(-7, -9); ctx.lineTo(4, -10); ctx.closePath();
        ctx.fillStyle = '#7A2412'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
        ctx.fillStyle = '#FF7A2F';
        ctx.fillRect(-4, -2, 7, 2.5); ctx.fillRect(0, 3, 4, 2.5);
        ctx.fillStyle = '#B73A1A'; ctx.beginPath(); ctx.arc(-4, -5, 2.4, 0, TAU); ctx.fill();
        ctx.restore();
        if (!paused && Math.random() < 14 * dt) P.spawn('ember', x, y, { n: 1 });
        break;
      case 'lance':
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, 5); ctx.lineTo(-44, 0); ctx.lineTo(-6, -5); ctx.closePath();
        ctx.fillStyle = C.COLORS.frost[0]; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = OUT; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-4, 2); ctx.lineTo(-32, 0); ctx.lineTo(-4, -2); ctx.closePath();
        ctx.fillStyle = '#FFFFFF'; ctx.fill();
        ctx.restore();
        break;
      default: // fireball
        for (i = 3; i >= 1; i--) {
          ctx.globalAlpha = 0.5 - i * 0.1;
          ctx.beginPath(); ctx.arc(x - ca * i * 7, y - sa * i * 7, 7 - i * 1.4, 0, TAU);
          ctx.fillStyle = i === 1 ? C.COLORS.fire[0] : C.COLORS.fire[1]; ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(x, y, 7.5 + 0.8 * Math.sin(t * 25 + p.id), 0, TAU);
        ctx.fillStyle = C.COLORS.fire[0]; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = OUT; ctx.stroke();
        ctx.beginPath(); ctx.arc(x + ca, y + sa, 4, 0, TAU); ctx.fillStyle = C.COLORS.fire[2]; ctx.fill();
        if (!paused && Math.random() < 18 * dt) P.spawn('ember', x - ca * 6, y - sa * 6, { n: 1 });
    }
    ctx.globalAlpha = 1;
  }

  // Placeholder dragon, used until art_dragons.js sets HH.render.artDragons.ready = true.
  function placeholderDragon(d, t) {
    var el = elementOf(d), cols = colsOf(el);
    var st = C.STAGES[d.stage || 0] || C.STAGES[0];
    var k = st.size, R = 17 * k;
    var x = d.x, y = d.y, aim = d.aim || 0;
    var bob = Math.sin(t * 3 + (d.id || 0)) * 1.2;
    var kick = d.attackT !== undefined && d.attackT < 0.15 ? 3 * (1 - d.attackT / 0.15) : 0;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // shadow
    ctx.fillStyle = 'rgba(35,25,50,0.22)'; ctx.beginPath(); ctx.ellipse(x, y + R * 0.85, R * 1.05, R * 0.4, 0, 0, TAU); ctx.fill();
    // wings
    ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.fillStyle = cols[1];
    for (var s = -1; s <= 1; s += 2) {
      ctx.beginPath(); ctx.moveTo(x + s * R * 0.5, y - R * 0.2 + bob);
      ctx.lineTo(x + s * R * 1.35, y - R * 0.95 + bob); ctx.lineTo(x + s * R * 1.1, y + R * 0.25 + bob); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    // body
    ctx.beginPath(); ctx.arc(x, y + bob, R, 0, TAU);
    ctx.fillStyle = cols[0]; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = cols[1];
    ctx.beginPath(); ctx.arc(x + R * 0.45, y + R * 0.5 + bob, R * 1.05, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y + bob, R, 0, TAU); ctx.lineWidth = 3; ctx.stroke();
    ctx.globalAlpha = 0.55; ctx.fillStyle = cols[2];
    ctx.beginPath(); ctx.ellipse(x - R * 0.4, y - R * 0.45 + bob, R * 0.25, R * 0.15, -0.6, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    // belly
    ctx.beginPath(); ctx.ellipse(x - Math.cos(aim) * R * 0.15, y + R * 0.25 + bob, R * 0.5, R * 0.4, 0, 0, TAU);
    ctx.fillStyle = cols[2]; ctx.fill();
    // head pointing at aim
    var hx = x + Math.cos(aim) * (R * 0.95 + kick), hy = y + Math.sin(aim) * (R * 0.95 + kick) + bob;
    var hr = R * 0.5;
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fillStyle = cols[0]; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
    // eyes
    var px = -Math.sin(aim), py = Math.cos(aim);
    for (var e = -1; e <= 1; e += 2) {
      var ex = hx + Math.cos(aim) * hr * 0.2 + px * hr * 0.42 * e, ey = hy + Math.sin(aim) * hr * 0.2 + py * hr * 0.42 * e;
      ctx.beginPath(); ctx.arc(ex, ey, hr * 0.32, 0, TAU); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 1.8; ctx.stroke();
      ctx.beginPath(); ctx.arc(ex + Math.cos(aim) * hr * 0.12, ey + Math.sin(aim) * hr * 0.12, hr * 0.15, 0, TAU); ctx.fillStyle = OUT; ctx.fill();
    }
    // snout nub
    ctx.beginPath(); ctx.arc(hx + Math.cos(aim) * hr * 0.9, hy + Math.sin(aim) * hr * 0.9, hr * 0.28, 0, TAU);
    ctx.fillStyle = cols[2]; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    // stage pips
    for (var i = 0; i <= (d.stage || 0); i++) {
      ctx.beginPath(); ctx.arc(x - (d.stage || 0) * 4 + i * 8, y + R + 8, 2.6, 0, TAU);
      ctx.fillStyle = C.COLORS.gold; ctx.fill(); ctx.lineWidth = 1.4; ctx.stroke();
    }
  }

  function drawDragon(d, t, selected, isGhost) {
    var art = HH.render.artDragons;
    if (isGhost) ctx.globalAlpha = 0.6;
    if (art && art.ready) {
      dragOpts.selected = !!selected; dragOpts.ghost = !!isGhost;
      art.draw(ctx, d, t, dragOpts);
    } else {
      placeholderDragon(d, t);
    }
    ctx.globalAlpha = 1;
  }

  function rangeCircle(x, y, range, bad, t) {
    ctx.beginPath(); ctx.arc(x, y, range, 0, TAU);
    ctx.fillStyle = bad ? 'rgba(229,72,59,0.2)' : 'rgba(255,255,255,0.13)'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = bad ? 'rgba(255,96,80,0.95)' : 'rgba(255,255,255,0.85)';
    ctx.setLineDash(DASH); ctx.lineDashOffset = -t * 22; ctx.stroke(); ctx.setLineDash(NODASH);
  }

  function byY(a, b) { return a.y - b.y; }

  function draw(app, dt) {
    if (!ctx || !app) return;
    dt = dt || 0;
    T += dt;
    var game = app.game;
    var P = particles();
    if (!app.paused) P.update(Math.min(dt, 0.1));

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawPanels();

    ctx.save();
    ctx.translate(0, TOP_H);
    ctx.beginPath(); ctx.rect(0, 0, MAP_W, MAP_H); ctx.clip();

    var level = game ? game.level : HH.data.levels && HH.data.levels.meadow;
    HH.render.artMap.drawBackground(ctx, level);
    if (!game) { ctx.restore(); return; }

    var i, n, e, list;
    HH.render.artMap.drawHoard(ctx, level, game.hoardMax > 0 ? game.hoard / game.hoardMax : 1, T);

    list = game.zones;
    for (i = 0, n = list.length; i < n; i++) if (list[i].active !== false) drawZone(list[i], T);

    var AE = HH.render.artEnemies;
    list = game.enemies;
    for (i = 0, n = list.length; i < n; i++) if (list[i].active !== false) AE.drawShadow(ctx, list[i]);

    drawList.length = 0;
    for (i = 0, n = list.length; i < n; i++) if (list[i].active !== false) drawList.push(list[i]);
    list = game.dragons;
    for (i = 0, n = list.length; i < n; i++) if (list[i].active !== false) drawList.push(list[i]);
    drawList.sort(byY);
    for (i = 0, n = drawList.length; i < n; i++) {
      e = drawList[i];
      if (e.instincts) drawDragon(e, T, e.id === app.selectedId, false);
      else AE.draw(ctx, e, T, true);
    }

    list = game.projectiles;
    for (i = 0, n = list.length; i < n; i++) if (list[i].active !== false) drawProjectile(list[i], T, dt, app.paused);

    P.draw(ctx, 'fx');

    // range circles
    var d, range;
    if (app.selectedId >= 0) {
      list = game.dragons;
      for (i = 0, n = list.length; i < n; i++) {
        if (list[i].id === app.selectedId && list[i].active !== false) {
          d = list[i];
          range = (d.stats && d.stats.range) || (d.def && d.def.base && d.def.base.range) || 0;
          if (range > 0) rangeCircle(d.x, d.y, range, false, T);
          ctx.beginPath(); ctx.arc(d.x, d.y, C.DRAGON_RADIUS + 3, 0, TAU);
          ctx.lineWidth = 3; ctx.strokeStyle = C.COLORS.gold; ctx.stroke();
          break;
        }
      }
    }
    if (app.placing && app.mouse && app.mouse.inMap) {
      var def = HH.data.dragons && HH.data.dragons[app.placing];
      var mx = app.mouse.x, my = app.mouse.y;
      var bad = typeof HH.sim.canPlace === 'function' ? !HH.sim.canPlace(game, mx, my) : false;
      range = def && def.base ? def.base.range : 120;
      ghost.type = app.placing; ghost.def = def || null; ghost.x = mx; ghost.y = my;
      rangeCircle(mx, my, range, bad, T);
      ctx.beginPath(); ctx.arc(mx, my, C.DRAGON_RADIUS, 0, TAU);
      ctx.lineWidth = 2.5; ctx.strokeStyle = bad ? 'rgba(255,96,80,0.95)' : 'rgba(255,255,255,0.9)'; ctx.stroke();
      drawDragon(ghost, T, false, true);
      if (bad) {
        ctx.fillStyle = 'rgba(229,72,59,0.35)'; ctx.beginPath(); ctx.arc(mx, my, C.DRAGON_RADIUS, 0, TAU); ctx.fill();
      }
    }

    P.draw(ctx, 'text');
    ctx.restore();
  }

  HH.render.init = init;
  HH.render.bind = bind;
  HH.render.draw = draw;
})(globalThis.HH);
