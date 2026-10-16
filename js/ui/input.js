(function (HH) {
  'use strict';
  // Mouse + keyboard input. Map interactions are ignored while the menu, a draft popup,
  // the pause overlay or the end screen is open (those overlays also sit on top of the canvas).
  var MAP_W = 1040, MAP_H = 672;

  function inMap(w) { return w.x >= 0 && w.x < MAP_W && w.y >= 0 && w.y < MAP_H; }
  function sfx(name) { try { HH.audio.play(name); } catch (e) { /* ignore */ } }

  HH.ui.input = {
    init: function (app) {
      var canvas = document.getElementById('game');
      var A = HH.ui.actions;

      window.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        var g = app.game;
        if (!g || app.screen !== 'play') return;
        var code = e.code;
        if (code === 'Space') e.preventDefault();
        if (e.repeat && code !== 'KeyF') return;

        if (code === 'KeyP') { if (!A.blocked(Object.assign({}, app, { paused: false }))) A.togglePause(app); return; }
        if (A.blocked(app)) return;

        if (code === 'Space') { A.startWave(app); }
        else if (code === 'KeyF') { A.feedSelected(app, e.shiftKey); }
        else if (code === 'Escape') {
          if (app.placing) app.placing = null; else app.selectedId = -1;
        } else if (/^(Digit|Numpad)[1-9]$/.test(code)) {
          var n = parseInt(code.slice(-1), 10), types = g.level.dragons;
          for (var i = 0; i < types.length; i++) {
            if (HH.data.dragons[types[i]].hotkey === n) {
              if (app.placing === types[i]) app.placing = null;
              else A.togglePlacing(app, types[i]);
              break;
            }
          }
        }
      });

      canvas.addEventListener('mousemove', function (e) {
        var w = app.toWorld(e.clientX, e.clientY);
        app.mouse.x = w.x; app.mouse.y = w.y; app.mouse.inMap = inMap(w);
        var g = app.game, cur = 'default';
        if (g && !A.blocked(app)) {
          if (app.placing) cur = 'crosshair';
          else if (inMap(w) && HH.sim.dragonAt(g, w.x, w.y)) cur = 'pointer';
        }
        if (canvas._cur !== cur) { canvas._cur = cur; canvas.style.cursor = cur; }
      });
      canvas.addEventListener('mouseleave', function () { app.mouse.inMap = false; });

      canvas.addEventListener('click', function (e) {
        var g = app.game, w = app.toWorld(e.clientX, e.clientY);
        if (!g || !inMap(w) || A.blocked(app)) return;
        if (app.placing) {
          var def = HH.data.dragons[app.placing];
          var d = HH.sim.placeDragon(g, app.placing, w.x, w.y);
          if (d) {
            sfx('place');
            // Shift keeps placing more of the same dragon while affordable
            if (!(e.shiftKey && def && g.gold >= def.cost)) app.placing = null;
            app.selectedId = app.placing ? -1 : d.id;
          } else {
            sfx('error');
            if (def && g.gold < def.cost) app.placing = null;
          }
        } else {
          var hit = HH.sim.dragonAt(g, w.x, w.y);
          app.selectedId = hit ? hit.id : -1;
          if (hit) sfx('click');
        }
      });

      canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        if (!A.blocked(app) && app.placing) app.placing = null;
      });
    }
  };
})(globalThis.HH);
