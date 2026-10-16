# Hatch & Hoard — M1 SPEC (contract for all agents)

Browser tower defense. Plain JS + Canvas, no build, no external files. Opens by double-clicking `index.html`.
This file is the contract. Do not read any other design doc. If something is missing, choose the simplest option and report it.

## 1. Rules for all code
- Classic scripts, one global: every file is `(function (HH) { 'use strict'; ... })(globalThis.HH);`. No ES modules, no `import`.
- `js/core`, `js/data`, `js/sim` must never touch `window`, `document`, canvas or audio. They must run in Node (`vm.runInThisContext`).
- Sim never uses `Math.random`: use `game.rng` (drafts only) or `game.rng2` (all other sim randomness). Render/UI/audio may use `Math.random`.
- Sim never splices arrays mid-iteration: set `obj.active = false`; `HH.sim.compact(game)` (end of each step) removes inactive objects and releases them to their pools.
- Sim talks to render/UI/audio ONLY via `game.events.emit(name, payload)` (section 7) and by them reading state. Render/UI never mutate sim state except through the facade (section 6).
- Numbers live in `js/data/*`. Code reads `HH.data.config` (alias `C` below), never hardcodes balance numbers.
- Only edit the files your brief assigns. Keep every exported name in section 5 working (stubs exist for all of them).

## 2. Files and load order (index.html loads exactly this order; tools/simulate.js loads the first 3 groups)
```
js/core/namespace.js  rng.js  pool.js  events.js                     (core, done)
js/data/config.js  dragons.js  instincts.js  evolutions.js  enemies.js  waves.js  levels.js
js/sim/path.js  status.js  growth.js  economy.js  enemies.js  spawner.js  projectiles.js  dragons.js  game.js
js/render/particles.js  art_map.js  art_enemies.js  art_dragons.js  renderer.js
js/audio/sfx.js
js/ui/ui.js  input.js
js/main.js
tools/load_sim.js   (Node: require it to load core+data+sim into globalThis.HH, done)
tools/simulate.js   (Node only)
```
Namespace: `HH = { data:{}, sim:{}, render:{}, ui:{}, audio:{}, app:null }`. Core helpers: `HH.RNG(seed)` → `{next()∈[0,1), int(n), pick(arr), shuffle(arr)}` (mulberry32); `HH.Pool(createFn)` → `{acquire(), release(obj)}`; `HH.EventBus()` → `{on(name,fn), off(name,fn), emit(name,data), clear()}`.

## 3. Screen and coordinates
Stage 1280×720 (a fixed-size div scaled with CSS `transform` to fit the window, letterboxed). Top bar 48 px high. Right sidebar 240 px wide. Map viewport = 1040×672 at canvas (0,48). **World coords = map coords** (0..1040, 0..672); renderer translates by (0,48). Mouse → world: undo CSS scale, then subtract (0,48).
UI is HTML/CSS DOM overlaid on the stage (top bar, sidebar, popups). All game art is drawn on the canvas in code.

