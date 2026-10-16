(function (HH) {
  'use strict';
  // wave = { groups:[{ type, count, interval (s), delay (s after wave start) }], hpMul? }
  // Groups run in parallel. Wave n has about 4 + 2n enemies; the final wave is ~1.6x the one before it.
  HH.data.waves = {
    meadow: {
      easy: [
        { groups: [{ type: 'peasant', count: 6, interval: 1.2, delay: 0 }] },
        { groups: [{ type: 'peasant', count: 8, interval: 1.0, delay: 0 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 4, interval: 0.5, delay: 3 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 6, interval: 0.5, delay: 2 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 4, interval: 0.5, delay: 2 }, { type: 'militia', count: 4, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 4, interval: 0.5, delay: 1 }, { type: 'militia', count: 6, interval: 1.0, delay: 4 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 6, interval: 0.5, delay: 1 }, { type: 'militia', count: 6, interval: 1.0, delay: 4 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 5, interval: 0.5, delay: 1 }, { type: 'militia', count: 5, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 4, interval: 1.2, delay: 6 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 6, interval: 0.5, delay: 1 }, { type: 'militia', count: 6, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 4, interval: 1.0, delay: 6 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 6, interval: 0.5, delay: 1 }, { type: 'militia', count: 6, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 6, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 6, interval: 0.5, delay: 1 }, { type: 'militia', count: 8, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 6, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 8, interval: 1.0, delay: 0 }, { type: 'scout', count: 6, interval: 0.5, delay: 1 }, { type: 'militia', count: 8, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 6, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 8, interval: 1.0, delay: 0 }, { type: 'scout', count: 8, interval: 0.5, delay: 1 }, { type: 'militia', count: 8, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 6, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 8, interval: 1.0, delay: 0 }, { type: 'scout', count: 8, interval: 0.5, delay: 1 }, { type: 'militia', count: 8, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 8, interval: 1.0, delay: 5 }] },
        // final wave: big push, all types (51)
        { groups: [{ type: 'peasant', count: 12, interval: 1.0, delay: 0 }, { type: 'scout', count: 12, interval: 0.5, delay: 0 }, { type: 'militia', count: 12, interval: 0.8, delay: 2 }, { type: 'shieldbearer', count: 15, interval: 0.8, delay: 4 }] }
      ],
      medium: [
        { groups: [{ type: 'peasant', count: 6, interval: 1.2, delay: 0 }] },
        { groups: [{ type: 'peasant', count: 8, interval: 1.0, delay: 0 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 4, interval: 0.5, delay: 3 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 6, interval: 0.5, delay: 2 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 4, interval: 0.5, delay: 2 }, { type: 'militia', count: 4, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 4, interval: 0.5, delay: 1 }, { type: 'militia', count: 6, interval: 1.0, delay: 4 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 4, interval: 0.5, delay: 1 }, { type: 'militia', count: 4, interval: 1.0, delay: 4 }, { type: 'shieldbearer', count: 4, interval: 1.2, delay: 6 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 5, interval: 0.5, delay: 1 }, { type: 'militia', count: 5, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 4, interval: 1.2, delay: 6 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 6, interval: 0.5, delay: 1 }, { type: 'militia', count: 6, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 4, interval: 1.0, delay: 6 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 6, interval: 0.5, delay: 1 }, { type: 'militia', count: 6, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 6, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 6, interval: 0.5, delay: 1 }, { type: 'militia', count: 8, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 6, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 8, interval: 1.0, delay: 0 }, { type: 'scout', count: 6, interval: 0.5, delay: 1 }, { type: 'militia', count: 8, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 6, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 8, interval: 1.0, delay: 0 }, { type: 'scout', count: 8, interval: 0.5, delay: 1 }, { type: 'militia', count: 8, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 6, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 8, interval: 1.0, delay: 0 }, { type: 'scout', count: 8, interval: 0.5, delay: 1 }, { type: 'militia', count: 8, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 8, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 8, interval: 1.0, delay: 0 }, { type: 'scout', count: 8, interval: 0.5, delay: 1 }, { type: 'militia', count: 10, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 8, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 8, interval: 1.0, delay: 0 }, { type: 'scout', count: 9, interval: 0.5, delay: 1 }, { type: 'militia', count: 10, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 9, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 8, interval: 1.0, delay: 0 }, { type: 'scout', count: 9, interval: 0.5, delay: 1 }, { type: 'militia', count: 10, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 11, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 10, interval: 1.0, delay: 0 }, { type: 'scout', count: 9, interval: 0.5, delay: 1 }, { type: 'militia', count: 10, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 11, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 10, interval: 1.0, delay: 0 }, { type: 'scout', count: 10, interval: 0.5, delay: 1 }, { type: 'militia', count: 10, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 12, interval: 1.0, delay: 5 }] },
        // final wave: big push, all types (67)
        { groups: [{ type: 'peasant', count: 16, interval: 1.0, delay: 0 }, { type: 'scout', count: 16, interval: 0.5, delay: 0 }, { type: 'militia', count: 16, interval: 1.0, delay: 2 }, { type: 'shieldbearer', count: 19, interval: 0.8, delay: 4 }] }
      ],
      hard: [
        { groups: [{ type: 'peasant', count: 6, interval: 1.2, delay: 0 }] },
        { groups: [{ type: 'peasant', count: 5, interval: 1.0, delay: 0 }, { type: 'scout', count: 3, interval: 0.5, delay: 3 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 4, interval: 0.5, delay: 2 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 3, interval: 0.5, delay: 2 }, { type: 'militia', count: 3, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 4, interval: 0.5, delay: 1 }, { type: 'militia', count: 4, interval: 1.0, delay: 4 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 4, interval: 0.5, delay: 1 }, { type: 'militia', count: 4, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 2, interval: 1.2, delay: 6 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 4, interval: 0.5, delay: 1 }, { type: 'militia', count: 4, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 4, interval: 1.2, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 5, interval: 0.5, delay: 1 }, { type: 'militia', count: 5, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 4, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 6, interval: 0.5, delay: 1 }, { type: 'militia', count: 5, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 5, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 6, interval: 0.5, delay: 1 }, { type: 'militia', count: 6, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 6, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 6, interval: 1.0, delay: 0 }, { type: 'scout', count: 6, interval: 0.5, delay: 1 }, { type: 'militia', count: 7, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 7, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 8, interval: 1.0, delay: 0 }, { type: 'scout', count: 6, interval: 0.5, delay: 1 }, { type: 'militia', count: 7, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 7, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 8, interval: 1.0, delay: 0 }, { type: 'scout', count: 7, interval: 0.5, delay: 1 }, { type: 'militia', count: 8, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 7, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 8, interval: 1.0, delay: 0 }, { type: 'scout', count: 8, interval: 0.5, delay: 1 }, { type: 'militia', count: 8, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 8, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 8, interval: 1.0, delay: 0 }, { type: 'scout', count: 8, interval: 0.5, delay: 1 }, { type: 'militia', count: 9, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 9, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 9, interval: 1.0, delay: 0 }, { type: 'scout', count: 9, interval: 0.5, delay: 1 }, { type: 'militia', count: 9, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 9, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 9, interval: 1.0, delay: 0 }, { type: 'scout', count: 9, interval: 0.5, delay: 1 }, { type: 'militia', count: 10, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 10, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 10, interval: 1.0, delay: 0 }, { type: 'scout', count: 9, interval: 0.5, delay: 1 }, { type: 'militia', count: 10, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 11, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 10, interval: 1.0, delay: 0 }, { type: 'scout', count: 10, interval: 0.5, delay: 1 }, { type: 'militia', count: 11, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 11, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 10, interval: 1.0, delay: 0 }, { type: 'scout', count: 11, interval: 0.5, delay: 1 }, { type: 'militia', count: 11, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 12, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 11, interval: 1.0, delay: 0 }, { type: 'scout', count: 11, interval: 0.5, delay: 1 }, { type: 'militia', count: 12, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 12, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 12, interval: 1.0, delay: 0 }, { type: 'scout', count: 12, interval: 0.5, delay: 1 }, { type: 'militia', count: 12, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 12, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 12, interval: 1.0, delay: 0 }, { type: 'scout', count: 12, interval: 0.5, delay: 1 }, { type: 'militia', count: 13, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 13, interval: 1.0, delay: 5 }] },
        { groups: [{ type: 'peasant', count: 13, interval: 1.0, delay: 0 }, { type: 'scout', count: 13, interval: 0.5, delay: 1 }, { type: 'militia', count: 13, interval: 1.0, delay: 3 }, { type: 'shieldbearer', count: 13, interval: 1.0, delay: 5 }] },
        // final wave: big push, all types (83), hpMul 1.15 (tuned from 1.3 with tools/simulate.js)
        { hpMul: 1.15, groups: [{ type: 'peasant', count: 20, interval: 1.0, delay: 0 }, { type: 'scout', count: 21, interval: 0.5, delay: 0 }, { type: 'militia', count: 21, interval: 1.0, delay: 2 }, { type: 'shieldbearer', count: 21, interval: 0.8, delay: 4 }] }
      ]
    }
  };
})(globalThis.HH);
