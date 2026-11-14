# Session 29 critique: the dusk's progression through the hold

Critic: the progression (does each frame from hold 0 to 1 read as a moment of one evening, in a natural order, with no ugly middle and no steps; does the rise still work). Read-only. I judged the production frames of commit `9372e8d` in `.claude/s29/frames-9372e8d/` (1280×720 CSS at scale 1.5, so 1920×1080 px; hold 0.0–1.0 every 0.1, rise 0.1, 0.3, 0.5), against stage A's approved frames in `docs/screenshots/scene-02/boulogne-sea/stage-a/`, and the step measurement `.claude/s29/dusk-steps/dusk-steps.json` (every 0.02 of the hold, lab page, motion frozen). My crops and the region script are in `.claude/s29/critique/progression/` (git-ignored). Coordinates are px of the 1920×1080 frame. Colour numbers are CIE Lab means of a region (L lightness, C chroma, h hue angle), from `regions.mjs` there.

The lights have their own critic (`s29-dusk-lights.md`). Where we agree I point to that finding and add only what the progression shows.

## Verdict

The scroll is smooth: no frame jumps from its neighbour. The golden start is the approved painting, unchanged. The end is a real dusk: the Earth's shadow and the Belt of Venus over the land, a bright moon in the rose band, dark craft and the town's first lights. That end frame is the best new picture in the branch.

The way between them is not yet an evening. It is a dimmer turned slowly from the gold to a blue-violet grade.
- **The sunset itself is missing.** The light never turns orange and orange-red, the clouds never catch the last sun, the shadow never climbs the heights. The middle frames (0.4–0.5) are a crossfade between yellow-green and violet. It passes through khaki and brown-grey, the muddiest frames of the scene.
- **Every plate keeps a golden outline**, from the fade's middle to the hold's end. On the rise the gold comes back inside the plates too, as a ghost.
- **The big cumulus grows a dark jagged shelf under it.** That is the flat-bottomed cloud the owner rejected.

## Must fix

### 1. The evening skips the sunset and passes through a dead khaki grey (hold 0.35–0.55)

What the frames show. From 0.3 to 0.6 every land plate fades as a whole from its golden colour toward its blue-violet dusk. The hue swings across the neutral axis, so chroma collapses in the middle, to less than half of either end:
- **cliffs** (150–550 × 560–640): C 17.1 at 0.0, 8.6 at 0.4, 6.2 at 0.5, 10.5 at 1.0. The hue goes 75° → 53° → −10° → −55°.
- **right hills** (1650–1900 × 585–640): C 26.8 → 14.3 → **4.8** at 0.5 (hue 64°, khaki) → 9.1.
- **left camp** (100–500 × 480–520): C 18.5 → **4.3** at 0.5 → 9.1.
- **strand** (900–1000 × 650–668): C 17.3 → **4.7** at 0.5 → 9.1.
- **town**: C 13.0 → 6.9 at 0.5 → 11.1.

At 0.5 the Outreau fields are olive-khaki and the chalk cliffs a dirty beige-grey (crop `land-03-06.png`). That is neither sunlight nor shade, a state no real evening passes through.

Why it is wrong by the painting's own history. `light-and-watch.md` 1.4 gives the sequence: below 5° the direct light turns orange; below 2° it is orange-red and weaker, "and the lit faces glow against a sky that is darker than them"; after sunset the land loses its colour within minutes. The hold covers 18:33 to about 19:45, and sunset is at 19:26. So most of the evening the hold claims to show is the sun's last 50 minutes: the reddening, the glow, then a quick sunset on the land (the disc takes about 3–4 minutes to go, and the heights keep it 2–3 minutes longer than the shore). None of that is painted. The land goes straight from the 7° gold to the twilight grade over half the hold (`DUSK_AT.nearLand` 0.16–0.68). That is a 37-minute dimmer, not a sunset.

