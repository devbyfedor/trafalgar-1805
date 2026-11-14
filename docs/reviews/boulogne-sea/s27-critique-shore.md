# Boulogne from the sea: critique of the shore (session 27)

Critic: shore (north and south). Read-only on code.

Judged on the production frames of commit 7f084fe (1280×720 at 1.5, so 1920×1080 px) in `.claude/s27/prod-merged/`, and on close-ups from the studio (`node scripts/dev/sea-studio.mjs`, S=3 to 5, colour and ink). The close-ups are in `.claude/s27/critique/shore/` (git-ignored). Pixel boxes below are px of the 1920×1080 frame.

The bar is the near chaloupe in `.claude/s27/craft-vs-victory.png`. It has a full value range, crisp edges, each plank its own tone, and detail scaled to distance. The shore has none of these yet.

## Verdict

The shore is not at the vessels' level. The cliff is still a layered cake. Fifteen beds run as parallel stripes of the same thickness across a kilometre of face. Soft vertical light and dark bands run down through every bed at the same x, so the face reads as a curtain. The two gullies are dark green pillars.

The right camp is a rash of about 300 identical loaf-shaped huts. Their long sides face the sea, and they are spread evenly from the brow to a crest about 2.9° up. History gives a thin band of gable ends. The left camp still hangs as a strip on the Outreau skyline, which is owner remark 10 again.

The engraving of the cliff is a grid of plus signs with barcode columns. The south heights are engraved as dashed ruling, which is remark 9 again.

Under all of this, the land has the same value as the low sky. Median luminance is 173 to 180 on land against 182 in the sky, with no darks. That alone makes it look cheaper than the hull.

Remark 4 (the rectangle) is closed. Remark 5 is closed only in the letter: the slanting stripes have become vertical ones. Remarks 9 and 10 are open for the shore.

The must-items in the order a painter should take them:
- 7, values: quick, palette numbers.
- 4a and 4b, gable-on huts in rows: quick.
- 5, the left camp: quick.
- 1, the cliff's beds and facets: the big one.
- 2 and 3, gullies and brow.
- 6, the cliff's engraving.

## Findings

### 1. Must: the cliff face reads as a layered cake hung with a curtain

**Where.** sea-hold-0.500, box x 0–640, y 515–665. sea-dive-0.650, box x 0–640, y 470–610. Studio close-up: `studio-north.png`.

**What is wrong.**
- The 15 beds of `BEDS` are continuous horizontal bands across the whole face, each almost the same thickness from end to end.
- Their colours alternate: pale, tan, grey-lilac seam, tan, rust, pale. It reads like sponge and cream.
- Soft vertical bands, lighter and darker, run down through all the beds at the same x.
- Joints with lit lips, plus rain streaks every 4–22 m, add fine vertical striping everywhere. The face looks like a pleated curtain hung over horizontal stripes.

**Why it reads cheap.** No real bed keeps its thickness and its edge for a kilometre. Erosion breaks hard beds into blocks, each turned a little differently to the light. Soft beds recede, slump and grass over.

**What paints it.**
- `face.ts` `paintBed` fills each bed with `createLinearGradient(x0, 0, x1, 0)`, one stop per sample. A bed's colour can only change from left to right, so every change of light becomes a smeared vertical band.
- `buildFace` makes 30% of clefts run the whole height (`whole = rng() < 0.3`, `h1 = TOP_OF_ALL`), so those bands line up through every bed.
- The boundaries' wobble (seeds 700+j) is 0.35–0.55 m on beds 2.5–7 m thick, too small to read.
- Only beds under 3 m get a lens.

**Fix (technique).**
- **(a) Uneven beds** (`buildFace`):
  - Give every bed a thickness lens of ±30–40% over 120–300 m.
  - Make a hard bed's top boundary step at its own joints, changing by 0.3–1.2 m from block to block, like a staircase, instead of a smooth wobble.
  - Add 6–10 erosion bites. In each, a hard bed has collapsed over 8–40 m: its top drops nearly to its base, with stepped ends, and the soft bed above slumps into the gap.
  - Add 2–3 landslip bays where the upper 2–4 beds are gone and a grassed slump fills down to a ledge. The brow dips there.
