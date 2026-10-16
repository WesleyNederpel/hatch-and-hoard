(function (HH) {
  'use strict';
  // Synchronous event bus. One per game instance (game.events).
  HH.EventBus = function () {
    var map = {};
    return {
      on: function (name, fn) { (map[name] = map[name] || []).push(fn); },
      off: function (name, fn) { var l = map[name]; if (l) { var i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
      emit: function (name, data) { var l = map[name]; if (!l) return; for (var i = 0; i < l.length; i++) l[i](data); },
      clear: function () { map = {}; }
    };
  };
})(globalThis.HH);