The clouds have the same gap. After the land is in shadow, the cumulus (2–3 km up) stays lit for 6–10 minutes and the cirrus (about 9 km) until the sun is about 3° down, which is the very end of the hold. They go orange-pink, then rose, then grey. In the frames the cumulus goes from cream (h 57°) to mauve-grey (h −38°), with only a faint pink passage at 0.6 (C 8.8). The cirrus barely change (finding 9).

How to fix it in the engine's terms. Give the land, craft and cloud plates a middle stage, an **afterglow raster**: the colour raster graded once more before the dive, like the dusk one, and crossfaded in between. Then the crossfades go golden → orange-red → violet. The hue travels round through red and rose, a chromatic path and the true one, instead of across grey.
- **Grades, a first pass.**
  - Land and craft: `hue { colour: "#c8643a", amount: 0.22 }`, `keep: 0.9`, tint `#e07a40`, `mix: 0.16` (the lit faces orange-red and a little dimmer, the shadows kept).
  - Clouds: `hue { "#e3907c", 0.35 }`, `keep: 1`, a ramp by height from `#d98a7a` low to `#f2a684` high, `mix: 0.3`.
  - The sky's own afterglow: the low eastern sky a little darker and rosier than the gold, so the lit faces glow against it (1.4's wording).
- **Timings, roughly.**
  - Afterglow over the colour: 0.20–0.40.
  - The dusk over the afterglow on the land, short and staggered from the water up: strand and harbour 0.40–0.52, cliffs and near land 0.42–0.55, the camps on top and the town 0.45–0.58, the far hills and Mont Lambert 0.48–0.62.
  - Clouds: afterglow 0.26–0.50, dusk 0.55–0.86, the low clouds first and the cirrus last.
- **Cost.** One more raster for each plate in those groups. At the laptop's size that is perhaps +30–40 MB on the 134 MB measured; measure it. Do it with finding 2's fix, or the outline leak doubles.

If memory forbids a third raster everywhere, give it to the near land, the town and the clouds first. Those carry the dead grey and the missing glow.

### 2. A golden outline at every plate's edge, growing through the fade and coming back on the rise

Agreed with `s29-dusk-lights.md` finding 2 (the rims). I verified the cause by number. At the clifftop's edge, pixel (470, 526) at hold 1.0 is (98, 93, 86) between neighbours (68, 66, 75) and (71, 67, 76). The golden pixel there is (171–178, 162–168, 113–114). The leak formula `a(1 − a)(C − B)` at a = 0.5 predicts (95, 91, 85). The light contours are the gold showing through at every antialiased edge:
- the clifftop and the slope, 440–720 × 500–660 (`rim.png`, `pavilion.png`);
- the lower town's gable row at about 960–1100 × 583 and the ramparts' top at about y 562 (`townsmoke.png`);
- the Outreau contours (`right-camp.png`);
- the pavilion and the white huts as wireframes;
- the harbour's masts staying pale (`harbour.png`);
- the cirrus strokes, which are almost all edge and so keep most of their white.

Through my lens two more things follow:
- **The rims build up through the fade.** The error is `k · a(1 − a)(C − B)`, so it grows with the dusk share and is worst exactly when the land has gone dark, from 0.6 to 1.0.
- **On the rise the gold comes back into the plates' bodies.** There the colour and the dusk wrappers both fall at `c`, and the result is `c·D + c(1 − c)·C + (1 − c)²·below`. At the middle of the colour's leaving, 25 % of the 18:33 painting reappears inside every plate. Rise 0.3 already shows furled sails and spars back to cream (`chaloupe-rise.png`, rightmost).

The mid-rise frames (0.35–0.46) were not shot, so I could not see the worst of it. The fix the lights critic gives covers both: colour opacity `c · (1 − smooth(0.85, 1, k))`, hidden at the floor, with evening = 1 on the rise. It needs checking on the rise's own frames (finding 6).

