(function (HH) {
  'use strict';
  // App state + game loop + screen flow (menu -> play -> end).
  var app = HH.app = { game: null, speed: 1, paused: false, muted: false, screen: 'menu', placing: null, selectedId: -1,
    mouse: { x: 0, y: 0, inMap: false }, endDelay: 0 };

  app.newGame = function (difficulty) {
    app.game = HH.sim.createGame({ levelId: 'meadow', difficulty: difficulty || 'medium', seed: (Date.now() % 100000) + 1 });
    app.paused = false; app.speed = 1; app.placing = null; app.selectedId = -1; app.endDelay = 0;
    HH.render.bind(app.game); HH.audio.bind(app.game); HH.ui.bind(app.game);
  };

  app.toWorld = function (clientX, clientY) {
    var rect = document.getElementById('game').getBoundingClientRect();
    return { x: (clientX - rect.left) * 1280 / rect.width, y: (clientY - rect.top) * 720 / rect.height - 48 };
  };

  function boot() {
    HH.render.init(document.getElementById('game'));
    HH.audio.init(); HH.ui.init(app); HH.ui.input.init(app);
    app.newGame('medium');          // background game behind the start menu
    app.screen = 'menu';
    var last = performance.now(), acc = 0, C = HH.data.config;
    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.1); last = now;
      var g = app.game;
      if (app.screen === 'play' && !app.paused) {
        acc += dt * app.speed; var steps = 0, maxSteps = C.MAX_STEPS_PER_FRAME * app.speed;
        while (acc >= C.DT && steps < maxSteps) { HH.sim.step(g); acc -= C.DT; steps++; }
        if (steps >= maxSteps) acc = 0;
        // game over -> short beat to see the last moment, then the end screen
        if (g.state === 'won' || g.state === 'lost') {
          app.endDelay += dt;
          if (app.endDelay >= 1.2) { app.screen = 'end'; app.placing = null; }
        }
      } else if (app.screen !== 'play') {
        acc = 0;
      }
      HH.render.draw(app, dt); HH.ui.update(app);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('load', boot);
})(globalThis.HH);
