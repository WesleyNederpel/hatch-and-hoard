(function (HH) {
  'use strict';
  // Seeded RNG (mulberry32).
  HH.RNG = function (seed) {
    var s = (seed >>> 0) || 1;
    function next() {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function int(n) { return Math.floor(next() * n); }
    function pick(arr) { return arr[int(arr.length)]; }
    function shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) { var j = int(i + 1), t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
      return arr;
    }
    return { next: next, int: int, pick: pick, shuffle: shuffle };
  };
})(globalThis.HH);