## 4. Data shapes (`js/data/*`)
### config.js → `HH.data.config`
```
TICK_RATE 60, DT 1/60, SPEED_UNIT 55 (px/s for enemy speed 1.0), MAX_STEPS_PER_FRAME 8
STAGES [{name:'Hatchling',xp:0,size:1.0},{name:'Juvenile',xp:150,size:1.15},{name:'Adult',xp:450,size:1.3}]   (M1 caps at Adult)
STAGE_DAMAGE_MUL 1.2 (per stage, compounding), STAGE_RANGE_ADD 0.05, STAGE_ATKSPD_ADD 0.05 (per stage, additive)
XP_PER_DAMAGE 4, XP_HIT_CAP 12, XP_PER_STATUS 2, XP_PER_COMBO 5, XP_WAVE_BONUS 20
FEED_CAP 300 (per dragon per wave), FEED_STEP 50, REROLL_COSTS [50,100,200], DRAFT_SIZE 3
SELL_HATCH_FRAC 0.7, SELL_FED_FRAC 0.5
WAVE_BONUS_BASE 20, WAVE_BONUS_PER_WAVE 4, WAVE_TIMER 20 (s), EARLY_CALL_MAX 40 (gold)
DRAGON_RADIUS 22, HOARD_CLEAR_RADIUS 60, PROJ_SPEED 420
CHILL_SLOW 0.30, CHILL_DUR 2.5, FREEZE_STACKS 5, MIN_SPEED_MUL 0.25 (unless frozen)
BURN_DUR 3, POISON_DUR 4, POISON_ARMOR_PER_STACK 0.10
BLIGHT_MUL 1.5, STEAM_RADIUS 50, STEAM_DMG_MUL 1.5, BRITTLE_AMP 0.25
SPREAD_RADIUS 60 (wildfire/contagion/burnJump), CONE_ANGLE 60 (deg), CONE_EVERY 5
LAVA_RADIUS 35, LAVA_DUR 3, CLOUD_RADIUS 45, CLOUD_DUR 4, CLOUD_DRIFT 15 (px/s, backwards along path), ZONE_PULSE 0.5 (s)
COLORS { outline:'#2B1D2E', fire:['#FF7A2F','#C2410C','#FFD08A'], frost:['#6FE3FF','#2A9CC4','#E8FBFF'],
         venom:['#7ED957','#3E9B2F','#D4F7B0'], gold:'#FFC83D', grass:'#8FD16A', path:'#E2C48A' }   ([main, shade, highlight])
```
### dragons.js → `HH.data.dragons[id]`
```
{ id, name, element:'fire'|'frost'|'venom', cost, hotkey,
  base:{ damage, attackSpeed, range, projSpeed, projectile, aoe:0, pierce:0,
         burnDps:0, burnMaxStacks:1, chillStacks:0, freezeDur:0, poisonDps:0, poisonMaxStacks:0,
         auraSlow:0, poisonSlow:0, armorShred:0, execute:0 },
  instincts:[6 ids], forms:[2 ids], desc }
```
| id | name | element | cost | dmg | atk/s | range | projectile | element extras |
|---|---|---|---|---|---|---|---|---|
| ember | Ember Drake | fire | 200 | 2 | 1.0 | 140 | fireball | burnDps 1.0 |
| frost | Frost Wyrm | frost | 250 | 1 | 1.2 | 130 | shard | chillStacks 1, freezeDur 1.0 |
| venom | Venom Wyvern | venom | 250 | 1 | 1.5 | 120 | spit | poisonDps 0.4, poisonMaxStacks 4 |
Hotkeys 1/2/3. A dragon applies burn if `burnDps>0`, chill if `chillStacks>0`, poison if `poisonDps>0`.

### instincts.js → `HH.data.instincts[id]` = `{ id, dragon, name, desc, mul:{}, add:{}, set:{}, flags:{} }`
| dragon | id | name | effect |
|---|---|---|---|
| ember | hotter_flames | Hotter Flames | mul burnDps 1.5 |
| ember | kindling | Kindling | mul range 1.2 |
| ember | wildfire | Wildfire | flag wildfire: burning enemy dies → burn enemies within SPREAD_RADIUS |
| ember | melting_point | Melting Point | flag meltingPoint: its burns set target armor to 0 while burning |
| ember | flame_breath | Flame Breath | flag flameBreath: every CONE_EVERY-th attack hits all enemies in a CONE_ANGLE cone out to range (damage + burn), no projectile |
| ember | smoldering | Smoldering | add burnMaxStacks 1 |
| frost | permafrost | Permafrost | add freezeDur 0.5 |
| frost | cold_snap | Cold Snap | add chillStacks 1 |
| frost | chill_aura | Chill Aura | add auraSlow 0.15 (enemies in range slowed) |
| frost | brittle | Brittle | flag brittle: enemies it freezes take +BRITTLE_AMP damage while frozen |
| frost | icicle_pierce | Icicle Pierce | add pierce 2 |
| frost | whiteout | Whiteout | mul range 1.1, flag reveal (no cloaked foes in M1) |
| venom | potent_venom | Potent Venom | add poisonMaxStacks 1 |
| venom | acid_spit | Acid Spit | add armorShred 0.25 (permanent, per hit, armor floor 0) |
| venom | contagion | Contagion | flag contagion: poisoned enemy dies → 2 poison stacks to enemies within SPREAD_RADIUS |
| venom | neurotoxin | Neurotoxin | add poisonSlow 0.15 |
| venom | quick_fangs | Quick Fangs | mul attackSpeed 1.25 |
| venom | siege_bane | Siege Bane | flag siegeBane: +50% vs armored, +100% vs siege (no siege in M1) |

