// Node helper: loads core + data + sim into globalThis.HH (same order as index.html).
// Usage: const HH = require('./load_sim');
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const files = [
  'core/namespace', 'core/rng', 'core/pool', 'core/events',
  'data/config', 'data/dragons', 'data/instincts', 'data/evolutions', 'data/enemies', 'data/waves', 'data/levels',
  'sim/path', 'sim/status', 'sim/growth', 'sim/economy', 'sim/enemies', 'sim/spawner', 'sim/projectiles', 'sim/dragons', 'sim/game'
];
for (const f of files) {
  const p = path.join(root, 'js', f + '.js');
  vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: p });
}
module.exports = globalThis.HH;
