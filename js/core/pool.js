(function (HH) {
  'use strict';
  // Simple object pool. createFn() makes a fresh object; callers reset fields after acquire().
  HH.Pool = function (createFn) {
    var free = [];
    return {
      acquire: function () { return free.length ? free.pop() : createFn(); },
      release: function (obj) { free.push(obj); },
      size: function () { return free.length; }
    };
  };
})(globalThis.HH);
