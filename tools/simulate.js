#!/usr/bin/env node
'use strict';
// Headless scripted-player simulation for Hatch & Hoard.
// Usage: node tools/simulate.js [easy|medium|hard|all] [--seed N] [--quiet]
// Report tool: always exits 0. Uses only the HH.sim facade plus read-only game state.

const HH = require('./load_sim');

const ALL_DIFFS = ['easy', 'medium', 'hard'];
const LEVEL_ID = 'meadow';
const BUILD_ORDER = ['ember', 'frost', 'venom', 'ember', 'venom', 'frost'];
const MAX_DRAGONS = 12;
const FEED_AMOUNT = 50;
const FEED_MIN_GOLD = 50;
const GRID_STEP = 20;
const GRID_X_MIN = 20, GRID_X_MAX = 1020;
const GRID_Y_MIN = 20, GRID_Y_MAX = 652;
const SCORE_RADIUS = 125;
const SAMPLE_STEP = 10;
const TICK_CAP = 60 * 60 * 60;
const STAGE_LETTERS = ['H', 'J', 'A'];
const USAGE = 'usage: node tools/simulate.js [easy|medium|hard|all] [--seed N] [--quiet]';

function parseArgs(argv) {
  const opts = { difficulty: 'all', seed: 1, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--quiet') {
      opts.quiet = true;
    } else if (a === '--seed' || a.startsWith('--seed=')) {
      const raw = a === '--seed' ? argv[++i] : a.slice('--seed='.length);
      const n = Number(raw);
      if (raw === undefined || !Number.isInteger(n)) throw new Error('--seed expects an integer');
      opts.seed = n;
    } else if (a === 'all' || ALL_DIFFS.includes(a)) {
      opts.difficulty = a;
    } else {
      throw new Error(`unknown argument "${a}"`);
    }
  }
  return opts;
}

// Grid spots that are placeable on a fresh game, best-covering the path first.
function candidateSpots(game) {
  const samples = game.path.samples(SAMPLE_STEP);
  const spots = [];
  for (let x = GRID_X_MIN; x <= GRID_X_MAX; x += GRID_STEP) {
    for (let y = GRID_Y_MIN; y <= GRID_Y_MAX; y += GRID_STEP) {
      if (!HH.sim.canPlace(game, x, y)) continue;
      let score = 0;
      for (const s of samples) {
        if (Math.hypot(s.x - x, s.y - y) <= SCORE_RADIUS) score++;
      }
      spots.push({ x, y, score });
    }
  }
  spots.sort((a, b) => b.score - a.score);
  return spots;
}

