(function (HH) {
  'use strict';
  var S = HH.sim;
  function blankProjectile() {
    return { id: 0, active: false, kind: '', x: 0, y: 0, vx: 0, vy: 0, speed: 0, targetId: -1, tx: 0, ty: 0, dragonId: -1,
      damage: 0, aoe: 0, pierceLeft: 0, hitIds: [], life: 0 };
  }
  function blankZone() {
    return { id: 0, active: false, kind: 'lava', x: 0, y: 0, dist: 0, r: 0, t: 0, maxT: 0, pulse: 0, dragonId: -1 };
  }
  function sweep(list, pool) {
    var w = 0;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o.active) list[w++] = o; else if (pool) pool.release(o);
    }
    list.length = w;
  }
  S.createGame = function (opts) {
    var C = HH.data.config, level = HH.data.levels[opts.levelId || 'meadow'], diff = HH.data.difficulties[opts.difficulty || 'medium'];
    var seed = opts.seed || 1;
    return { levelId: level.id, level: level, difficulty: diff.id, diff: diff, seed: seed,
      rng: HH.RNG(seed), rng2: HH.RNG(seed + 7919), events: HH.EventBus(),
      tick: 0, time: 0, state: 'ready', gold: Math.round(level.startGold * diff.goldMul), hoard: diff.hoard, hoardMax: diff.hoard,
      autoStart: false, waveIndex: -1, totalWaves: diff.waves, nextWaveTimer: -1, nextWaveTimerMax: C.WAVE_TIMER, waves: [],
      path: S.path.build(level.waypoints), enemies: [], projectiles: [], zones: [], dragons: [], pendingChoices: [],
      pools: { enemy: HH.Pool(S.enemies.blank), projectile: HH.Pool(blankProjectile), zone: HH.Pool(blankZone) }, nextId: 1, stats: { kills: 0, leaks: 0, goldEarned: 0, leaksThisWave: 0 } };
  };
  S.step = function (game) {
    if (game.state === 'won' || game.state === 'lost' || game.pendingChoices.length > 0) return;
    game.tick++;
    game.time += HH.data.config.DT;
    S.spawner.update(game);
    S.enemies.update(game);
    S.dragons.update(game);
    S.projectiles.update(game);
    S.status.updateZones(game);
    S.economy.checkEnd(game);
    S.compact(game);
  };
  S.compact = function (game) {
    sweep(game.enemies, game.pools.enemy);
    sweep(game.projectiles, game.pools.projectile);
    sweep(game.zones, game.pools.zone);
    sweep(game.dragons, null);
  };
  S.placeDragon = function (game, type, x, y) { return S.dragons.place(game, type, x, y); };
  S.canPlace = function (game, x, y) { return S.dragons.canPlace(game, x, y); };
  S.sellDragon = function (game, id) { return S.dragons.sell(game, id); };
  S.feedDragon = function (game, id, amt) { var d = S.dragons.find(game, id); return d ? S.economy.feed(game, d, amt) : 0; };
  S.setTargeting = function (game, id, mode) { S.dragons.setTargeting(game, id, mode); };
  S.startNextWave = function (game) { return S.spawner.startNextWave(game); };
  S.chooseOption = function (game, optionId) { S.growth.choose(game, optionId); };
  S.rerollDraft = function (game) { return S.growth.reroll(game); };
  S.wavePreview = function (game, index) { return S.spawner.preview(game, index); };
  S.sellValue = function (game, id) { var d = S.dragons.find(game, id); return d ? S.economy.sellValue(game, d) : 0; };
  S.dragonAt = function (game, x, y) { return S.dragons.at(game, x, y); };
})(globalThis.HH);
