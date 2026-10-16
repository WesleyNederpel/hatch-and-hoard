(function (HH) {
  'use strict';
  HH.data.dragons = {
    ember: {
      id: 'ember', name: 'Ember Drake', element: 'fire', cost: 200, hotkey: 1,
      base: { damage: 2, attackSpeed: 1.0, range: 140, projSpeed: 420, projectile: 'fireball', aoe: 0, pierce: 0,
        burnDps: 1.0, burnMaxStacks: 1, chillStacks: 0, freezeDur: 0, poisonDps: 0, poisonMaxStacks: 0,
        auraSlow: 0, poisonSlow: 0, armorShred: 0, execute: 0 },
      instincts: ['hotter_flames', 'kindling', 'wildfire', 'melting_point', 'flame_breath', 'smoldering'],
      forms: ['pyre_phoenix', 'magma_drake'],
      desc: 'Fire drake that scorches foes with burning fireballs.'
    },
    frost: {
      id: 'frost', name: 'Frost Wyrm', element: 'frost', cost: 250, hotkey: 2,
      base: { damage: 1, attackSpeed: 1.2, range: 130, projSpeed: 420, projectile: 'shard', aoe: 0, pierce: 0,
        burnDps: 0, burnMaxStacks: 1, chillStacks: 1, freezeDur: 1.0, poisonDps: 0, poisonMaxStacks: 0,
        auraSlow: 0, poisonSlow: 0, armorShred: 0, execute: 0 },
      instincts: ['permafrost', 'cold_snap', 'chill_aura', 'brittle', 'icicle_pierce', 'whiteout'],
      forms: ['glacier_wyrm', 'crystal_lancer'],
      desc: 'Ice wyrm whose shards chill enemies until they freeze solid.'
    },
    venom: {
      id: 'venom', name: 'Venom Wyvern', element: 'venom', cost: 250, hotkey: 3,
      base: { damage: 1, attackSpeed: 1.5, range: 120, projSpeed: 420, projectile: 'spit', aoe: 0, pierce: 0,
        burnDps: 0, burnMaxStacks: 1, chillStacks: 0, freezeDur: 0, poisonDps: 0.4, poisonMaxStacks: 4,
        auraSlow: 0, poisonSlow: 0, armorShred: 0, execute: 0 },
      instincts: ['potent_venom', 'acid_spit', 'contagion', 'neurotoxin', 'quick_fangs', 'siege_bane'],
      forms: ['plague_mother', 'basilisk'],
      desc: 'Venom wyvern that spits stacking poison which wears down armor.'
    }
  };
})(globalThis.HH);
