(function (HH) {
  'use strict';
  // DOM overlay UI (SPEC 10): menu, top bar, shop + dragon panel, draft popup, pause and end overlays.
  // DOM is built once in init(); update() only touches values that changed.
  var U = HH.ui;
  var C = HH.data.config, COL = C.COLORS;
  var app = null, root = null, built = false;
  var R = {};               // element refs
  var cache = { previewKey: '', draftKey: '', instKey: '', game: null };
  var iconPasses = 0;
  var MINUS = '−', TIMES = '×';

  // ---------- tiny DOM helpers ----------
  function el(tag, cls, parent, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function setText(n, s) { s = String(s); if (n._t !== s) { n._t = s; n.textContent = s; } }
  function tog(n, name, on) {
    on = !!on; var k = '_c_' + name;
    if (n[k] === on) return;
    n[k] = on; n.classList.toggle(name, on);
  }
  function setStyle(n, prop, v) { var k = '_s_' + prop; if (n[k] === v) return; n[k] = v; n.style[prop] = v; }
  function sfx(name) { try { if (HH.audio && HH.audio.play) HH.audio.play(name); } catch (e) { /* ignore */ } }
  function button(parent, cls, text, handler) {
    var b = el('div', 'btn ' + (cls || ''), parent);
    if (text != null) b.textContent = text;
    b.addEventListener('click', function (e) {
      if (b.classList.contains('dis')) return;
      sfx('click');
      if (handler) handler(e);
    });
    return b;
  }
  function fmt(n) { return String(Math.round((n || 0) * 10) / 10); }
  function elemColor(element, i) { var c = COL[element]; return c ? c[i || 0] : COL.gold; }
  function findDragon(g, id) {
    for (var i = 0; i < g.dragons.length; i++) if (g.dragons[i].active && g.dragons[i].id === id) return g.dragons[i];
    return null;
  }
  function gameOver(g) { return g.state === 'won' || g.state === 'lost'; }

  // ---------- actions (shared with input.js) ----------
  function canStart(g) {
    if (!g || gameOver(g) || g.pendingChoices.length > 0) return false;
    if (g.waveIndex + 1 >= g.totalWaves) return false;
    if (g.waveIndex >= 0 && g.nextWaveTimer < 0) return false;   // previous wave still spawning
    return true;
  }
  var A = U.actions = {
    canStart: canStart,
    startWave: function (a) {
      var g = a.game;
      if (a.screen !== 'play' || a.paused || !canStart(g)) return false;
      var ok = HH.sim.startNextWave(g);
      if (ok) sfx('click');
      return !!ok;
    },
    togglePlacing: function (a, type) {
      if (a.placing === type) { a.placing = null; return; }
      var def = HH.data.dragons[type], g = a.game;
      if (!def || !g || g.gold < def.cost) { sfx('error'); return; }
      a.placing = type; a.selectedId = -1;
    },
    feedSelected: function (a, max) {
      var g = a.game;
      if (!g || a.paused || a.selectedId < 0) return 0;
      var d = findDragon(g, a.selectedId);
      if (!d || HH.sim.growth.nextStageXp(d) === null) return 0;
      var fed = HH.sim.feedDragon(g, d.id, max ? C.FEED_CAP : C.FEED_STEP);
      if (fed > 0) sfx('click');
      return fed || 0;
    },
    sellSelected: function (a) {
      var g = a.game;
      if (!g || a.paused || a.selectedId < 0 || !findDragon(g, a.selectedId)) return;
      HH.sim.sellDragon(g, a.selectedId);
      a.selectedId = -1;
    },
    togglePause: function (a) { if (a.screen === 'play') a.paused = !a.paused; },
    toggleSpeed: function (a) { a.speed = a.speed === 1 ? 2 : 1; },
    toggleMute: function (a) { a.muted = !a.muted; try { HH.audio.setMuted(a.muted); } catch (e) { /* ignore */ } },
    startRun: function (a, diff) { a.newGame(diff); a.screen = 'play'; },
    toMenu: function (a) { a.newGame('medium'); a.screen = 'menu'; },
    // true while map clicks / game hotkeys should be ignored
    blocked: function (a) {
      var g = a.game;
      return a.screen !== 'play' || !g || gameOver(g) || g.pendingChoices.length > 0 || a.paused;
    }
  };

  // ---------- builders ----------
  function buildMenu() {
    var m = R.menu = el('div', 'overlay full', root);
    var box = el('div', 'bigbox', m);
    el('div', 'm-title', box, 'Hatch & Hoard');
    el('div', 'm-sub', box, 'Level 1 ' + '—' + ' ' + HH.data.levels.meadow.name);
    el('div', 'm-tag', box, 'Hatch dragons, feed them, choose their Instincts and guard the Hoard!');
    var list = el('div', 'm-diffs', box);
    ['easy', 'medium', 'hard'].forEach(function (id) {
      var d = HH.data.difficulties[id];
      var parts = [d.waves + ' waves', d.hoard + ' coins'];
      if (d.hpMul !== 1) parts.push((d.hpMul > 1 ? '+' : MINUS) + Math.round(Math.abs(d.hpMul - 1) * 100) + '% enemy HP');
      if (d.goldMul !== 1) parts.push((d.goldMul > 1 ? '+' : MINUS) + Math.round(Math.abs(d.goldMul - 1) * 100) + '% gold');
      var b = button(list, 'diff ' + id, d.name, function () { A.startRun(app, id); });
      el('small', null, b, parts.join('  ·  '));
    });
    el('div', 'm-keys', box, 'Space: start wave   ·   1-3: pick dragon   ·   F: feed   ·   P: pause   ·   Esc: cancel');
  }

  function buildTopBar() {
    var t = el('div', null, root); t.id = 'topbar';
    var p = el('div', 'pill', t); el('span', 'coin', p); R.gold = el('b', null, p, '0'); p.title = 'Gold';
    p = el('div', 'pill', t); el('span', 'coin pile', p); el('span', 'lbl', p, 'Hoard'); R.hoard = el('b', null, p, '0 / 0');
    p.title = 'Hoard coins left: if they run out, you lose';
    p = el('div', 'pill', t); R.wave = el('b', null, p, 'Wave 0 / 0');
    var chips = R.chips = el('div', null, t); chips.id = 'tb-chips';
    el('span', 'lbl', chips, 'Next:');
    R.chipHolder = el('div', null, chips); R.chipHolder.style.display = 'contents';
    p = el('div', 'pill', t); p.title = 'Next wave timer'; R.timer = el('b', null, p, '--');
    R.start = button(t, null, 'Start Wave', function () { A.startWave(app); }); R.start.id = 'tb-start';
    R.speed = button(t, 'wood', '1' + TIMES, function () { A.toggleSpeed(app); }); R.speed.id = 'tb-speed'; R.speed.title = 'Game speed';
    R.pause = button(t, 'wood', '❚❚', function () { A.togglePause(app); }); R.pause.id = 'tb-pause'; R.pause.title = 'Pause (P)';
    R.mute = button(t, 'wood', '♪', function () { A.toggleMute(app); }); R.mute.id = 'tb-mute'; R.mute.title = 'Sound on/off';
    el('span', 'slash', R.mute);
  }

  function drawIcon(canvas, type, element) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var ad = HH.render && HH.render.artDragons;
    if (ad && typeof ad.drawIcon === 'function') {
      try { ad.drawIcon(ctx, type, canvas.width / 2, canvas.height / 2 + 2, canvas.width * 0.9); return; } catch (e) { /* fall through */ }
    }
    ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = elemColor(element, 0); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = COL.outline; ctx.stroke();
    ctx.beginPath(); ctx.arc(canvas.width * 0.42, canvas.height * 0.42, canvas.width * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = elemColor(element, 2); ctx.fill();
  }

  function buildShop(side) {
    el('div', 'sb-head', side, 'Hatchery');
    R.cards = [];
    HH.data.levels.meadow.dragons.forEach(function (type) {
      var def = HH.data.dragons[type];
      var card = el('div', 'dcard', side);
      card.style.borderLeftColor = elemColor(def.element, 0);
      card.title = def.desc || def.name;
      var cv = el('canvas', null, card); cv.width = 88; cv.height = 88;
      var info = el('div', null, card);
      el('div', 'dn tx', info, def.name);
      var cost = el('div', 'dc', info); el('span', 'coin', cost); el('span', null, cost, String(def.cost));
      el('div', 'hk', card, String(def.hotkey));
      card.addEventListener('click', function () { sfx('click'); A.togglePlacing(app, type); });
      R.cards.push({ type: type, def: def, el: card, canvas: cv });
    });
  }

  function buildPanel(side) {
    var p = R.panel = el('div', null, side); p.id = 'dpanel';
    R.dpEmpty = el('div', 'dp-empty', p, 'Select a dragon to feed it, sell it or change its targeting.');
    var b = R.dpBody = el('div', 'dp-body', p);
    R.dpName = el('div', 'dp-name tx', b, '');
    R.dpForm = el('div', 'dp-form', b, '');
    var st = el('div', 'dp-stage', b);
    R.dpStage = el('span', null, st, ''); R.dpXpLbl = el('span', null, st, '');
    var bar = el('div', 'xpbar', b);
    R.dpXpFill = el('div', 'xpfill', bar); R.dpXpText = el('div', 'xptext', bar, '');
    R.dpInst = el('div', 'dp-inst', b);
    var s = el('div', 'dp-stats', b);
    function stat(label) { el('span', null, s, label); return el('span', null, s, '-'); }
    R.dpDmg = stat('Damage'); R.dpAtk = stat('Attacks / sec'); R.dpRng = stat('Range');
    R.dpDealt = stat('Damage dealt'); R.dpKills = stat('Kills');
    var row = el('div', 'dp-row', b);
    R.dpFeed = button(row, null, null, function (e) { A.feedSelected(app, e.shiftKey); });
    R.dpFeed.id = 'dp-feed'; R.dpFeed.title = 'Feed: 1 gold = 1 XP. Shift-click feeds the maximum.';
    R.dpFeedMain = el('span', null, R.dpFeed, 'Feed +' + C.FEED_STEP + ' (F)');
    R.dpFeedSub = el('small', null, R.dpFeed, '');
    R.dpSell = button(row, 'red', null, function () { A.sellSelected(app); });
    R.dpSell.title = 'Sell this dragon';
    R.dpSellMain = el('span', null, R.dpSell, 'Sell'); R.dpSellSub = el('small', null, R.dpSell, '');
    el('div', 'dp-tgtlbl', b, 'Targeting');
    var tg = el('div', 'dp-row dp-tgt', b);
    R.tgt = [];
    [['first', 'First'], ['last', 'Last'], ['strong', 'Strong'], ['close', 'Close']].forEach(function (m) {
      var tb = button(tg, 'wood', m[1], function () {
        if (app.game && !app.paused && app.selectedId >= 0) HH.sim.setTargeting(app.game, app.selectedId, m[0]);
      });
      tb.title = { first: 'Furthest along the path', last: 'Closest to the entrance', strong: 'Highest HP', close: 'Nearest to the dragon' }[m[0]];
      R.tgt.push({ mode: m[0], el: tb });
    });
  }

  function buildSidebar() {
    var side = el('div', null, root); side.id = 'sidebar';
    buildShop(side);
    buildPanel(side);
    el('div', 'sb-hint', side, 'Space: wave   F: feed   P: pause\nEsc: cancel   Right-click: cancel').style.whiteSpace = 'pre-line';
  }

  function buildDraft() {
    var m = R.draft = el('div', 'overlay modal', root);
    var box = el('div', 'bigbox draft', m);
    R.drHead = el('div', 'dr-head tx', box, '');
    R.drSub = el('div', 'dr-sub', box, '');
    R.drCards = el('div', 'dr-cards', box);
    var foot = el('div', 'dr-foot', box);
    R.drReroll = button(foot, 'wood', 'Reroll', function () { HH.sim.rerollDraft(app.game); });
  }

  function buildPause() {
    var p = R.pauseOv = el('div', 'overlay pause', root);
    el('div', 'p-t', p, 'Paused');
    el('div', 'p-s', p, 'Click here or press P to resume');
    p.addEventListener('click', function () { sfx('click'); app.paused = false; });
  }

  function buildEnd() {
    var o = R.end = el('div', 'overlay full', root);
    var box = el('div', 'bigbox', o);
    R.eTitle = el('div', 'e-title', box, '');
    R.eSub = el('div', 'e-sub', box, '');
    var s = el('div', 'e-stats', box);
    function stat(label) { el('span', null, s, label); return el('span', null, s, '-'); }
    R.eWaves = stat('Waves reached'); R.eCoins = stat('Hoard coins left'); R.eKills = stat('Enemies defeated');
    R.eLeaks = stat('Raiders leaked'); R.eGold = stat('Gold earned');
    var row = el('div', 'e-btns', box);
    button(row, null, 'Restart', function () { A.startRun(app, app.game ? app.game.difficulty : 'medium'); });
    button(row, 'wood', 'Menu', function () { A.toMenu(app); });
  }

  // ---------- updates ----------
  function updateTop(g) {
    setText(R.gold, Math.floor(g.gold));
    setText(R.hoard, g.hoard + ' / ' + g.hoardMax);
    setText(R.wave, 'Wave ' + Math.max(0, g.waveIndex + 1) + ' / ' + g.totalWaves);

    // next-wave preview chips (rebuilt only when the wave index / game changes)
    var key = g.waveIndex + '|' + g.totalWaves + '|' + (cache.game === g);
    if (key !== cache.previewKey) {
      cache.previewKey = key;
      var holder = R.chipHolder;
      while (holder.firstChild) holder.removeChild(holder.firstChild);
      var idx = g.waveIndex + 1, prev = idx < g.totalWaves ? HH.sim.wavePreview(g, idx) : null;
      if (!prev || !prev.length) {
        el('span', 'chip-none', holder, idx < g.totalWaves ? '' : 'Final wave is out!');
      } else {
        prev.forEach(function (it) {
          var def = HH.data.enemies[it.type], cl = (def && def.colors) || {};
          var c = el('div', 'chip', holder);
          var ic = el('span', 'chip-ic', c);
          ic.style.background = 'linear-gradient(' + (cl.helmet || '#aaa') + ' 50%, ' + (cl.body || '#888') + ' 50%)';
          ic.style.borderColor = COL.outline;
          el('span', null, c, TIMES + it.count);
          c.style.background = cl.body || '#888';
          c.style.borderColor = COL.outline;
          c.style.boxShadow = 'inset 0 -4px 0 ' + (cl.trim || cl.helmet || 'rgba(0,0,0,.25)');
          c.title = (def ? def.name : it.type) + ' ' + TIMES + it.count;
        });
      }
    }

    var t = g.nextWaveTimer;
    var showTimer = app.screen === 'play' && !gameOver(g);
    if (R.timer.parentNode) R.timer.parentNode.style.display = showTimer ? '' : 'none';
    R.chips.style.visibility = showTimer ? '' : 'hidden';
    setText(R.timer, g.state === 'ready' ? 'Ready' : (t > 0 ? Math.ceil(t) + 's' : (t === 0 ? 'Go!' : '--')));

    var can = canStart(g) && app.screen === 'play' && !app.paused;
    var label = 'Start Wave';
    if (g.waveIndex >= 0 && t > 0) {
      var n = Math.round(C.EARLY_CALL_MAX * t / (g.nextWaveTimerMax || C.WAVE_TIMER) * g.diff.goldMul);
      label = 'Call Early +' + n;
    }
    setText(R.start, label);
    tog(R.start, 'dis', !can);
    setText(R.speed, app.speed + TIMES);
    setText(R.pause, app.paused ? '▶' : '❚❚');
    tog(R.mute, 'muted', app.muted);
  }

  function updateShop(g) {
    if (iconPasses < 2) { // art modules may need a frame or two before icons can be drawn
      iconPasses++;
      for (var k = 0; k < R.cards.length; k++) drawIcon(R.cards[k].canvas, R.cards[k].type, R.cards[k].def.element);
    }
    for (var i = 0; i < R.cards.length; i++) {
      var c = R.cards[i];
      tog(c.el, 'dis', g.gold < c.def.cost);
      tog(c.el, 'sel', app.placing === c.type);
    }
  }

  function updatePanel(g) {
    var d = app.selectedId >= 0 ? findDragon(g, app.selectedId) : null;
    if (!d && app.selectedId >= 0) app.selectedId = -1;
    tog(R.dpEmpty, 'hide', !!d);
    tog(R.dpBody, 'hide', !d);
    if (!d) { cache.instKey = ''; return; }
    var st = d.stats || {}, form = d.form && HH.data.evolutions[d.form];
    var stage = C.STAGES[d.stage] || C.STAGES[0];
    setText(R.dpName, d.def.name);
    setStyle(R.dpName, 'color', elemColor(d.def.element, 0));
    setText(R.dpForm, form ? form.name : '');
    setText(R.dpStage, stage.name);

    var next = HH.sim.growth.nextStageXp(d);
    if (next == null) {
      setText(R.dpXpText, 'MAX'); setText(R.dpXpLbl, ''); setStyle(R.dpXpFill, 'width', '100%');
    } else {
      var lo = stage.xp, frac = next > lo ? Math.max(0, Math.min(1, (d.xp - lo) / (next - lo))) : 1;
      setText(R.dpXpText, Math.floor(d.xp) + ' / ' + next + ' XP'); setText(R.dpXpLbl, '');
      setStyle(R.dpXpFill, 'width', (Math.round(frac * 200) / 2) + '%');
    }

    var ik = d.id + '|' + d.instincts.join(',');
    if (ik !== cache.instKey) {
      cache.instKey = ik;
      while (R.dpInst.firstChild) R.dpInst.removeChild(R.dpInst.firstChild);
      if (!d.instincts.length) el('div', 'dp-form', R.dpInst, 'No Instincts yet');
      d.instincts.forEach(function (id) {
        var ins = HH.data.instincts[id];
        var chip = el('div', 'ichip', R.dpInst, ins ? ins.name : id);
        chip.title = ins ? ins.desc : '';
        chip.style.borderColor = elemColor(d.def.element, 1);
      });
    }

    setText(R.dpDmg, fmt(st.damage)); setText(R.dpAtk, fmt(st.attackSpeed)); setText(R.dpRng, Math.round(st.range || 0));
    setText(R.dpDealt, Math.floor(d.damageDealt || 0)); setText(R.dpKills, d.kills || 0);

    var capped = d.fedThisWave >= C.FEED_CAP;
    setText(R.dpFeedSub, 'Fed ' + Math.floor(d.fedThisWave) + ' / ' + C.FEED_CAP);
    var maxed = next == null;
    setText(R.dpFeedMain, maxed ? 'Max stage' : 'Feed +' + C.FEED_STEP + ' (F)');
    tog(R.dpFeed, 'dis', maxed || capped || g.gold < 1 || gameOver(g) || app.paused);
    setText(R.dpSellSub, '+' + HH.sim.sellValue(g, d.id) + ' gold');
    tog(R.dpSell, 'dis', gameOver(g) || app.paused);
    for (var ti = 0; ti < R.tgt.length; ti++) tog(R.tgt[ti].el, 'dis', app.paused);
    for (var i = 0; i < R.tgt.length; i++) tog(R.tgt[i].el, 'sel', d.targeting === R.tgt[i].mode);
  }

  function optionCard(id, kind, color) {
    var data = kind === 'evolution' ? HH.data.evolutions[id] : HH.data.instincts[id];
    var card = el('div', 'ocard', R.drCards);
    card.style.borderColor = color;
    var tag = el('div', 'ot', card, kind === 'evolution' ? 'Evolution' : 'Instinct');
    tag.style.color = color;
    el('div', 'on', card, data ? data.name : id);
    el('div', 'od', card, data ? data.desc : '');
    card.addEventListener('click', function () { sfx('click'); HH.sim.chooseOption(app.game, id); });
  }

  function updateDraft(g) {
    var ch = (app.screen === 'play' && !gameOver(g)) ? g.pendingChoices[0] : null;
    tog(R.draft, 'hide', !ch);
    if (!ch) { cache.draftKey = ''; return; }
    var key = ch.dragonId + '|' + ch.kind + '|' + ch.options.join(',') + '|' + (ch.rerollsUsed || 0);
    var d = findDragon(g, ch.dragonId), evo = ch.kind === 'evolution';
    if (key !== cache.draftKey) {
      cache.draftKey = key;
      var name = d ? d.def.name : 'Dragon', color = elemColor(d ? d.def.element : 'fire', 0);
      setText(R.drHead, evo ? name + ' is an Adult! Choose its Evolution (permanent)' : name + ' grew into a Juvenile! Keep 1 Instinct');
      setText(R.drSub, evo ? 'This choice cannot be changed.' : 'Pick the Instinct this dragon keeps forever.');
      while (R.drCards.firstChild) R.drCards.removeChild(R.drCards.firstChild);
      ch.options.forEach(function (id) { optionCard(id, ch.kind, color); });
      R.drReroll.style.visibility = evo ? 'hidden' : 'visible';
    }
    if (!evo) {
      var cost = HH.sim.growth.rerollCost(g);
      setText(R.drReroll, cost == null ? 'Reroll (none left)' : 'Reroll (' + cost + ' gold)');
      tog(R.drReroll, 'dis', cost == null || g.gold < cost);
    }
  }

  function updateEnd(g) {
    var show = app.screen === 'end';
    tog(R.end, 'hide', !show);
    if (!show) return;
    var won = g.state === 'won';
    setText(R.eTitle, won ? 'The Hoard is Safe!' : 'The Hoard was Plundered!');
    tog(R.eTitle, 'won', won); tog(R.eTitle, 'lost', !won);
    setText(R.eSub, (g.level.name) + ' · ' + g.diff.name);
    setText(R.eWaves, Math.max(0, g.waveIndex + 1) + ' / ' + g.totalWaves);
    setText(R.eCoins, g.hoard + ' / ' + g.hoardMax);
    setText(R.eKills, g.stats.kills);
    setText(R.eLeaks, g.stats.leaks);
    setText(R.eGold, Math.floor(g.stats.goldEarned));
  }

  // ---------- public API ----------
  U.init = function (a) {
    app = a; root = document.getElementById('ui');
    if (built) return;
    built = true;
    buildTopBar();
    buildSidebar();
    buildPause();
    buildDraft();
    buildEnd();
    buildMenu();    // last = on top
  };
  U.bind = function (game) {
    cache.previewKey = ''; cache.draftKey = ''; cache.instKey = ''; cache.game = game;
  };
  U.update = function (a) {
    if (!built) return;
    var g = a.game;
    tog(R.menu, 'hide', a.screen !== 'menu');
    if (!g) return;
    updateTop(g);
    updateShop(g);
    updatePanel(g);
    updateDraft(g);
    updateEnd(g);
    tog(R.pauseOv, 'hide', !(a.screen === 'play' && a.paused && !g.pendingChoices.length && !gameOver(g)));
  };
})(globalThis.HH);