function runDifficulty(difficulty, seed, quiet) {
  const started = Date.now();
  const game = HH.sim.createGame({ levelId: LEVEL_ID, difficulty, seed });
  game.autoStart = true;
  const totalWaves = game.totalWaves;

  const leaksByWave = new Map();
  let totalLeaks = 0;
  let placed = 0;
  const spots = candidateSpots(game);

  const leaksFor = (idx) => leaksByWave.get(idx) || 0;
  const waveTag = (idx) => `W${String(idx + 1).padStart(2, '0')}/${totalWaves}`;
  const activeDragons = () => game.dragons.filter((d) => d.active);
  const formId = (f) => (typeof f === 'string' ? f : (f && (f.id || f.name)) || String(f));
  const stageTag = (d) => {
    const letter = STAGE_LETTERS[d.stage] || '?';
    return d.form ? `${letter}:${formId(d.form)}` : letter;
  };
  const describe = (idx) => {
    const dragons = activeDragons();
    return `leaks=${leaksFor(idx)} hoard=${game.hoard}/${game.hoardMax} gold=${game.gold} ` +
      `earned=${game.stats.goldEarned} dragons=${dragons.length} ` +
      `stages=${dragons.map(stageTag).join(',')} t=${Math.round(game.time)}s`;
  };

  game.events.on('enemyLeaked', (p) => {
    const w = p.enemy.wave;
    leaksByWave.set(w, leaksFor(w) + 1);
    totalLeaks++;
  });
  game.events.on('waveCleared', (p) => {
    if (!quiet) console.log(`[${difficulty}] ${waveTag(p.index)} ${describe(p.index)}`);
  });
  game.events.on('gameLost', () => {
    const idx = Math.max(0, game.waveIndex);
    if (!quiet) console.log(`[${difficulty}] LOST ${waveTag(idx)} ${describe(idx)}`);
  });

  // Place dragons in BUILD_ORDER while gold covers the next one. A candidate spot is
  // consumed on every attempt, so spots that canPlace rejects (or placement refuses) are skipped.
  function buildDragons() {
    while (placed < MAX_DRAGONS) {
      const type = BUILD_ORDER[placed % BUILD_ORDER.length];
      if (game.gold < HH.data.dragons[type].cost) return;
      let ok = false;
      while (!ok && spots.length) {
        const spot = spots.shift();
        if (!HH.sim.canPlace(game, spot.x, spot.y)) continue;
        ok = HH.sim.placeDragon(game, type, spot.x, spot.y) != null;
      }
      if (!ok) return;
      placed++;
    }
  }

  // Once the full roster is placed, spend gold on the lowest-xp dragon still under the feed cap.
  function feedDragons() {
    if (placed < MAX_DRAGONS) return;
    const cap = HH.data.config.FEED_CAP;
    while (game.gold >= FEED_MIN_GOLD) {
      let target = null;
      for (const d of game.dragons) {
        if (!d.active || d.fedThisWave >= cap) continue;
        if (!target || d.xp < target.xp) target = d;
      }
      if (!target) return;
      const before = game.gold;
      HH.sim.feedDragon(game, target.id, FEED_AMOUNT);
      if (game.gold === before) return; // no progress; avoid spinning
    }
  }

  // Juvenile instincts: first option. Adult evolutions: alternate forms by dragon id.
  function resolveChoices() {
    while (game.pendingChoices.length) {
      const c = game.pendingChoices[0];
      const opts = c.options;
      let pick;
      if (c.kind === 'evolution') {
        const idx = c.dragonId % 2;
        pick = opts[idx < opts.length ? idx : 0];
      } else {
        pick = opts[0];
      }
      HH.sim.chooseOption(game, pick);
      if (game.pendingChoices[0] === c) return; // unresolved; avoid spinning
    }
  }

  function driveWaves() {
    if (game.state === 'ready') HH.sim.startNextWave(game);
    if (game.nextWaveTimer >= 0 && !game.enemies.some((e) => e.active)) HH.sim.startNextWave(game);
  }

  let ticks = 0;
  while (game.state !== 'won' && game.state !== 'lost' && ticks < TICK_CAP) {
    buildDragons();
    feedDragons();
    resolveChoices();
    driveWaves();
    HH.sim.step(game);
    ticks++;
  }

  const verdict = game.state === 'won' ? 'WIN' : game.state === 'lost' ? 'LOSE' : 'TIMEOUT';
  const atWave = Math.max(0, game.waveIndex + 1);
  const wallMs = Date.now() - started;
  return `RESULT ${difficulty}: ${verdict} at wave ${atWave}/${totalWaves} hoard=${game.hoard} ` +
    `leaks=${totalLeaks} kills=${game.stats.kills} earned=${game.stats.goldEarned} ` +
    `simTime=${Math.round(game.time)}s wall=${wallMs}ms`;
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`${err.message}\n${USAGE}`);
    return;
  }
  const diffs = opts.difficulty === 'all' ? ALL_DIFFS : [opts.difficulty];
  for (const diff of diffs) {
    try {
      console.log(runDifficulty(diff, opts.seed, opts.quiet));
    } catch (err) {
      console.log(`RESULT ${diff}: ERROR ${err.message}`);
      console.error(err.stack);
    }
  }
}

main();
process.exitCode = 0;
