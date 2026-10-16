(function (HH) {
  'use strict';
  // Pooled cosmetic particles. Kinds: poof, coin, spark, ember, ice, goo, text, ring.
  // draw(ctx) draws everything; draw(ctx,'fx') only non-text, draw(ctx,'text') only floating texts.
  var MAX = 900;
  var TAU = Math.PI * 2;
  var OUT = '#2B1D2E';
  var FONT = 'Trebuchet MS, Verdana, sans-serif';
  var EMPTY = {};
  var K = { poof: 1, coin: 2, spark: 3, ember: 4, ice: 5, goo: 6, text: 7, ring: 8, cone: 9 };

  var pool = [];
  var n = 0;
  var rr = 0;
  for (var i = 0; i < MAX; i++) {
    pool.push({ k: 0, x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0, life: 0, max: 1, size: 1, size2: 1,
      rot: 0, vr: 0, color: '#fff', color2: '#fff', text: '', font: '' });
  }

  function rnd() { return Math.random(); }
  function alloc() {
    if (n < MAX) return pool[n++];
    rr = (rr + 1) % MAX;
    return pool[rr];
  }
  function make(k, x, y, life) {
    var p = alloc();
    p.k = k; p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.g = 0; p.drag = 0;
    p.life = life; p.max = life; p.size = 4; p.size2 = 4; p.rot = 0; p.vr = 0;
    p.color = '#fff'; p.color2 = '#fff'; p.text = ''; p.font = '';
    return p;
  }

  function spawn(kind, x, y, o) {
    o = o || EMPTY;
    var k = K[kind];
    var cnt = o.n, i, p, a, sp;
    switch (k) {
      case 1: // poof
        cnt = cnt || 5;
        for (i = 0; i < cnt; i++) {
          p = make(1, x + (rnd() - 0.5) * 8, y + (rnd() - 0.5) * 8, 0.35 + rnd() * 0.3);
          a = rnd() * TAU; sp = 18 + rnd() * 45;
          p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 12; p.drag = 3;
          p.size = (o.size || 6) * (0.7 + rnd() * 0.6); p.size2 = p.size * 1.9;
          p.color = o.color || '#FFFFFF';
        }
        break;
      case 2: // coin
        cnt = cnt || 1;
        for (i = 0; i < cnt; i++) {
          p = make(2, x, y, o.life || 0.85);
          p.vx = o.vx !== undefined ? o.vx + (rnd() - 0.5) * 30 : (rnd() - 0.5) * 100;
          p.vy = o.vy !== undefined ? o.vy : -(170 + rnd() * 90);
          p.g = 720; p.size = o.size || 6; p.rot = rnd() * TAU; p.vr = 9 + rnd() * 10;
        }
        break;
      case 3: // spark
        cnt = cnt || 3;
        for (i = 0; i < cnt; i++) {
          p = make(3, x, y, 0.2 + rnd() * 0.15);
          a = rnd() * TAU; sp = 90 + rnd() * 130;
          p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.drag = 4;
          p.size = 2 + rnd() * 1.8; p.color = o.color || '#FFE9A0'; p.color2 = '#FFFFFF';
        }
        break;
      case 4: // ember
        cnt = cnt || 3;
        for (i = 0; i < cnt; i++) {
          p = make(4, x + (rnd() - 0.5) * 8, y + (rnd() - 0.5) * 6, 0.5 + rnd() * 0.45);
          p.vx = (rnd() - 0.5) * 50; p.vy = -(25 + rnd() * 60); p.g = -15;
          p.size = 2.5 + rnd() * 2.5; p.color = o.color || '#FF7A2F'; p.color2 = '#FFD08A';
        }
        break;
      case 5: // ice shards
        cnt = cnt || 4;
        for (i = 0; i < cnt; i++) {
          p = make(5, x, y, 0.5 + rnd() * 0.3);
          a = rnd() * TAU; sp = 60 + rnd() * 90;
          p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 40; p.g = 260;
          p.size = (o.size || 4.5) * (0.8 + rnd() * 0.5); p.rot = rnd() * TAU; p.vr = (rnd() - 0.5) * 12;
          p.color = o.color || '#BFF3FF';
        }
        break;
      case 6: // goo
        cnt = cnt || 4;
        for (i = 0; i < cnt; i++) {
          p = make(6, x, y, 0.45 + rnd() * 0.3);
          a = -Math.PI / 2 + (rnd() - 0.5) * 2.6; sp = 50 + rnd() * 90;
          p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.g = 520;
          p.size = 2.5 + rnd() * 2.5; p.color = o.color || '#7ED957'; p.color2 = '#D4F7B0';
        }
        break;
      case 7: // floating text
        p = make(7, x, y, o.life || 1.0);
        p.vx = o.vx || 0; p.vy = o.vy !== undefined ? o.vy : -42; p.drag = 0.6;
        p.size = o.size || 17; p.color = o.color || '#FFC83D'; p.text = String(o.text === undefined ? '' : o.text);
        p.font = 'bold ' + p.size + 'px ' + FONT;
        break;
      case 8: // ring
        p = make(8, x, y, o.life || 0.5);
        p.size = o.r0 || 6; p.size2 = o.r1 || 42; p.color = o.color || '#FFFFFF';
        p.rot = o.width || 4;
        break;
      case 9: // cone flash: o.angle (rad), o.len (px), o.half (rad, default 30deg)
        p = make(9, x, y, o.life || 0.28);
        p.rot = o.angle || 0; p.size2 = o.len || 100; p.size = o.half || Math.PI / 6;
        p.color = o.color || '#FF7A2F'; p.color2 = '#FFD08A';
        break;
    }
  }

  function update(dt) {
    var i = 0, p, d;
    while (i < n) {
      p = pool[i];
      p.life -= dt;
      if (p.life <= 0) {
        n--;
        pool[i] = pool[n];
        pool[n] = p;
        continue;
      }
      if (p.drag) { d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; }
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      i++;
    }
  }

  function diamond(ctx, x, y, r, rot) {
    var c = Math.cos(rot), s = Math.sin(rot);
    ctx.beginPath();
    ctx.moveTo(x + c * r * 1.5, y + s * r * 1.5);
    ctx.lineTo(x - s * r * 0.8, y + c * r * 0.8);
    ctx.lineTo(x - c * r * 1.2, y - s * r * 1.2);
    ctx.lineTo(x + s * r * 0.8, y - c * r * 0.8);
    ctx.closePath();
  }

  function draw(ctx, pass) {
    var fx = pass !== 'text', tx = pass !== 'fx';
    var i, p, t, a, r;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (i = 0; i < n; i++) {
      p = pool[i];
      t = 1 - p.life / p.max; // 0..1 progress
      if (p.k === 7) {
        if (!tx) continue;
        a = Math.min(1, p.life / 0.3);
        r = t < 0.12 ? 0.6 + t / 0.12 * 0.6 : (t < 0.25 ? 1.2 - (t - 0.12) / 0.13 * 0.2 : 1);
        ctx.globalAlpha = a;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.scale(r, r);
        ctx.font = p.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4.5; ctx.strokeStyle = OUT; ctx.strokeText(p.text, 0, 0);
        ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0);
        ctx.restore();
        continue;
      }
      if (!fx) continue;
      switch (p.k) {
        case 1: // poof
          r = p.size + (p.size2 - p.size) * t;
          ctx.globalAlpha = Math.min(1, p.life / p.max * 1.6);
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU);
          ctx.fillStyle = p.color; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
          ctx.globalAlpha = ctx.globalAlpha * 0.5;
          ctx.fillStyle = '#C9D6E4';
          ctx.beginPath(); ctx.arc(p.x + r * 0.25, p.y + r * 0.3, r * 0.55, 0.2, 2.2); ctx.fill();
          break;
        case 2: // coin
          a = Math.cos(p.rot);
          r = p.size;
          ctx.globalAlpha = Math.min(1, p.life / 0.2);
          ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(1.2, Math.abs(a) * r), r, 0, 0, TAU);
          ctx.fillStyle = '#FFC83D'; ctx.fill();
          ctx.lineWidth = 1.8; ctx.strokeStyle = OUT; ctx.stroke();
          if (Math.abs(a) > 0.4) {
            ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.abs(a) * r * 0.55, r * 0.55, 0, 0, TAU);
            ctx.lineWidth = 1.2; ctx.strokeStyle = '#C98A12'; ctx.stroke();
          }
          break;
        case 3: // spark
          ctx.globalAlpha = Math.min(1, p.life / p.max * 2);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045);
          ctx.lineWidth = p.size; ctx.strokeStyle = p.color; ctx.stroke();
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.6, 0, TAU); ctx.fillStyle = p.color2; ctx.fill();
          break;
        case 4: // ember
          ctx.globalAlpha = Math.min(1, p.life / p.max * 1.8);
          r = p.size * (1 - t * 0.6);
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fillStyle = p.color; ctx.fill();
          ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.5, 0, TAU); ctx.fillStyle = p.color2; ctx.fill();
          break;
        case 5: // ice
          ctx.globalAlpha = Math.min(1, p.life / p.max * 2);
          diamond(ctx, p.x, p.y, p.size, p.rot);
          ctx.fillStyle = p.color; ctx.fill();
          ctx.lineWidth = 1.6; ctx.strokeStyle = '#2A9CC4'; ctx.stroke();
          break;
        case 6: // goo
          ctx.globalAlpha = Math.min(1, p.life / p.max * 2);
          r = p.size * (1 - t * 0.3);
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU);
          ctx.fillStyle = p.color; ctx.fill();
          ctx.lineWidth = 1.6; ctx.strokeStyle = '#3E9B2F'; ctx.stroke();
          ctx.beginPath(); ctx.arc(p.x - r * 0.3, p.y - r * 0.3, r * 0.3, 0, TAU); ctx.fillStyle = p.color2; ctx.fill();
          break;
        case 9: // cone flash
          a = 1 - t;
          r = p.size2 * (0.55 + 0.45 * Math.min(1, t * 4));
          ctx.globalAlpha = a * 0.75;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, r, p.rot - p.size, p.rot + p.size); ctx.closePath();
          ctx.fillStyle = p.color; ctx.fill();
          ctx.globalAlpha = a;
          ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
          ctx.globalAlpha = a * 0.8;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, r * 0.65, p.rot - p.size * 0.6, p.rot + p.size * 0.6); ctx.closePath();
          ctx.fillStyle = p.color2; ctx.fill();
          break;
        case 8: // ring
          a = 1 - (1 - t) * (1 - t); // ease out
          r = p.size + (p.size2 - p.size) * a;
          ctx.globalAlpha = 1 - t;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU);
          ctx.lineWidth = p.rot * (1 - t) + 1; ctx.strokeStyle = p.color; ctx.stroke();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  function clear() { n = 0; }
  function count() { return n; }

  HH.render.particles = { spawn: spawn, update: update, draw: draw, clear: clear, count: count };
})(globalThis.HH);
