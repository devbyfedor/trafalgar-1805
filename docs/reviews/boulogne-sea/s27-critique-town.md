# Session 27 critique: the town, the hills and the harbour

Critic's key: `town`. Read-only review of the build of commit 7f084fe (production frames in `.claude/s27/prod-merged/`, 1920×1080 px = 1280×720 CSS at 1.5) and of the studio at 3–5× for detail. Crops are in `.claude/s27/critique/town/` (local, git-ignored). Pixel boxes below are `x, y, w, h` in px of the 1920×1080 frame.

Not judged here (the main session is changing them): the smoke, the moon's place, the belfry's spire and the telegraph on it, the dark sky under the title.

## Verdict

The town is no longer a set of cubes. Every house is a box with a gable or hipped roof, windows and chimneys, lit by the sun's true direction, and the engraving reads as a dense engraved town. That geometry is a sound base: keep it.

But the area is far below the bar of the near chaloupe in `craft-vs-victory.png`. The chaloupe works because of its value range (tarred dark hull, lit wale, crisp planks). The town, the ramparts and the hills sit in one pale value. In `sea-hold-0.500` the lower town's luminance runs from 0.56 (2nd percentile) to 0.78 (98th), median 0.65. The hills behind it are 0.68. The sky just above is 0.71. The chaloupe runs from 0.14 to 0.51. So nothing in the town is dark. The lower town is pastel cream, where history says mostly dark stone. The ramparts are pale buff, where history says dark grey-brown stone. The hills are a quilt of rectangles with dashed map-symbol hedges and copses shaped like spectacles. The harbour works are the cheapest objects in the frame. The jetty heads are two crates with an X on them (and the darkest blots in the engraving). The pierhead battery is a block of flats on a crate. The harbour light is a lattice pylon. The wooden fort is a terracotta box with windows.

Findings 1–5 are the must-items for this pass.

Owner's bug 8 ("the town is a set of grey-blue cubes"): closed as to form, not yet as to colour and material. The flotilla's store is still a white block with a pale lavender roof, and the roofs in shade read as cool lavender-grey. See findings 1 and 7. Remark 9 ("the engraving ruled like an exercise book") still holds for the hills behind the town: see finding 4.

## Findings

### 1. MUST: the town has no darks. Paint the lower town in dark stone with real shadow.

- **Where:** `sea-hold-0.500`, box 640, 540, 620, 130. Also `sea-hold-1.000`, the same band. Close-up: `hold1-town-left-x4.png`.
- **What is wrong:** every wall is cream, white or pale buff. The roofs alternate orange and lavender-grey facets of the same value. There are no shadowed streets, no dark doorways and no dark stone. The town's median luminance (0.65) is the hills' (0.68) and the sky's (0.71), so the town does not separate from what is behind it. History (`history-notes.md`, "The lower town") says the lower town was mostly dark stone in 1805, with some new pale fronts, and that the roofs were mostly red-brown tile with some grey slate.
- **Why it reads cheap:** it looks like a pastel toy town or a confetti texture. The chaloupe beside it has a full range from tar-black to lit gold. The town, at 1.7–2.5 km, should have less range than the chaloupe, but it should still have range. Through about 25 % haze, a local dark of 0.1 still comes out at about 0.3.
- **Fix:**
  - `plates/town/lower.ts`, `WALL_TABLE`: make dark stone the majority. Roughly: stone 0.45, brown 0.25, ochre 0.10, cream 0.12, white 0.08. Put the pale fronts mostly on the quay row and the main streets (the new fronts after 1800). Do not scatter them evenly.
  - `plates/town/houses.ts`, `WALLS.stone` and `WALLS.brown`: they are pale now (`stone.lit #d9bf95`). Darken them toward weathered grey-brown Boulonnais stone, warm in the sun. For example: stone lit `#b39472`, graze `#857565`, shade `#5a5560`; brown lit `#a07f62`, graze `#766658`, shade `#4f4a52`.
  - `ROOFS.tile*.shade` (`#77666d` and the others) are cool mauves. That is why shaded tile slopes read as slate. Warm them toward a deep red-brown (about `#6a5250`) so tile stays tile in shade. Keep slate at about 15 %, and a little darker.
  - `paintBuildings`: deepen the street's dusk at each wall's foot. The first gradient stop is `mix(col, air("#6f6a78"), 0.22)` now. Make it about 0.45 toward a darker `#4a4450`, reaching 30–35 % of the wall's height. Add a thin cast shadow under the eaves on lit walls: a band of about 0.3–0.4 units below each roof's eaves line, about half way to the shade tone. That crisp dark line is what makes a house read at 2 km. Make the windows darker (less `f.colour` in the mix), so the rows of windows read as dark dots on stone, with the few gold blazes kept.
