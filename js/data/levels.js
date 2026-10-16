(function (HH) {
  'use strict';
  HH.data.difficulties = {
    easy: { id: 'easy', name: 'Easy', waves: 15, hoard: 30, hpMul: 0.8, goldMul: 1.0 },
    medium: { id: 'medium', name: 'Medium', waves: 20, hoard: 20, hpMul: 1.0, goldMul: 1.0 },
    hard: { id: 'hard', name: 'Hard', waves: 25, hoard: 10, hpMul: 1.2, goldMul: 0.85 }
  };
  HH.data.levels = {
    meadow: {
      id: 'meadow', name: "Shepherd's Meadow", region: 'Emberglen', startGold: 600,
      dragons: ['ember', 'frost', 'venom'], pathWidth: 46,
      hpGrowth: { easy: 0.45, medium: 0.5, hard: 0.30 },
      waypoints: [[-40, 110], [780, 110], [880, 170], [880, 250], [820, 300], [220, 300], [150, 350], [150, 440],
                  [220, 490], [700, 490], [760, 540], [760, 600], [700, 630], [480, 630]],
      hoard: { x: 440, y: 630 }
    }
  };
})(globalThis.HH);