### evolutions.js → `HH.data.evolutions[id]` = `{ id, dragon, name, desc, mul, add, set, flags }`
| dragon | id | name | effect |
|---|---|---|---|
| ember | pyre_phoenix | Pyre Phoenix | mul attackSpeed 1.6, projSpeed 1.5; flag burnJump (hit also burns 1 nearest other enemy within SPREAD_RADIUS) |
| ember | magma_drake | Magma Drake | mul attackSpeed 0.6, damage 2.0; set projectile 'lava', aoe 40; flag lavaPool (impact leaves lava zone) |
| frost | glacier_wyrm | Glacier Wyrm | set aoe 45 (splash damage + chill to all in radius); add auraSlow 0.2 |
| frost | crystal_lancer | Crystal Lancer | mul range 1.35, damage 2.0, attackSpeed 0.8; set projectile 'lance'; add pierce 99; flag frozenBonus (+50% vs frozen) |
| venom | plague_mother | Plague Mother | flag poisonCloud (impact leaves a drifting cloud zone) |
| venom | basilisk | Basilisk | mul damage 2.5, attackSpeed 0.8; add execute 0.15 (non-boss hit below 15% max HP dies) |

### enemies.js → `HH.data.enemies[id]` = `{ id, name, hp, speed, steals, reward, armor, radius, flying:false, splitInto:null|{type,count}, colors:{body,helmet,trim} }`
| id | name | hp | speed | steals | reward | armor | radius | notes |
|---|---|---|---|---|---|---|---|---|
| peasant | Peasant Raider | 3 | 1.0 | 1 | 4 | 0 | 10 | pitchfork, straw-colored |
| scout | Scout Rider | 6 | 1.8 | 1 | 5 | 0 | 12 | on a pony, fast |
| militia | Militia | 12 | 1.0 | 1 | 6 | 0 | 11 | splitInto {type:'peasant',count:2} |
| shieldbearer | Shieldbearer | 18 | 0.9 | 1 | 9 | 0.5 | 12 | big shield, armored |
Armor = fraction of direct/splash damage blocked. DoTs ignore armor.
Balance pass (Phase 4): HP is 3× the design doc values; hpGrowth retuned with tools/simulate.js. Hard grows slower per wave but has 25 waves, ×1.2 HP and a ×1.15 final wave, so its final wave is still the toughest.

### levels.js → `HH.data.difficulties`, `HH.data.levels`
```
difficulties: easy {name:'Easy', waves:15, hoard:30, hpMul:0.8, goldMul:1.0},
              medium {name:'Medium', waves:20, hoard:20, hpMul:1.0, goldMul:1.0},
              hard {name:'Hard', waves:25, hoard:10, hpMul:1.2, goldMul:0.85}   (goldMul also scales start gold)
levels.meadow = { id:'meadow', name:"Shepherd's Meadow", region:'Emberglen', startGold:600,
  dragons:['ember','frost','venom'], pathWidth:46, hpGrowth:{easy:0.45, medium:0.5, hard:0.30},
  waypoints:[[-40,110],[780,110],[880,170],[880,250],[820,300],[220,300],[150,350],[150,440],
             [220,490],[700,490],[760,540],[760,600],[700,630],[480,630]],
  hoard:{x:440,y:630} }
```
Enemy HP = def.hp × diff.hpMul × (1 + hpGrowth[diff] × waveIndex) × (wave.hpMul || 1).

