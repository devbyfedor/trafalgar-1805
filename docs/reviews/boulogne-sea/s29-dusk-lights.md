# Session 29 critique: the lights at dusk

Critic's lens: the lights. That means the windows and doors in the town and the camps, the kitchens' fires glowing behind the crests, and the lamps round Napoleon's pavilion at the Tour d'Odre. This is a read-only review of the production build of commit 9372e8d. The frames are in `.claude/s29/frames-9372e8d/` (the laptop's 1280×720 at scale 1.5, so 1920×1080 device px). I compared them with the approved stage A frames. Crops, zooms and the small measuring scripts (`blobs.mjs`, `sample.mjs`, `orphans.mjs`) are in `.claude/s29/critique/lights/`, which is local scratch. Coordinates below are device px in the 1920×1080 frames. The camera drifts through the hold, so a place moves by a few px between frames.

Not judged here: the grades of the land, sky and water, the moon and its path, the flag. Finding 2 touches the grades only where they make light that cannot be there.

## Verdict

The system behind the lights is sound and must be kept. Each painter records its light sites in paint order, along with the shapes that hide them. In the town and the right camp the openings sit where light can be: on gable walls and under eaves, never on a roof plane, never through a hull or a mast. The banks come up without a step. Between hold 0.6 and 0.9 the count of lit cores I measured rises 0 → 22 → 62 → 82 in the town.

How the lights are drawn is not at the bar yet. One light, the pavilion's lamps, reads as a lens flare. Every plate edge carries a thin golden rim of the vanished sun. Every opening wears a soft painted bloom. So at 1:1 the end of the hold reads as a pattern of glowing dots and outlines, not a camp and a town at candle-light twenty minutes after sunset. All of this can be fixed in the engine's own terms without touching the approved painting.

## Must fix

### 1. The pavilion's lamps are one comet-shaped flare, the second-brightest thing in the picture

Where: `sea-hold-1.000`, box 500–555 × 518–534. The same in 0.700, 0.800, 0.900 and on the rise (`sea-rise-0.300`, about 505–550 × 475–490). Zoom: `z-pav.png` (10×), against gold in `z-pav-gold.png`.

What I see is a solid horizontal bar of yellow glow about 50 px long and 10 px tall, its core saturated. It lies across the pavilion's front and runs past it to the right like a streak. It is one connected blob of about 276 px. Every other light in the frame is a blob of 2–5 px. Its peak luminance is 0.70. The moon's disc is 0.94, the brightest town window 0.53, the sky at the horizon 0.23–0.25. So the eye goes to it before the moon, and it reads as an anamorphic lens flare, which the brief forbids.

It also comes up first and alone. Its bank is 0.46–0.66 and nothing else is lit by then. So from about 0.55 to 0.65 of the hold the only light in the picture is this flare, over a cliff still a third golden (`h0.600-left.png`).

Why, in the code (`plates/shore/cliffs.ts`, `pavilion`):
- `many = round(hypot(52, 52) / (1.3 * BUILD))` gives 29 lamps, one every 2.6 units, along the mound's 73.5 m arch.
- `paint/lights.ts` gives each lamp a core of at least 1.3 px and a glow of `max(w, h) * 2.6 + pen(2.2)`, about 5.6 px in radius, at 0.3 alpha.
- Projected, the 29 lamps sit about 1.5 px apart, so about eight glows overlap at every point and saturate into one bar.
- They are recorded after the pavilion's occluder, "in front of all of it". So the lamps on the far side of the paling are painted over the building too, and the pavilion's own lit windows (the 70 % licence) disappear under the bar.

Spacing and history: the research itself doubts the "four feet" spacing (`camps-check.md` items 4 and 75: about 60 lamps round an 80 m paling is hard to believe; "a ring of lights at dusk is safe"). The bar takes the spacing that the research calls doubtful, and loses the ring that it calls safe.

Fix:
- Use 7–9 lamps, one every 8–9 m of the arch (`1.3 * BUILD` → about `4.2 * BUILD`), with a small jitter in spacing from the seed.
- Draw only the seaward half (the lamps with `cos(a) < 0.2`). From sea level, 50 m below the brow, the far side of the paling is hidden by the ground and the building.
- Record the pavilion's hull occluder again after any lamp that stands behind it, so no lamp is painted over the building.
- In `paintSite`, for a lamp: glow factor 2.6 → 1.2, `pen(2.2)` → `pen(0.8)`, glow alpha 0.3 → 0.14, core `#ffe2a4` → `#ffc066` at 0.85.
- Target: separate pinpoints at least 4 px apart, a small necklace round a pale building on the cliff top, peak luminance no higher than the brightest window (about 0.4 after finding 5).

Keep the 70 % licence on the windows: the rotunda's lit windows must show once the bar is gone. Keep the lamps among the first lights, but see finding 8 for when.

### 2. A golden rim of the vanished sun outlines every plate at dusk

Where: `sea-hold-1.000` and 0.800, at 1:1 (strip `z-fringe-full.png`):
- the cliff's crest and the slope down to the harbour, 600–720 × 560–660 (`z-slope.png`, 6×);
- the top of the right camp's near tier, 0–330 × 491–498 (`z-orphans-north.png`, 8×), a warm beaded rim that reads as a row of glows on the hut roofs;
- the lower town's roofline against the upper town, a pale zigzag at 880–1080 × 572–583 (`z-town-mid.png`);
- the contours of the Outreau heights and their fields, 1150–1920 × 550–640;
- the pavilion and the white huts on the cliff top, turned into pale wireframes (`z-pav.png`).

Through my lens this is light where none can be: a sunlit rim surviving twenty minutes after sunset. It reads as neon contour lines, it competes with the real lights, and it makes the dusk look like a cheaper print of the gold.

The cause is plain in `BoulogneSea.tsx` (lines 406–426). During the hold the colour canvas stays at full opacity (`colourOpacity = c`) and the dusk canvas, above it in the DOM, comes in at `c * k`. At a plate's antialiased edge, where alpha is `a`, the stack at k = 1 lets the colour raster through by `a(1 − a)`, and the edge's total alpha grows from `a` to `a(2 − a)`. So the golden edge pixel stays partly golden and becomes thicker and more opaque than it was. Inside the plate (a = 1) nothing shows, which is why only outlines appear.

Fix: fade each plate's colour raster out under its finished dusk, for example colour opacity `c * (1 − smooth(0.85, 1, k))`, and hide it once it reaches the floor. In that last stretch an inner pixel's total alpha is `k + (1 − k) · colour` ≥ 0.97, and the two rasters are nearly the same there, so nothing shows. At k = 1 only the dusk raster is left, with its own edges. As a bonus, the GPU stops drawing a full extra layer per plate during the dusk at the end of the hold.

Check: in the studio, the dusk raster alone at share 1, over a flat mid-grey.

### 3. Every opening wears a painted bloom, and hidden lights leave their glow behind

Where: the town in `sea-hold-1.000` (`z-town-left.png`, `z-town-mid.png`, 6×); the right camp (`z-northcamp-1.png`); the left camp's crest (`z-fires-south.png`).

In `paintSite`, every window and door gets a radial glow of `max(w, h) * 2 + pen(2.2)` at 0.3 alpha. On a far light whose core is the 1.3 px minimum, that makes a soft ball of about 10 px round a 2 px point. In the town about 80 such balls overlap into warm haze patches (for example 783–823 × 573–610), so the town looks seen through a soft-focus lens. In the camps the doors become fuzzy warm blobs lying across the thatch, as if the roofs were lit. The brief forbids bloom; painting it by hand does not change how it reads. Physically, at 19:45 (sun about −3.5°, civil twilight lasting until about 20:03) the sky is still bright, and a candle-lit opening 1.5–3 km away makes no halo in clear air.

The glow also outlives its source. An occluder recorded after a site cuts only its own silhouette out of the glow. When a nearer hut or crest hides a door's core, the part of its halo above that hut's roof stays, as a warm smudge with no light in it. Examples:
- right camp: about 178,495; 251,481; 94,502; 424,523;
- left camp, above the crest into the sky: about 1889–1916,554.

My rough count in the right camp: 26 warm patches without a bright core against 12 with one. Part of that is the rim of finding 2; the rest are these orphan glows.

Fix, in `paint/lights.ts`:
- Windows: glow `max(w, h) * 0.9 + pen(0.6)` at 0.12 alpha.
- No glow at all where the core is at the minimum size (the far plates: the left camp, the far town).
- Doors: instead of a halo, a spill on the ground. That is a 2–3 px warm wedge under the doorway at about 0.2 alpha, cut by later occluders like the rest. Light thrown out of a door onto trodden ground is what makes a camp read as lived in, not dotted.
- Skip a site altogether when a later occluder contains its centre. In `lightsJob`, walk the events backwards and collect the occluders seen so far; skip a site when `ctx.isPointInPath(occluder, cx, cy)` holds for any of them. A light whose core is hidden then leaves nothing. This runs once per raster, in the idle preparation.

## Should fix

### 4. The left camp is a dead-straight dotted line

Where: `sea-hold-1.000`, the Outreau crest, 1480–1920 × 555–568 (`z-fires-south.png`, 5×; `h100-south-b.png`).

The lit cores are at about 1547,567; 1638,565; 1674,564; 1700,562; 1748,561; 1840,558; 1865,557. They all lie on one line of slope −0.03, with the same size and brightness. At 1:1 this reads as a runway or a row of street lamps along a ridge, not an army's camp. The cause is in the approved painting: from the eye this camp is one row of huts on the skyline at 3 km or more. So its lights inherit the row; what must change is the rhythm, not the place.

Fix:
- Modulate each site's lit share by a low-frequency noise over its easting (period about 60–120 units), so companies light together in clusters of two or three with dark gaps between.
- Vary each core's alpha by its hash (see finding 5).
- No glows here (finding 3).
- Add two or three more kitchen glows along this skyline where its smoke rises. Today one shows, behind the windmill.

### 5. Too pale, too bright, too even: candle-light at civil dusk

Measured in `sea-hold-1.000`: the brightest window in the town has luminance 0.53, the right camp's 0.46, the left camp's 0.39. The sky at the horizon is 0.23–0.25 and the land 0.05–0.08. The windows are twice as bright as the sky, about twenty minutes after sunset, when a candle-lit opening is only just brighter than the sky.

Their colour samples as a pale cream, rgb(219,187,139), from cores `#ffd99a`, `#ffc979` and `#f6b466` at 0.94. Over the violet land that reads as modern warm-white, not candle and hearth light (about 1900 K, a deep yellow-orange). Every core is also the same size and nearly the same strength. That evenness is what makes a pattern of dots.

Fix, in `paintSite`:
- Palette `#ffb04f`, `#f0973f`, `#d47a38`, bright to dim.
- Alpha by hash, skewed low: `0.55 + 0.4 * h²`. Most openings then are a faint warm tint, and a few are bright.
- A handful of doors redder and brighter, as hearths.
- Peak luminance 0.32–0.38: above the sky, far below the moon.
- Lamps (oil réverbères with reflectors) `#ffc066`, never whiter than the brightest window.

At this size the eye loses saturation, so push it further than looks right in a zoom.

### 6. The balance tells of a town, not an army

I count about 80 lit cores in the town, 13 in the right camp and 8 in the left. A town of some ten thousand reads alive. The camps of the army that the caption is about read nearly empty.

Fix:
- Town windows' share 0.2 → 0.12. Spend it low: more on the quays and the lower streets (the taverns and the harbour), fewer up the slope.
- Right camp: the officers' huts' windows (kind 1) at about 0.5. The men's doors stay at 0.45, but clustered by the same noise as finding 4, so streets and companies read.
- Aim for about 25–35 cores in the right camp and about 45–50 in the town.

That gives the camps a living rhythm and leaves the moon's corner calmer.

### 7. The kitchens' glows look like sky, and pulse together like a strobe

Where: the right camp's skyline in `sea-hold-1.000` (`z-fires-north.png`, 4×), glows at about 8, 142, 250 and 375 on y 482.

There are four identical half-domes on the skyline, about 120 px apart, all the same radius and strength. Their salmon pink is the Belt of Venus's own colour, so they read as mottling in the sky, not as firelight on smoke.

The flicker (`BoulogneSea.tsx`, lines 419–425) is a single opacity per plate. It swings up to 22 % at about 1.2 and 2 Hz, and its phase comes from `d.at`, which is the same `[0.42, 0.68]` for `north-camp-far` and `south-heights`. So every kitchen in both camps, 3 km apart, brightens and dims in unison. At 2–3 km the sum of many kitchen fires seen on smoke barely changes.

Fix:
- Fire radius by seed, 10–26 units, and strength 0.3–0.6.
- A lower, more saturated core: `#ff8a3a` going to `#c8502a`.
- The glow drawn as an upright ellipse about 1.6 times taller than wide, centred a little up the smoke's foot, so it reads as fire lighting its own smoke.
- Flicker amplitude 0.22 → 0.06, slower (about 1.1 and 2.3 rad/s), with a phase per plate (from the plate id, not from `d.at`). Better still, two fire banks per camp with their own phases.

Keep the glow behind the windmill on the Outreau crest (about 1735,545), with the mill's sails cut against it. It is the best light in the picture.

### 8. The lights come up while the sun is still on the land

The fires start at 0.42, the lamps at 0.46 and the right camp's windows at 0.48. At 0.46 the near land's dusk share is only 0.62, so a lit lamp shows on a cliff that is still golden. With the flare of finding 1 this is plainly visible at 0.55–0.62. People light candles once the land has lost the sun, not before.

Suggested windows in `plates/index.ts`, `LIGHTS`, so that lights begin only once the near land passes about 0.85 (hold ≈ 0.55):
- fires 0.50–0.76;
- lamps 0.56–0.76;
- right camp 0.56–0.80 / 0.64–0.88;
- left camp 0.58–0.82 / 0.66–0.90;
- lower town 0.60–0.84 / 0.68–0.92;
- upper town 0.66–0.90 / 0.72–0.95.

The fully lit dusk then still rests from about 0.92 to 1.0.

### 9. (Low) Low water could carry the quay lights

The owner asked for low water so that "the sunset and the moon reflect in the wet sand". At dusk the lowest lights on the quays, under the town (about 700–1000 × 620–650, `z-harbour-refl.png`), lay nothing on the wet strand or the drained channel in front of them.

Fix: six to ten faint warm streaks in the strand's dusk raster, 1 px wide and 4–8 px long at 0.2–0.3 alpha, broken into two or three dashes by the ripple. They would mirror the `lower-town-near` sites that lie within a few units of the quay line. It ties the town's lights to the water, as the moon's path does. Optional.

## Keep

1. The light-and-occluder record in paint order, replayed with `destination-out` (`LightSink`, `shore/lit.ts`, the town's light book). It is why the openings sit on gable walls and under eaves, never on a roof plane, and never show through a nearer house, a hut, a hull or a mast.
2. The town's openings as drawn: two windows lit side by side on one storey of one wall, doors at street level (`z-town-left.png`). They read as real houses. Change their value, colour, glow and number, not their places.
3. The 1.3 px minimum core: right for 1.5–3 km.
4. Banks that come up in turn over overlapping stretches, by opacity alone: no step anywhere in 0.6–1.0.
5. No lights on the craft, and the harbour's wooden lantern dark: both as the history has it (`flotilla-check.md` 2.11; whether the lantern was lit in 1805 is not known).
6. The idea that the Emperor's lamps are among the first lights and his windows more lit than a hut's. It is a good story beat once it is drawn as a necklace and not a flare.
7. The kitchens' glows placed where stage A's smoke rises, behind the ground that hides the fires themselves. The glow behind the Outreau windmill.
8. Lights that go with the colour on the rise and are gone in the engraving (`sea-rise-0.500` is clean).
