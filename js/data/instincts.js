(function (HH) {
  'use strict';
  HH.data.instincts = {
    hotter_flames: { id: 'hotter_flames', dragon: 'ember', name: 'Hotter Flames', desc: 'Burn damage per second is increased by 50%.', mul: { burnDps: 1.5 }, add: {}, set: {}, flags: {} },
    kindling: { id: 'kindling', dragon: 'ember', name: 'Kindling', desc: 'Attack range is increased by 20%.', mul: { range: 1.2 }, add: {}, set: {}, flags: {} },
    wildfire: { id: 'wildfire', dragon: 'ember', name: 'Wildfire', desc: 'A burning enemy that dies sets nearby enemies on fire.', mul: {}, add: {}, set: {}, flags: { wildfire: true } },
    melting_point: { id: 'melting_point', dragon: 'ember', name: 'Melting Point', desc: 'Burning enemies lose all armor while on fire.', mul: {}, add: {}, set: {}, flags: { meltingPoint: true } },
    flame_breath: { id: 'flame_breath', dragon: 'ember', name: 'Flame Breath', desc: 'Every fifth attack breathes a cone of fire that hits all foes in range.', mul: {}, add: {}, set: {}, flags: { flameBreath: true } },
    smoldering: { id: 'smoldering', dragon: 'ember', name: 'Smoldering', desc: 'Enemies can stack one more burn.', mul: {}, add: { burnMaxStacks: 1 }, set: {}, flags: {} },
    permafrost: { id: 'permafrost', dragon: 'frost', name: 'Permafrost', desc: 'Freeze lasts half a second longer.', mul: {}, add: { freezeDur: 0.5 }, set: {}, flags: {} },
    cold_snap: { id: 'cold_snap', dragon: 'frost', name: 'Cold Snap', desc: 'Each shard adds one extra chill stack.', mul: {}, add: { chillStacks: 1 }, set: {}, flags: {} },
    chill_aura: { id: 'chill_aura', dragon: 'frost', name: 'Chill Aura', desc: 'Enemies in range are slowed by 15%.', mul: {}, add: { auraSlow: 0.15 }, set: {}, flags: {} },
    brittle: { id: 'brittle', dragon: 'frost', name: 'Brittle', desc: 'Frozen enemies take extra damage.', mul: {}, add: {}, set: {}, flags: { brittle: true } },
    icicle_pierce: { id: 'icicle_pierce', dragon: 'frost', name: 'Icicle Pierce', desc: 'Shards pierce through two more enemies.', mul: {}, add: { pierce: 2 }, set: {}, flags: {} },
    whiteout: { id: 'whiteout', dragon: 'frost', name: 'Whiteout', desc: 'Attack range is increased by 10% and hidden foes are revealed.', mul: { range: 1.1 }, add: {}, set: {}, flags: { reveal: true } },
    potent_venom: { id: 'potent_venom', dragon: 'venom', name: 'Potent Venom', desc: 'Enemies can stack one more poison.', mul: {}, add: { poisonMaxStacks: 1 }, set: {}, flags: {} },
    acid_spit: { id: 'acid_spit', dragon: 'venom', name: 'Acid Spit', desc: 'Each hit permanently reduces enemy armor.', mul: {}, add: { armorShred: 0.25 }, set: {}, flags: {} },
    contagion: { id: 'contagion', dragon: 'venom', name: 'Contagion', desc: 'A poisoned enemy that dies spreads poison to nearby foes.', mul: {}, add: {}, set: {}, flags: { contagion: true } },
    neurotoxin: { id: 'neurotoxin', dragon: 'venom', name: 'Neurotoxin', desc: 'Poisoned enemies are slowed by 15%.', mul: {}, add: { poisonSlow: 0.15 }, set: {}, flags: {} },
    quick_fangs: { id: 'quick_fangs', dragon: 'venom', name: 'Quick Fangs', desc: 'Attack speed is increased by 25%.', mul: { attackSpeed: 1.25 }, add: {}, set: {}, flags: {} },
    siege_bane: { id: 'siege_bane', dragon: 'venom', name: 'Siege Bane', desc: 'Deals extra damage to armored enemies.', mul: {}, add: {}, set: {}, flags: { siegeBane: true } }
  };
})(globalThis.HH);
