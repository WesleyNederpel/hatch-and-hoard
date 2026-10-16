(function (HH) {
  'use strict';
  HH.data.evolutions = {
    pyre_phoenix: { id: 'pyre_phoenix', dragon: 'ember', name: 'Pyre Phoenix', desc: 'Attacks fire much faster and hits also burn the nearest other foe.', mul: { attackSpeed: 1.6, projSpeed: 1.5 }, add: {}, set: {}, flags: { burnJump: true } },
    magma_drake: { id: 'magma_drake', dragon: 'ember', name: 'Magma Drake', desc: 'Hits are heavy lava blasts that leave a burning pool.', mul: { attackSpeed: 0.6, damage: 2.0 }, add: {}, set: { projectile: 'lava', aoe: 40 }, flags: { lavaPool: true } },
    glacier_wyrm: { id: 'glacier_wyrm', dragon: 'frost', name: 'Glacier Wyrm', desc: 'Shards burst in a freezing splash that chills everything nearby.', mul: {}, add: { auraSlow: 0.2 }, set: { aoe: 45 }, flags: {} },
    crystal_lancer: { id: 'crystal_lancer', dragon: 'frost', name: 'Crystal Lancer', desc: 'Long-range lances pierce every foe in line and hit frozen targets harder.', mul: { range: 1.35, damage: 2.0, attackSpeed: 0.8 }, add: { pierce: 99 }, set: { projectile: 'lance' }, flags: { frozenBonus: true } },
    plague_mother: { id: 'plague_mother', dragon: 'venom', name: 'Plague Mother', desc: 'Impacts leave a drifting poison cloud behind.', mul: {}, add: {}, set: {}, flags: { poisonCloud: true } },
    basilisk: { id: 'basilisk', dragon: 'venom', name: 'Basilisk', desc: 'Heavy venom hits, and wounded foes below 15% health are executed.', mul: { damage: 2.5, attackSpeed: 0.8 }, add: { execute: 0.15 }, set: {}, flags: {} }
  };
})(globalThis.HH);