- **(b) No columns through the face.**
  - Drop `whole` from 0.3 to about 0.05.
  - A cleft spans its own bed and at most the next one.
  - Give each hard bed its own joint spacing: wide in thick beds, close in thin ones. Then no two beds share a vertical line.
- **(c) Paint by facets, not by gradient.** This is the vessels' planking technique applied to rock: each plank there has its own tone.
  - In `paintBed`, split each hard bed into blocks at its own joints.
  - Give each block a facet turn of ±10–30° about the vertical, and take its light from the same dot product as `lightAt`.
  - Fill each block as a polygon in flat colour. Add a short vertical ramp: a lip 2–4% lighter at the top, where the sun grazes the ledge, and darker at the foot, under the overhang.
  - Vary each block's local colour (fresh ochre, weathered grey, rust stain) so neighbours differ.
  - Keep the edges crisp at the joints.
- **(d) Soft beds as slopes set back.**
  - Paint them cooler and darker than the walls: lit by the sky, so lerp 0.35–0.5 toward the material's shade colour, plus `SKY_COOL`.
  - Let clay tongues lobe down over the ledge below, 3–15 m wide and 1–3 m long.
  - Add short wavy rills.
  - Grass in clumps, not in strips (`paintGreens`).
- **(e) Fewer vertical marks.**
  - `paintStreaks`: keep only a few, every 30–80 m, wider and fading.
  - `paintJoints`: drop the lit-lip line. Draw cracks as irregular zigzags of varied length, and let the change of block tone do most of the work.
- **(f) Fewer, more distinct units instead of 15 equal stripes.**
  - A dark grey-olive clay base, slumped and grassed.
  - A thick golden sandstone unit, blocky, in the middle of the face.
  - Thin grey shaly interbeds.
  - A paler cap.
  - This follows history-notes: "brown and grey", and Bertrand's "grey, brown, yellow and reddish beds".

**Do not break.**
- The face's three-stage build, and each job under about 6 ms.
- Shade on the gullies' north walls (left as seen), sun at azimuth 294.
- The talus and the beach.
- The cliff's outline against the town.

### 2. Must: the gullies read as two dark green pillars

These are the successors of remark 5's stripes.

**Where.** sea-hold-0.500, boxes x 135–160 and x 420–445, y 525–625. sea-dive-0.650, the same columns at y 480–590.

**What is wrong.**
- Each gully's shade is a parallel-sided cool column, one tone from the brow to the talus through every bed.
- At its foot, `paintScrub` stands a dark green block with a lumpy top. It looks like a chimney.

**Why it reads wrong.** A valleuse is a V: wide at the brow and narrowing to its floor. Its walls are broken beds stepping in. Its floor is slumped clay and bramble spilling out into a debris cone. A column of one width and one tone reads as a painted stripe, which the owner has already called an artefact once.

**What paints it.**
- `face.ts` `cutAt` gives the gully its full width over the upper 45% of the face (`widen = 0.3 + 0.7 v`, with v saturating at `h0 + 0.55·(top − h0)`), with flat walls in one light.
- `paintScrub` fills a solid mass between the lips.

**Fix.**
- Let the gully widen continuously with height (`widen = 0.15 + 0.85 v`, with v over the whole range from h0 to the top).
- Deepen the brow notch into a crisp V, and let `paintBrow`'s turf turn down into it.
- Shade only the north wall (the left one), as a tapering triangle. Break its tone by bed: hard steps darker, soft slopes lighter and greener.
- Paint the floor as a ragged ribbon of 3–8 scrub clumps (`bush()` clusters) of different sizes, with lit tops and gaps of bare clay between them. End it in the `fanOf` cone, grassed on its older side.
- Remove the solid mass polygon from `paintScrub`.

**Do not break.**
- The gullies' positions, which the brow's notches and the gaps between batteries follow.

### 3. Must: the brow reads as icing, and the batteries as a pie crust with raisins

**Where.** sea-hold-0.500, box x 0–620, y 500–530. Studio close-up: `studio-camp.png`, at the bottom.

**What is wrong.**
- The brow is a chain of similar rounded scallops.
- Under it, a turf strip and a brown soil line of steady thickness follow every scallop.
- The batteries are saturated orange bands that ride up and down with the scallops, dotted with round black holes.

**Why it reads cheap.**
- A plateau edge is mostly level, with a few sharp notches and the odd slump scar.
- An earthwork is built level.
- At 1.35 km a gun's muzzle is under a pixel.