### waves.js → `HH.data.waves.meadow = { easy:[15], medium:[20], hard:[25] }`
`wave = { groups:[ { type, count, interval (s between spawns), delay (s after wave start) } ], hpMul? }`. Groups run in parallel.

## 5. Game state (created by `HH.sim.createGame`) and modules
```
game = { levelId, level, difficulty, diff, seed, rng, rng2, events,
  tick, time, state:'ready'|'playing'|'won'|'lost', gold, hoard, hoardMax, autoStart:false,
  waveIndex:-1 (last started), totalWaves, nextWaveTimer:-1 (s; -1 = not running), nextWaveTimerMax,
  waves:[{index, spawnedAll, alive, groups:[{spawned, t}]}],   // started waves still being tracked
  path, enemies:[], projectiles:[], zones:[], dragons:[], pendingChoices:[],
  pools:{enemy, projectile, zone}, nextId, stats:{kills, leaks, goldEarned, leaksThisWave} }
enemy = { id, active, type, def, x, y, angle, dist, lane (px side offset, ±10), hp, maxHp, armor, wave,
  status:{ burn:null|{t,dps,stacks,melt,src}, chill:null|{stacks,t}, freeze:null|{t,brittle},
           poison:null|{stacks,t,dps,src}, shred:0, auraSlow:0, blight:false }, hitT (s since last hit), spawnT }
dragon = { id, active, type, def, x, y, stage, xp, form:null, instincts:[], targeting:'first'|'last'|'strong'|'close',
  cooldown, attackCount, targetId:-1, aim (rad), attackT (s since last attack), stats (from growth.computeStats),
  hatchCost, fedThisWave, fedTotal, damageDealt, kills, rerollsUsed }
projectile = { id, active, kind, x, y, vx, vy, speed, targetId, tx, ty, dragonId, damage, aoe, pierceLeft, hitIds:[], life }
zone = { id, active, kind:'lava'|'cloud'|'steam', x, y, dist, r, t, maxT, pulse, dragonId }
choice = { dragonId, kind:'instinct'|'evolution', options:[ids], rerollsUsed }
```
Module exports (all exist as stubs; owner phase in brackets):
- `HH.sim.path` [1b]: `build(waypoints)` → `{ length, pointAt(d)→{x,y,angle}, distTo(x,y)→px, samples(step)→[{x,y,d}] }`
- `HH.sim.enemies` [1b]: `spawn(game,type,dist,waveIdx)`, `update(game)`, `damage(game,enemy,amount,info)→dealt`, `kill(game,enemy,dragon)`, `find(game,id)`
  `info = { dragon|null, kind:'hit'|'splash'|'dot', element }`. damage(): amount × `status.damageMul` × (1 − effective armor for hit/splash) → hp; `growth.addCombatXp`; hitT=0; emit enemyHit; hp≤0 → kill(). kill(): emit enemyKilled, `economy.onKill`, `status.onDeath`, splitInto spawns at dist−6/+6, active=false, `spawner.onEnemyGone`.
  update(): status.update (DoTs), move dist += def.speed × SPEED_UNIT × `status.speedMul` × DT, set x/y/angle from path + lane; dist ≥ path.length → `economy.onLeak`, active=false, `spawner.onEnemyGone`.
- `HH.sim.spawner` [1b, wave-end rules 2e]: `update(game)`, `startNextWave(game)→bool`, `preview(game, index)→[{type,count}]`, `onEnemyGone(game, enemy)`
  Timer: when a wave finishes spawning, `nextWaveTimer = WAVE_TIMER` (if more waves remain). At 0: start next wave if `autoStart`, else hold at 0. Calling early pays `round(EARLY_CALL_MAX × timer/timerMax × goldMul)`. Wave 1 waits for the player (state 'ready' → 'playing'). A wave is cleared when spawnedAll && alive==0 → `economy.onWaveCleared`.
