# Session 27 critique: the vessels and the whole

Critic: whole (the vessels, the whole picture, the transition, the status of the owner's points). Read-only on the code. I judged the production frames of commit 7f084fe in `.claude/s27/prod-merged/` (1280×720 CSS at device scale 1.5, so 1920×1080 px). I also used the owner's screenshots in `docs/screenshots/scene-02/boulogne-sea/owner/`, the bar image `.claude/s27/craft-vs-victory.png`, and studio shots of the current tree at scale 3. My crops are in `.claude/s27/critique/whole/` (git-ignored). Boxes are `x0–x1 × y0–y1` in px of the 1920×1080 frame.

I did not judge the smoke, the moon's place, the belfry's top, the dark sky under the title, or the legacy code. The main session is changing them. The area critics (`s27-critique-sky-water.md`, `-shore.md`, `-town.md`) cover their areas in depth. Where I agree with them I point to their finding and do not repeat it. My findings are the ones that cross areas, and the vessels.

## Verdict

The vessels are at the bar, and so is the town's roofscape in its general idea. Everything else is below it. The near chaloupe and the bateau join everywhere I looked at three times scale: mastheads, gaff, boom, bowsprit cap, jib-boom, stays, shrouds, footropes. Their flags follow one physical wind. But the merge cut off their long reflections, which is half of what the owner liked in `craft-vs-victory.png`. Must 1 brings them back.

The whole picture has three faults that no single area can fix alone:
- **No value plan.** The land, the strand and the low sky all sit in the same light-to-mid band. The only darks in the frame are the near hull and the near water. So the shore reads as a pale frieze pasted on a pale sky.
- **More than one sun.** The clouds are lit from 40° up and to the left. The rock, the houses and the flags are lit from behind the eye. The flags on land and the flags afloat blow in different directions.
- **Ink without tone.** The engraving stage is now an engraving in places (the craft, the town). But it has no tonal plan, and the owner's "broken horizontal line" is still there as a dotted rule along the strand.

The composition also needs a nudge. The brightest mass (the big cumulus) sits on the right edge, next to the hero's ensign. The story's centre (the harbour mouth) is the weakest drawing in the frame. Of the owner's ten points:
- **Closed:** 1, 3 and 8. Point 2 is closed apart from two small leftovers.
- **Partly closed:** 4, 5, 7, 9 and 10.
- **Open:** 6. The owner has repeated it ("popcorn").

## Status of the owner's points (brief, "Owner review, 13 November")

1. **Sideways scroll bar.** *Closed* in code in session 25: `html { overflow-x: clip }` and the art centred on 50 % of its box (`view.ts`, `boxStyle`). `hscroll.mjs` found no overflow then. The frames cannot show a scroll bar (headless). Re-measure on the merged build with the planned `overflow.spec.ts` next session.
2. **Spars and rigging don't join.** *Closed* on both heroes. See `studio-hero.png`, `studio-hero-maintop.png`, `studio-hero-bow.png`, `studio-hero-stern.png` and `studio-bateau.png`: every stay, shroud, yard, gaff and boom starts and ends where it belongs. The main topgallant stay disappears behind the pennant, which is correct. Two small leftovers:
   - the anchor cable reads as a straight rod with a hook (`sea-hold-0.500`, 1030–1110 × 700–790);
   - a dark cathead block stands ahead of the stem at the rail.

   Both are in finding 8.
3. **Vessels cut out, no waterline, no reflection, flat hull.** *Closed* for the hull: waterline, planking, wales, ports and warm light on the side (`hold50-hero.png`). The reflections were done (studio) but the merge cut them off (finding 1). Until that is fixed, this point is *partly* back.
4. **Half-transparent camp rectangle with a hard right edge.** *Closed* as an artefact. No slab and no hard edge in any frame. The camp is still far below the bar, though. In colour it is a field of separate identical rectangles over the whole plateau, from the brow (y ≈ 520) to the skyline (y ≈ 440). That is about 3° high; history says a band of 0.3–0.4°. In ink it is rows of framed "postage stamps" (`dive55-cliff.png`). See shore findings 4 and 8.
5. **Slanting dark stripes on the cliffs.** *Partly closed.* The slanting stripes are gone. In their place are evenly spaced vertical dark gutters with green fills at x ≈ 140, 290, 425 and 550, y 525–690 (`sea-hold-0.500`, `hold50-cliff.png`). In ink they become dense vertical hatch bars (`dive55-cliff.png`). They read as the same kind of artefact. See shore finding 2.
6. **Tooth cloud; clip-art flat-bottomed clouds.** *Open.* The tooth is gone. But the mid-sky clouds are clones of one flat-bottomed, lumpy-topped, double-tailed recipe at one altitude (`sea-hold-0.500`: 535–765 × 310–350, 860–1180 × 325–370, 1005–1280 × 228–265, 1290–1550 × 285–328, 1790–1920 × 222–245). The big cumulus (1510–1920 × 300–550) is a stack of bulbs, each with its own lower-right crescent. The cirrus are ruled lines. The owner has called this "popcorn". See sky-water findings 2, 3, 4 and 8, and finding 2 below for the one sun.
7. **The title's scrim reads as a dirty smudge; contrast at least 4.5:1.** *Partly closed.*
   - **Over the painting: closed.** At the hold the scrim is hidden and the sky under the title is about `#3d5275`. My sampling gives about 6:1 against the title; measure it with `contrast.mjs` next session.
   - **Over the chart: still there.** The same blurred dark smudge shows over the chart's bright haze at `sea-dive-0.000`, `-0.150` and `-0.300`, and at `sea-rise-0.700` and `-1.000` (box 40–480 × 20–150). See finding 7.
8. **The town as grey-blue cubes.** *Closed.* The town is now separate houses with tile and slate roofs, gables and chimneys, the upper town's ramparts with towers, and the belfry (`hold50-town.png`). What it still lacks (darks, variety, landmarks) is in the town findings.
9. **The engraving stage looks like a loading bug.** *Partly closed.*
   - **Colourless frame brief, colour while the camera still comes down: closed.** `sea-dive-0.550` is the full engraving. At `sea-dive-0.650` colour is coming in while the near brig is still rising from below the frame.
   - **Uniform ruling: partly.** The exercise-book page is gone. But the stroke still does not follow the form in most areas:
     - the water is one even dash texture;
     - the cliffs are a grid of ticks;
     - the hills are dashed contour lines and ruled field patches;
     - the dunes are a dashed zigzag;
     - the clouds are paper shapes with scribbles.
   - **The broken horizontal line: open.** A dotted rule and a dashed row run across the whole width at y ≈ 600–610 (`sea-dive-0.550`, `dive55-line-right.png`). In `sea-rise-0.500` the ink water steps at hard seams at y ≈ 626 and ≈ 684 (`rise50-seam-enh.png`).
   - **No worse than the colour: partly.** The craft and the town are good engraving. The pier heads are solid black blocks marked with an X, the camp is stamps, and there is no tonal plan (finding 3).
   - A new staging fault: the colour arrives as two pictures, a full blue sky over a paper sea (finding 4).
10. **The horizon at the huts is broken.** *Partly closed.*
   - **Colour:** no slab and no hard edge. The huts stand on the ground.
   - **Outreau, colour:** the camp is a strip of identical tan boxes with white ends along the far brow (`sea-hold-1.000`, 1590–1920 × 540–575; `hold100-outreau.png`). It reads as a train or a fence.
   - **Outreau, ink:** the camp is framed rectangles with window dashes, over a brow line so faint that the strip still hangs above the hill (`sea-rise-0.500`, 1490–1920 × 470–505; `rise50-outreau.png`). See shore finding 5.

## Findings

### 1. Must: the merge cut off the craft's reflections (vessels, the bar)

- **Where:** `sea-hold-0.500`. Under the chaloupe (1090–1590 × 765–790) only a dark band about 20 px deep is left. The studio, with the craft alone, shows the masts, bowsprit and rigging reflected in long zigzags about 120 px down (`studio-hero.png`). The bar image shows the same. The bateau (280–540 × 715–740) has the same fault.
- **What is wrong:** The cause is in sky-water finding 1, and I confirm it. The reflection plates sort by their craft's depth. Every swell strip nearer than the craft paints its opaque body over the reflection.
- **Why it matters:** The long broken reflection is the most "painted" thing in the bar image. Without it the hull sits on the water like a cut-out again, which is owner bug 3.
- **Fix:** As in sky-water finding 1. Add a paint-order key to `Plate` (`paint/plate.ts`, `order?: number`, defaulting to `depth`). Sort by it in `plates/index.ts` `buildPlates` and in `BoulogneSea.tsx` `Layers`. Keep `depth` for `shiftFor`. Order each `${h.id}-reflection` just in front of the nearest swell strip, and do the same for the fleet's reflections that fall on the strips. Then shoot `sea-hold-0.000`, `0.500` and `1.000` and `sea-dive-0.720`. Check that the reflections reach about 120 px under the chaloupe, and that no reflection paints over a nearer craft.
- **Do not break:** the reflections' counter-roll and heave (`rock`), their parallax at the craft's depth, their reach to `FRAME_BOTTOM` on the dive (they must still not run to the frame's foot: today they end near y 1040 at `sea-dive-0.650`), and the ink reflection hatching.

### 2. Must: one sun for the whole painting

- **Where:** everywhere.
  - The big cumulus (`sea-hold-0.500`, 1510–1920 × 300–550) is lit from the upper left, with a lilac crescent under each lump.
  - The cliff's gullies (x ≈ 140, 290, 425, 550) are dark on both walls, like bars.
  - The flags on land and the flags afloat point opposite ways (finding 6).
- **What is wrong:** The painters each defined the sun:
  - `plates/sky/cumulus.ts`: `L = [-0.45, 0.42, 0.79]`, about 25° up and well to the left;
  - `plates/heroes/flags.ts`: `SUN_AZ 294`, `SUN_EL 5`;
  - `shore/face.ts`: `SUN_E`/`SUN_N` from 294, no elevation;
  - `town/kit.ts`: `SUN_AZ 294`;
  - `harbour/basin.ts`: `SUN_AZ 294`.

  History-notes ("The painting's light is that of 18:33") puts it at 7.0° up, azimuth 286.2°, 8° left of straight behind the eye. All the painters' 294 is 8° off that, and the clouds are far off.
- **Why it reads wrong:** With the sun almost square behind the eye, every face toward us is lit. Form shows by:
  - edges turning away (cooler, slightly darker at the silhouette);
  - cast shadows that fall away from us;
  - air between the masses.

  It does not show as a shaded side on every lump. One wrong light in the brightest object in the sky (the cumulus) breaks the evening for the whole frame.
- **Fix:** Put one `SUN = { az: 286, el: 7 }` and its view-space unit vector in `scene.ts` (about `[-0.14, 0.12, 0.98]` at heading 98: left, up, toward the eye). Import it in `cumulus.ts` (replacing `L`), `flags.ts`, `face.ts`, `town/kit.ts` and `harbour/basin.ts`. Then apply the area fixes on top of it:
  - **Clouds:** sky-water finding 2. Soft terminator, small `SHADOW`, skylight on the up-facing parts, and few lumps in the lower half.
  - **Cliffs:** shore finding 2. The shade only on each gully's north (left) wall and in the clefts.
- **Do not break:** the craft's light, which is already right. Its own `light.ts` must give the same result after the change: check `studio-hero.png` before and after.

### 3. Must: one value plan, the same in colour and in ink

- **Where:** `sea-hold-0.500`, the band from y 440 to 700. My samples, as HSL lightness:
  - lit cliff 67, cliff beds 56, plateau 64;
  - Outreau slopes 61–66, Mont Lambert 61, town 61;
  - strand 75, low sky 72, sky at the skyline 77.

  The only real darks are the chaloupe's hull (23) and the near water (20). In ink (`sea-dive-0.550`, `sea-rise-0.500`), everything is the same mid-weight line on the same paper.
- **What is wrong:** Each area was painted for itself at a pleasant mid value. Together they make one pale band against a pale low sky. The shore does not separate from the sky, the harbour does not pull the eye, and nothing gives depth but the haze. The shore critic (finding 7) and the town critic (finding 1) each found "no darks" in their area. It is one problem.
- **Why it reads cheap:** The bar image works by value as much as by line: a dark hull, light sails, a dark sea, a light sky. Without darks, line work looks like a diagram.
- **Fix:** Set a value ladder for the whole in `scene.ts` (next to `PALETTE`), as relative luminance at the hold, and have each area land on it:
  - low sky and lit cloud bases: 0.45–0.60;
  - far hills: about 0.35;
  - lit cliff faces and lit walls: 0.40–0.50;
  - cliff clefts, gully walls and talus in shade: 0.12–0.20;
  - the lower town's stone in shade, roofs turned from the sun: 0.08–0.15;
  - harbour masts, moored hulls, pier piles: 0.05–0.10;
  - near water: 0.03–0.08.

  For the ink, derive each plate's hatching density from the same value. In each area's ink job, take the colour the area already computes for that sample (`bedColour`, the town's wall tones, `waterBody`). Set the spacing of its hatch lines to about `k / (1 − L)`: paper where it is light, single hatching in the half-tones, crossed hatching in the darks. Then the engraving is the painting's value map in line, and the darks of the colour arrive as hatching.
- **Do not break:** the haze's order (farther is lighter and lower in contrast), the caption's dark water, and the title's dark sky.

### 4. Should: the colour arrives as two separate pictures

- **Where:**
  - `sea-dive-0.650`: the sky is at its final colour (sample `#5b6d90` against `#566a8c` at 0.72), the land half-coloured, and the water still paper (`#989d97` against the final `#526066`).
  - `sea-rise-0.350`: the same in reverse.
  - In `sea-dive-0.550` the clouds are bare paper shapes in a grey sky.
- **What is wrong:** `interludes.ts` `TRANSITION` gives the sky `[0.665, 0.78]` and the water `[0.695, 0.845]`. The sky's change is the strongest in chroma (paper grey to deep blue), so it is complete to the eye while the sea has not started. The frame reads as a coloured sky laid over an engraving, not as one print coloured by hand.
- **Fix:** Bring the groups closer together and let the land lead. A hand colourist washes the whole sheet lightly first, then deepens it. For example:

  | Group | Range |
  | --- | --- |
  | land | `[0.665, 0.8]` |
  | sky | `[0.67, 0.81]`, with its share eased in (`share ** 1.5`), so the blue's strength comes after the land's warmth |
  | water | `[0.675, 0.825]` |
  | craft | `[0.69, 0.86]` |

  Check `sea-dive-0.600`, `0.650` and `0.700`, and `sea-rise-0.300`, `0.350` and `0.400`. No frame may show a finished sky over a paper sea.
- **Do not break:** the owner's demand that colour starts while the camera still comes down, the engraving's short colourless moment, and the text's timing (`textOut`, `textIn`).

### 5. Should: the composition puts its weight on the right edge and leaves the centre weak

- **Where:** `sea-hold-0.500` and `sea-hold-1.000`.
  - The brightest mass in the frame is the big cumulus on the right edge (1510–1920 × 300–550, lightness 83).
  - The most saturated notes are the chaloupe's ensign and pennant next to it.
  - The moon is about to move into the same third.
  - The story's centre (the harbour mouth, the flotilla's way out at low water, 680–830 × 600–700) is mid-value, low in contrast, and drawn as crates and a box (town findings 2 and 3; the pale channel in sky-water finding 9). The chaloupe's bowsprit points straight at it.
- **What is wrong:** The eye goes chaloupe, ensign, cumulus, then out of the frame on the right. Everything else is parallel horizontal bands: the cliffs' beds, the strand, the line of craft, the swell. Nothing leads in.
- **Fix:**
  - **The east cumulus** (`clouds.ts`, the group `cloud-east`) stands far off in the haze. Lower its value and contrast, keep its brightest tower left of about x 700 units, and keep the right edge of the frame quieter.
  - **The brightest land light** goes to the harbour mouth: the wet strand's glow in front of the town, the lit west walls of the quays.
  - **The deepest land darks** go there too: the forest of masts in the basin, the jetty piles in shade (finding 3's ladder).
  - **The north camp** becomes the thin band of overlapping roofs that history describes (shore finding 4). Then the plateau above the cliffs stops being a second bright, busy plane competing with the town.
- **Do not break:** the line of craft broadside, the hero's place, the cliff's mass on the left, or the clear sky under the title.

### 6. Should: one wind for every flag

- **Where:**
  - **Vessels:** `plates/heroes/flags.ts`. Every vessel flag is a cloth that hangs heavily and leans toward the wind's vanishing point on the horizon. That point is at about x −140 units (frame x ≈ 751). So flags left of it lean right, and flags right of it lean left. The chaloupe's ensign and pennant go left, and the bateau's ensign goes right. This is right.
  - **Shore flags:** `shore/draw.ts` `flag()`. They are stiff flat panes streaming horizontally to the left, whatever their place. So the camp's flags on the north cliffs (`sea-hold-0.500`, 60–240 × 480–495) fly left while the moored craft right below them lean right.
  - **Harbour flags:** `harbour.ts` `paintBattery` (line ≈ 430) and `paintFort` (line ≈ 735). They are flat rectangles drawn to the right of the staff. The pierhead battery's flag sits right of the vanishing point and flies the wrong way. The comment says "hanging in the calm", but the flag is drawn flying.
- **Why it reads wrong:** "One light westerly air, flags hang heavily": stiff horizontal flags say "fresh breeze", and two directions in one frame say "two winds". Rigid three-pane flags are also the "flat infographic" look the brief forbids.
- **Fix:** Export from `heroes/flags.ts` a staff flag built on `clothShape`, `paintCloth` and `engraveCloth`, with a `FlagSite` for a staff ashore (metres ahead, right, the staff's top). Use it in `shore/draw.ts` (`flag`, `paintFlag`) and in `harbour.ts` (battery, fort). At the very least, compute the fly's direction from the vanishing point (`Math.sign(xVP − x)`) and let it hang 40–60° below level, foreshortened.
- **Do not break:** the vessels' flags (the owner likes them), and the ink heraldic hatching.

### 7. Should: the title's smudge is still there over the chart (bug 7)

- **Where:** `sea-dive-0.000`, `-0.150` and `-0.300`, and `sea-rise-0.700` and `-1.000`, box 40–480 × 20–150. The chapter scrim (`RoadText.tsx`, `data-el=scrim-chapter`, curve `CHAPTER_SCRIM` in `ink.ts`) is a dark blurred patch over the chart's bright pitched-up haze (`#e0c7a0` around it). It is the same smudge the owner circled in bug 7.
- **What is wrong:** The fix hid the scrim while the painting covers (`Scene02Road.tsx`, ≈ line 340). But the dive starts and the rise ends on the chart with the camera already pitched up into the haze, and there the smudge is at its most visible.
- **Fix:** On this interlude, fade the chapter marker and its scrim out with the caption from the dive's start, and back in over the painting's dark sky (`TRANSITION.textOut` starts at u 0.585, but the haze is behind the title from u ≈ 0). Or, better, let the chart's own sky be darker under the title, as the painting's sky is, so no scrim is needed. If this exact frame was already on the approved chart beat, ask the owner rather than change the chart's look.
- **Do not break:** the scrim on the other beats of scene 2 (the approved chart), and the 4.5:1 contrast wherever the title shows.

### 8. Could: the chaloupe's anchor cable and cathead

- **Where:** `sea-hold-0.500`, 1030–1110 × 700–790 (`hold50-hero.png`), and `studio-hero-bow.png`.
  - **The cable:** a straight rod from the hawse into the water, ending in a hook.
  - **The cathead:** a dark block standing ahead of the stem at rail height.
- **What is wrong:** `src/components/ship/craft/geometry/rigging.ts`, the cable block (≈ lines 380–400):
  - The control point `C` sits at 0.42 of the hawse's height. That is almost on the chord, so there is no visible sag.
  - The polyline goes on past the water entry `W` to `under`, below the waterline. The hull plate draws that part over the water, and it shows as the hook.
  - The cathead rectangle (`a.catted.at`) sits outside the stem's profile.
- **Fix:**
  - **The cable:** end it at `W` (drop `under` from `cablePts`, or clip at y 0). Give it a catenary sag (`C` at about 0.25 of the hawse's height). Draw a small ripple of two short light arcs where it enters the water.
  - **The cathead:** move it onto the bow's side, inside the stem's profile, just below the rail, with the catted anchor hanging under it.
- **Do not break:** the craft's bounds (`geometry/index.ts` uses `cableEntry`), the bateau and the fleet, which share the geometry, and the lab page `/lab/craft`. Scene 1 does not use this geometry.

### 9. Could: the south battery's flag is cut off by its plate's box

- **Where:** `sea-hold-0.500` and `-1.000`, the flagstaff on the Outreau crest at x ≈ 1485–1492, y ≈ 543–560 (`hold50-battery.png`). The staff ends flat at y 78 units and its flag is missing.
- **What is wrong:** `south.ts` creates `dunesPlate({ id: "south-dunes", box: [-100, 905, -8, 78] })`. Châtillon's battery (`dunes.ts` `battery()`) puts the staff's top and the flag above 78, so the canvas clips them.
- **Fix:** Raise the box's top to about 92, or compute it from the battery's flag top.
- **Do not break:** the dunes' plate memory (check the studio's canvas line).

### 10. Could: check the moon's new place against the chaloupe's rigging over the whole hold

This is a coordination note, not a judgement of the moon's work. At x 248 units the moon's centre falls at frame x ≈ 1327, about y 530 if its lower limb sits on the skyline.
- At `sea-hold-1.000` the chaloupe's ensign covers 1305–1345 × 515–615. It would sit right on the moon.
- At `sea-hold-0.500` the moon would be among the main stays between the masts.

A moon seen through rigging is a fine marine motif, but behind the ensign it is lost. Shoot `sea-hold-0.000`, `0.500`, `0.800` and `1.000` after the move. If the ensign covers the disc for long, shift the moon a few units, or shorten the hold's drift.

### 11. Could: a faint hard-edged rectangle on the chart

- **Where:** `sea-dive-0.300` and `sea-rise-0.700`, 1040–1580 × 895–1002. A rectangle about 3 levels lighter than the chart's water around it, with a wavy top edge (`dive30-enh.png`, contrast raised six times).
- **What is wrong:** It is nearly invisible (about 1 %). But it has the shape of owner bug 4's "half-transparent rectangle". It is either a painting plate at an opacity just above 0 during the chart stage, or a chart tile.
- **Fix:** Find which layer it is. If it is the painting, hide the painting's layer (`visibility: hidden`) while every share in `paintingAt` is 0, rather than leaving it at a tiny opacity.
- **Do not break:** the painting's warm-up (plates already painted before the dive).

## Where I agree with the area critics (not repeated above)

- **The water is tiled.** I measured it on `sea-hold-0.500`:
  - rows at y 800–806 repeat every 636 px (correlation 0.97);
  - rows at y 1000–1056 repeat every 831 px (0.96). That is the 560-unit cap on `period` in `swell.ts` `strip()`.

  The near water is one tile shown 2.3 times across the frame, and its glints are tan to khaki (`#7b7568` to `#ad9e85`) rather than the lilac and pink of the sky they mirror. Sky-water finding 5. One extra technique: two dash layers per strip at incommensurate periods (for example 560 and 433 units, same drift) repeat only at their least common multiple, so no shape repeats inside the frame, at little memory cost.
- **The dotted rule along the strand** (`strand.ts` `paintDriftLine` in ink, and `inkEdge`), **the swell seams** (`swell.ts` `paintBody` below the next strip) and **the dashed channel banks** (`inkStrand`): sky-water findings 6, 7 and 9. These close the open part of remark 9.
- **The cliffs:**
  - layered cake: shore finding 1;
  - the gullies: shore finding 2;
  - the brow's crust: shore finding 3.
- **The camps:**
  - the right camp is eight times too tall: shore finding 4;
  - the left camp still hangs as a strip: shore finding 5.
- **The harbour mouth:**
  - the crates: town finding 2;
  - the battery box: town finding 3;
  - the fort box: town finding 6;
  - the pale channel: sky-water finding 9.

  This is the focal point (finding 5), so these should go first among the "shoulds".

## What must not regress

- **The vessels:** do not redesign the hulls, rigs, furled sails, flags or light. Finding 1 only gives back their reflections.
- **Scene 1:** it shares nothing with `src/components/ship/craft/`. The regression run after the merges is still due.
- **The technical key:** plates painted once ahead of the dive, only wrappers moving, worst job under about 6 ms (check with `sea-studio.mjs` after each fix), no CSS filters, blurs or bloom.