**What paints it.**
- `face.ts` `notchAt` gives a smooth `(1 − u²)^1.5` dip at every whole-height cleft and gully.
- `paintBrow` draws bands of constant thickness.
- `cliffs.ts` `paintEdgeWorks` places each parapet with `browAt` 4–10 m back. There the notch dip has decayed only to about 85% (`exp(−back/60)`), so the parapet rides the scallops.
- Embrasures are filled dark, and `muzz` adds the dots.

**Fix.**
- **Brow.**
  - Most clefts leave the brow alone (follows from 1b).
  - Keep the level edge with `browNoise`, a few sharp notches and the gully V's.
  - Add 2–3 slump scars: concave bites where the turf has broken away, showing a bare ochre-brown soil scar with a dark undercut line under the turf lip.
  - Vary the turf from 0.3 to 1.5 m thick, overhanging in places with a thin cool shadow under it.
- **Batteries.**
  - Lay each parapet on a level line: the mean of `edgeTop` over n0..n1.
  - Set it 15–25 m back, so a strip of grass separates it from the brow.
  - Use an earth colour taken about 30% toward the turf and the haze. That is the history's "low red-brown blocks", not orange.
  - Cut embrasures as small notches into the parapet's top line.
  - Draw gabions as a row of fine ticks with a lit left side.
  - Drop the muzzle dots and the mortar ellipses (at the Tour d'Odre battery, mortars behind a parapet do not show from the roads).

**Do not break.**
- The batteries' flags and positions.
- The engraving's firm brow line.

### 4. Must: the right camp is a rash of loaves, not lines of gable-ended huts, and it is about eight times too tall

This is owner remark 10, north side.

**Where.** sea-hold-0.500, box x 0–560, y 430–520 (brow at about y 510, top row at about y 435: 75 px, about 2.9°). Studio close-up: `studio-camp.png`.

**What is wrong.**
- About 300 identical long huts show their long sides to the sea. Each reads as a loaf or a domino.
- They are scattered evenly from the brow to the crest. The rows do not read.
- Random whitewashed fronts read as sugar cubes.

**Why it reads wrong.** History-notes ("The hut", "The camp's plan", "What the roads see"):
- The huts stood gable to the street, in long lines parallel to the sea, so from the roads they show their gable ends.
- Lewis paints them mid-grey with a pale edge. Hue paints pale gabled huts with greyish roofs.
- The roads see a thin, dense band of overlapping roofs, 0.3–0.4° true (about 0.9° with VEX), and only the first 0.3–0.5 km behind the cliff at the Tour d'Odre.
- `terrain.ts` `RISE = 4` on top of VEX 2.5 makes the slope ten times taller. That is exactly Lewis's error, which the history check names.

**What paints it.**
- `draw.ts` `rowHuts` sets `axis` along the row, so the long side faces the eye.
- Spacing goes by the hut's length.
- `white: kind === 1 || rng() < 0.12` scatters the sugar cubes.
- `north.ts` `campShare` keeps huts on every tier from d 0 to 2000.

**Fix.**
- **(a) Gable-on.**
  - In `rowHuts`, set `axis` across the row: `[−(n1 − n0)/al, (e1 − e0)/al]`.
  - Advance along the row by the hut's width: `t += 2·w + gap`.
  - `hutShape` and `paintHuts` already handle the end toward the eye, which `endLit` lights. The gable becomes a pale warm pentagon of clay daub (`wallLit` lifted toward #d8c3a0), with the grey-brown thatch above and behind it.
  - Add a one-pixel darker contact line at each hut's foot.
  - Officers' huts (kind 1) form a whitewashed row behind every third line. Drop the random 12% whites.
- **(b) Rows that read.**
  - Put rows in close pairs, two contours 12–20 m apart.
  - Group huts in battalion blocks of 8–12, with cross streets 25–35 m wide.
  - Keep the share at 0.9 or more inside a block, so the rows have no random holes.
- **(c) The band.**
  - Lower `RISE` to about 2, and record the licence's new value in `decisions.md`.
  - Limit the camp in `campShare` to d ≤ about 500 m at the Tour d'Odre, rising to about 1000 m toward La Crèche: multiply by `1 − smoothstep(dmax(n) − 100, dmax(n), d)`.
  - Beyond the camp, fields and hedges run to the skyline, with the kitchens' smoke rising behind.
  - The rows then overlap into the striped band of pale gables and grey roofs that the history describes, about 1–1.3° tall. By my estimate with RISE 2, the ground's first 450 m stands about 18 units above the brow, and the plateau beyond falls behind it.
  - (c) is a composition decision for the main session. (a) and (b) are needed in any case.

**Do not break.**
- Remark 10: no slab, no hard edges. The band must end softly at both ends and follow the ground.
- Each hut's foot on the ground.
- Job sizes. The studio measured `north-camp-far`'s worst colour job at 8.6 ms at scale 1.5, already over the 6 ms guide. Gable-on spacing adds about 1.5 times as many huts per row, so split the tier jobs.

### 5. Must: the left camp still hangs on the Outreau skyline as a strip

This is owner remark 10, south side, in colour and in the engraving.

**Where.** sea-hold-0.500, box x 1500–1920, y 545–568, with the windmill at x 1705–1720, y 540–556. sea-dive-0.550 (ink), box x 1500–1920, y 475–505. Studio close-ups: `studio-south.png`, `ink-south.png`.

**What is wrong.**
- Two or three rows of identical box huts sit above the brow line, along the skyline.
- The windmill stands on top of them.
- The brow's own line passes under the huts and never overlaps their feet.
- In ink it is a bracelet of rectangles.

**Why it reads wrong.**
- It is the strip the owner described: "a strip of huts of the same kind hangs over the hills".
- History: a line of huts along the north-western brow of the plateau; the eastern half of the plateau is hidden from everywhere in the roads.

**What paints it.**
- `south.ts` `TIERS` places rows 30–340 m behind the brow.
- `behind()` raises them by the plateau's rise over 280 m, so the rows stack above the brow.

**Fix.**
- Keep one row on the brow itself (back 10–30).
- Keep at most a second row, 60–90 m back, whose roofs only just show.
- Drop the rows at back 140–340.
- Paint the brow's own band, the `{ f: 0 }` tier, over the huts' feet, with a soft grass lip, so the huts sink behind the convex brow.
- Make the huts gable-on, as in finding 4.
- Follow the brow's rise and fall. Leave gaps between blocks. Thin the huts out where the brow falls toward the Liane.
- Stand the windmill on the ground.
- In ink, draw the same, with gables outlined and no continuous strip of paper backing.

**Do not break.**
- The escarpment's light (`lightOf`).
- The mills.
- The kitchens' positions behind the brow, which the smoke uses.

### 6. Must: the cliff's engraving is a grid of plus signs with barcode columns

This is owner remark 9.

**Where.** sea-dive-0.550, box x 0–640, y 465–595. Gully columns at x 140–160 and x 425–440, y 465–560. The hatched wedge at the right end: x 640–725, y 505–595. Studio close-up: `ink-north.png`.

**What is wrong.**
- The lit face is a regular field of small "+" marks.
- The gullies are columns of parallel vertical strokes, all the same length and the same density, with hard sides.
- The face has no mass and no light. It is still a diagram, which the owner rejected.

**What paints it.**
- `face.ts` `engraveJoints` (a stroke every 3.5–16 m on each hard bed) crosses `engraveStrata`'s fine broken bed lines and the "inner" bedding lines (`addBroken` 4/5). That makes the grid.
- `engraveBed` gives every shade stroke the bed's full height, so in shade the strokes fill their band edge to edge.

**Fix.**
- **Bed lines.** Firm and slightly wavy, broken where finding 1 breaks the beds. Turn the inner bedding lines off (`inner = 0` on most beds).
- **Joints.** Draw only one in three, as irregular cracks, each with 2–4 short strokes on its shaded (left) side. They never cross a bed line.
- **Tone.**
  - Hatch down the fall line, with stroke lengths that vary from 0.3 to 1.0 of the bed.
  - Start strokes under each hard bed's overhang (darkest there) and fade them downward.
  - Make them denser toward the foot and on the gully walls.
  - In the gully walls, let the strokes converge toward the floor so they follow the V.
  - Crosshatch only the deepest walls, with the second set at 30–45°.
  - Use one `field()` for density, so strokes cluster as an engraver's do.
- **Soft beds.** Short slanting strokes down the slope and a little stipple. No ruling.
- **The lit cap.** Nearly blank paper.

**Do not break.**
- The paper backing, so nearer plates hide farther lines.
- The pens (`INK.line`, `INK.hatch`) and their weights.

### 7. Must: the land has the sky's value, with no darks and no separation

**Where.** sea-hold-0.500. Luminance (0–255) at p5 / p50 / p95:
- the cliff (x 0–420, y 530–600): 134 / 173 / 197;
- the plateau above it (x 0–400, y 440–500): 160 / 180 / 188;
- the shoulder (x 500–620, y 450–530): 163 / 180 / 188;
- the south hill (x 1500–1800, y 590–630): 172 / 179 / 183;
- the low sky behind (x 800–1000, y 480–520): 177 / 182 / 187;
- the chaloupe's hull: 44 / 66 / 118.

**What is wrong.**
- The land is one pale value with the sky.
- The grass plateau is lighter than the cliff face.
- The south hill spans 11 levels in all.
- This is the main reason the shore reads as flat pastel beside the vessels.

**Why it reads wrong.**
- With the sun low behind the eye, the cliff face is square to the sun and should be the warmest, brightest land.
- The grass top, seen at a grazing angle, is darker and greener.
- Recesses, clay, scrub and hedges carry real darks, 25–40% lower.
- The haze at 1.3–2 km lightens a little (`hazed`, about 14%), not up to the sky's value.

**Fix.**
- **Cliff (`face.ts` `M`).** Raise the chroma of the lit sandstones (toward #e6b06a and #dda262). Darken the clay beds (lit toward #8c8170, shade toward #4f4c55).
- **North ground.** Take the camp's ground 15–25% darker and greener (`campPlate`'s base fill `mix(turfLit, stubble, 0.35)` and `parcelColour`, toward `SHORE.turf` and #9a9a58). Hedges toward #5d6045. Darken `paintBrow`'s ground strip (#bdb063) the same way.
- **South heights.** The same, with field colours further apart.
- **Targets.** About 90 or less at p5 on the cliff, in its recesses. About 140–150 at p50 on the plateau. About 200 at p95 on the lit sandstone.

**Do not break.**
- The main session's overall grade: coordinate with it.
- The aerial order: the cliff at 1.35 km keeps more contrast than Outreau beyond 2 km.

### 8. Should: the camps and the south heights are engraved as icons and ruling

This is owner remark 9.

**Where.** sea-dive-0.550:
- the north camp, x 0–420, y 360–455;
- the south heights, x 1100–1920, y 500–580;
- the dunes, x 1100–1920, y 572–595.

**What is wrong.**
- The huts are rectangles with three vertical ticks, like battery icons.
- The hill is covered with even rows of dashes parallel to its contours. It is the exercise-book ruling the owner named, only dashed.
- The dunes are one dashed zigzag line.

**What paints it.**
- `camp.ts` `tierJob`, ink branch: two broken lines (t 0.35 and 0.7) between every pair of contours.
- `draw.ts` `engraveHuts`.

**Fix.**
- **Huts.** A gable outline with 2–3 strokes along the roof's slope and one stroke on the gable's shaded side. Overlapping rows, the near row's paper hiding the far row's feet.
- **Ground.**
  - Hatch by tone and slope: strokes down the fall line where the ground turns from the light (`light < 0.6`), with density from a field. Lit faces stay mostly paper.
  - Use contour-parallel strokes only as furrows inside chosen fields, changing direction field by field.
  - Draw hedges as rows of tiny loops.
- **Dunes.** Each dune's crest firm, its lee side hatched, marram as tufts of 3–5 short strokes.

**Do not break.**
- The paper backing per tier.

### 9. Should: the north plateau's shoulder over the harbour reads as a loaf with slanting stripes

**Where.** sea-hold-0.500, box x 430–720, y 430–650.

**What is wrong.**
- A big, smooth, bell-shaped slope, empty.
- Its contour hatching, and the turf line running down to the quay (x 560–720, y 560–650), make long diagonal parallel stripes. The owner flagged slanting stripes on the cliffs before (remark 5).
- Its value is the cliff's.

**What paints it.**
- `terrain.ts` `northUp`'s smooth `valley` term.
- `camp.ts`'s contour strokes, which slant where the contours fall.
- `face.ts` `paintBrow`'s lip along the falling brow.

**Fix.**
- With RISE lowered (finding 4c), the shoulder shrinks by itself.
- Break its silhouette and fill it:
  - the ruined English bastions of 1544 round the Tour d'Odre, as low red-brick stumps (history-notes, "The cliffs" and "Napoleon's pavilion");
  - the pavilion's mound and paling;
  - a road climbing diagonally to the harbour;
  - hedges and a few bushes against the sky.
- Vary the hatching's direction from parcel to parcel.
- Light the convex form: warmer and lighter where it faces the sun, cooler where it turns south toward the harbour.
- Break the descending turf line into tufts.

**Do not break.**
- The town painter's houses climbing the slope (La Beurrière) to its right.

### 10. Should: Napoleon's pavilion is seen side-on, and history says end-on

**Where.** sea-hold-0.500. Napoleon's pavilion: box x 395–432, y 503–522. The admiral's: box x 500–537, y 513–530.

**What is wrong.**
- A long white box with seven windows faces the sea, with its rotunda at one end.
- It is the brightest, bluest white on the shore. It reads as a modern bungalow.

**Why it reads wrong.** History-notes, "Which way it faced":
- The long axis ran about east–west.
- The rotunda (9.7 m, wider than the 7.3 m body) stood at the west end, facing the roads.
- So it is seen almost end-on: "a small pale shape", grey-white planks lit full by the sun.
- `cliffs.ts` `pavilion()` sets the axis at bearing 60° (`ue = sin 60°`).

**Fix.**
- Set the axis to 90°. The drum and its low cone then stand in front, and the body shows behind only as a short ridge.
- Paint the planks a warm grey-white in the sun (`SHORE.pale` toward #e8d6b4), with the drum's turned side cool.
- Keep the paling ring.
- Put 3–4 window strokes on the drum only.
- Do the same for the admiral's smaller copy.

**Do not break.**
- Their places (n 205 and 305) and the mound.

### 11. Should: the south heights and dunes are flat vector fields and a scalloped band

**Where.** sea-hold-0.500:
- the hills, box x 1130–1920, y 540–650;
- the Châtillon battery, box x 1470–1495, y 545–560;
- the dunes, box x 1150–1920, y 630–665.

**What is wrong.**
- The Outreau escarpment and Châtillon are a smooth green with faint patches of slightly different green.
- No hedges read, and the light does not follow the form.
- The battery is an orange plank.
- The dunes are a beige band with regular rounded humps.

**What paints it.**
- `camp.ts` `parcelColour`: parcels too close in colour.
- `south.ts` `lightOf`, mixed over nearly identical colours.
- `dunes.ts` `buildGeo`: the top from a wobble with regular periods (140 / 55 / 21 m), and one fill.

**Fix.**
- **Fields.**
  - Distinct parcels in strips and blocks: stubble gold, pasture green, fallow brown.
  - Boundary hedges as dark ragged lines with a lit top edge, and a few trees.
  - Parcels that shorten as the slope turns away.
- **Light.** The sun-facing slope warm and light; the hollows, and the slope turning south, cooler and darker.
- **Battery.** An earthwork, as in finding 3.
- **Dunes.**
  - Two or three ranks overlapping in depth, each dune with a lit seaward face and a cooler back.
  - Blowouts of bare sand.
  - Marram in clumps with lit tips.
  - Break the regular period with a random walk and the odd larger dune.

**Do not break.**
- The left camp's line (finding 5).
- The dunes' place in front of the harbour flats.

### 12. Could: smaller items

**Signal mast.** Box x 465–475, y 485–525. It reads as a cross on a pole.
- Give it a topmast and a second, shorter yard.
- Hang the hoists from halyards, lifting a little to the left in the westerly air.
- History: a flagstaff with yards.
- Painted in `cliffs.ts` `signalMast`.

**The foot's debris fans.** sea-dive-0.650, box x 0–640, y 590–610. They form a row of similar pale mounds.
- Use fewer fans, of varied sizes, some grassed.
- Painted in `face.ts` `paintTalus`, with `fanOf`, for every cut with depth ≥ 5.

**Windmills.**
- Give the body and trestle a crisper dark silhouette.
- Stand each mill on the ground, never on a hut row.

## Not judged

The smoke, the moon, the belfry, the dark sky under the title and the removal of legacy code were all changing in the main session.
