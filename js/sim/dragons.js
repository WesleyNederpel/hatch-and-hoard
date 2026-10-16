(function (HH) {
  'use strict';
  var S = HH.sim;

  var MAP_W = 1040, MAP_H = 672;
  var MODES = { first: 1, last: 1, strong: 1, close: 1 };

  function pickTarget(game, d) {
    var list = game.enemies, n = list.length, mode = d.targeting, range = d.stats.range, best = null, bv = 0;
    for (var i = 0; i < n; i++) {
      var e = list[i];
      if (!e.active) continue;
      var dx = e.x - d.x, dy = e.y - d.y, rr = range + e.def.radius;
      var d2 = dx * dx + dy * dy;
      if (d2 > rr * rr) continue;
      var v;
      if (mode === 'last') v = -e.dist;
      else if (mode === 'strong') v = e.hp;
      else if (mode === 'close') v = -d2;
      else v = e.dist; // first
      if (best === null || v > bv) { best = e; bv = v; }
    }
    return best;
  }

  function coneAttack(game, d) {
    var C = HH.data.config, st = d.stats, half = (C.CONE_ANGLE * Math.PI / 180) / 2, list = game.enemies, n = list.length;
    var hits = [];
    for (var i = 0; i < n; i++) {
      var e = list[i];
      if (!e.active) continue;
      var dx = e.x - d.x, dy = e.y - d.y, rr = st.range + e.def.radius;
      var d2 = dx * dx + dy * dy;
      if (d2 > rr * rr) continue;
      if (d2 > 1) {
        var da = Math.atan2(dy, dx) - d.aim;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        if (Math.abs(da) > half) continue;
      }
      hits.push(e);
    }
    for (var k = 0; k < hits.length; k++) D.hitEnemy(game, d, hits[k], st.damage, 'hit');
  }

  var D = S.dragons = {
    canPlace: function (game, x, y) {
      var C = HH.data.config, R = C.DRAGON_RADIUS, lv = game.level;
      if (!(x >= R && x <= MAP_W - R && y >= R && y <= MAP_H - R)) return false;
      if (game.path.distTo(x, y) < lv.pathWidth / 2 + R - 4) return false;
      var hx = x - lv.hoard.x, hy = y - lv.hoard.y;
      if (Math.sqrt(hx * hx + hy * hy) < C.HOARD_CLEAR_RADIUS) return false;
      var list = game.dragons, min2 = 4 * R * R;
      for (var i = 0; i < list.length; i++) {
        var o = list[i];
        if (!o.active) continue;
        var dx = o.x - x, dy = o.y - y;
        if (dx * dx + dy * dy < min2) return false;
      }
      return true;
    },

    place: function (game, type, x, y) {
      var def = HH.data.dragons[type];
      if (!def || game.level.dragons.indexOf(type) < 0) return null;
      if (!D.canPlace(game, x, y)) return null;
      if (!S.economy.spend(game, def.cost)) return null;
      var d = { id: game.nextId++, active: true, type: type, def: def, x: x, y: y, stage: 0, xp: 0, form: null, instincts: [],
        targeting: 'first', cooldown: 0.3, attackCount: 0, targetId: -1, aim: 0, attackT: 99, stats: null,
        hatchCost: def.cost, fedThisWave: 0, fedTotal: 0, damageDealt: 0, kills: 0, rerollsUsed: 0 };
      d.stats = S.growth.computeStats(d);
      game.dragons.push(d);
      game.events.emit('dragonPlaced', { dragon: d });
      return d;
    },

    sell: function (game, id) {
      var d = D.find(game, id);
      if (!d) return 0;
      var refund = S.economy.sellValue(game, d);
      S.economy.addGold(game, refund, 'sell');
      var pc = game.pendingChoices, w = 0;
      for (var i = 0; i < pc.length; i++) if (pc[i].dragonId !== id) pc[w++] = pc[i];
      pc.length = w;
      d.active = false;
      game.events.emit('dragonSold', { dragon: d, refund: refund });
      return refund;
    },

    setTargeting: function (game, id, mode) {
      var d = D.find(game, id);
      if (d && MODES[mode]) d.targeting = mode;
    },

    find: function (game, id) {
      var list = game.dragons;
      for (var i = 0; i < list.length; i++) if (list[i].id === id && list[i].active) return list[i];
      return null;
    },

    at: function (game, x, y) {
      var R = HH.data.config.DRAGON_RADIUS, list = game.dragons, best = null, bd = R * R;
      for (var i = 0; i < list.length; i++) {
        var d = list[i];
        if (!d.active) continue;
        var dx = d.x - x, dy = d.y - y, d2 = dx * dx + dy * dy;
        if (d2 <= bd) { bd = d2; best = d; }
      }
      return best;
    },

    // Shared hit resolver (projectile hit, splash, cone). kind: 'hit' | 'splash'. dragon may be null/sold.
    hitEnemy: function (game, dragon, e, dmg, kind) {
      if (!e || !e.active) return 0;
      kind = kind || 'hit';
      var C = HH.data.config, st = dragon && dragon.stats, fl = st && st.flags;
      S.status.onHit(game, e, dragon, { dmg: dmg, kind: kind });
      var dealt = S.enemies.damage(game, e, dmg, { dragon: dragon || null, kind: kind, element: dragon ? dragon.def.element : null });
      if (!st || !e.active) return dealt;
      if (st.burnDps > 0 && S.status.apply(game, e, 'burn', dragon) && kind === 'hit' && fl && fl.burnJump) {
        var near = null, bd = C.SPREAD_RADIUS * C.SPREAD_RADIUS, list = game.enemies;
        for (var i = 0; i < list.length; i++) {
          var o = list[i];
          if (!o.active || o === e) continue;
          var dx = o.x - e.x, dy = o.y - e.y, d2 = dx * dx + dy * dy;
          if (d2 <= bd) { bd = d2; near = o; }
        }
        if (near) S.status.apply(game, near, 'burn', dragon);
      }
      if (st.chillStacks > 0) S.status.apply(game, e, 'chill', dragon);
      if (st.poisonDps > 0) S.status.apply(game, e, 'poison', dragon);
      if (st.armorShred > 0 && kind === 'hit') {
        var sh = e.status.shred + st.armorShred;
        e.status.shred = sh > e.armor ? e.armor : sh;
      }
      if (st.execute > 0 && e.active && !e.def.boss && e.hp < st.execute * e.maxHp) S.enemies.kill(game, e, dragon);
      return dealt;
    },

    update: function (game) {
      var C = HH.data.config, DT = C.DT, enemies = game.enemies, dragons = game.dragons, i, j;
      for (i = 0; i < enemies.length; i++) enemies[i].status.auraSlow = 0;
      var nd = dragons.length, d;
      for (i = 0; i < nd; i++) {
        d = dragons[i];
        if (!d.active || !(d.stats.auraSlow > 0)) continue;
        var a = d.stats.auraSlow;
        for (j = 0; j < enemies.length; j++) {
          var e = enemies[j];
          if (!e.active) continue;
          var dx = e.x - d.x, dy = e.y - d.y, rr = d.stats.range + e.def.radius;
          if (dx * dx + dy * dy <= rr * rr && e.status.auraSlow < a) e.status.auraSlow = a;
        }
      }
      for (i = 0; i < nd; i++) {
        d = dragons[i];
        if (!d.active) continue;
        d.attackT += DT;
        d.cooldown -= DT;
        var t = pickTarget(game, d);
        if (!t) { d.targetId = -1; if (d.cooldown < 0) d.cooldown = 0; continue; }
        d.targetId = t.id;
        d.aim = Math.atan2(t.y - d.y, t.x - d.x);
        if (d.cooldown > 0) continue;
        d.attackCount++;
        d.attackT = 0;
        var cone = !!(d.stats.flags && d.stats.flags.flameBreath) && d.attackCount % C.CONE_EVERY === 0;
        if (cone) coneAttack(game, d); else S.projectiles.fire(game, d, t);
        game.events.emit('dragonAttack', { dragon: d, target: t, cone: cone });
        d.cooldown += 1 / d.stats.attackSpeed;
        if (d.cooldown < 0) d.cooldown = 0;
      }
    }
  };
})(globalThis.HH);
