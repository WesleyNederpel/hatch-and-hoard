(function (HH) {
  'use strict';
  var S = HH.sim;

  function addGold(game, amt, reason) {
    game.gold += amt;
    if (amt > 0 && reason !== 'sell') game.stats.goldEarned += amt;
    game.events.emit('gold', { gold: game.gold, delta: amt, reason: reason || '' });
  }

  function spend(game, amt) {
    if (game.gold < amt) return false;
    game.gold -= amt;
    game.events.emit('gold', { gold: game.gold, delta: -amt, reason: 'spend' });
    return true;
  }

  function onKill(game, enemy, dragon) {
    addGold(game, Math.round(enemy.def.reward * game.diff.goldMul), 'kill');
    game.stats.kills++;
  }

  function onLeak(game, enemy) {
    var before = game.hoard;
    game.hoard = Math.max(0, game.hoard - enemy.def.steals);
    game.stats.leaks++;
    game.stats.leaksThisWave++;
    game.events.emit('hoard', { hoard: game.hoard, delta: game.hoard - before });
    if (game.hoard <= 0 && game.state !== 'lost') {
      game.state = 'lost';
      game.events.emit('gameLost', {});
    }
  }

  function onWaveCleared(game, idx) {
    if (game.state === 'lost' || game.state === 'won') return;
    var C = HH.data.config;
    var bonus = Math.round((C.WAVE_BONUS_BASE + C.WAVE_BONUS_PER_WAVE * (idx + 1)) * game.diff.goldMul);
    addGold(game, bonus, 'wave');
    for (var i = 0; i < game.dragons.length; i++) {
      var d = game.dragons[i];
      if (d.active) S.growth.addXp(game, d, C.XP_WAVE_BONUS, 'wave');
    }
    game.events.emit('waveCleared', { index: idx, bonus: bonus });
  }

  function sellValue(game, dragon) {
    var C = HH.data.config;
    return Math.floor(C.SELL_HATCH_FRAC * dragon.hatchCost + C.SELL_FED_FRAC * dragon.fedTotal);
  }

  function feed(game, dragon, amt) {
    var C = HH.data.config;
    if (S.growth.nextStageXp(dragon) === null) return 0;
    var fed = Math.floor(Math.min(amt, game.gold, C.FEED_CAP - dragon.fedThisWave));
    if (!(fed > 0)) return 0;
    if (!spend(game, fed)) return 0;
    dragon.fedThisWave += fed;
    dragon.fedTotal += fed;
    S.growth.addXp(game, dragon, fed, 'feed');
    game.events.emit('feed', { dragon: dragon, amount: fed });
    return fed;
  }

  function checkEnd(game) {
    if (game.state !== 'playing') return;
    if (game.waveIndex !== game.totalWaves - 1) return;
    if (game.waves.length > 0 || game.hoard <= 0) return;
    for (var i = 0; i < game.enemies.length; i++) if (game.enemies[i].active) return;
    game.state = 'won';
    game.events.emit('gameWon', {});
  }

  S.economy = {
    addGold: addGold, spend: spend, onKill: onKill, onLeak: onLeak,
    onWaveCleared: onWaveCleared, sellValue: sellValue, feed: feed, checkEnd: checkEnd
  };
})(globalThis.HH);
