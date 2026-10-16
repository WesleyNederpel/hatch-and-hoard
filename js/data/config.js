(function (HH) {
  'use strict';
  HH.data.config = {
    TICK_RATE: 60, DT: 1 / 60, SPEED_UNIT: 55, MAX_STEPS_PER_FRAME: 8,
    STAGES: [
      { name: 'Hatchling', xp: 0, size: 1.0 },
      { name: 'Juvenile', xp: 150, size: 1.15 },
      { name: 'Adult', xp: 450, size: 1.3 }
    ],
    STAGE_DAMAGE_MUL: 1.2, STAGE_RANGE_ADD: 0.05, STAGE_ATKSPD_ADD: 0.05,
    XP_PER_DAMAGE: 4, XP_HIT_CAP: 12, XP_PER_STATUS: 2, XP_PER_COMBO: 5, XP_WAVE_BONUS: 20,
    FEED_CAP: 300, FEED_STEP: 50, REROLL_COSTS: [50, 100, 200], DRAFT_SIZE: 3,
    SELL_HATCH_FRAC: 0.7, SELL_FED_FRAC: 0.5,
    WAVE_BONUS_BASE: 20, WAVE_BONUS_PER_WAVE: 4, WAVE_TIMER: 20, EARLY_CALL_MAX: 40,
    DRAGON_RADIUS: 22, HOARD_CLEAR_RADIUS: 60, PROJ_SPEED: 420,
    CHILL_SLOW: 0.30, CHILL_DUR: 2.5, FREEZE_STACKS: 5, MIN_SPEED_MUL: 0.25,
    BURN_DUR: 3, POISON_DUR: 4, POISON_ARMOR_PER_STACK: 0.10,
    BLIGHT_MUL: 1.5, STEAM_RADIUS: 50, STEAM_DMG_MUL: 1.5, BRITTLE_AMP: 0.25,
    SPREAD_RADIUS: 60, CONE_ANGLE: 60, CONE_EVERY: 5,
    LAVA_RADIUS: 35, LAVA_DUR: 3, CLOUD_RADIUS: 45, CLOUD_DUR: 4, CLOUD_DRIFT: 15, ZONE_PULSE: 0.5,
    COLORS: {
      outline: '#2B1D2E',
      fire: ['#FF7A2F', '#C2410C', '#FFD08A'],
      frost: ['#6FE3FF', '#2A9CC4', '#E8FBFF'],
      venom: ['#7ED957', '#3E9B2F', '#D4F7B0'],
      gold: '#FFC83D', grass: '#8FD16A', path: '#E2C48A'
    }
  };
})(globalThis.HH);