If the outline must also vanish *during* the fade, the exact operator is `mix-blend-mode: plus-lighter` on the dusk wrapper, with the colour at `1 − k`, inside an `isolation: isolate` wrapper per plate. It is a compositing operator, not a filter or a blur. It costs one offscreen group per plate while it fades, so measure it on the laptop budget before adopting it.

### 3. The cumulus grows a dark, jagged, flat-bottomed shelf (hold 0.5–1.0)

What the frames show (`cumbase.png`, 1450–1920 × 270–370). In the golden painting a soft blue-grey veil hangs under the big cumulus's base. It is nearly the colour of the sky behind it, so it melts away. At dusk the sky behind it turns to the Belt of Venus's rose, while the veil is graded by the cloud rule (dimmed and drawn toward mauve-grey). So it shows as a dark serrated band hanging under the cloud like a second, flat-bottomed layer, from 0.5 on. A pale lens-shaped hole opens in it at about (1708, 330) at 1.0.

The cumulus body also loses its modelling. Its light-to-shade range is compressed by `keep 0.6` and then halved by `mix 0.5` toward a near-flat tint, so at 1.0 it is one mauve-grey cut-out (`clouds.png`). That is the owner's bug 6 ("every cloud is clip-art: flat blobs with flat bottoms") coming back at the end of the hold.

Fix:
- **The veils.** Grade translucent sky elements (the cloud's base veil, the cirrus's soft body) toward the *dusk sky's own colour at their height* rather than toward a cloud tint: the `DUSK_RAMP` itself as the tint ramp, `mix` about 0.85, `keep` about 1. They then melt into the rose as they melted into the blue.
- **The body.** Keep its form: `keep 0.7`, `mix 0.25–0.3`, and let the hue step carry the colour. Put the light where the last light is: a rose top and a cool blue-grey belly, by the cloud's own height, not one flat value.
- **The hole at (1708, 330).** Find it in the cloud's colour raster's partial alpha, a leak through a gap in the veil.

### 4. The pavilion's lamps are a comet (hold 0.55–1.0)

Agreed with `s29-dusk-lights.md` finding 1. Through my lens: from 0.6 on, the brightest thing in the left half of every frame is a yellow streak with an arrow-shaped head, about 505–555 × 518–532. The eye goes to it before the moon. `evening.md` gives a ring of lamps round the paling "after dark". So these should be a row of separate small points, among the last lights, not the first.

### 5. At the hold's end a shroud crosses the moon (the owner's answer 3)

At hold 1.0 a dark shroud of the main topmast crosses the moon's disc on its left half, at about x 1316–1322 × 506–534 (`moon-end.png`, 6×). At 0.9 a line crosses it too. The approved stage-A end frame had the same crossing (`moon-stageA-end.png`), and `decisions.md` (session 29) says the moon now stands "whole … clear of both". The production frame says otherwise.

The owner asked that the moon at the end of the hold be seen whole. The end pose must hold the disc and its aureole clear of the shrouds over the whole roll range (±0.95°), not only at the studio's phase. Lengthen the drift's end a little, or check the clearance at the extremes of the roll.

Through my lens it also matters that from 0.7 to 0.85 the main topmast covers half the moon (`moon-late.png`, 0.8), just as `DUSK_AT.moon` brings it to its brightest. The moon passing behind the rigging is a fine piece of parallax, so keep it. But then the reader must be given the whole bright disc clear at the end, and today the end does not give it.

## Should fix

### 6. The rise from the dusk: shoot it and look at it

Rise 0.1 and 0.3 work well: the camera lifts over the dusk with its lights and moon, and the moon's path goes early, as it should. Rise 0.5 is the clean engraving. The frames between (0.35, 0.40, 0.44) were not shot, and they are where the dark violet painting (L about 30 on the land) crossfades into the cream paper (L about 85).

By the code, that middle carries the golden ghost of finding 2 as well as the mid-grey of a dark-to-light crossfade. Stage A's rise went gold → cream, two light warm states, and could not show this.

