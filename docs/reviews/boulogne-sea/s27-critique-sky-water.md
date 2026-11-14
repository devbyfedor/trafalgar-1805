# Session 27 critique: the sky and the water

Critic: sky-water. Read-only on the code. I judged the production frames of commit 7f084fe (`.claude/s27/prod-merged/`, 1920×1080 device px), the owner's screenshots, the bar image `.claude/s27/craft-vs-victory.png`, and studio shots of the current tree. My crops are in `.claude/s27/critique/sky-water/` (git-ignored). Pixel boxes below are `x, y, w, h` in px of the 1920×1080 frame. I left out the moon, the smoke, the belfry and the dark sky under the title, which the main session is changing.

## Verdict

The sky and the water are well below the bar the owner set with the craft. Their code is serious work: a per-pixel cloud shader, a periodic swell, and a wet strand with pools and runnels. But three wrong choices sink the result. First, the clouds are lit from 40° up and to the left. The project's own history says the sun is 7° up and 8° left of straight behind, so the light comes almost square-on. That side light, with a crisp terminator and a cast-shadow crescent under every lump, turns the big cumulus into a pile of clamshells, and every small cloud into the same lumpy hat. Second, the swell paints sunlit tan "faces" on blue water. The history notes say the sea ahead mirrors the cool eastern sky. The result is one tan eyebrow glyph repeated row after row, and each strip repeats measurably every few hundred px. Third, the merge broke the reflections the owner praised: the nearer swell strips are painted over them. The near chaloupe's long mast reflections in the bar image are cut to a 20 px dark band. The strand reads as dry beige, and the Liane's channel reads as a milky smudge. In the engraving, the sky is random dashes, the clouds are outline diagrams, the water is an even tilde texture, and a dotted rule across the strand recreates the owner's "broken horizontal line". In the colour-over-engraving stage, the swell strips meet at hard horizontal seams. Scene 1 does better with less. It has a few long, continuous swells in broad tone bands. Its clouds are low, long strands that sit in perspective near the horizon, and its light has one logic. Restraint, perspective and one consistent light are what this sky and sea lack. The must-items below, done in order, would bring the area up to the bar.

## Findings

### 1. must: the merge cut off the craft's reflections (a regression against the bar)

- **Where:** `sea-hold-0.500`. The near chaloupe's reflection is visible only in the box `1090, 765, 500, 22`. In `craft-vs-victory.png` (right panel) the same craft's masts, bowsprit and rigging reflect in long zigzags about 120 px down. The left chaloupe `280, 715, 260, 25` has the same fault.
- **What is wrong:** The reflection plates (`plates/heroes.ts`, `${h.id}-reflection`, depth = `h.ahead`) sort by depth like every plate (`plates/index.ts`, `buildPlates`; `BoulogneSea.tsx`, `Layers`). Every swell strip nearer than the craft is painted after it, and the strip's opaque body (`swell.ts`, `paintBody`) covers the reflection below that strip's top. The chaloupe sits at 80 m with its waterline at y −75. The 70 m strip starts at y −85.7, so only about 10 units of reflection survive. The masts' reflections never show. `fleet.ts` reflections are cut the same way.
- **Why it matters:** The owner chose these vessels as the bar and said the merge must not lower them. Bug 3 ("no reflections") is half back.
- **Fix:** Give `Plate` a paint-order key separate from its parallax depth, for example `order?: number` in `paint/plate.ts`, defaulting to `depth`. Sort by `order ?? depth` in `plates/index.ts` and in `BoulogneSea.tsx` `Layers`, but keep `depth` for `shiftFor`. Set each reflection plate's `order` just nearer than the nearest swell strip (about 22.5). Keep its `depth` at the craft's distance. Then check that no reflection now paints over a craft nearer than its own. The bateau at 135 m and the chaloupe at 80 m must not overlap on screen. Apply the same fix to `fleet.ts` reflections that fall on the swell strips.
- **Also:** Under the chaloupe's hull, a row of evenly spaced light dashes runs along the waterline (`1100, 760, 360, 6`, see `h05-waterline.png`). It reads as stitching. It is the first row of `wipeFacets` in `heroes/reflect.ts`. Start the wipes a little lower and jitter each sliver's y, so no single row lines up.
- **Do not break:** the reflection's roll and heave (`rock`), its parallax at the craft's depth, its reach to `FRAME_BOTTOM` in the dive, and the ink reflection hatching. The ink hatching is cut off today for the same reason, and it comes back with this fix.

