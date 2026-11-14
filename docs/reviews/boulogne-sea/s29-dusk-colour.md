# Session 29 critique: colour and light at dusk

Critic: colour and light. Read-only on the code. I judged the production frames of commit 9372e8d (`.claude/s29/frames-9372e8d/`, the laptop's size, 1920×1080 device px): the hold at every tenth, and the rise at 0.1, 0.3 and 0.5. I compared them with the approved stage A frames in `docs/screenshots/scene-02/boulogne-sea/stage-a/`. My crops and the small measuring scripts are in `.claude/s29/critique/colour/` (git-ignored). Coordinates are device px of the 1920×1080 frame. Colours are sampled pixels, and their lightness is CIE L* (0 is black, 100 is white).

## Verdict

The idea is right, and much of it already works. The sky is the best part. Its bands are in the right order and read as sky, not stripes. The moon sits in the Earth's shadow band, which is the iconic image of a moonrise at dusk. The change is ordered from the water up and runs without a step. But the end state is not yet at the level of the golden painting. Every edge in the picture keeps a one-pixel line of the golden painting, which gives the whole dusk a cut-out, vector look. The lower half collapses into one grey-violet value, so the land, the strand and the far water merge. The water no longer mirrors the sky by the golden painting's own rule. Halfway through, the land goes through khaki and taupe without ever getting the low sun's orange light, which the project's own research says it must pass through. The Emperor's pavilion carries a glaring yellow smear. The clouds turn back into flat blobs with rims, the fault the owner called out in stage A.

Most of this can be fixed in the engine's terms. That means one compositing change, retuned grades (darkness from `keep`, not from the flat `mix`), one more graded raster for the land and the clouds, and a few changes to the lights and the moon. The golden painting at hold 0 is untouched. It matches the approved arrival frame, apart from the flotilla's spacing and the ensign on its staff.

## Must-fix

### 1. Every edge keeps a one-pixel golden outline (the crossfade composites wrongly)

- **Where.** Everywhere in the dusk end state (hold 0.6–1.0 and the rise):
  - **The cliff lip.** At (180, 524), the pixel is `#605b52`, L* 39, between neighbours of `#46424e`, L* 29: an olive-gold line along the grass edge and the camp's tiers (`rim-1.000.png`, `lcamp-1.000.png`).
  - **The strand's top edge.** A ruler-straight warm line at y = 666 runs the whole width of the frame: `#8d8075`, L* 54, between L* 38 and L* 40 (`seam-1.000.png`).
  - **Pale outlines on white buildings.** The pavilion and the semaphore post's huts (`pav-1.000.png`) and the gables of the town (`town-1.000.png`) carry pale outlines.
  - **Hill skylines.** There is a light rim on every hill skyline (`rhill-1.000.png`, `pillar-rise.png`).
  - **Clouds.** There is a pink rim round every cloud (`cu-1.000.png`, `lcloud-1.000.png`).
  - **Water.** The swell strips' crests are drawn as thin light contour lines at y ≈ 717, 752 and 780, across x 0–1100 (`water-1.000.png`).
  - **Rigging.** Every rope and stay stays warm tan across the grey hill and across the moon's aureole (`craft-1.000.png`, `moon-0.600.png`).
- **Why.** `BoulogneSea.tsx` sets the colour wrapper to `c` and the dusk wrapper to `c·k`, composited over it. At an anti-aliased edge of alpha `a`, normal over-compositing leaves `(1 − k·a)·a` of the golden raster under the dusk. At the end (`k = 1`) a half-covered pixel is still a third golden, and its alpha rises from 0.5 to 0.75. So lines get bolder as well as warmer. Thin things are almost all edge: rigging, cirrus, the strand's top and the water's crest lines. They keep the sun's colour after the sun has gone. The result reads as a cut-out with halos: cheaper than scene 1, and on the clouds the owner's "clip-art" fault comes back.
- **Fix.**
  - **Exact fix.** Crossfade each plate's pair as a true mix. Give the plate's wrapper `isolation: isolate`, give the dusk element `mix-blend-mode: plus-lighter`, and set the colour opacity to `c·(1 − k)` and the dusk opacity to `c·k`. This is the crossfade that View Transitions use. It is a blend mode, not a filter, and the result is the premultiplied mix with the alpha kept. Measure its cost on the laptop, because each blended group becomes a render surface.
  - **Cheaper fix.** If that is too expensive, keep normal compositing but fade the colour wrapper out at the end of each plate's own stretch: colour opacity `c·(1 − smoothstep(0.8, 1, k))`, and hide it at `k = 1`. In the plates' interiors this lets at most about 5 % of whatever lies behind show through during that tail. At the end the edges are clean.
  - **Not needed.** The sky (opaque) and the lights plates (dusk only) need neither change.
- **Check.** On a 10× crop across the cliff lip at (180, 520–528) and the strand's top at (1450, 660–670), no pixel stands more than 3 L* above its neighbours, and none has a yellow cast. On the crops, the rigging over the right hill reads darker than the hill, not tan.

### 2. The lower half collapses into one grey-violet, and the water stops mirroring the sky

- **Where (hold 1.0).**
  - **One value band.** The near cliffs are L* 29 (`#494250` at 300, 580). The near right hill is L* 31–33, the town L* 33–35 and the far hills about L* 37. The far water is L* 35–36 (`#58535c` at 700, 695), and the strand is L* 31–40 (`#605759`, `#675e5c`). The land, the strand and the far water all lie within about ±5 L*. The shore line, where land meets water, survives only as the leaking line of item 1.
  - **The drawing goes flat.** The spread of values inside each area falls to a third. The cliff face goes from 38 to 13 L*, the right hill's fields from 23.5 to 8, and the cumulus body's modelling from 8 to 3.5. The right hill reads as flat grey polygons with dark hedge lines (`rhill-1.000.png`), a vector map rather than a painting.
- **Why, by the painting's own logic.**
  - **The mirror rule.** In the approved golden frame, the far water is L* 69 under a horizon sky of L* 77: the far water returns about 0.85 of the sky it mirrors. At dusk, the sky band the far water mirrors is the Earth's shadow and the Belt of Venus, L* 47–62. By the same rule, the far water should be about L* 43–52, blue-grey at the strand and rose a little nearer.
  - **The water.** The water is darker than that. Its hue is a warm mauve-grey, not the shadow's blue-grey. The rose middle water that the comment on `WATER` promises is not there: at (700, 760) the water is `#3d4052`, a blue-violet.
  - **The strand.** The strand is wet sand: a mirror, as the owner's answer 2 says ("the sunset and the moon reflect in the wet sand"). It is graded like land and comes out brownish.
  - **The harbour channel.** The channel across the strand (720–780, 670–690), the golden painting's bright blue-white, is now dull.
  - **The structure.** Every dusk over water is built on one structure: a dark land between a luminous sky and its luminous reflection. That structure is gone.
  - **The flat tint.** The flat tint `mix` (0.32–0.5) flattens the drawing by its own share on top of `keep`, which is why the fields and the strata vanish.
- **Fix (`paint/dusk.ts`).**
  - **Water.** Lift the top of the `WATER` ramp (the far water, ramp stops −20 to −110) to `keep` 0.75–0.8, with `mix` about 0.3 toward the shadow's `#6c6d8c` at the strand and the belt's rose `#9c7f98` one band nearer. The deep blues near the eye stay as they are. The far water should land at L* 44–50.
  - **Strand.** Grade the strand as water, not as land: `keep` 0.7, a hue step toward `#8a7f9a` at 0.4, and `mix` 0.25. The result is a luminous sliver of L* 45–50 that separates the land from the water. Treat the channel the same way.
  - **Land.** Take the land's darkness from `keep`, which dims multiplicatively and keeps the drawing, not from `mix`:
    - Near land: `keep` about 0.36, `mix` 0.15. Target L* 24–30, darker than now.
    - Town: `keep` 0.42, `mix` 0.2. Target L* 32–36.
    - Far hills: `keep` 0.55, `mix` 0.3 toward the shadow band's `#6c6d8c`. Target L* 40–44, close to the band behind them, as the haze dictates.

  This restores aerial perspective: near dark, far pale.
- **Check (hold 1.0).** The far water and the strand stand at least 10 L* above the land behind them. The near land stands at least 8 L* below the far hills. Inside the right hill and the cliff face, p5–p95 spans at least 12 L*.

### 3. The Emperor's pavilion is a yellow smear

- **Where.** At hold 0.6–1.0, (507–553, 518–534), shifting with the drift; rise 0.1–0.3 likewise (`pav-1.000.png`, `lcamp-0.700.png`). Its peak is L* 87, `#fdd58a`, far brighter and more saturated than any other light: the town's windows have a median of L* 66 and a maximum of 78. Its glow is a horizontal capsule about 45 × 12 px that runs past the building's right end and onto the slope.
- **Why.** It reads as a comet or a rendering fault. It is the brightest thing on land and pulls the eye to the cliff top, away from the moon. Lamps behind windows give lit openings, not a streak of fire outside the walls.
- **Fix (`plates/index.ts` `LIGHTS`, the pavilion's site).**
  - Paint its lamps as its windows: discrete openings, with the same glow radius as the town's windows or smaller, so that neighbouring glows never merge.
  - Keep the core at L* 80 or below, in the same colour as the other lights.
  - Clip the glow to the building's outline plus 1–2 px.
  - The 70 % lit share can stay.

### 4. Halfway through, the land goes through khaki and taupe and never gets the last, orange light

- **Where.**
  - At hold 0.4, the cliffs average `rgb(127,111,103)` and the right hill `rgb(138,128,105)`, khaki.
  - At hold 0.5, they are `#6d5e5d` and `#665a56`, a brown-grey, L* 38–43, already darker than the sky (L* 61–65).
  - Meanwhile the cumulus stay cream-white (L* 68–74) until about 0.6, then fade through beige (`cu-0.600.png`).
- **Why.** On an even clock, halfway through the hold is about 19:09, with the sun about 2° up. Our own research (`light-and-watch.md` 1.4) says that below about 5° the light turns orange, and below about 2° it is orange-red: "the lit faces glow against a sky that is darker than them". The frames do the opposite. An opacity crossfade from gold to blue-violet passes through their grey mean, so the land dims like a dimmer switch, through mud. The most beautiful minutes of a summer evening are skipped:
  - the chalk turning salmon;
  - the shadow climbing the cliffs;
  - the clouds blazing rose after the land is in shade.

  With them gone, the cream clouds over a grey land read as two different hours.
- **Fix.** Add one more graded raster, the "last light", to the land plates (near land, town, far hills) and the clouds:
  - **How it is made.** It is built like the dusk raster from the colour raster: a hue step toward the low sun's orange-rose (for example `#e07a52` at amount 0.3–0.35), `keep` 0.85–0.9, and no flat `mix`.
  - **Order.** It is crossfaded in first. The dusk then comes in over it.
  - **Land timings.** Last light about 0.18–0.40, dusk 0.36–0.66.
  - **Cloud timings.** Last light, a salmon-rose, about 0.30–0.55; dusk 0.55–0.86. The clouds keep the light longest, as now.

  Gold to orange-rose, and rose to violet, are both neighbouring hues, so neither crossfade passes through grey. The terminator keeps its present order, water first and the high clouds last. It costs one more raster for those plates only (not the sky, the water or the craft). Measure the memory, 134 MB of canvases now, and the preparation slices. If memory forbids, do at least the clouds and the near land.

### 5. At dusk the clouds turn back into cut-outs (the owner's stage-A bug 6)

- **Where (hold 1.0).**
  - **The big cumulus** (1450–1920, 110–360). The body's median and 95th percentile are L* 52 and 55.5. In the golden frame they were 77.7 and 85.8, so the modelling of the domes against their shaded flanks has almost gone.
  - **The rims.** A pale pink rim runs along every outline (item 1).
  - **The cumulus's base.** Its shaded base is now a separate darker slab under a flat body.
  - **The left cloud** (510–1050, 150–225) is a flat mauve blob with light flecks scattered over it (`lcloud-1.000.png`).
- **Why.** The grade's hue step (0.45) and flat `mix` (0.5) flatten the modelling. The rims leak gold. After the sun leaves the clouds they are lit by the bright western sky behind the eye, a large, soft source. They keep their form softly. They do not lose it.
- **Fix (`CLOUD`).** Do this after item 1.
  - Set `hue.amount` 0.45 → 0.25, `mix` 0.5 → 0.25 and `keep` 0.6 → 0.5, so the cloud dims multiplicatively and keeps its modelling.
  - Make the tint ramp's high stop a rose (`#b48c9c`) and its low stop `#5e5a7a`. The tops facing up and west catch a last rose. The bases stay darker blue-violet than the body.
- **Check.** Inside the cumulus body, p50 to p95 spans at least 6 L* at hold 1.0. No rim is lighter than the cloud next to it.

## Should-fix

### 6. The moon has gone white and wears a bloom; its maria are dots

- **Where.**
  - **The disc.** At hold 1.0 the disc is `#f7efdf`, L* 95. In the golden frame it was `#f1e3c7`, L* 91. It got whiter and cooler.
  - **The aureole.** It is cool white: L* 64 two pixels outside the limb, and still 5 L* above the sky 35 px from the centre, about 2.7 times the radius (`moon-1.000.png`, `pillar-rise.png`).
  - **The maria.** They are five or six equal round grey dots, a biscuit rather than the moon (`moon-0.600.png`).
- **Why.**
  - The painting keeps the moon at its sunset place, 2° up with its lower limb on the skyline. `evening.md` 3: at that height it is warm, apricot to pink. It whitens only as it climbs, and the painting does not let it climb. Its colour should agree with the height at which we see it.
  - A wide, cool, smooth aureole reads as a glow effect, the "bloom" the brief forbids, rather than painted haze.
- **Fix (the moon's dusk raster, `plates/sky/moon.ts`).**
  - **The disc.** A warm pale gold (`#f3dcae` to `#f6e2b8`), flat, since the full moon has no limb darkening. Its lower edge is a touch warmer and softer (extinction).
  - **The aureole.** Warm (`#e2c3a0`), alpha 0.3 or less at the limb, and gone by 1.6 times the radius.
  - **The maria.** Soft-edged irregular patches, 10–15 % darker, in their real arrangement. The connected dark mass runs Imbrium–Serenitatis–Tranquillitatis–Fecunditatis, with Crisium a separate oval near the eastern limb. Tilt the face about 35–40° anticlockwise, as a moon rising in the east-south-east is seen from 50° N.

  It stays clearly brighter than the sky. That is the point of the dusk.

### 7. The moon's path reads as Morse code, and it vanishes at the rise's start

- **Where.**
  - **The glints.** At hold 1.0, about 35 visible glints lie in x 1265–1380, y 690–1060. Each is a hard dash 1–2 px tall in a grey-cream (`#d1c9ba` at most), spread evenly and sparsely. There is no denser root under the moon, and no sheen beneath the glints (`path-1.000.png`).
  - **The rise.** At rise 0.1 and 0.3 the path is gone while the moon stays at full brightness (`path-rise.png`). That is not one light.
- **Why.** On gently rippled water a low moon's path is narrowest and densest at the far water right under it, and it thins and spreads toward the eye. The glints carry the moon's colour. They sit on a faint, broken column of brighter water, not on nothing.
- **Fix (the glade, `GlitterRenderer`).**
  - **Density.** Weight it by depth: two to three times as many glints at the far water (y 690–780 under the moon), sparse near the eye.
  - **Length.** Shorter near the strand, longer near the eye.
  - **Colour.** The moon's warm cream.
  - **The sheen.** Add a painted sheen column as a water dusk job: about 20–40 px wide at the far water, widening to about 120 px at the bottom, 4–6 L* over the water and broken by the swell's strips. The glints sit on it.
  - **The rise.** Keep the path through the rise until the colour leaves (0.45). Anchor it to the sea's wrapper, clipped to the water, instead of to the moon's depression. The early exit is there only because the glade does not follow the water as the eye climbs.

### 8. The lights are uniform, beige and too many to be 1805

- **Where (hold 1.0).**
  - **The town.** The lower and upper town (620–1180, 555–655) hold about 87 lights. Their brightness spans only L* 60–72 from the 10th to the 90th percentile. Each has the same size and the same round halo. Their colour is a pale beige, `#dbbb8b` at most (`town-1.000.png`). The upper town's lights, twice as far, are as large as the lower town's.
  - **The right ridge.** The right camp's fires (1440–1920, y ≈ 560) are a regular row of beads along the skyline, like runway lights.
- **Why.**
  - At 19:45, still in civil twilight, few households in 1805 had lit candles. A tallow or wax flame behind glass is a deep amber, not cream.
  - Far lights should be smaller, dimmer and redder (aerial perspective applies to lights too).
  - Identical halos round every window read as fairy lights, and in haze as a glow filter.
- **Fix (`paint/lights.ts`, `LIGHTS`).**
  - **Shares.** Windows lit 20 % → about 10–12 % in the lower town and 6–8 % in the upper town.
  - **Brightness.** Vary it by hash, ±35 %.
  - **Colour.** Openings toward candle amber (core `#f2a656`, glow `#c86a2a`).
  - **Glow radius by distance.** The upper town's about half the lower town's. The far lights get no halo beyond twice the opening.
  - **Fires against windows.** Fires redder and flickering, windows steady.
  - **The ridge fires.** Cluster them in twos to fours with gaps, vary their size, and let some hide behind the crest.

  The left camp's lights in the dark tiers are already close to right (see "Keep").

### 9. The chalk loses its identity; the near faces take the wrong light

- **Where.** At hold 1.0 the cliff face (300, 580) is L* 29 and the grass cap above it (450, 500) is L* 32. The grass is lighter than the chalk, and the cliffs read as grey masonry. Everything on land takes one blue-violet.
- **Why.**
  - Everything we see faces west, toward the afterglow behind the eye. After sunset that afterglow is the brightest part of the sky.
  - Chalk (albedo about 0.6) and limewash facing it stay the lightest land long after the sun has gone. "The chalk holds the light" is the signature of these cliffs at dusk.
  - Grass caps and roofs face the darker sky overhead, so they go darker and cooler.
  - The blue-violet is the colour of the eastern sky in front of us. It belongs to the air between us and the far land (airlight, more with distance), not to the near faces themselves. The near faces want a dusky warm mauve.
- **Fix.** Use a lightness-keyed grade for the land: `keep` rising with the source pixel's lightness (for example `keep = 0.30 + 0.25·L`), or a split tint (lights toward a dusky rose-mauve `#7a6676`, darks toward `#2e2c48`). It can be computed in the preparation slices. Alternatively, give the cliff face its own grade from the shore painter. Near warm and far cool then adds depth by hue as well as by value.
- **Check.** At hold 1.0 the cliff face stands at least 6 L* above its grass cap.

### 10. The cirrus stay lit

- **Where.** At hold 1.0, the cirrus strokes (970–1920, 0–150; 620–930, 80–120) reach L* 65 against a sky of L* 30 (`cirrus-1.000.png`). In the golden frame they were 87 against 42.
- **Why.** With the sun 3.5° below the horizon, the Earth's shadow stands about 12 km over the eye and higher over the eastern sky, so even cirrus are out of the sun. They should be a grey-rose a little lighter than the sky. Lit, they draw the eye to the top-right corner and compete with the moon. Much of the brightness is item 1's leak, since the strokes are almost all edge.
- **Fix.** After item 1, check them. Aim for the cloud ramp's high stop at about L* 50, with the cirrus at L* 45–52.

### 11. Smoke columns read as light shafts; fire glows sit on the skyline

- **Where.**
  - **The right camp's column** (1478–1496, 440–560, hold 0.9–1.0) is a straight pale band.
  - **The Outreau column** rises right under the moon (rise 0.3: 1310–1345, 480–530) and reads as a light pillar from the moon (`pillar-rise.png`).
  - **The fires' orange glows** sit on the left skyline as soft blobs ((0–40, 230–280, 120–160), y 470–480), like a little sunset in the east.
- **Why.** At dusk, smoke against the bright belt and shadow band is a little darker than the sky. It is lighter only against the dark upper sky. It keeps its drift and its shape (the golden plumes bend and spread). A fire lights its own smoke from below.
- **Fix.**
  - Give `SMOKE_DUSK` a colour by height: below about y 520, a little darker than the band behind it.
  - Put a warm underlight on the lowest 10–20 px of each column over a lit fire.
  - Make the skyline glows smaller and tie each to the foot of a column.

## Keep

### 12. The sky

- **The bands.** At hold 1.0 the top is `#333d5e` (L* 26). The Belt of Venus, `#b18ca0` (L* 62), peaks at y ≈ 400–430. The Earth's blue-grey shadow, `#6c6d8c` (L* 47), lies below y ≈ 500. Even at four times the contrast, there is no banding (`skyband-stretch-1.000.png`).
- **The rise.** The shadow climbs as the raster rises: a fine idea, and it reads.
- **The title's corner** stays dark.
- **The moon** sits in the shadow band under the rose belt. This is the image the whole dusk exists for.

### 13. The order and the smoothness of the change

The golden stretch (0–0.25) is intact. The land changes over about 0.25–0.65, and the dusk end state (0.7–1.0) is long enough to read the caption over it. The water and the strand go first, the high clouds last. Every region's lightness changes monotonically, with no step between tenths. The golden frame at hold 0 matches stage A's approved arrival frame.

### 14. The left camp's lights

Small warm points among the dark tiers of huts make the camp read as lived in, which is exactly what the brief asks for (`lcamp-1.000.png`). The town under its lights also reads as a town. Keep the idea and refine it as in item 8.

### 15. The craft and the flags

- **The ensign.** Its white holds at L* 58 (from 94) and its reflection at L* 44, which is the right ratio. The tricolour still reads as cloth in the dusk. The pennant dulls to a deep red, as it should.
- **The hulls.** They read as dark shapes on the water, and their reflections stay crisp.

Once item 1 is fixed, the rigging will darken with the hulls.

### 16. The caption and the title

The caption lies over water of L* 9–24 at the end, and the title over sky of L* 26–30. White type on both is well above 4.5:1 (about 9:1 for the title). The moon's path stays clear of the caption.