- **Do not break:** `build()` and the sun's true direction (the modelling comes from the geometry); the smoke sites' houses (`SMOKE_SITES`); the jobs' sizes (`CHUNK` 20); the two plates' split at 1960 m.

### 2. MUST: the jetty heads read as two crates marked with an X.

- **Where:** `sea-hold-1.000`, boxes 675, 635, 20, 35 and 770, 640, 36, 30 (under the battery). `sea-dive-0.550`, boxes 693, 584, 18, 28 and 790, 587, 35, 25, where they are the darkest blots of the whole engraving. Close-ups: `hold1-harbour-x4.png`, `studio-jetty-x5.png`, `dive055-harbour-x4.png`.
- **What is wrong:** the jetties are seen almost end-on, so about 70 bents of 4 piles each collapse into one narrow column. `paintJetty` then fills the stringer band (`ctx.fill(stringer)`) and draws every bent's two braces. The result is a solid brown box with a dark X. In the engraving it is a solid ink box with an X.
- **Why it reads cheap:** a box with an X is the universal "missing image" placeholder. It sits in the middle of the frame, at the harbour mouth, where the eye goes first.
- **Fix** (`plates/harbour.ts`, `paintJetty` and `jettyPlate`): draw an end-on jetty as what it is, a tunnel of piles receding toward the harbour mouth.
  - The head bent is full size: 4 piles, a cap beam, the deck's edge and a handrail with posts above it. Only this bent and the next 2–3 bents get braces, as thin lines.
  - The bents behind are smaller and shift toward the vanishing point. Their piles get thinner and lighter with distance (aerial), and their braces are dropped.
  - The gaps between the piles stay open, so the strand and the lit harbour show through.
  - Draw no stringer fill when the jetty's projected length is shorter than its width. Draw the stringers only as two converging lines (the deck's edges), the lit one with the glint.
  - Add a dark weed band and a wet line at the piles' feet, and short broken reflections of the piles in the wet strand (as `paintFort`'s `"reflection"` does).
  - The west jetty's head must widen into a pile platform as broad as the battery, so the battery stands on something (see finding 3).
  - In the engraving: outline the head bent, use hatching (not fills) for the piles in shade, use hairlines for the far bents, and draw no solid ink areas.
- **Do not break:** the jetties' places (`JETTIES` in `geo.ts`) and the two plates' depths (1290 and 1140).

### 3. MUST: the pierhead battery is a block of flats on a crate, and the harbour light is a pylon.

- **Where:** `sea-hold-1.000`, box 750, 590, 60, 70. `sea-dive-0.550`, box 760, 565, 65, 25. Close-ups: `studio-jetty-x5.png`, `hold1-harbour-x4.png`.
- **What is wrong:** `paintBattery` draws two flat rectangles in cream stone with two rows of square dark "windows" and a grey square block at the left. The box is wider than the jetty under it, so it overhangs a narrow crate. The harbour light is an open lattice of crossed lines with a pale yellow box and a black pyramid on top, which reads like an electricity pylon or a water tower. History says the battery was two tiers, ten 36-pounders, on the west pierhead, and the light was a taller wooden harbour light set back from it; Lewis draws a tall, white, pointed "Light House".
- **Why it reads cheap:** square holes in a flat wall read as windows, not guns. A battery reads as a battery when its embrasures are notches cut down into the parapet's top line, with muzzles in them.
- **Fix** (`plates/harbour.ts`, `paintBattery`):
  - Seat it on the pile platform from finding 2, with its deck's edge as a tarred dark band, lit at the top.
  - The upper tier: a parapet whose top line is broken by 5 notches. The notches show what is behind (the town), with a dark muzzle in each.
  - The lower tier: gun ports with their lids hinged up as short dark strokes, and muzzles.
  - Give the faces a slight batter (wider at the foot), planking or coursing lines, the west face lit warm and the south face in cool shade, and a darker line where the tiers meet.
  - Remove the flat grey square at the left.
  - The light: a boarded, white-painted, tapering timber tower with a pointed roof. Its glazed lantern sits under the roof and catches the sun as a small gold accent. Its west face is lit and its south face is shaded. Draw no lattice.
  - In the engraving: notches and muzzles in ink, hatching on the shaded face, and no solid dots.
