(function (HH) {
  'use strict';

  function applyMods(s, m) {
    var k;
    if (!m) return;
    if (m.mul) for (k in m.mul) s[k] = s[k] * m.mul[k];
    if (m.add) for (k in m.add) s[k] = (s[k] || 0) + m.add[k];
    if (m.set) for (k in m.set) s[k] = m.set[k];
    if (m.flags) for (k in m.flags) s.flags[k] = m.flags[k];
  }

  function computeStats(dragon) {
    var C = HH.data.config, b = dragon.def.base, s = { flags: {} }, k, i;
    for (k in b) s[k] = b[k];
    var st = dragon.stage || 0;
    var dm = Math.pow(C.STAGE_DAMAGE_MUL, st);
    s.damage *= dm; s.burnDps *= dm; s.poisonDps *= dm;
    s.range *= (1 + C.STAGE_RANGE_ADD * st);
    s.attackSpeed *= (1 + C.STAGE_ATKSPD_ADD * st);
    if (dragon.form) applyMods(s, HH.data.evolutions[dragon.form]);
    var ins = dragon.instincts || [];
    for (i = 0; i < ins.length; i++) applyMods(s, HH.data.instincts[ins[i]]);
    return s;
  }

  function availableInstincts(d) {
    var all = d.def.instincts, out = [];
    for (var i = 0; i < all.length; i++) if (d.instincts.indexOf(all[i]) < 0) out.push(all[i]);
    return out;
  }

  function draw(game, pool) {
    var copy = pool.slice(), n = HH.data.config.DRAFT_SIZE;
    game.rng.shuffle(copy);
    return copy.slice(0, n);
  }

  function queueChoice(game, d, kind) {
    var options;
    if (kind === 'instinct') {
      var av = availableInstincts(d);
      if (!av.length) return;
      options = draw(game, av);
    } else {
      options = d.def.forms.slice();
      if (!options.length) return;
    }
    var choice = { dragonId: d.id, kind: kind, options: options, rerollsUsed: 0 };
    game.pendingChoices.push(choice);
    game.events.emit('choiceReady', { choice: choice });
  }

  function addXp(game, d, amt, source) {
    var C = HH.data.config;
    if (!d || !d.active || !(amt > 0)) return;
    d.xp += amt;
    while (d.stage < C.STAGES.length - 1 && d.xp >= C.STAGES[d.stage + 1].xp) {
      d.stage++;
      d.stats = computeStats(d);
      game.events.emit('stageUp', { dragon: d, stage: d.stage });
      if (d.stage === 1) queueChoice(game, d, 'instinct');
      else if (d.stage === 2) queueChoice(game, d, 'evolution');
    }
  }

  function addCombatXp(game, d, dealt) {
    var C = HH.data.config;
    if (!d || !(dealt > 0)) return;
    addXp(game, d, Math.min(dealt * C.XP_PER_DAMAGE, C.XP_HIT_CAP), 'combat');
  }
  function addStatusXp(game, d) { if (d) addXp(game, d, HH.data.config.XP_PER_STATUS, 'status'); }
  function addComboXp(game, d) { if (d) addXp(game, d, HH.data.config.XP_PER_COMBO, 'combo'); }

  function nextStageXp(d) {
    var S = HH.data.config.STAGES;
    return d.stage + 1 < S.length ? S[d.stage + 1].xp : null;
  }

  function onWaveStart() { /* feed cap is reset by the spawner */ }

  function findDragon(game, id) {
    for (var i = 0; i < game.dragons.length; i++) if (game.dragons[i].id === id) return game.dragons[i];
    return null;
  }

  function choose(game, optionId) {
    var choice = game.pendingChoices[0];
    if (!choice) return;
    var d = findDragon(game, choice.dragonId);
    if (!d || !d.active) { game.pendingChoices.shift(); return; }
    if (choice.options.indexOf(optionId) < 0) return;
    if (choice.kind === 'instinct') d.instincts.push(optionId);
    else d.form = optionId;
    d.stats = computeStats(d);
    game.pendingChoices.shift();
    game.events.emit('choiceResolved', { dragon: d, kind: choice.kind, optionId: optionId });
  }

  function rerollCost(game) {
    var choice = game.pendingChoices[0];
    if (!choice || choice.kind !== 'instinct') return null;
    var costs = HH.data.config.REROLL_COSTS;
    return choice.rerollsUsed < costs.length ? costs[choice.rerollsUsed] : null;
  }

  function reroll(game) {
    var cost = rerollCost(game);
    if (cost === null) return false;
    var choice = game.pendingChoices[0];
    var d = findDragon(game, choice.dragonId);
    if (!d || !d.active) return false;
    if (!HH.sim.economy.spend(game, cost)) return false;
    var av = availableInstincts(d), fresh = [], i;
    for (i = 0; i < av.length; i++) if (choice.options.indexOf(av[i]) < 0) fresh.push(av[i]);
    choice.options = draw(game, fresh.length >= HH.data.config.DRAFT_SIZE ? fresh : av);
    choice.rerollsUsed++;
    d.rerollsUsed = (d.rerollsUsed || 0) + 1;
    game.events.emit('choiceReady', { choice: choice });
    return true;
  }

  HH.sim.growth = {
    computeStats: computeStats, addXp: addXp, addCombatXp: addCombatXp,
    addStatusXp: addStatusXp, addComboXp: addComboXp, nextStageXp: nextStageXp,
    onWaveStart: onWaveStart, choose: choose, reroll: reroll, rerollCost: rerollCost
  };
})(globalThis.HH);