### 2. must: the clouds' light is wrong, and it makes the "popcorn"

- **Where:** `sea-hold-0.500`, the big cumulus `1500, 295, 420, 255`: dark crescents under every lump, and a long swirl on the tower at `1600, 330, 200, 130` (`h05-cumulus.png`). The north group `0, 350, 380, 100` and the mid-sky clouds show the same light on a small scale.
- **What is wrong:** In `plates/sky/cumulus.ts`, the light is `L = [-0.45, 0.42, 0.79]`, about 40° off the view axis, from the upper left. History-notes ("The painting's light is that of 18:33") puts the sun 7.0° up and 8° left of straight behind, so in view space it is about `[-0.14, 0.12, 0.98]`: "lit square-on and nearly without shadow". That side light, with a crisp terminator (`TERM = 0.4`, anti-aliased to one pixel) and cast shadows (`SHADOW = 0.42`, `SX/SY`), puts the same lilac crescent on the lower right of every lump. Repeated over dozens of lumps, the crescents read as scales or bubble-wrap. The head's shadow on the tower becomes the toothpaste swirl. The lumps are themselves fractal-uniform: `lumpsOn` puts 1–3 lumps at 0.34–0.52 of the parent's size on every big lump, then again on those. The comment block also says "sun 5° up".
- **Fix (cumulus.ts):**
  - Set `L ≈ [-0.14, 0.12, 0.98]`.
  - Make the terminator soft: a smoothstep over a light of about 0.15–0.55, not a 1-px edge.
  - Cut `SHADOW` to about 0.06, or drop the cast shadow altogether.
  - Model the forms the way front-lit evening cumulus really looks:
    - **Skylight:** surfaces facing up (`ny > 0`) are mixed 20–30 % toward `skyAt(y + 60)`, so their tops are cooler and pinker.
    - **Separation between masses:** use a slight, warm-grey darkening where `nz` falls toward the silhouette of each mass. Use it at the big masses' edges, not under every lump.
    - **Haze:** it grows downward in the cloud, so the base melts into the low sky.
  - Put the detail where the light catches. Keep crisp lumps on the top silhouette and the upper-left edge of each tower. Cut the face lumps (`tries`) to about a third, and let the lower half of the bank be a few broad, simple forms.
  - Give the bank 3–4 towers of clearly different heights and widths, one of them dominant. Make the farther towers lower in contrast. Hide the base behind the Outreau skyline.
- **Also:** The `cloud-rows` piece with seed 935 (`1660, 300, 260, 55`) crosses the cumulus at its neck like a hat band. Move it clear of the tower.
- **Do not break:** the per-pixel shader and its job banding (keep the worst job under about 6 ms; the studio measured `cloud-north` at 14.8 ms for its first job at S 1.5); the ink's use of the same `Surface`; the haze toward `skyAt`; and the clear corner under the chapter title.

### 3. must: the mid-sky clouds are seven clones on a sticker sheet

- **Where:** `sea-hold-0.500`: `535, 305, 230, 45`, `860, 325, 320, 50`, `1005, 228, 275, 42`, `1290, 283, 260, 45`, `1795, 215, 125, 30`, `1660, 300, 260, 55` (`h05-rows.png`).
- **What is wrong:** Group `cloud-rows` in `plates/sky/clouds.ts` has seven specs with nearly the same parameters (`flat 0.6–0.62`, `height 22–32`, `billow 1.3`, `taper 0.32`, `soft 4`). Each comes out the same: a ruled, tilted, flat base, a hump just left of centre, and needle tails at both ends. They have the same size at every height and are scattered evenly over the middle of the sky. This is exactly the "popcorn, repeated lumps" the owner named.
- **Why it reads wrong:** Clouds at one height obey perspective. Higher in the frame they are nearer and overhead, so they look bigger and more open, and their darker undersides show. Toward the horizon they are flatter, thinner and more crowded. Scene 1 keeps its clouds as long, low strands in that perspective.
- **Fix (clouds.ts, GROUPS):** Replace the seven puffs with two or three broken bands of stratocumulus or altocumulus that follow perspective:
  - **High band (about y 260–330):** a few large cells, 120–220 units wide, with gaps between them. Each has an irregular base (raise `baseWob` and `rag` amplitude) and a visible underside, a cool-lilac shelf with a warm lower lip.
  - **Lower band (about y 150–200):** many small, flat, crowded cells, hazier.
  - Build each band from many small specs of varied size, using a power-law size spread, rather than a few specs with towers.
  - Give the ends blunt, torn fragments instead of needle tails (raise `taper` toward 0.7, and keep `fragments`).
  - Leave broad open sky, especially round the moon and over the town, and let the bands lead the eye toward the town.
