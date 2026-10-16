(function (HH) {
  'use strict';
  var S = HH.sim;

  function freshStatus() {
    return { burn: null, chill: null, freeze: null, poison: null, shred: 0, auraSlow: 0, blight: false };
  }
  function blank() {
    return { id: 0, active: false, type: '', def: null, x: 0, y: 0, angle: 0, dist: 0, lane: 0, hp: 0, maxHp: 0, armor: 0,
      wave: 0, status: freshStatus(), hitT: 99, spawnT: 0 };
  }

  function place(game, e) {
    var p = game.path.pointAt(e.dist), a = p.angle + Math.PI / 2;
    e.angle = p.angle;
    e.x = p.x + Math.cos(a) * e.lane;
    e.y = p.y + Math.sin(a) * e.lane;
  }

  var E = S.enemies = {
    blank: blank,

    spawn: function (game, type, dist, waveIdx) {
      var def = HH.data.enemies[type];
      if (!def) return null;
      var wavesData = HH.data.waves[game.levelId] && HH.data.waves[game.levelId][game.difficulty];
      var wdef = wavesData && wavesData[waveIdx];
      var hpGrowth = game.level.hpGrowth[game.difficulty] || 0;
      var hp = def.hp * game.diff.hpMul * (1 + hpGrowth * waveIdx) * ((wdef && wdef.hpMul) || 1);
      var e = game.pools.enemy.acquire();
      e.id = game.nextId++;
      e.active = true;
      e.type = type;
      e.def = def;
      e.dist = Math.max(0, dist);
      e.lane = game.rng2.next() * 20 - 10;
      e.hp = hp;
      e.maxHp = hp;
      e.armor = def.armor || 0;
      e.wave = waveIdx;
      e.status = freshStatus();
      e.hitT = 99;
      e.spawnT = 0;
      place(game, e);
      game.enemies.push(e);
      S.spawner.onEnemySpawn(game, e);
      game.events.emit('enemySpawn', { enemy: e });
      return e;
    },

    update: function (game) {
      var C = HH.data.config, DT = C.DT, list = game.enemies, n = list.length, plen = game.path.length;
      for (var i = 0; i < n; i++) { // n fixed: split children appended mid-loop start next tick
        var e = list[i];
        if (!e.active) continue;
        e.spawnT += DT;
        e.hitT += DT;
        S.status.update(game, e);
        if (!e.active) continue;
        e.dist += e.def.speed * C.SPEED_UNIT * S.status.speedMul(game, e) * DT;
        if (e.dist >= plen) {
          e.dist = plen;
          place(game, e);
          e.active = false;
          game.events.emit('enemyLeaked', { enemy: e, steals: e.def.steals });
          S.economy.onLeak(game, e);
          S.spawner.onEnemyGone(game, e);
          continue;
        }
        place(game, e);
      }
    },

    damage: function (game, e, amount, info) {
      if (!e || !e.active) return 0;
      info = info || { dragon: null, kind: 'hit', element: null };
      var kind = info.kind || 'hit';
      var dealt = amount * S.status.damageMul(game, e, info);
      if (kind !== 'dot') dealt *= (1 - S.status.effectiveArmor(e));
      if (!(dealt > 0)) return 0;
      e.hp -= dealt;
      e.hitT = 0;
      var dr = info.dragon || null;
      if (dr) { dr.damageDealt = (dr.damageDealt || 0) + dealt; S.growth.addCombatXp(game, dr, dealt); }
      game.events.emit('enemyHit', { enemy: e, dmg: dealt, dragon: dr, kind: kind });
      if (e.hp <= 0 && e.active) E.kill(game, e, dr);
      return dealt;
    },

    kill: function (game, e, dragon) {
      if (!e || !e.active) return;
      e.active = false; // set first so re-entrant hooks (wildfire etc.) skip the corpse
      e.hp = 0;
      dragon = dragon || null;
      if (dragon) dragon.kills = (dragon.kills || 0) + 1;
      var reward = Math.round(e.def.reward * game.diff.goldMul);
      game.events.emit('enemyKilled', { enemy: e, x: e.x, y: e.y, reward: reward, dragon: dragon });
      S.economy.onKill(game, e, dragon);
      S.status.onDeath(game, e);
      var sp = e.def.splitInto;
      if (sp) {
        for (var k = 0; k < sp.count; k++) {
          var off = sp.count > 1 ? (k / (sp.count - 1) * 2 - 1) * 6 : 0; // -6 .. +6
          E.spawn(game, sp.type, e.dist + off, e.wave);
        }
      }
      S.spawner.onEnemyGone(game, e);
    },

    find: function (game, id) {
      var list = game.enemies;
      for (var i = 0; i < list.length; i++) if (list[i].id === id && list[i].active) return list[i];
      return null;
    }
  };
})(globalThis.HH);