- `HH.sim.status` [2d]: `apply(game,enemy,kind,dragon,opts)` (kind 'burn'|'chill'|'poison'), `update(game,enemy)`, `speedMul(game,enemy)`, `damageMul(game,enemy,info)`, `effectiveArmor(enemy)`, `onHit(game,enemy,dragon,hit)`, `onDeath(game,enemy)`, `updateZones(game)`
- `HH.sim.projectiles` [2d]: `fire(game,dragon,target)`, `update(game)`
- `HH.sim.dragons` [2d]: `canPlace(game,x,y)`, `place(game,type,x,y)→dragon|null`, `update(game)`, `sell(game,id)→refund`, `setTargeting(game,id,mode)`, `find(game,id)`, `at(game,x,y)→dragon|null`
- `HH.sim.economy` [2e]: `addGold(game,amt,reason)`, `spend(game,amt)→bool`, `onKill(game,enemy,dragon)`, `onLeak(game,enemy)`, `onWaveCleared(game,idx)`, `sellValue(game,dragon)`, `feed(game,dragon,amt)→fed`, `checkEnd(game)`
- `HH.sim.growth` [3f]: `computeStats(dragon)`, `addXp(game,dragon,amt,source)`, `addCombatXp(game,dragon,dealt)`, `addStatusXp(game,dragon)`, `addComboXp(game,dragon)`, `nextStageXp(dragon)→number|null`, `onWaveStart(game)`, `choose(game,optionId)`, `reroll(game)→bool`, `rerollCost(game)→number|null`

## 6. Facade (`js/sim/game.js`) — the ONLY sim API render/UI/simulate.js call
`HH.sim.createGame({levelId:'meadow', difficulty, seed})`, `HH.sim.step(game)` (one tick; no-op when state is won/lost or `pendingChoices.length>0`),
`HH.sim.compact(game)`, `placeDragon(game,type,x,y)`, `canPlace(game,x,y)`, `sellDragon(game,id)`, `feedDragon(game,id,amt)`, `setTargeting(game,id,mode)`,
`startNextWave(game)`, `chooseOption(game,optionId)`, `rerollDraft(game)`, `wavePreview(game,index)`, `sellValue(game,id)`, `dragonAt(game,x,y)`.
Step order: spawner.update → enemies.update → dragons.update → projectiles.update → status.updateZones → economy.checkEnd → compact.

## 7. Events (`game.events`, synchronous)
`enemySpawn{enemy}` `enemyHit{enemy,dmg,dragon,kind}` `enemyKilled{enemy,x,y,reward,dragon}` `enemyLeaked{enemy,steals}`
`dragonPlaced{dragon}` `dragonSold{dragon,refund}` `dragonAttack{dragon,target}` `projectileHit{proj,x,y}`
`statusApplied{enemy,kind,dragon}` `freeze{enemy}` `combo{kind:'blight'|'steam',enemy,x,y}` `zoneSpawn{zone}`
`stageUp{dragon,stage}` `choiceReady{choice}` `choiceResolved{dragon,kind,optionId}` `feed{dragon,amount}`
`waveStart{index,early,bonus}` `waveCleared{index,bonus}` `gold{gold,delta,reason}` `hoard{hoard,delta}` `gameWon{}` `gameLost{}`

## 8. Combat rules (M1)
- Targeting: active enemies with distance ≤ range + enemy radius. first=max dist, last=min dist, strong=max hp, close=nearest. Re-pick every attack. `aim` = angle to target.
- Attack when cooldown ≤ 0 and a target exists: projectile (homing; if target dies, fly to last pos and expire) ; cooldown = 1/attackSpeed. 'lance' = fast straight line through enemies (pierce). aoe>0 → splash all within aoe at impact (kind 'splash').
- Burn: dps=stats.burnDps, BURN_DUR, re-hit refreshes; stacks up to burnMaxStacks (each hit adds a stack, dps × stacks). melt=meltingPoint flag.
- Chill: +chillStacks per hit, CHILL_SLOW slow, CHILL_DUR refresh; at FREEZE_STACKS → freeze for freezeDur (speed 0), stacks reset; no chill while frozen.
- Poison: +1 stack per hit up to poisonMaxStacks, stack dps=poisonDps, POISON_DUR refresh; −POISON_ARMOR_PER_STACK armor per stack.
- Effective armor = 0 if burn.melt, else max(0, armor − poisonStacks×POISON_ARMOR_PER_STACK − shred).
- Slows multiply: (1−CHILL_SLOW if chilled)(1−auraSlow)(1−poisonSlow if poisoned), floored at MIN_SPEED_MUL; frozen = 0.
- Combos: **Blight** = burn && poison on the same enemy → both DoTs × BLIGHT_MUL (emit combo once when it starts). **Steam Burst** = fire hit on a chilled or frozen enemy → splash STEAM_DMG_MUL × hit damage in STEAM_RADIUS, removes chill/freeze from target, emits combo + spawns a short 'steam' zone (visual, 0.6 s).
- Assist XP: each status application → growth.addStatusXp; combo → growth.addComboXp to triggering dragon. DoT damage gives XP to its src dragon.