- **Do not break:** the title corner (top left) staying clear and deep blue, and the open sky round the moon at x 248.

### 4. must: the "undersides lit by the low sun" are a horizontal stripe

- **Where:** `sea-hold-0.500`, the big cumulus. A peach band with a straight, hard top edge runs across the lower lobes at about y 492 (`1605, 488, 280, 50`). In the north group, a flat peach strip runs along the base (`110, 425, 260, 15`).
- **What is wrong:** In `cumulus.ts`, `paintRows`, the warm underside is gated by `low = 1 - clamp((hz - 0.18) / 0.3)`, where `hz` is the pixel's height as a share of the whole cloud. It is then cut by a crisp threshold on `ny` (`(-0.22 - ny) / dn`). This makes a band that is ruled across the cloud at one height and ignores each form.
- **Fix:** Drive the warmth by the form and by its height above the local base:
  - `w = exp(-(y - cl.baseAt(x)) / (0.35 * spec.height)) * smoothstep(0.1, -0.5, ny)`.
  - Use a wide smoothstep, not a 1-px edge.
  - Colour from gold-apricot (`#f2be86` low) to the lit cream higher up. The sun's light at the cloud's lower parts crosses more air, so it is warmer.
  - Add a thin, bright warm lip where the base's front edge turns toward the eye (`E` small and `ny < 0`). That lip is what reads as "lit from below" at this sun height.
  - On the high mid-sky cells (finding 3), the flat underside itself shows as a cool lilac shelf under that lip.
- **Do not break:** the haze mix, and the base's ragged soft edge (`soft`, `rag`).

### 5. must: the water is a wallpaper of tan eyebrows

- **Where:** `sea-hold-0.500`, `0, 700, 1920, 380` (`h05-water-near.png`, `h05-midwater.png`), and every colour frame of the dive.
- **What is wrong:**
  - **(a) Wrong colour logic.** `waterCrest` in `plates/water/shore.ts` paints "faces turned to the sun" warm tan, darkening to brown near the eye (`#6a5e51`). History-notes: "The sea ahead mirrors the cool eastern sky; the warm sky and the sun's glitter are behind the camera." Tan on dark teal reads as floating sand or a camouflage print, not light on water.
  - **(b) One glyph.** `face(x) = tmax · max(0, 0.18 + f(x))` gives the same pointed lens at every distance, spread evenly in every row.
  - **(c) Ruled threads.** Each row strokes a full-width dark trough thread (`paintRows`, `rgba(waterTrough(r.d), 0.45)`), so thin wavy rules cross the whole frame.
  - **(d) Repeats.** Each strip repeats every `period`. Measured on `sea-hold-0.500`, rows y 795–830 correlate at 0.63 with themselves shifted 636 px, and rows y 740–790 at 0.40 with a 458 px shift.
  - **(e) No large-scale structure.** One light westerly air at evening gives glassy slicks and ruffled lanes. Nothing here does that.
