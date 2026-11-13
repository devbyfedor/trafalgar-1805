# Scene 2, beat 1: "Boulogne from the sea" — sub-brief

File: `docs/scene-02-boulogne-brief.md`. Prepared on 13 November 2026 from the owner's decision as art director.

This brief covers one change inside scene 2: the Boulogne close view in beat 1. `scene-01-brief.md` still holds for everything this brief doesn't touch, and `scene-02-brief.md` holds for the rest of scene 2. Where either disagrees with this brief about beat 1, this brief wins.

## Status

Keep this section current. Change only the status line and append to the log. Never rewrite past log entries.

Status: **Stage A — in progress**

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
