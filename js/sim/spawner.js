(function (HH) {
  'use strict';
  var S = HH.sim;

  function waveDefs(game) {
    var w = HH.data.waves[game.levelId];
    return (w && w[game.difficulty]) || [];
  }
  function findWave(game, idx) {
    for (var i = 0; i < game.waves.length; i++) if (game.waves[i].index === idx) return game.waves[i];
    return null;
  }
  function checkCleared(game, wave) {
    if (!wave || wave.cleared || !wave.spawnedAll || wave.alive > 0) return;
    wave.cleared = true;
    S.economy.onWaveCleared(game, wave.index); // economy emits waveCleared
    var i = game.waves.indexOf(wave);
    if (i >= 0) game.waves.splice(i, 1);
  }

  S.spawner = {
    update: function (game) {
      var C = HH.data.config, DT = C.DT, defs = waveDefs(game), i, g;
      for (i = 0; i < game.waves.length; i++) {
        var w = game.waves[i];
        if (w.spawnedAll) continue;
        var wd = defs[w.index], done = true;
        w.t += DT;
        for (g = 0; g < wd.groups.length; g++) {
          var gd = wd.groups[g], gs = w.groups[g];
          gs.t = w.t;
          while (gs.spawned < gd.count && gs.t >= gd.delay + gs.spawned * gd.interval - 1e-9) {
            gs.spawned++;
            S.enemies.spawn(game, gd.type, 0, w.index);
          }
          if (gs.spawned < gd.count) done = false;
        }
        if (done) {
          w.spawnedAll = true;
          if (w.index === game.waveIndex && game.waveIndex + 1 < game.totalWaves) {
            game.nextWaveTimer = C.WAVE_TIMER;
            game.nextWaveTimerMax = C.WAVE_TIMER;
          }
        }
      }
      // next-wave timer: counts down, holds at 0 unless autoStart
      if (game.nextWaveTimer > 0) {
        game.nextWaveTimer -= DT;
        if (game.nextWaveTimer < 0) game.nextWaveTimer = 0;
      }
      if (game.nextWaveTimer === 0 && game.autoStart) S.spawner.startNextWave(game, true);
      // clear check (copy: checkCleared removes from game.waves)
      var snap = game.waves.slice();
      for (i = 0; i < snap.length; i++) checkCleared(game, snap[i]);
    },

    // fromTimer (internal): started by the countdown, so no early bonus.
    startNextWave: function (game, fromTimer) {
      if (game.state === 'won' || game.state === 'lost') return false;
      if (game.waveIndex + 1 >= game.totalWaves) return false;
      if (game.waveIndex >= 0 && game.nextWaveTimer < 0) return false; // previous wave still spawning
      var defs = waveDefs(game), idx = game.waveIndex + 1;
      if (!defs[idx]) return false;
      var bonus = 0, early = false;
      if (fromTimer !== true && game.nextWaveTimer > 0) {
        early = true;
        bonus = Math.round(HH.data.config.EARLY_CALL_MAX * (game.nextWaveTimer / game.nextWaveTimerMax) * game.diff.goldMul);
      }
      game.waveIndex = idx;
      game.nextWaveTimer = -1;
      game.state = 'playing';
      game.stats.leaksThisWave = 0;
      game.waves.push({ index: idx, spawnedAll: false, alive: 0, t: 0, cleared: false,
        groups: defs[idx].groups.map(function () { return { spawned: 0, t: 0 }; }) });
      for (var i = 0; i < game.dragons.length; i++) game.dragons[i].fedThisWave = 0;
      S.growth.onWaveStart(game);
      if (bonus > 0) S.economy.addGold(game, bonus, 'early');
      game.events.emit('waveStart', { index: idx, early: early, bonus: bonus });
      return true;
    },

    preview: function (game, index) {
      var wd = waveDefs(game)[index], out = [], map = {};
      if (!wd) return out;
      for (var g = 0; g < wd.groups.length; g++) {
        var gr = wd.groups[g];
        if (map[gr.type]) map[gr.type].count += gr.count;
        else { map[gr.type] = { type: gr.type, count: gr.count }; out.push(map[gr.type]); }
      }
      return out;
    },

    onEnemySpawn: function (game, enemy) {
      var w = findWave(game, enemy.wave);
      if (w) w.alive++;
    },

    onEnemyGone: function (game, enemy) {
      var w = findWave(game, enemy.wave);
      if (!w) return;
      w.alive--;
      checkCleared(game, w);
    }
  };
})(globalThis.HH);