- **The bar:** The water in `craft-vs-victory.png` (right panel) is calm, pearl-grey and lets the reflections carry the picture. Scene 1's sea is a few long continuous swells in broad tone bands.
- **Fix:**
  - **Colours (shore.ts):** Light marks are the backs of wavelets mirroring the low sky. Make them pearl, warm only far off: far `#e8d3c4`, mid `#bdb6c4`, near `#8f9db2`. The faces tilted to the eye mirror the high sky. Make them deep blue, from `#4f6688` far to `#2b425c` near. Keep `waterBody`.
  - **Glyphs by distance (swell.ts `paintRows`):**
    - Far (d > 120 m): long, hair-thin horizontal streaks, 30–120 units long.
    - Middle: slivers with a crisp upper edge and a soft lower one, grouped in clusters with gaps.
    - Near (< 50 m): a broken net of joined facets, light and dark, larger and fewer.
  - **Remove the full-width trough stroke.** Use dark facets in clusters instead.
  - **Slicks and a cure for the repeats:** Add one static slick plate per strip at that strip's depth (depth `D_i - 0.01`, no `swell`, so it does not drift; half resolution is fine for its soft parts). Paint it aperiodic across the whole frame: long, lens-shaped lanes of the low sky's pearl at alpha 0.5–0.8, crisp on their far edge, ragged on the near one, longer than wide, thinning toward the horizon. They hide the ripples' period, give the evening's glassy lanes, and need no longer periods (memory stays as now).
  - Lower the near contrast, so the reflections (finding 1) dominate as in the bar image.
- **Do not break:** the strips' loop (`swell.period`, drift and bob), the dark water under the caption (contrast at least 4.5:1), and the strips' dive extensions.

### 6. must: hard horizontal seams between the swell strips in the transition

- **Where:** `sea-dive-0.650`: a seam across the full width at y ≈ 754 (`d065-band.png`), cooler and darker above, warmer below. `sea-rise-0.350`: seams at y ≈ 755 and ≈ 840 (`r035-seams-enh.png`). They are not visible at the hold.
- **What is wrong:** `swell.ts` `paintBody` colours each strip by `waterBody(distanceAt(y))`, the distance at the hold for that screen height. That includes the strip's extension below the next strip's top, which is painted for the dive. With the camera higher, the parallax opens that extension, and it shows tones meant for nearer water (darker). The next strip then starts lighter at its own top. Each junction is a ruled horizontal line, the same class of artefact as the owner's remark 9.
- **Fix (swell.ts, `paintBody`, and `rows`/`paintRows` for the extension):** Clamp the distance to the strip's near edge:
  - `waterBody(Math.max(EDGES[i + 1] ?? 0, distanceAt(Math.min(-1, y))))`.
  - In the extension below `nextTop`, keep the row spacing and colours of that edge distance as well.
  - Then each strip's revealed bottom matches the next strip's top at any camera height.
  - Do the same in `strand.ts`, `paintEdgeWater`, for its stops below the first strip.
- **Do not break:** the strips' dive coverage (the extension must still fill the gap), or the tones at the hold.

### 7. must: the engraved water and strand are an even texture, and the strand carries a dotted rule

- **Where:** `sea-dive-0.550`:
  - A dotted rule and a dashed rule across the whole width at y ≈ 600–612 (`d055-edge-right.png`, `0, 596, 1920, 20`). This is the owner's remark 9: "a broken horizontal line runs across the middle of the frame and leaves it on the right".
  - Two slanted dashed lines running down into the water from the timber fort at x ≈ 724 and 787, y 610–700 (`d055-channel.png`).
  - The water `0, 620, 1920, 460`: even tildes with no tone (`d055-water.png`, `studio-ink-water.png`).
- **What is wrong:**
  - **The rules.** `strand.ts` `paintDriftLine(c, true)` draws strokes 1–4 units long with gaps of 1.5–4.5 along an almost straight line, which is a dotted rule. `inkEdge` draws the low-water edge as regular dashes over the full width.
  - **The slanted lines.** The channel's banks in `inkStrand` run down through the far plate's dive extension (`farY` down to u 1). The engraved strand looks like the engraved water, so the banks read as lines in the water.
  - **The tildes.** `swell.ts` `inkRows` makes the same broken crest strokes and trough strokes at every distance. Nothing reserves light or builds dark, so the engraving has no value plan. The owner asked that it be "no worse than the colour".
- **Fix:**
  - **Water (`inkRows`):**
    - Far: long fine lines, nearly continuous, opening to bare paper in the bright far water and in the slicks (use the same slick field as finding 5).
    - Middle: shorter wavy strokes.
    - Near: closer, heavier strokes, tightest in the faces.
    - Set the stroke density by the colour's value: dark water gets close lines, and light water is left open.
    - The craft's reflection hatching comes back with finding 1.
  - **Strand:** Make it a light tone of short strokes following the shore, with the wet sheen left as paper.
  - **Low-water edge:** a firm line of varying weight with a few irregular breaks, not regular dashes.
  - **Drift line:** irregular clumps of wrack in groups, of varying weight, along a wandering line, with long gaps. No uniform dotted rule.
  - **Channel:** In both modes, stop the channel's banks where the strand ends in the view they are seen from. Do not let them read as lines in the water.