- **Do not break:** the flag and its place, and the light's place set back from the battery.

### 4. MUST: the hills behind the town are a quilt of rectangles, with dashed hedges and copses shaped like spectacles.

- **Where:** `sea-hold-1.000`, box 620, 530, 860, 45. `sea-dive-0.550`, box 620, 440, 860, 55. Close-ups: `studio-upper-x4.png`, `studio-upper-ink-x4.png`, `studio-hills-only.png`, `dive055-town-x3.png`.
- **What is wrong:**
  - `nearHills()` cuts the face into vertical columns 22–62 units wide, then cuts each column into horizontal slabs. So every column's sides are continuous vertical seams from the skyline to the foot. The result is a brick wall or quilt.
  - The hedges are `brokenLine` dashes, which read as map symbols.
  - `nearCopses` makes 6 flat ellipses side by side. In colour they read as dark "∞" blobs; in the engraving, outlined ovals like spectacles.
  - In the engraving each field is ruled with horizontal lines (`fieldStrokes` at a near-zero angle). This is the owner's remark 9 again: an exercise book.
  - In colour the fields barely differ, and the face is the same value as the sky (0.68 against 0.71).
- **Why it reads cheap:** these are the flat infographic shapes the avoid-list forbids. The owner asked for fields and hedges drawn in hatching, not flat fill.
- **Fix** (`plates/hills.ts`):
  - In `nearHills()`, make the contour bands primary. Cut the face into rows along `faceY(x, t)` at constant `t`, with the rows thinner near the skyline (foreshortening). Then cut each row into fields at its own x positions, never shared with the row above or below. Slant each field's side boundaries along the fall line (lean by `slope(x)` and a jitter), so no vertical seam runs on.
  - Give each field a clear local colour from August: pale gold stubble, darker green pasture, brown fallow. Fill at full opacity, then add furrow hatching in that field's own direction at a visible alpha (now 0.33 at 1.6 px spacing, which disappears).
  - Hedges (`nearHedges`): Boulonnais bocage. Stamp small tree crowns (0.6–1.4 units) along some field boundaries, with gaps: a dark body, a lit dab up and to the left, and a shadow to the right. No dashes.
  - Copses (`nearCopses`): clusters of 10–25 such crowns with an irregular outline, darker and cooler on the right, a golden rim on top.
  - Value: a step darker and warmer than the sky at the horizon, with the foot's haze kept. The town must then be the stronger contrast in front of it (finding 1).
  - In the engraving (the `ink` branches): drop the per-field horizontal ruling. Model the hill with the contour hatching of `nearModel`, closer on the flanks turned from the sun. Draw hedges as beaded lines of tiny crowns, ploughed fields as short furrow strokes in their direction only, and copses as scalloped clusters with hatched shade. No outlined ellipses.
  - Split the stamping into jobs (as `nearFields` already does, 45 per job) so that no job goes over about 6 ms.
- **Do not break:** `NEAR_RIDGE`, the calm skyline from x 20 to 270 (`calmLambert`) where the moon rises, and the depths and boxes of the plates.

### 5. MUST: the ramparts are pale and smooth, the towers are flat strips, and the trees are a string of identical beads.

- **Where:** `sea-hold-1.000`, box 905, 545, 275, 40. `sea-dive-0.550`, box 920, 488, 260, 25. Close-ups: `hold1-upper-x4.png`, `studio-upper-x4.png`, `studio-upper-ink-x4.png`.
- **What is wrong:**
  - `upper.ts` `STONE` is a pale buff (`lit #c8ac84`). After the air it is a lavender-buff of the hills' own value. The comment above `paintWalls` even says "dark stone", and history says dark grey-brown stone, 13–16 m.
  - `paintTower` fills a flat rectangle with a left-to-right gradient. It has no curved top, no parapet's curve and no shadow on the wall beside it. The uncapped towers read as slightly darker strips of wall.
  - The trees on the walls (`row()` in `upper()`) are spaced every 8–13 m, sized 0.85–1.2, with the same lobes. They make one even hedge of balls in a saturated mid-green, with an even top line.
  - In the engraving the wall is almost blank paper, so the upper town reads as a row of white boxes.