## 9. Growth, economy, waves
- XP: combat `min(dealt×XP_PER_DAMAGE, XP_HIT_CAP)` per hit; status XP; wave bonus XP_WAVE_BONUS to every dragon on wave cleared; feed 1 gold = 1 XP.
- Stage up when xp ≥ STAGES[stage+1].xp (max Adult). Juvenile → queue instinct choice (3 random from the 6-card deck minus taken, via game.rng). Adult → queue evolution choice (def.forms). One stage at a time; queued choices resolve in order.
- Reroll (instinct only): REROLL_COSTS[rerollsUsed], max 3 per draft. computeStats: base → stage (dmg×1.2^stage, range/atkspd +5%/stage) → evolution → instincts (mul, then add, then set; flags merged). Recompute on stage/choice.
- Feed: amt = min(amt, gold, FEED_CAP − fedThisWave). fedThisWave resets on waveStart.
- Gold: kill reward × goldMul (rounded); wave cleared → (WAVE_BONUS_BASE + WAVE_BONUS_PER_WAVE×(idx+1)) × goldMul; early call bonus; sell = floor(SELL_HATCH_FRAC×hatchCost + SELL_FED_FRAC×fedTotal). Hatching costs def.cost on all difficulties.
- Leak: hoard −= def.steals. hoard ≤ 0 → state 'lost', emit gameLost. All waves started + all cleared + hoard>0 → 'won', emit gameWon.
- Selling a dragon removes its pending choices.

## 10. App, render, UI, audio
- `HH.app` (main.js) = `{ game, speed:1|2, paused, muted, screen:'menu'|'play'|'end', placing:null|type, selectedId:-1, mouse:{x,y,inMap}, newGame(difficulty), toWorld(clientX,clientY) }`.
  Loop: rAF; `acc += min(dt,0.1)*speed`; while `acc ≥ DT` and steps < MAX_STEPS_PER_FRAME×speed: `HH.sim.step`; then `HH.render.draw(app, dt)`; `HH.ui.update(app)`.
- `HH.render`: `init(canvas)`, `bind(game)` (subscribe to events for particles), `draw(app, dt)`. Draw order: grass+decor, path, hoard pile (shrinks with hoard/hoardMax), zones, enemy shadows, enemies + dragons sorted by y, projectiles, particles, range circle (selected/placing, red if !canPlace), floating texts.
  Art modules: `HH.render.artMap.drawBackground(ctx, level)` (cache to offscreen canvas) / `drawHoard(ctx, level, frac, t)`; `HH.render.artEnemies.draw(ctx, enemy, t)`; `HH.render.artDragons.draw(ctx, dragon, t, opts)`; `HH.render.particles` = `{ spawn(kind,x,y,opts), update(dt), draw(ctx) }` pooled.
- `HH.ui`: `init(app)`, `bind(game)`, `update(app)`. `HH.audio`: `init()`, `bind(game)`, `play(name)`, `setMuted(bool)`.
- Keys: Space start wave, F feed selected (FEED_STEP), Esc cancel placing / deselect / close nothing else, 1–3 pick dragon to place. Shift+Feed = feed max.
- Style: bold dark outlines (COLORS.outline, 2.5–3 px), flat fills with one shade + one highlight, chunky rounded shapes, big eyes.
