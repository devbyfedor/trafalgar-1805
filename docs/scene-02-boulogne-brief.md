# Scene 2, beat 1: "Boulogne from the sea" — sub-brief

File: `docs/scene-02-boulogne-brief.md`. Prepared on 13 November 2026 from the owner's decision as art director.

This brief covers one change inside scene 2: the Boulogne close view in beat 1. `scene-01-brief.md` still holds for everything this brief doesn't touch, and `scene-02-brief.md` holds for the rest of scene 2. Where either disagrees with this brief about beat 1, this brief wins.

## Status

Keep this section current. Change only the status line and append to the log. Never rewrite past log entries.

Status: **Stage B — complete, awaiting owner review**

Allowed values, in order:
- Stage A — in progress
- Stage A — complete, awaiting owner review
- Stage A — approved by owner *(only after the owner says so in a message)*
- Stage B — in progress
- Stage B — complete, awaiting owner review
- Stage B — approved by owner, merged to main *(only after the owner says so in a message)*

Never mark anything as approved on your own judgement. "Complete" means every done criterion of that stage is met and proven by real tool output, not assumed.

Log:
- 2026-11-13 — brief written; stage A not started.
- 2026-11-13 — session 24: brief committed as the first commit on `s24-boulogne-sea` (from `main` at `d7ed575`); stage A in progress.
- 2026-11-13 — session 24 stopped by the owner mid stage A (the prototype half built: the scroll and the chart's dive and rise work, the painting's first passes in; checks, screenshots and the report's stage-A proof not done); see `docs/progress.md`, session 24.
- 2026-11-13 — the owner reviewed the first painting on the dev server; his review, answers and order of work recorded below as "Owner review, 13 November"; session 25 continues stage A to all its done criteria.
- 2026-11-13 — session 25 stopped by the owner mid stage A: the painting rebuilt on plates painted ahead (colour and engraving), the engraved transition and the eye's move done; the area painters and the history checks stopped before finishing; checks, screenshots and the report's stage-A proof not done; see `docs/progress.md`, session 25.
- 2026-11-13 — the owner's second look (the engraving stage, the huts' horizon, how the painters work) recorded as "Second look, 13 November" under "Owner review, 13 November"; session 26 continues stage A.
- 2026-11-13 — session 26 stopped by the owner mid stage A: the history done and merged (the evening of 10 August 1805), the transition's overlap, two regressions of the scroll driver found and fixed (scene 1's layers, a sub-pixel shift of the other beats); the four area painters' branches drafted and improved but not merged or reviewed; the tools unmerged; checks, screenshots and the report's stage-A proof not done; see `docs/progress.md`, session 26.
- 2026-11-14 — session 27, the painting only (the owner split the rest of stage A over two sessions): the painters' branches merged, the painting brought together (smoke, moon, the belfry's spire, the title's dark sky), one critics' pass and its fixes, every owner point with before and after frames beside his screenshots, scene 1's regression passing on the production build. Still stage A: the tools, the flotilla check, the measurements, the stage's screenshots and the status "complete" are next session's; see `docs/progress.md`, session 27.
- 2026-11-14 — the owner approved the painting (its level must not drop) and kept the chapter title's scrim over the chart at Boulogne as it is.
- 2026-11-14 — session 28: stage A complete, awaiting owner review. The small items (the hold's drift 11.5 m: the moon clear of the chaloupe's ensign, her jib-boom's reflection clear of the caption); `s25-tools` merged; on production builds checked with `served.mjs` on the idle laptop: the frame budget on the dive, hold and rise (two faults found and fixed: the smoke's draws, a reflection job waiting on the GPU; the hold judged by its frames, decision recorded), the preparation without long tasks, every other beat identical to the reference frames, contrast at the four sizes (the captions and the interlude at 4.5:1 or more), scene 1's regression and `npm run check` whole passing; the flotilla check complete; the stage's screenshots in `docs/screenshots/scene-02/boulogne-sea/stage-a/`. See `docs/progress.md`, session 28.
- 2026-11-14 — the owner looked at stage A on the production preview and approved it (his message opening session 29). Nothing goes into `main` yet.
- 2026-11-14 — session 29: stage B in progress. The owner split it over two sessions: this one the look only (the dusk through the hold, the flotilla check's points, the chaloupe's ensign on a staff at the stern); the next the stills (reduced motion, no WebGL), the full checks at the four sizes and the history section. See `docs/progress.md`, session 29.
- 2026-11-14 — session 29 ends stage B's first part (the look): the ensign on its staff at the taffrail; the flotilla check's points; the evening through the hold from the golden light through the sun's last light to the dusk, with the lights in the camps and the town, the moon and its path; no British sail (out of the frame, no open sea in view). Status stays "Stage B — in progress"; the stills, the full checks and the history section are next session's. See `docs/progress.md`, session 29.
- 2026-11-14 — the owner looked at the dusk on the preview and approved it (his message opening session 30); his answers: the chaloupe's masts stay at about 20 m (the doubt into the history), the moon rising through the hold kept (a recorded liberty). The painting's look is not to change.
- 2026-11-14 — session 30: stage B complete, awaiting owner review. The still of the view from the sea for reduced motion and no WebGL (hold 0.38, the sun's last light: the craft and the shore warm, the moon clear of the rigging), in the stacked stills and crossfading in through the interlude without WebGL; the stills' text made readable without WebGL. On production builds checked with `served.mjs`: contrast at the four sizes over every label of scene 2 and the whole hold (0 rows under 4.5:1 in the interlude; only the Gulf's deferred fleet labels under it elsewhere; without WebGL 0 of 354), the frame budget on the dive, the hold (now timed at its end too) and the rise, every other beat identical to the reference frames, scene 1's regression, `npm run check` whole (37 of 37). The history section finished with stage B, its liberties checked against `decisions.md` (and decisions corrected). The stage's screenshots in `docs/screenshots/scene-02/boulogne-sea/stage-b/`. Nothing goes into `main` until the owner says so. See `docs/progress.md`, session 30.

## Owner review, 13 November

The owner looked at the painting on the dev server. His screenshot: `docs/owner-feedback/boulogne-sea-01.png` (local, git-ignored; he saved it as `Снимок экрана 2026-11-13 161210.jpg`). This section wins over the rest of this brief where they differ.

### Answers to session 24's questions

1. **The evening.** Take the evening of 9–11 August 1805, with the full moon. The moon, rising over the town at sunset, is part of the composition already in stage A: low over the town, in the haze. The dusk with the moon is stage B. Record the date and its calculation in `history-notes.md`.
2. **The tide.** Paint low water, with a wide wet strand in front of the town: the sunset and the moon reflect in the wet sand, and in the harbour the vessels sit on the ground. This tells the story: Boulogne's harbour dried out, and the flotilla could only get out at high water. Verify this, and verify the water level at sunset on the chosen evening. If it was not low water then, paint low water anyway and record the liberty in `decisions.md`.
3. **The lengths** of the dive, the hold and the rise stay as they are for now; they are revisited in stage B.

### Bugs seen in the screenshot (fix all)

1. A horizontal scroll bar at the bottom: the page shifts sideways. The painting's layer is clipped to the window's width; the page never scrolls horizontally.
2. The near vessels' spars and rigging don't join. On the right vessel a long spar sticks out of the side to the left at deck level; bowsprits and booms hang apart from the hull; lines stop short of the masts and mastheads. Every line starts and ends where it belongs.
3. The vessels sit on the water as if cut out: no waterline, no reflections; the hull is a flat dark silhouette.
4. Above the left cliffs, a half-transparent rectangle of the camp with a hard right edge.
5. Slanting dark stripes on the cliffs that look like an artefact.
6. The cloud above the left cliffs is shaped like a tooth. And every cloud is clip-art: flat blobs with flat bottoms.
7. The chapter title's scrim over the bright sky reads as a dirty smudge. Over the painting the title must read with no smudge, at a contrast of at least 4.5:1.
8. The town is a set of grey-blue cubes.

### Detail: the bar

The painting is flat and poor now, which this brief forbids outright. The bar:
- **Near vessels** at the level of scene 1's "Victory", allowing for type: planking and wales, ports as the type has them, the shape of bow and stern, tops, yards with furled sails (at anchor the sails are stowed), shrouds with ratlines, stays, flags and pennants, the anchor cable, a reflection, warm light from the west on the sides. Take the art from branch `s24-craft` and bring it up to that level.
- **Detail by distance:** the middle distance simpler, but each type known by its silhouette; the far distance silhouettes.
- **The shore:** cliffs with rock strata, light and shade that follow the form; tiers of huts with roofs, light and shade, chimneys and smoke; the town as separate houses with roofs, the belfry with the telegraph, the upper town's ramparts with their gates; the harbour with its jetties, the timber fort and the forest of masts; hills with fields and hedges, drawn in hatching, not flat fill.
- **The sky:** painterly clouds, their undersides lit by the low sun.
- **The water:** reflections of the vessels and of the sunset; the wet strand.
- **The technical key:** static layers are drawn once, ahead of time, before the dive begins, into finished raster images, and only their wrappers move. Then detail costs almost nothing per frame. Spread that preparation into small pieces, with no long tasks.
- **The proof:** one near vessel shot beside scene 1's "Victory" at the same scale, the comparison saved in `docs/screenshots/scene-02/boulogne-sea/`. If the vessel looks cheaper, keep working on it.

### The transition

It works now but is raw. The owner's plan: the chart does not simply dissolve into the painting. First the chart's coastlines and relief hatching turn into an engraved drawing of the same view, lines only. Then colour comes into it, like an engraving coloured by hand. On the rise everything runs back. Opacity and transform only.

### Order of work

1. These remarks into this brief.
2. History: finish the checks on `s24-boulogne-history` and merge it into `s24-boulogne-sea`, in parallel, through a subagent.
3. Bugs 1–8.
4. The near vessels up to the bar, with the comparison against "Victory".
5. Composition and the shore's detail from the research: the eye closer to the piers; the tiers of huts; Napoleon's pavilion; the belfry with the telegraph; the forest of masts and the timber fort; the line of vessels broadside to the viewer; the rising moon; low water with the strand. Then the sky and the water.
6. The transition through the engraving.
7. The tools and tests onto the new scroll.
8. Checks on the production build at the laptop size: the frame budget on the dive, the hold and the rise; scene 1's regression; every other beat frame for frame against the reference; the contrast of the caption and the title over the painting.
9. The stage's screenshots in `docs/screenshots/scene-02/boulogne-sea/`, the status "Stage A — complete, awaiting owner review", the report by this brief's rules, the stop.

Stage A will likely take two sessions: work in this order of priority. If a session ends early, stop at a safe point: `progress.md` current, everything committed. Nothing goes into `main`. The deferred plan's branches stay untouched. Never run `npm run screenshots`.

### Second look, 13 November

The owner looked at this branch again after session 25. His screenshots: `docs/owner-feedback/boulogne-sea-02.png` (the colour painting at the hold) and `docs/owner-feedback/boulogne-sea-03.png` (the engraving stage on the dive); local and git-ignored, saved as `boulogne-sea-02.png.jpg` and `boulogne-sea-03.png.jpg`. Copies (the browser's frame cropped off) stand beside the after frames in `docs/screenshots/scene-02/boulogne-sea/`.

**His answer on the evening.** The evening with the full moon matters more. Low water is painted as a recorded liberty, as decided. Finish the tide computation only to record that liberty exactly in `decisions.md` and `history-notes.md`. Spend no more time choosing the evening.

**New remarks (fix all):**

9. **The engraving stage looks like a loading bug.** He took it for one himself, so it is badly made. Keep the transition through the engraving, but:
   - the wholly colourless frame holds only briefly; colour starts coming in while the camera is still coming down; the stages overlap;
   - now the whole picture (sky, sea and land) is covered with the same horizontal ruling, like a page of an exercise book. The engraving must be an engraving: the stroke follows the form; in the sky it is sparser and lighter; on the water it follows the waves; on the cliffs and the hulls it becomes hatching for the shadows;
   - a broken horizontal line runs across the middle of the frame and leaves it on the right. It is an artefact: remove it;
   - the engraving is no worse in quality than the colour painting. Now it is a diagram of outlines.
10. **The horizon at the huts is still broken**, as last time (bug 4). The left camp is painted as a flat slab that hangs over the cliffs with hard edges. On the right a strip of huts of the same kind hangs over the hills. The huts lie on the slopes of the heights and follow the relief: no slabs, no hanging strips, no hard edges, in colour and in the engraving.

**The proof for both:** after the fix, frames at the same stages as his screenshots (the engraving on the dive, the colour painting at the hold), saved beside his in `docs/screenshots/scene-02/boulogne-sea/`.

**How the painters work** (the previous session spent its limit on eight painters and critics who read and stopped before writing anything):
- At most three or four painters at once.
- Each painter commits a draft of its area to its own branch as early as possible, and only then improves it. Every noticeable improvement is a new commit.
- Critics come only once the drafts are in the branches, in one pass, not alongside the painters from the start.
- Painters get compressed material: this brief, this review section and the historians' findings they need, not the whole history.

**Order of work for the rest of stage A:**
1. Restart the painters by these rules. The remarks above are part of their tasks.
2. In parallel, history: finish the checks on `s24-boulogne-history`, the note on the evening and the section in `history-notes.md`, then merge the branch.
3. Merge the painters' branches and bring the painting together: the smoke from the camps, the moon's place, the colour, the dark sky under the chapter title. The caption's and the title's contrast at least 4.5:1.
4. Fix the engraving stage as above.
5. Go through this whole "Owner review" section: the eight bugs of the first list and the new remarks. Each is closed, with frames before and after. The near vessel beside scene 1's "Victory" at the same scale also goes into `docs/screenshots/scene-02/boulogne-sea/`.
6. The tools and tests onto the new scroll, by the plan in `progress.md`.
7. Checks on the production build at the laptop size: the frame budget on the dive, the hold and the rise; scene 1's regression; every other beat frame for frame against the reference; the contrast.
8. The stage's screenshots, the status "Stage A — complete, awaiting owner review", the report by this brief's rules, the stop.

If the session ends earlier, stop at a safe point: `progress.md` current, everything committed. Nothing goes into `main`. The deferred plan's branches stay untouched. Never run `npm run screenshots`.

## <context>

- Scene 1 "Dawn" is approved. Scene 2 stage A (the chart engine) is approved; stage B is in progress (see `docs/progress.md`).
- The owner reviewed the production preview in detail. He likes the routes, the labels, Finisterre and the Gulf of Cadiz, and sees no frame drops. One problem: at Boulogne the camps read as a few dozen dark specks and the beat feels empty. The caption promises an army and an invasion flotilla; the picture doesn't deliver it.
- The owner's decision: at Boulogne the camera leaves the chart, descends to the water, and the viewer gets a living, atmospheric view of the roads from the sea.
- The bar: no worse than scene 1. Steady 60 fps on the owner's laptop (Intel Core Ultra 5 125H, Intel Arc integrated graphics, browser window about 1280×720 CSS px at 1.5 scale). The owner judges smoothness himself on the production preview.
- Deferred, do not touch: the rest of the stage B plan in `progress.md` — Cadiz labels on `wip/s23-gulf-labels`, branch 2 (smoke, night lights, signals), the signal relay, the history section on `s23-history`. Record in `progress.md` that they wait for this work.
- Standing rules unchanged: desktop only, zero budget, public repository (no secrets, no copied protected content, research paraphrased with links), no external requests at runtime, fonts as already set up.

## <goal>

Beat 1 sets up the whole campaign: Napoleon's army waits at Boulogne for one thing, command of the Channel. The viewer should feel that moment — an evening on the roads, a fleet of small craft at anchor, an army living in hut towns on the heights — not read it as dots on a chart.

The device is "the chart comes alive". The camera dives into the engraved chart and the chart turns into a painting; then the camera rises and the painting turns back into the chart. It mirrors the scene 1 → scene 2 handoff, run the other way. Build it so the device can be reused later for other key moments.

Two stages:
- **Stage A (this session):** a working prototype of the dive, the view and the rise. Composition, light and transition are final-intent; details may be rough. Ends with a deliberate stop for owner review.
- **Stage B (a later session):** full detail, dusk progression, fallbacks, full checks.

Work on branch `s24-boulogne-sea`. Nothing goes to `main` until the owner says so.

## <history>

Verify and record in `history-notes.md`, in a new subsection under scene 2, with sources, confidence and doubts. Where sources disagree, give a range; don't invent precision. Liberties go to `decisions.md`.

- **The camps in 1805.** What the soldiers lived in. The owner understands they were huts (*baraques*) laid out in streets, not tents — confirm or correct. Materials, layout, where the camps stood relative to the harbour and the heights, and what could be seen of them from the roads.
- **The flotilla.** Vessel types (for example prames, chaloupes canonnières, bateaux canonniers, péniches — verify names, rigs, sizes, and colours if known). How they lay in the roads and in the harbour. Sails furled or set at anchor; flags.
- **Shore defences of the roads in 1805.** Forts and batteries, and what they looked like from the sea.
- **The town from the sea in 1805.** The upper town and its ramparts, landmarks that stood then, and landmarks that did not (anything demolished before 1805 or built after).
- **Napoleon's own hut above the harbour.** Where it stood and whether it would be visible from the roads.
- **The Royal Navy watching the roads.** Whether a British sail on the horizon is justified for an August 1805 evening.
- **Light.** Sunset direction and time at Boulogne in August 1805, so the low sun sits where it really would.

Public-repository rule: paraphrase with links; quote verbatim only short public-domain passages.

## <concept>

The shot, front to back:
- **Water.** A gentle swell, evening light on it, warm glints from the low sun, cool shadows in the troughs.
- **Foreground.** Two or three vessels of the flotilla at anchor, large in frame, gently rocking, each with its own phase and period. Hull, masts, rigging and furled sails readable. These are the hero objects.
- **Middle.** More vessels in lines along the roads, smaller with distance. The shore and its cliffs. Forts and batteries guarding the roads.
- **Heights.** The camps as streets of huts, roofs catching the evening light, kitchen smoke rising and drifting with the wind; at dusk, fires.
- **Back.** The town on its hill, in haze.
- **Sky.** A summer evening.

Light and palette: the sun is low behind the camera, in the west, so the shore and the camps are lit warm and the sea is darker. Keep the painterly language of the approved scene 1 — the same family of techniques and the same restraint — but this is evening, not dawn. Use atmospheric perspective: farther means lighter, cooler and lower in contrast. Warm land against cool sea shadow. If the history research gives a better-founded time of day for August 1805, propose it in the report instead of silently changing it.

Motion: the vessels rock; the swell moves; smoke drifts; fires flicker subtly; haze breathes. During the hold, scroll does two things:
- the camera drifts slowly along the anchored line, so the layers move against each other with parallax — depth, not a still picture;
- time moves from golden evening to dusk: the light cools and dims, fires and lit windows come up in the camps. *(Dusk progression is stage B; stage A needs only the drift.)*

Captions: the existing beat 1 caption and date line stay. Place them so they read over the painting. The chapter marker is unchanged.

Forbidden in this beat, on top of the project-wide list:
- tents, unless the research proves otherwise;
- CSS filters and blurs; bloom, lens flares, stock "god rays";
- photo textures; flat infographic-style vector shapes; clip-art; particle confetti;
- camera shake;
- anything that looks cheaper than scene 1.

## <beats>

Beat 1 gets longer. A rough guide; the final lengths are yours to propose:
1. **Dive, about one screen of scroll.** From the current Boulogne chart view the camera descends toward the roads. The chart dissolves into the painting with the coastline matched, so it reads as one continuous move.
2. **Hold, two to three screens.** The view from the sea, with the parallax drift (and, in stage B, the move to dusk).
3. **Rise, about one screen.** The painting dissolves back into the chart, and the scene continues exactly as now.

Every other beat of scene 2 must look exactly as it does now. After remapping scroll progress, compare them frame for frame against the current build.

## <technology>

- The view is painted 2D layers, like scene 1: CSS, SVG, canvas. Not the WebGL chart at sea level — the chart's relief is far too coarse for that.
- While the painting fully covers the screen, the chart doesn't render. Resuming it on the rise must not cause a hitch: keep it warm.
- Vessels are data-driven, like `ShipOfTheLine` and `smallcraft.ts`. Add specs for the flotilla types.
- One animation clock: `gsap.ticker` drives everything. Animate through transform and opacity of wrappers; heavy graphics stay static inside; canvas loops for swell, haze and smoke as in scene 1.
- No new packages unless clearly justified. If one is added, check its version with `npm view` and record why in `decisions.md`.
- The view's assets load lazily, with no external requests. Phones load nothing.

## <performance>

- 60 fps on the owner's laptop through the dive, the hold and the rise. Extend the existing scene 2 frame-budget tests to the new range and keep within the current budget.
- No long tasks during scroll. Nothing heavy is created at the moment the dive starts: prepare it beforehand.
- Record budgets and measurements in `decisions.md`.
- Before every measurement, confirm the served build with `scripts/dev/served.mjs`.

## <fallbacks_and_accessibility>

- Reduced motion and no WebGL: a static frame of the view at the hold. Stage B adds it to the stills.
- Phones: nothing loads, as now.
- Captions over the painting: contrast at least 4.5:1, measured with `contrast.mjs`.

## <integration>

- Lives inside scene 2 (`src/scenes/02-road/`), driven by the scene director. Reuse what you can from `scenes/handoff.ts` and the scene 1 layers.
- Scene 1 regression must pass. The chart lab must be unchanged. Other scene 2 beats must be identical after the remap.
- Never run `npm run screenshots`: it overwrites the approved scene 1 frames.

## <stage_a>

1. Commit this brief as the first commit on `s24-boulogne-sea`. Set the status to "Stage A — in progress".
2. Start a history subagent right away. It saves findings to the repository as it goes.
3. Build the prototype: the dive, the transition, the hold with the parallax drift, the rise. Composition, light and transition are final-intent. Details may be rough: one or two near vessels with rocking, the shore, rough hut streets, the town, smoke from one kitchen.
4. Checks on a production build at laptop size: frame budget on the dive, the hold and the rise; scene 1 regression; other scene 2 beats frame for frame against the current build.
5. Screenshots of the dive, the hold and the rise in `docs/screenshots/scene-02/boulogne-sea/`.
6. Set the status to "Stage A — complete, awaiting owner review", update `progress.md`, commit, report, stop.

Done when: the dive reads as one continuous move; the view looks like a painting at the level of scene 1, not a placeholder; the frame budget holds; the regressions pass; the screenshots are in place; the history findings are saved.

## <stage_b>

Do not start until the owner approves stage A.
- All flotilla vessels in the roads, at a scale convention recorded in `decisions.md`.
- Hut streets, the town, forts and batteries as the history findings say; the British sail if justified and agreed.
- Dusk progression during the hold: light, fires, lit windows.
- Static frame for reduced motion and no WebGL; stills.
- Full checks: frame budget, contrast on four sizes, scene 1 regression, other beats frame for frame, `npm run check`.
- History subsection finished. Merge to `main` only when the owner says so.

## <process>

- Commit after every step; keep `progress.md` current.
- Subagents wherever they improve the result; each saves its findings to the repository as it goes.
- Save your context: read big files, logs and screenshots through subagents and scripts. If you near auto-compaction, update `progress.md` and commit first.
- Decisions and liberties go to `decisions.md`.

## <boundaries>

- Don't touch the deferred branches.
- Don't change approved scene 1 or any other beat of scene 2.
- No push, no deploy, no paid services, no external runtime requests, no copied protected content.

## <how_your_turns_end>

Work autonomously through the current stage. Don't stop to ask about things this brief already decides: make reasonable calls, record them in `decisions.md`, and continue. End your turn only when the stage's done criteria are met and proven, when the owner sends a stop, or when a blocker genuinely needs the owner. The owner wants stops at the end of stage A and at the end of stage B.

The report: in Russian, plain short sentences, no tables (the owner listens by text-to-speech). It covers: what was done; what was proven and how; what was not; the last commit; the status line; exact commands to view the branch (switch, build, preview, URL, switch back to `main`); at most three questions.