- **Why it reads cheap:** the upper town should be the strongest horizontal accent of the middle distance: a dark band of wall under dark trees, with the belfry rising out of it against the pale hill. Now it dissolves into the hill.
- **Fix** (`plates/town/upper.ts`):
  - `STONE`: about lit `#9d8467`, graze `#73685f`, shade `#4f4c57`. The north-west face takes the sun at a graze, warm. The south-west face is in cool shade.
  - `paintTower`: add a lit elliptical top (the parapet's curve), a darker band of shadow cast onto the wall to the tower's right, and courses that curve with the drum (slight arcs, not straight lines).
  - Trees: sizes 0.6–1.5, gaps of 1–3 missing crowns, a few taller elms. Let trunks show in the gaps against the hill. Make `FOLIAGE` darker and cooler (shade about `#343f36`, graze `#56603f`, lit `#8d8a4c`), with the golden lit rim up and to the left, so the crowns read as dark masses with lit edges.
  - `engraveWalls`: open hatching on the lit north-west face too (it is dark stone), close crossed hatching on the south-west face, and curved courses on the towers. The gate's arch and the walls' foot stay as they are.
- **Do not break:** the walls' geometry (`RAMPARTS`, corner-on to the sea), the gate's place, the château's place 2–3° left of the belfry, and the belfry and its top (the main session's).

### 6. SHOULD: the wooden fort is a terracotta box with windows on a picket fence.

- **Where:** `sea-hold-0.500`, box 175, 625, 135, 60. Close-up: `hold05-fort-x5.png`.
- **What is wrong:**
  - `paintFort` fills the three parapet faces with flat `red.lit`, `red.graze` and orange tones, and cuts square holes into the face below the top. These read as windows.
  - The piles are pale lit strokes at even spacing (`mix(timber.graze, timber.lit, 0.55)`), like a fence.
  - At 450 m it is the nearest piece of land, yet it has less contrast than the town.
  - History: "a low reddish block bristling with guns" (a British view); red paint is only hinted (Low).
- **Why it reads cheap:** it is the one land object near enough to carry the chaloupe's level (planks, tar, wet, weed), and it is drawn as a flat colour box.
- **Fix** (`plates/harbour.ts`, `paintFort`):
  - Embrasures as notches in the parapet's top line, with dark muzzles, so it bristles with guns.
  - Planks with value variation: the red paint worn, tar at the joints, a lit top edge.
  - The piles tarred dark (about `#2f2a26`), each with a warm lit west edge. Keep the weed band at the foot green-black, and add a wet sheen at the sand line.
  - The braces visible as dark diagonals between the piles.
  - The reflection on the wet strand as broken vertical streaks with a little more alpha.
  - Use a duller, darker red (the paint at an evening graze), not orange.
- **Do not break:** its place and size (true size, `FORT`), the dike stub, and the flag hanging in the calm.

### 7. SHOULD: the flotilla's store is the last grey-blue cube.

- **Where:** `sea-hold-1.000`, box 960, 615, 80, 30. `sea-dive-0.550`, box 980, 560, 70, 25. Close-up: `hold1-town.png`.
- **What is wrong:** `landmarks()` in `lower.ts` builds the store 76 m long with `WALLS.white` and `ROOFS.slate`. It is the brightest wall and the bluest roof in the town, and it sits at the town's foot in the centre. History gives no material for it.
- **Why it reads cheap:** a long white box with a pale blue lid is exactly the owner's bug 8.
- **Fix:** stone (the darker `WALLS.stone` of finding 1) or a limewash that is clearly warm. A tile roof, or a dark slate one. A few dormers or roof lights along the ridge. Its 4 chimneys taller. Rows of windows dark with one or two gold blazes. The roof broken into two or three spans with a step, so the 76 m do not read as one lid.
- **Do not break:** its place at the head of the harbour and its length.

### 8. SHOULD: the roofscape is one repeated house. Give it landmarks and variety.

- **Where:** `sea-hold-1.000`, box 640, 540, 450, 90. In the engraving, `sea-dive-0.550`, box 640, 450, 520, 140, it reads as an even fish-scale texture.
- **What is wrong:**
  - In `house()`, frontages are 5–10.5 m (×BUILD), with 2–3 storeys and a gable or eaves front. The rows follow the river in parallel at a 26–38 m pitch. So every row is the same rhythm of the same house.
  - Saint-Nicolas has only "a low bell-cote" in `landmarks()`. History says the church had a modest steeple after 1688, and the 1804 views show two small spires in the lower town (`town-and-defences-check.md`, confirmed in the Pocock and Lewis crops). No vertical accent breaks the lower town.