- **Do not break:** the engraving's paper ground under every plate (`inkPaper`, the swell's paper body), or the ripple-row ink of reflections.

### 8. must: the cirrus are ruled lines

- **Where:** `sea-hold-0.500`, `960, 40, 960, 160` (`h05-cirrus.png`): 15–20 straight, parallel, uniformly thin grey lines with pointed ends.
- **What is wrong:** `clouds.ts` `streaks` and `streakPath` make 3–5 strokes on each of five fixed rows. Each stroke has an almost constant thickness (1.2–3.8 units), a bow of at most 6 units over 300–500 units, and a colour mixed 30 % toward the sky at alpha 0.42, which greys it. They read as scratches or speed lines. "Ruled" is the owner's word for what he dislikes.
- **Fix (clouds.ts, `streakPlate`):**
  - Make 3–5 veils, not 20 lines.
  - Build each veil from 20–60 fine fibres along a gently curved spine.
  - Vary the fibres' length and alpha, fray them at one end (a mares'-tail hook), and let them spread a little.
  - Turn the veils' long axes toward one vanishing point below the horizon (perspective of high bands), so they fan rather than lie parallel.
  - Colour: warm and light (`#f7dccb` to `#fbe8d8`, alpha 0.2–0.45), not mixed toward the sky. Highest in the sky, they catch the cleanest light.
  - Group them, one group over the right half and one small one left of centre, away from the title.
  - In the engraving, draw the same fibres as fine strokes. They give the engraved sky its direction (finding 10).
- **Do not break:** the title corner.

### 9. must: the Liane's channel is a milky trapezoid, not water

- **Where:** `sea-dive-0.650` and `sea-dive-0.720`, the channel `725, 600, 75, 70` (`d065-channel.png`, `d072-strand.png`). It is lighter than the sand, with straight diverging sides, and reads as a light beam or a smudge under the timber fort.
- **What is wrong:** `strand.ts` `paintChannel` fills it `#e4d1b3` → `#dac6ab` with pale blobs, which is lighter sand. `channel(u)` is almost straight: the centre moves ±3 units and the width grows 11 → 30.
- **Fix:**
  - Paint it as water, a ribbon that mirrors the eastern sky: cool lilac-blue `#b4adbd` → `#9aa1b3`. It is darker than the sunlit sand, and that colour contrast is what says "water".
  - Give it a few bright, broken glints.
  - Show the fort's and the jetty's reflections in it as broken verticals.
  - Banks of dark wet mud, `#8f7a63` at about 0.5, uneven.
  - Make it meander: centre amplitude about 8–12 units, narrower at the harbour mouth, with one or two bends and side runnels.
  - Do the same in the ink: paper with a few dark wavelet strokes, firm bank lines (see finding 7).
- **Do not break:** the timber fort and the moored line standing on `lowWaterY`; `CHANNEL_U0`; the pools' exclusion round the channel.

### 10. must: the engraved sky is random dashes, and the engraved clouds are outline diagrams

- **Where:**
  - `sea-dive-0.550`, the sky `0, 0, 1920, 300`: short, straight, uniform dashes (`d055-sky.png`).
  - The cumulus `1380, 200, 540, 280`: outline fragments and scythe-shaped terminator arcs, with no tone (`studio-ink-cumulus.png`, pure ink).
- **What is wrong:**
  - `ground.ts` `hatchRows` draws 10–100-unit straight segments of one weight, so the sky reads as noise, not as a deliberate engraver's sky.
  - `cumulus.ts` `inkRows` contours the outline (`E`), the terminator (`lam = TERM`) and the underside (`ny`), which makes outlines, not tone. With finding 2's soft frontal light the terminator contours will mostly vanish anyway. This is the owner's remark 9: "Now it is a diagram of outlines."