After finding 2's fix, shoot rise 0.36–0.46 every 0.02 and look. If the middle is grey and dead, two cures fit the engine:
- let the lights and the moon's aureole leave first, over rise 0.25–0.38;
- start the ink's paper under the dusk a little earlier (the `smooth(0.85, 1, c)` gate at 0.92), so the paper's warmth lifts the dusk before the dusk thins.

### 7. The water darkens before the sky it mirrors

`DUSK_AT.water` is 0.10–0.62; the sky is 0.14–0.80. At 0.5:
- the far water (620–1000 × 735–790) has done 88 % of its change (L 46.8 → 31.2, end 29.1);
- the middle water has done 89 %;
- the low sky over the town (620–1000 × 470–515) has done 48 % (L 72.6 → 63.4, end 53.5).

So from 0.4 to 0.6 the sea is a dark mirror under a still-bright sky. The water has no sun of its own to lose. Its value is the value of what it reflects: the land at its far edge, the sky above nearer in.

Give the water the sky's window, or a little behind it: water 0.16–0.80, strand with the near land. "From the water up" belongs to the sunlit land's shadow (finding 1), not to the sea.

### 8. The golden moment is short; the change is one long ramp

By the 0.02 measurement nothing moves until 0.14 (frame mean 110.3 → 110.2) and nothing after 0.86. So about 0.42 screens are fully golden and 0.42 fully dusk. But by 0.3 the land has visibly dimmed (L −6), so the gold *reads* only to about 0.22, while the dusk end reads from about 0.66 (the land done) to 1.0. The new state gets nearly twice the time of the approved one.

Shift the start of every window by +0.06 (water from about 0.16, land from 0.22), or adopt finding 1's timeline, which holds the gold to 0.20 and then spends 0.20–0.40 on a reddening that is still sunlight.

The shape matters as much as the length. A single smoothstep 0.52 wide reads as a slow fade. Real evenings go slowly (the light warming and weakening), then fast (the sun off the land in minutes), then slowly (the twilight deepening). Finding 1's staggered, shorter land dusk gives that rhythm.

### 9. The upper sky does not deepen, and the cirrus stay white

The sky in the upper left (100–480 × 120–360) goes only from L 45.5 to 42.7; its hue turns a little violet and that is all. `DUSK_RAMP` darkens only above about y 360 units, mostly out of the laptop's frame.

Twenty minutes after sunset the eastern sky at 25–40° is a clearly deeper blue than at sun +7°. The painting's strongest twilight device is the luminous band at the horizon held between a deep sky above and dark land below, and today that band is framed only from below.

Darken the ramp from about y 200 up: for example 240 `#6a678c`, 295 `#4a5278`, 360 `#343d62`, 448 `#232b47`. The title's corner gains contrast too.

Against that sky the cirrus (1100–1900 × 0–150) must choose:
- either still lit, rose-salmon (they are the last thing to lose the sun at 9 km, physically right at sun −3°);
- or grey and dim.

Today their brightest strokes go only from (176, 169, 174) to (162, 146, 155), a cold whitish lilac, the brightest thing in the upper half at 1.0. They read as left over from the afternoon. Partly that is finding 2's leak (thin strokes are all edge). The rest is their grade: give the cirrus plate its own dusk, rose (`#d89a9c` to `#c48c9c`), window 0.45–0.9.

### 10. The moon's path reads as a dotted line, and the dusk moon is too white for 2–5° up

From 0.7 to 1.0 the path is 20–30 thin horizontal dashes of the same shape, 4–20 px long and grey-white, in a column at 1290–1370 × 800–1060 (`glade.png`). There is no soft band of light under them, and few near the horizon. It reads as a broken rule, not moonlight on a swell.

For a moon 2–5° up and an eye 3 m above the water, a flat sea would mirror it about 3° below the horizon, about y 777, right under the chaloupe's hull. The swell spreads the glitter from the horizon to the frame's foot, densest round that line.
- Add a faint painted column under the glints on the glade's own canvas (infinite depth, so it does not drift): brightest just below the horizon, broken by the swell's strips.
- Double the glints and vary their length and brightness, more of them and smaller toward the horizon.
- Tint them the moon's colour.

