(function (HH) {
  'use strict';
  // Comic human soldiers drawn in code. Local space: facing +x, feet at y=+11, head top about y=-20.
  var C = HH.data.config;
  var OUT = C.COLORS.outline;
  var TAU = Math.PI * 2;
  var SKIN = '#F7CBA1', SKIN_SH = '#E2A57C';

  var tintCache = {};
  function tint(hex, amt) { // amt<0 darken (toward outline purple), amt>0 lighten
    var key = hex + amt;
    var v = tintCache[key];
    if (v) return v;
    var r, g, b;
    if (hex.charAt(0) === 'r') { // already an rgb(...) string from an earlier tint
      var m = hex.match(/\d+/g);
      r = +m[0]; g = +m[1]; b = +m[2];
    } else {
      var n = parseInt(hex.slice(1), 16);
      r = n >> 16; g = (n >> 8) & 255; b = n & 255;
    }
    var tr = amt < 0 ? 43 : 255, tg = amt < 0 ? 29 : 255, tb = amt < 0 ? 46 : 255;
    var a = Math.abs(amt);
    r = Math.round(r + (tr - r) * a); g = Math.round(g + (tg - g) * a); b = Math.round(b + (tb - b) * a);
    v = tintCache[key] = 'rgb(' + r + ',' + g + ',' + b + ')';
    return v;
  }

  function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); }
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }
  // Fill the current path flat + one shade (right/bottom) + one highlight, then outline. bx,by,bw,bh = bounds.
  function paint(c, fill, bx, by, bw, bh) {
    c.fillStyle = fill; c.fill();
    c.save(); c.clip();
    c.fillStyle = tint(fill, -0.22);
    c.fillRect(bx + bw * 0.64, by, bw, bh);
    c.fillRect(bx, by + bh * 0.76, bw, bh);
    c.restore();
    c.stroke();
    // highlight drawn last (a new path would otherwise replace the outline path)
    var ga = c.globalAlpha;
    c.globalAlpha = ga * 0.6; c.fillStyle = tint(fill, 0.6);
    c.beginPath(); c.ellipse(bx + bw * 0.3, by + bh * 0.26, Math.max(1.2, bw * 0.12), Math.max(1, bh * 0.08), -0.5, 0, TAU); c.fill();
    c.globalAlpha = ga;
  }
  function stick(c, x1, y1, x2, y2, w, col) { // outlined pole
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.lineWidth = w + 3; c.strokeStyle = OUT; c.stroke();
    c.lineWidth = w; c.strokeStyle = col; c.stroke();
    c.strokeStyle = OUT;
  }
  function hand(c, x, y) {
    c.beginPath(); c.arc(x, y, 3.3, 0, TAU); paint(c, SKIN, x - 3.3, y - 3.3, 6.6, 6.6);
  }
  function boots(c, phase, col) {
    var a = Math.max(0, Math.sin(phase)) * 3, b = Math.max(0, -Math.sin(phase)) * 3;
    ell(c, -3.5, 10.5 - a, 4.2, 2.8); paint(c, col, -7.7, 7.7 - a, 8.4, 5.6);
    ell(c, 4.5, 10.5 - b, 4.2, 2.8); paint(c, col, 0.3, 7.7 - b, 8.4, 5.6);
  }
  function eye(c, x, y, r) {
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = '#FFFFFF'; c.fill();
    c.lineWidth = 1.7; c.stroke();
    c.beginPath(); c.arc(x + r * 0.35, y + r * 0.1, r * 0.52, 0, TAU); c.fillStyle = OUT; c.fill();
    c.beginPath(); c.arc(x + r * 0.55, y - r * 0.2, r * 0.2, 0, TAU); c.fillStyle = '#FFFFFF'; c.fill();
  }
  // Face (under a big helmet). Center (hx,hy), eyes peek out beneath the brim.
  function face(c, hx, hy, scared) {
    c.beginPath(); c.arc(hx, hy, 8.2, 0, TAU); paint(c, SKIN, hx - 8.2, hy - 8.2, 16.4, 16.4);
    eye(c, hx - 2.6, hy - 0.5, 3.3);
    eye(c, hx + 4.6, hy - 0.5, 3.3);
    c.lineWidth = 1.8;
    c.beginPath();
    if (scared) { c.arc(hx + 1.5, hy + 5.6, 2, 0, TAU); }
    else { c.moveTo(hx - 1, hy + 4.6); c.quadraticCurveTo(hx + 2, hy + 7, hx + 5, hy + 4.4); }
    c.stroke();
  }

  // ---------- types ----------
  function peasant(c, col, ph, hurt) {
    var body = col.body, helm = col.helmet, trim = col.trim;
    // pitchfork behind the body
    stick(c, 9, 12, 13, -15, 2.6, trim);
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(8, -17); c.lineTo(8, -23); c.moveTo(13, -16); c.lineTo(13, -25); c.moveTo(18, -17); c.lineTo(18, -23);
    c.moveTo(7.5, -17); c.lineTo(18.5, -17);
    c.lineWidth = 5.5; c.strokeStyle = OUT; c.stroke();
    c.lineWidth = 2.4; c.strokeStyle = '#C8CFD6'; c.stroke();
    c.strokeStyle = OUT;
    boots(c, ph, tint(trim, -0.15));
    // torso (straw tunic) + rope belt
    rr(c, -7.5, 1, 15, 11, 4); paint(c, body, -7.5, 1, 15, 11);
    rr(c, -7.5, 6, 15, 2.8, 1); c.fillStyle = trim; c.fill(); c.lineWidth = 1.6; c.stroke(); c.lineWidth = 2.6;
    hand(c, 9, 5);
    // face + pot helmet with straw sticking out
    face(c, 1, -5, hurt);
    c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-3, -17); c.lineTo(-5, -22); c.moveTo(1, -18.5); c.lineTo(1, -24); c.moveTo(5, -17); c.lineTo(8, -21);
    c.strokeStyle = OUT; c.lineWidth = 5; c.stroke(); c.strokeStyle = body; c.lineWidth = 2; c.stroke();
    c.strokeStyle = OUT; c.lineWidth = 2.6;
    c.beginPath(); c.arc(1, -8, 10.8, Math.PI, TAU); c.closePath(); paint(c, helm, -9.8, -18.8, 21.6, 10.8);
    rr(c, -11.5, -9.8, 25, 4, 2); paint(c, tint(helm, -0.08), -11.5, -9.8, 25, 4);
    c.beginPath(); c.arc(1, -14, 1.5, 0, TAU); c.fillStyle = tint(helm, -0.35); c.fill(); c.lineWidth = 1.4; c.stroke(); c.lineWidth = 2.6;
  }

  function scout(c, col, ph, hurt) {
    var body = col.body, helm = col.helmet, pony = col.trim;
    var la = Math.sin(ph) * 3.2, lb = Math.sin(ph + 1.6) * 3.2;
    // far legs
    rr(c, -11 + lb, 8, 4.4, 5, 2); paint(c, tint(pony, -0.2), -11 + lb, 8, 4.4, 5);
    rr(c, 8 - la, 8, 4.4, 5, 2); paint(c, tint(pony, -0.2), 8 - la, 8, 4.4, 5);
    // tail
    c.beginPath(); c.moveTo(-13, 3); c.quadraticCurveTo(-23, 0 + la * 0.4, -21, 10); c.quadraticCurveTo(-17, 6, -12, 8); c.closePath();
    paint(c, '#3B2A1E', -23, 0, 11, 10);
    // pony body
    ell(c, 0, 5.5, 15.5, 7.8); paint(c, pony, -15.5, -2.3, 31, 15.6);
    // saddle blanket
    rr(c, -5, -1.5, 10, 8, 3); paint(c, '#C94A3F', -5, -1.5, 10, 8);
    // near legs
    rr(c, -8 - lb, 9, 4.6, 5, 2); paint(c, pony, -8 - lb, 9, 4.6, 5);
    rr(c, 11 + la, 9, 4.6, 5, 2); paint(c, pony, 11 + la, 9, 4.6, 5);
    // pony head
    c.save(); c.translate(15, -1); c.rotate(-0.45);
    ell(c, 4, 0, 8, 5.2); paint(c, pony, -4, -5.2, 16, 10.4);
    ell(c, 10, 1.2, 2.8, 2.4); c.fillStyle = tint(pony, 0.35); c.fill(); c.lineWidth = 1.8; c.stroke(); c.lineWidth = 2.6;
    // ear
    c.beginPath(); c.moveTo(-1, -4.5); c.lineTo(-1.5, -10); c.lineTo(3.5, -5); c.closePath(); paint(c, pony, -2, -10, 6, 6);
    c.restore();
    eye(c, 19, -3, 2.4);
    // mane
    c.beginPath(); c.moveTo(9, -5); c.quadraticCurveTo(5, -9, 1, -3); c.lineWidth = 4.5; c.strokeStyle = '#3B2A1E'; c.stroke();
    c.lineWidth = 2.6; c.strokeStyle = OUT;
    // rider
    c.save(); c.translate(0, -6); c.scale(0.9, 0.9);
    rr(c, -6.5, 0, 13, 10, 4); paint(c, body, -6.5, 0, 13, 10);
    rr(c, -6.5, 5, 13, 2.6, 1); c.fillStyle = '#F0D060'; c.fill(); c.lineWidth = 1.5; c.stroke(); c.lineWidth = 2.6;
    hand(c, 8, 3);
    face(c, 1, -7, hurt);
    // feather
    c.beginPath(); c.moveTo(-5, -20); c.quadraticCurveTo(-16, -22, -17, -12); c.quadraticCurveTo(-10, -15, -4, -15); c.closePath();
    paint(c, '#E2563F', -17, -22, 13, 10);
    c.beginPath(); c.arc(1, -10, 10.5, Math.PI, TAU); c.closePath(); paint(c, helm, -9.5, -20.5, 21, 10.5);
    // peak
    c.beginPath(); c.moveTo(8, -11.5); c.lineTo(15, -10.5); c.lineTo(8, -8); c.closePath(); paint(c, tint(helm, -0.12), 8, -11.5, 7, 3.5);
    rr(c, -11, -11.8, 22, 3.8, 1.9); paint(c, tint(helm, -0.08), -11, -11.8, 22, 3.8);
    c.restore();
  }

  function militia(c, col, ph, hurt) {
    var body = col.body, helm = col.helmet, trim = col.trim;
    // spear behind
    stick(c, -7, 14, 15, -20, 2.6, '#8B5A2B');
    c.beginPath(); c.moveTo(13.5, -17); c.lineTo(15.5, -29); c.lineTo(18.8, -17); c.closePath();
    paint(c, '#D5DCE3', 13.5, -29, 5.3, 12);
    boots(c, ph, '#5A3B24');
    rr(c, -8, 1, 16, 11, 4); paint(c, body, -8, 1, 16, 11);
    // tabard stripe
    rr(c, -2.4, 1.5, 4.8, 10, 1.5); c.fillStyle = trim; c.fill(); c.lineWidth = 1.6; c.stroke(); c.lineWidth = 2.6;
    hand(c, 9, 3);
    face(c, 1, -5, hurt);
    // tall conical helmet
    c.beginPath(); c.moveTo(-10.5, -8.5); c.quadraticCurveTo(-9, -21, 2, -27); c.quadraticCurveTo(11, -21, 12.5, -8.5); c.closePath();
    paint(c, helm, -10.5, -27, 23, 18.5);
    rr(c, -12, -10.8, 26, 4.2, 2.1); paint(c, trim, -12, -10.8, 26, 4.2);
    // nasal guard
    c.beginPath(); c.moveTo(1.5, -6.6); c.lineTo(1.5, -1.5); c.lineWidth = 3; c.stroke(); c.lineWidth = 2.6;
    // pompom
    c.beginPath(); c.arc(2, -28, 2.6, 0, TAU); paint(c, '#E2563F', -0.6, -30.6, 5.2, 5.2);
  }

  function shieldbearer(c, col, ph, hurt) {
    var body = col.body, helm = col.helmet, trim = col.trim;
    boots(c, ph, '#4A3A30');
    rr(c, -9.5, 0.5, 19, 12, 4); paint(c, body, -9.5, 0.5, 19, 12);
    rr(c, -9.5, 7, 19, 2.8, 1); c.fillStyle = trim; c.fill(); c.lineWidth = 1.6; c.stroke(); c.lineWidth = 2.6;
    face(c, 0, -5, hurt);
    // crest tuft
    c.fillStyle = trim;
    c.lineWidth = 5; c.strokeStyle = OUT;
    var i, cx, cy;
    for (i = 0; i < 3; i++) { cx = -5 + i * 5.5; cy = -19.5 - (i === 1 ? 2 : 0); c.beginPath(); c.arc(cx, cy, 3.6, 0, TAU); c.stroke(); }
    for (i = 0; i < 3; i++) { cx = -5 + i * 5.5; cy = -19.5 - (i === 1 ? 2 : 0); c.beginPath(); c.arc(cx, cy, 3.6, 0, TAU); c.fill(); }
    c.lineWidth = 2.6; c.strokeStyle = OUT;
    // big helmet with cheek guards
    rr(c, -11.5, -9, 5.5, 11, 2); paint(c, tint(helm, -0.1), -11.5, -9, 5.5, 11);
    rr(c, 6, -9, 5.5, 11, 2); paint(c, tint(helm, -0.1), 6, -9, 5.5, 11);
    c.beginPath(); c.arc(0, -8, 11.8, Math.PI, TAU); c.closePath(); paint(c, helm, -11.8, -19.8, 23.6, 11.8);
    rr(c, -13, -10.6, 26, 4.2, 2.1); paint(c, tint(helm, -0.08), -13, -10.6, 26, 4.2);
    // big kite shield in front
    c.beginPath();
    c.moveTo(3, -9); c.lineTo(19, -9); c.lineTo(19, 3); c.quadraticCurveTo(19, 13, 11, 18); c.quadraticCurveTo(3, 13, 3, 3); c.closePath();
    paint(c, trim, 3, -9, 16, 27);
    c.beginPath();
    c.moveTo(6.5, -5.5); c.lineTo(15.5, -5.5); c.lineTo(15.5, 3); c.quadraticCurveTo(15.5, 10.5, 11, 14); c.quadraticCurveTo(6.5, 10.5, 6.5, 3); c.closePath();
    c.fillStyle = body; c.fill(); c.lineWidth = 1.8; c.stroke(); c.lineWidth = 2.6;
    c.beginPath(); c.arc(11, 2.5, 3.2, 0, TAU); paint(c, '#E8EDF2', 7.8, -0.7, 6.4, 6.4);
  }

  var DRAW = { peasant: peasant, scout: scout, militia: militia, shieldbearer: shieldbearer };
  var TOP = { peasant: 25, scout: 28, militia: 31, shieldbearer: 24 };   // local head top (for HP bar)
  var SIZE = { peasant: 1.15, scout: 1.0, militia: 1.12, shieldbearer: 1.12 };
  var WIDE = { peasant: 1, scout: 1.45, militia: 1, shieldbearer: 1.1 };

  // ---------- status visuals ----------
  function flame(c, x, y, h, w) {
    c.beginPath();
    c.moveTo(x, y - h);
    c.quadraticCurveTo(x + w * 1.1, y - h * 0.3, x + w * 0.6, y);
    c.quadraticCurveTo(x, y + h * 0.18, x - w * 0.6, y);
    c.quadraticCurveTo(x - w * 1.1, y - h * 0.3, x, y - h);
    c.closePath();
    c.fillStyle = C.COLORS.fire[0]; c.fill(); c.lineWidth = 1.8; c.strokeStyle = OUT; c.stroke();
    c.beginPath();
    c.moveTo(x, y - h * 0.55); c.quadraticCurveTo(x + w * 0.5, y - h * 0.15, x, y - 1); c.quadraticCurveTo(x - w * 0.5, y - h * 0.15, x, y - h * 0.55);
    c.fillStyle = C.COLORS.fire[2]; c.fill();
  }
  function diamond(c, x, y, r) {
    c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 0.6, y); c.lineTo(x, y + r); c.lineTo(x - r * 0.6, y); c.closePath();
  }

  function drawShadow(ctx, e) {
    var def = e.def;
    var s = def.radius / 10 * (SIZE[e.type] || 1.1);
    var w = (WIDE[e.type] || 1) * s;
    var x = e.x, y = e.y + 11 * s;
    ctx.fillStyle = 'rgba(35,25,50,0.16)'; ell(ctx, x, y, 14 * w, 5.8 * s); ctx.fill();
    ctx.fillStyle = 'rgba(35,25,50,0.2)'; ell(ctx, x, y, 10.5 * w, 4.2 * s); ctx.fill();
  }

  function draw(ctx, e, t, noShadow) {
    var def = e.def;
    if (!def) return;
    var type = e.type || def.id;
    var fn = DRAW[type] || peasant;
    var st = e.status || null;
    var frozen = !!(st && st.freeze), chilled = !!(st && st.chill && !frozen);
    var burning = !!(st && st.burn), poisoned = !!(st && st.poison);
    var blight = !!(st && st.blight) || (burning && poisoned);
    var s = def.radius / 10 * (SIZE[type] || 1.1);
    var wide = WIDE[type] || 1;
    var dir = Math.cos(e.angle || 0) < -0.01 ? -1 : 1;
    var id = e.id || 0;

    if (!noShadow) drawShadow(ctx, e);

    // animation
    var spd = type === 'scout' ? 17 : 9.5;
    var ph = frozen ? 0 : t * spd * (chilled ? 0.65 : 1) + id * 1.7;
    var bob = frozen ? 0 : Math.abs(Math.sin(ph)) * 2.4 * s * (type === 'scout' ? 0.8 : 1);
    var rot = 0, sx = 1, sy = 1;
    var hit = e.hitT;
    var hurt = false;
    if (hit !== undefined && hit < 0.25) {
      var p = 1 - hit / 0.25;
      rot = Math.sin(hit * 48) * 0.3 * p;
      sx = 1 + 0.22 * p * Math.cos(hit * 40);
      sy = 2 - sx;
      hurt = p > 0.3;
    }

    var cx = e.x, cy = e.y - 2 * s;
    // blight glow behind
    if (blight) {
      var pulse = 0.5 + 0.5 * Math.sin(t * 6 + id);
      ctx.fillStyle = 'rgba(140,60,200,' + (0.2 + 0.1 * pulse).toFixed(3) + ')';
      ell(ctx, cx, cy, 24 * s * wide, 22 * s); ctx.fill();
      ctx.fillStyle = 'rgba(190,100,235,' + (0.16 + 0.1 * pulse).toFixed(3) + ')';
      ell(ctx, cx, cy, 16 * s * wide, 15 * s); ctx.fill();
    }

    ctx.save();
    ctx.translate(e.x, e.y + 11 * s - bob);
    ctx.rotate(rot);
    ctx.scale(dir * sx * s, sy * s);
    ctx.translate(0, -11);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = 2.6; ctx.strokeStyle = OUT;
    fn(ctx, def.colors, ph, hurt);
    ctx.restore();

    // chill: icy tint + frost specks
    if (chilled) {
      ctx.fillStyle = 'rgba(111,227,255,0.3)';
      ell(ctx, cx, cy, 14 * s * wide, 17.5 * s); ctx.fill();
      ctx.fillStyle = C.COLORS.frost[2]; ctx.strokeStyle = C.COLORS.frost[1]; ctx.lineWidth = 1.2;
      for (var i = 0; i < 4; i++) {
        var a = t * 1.4 + i * 1.57 + id;
        diamond(ctx, cx + Math.cos(a) * 13 * s * wide, cy + Math.sin(a) * 15 * s, 2.6);
        ctx.fill(); ctx.stroke();
      }
    }
    // frozen: ice block
    if (frozen) {
      var bw = 17 * s * wide, bh = 21 * s;
      ctx.fillStyle = 'rgba(150,226,255,0.52)';
      rr(ctx, cx - bw, cy - bh, bw * 2, bh * 2, 7); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.lineWidth = 1.4; ctx.strokeStyle = C.COLORS.frost[2];
      rr(ctx, cx - bw + 2.5, cy - bh + 2.5, bw * 2 - 5, bh * 2 - 5, 5); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.moveTo(cx - bw * 0.62, cy - bh * 0.55); ctx.lineTo(cx - bw * 0.3, cy - bh * 0.75); ctx.lineTo(cx - bw * 0.5, cy - bh * 0.2); ctx.closePath(); ctx.fill();
      ctx.fillRect(cx + bw * 0.35, cy + bh * 0.15, 3, bh * 0.45);
      // ice crystals on top
      ctx.fillStyle = C.COLORS.frost[0]; ctx.lineWidth = 2; ctx.strokeStyle = OUT;
      diamond(ctx, cx - bw * 0.5, cy - bh - 3, 6); ctx.fill(); ctx.stroke();
      diamond(ctx, cx + bw * 0.45, cy - bh - 1, 5); ctx.fill(); ctx.stroke();
    }
    // burn: little flames
    if (burning) {
      for (var f = 0; f < 3; f++) {
        var fh = (7 + 3 * Math.sin(t * 15 + f * 2.3 + id)) * s;
        flame(ctx, cx + (f - 1) * 8.5 * s * wide, cy - 11 * s - Math.abs(f - 1) * -2 * s - 4 * Math.abs(f - 1), fh, 4.4 * s);
      }
    }
    // poison: rising green bubbles
    if (poisoned) {
      ctx.lineWidth = 1.5; ctx.strokeStyle = C.COLORS.venom[1];
      for (var b = 0; b < 3; b++) {
        var pr = (t * 0.9 + b / 3 + id * 0.17) % 1;
        var bx = cx + (b - 1) * 7.5 * s * wide + Math.sin(pr * 9 + b) * 2;
        var by = cy + 8 * s - pr * 30 * s;
        var br = (2.2 + 1.6 * (1 - Math.abs(pr - 0.4))) * (b === 1 ? 1.2 : 1);
        ctx.globalAlpha = Math.min(1, (1 - pr) * 1.6);
        ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU);
        ctx.fillStyle = C.COLORS.venom[0]; ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.COLORS.venom[2];
        ctx.beginPath(); ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.28, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // HP bar + armor icon
    if (e.hp < e.maxHp && e.maxHp > 0) {
      var frac = Math.max(0, e.hp / e.maxHp);
      var bwid = 26, hx = e.x - bwid / 2, hy = e.y - TOP[type] * s - bob - 5;
      ctx.lineWidth = 2; ctx.strokeStyle = OUT;
      rr(ctx, hx, hy, bwid, 6, 3); ctx.fillStyle = '#3A2A33'; ctx.fill();
      if (frac > 0) {
        ctx.fillStyle = frac > 0.5 ? '#6BD45A' : (frac > 0.25 ? '#F2C230' : '#E5483B');
        rr(ctx, hx + 0.5, hy + 0.5, Math.max(4, (bwid - 1) * frac), 5, 2.5); ctx.fill();
      }
      rr(ctx, hx, hy, bwid, 6, 3); ctx.stroke();
    }
    if (e.armor > 0) {
      var ay = e.y - TOP[type] * s - bob - 2, ax = e.x + (e.hp < e.maxHp ? -22 : 0);
      ctx.beginPath();
      ctx.moveTo(ax - 5.5, ay - 6); ctx.lineTo(ax + 5.5, ay - 6); ctx.lineTo(ax + 5.5, ay + 0.5);
      ctx.quadraticCurveTo(ax + 5, ay + 6, ax, ay + 8); ctx.quadraticCurveTo(ax - 5, ay + 6, ax - 5.5, ay + 0.5); ctx.closePath();
      ctx.fillStyle = '#B8C4D0'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.fillStyle = '#F2F6FA'; ctx.fillRect(ax - 3.4, ay - 4, 2.4, 6);
    }
  }

  HH.render.artEnemies = { draw: draw, drawShadow: drawShadow };
})(globalThis.HH);