- **Fix:**
  - **Sky (`hatchRows`):**
    - Fewer, longer, fine lines.
    - Taper each at both ends: fill a thin tapered path instead of a constant stroke.
    - Grade the spacing, closest at the top and opening downward.
    - Let a very light, wide-spaced tint reach down behind the cumulus bank, so its lit edge reads as reserved paper. The cloud plates already composite paper over the sky's lines, so the lines need no masks.
  - **Clouds (`inkRows`):**
    - Hatch the shade along the form. Store the surface height `Hm` from `sampleRows` in the `Surface` (a new `h` array).
    - Contour the field `y + 0.7·h` at a spacing `s`. Those iso-lines curve over each mass like lines on a relief.
    - Keep them only where the light is low, on the shaded sides and low in the cloud. Add a second set at `s/2` in the deepest shade.
    - Drop the closed outline on the lit side, and keep a few broken outline marks on the shaded side.
  - **Cirrus:** finding 8's fibres as strokes.
- **Do not break:** "sparse and light in the sky" (the owner's remark 9). The sky's tint must stay lighter than any land hatching.

### 11. should: the wet strand reads as dry beige; it does not mirror

- **Where:**
  - `sea-dive-0.720`, `0, 600, 1920, 75` (`d072-strand.png`, `d072-strand-right.png`).
  - `sea-hold-0.500`, `560, 650, 1360, 45`.
- **What is wrong:**
  - **No wet sand.** The whole strand is one warm beige ramp (`SAND`), lighter toward the edge. Wet sand is darker than dry sand, with a mirror sheen.
  - **Weak mirror.** The "mirror" (`mirrorAt` + `softBlob` smears) uses sand-like colours at low alpha, so it never shows the lit cliffs, the town or the green heights inverted.
  - **No reflections.** The craft grounded on the strand and the timber fort cast none.
  - **Ruled edge.** The low-water edge is one ruler-straight bright line across the frame.
  - **Moon streak.** `paintMoonStreak` adds a 1.4-unit `fillRect` bar, which is a ruled vertical.
- **Fix (strand.ts):**
  - **Dry and wet sand:** Keep the dry upper beach warm and sunlit. Make the wet zone (u > 0.12) darker and slightly cooler (about `#c4a888` → `#b49c86`).
  - **Mirror sheen:** Over the wet zone lay the sheen of the low lilac-rose sky (`#d9c3c6`, alpha 0.3–0.5) in long lanes.
  - **Mirrored land:** Show the land inverted as vertical streaks with crisp sides, at alpha 0.35–0.6, in the real land colours: under the cliffs, cream with grey bands; under the town, red-brown roofs and the dark harbour mouth; under Outreau, the green. Not soft blobs.
  - **Grounded craft and the fort:** short dark inverted streaks under each.
  - **Low-water edge:** Paint a lobed film of shallow water above `lowWaterY` (sand showing through warm) and a few sand tongues and bars below it. The swash is a broken bright thread of varying weight. Keep `lowWaterY` itself, because the fort and the moored line stand on it.
  - **Moon streak:** broken dabs, not a bar, and faint ("hardly brighter than the sky", history-notes).
- **Do not break:** the seam between the far and near strand plates (`SEAM_U`, `farTone`) in the dive, and the strand's licence `STRAND_STRETCH`.

### 12. could: the sky's ground is a digital ramp

- **Where:** `sea-hold-0.500`, `0, 0, 1920, 560`.
- **What is wrong:** `ground.ts` is a clean vertical gradient with one soft blob. It has none of the variation of a painted evening sky. Its anti-solar glow sits at x 300, which is 16° right of the axis. The light at 18:33 puts the anti-solar point 8° right of the axis (x ≈ 140) and 7° below the horizon.
- **Fix:**
  - Move the `softBlob` to about `x 140, y -120`.
  - Add two or three very thin, long veils of haze or stratus low over the land (y 20–70) with irregular upper edges, at alpha 0.1–0.2.
  - Warm and grey the sky a touch behind the cumulus bank.
  - Keep it smooth; no grain.
- **Do not break:** the deep, scrim-free sky under the title (the main session owns it now).

## Order for the painters

**Water painter:** 1, then 6 (small), 5, 9, 7, and 11 if time remains.

**Sky painter:** 2 and 4 together (the same shader), then 3, 8 and 10.

After each pass, shoot the same frames on a production build: `sea-hold-0.500`, `sea-dive-0.550`, `sea-dive-0.650` and `sea-dive-0.720`. Put them beside these crops, and beside `craft-vs-victory.png` for finding 1.
