(function (HH) {
  'use strict';
  var S = HH.sim;

  // Status effects, combos (blight, steam burst), death spreading and ground zones.
  // Zones: t = seconds REMAINING (starts at maxT), pulse = accumulator toward the next ZONE_PULSE.
  // Extra (non-contract) status fields: burn/poison carry `acc` (pulse accumulator), poison carries `slow`.

  var pathSampleCache = null, pathSampleFor = null;

  function flagsOf(dragon) {
    return (dragon && dragon.stats && dragon.stats.flags) || {};
  }

  function nearestPathDist(game, x, y) {
    if (pathSampleFor !== game.path) { pathSampleFor = game.path; pathSampleCache = game.path.samples(8); }
    var best = Infinity, bd = 0;
    for (var i = 0; i < pathSampleCache.length; i++) {
      var s = pathSampleCache[i], dx = s.x - x, dy = s.y - y, d2 = dx * dx + dy * dy;
      if (d2 < best) { best = d2; bd = s.d; }
    }
    return bd;
  }

  function spawnZone(game, kind, x, y, dist, r, dur, dragon) {
    var z = game.pools.zone.acquire();
    z.id = game.nextId++;
    z.active = true;
    z.kind = kind;
    z.x = x; z.y = y;
    z.dist = dist;
    z.r = r;
    z.t = dur;
    z.maxT = dur;
    z.pulse = 0;
    z.dragonId = dragon ? dragon.id : -1;
    game.zones.push(z);
    game.events.emit('zoneSpawn', { zone: z });
    return z;
  }

  function checkBlight(game, e, dragon) {
    var st = e.status;
    if (st.burn && st.poison) {
      if (!st.blight) {
        st.blight = true;
        game.events.emit('combo', { kind: 'blight', enemy: e, x: e.x, y: e.y });
        if (dragon) S.growth.addComboXp(game, dragon);
      }
    } else st.blight = false;
  }

  function dotMul(e) {
    return e.status.blight ? HH.data.config.BLIGHT_MUL : 1;
  }

  var X = S.status = {
    spawnZone: spawnZone,
    nearestPathDist: nearestPathDist,

    apply: function (game, e, kind, dragon, opts) {
      if (!e || !e.active || !dragon || !dragon.stats) return false;
      var C = HH.data.config, s = dragon.stats, fl = s.flags || {}, st = e.status, add;
      opts = opts || {};
      if (kind === 'burn') {
        if (!(s.burnDps > 0)) return false;
        var bmax = Math.max(1, s.burnMaxStacks || 1), b = st.burn;
        add = opts.stacks || 1;
        if (!b) b = st.burn = { t: C.BURN_DUR, dps: s.burnDps, stacks: 0, melt: false, src: dragon, acc: 0 };
        b.stacks = Math.min(bmax, b.stacks + add);
        b.t = C.BURN_DUR;
        b.dps = s.burnDps;
        b.src = dragon;
        if (fl.meltingPoint) b.melt = true;
      } else if (kind === 'chill') {
        if (st.freeze) return false; // no chill while frozen
        add = opts.stacks || s.chillStacks || 1;
        var c = st.chill;
        if (!c) c = st.chill = { stacks: 0, t: C.CHILL_DUR };
        c.stacks += add;
        c.t = C.CHILL_DUR;
        if (c.stacks >= C.FREEZE_STACKS && s.freezeDur > 0) {
          st.chill = null;
          st.freeze = { t: s.freezeDur, brittle: !!fl.brittle };
          game.events.emit('statusApplied', { enemy: e, kind: kind, dragon: dragon });
          S.growth.addStatusXp(game, dragon);
          game.events.emit('freeze', { enemy: e });
          return true;
        }
        if (c.stacks > C.FREEZE_STACKS) c.stacks = C.FREEZE_STACKS;
      } else if (kind === 'poison') {
        if (!(s.poisonDps > 0)) return false;
        var pmax = Math.max(1, s.poisonMaxStacks || 1), p = st.poison;
        add = opts.stacks || 1;
        if (!p) p = st.poison = { stacks: 0, t: C.POISON_DUR, dps: s.poisonDps, src: dragon, acc: 0, slow: 0 };
        p.stacks = Math.min(pmax, p.stacks + add);
        p.t = C.POISON_DUR;
        p.dps = s.poisonDps;
        p.src = dragon;
        p.slow = Math.max(p.slow || 0, s.poisonSlow || 0);
      } else return false;
      game.events.emit('statusApplied', { enemy: e, kind: kind, dragon: dragon });
      S.growth.addStatusXp(game, dragon);
      if (kind !== 'chill') checkBlight(game, e, dragon);
      return true;
    },

    // Per-tick DoT / timer processing. Called by enemies.update before movement.
    update: function (game, e) {
      var C = HH.data.config, DT = C.DT, PULSE = C.ZONE_PULSE, st = e.status, b, p, amt;
      b = st.burn;
      if (b) {
        b.acc += DT;
        b.t -= DT;
        var expire = b.t <= 0;
        while (b.acc >= PULSE) {
          b.acc -= PULSE;
          amt = b.dps * b.stacks * dotMul(e) * PULSE;
          S.enemies.damage(game, e, amt, { dragon: b.src, kind: 'dot', element: 'fire' });
          if (!e.active) return;
        }
        if (expire) {
          if (b.acc > 0) {
            amt = b.dps * b.stacks * dotMul(e) * b.acc;
            S.enemies.damage(game, e, amt, { dragon: b.src, kind: 'dot', element: 'fire' });
            if (!e.active) return;
          }
          st.burn = null;
        }
      }
      p = st.poison;
      if (p) {
        p.acc += DT;
        p.t -= DT;
        var pexp = p.t <= 0;
        while (p.acc >= PULSE) {
          p.acc -= PULSE;
          amt = p.dps * p.stacks * dotMul(e) * PULSE;
          S.enemies.damage(game, e, amt, { dragon: p.src, kind: 'dot', element: 'venom' });
          if (!e.active) return;
        }
        if (pexp) {
          if (p.acc > 0) {
            amt = p.dps * p.stacks * dotMul(e) * p.acc;
            S.enemies.damage(game, e, amt, { dragon: p.src, kind: 'dot', element: 'venom' });
            if (!e.active) return;
          }
          st.poison = null;
        }
      }
      if (st.blight && !(st.burn && st.poison)) st.blight = false;
      if (st.freeze) { st.freeze.t -= DT; if (st.freeze.t <= 0) st.freeze = null; }
      if (st.chill) { st.chill.t -= DT; if (st.chill.t <= 0) st.chill = null; }
    },

    speedMul: function (game, e) {
      var C = HH.data.config, st = e.status;
      if (st.freeze) return 0;
      var m = 1;
      if (st.chill) m *= (1 - C.CHILL_SLOW);
      if (st.auraSlow > 0) m *= (1 - st.auraSlow);
      if (st.poison && st.poison.slow > 0) m *= (1 - st.poison.slow);
      return m < C.MIN_SPEED_MUL ? C.MIN_SPEED_MUL : m;
    },

    damageMul: function (game, e, info) {
      var C = HH.data.config, st = e.status, m = 1;
      if (st.freeze && st.freeze.brittle) m *= (1 + C.BRITTLE_AMP);
      var dr = info && info.dragon;
      if (dr) {
        var fl = flagsOf(dr), bonus = 0;
        if (fl.siegeBane) {
          if (e.def && e.def.siege) bonus += 1.0;
          else if (e.armor > 0) bonus += 0.5;
        }
        if (fl.frozenBonus && st.freeze) bonus += 0.5;
        m *= (1 + bonus);
      }
      return m;
    },

    effectiveArmor: function (e) {
      var C = HH.data.config, st = e.status;
      if (st.burn && st.burn.melt) return 0;
      var a = (e.armor || 0) - (st.poison ? st.poison.stacks * C.POISON_ARMOR_PER_STACK : 0) - (st.shred || 0);
      return a > 0 ? a : 0;
    },

    // Called by the hit resolver BEFORE damage. hit = { dmg, kind }.
    onHit: function (game, e, dragon, hit) {
      if (!dragon || !e.active || !hit || hit.kind !== 'hit') return;
      if (dragon.def.element !== 'fire') return;
      var C = HH.data.config, st = e.status;
      if (!st.chill && !st.freeze) return;
      st.chill = null;
      st.freeze = null;
      var cx = e.x, cy = e.y, dmg = hit.dmg * C.STEAM_DMG_MUL, r2 = C.STEAM_RADIUS * C.STEAM_RADIUS;
      var list = game.enemies, n = list.length;
      for (var i = 0; i < n; i++) {
        var o = list[i];
        if (!o.active) continue;
        var dx = o.x - cx, dy = o.y - cy;
        if (dx * dx + dy * dy <= r2) S.enemies.damage(game, o, dmg, { dragon: dragon, kind: 'splash', element: 'fire' });
      }
      spawnZone(game, 'steam', cx, cy, e.dist, C.STEAM_RADIUS, 0.6, dragon);
      game.events.emit('combo', { kind: 'steam', enemy: e, x: cx, y: cy });
      S.growth.addComboXp(game, dragon);
    },

    // Called by enemies.kill after the corpse is marked inactive.
    onDeath: function (game, e) {
      var C = HH.data.config, st = e.status, r2 = C.SPREAD_RADIUS * C.SPREAD_RADIUS, list = game.enemies, n = list.length, i, o, dx, dy;
      var wild = st.burn && st.burn.src && flagsOf(st.burn.src).wildfire ? st.burn.src : null;
      var cont = st.poison && st.poison.src && flagsOf(st.poison.src).contagion ? st.poison.src : null;
      if (!wild && !cont) return;
      for (i = 0; i < n; i++) {
        o = list[i];
        if (!o.active || o === e) continue;
        dx = o.x - e.x; dy = o.y - e.y;
        if (dx * dx + dy * dy > r2) continue;
        if (wild) X.apply(game, o, 'burn', wild);
        if (cont) X.apply(game, o, 'poison', cont, { stacks: 2 });
      }
    },

    updateZones: function (game) {
      var C = HH.data.config, DT = C.DT, zones = game.zones, nz = zones.length, enemies = game.enemies, i, j;
      for (i = 0; i < nz; i++) {
        var z = zones[i];
        if (!z.active) continue;
        z.t -= DT;
        if (z.t <= 0) { z.active = false; continue; }
        if (z.kind === 'steam') continue;
        if (z.kind === 'cloud') {
          // drift along the path, keeping the impact-point offset (no snap to the centre line)
          var p0 = game.path.pointAt(z.dist);
          z.dist -= C.CLOUD_DRIFT * DT;
          if (z.dist < 0) z.dist = 0;
          var pt = game.path.pointAt(z.dist);
          z.x += pt.x - p0.x; z.y += pt.y - p0.y;
        }
        z.pulse += DT;
        if (z.pulse + 1e-9 < C.ZONE_PULSE) continue;
        z.pulse -= C.ZONE_PULSE;
        var dr = S.dragons.find(game, z.dragonId);
        if (!dr) continue;
        var r2 = z.r * z.r, ne = enemies.length;
        for (j = 0; j < ne; j++) {
          var e = enemies[j];
          if (!e.active) continue;
          var dx = e.x - z.x, dy = e.y - z.y;
          if (dx * dx + dy * dy > r2) continue;
          X.apply(game, e, z.kind === 'lava' ? 'burn' : 'poison', dr);
        }
      }
    }
  };
})(globalThis.HH);
