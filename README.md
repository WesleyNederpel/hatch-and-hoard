# Hatch & Hoard

A browser tower defense game: hatch dragons along the road, raise them from Hatchlings into Adults, and stop greedy human armies from stealing your hoard. Everything is drawn and synthesized in code — no images, no audio files, no build step.

**Milestone M1:** Level 1 "Shepherd's Meadow" on Easy / Medium / Hard, three dragons (Ember Drake, Frost Wyrm, Venom Wyvern), Instinct drafts at Juvenile, Evolutions at Adult, status effects with Blight and Steam Burst combos.

## Play
Open `index.html` in a desktop browser (double-click works). Minimum 1280×720.

| Key | Action |
|---|---|
| 1–3 | Pick a dragon to place (Shift-click to keep placing) |
| Space | Start / call the next wave early |
| F | Feed the selected dragon 50 gold (Shift+F: max) |
| P | Pause |
| Esc / right-click | Cancel placing, deselect |

## Develop
- `SPEC.md` — the code contract: files, namespace, data shapes, events, numbers.
- `js/data/` — all balance data (dragons, instincts, evolutions, enemies, waves, levels, config).
- `js/sim/` — the simulation; runs in Node with no DOM.
- `js/render/`, `js/ui/`, `js/audio/` — canvas art, DOM UI, Web Audio effects.
- Headless balance test (needs Node):

```bash
node tools/simulate.js all --seed 1
```