That colour is the other point. At 2–5° altitude through summer haze the moon is a warm apricot-gold (air mass 10–15), and it whitens only well up. The dusk moon is painted cream-white (`#fffaee` core): its peak goes from (245, 235, 212) to (254, 248, 234). It should read *brighter* against the darker sky, as it does (the sky 45 px left goes from (195, 174, 172) to (125, 120, 141)), but stay warm. Use about `#ffeccb` at the core, `#f3d7a6` at the limb, and a warm aureole.

### 11. The lights: rhythm and strength

Agreed with `s29-dusk-lights.md` 4, 5, 7 and 8. Through my lens:
- **The right camp's skyline row** (1500–1900 × 555–565) is evenly spaced like runway lights (`right-camp.png`).
- **The glow halos say night.** They make every window a soft blob, while the sky (L 48–56 at the horizon) says civil twilight at sun −3°. Candlelight then barely outshines the sky.
- **The fires pulse together.** One opacity per fires plate, amplitude 0.22 at about 1–2 Hz, makes a whole hillside breathe in step. That is by the code; motion was not visible in stills.
- **The town's smoke turns into a pale straight-sided column** on the ramparts at about 1017–1025 × 555–590 from 0.7 on (`townsmoke.png`). At dusk it should stay a soft plume, no lighter than the air behind it.

### 12. The lights do not reflect in the wet strand

The owner wanted the sunset and the moon in the wet sand at low water. At dusk the town's and the harbour's lights would lie in it as short warm vertical streaks: few, soft, broken by the ripples. It is a cheap and telling addition to the strand's dusk raster, from the lights' own recorded sites, bank by bank.

### 13. The step check cannot see the grey

`dusk-steps.json` reports the worst step against the median step. The long flat stretches at both ends drive the median toward zero, so the ratios look alarming (land 6.4, town 8.6, water 7.3) though nothing jumps. The land's worst step, 5.47 at 0.46, is just the smoothstep's peak slope: 91.9 levels over 0.52 is 3.5 per 0.02, times 1.5, gives 5.3. Its neighbours (5.0, 5.4, 5.3, 5.2, 5.5, 4.9) run smoothly.

Measure instead:
- the second difference, a kink between neighbouring steps;
- the Lab chroma per region, which shows finding 1's grey dip that a mean RGB cannot.

## Keep

1. **The golden start is the approved painting.** Region means at hold 0.0 match stage A's `06-hold-0.00-arrival.png` within about 1.5 levels (the changes are the flotilla's).
2. **No steps.** Every region moves monotonically and smoothly at 0.02 resolution; the windows overlap, so no part of the picture changes alone.
3. **The Earth's shadow and the Belt of Venus.** At 1.0 the blue-grey band lies over the land (L 48, h −65°) under the rose band (h −28°), with the moon rising at their seam. It is right by 1.4 and it is the most beautiful new passage. Keep the shadow raster's rise as it comes in.
4. **The low small clouds turning dark against the bright belt** (460–860 × 385–400 at 1.0). Unlit clouds in front of a luminous twilight band are true and painterly.
5. **The lights come after the dark**: fires first, then windows, the near camp before the town. The town's warm points among violet roofs at 0.7–1.0 are a real gain. So is the fire's glow at the foot of the right camp's smoke.
6. **The moon brightens by contrast**, with a painted aureole and not a bloom. It stays where the owner put it.
7. **The smoke greying and the haze cooling** follow the land's window, so the air changes with the light.
8. **The end frame's composition**: the luminous band at the horizon, the moon in it, the dark hero craft against it, the caption reading better than at the start. Keep it as the target the middle frames must lead to.
9. **The rise from the dusk** (0.1–0.3): the lights and the moon ride up with the camera, and the path leaves early, as its geometry demands.
10. **Three screens for the hold.** The gold, the change and the dusk each need their stretch.
