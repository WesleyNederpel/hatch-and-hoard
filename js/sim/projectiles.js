(function (HH) {
  'use strict';
  var S = HH.sim;

  var LANCE_SPEED = 900, HIT_PAD = 6, PIERCE_RETARGET = 80, TTL = 6;

  function blankProjectile() {
    return { id: 0, active: false, kind: '', x: 0, y: 0, vx: 0, vy: 0, speed: 0, targetId: -1, tx: 0, ty: 0, dragonId: -1,
      damage: 0, aoe: 0, pierceLeft: 0, hitIds: [], life: 0 };
  }

  function hasId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i] === id) return true;
    return false;
  }

  // Splash every active enemy within p.aoe of (x,y) except `skip`; chilling/burning/etc. come from the hit resolver.
  function splash(game, p, dragon, x, y, skip) {
    var list = game.enemies, n = list.length, r2 = p.aoe * p.aoe;
    for (var i = 0; i < n; i++) {
      var o = list[i];
      if (!o.active || o === skip) continue;
      var dx = o.x - x, dy = o.y - y;
      if (dx * dx + dy * dy <= r2) S.dragons.hitEnemy(game, dragon, o, p.damage, 'splash');
    }
  }

  function impactZones(game, dragon, x, y, enemy) {
    if (!dragon || !dragon.stats || !dragon.stats.flags) return;
    var C = HH.data.config, fl = dragon.stats.flags, ref = enemy;
    if (!fl.lavaPool && !fl.poisonCloud) return;
    var dist;
    if (ref) dist = ref.dist; else dist = S.status.nearestPathDist(game, x, y);
    if (fl.lavaPool) S.status.spawnZone(game, 'lava', x, y, dist, C.LAVA_RADIUS, C.LAVA_DUR, dragon);
    if (fl.poisonCloud) S.status.spawnZone(game, 'cloud', x, y, dist, C.CLOUD_RADIUS, C.CLOUD_DUR, dragon);
  }

  function nearestUnhit(game, p, x, y) {
    var list = game.enemies, best = null, bd = PIERCE_RETARGET * PIERCE_RETARGET;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (!o.active || hasId(p.hitIds, o.id)) continue;
      var dx = o.x - x, dy = o.y - y, d2 = dx * dx + dy * dy;
      if (d2 <= bd) { bd = d2; best = o; }
    }
    return best;
  }

  function updateLance(game, p, dragon) {
    var step = p.speed * HH.data.config.DT, x0 = p.x, y0 = p.y;
    if (step > p.life) step = p.life;
    var x1 = x0 + p.vx * step, y1 = y0 + p.vy * step;
    var sx = x1 - x0, sy = y1 - y0, sl = sx * sx + sy * sy;
    var list = game.enemies, n = list.length;
    for (var i = 0; i < n; i++) {
      var o = list[i];
      if (!o.active || hasId(p.hitIds, o.id)) continue;
      var t = sl > 0 ? ((o.x - x0) * sx + (o.y - y0) * sy) / sl : 0;
      if (t < 0) t = 0; else if (t > 1) t = 1;
      var dx = x0 + sx * t - o.x, dy = y0 + sy * t - o.y, rr = o.def.radius + HIT_PAD;
      if (dx * dx + dy * dy > rr * rr) continue;
      p.hitIds.push(o.id);
      S.dragons.hitEnemy(game, dragon, o, p.damage, 'hit');
      game.events.emit('projectileHit', { proj: p, x: o.x, y: o.y });
    }
    p.x = x1; p.y = y1;
    p.life -= step;
    if (p.life <= 1e-6) p.active = false;
  }

  function impact(game, p, dragon, target) {
    var x = target ? target.x : p.tx, y = target ? target.y : p.ty;
    p.x = x; p.y = y;
    if (target) S.dragons.hitEnemy(game, dragon, target, p.damage, 'hit');
    if (p.aoe > 0) splash(game, p, dragon, x, y, target);
    impactZones(game, dragon, x, y, target);
    game.events.emit('projectileHit', { proj: p, x: x, y: y });
    if (target) p.hitIds.push(target.id);
    if (target && p.pierceLeft > 0) {
      p.pierceLeft--;
      var nxt = nearestUnhit(game, p, x, y);
      if (nxt) { p.targetId = nxt.id; p.tx = nxt.x; p.ty = nxt.y; p.life = TTL; return; }
    }
    p.active = false;
  }

  S.projectiles = {
    fire: function (game, dragon, target) {
      var st = dragon.stats, p = game.pools.projectile.acquire(), kind = st.projectile || 'fireball';
      p.id = game.nextId++;
      p.active = true;
      p.kind = kind;
      p.dragonId = dragon.id;
      p.damage = st.damage;
      p.aoe = st.aoe || 0;
      p.pierceLeft = st.pierce || 0;
      p.hitIds.length = 0;
      p.targetId = target ? target.id : -1;
      p.tx = target ? target.x : dragon.x;
      p.ty = target ? target.y : dragon.y;
      var a = dragon.aim, off = HH.data.config.DRAGON_RADIUS * 0.6;
      p.x = dragon.x + Math.cos(a) * off;
      p.y = dragon.y + Math.sin(a) * off;
      if (kind === 'lance') {
        var dx = p.tx - p.x, dy = p.ty - p.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        p.speed = LANCE_SPEED;
        p.vx = dx / d; p.vy = dy / d;
        p.life = st.range * 1.1;
      } else {
        p.speed = st.projSpeed || HH.data.config.PROJ_SPEED;
        p.vx = 0; p.vy = 0;
        p.life = TTL;
      }
      game.projectiles.push(p);
      return p;
    },

    update: function (game) {
      var DT = HH.data.config.DT, list = game.projectiles, n = list.length;
      for (var i = 0; i < n; i++) {
        var p = list[i];
        if (!p.active) continue;
        var dragon = S.dragons.find(game, p.dragonId);
        if (p.kind === 'lance') { updateLance(game, p, dragon); continue; }
        var target = p.targetId >= 0 ? S.enemies.find(game, p.targetId) : null;
        if (target) { p.tx = target.x; p.ty = target.y; } else p.targetId = -1;
        var dx = p.tx - p.x, dy = p.ty - p.y, d = Math.sqrt(dx * dx + dy * dy), step = p.speed * DT;
        var reach = target ? target.def.radius + HIT_PAD : 0;
        p.life -= DT;
        if (d - step <= reach) { impact(game, p, dragon, target); continue; }
        p.vx = dx / d * p.speed; p.vy = dy / d * p.speed;
        p.x += dx / d * step; p.y += dy / d * step;
        if (p.life <= 0) p.active = false;
      }
    }
  };
})(globalThis.HH);