- **Fix** (`plates/town/lower.ts`):
  - Give Saint-Nicolas a slender slate steeple (a square base and an octagonal broach spire, about 20–25 m drawn at BUILD).
  - Add a second small spire, a chapel, where the views put it.
  - In `house()`, add a few big hipped houses (about 1 in 25, frontage 14–20 m), and let 1 in 10 houses step up or down a storey from its neighbours.
  - Let the cross streets (`crossStreets`) show as dark slots climbing the slope: paint a dusk wash into each street's gap in `paintGround` before the houses.
- **Do not break:** the rows' layout along the river, and the jobs' budget (22 row jobs, chunks of 20).

### 9. SHOULD: the forest of masts does not read.

- **Where:** `sea-hold-1.000`, boxes 700, 605, 50, 45 and 805, 605, 190, 45 (pale masts behind the battery and along the quays). Most of the basin is hidden behind the dunes and the fleet. Close-ups: `hold1-town-left-x4.png`, `studio-town-right-x3.png`.
- **What is wrong:** `paintCraft` in `harbour/basin.ts` hazes the craft at 1.25 times their distance, and draws masts 1 device px wide in a pale brown. What shows reads as pale scaffolding, not as a dense comb of masts with furled canvas. Behind it, `basinQuay` paints a flat grey slab with a hard top and a hard right end (visible in the studio at 3×). It is hidden at the hold, but it shows as soon as the dunes do not cover it.
- **Fix:**
  - Use the true distance in `air`.
  - Masts 1.3 px, darker (`#4a3b2e` before the air), with the lit west hairline kept.
  - The furled canvas on the yards a little brighter and thicker, so the yards make a rhythm of gold dashes.
  - Small pennants at a few mastheads.
  - In `basinQuay`: a coping line, courses, the quay's top lit, weed and wet at its foot, and its ends faded by `fadeEdges` instead of cut.
- **Do not break:** the craft's types and tiers, and the 30-craft jobs.

### 10. SHOULD: the town's engraving has no tonal massing.

- **Where:** `sea-dive-0.550`, box 640, 450, 620, 150. Close-up: `dive055-town-x3.png`.
- **What is wrong:** `engraveBuildings` outlines every house fully and gives similar hatching density everywhere. So the town is a grey texture of equal weight, with no lit passages and no dark passages. The jetty blots (finding 2) are the only blacks.
- **Fix:**
  - Engrave the ground between houses (`engraveGround`) with close crossed hatching, so the streets and the gaps are the darks. The lit fronts then stay open paper.
  - Thin the contours of the far plate (`penAt` × 0.8 for `lower-town-far`).
  - Drop the full outline on houses whose front is lit (`f.f > 0.7`): an open stroke along the roof and the shaded corner is enough, as an engraver would draw it.
- **Do not break:** the hatching along the walls' uprights and the roofs' fall lines, which is right.

### 11. COULD: the belfry's tower is drawn as a six-storey house.

- **Where:** `sea-hold-1.000`, box 1062, 530, 20, 35. Close-up: `studio-upper-x4.png`.
- **What is wrong:** `upper()` builds the belfry with `build({ storeys: 6 })`, so `paintBuildings` gives it house windows in 6 rows. History has four small corner turrets on its square stage, which are not drawn.
- **Fix:** paint the belfry's faces without house windows. Use one or two tall louvred openings at the bell stage and plain coursed stone below. Add four small corner turrets (tiny pointed caps) at the top of the square stage. Keep the telegraph's regulator and arms dark and at least 1.5 device px against the sky. The spire is the main session's.

### 12. COULD: the town meets the north cliff along a hard diagonal.

- **Where:** `sea-hold-0.500`, box 590, 540, 90, 110. Close-up: `hold05-junction-x4.png`.
- **What is wrong:** the cliff's descending flank ends in a bright yellow-green stripe that runs down over the first houses of La Beurrière. The houses stop against it with no ground between them.
- **Fix:** coordinate with the shore's painter (`north-cliffs`). Step the La Beurrière houses up under the cliff with gardens and walls between them (`allowed()` in `lower.ts`), and put the cliff's toe into shadow where it meets the roofs. Take the grass stripe's saturation down.
