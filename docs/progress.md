# Progress

Live checklist. A later session picks up from here. The briefs are `docs/scene-01-brief.md` and `docs/scene-02-brief.md`; decisions and deviations are in `docs/decisions.md`.

## Session 11 (5 November 2026): the owner's review, then Stage B to its end

**The owner's answers to session 10's questions:** the last frame looks west into the sunrise (as built); beat 1 keeps "invasion craft"; Nelson's track runs on through Ushant and Spithead and is completed with his September passage from Portsmouth back to Cádiz.

**The owner's review of the site** (his screenshots were said to be in `docs/owner-feedback/`, which is not in the repository; worked from his written notes): ships sink into the sea when the camera pulls back and looks at a slant (in squadrons only mastheads show); glyphs jerk, flicker or jump in size between near and far; the ships should be sharper and finer, as scene 1's up close and a clean silhouette far off; the chart should grow sharper and richer close up, like an engraved pilot chart (a thinner coast, sharper relief, period detail such as soundings), with nothing soapy or pixelated and detail coming in smoothly, inside the frame budget.

**His order for the session:** (1) the full check passing again; (2) the ships (sinking, smoothness, sharpness), then the chart close up; (3) the history check, and the "Scene 2" section into `history-notes.md`; (4) the four agent branches reviewed and merged one by one, the build and tests passing after each; (5) the rest of Stage B (the names of 1805, the signal relay, new tests, the stills, staged loading, screenshots at four sizes, frame time); then a report in Russian and a stop.

- **Step 1, done:** scene 1's tests rewritten for scene 2 (the pin holds through the handoff and releases under scene 2; perf scrolls into scene 2; reduced motion stacks scene 2's stills); `networkidle` replaced by a helper that ignores worker scripts (troika's text worker, loaded from a `blob:` URL, never reports finished, so that state never came once the chart loaded on the home page); `wheelBy` scrolls exact distances (down in 90 px steps and up in 120 px steps it had come back 30 px short); scene 2 draws off screen only while its scrub settles and shows its readouts only while near; `npm run stills` renders provisional stills (to be re-rendered at the end). Verified on its own build: `laptop`, `desktop-1080`, `phone`, `perf` (no long task while scrolling; 50–190 ms tasks at load from the chart's setup, for step 5), `regression`; `chart` and `chart-gpu` passed earlier in the session on the same chart code.
- **Where it stopped (session 11, about 21:12): the laptop lost power.** No stop, nothing saved. Step 1 was committed; step 2 (the ships) was in the working tree, uncommitted, and session 11 was sorting its first sweep of the glyphs; the workflow `scene2-history-finish` and a dev server were running.

## Session 12 (5 November 2026, about 22:00 to 23:30): recovery after the power loss, then session 11's order

**Recovery, verified:**
- Git: no lock files; no merge, rebase or cherry-pick in progress; `git fsck` clean. The four agent worktrees are clean, each with its one WIP commit of session 10.
- The uncommitted work was whole. Session 11 had stashed step 2 at 21:03 (`step2b`, now the dangling commit `4af657f`) to commit step 1 alone, and restored it at 21:09:52; the working tree matched that stash byte for byte, and `Scene02Road.tsx` matched session 11's scratch copy. No file was cut off (no NUL bytes, each ends in a newline). Kept whole, and committed as work in progress in the recovery commit.
- Dependencies: `node_modules` matches the lock file (installed 25 October; no install ran at the crash), so nothing was reinstalled. `.next/dev`, Turbopack's dev cache, was being written at the crash and was deleted; the build's cache was untouched.
- Lint (two dev scripts reformatted, three unused variables taken out of `glyph-sweep.mjs`), typecheck, the lettering check and `next build` pass.
- The history workflow's finished outputs moved from session 11's scratchpad into `docs/research/scene-02/`: `a-v-merged-lead.md` (the ruling on `v-merged-lead.md`: 9 issues hold, 6 hold in part), `h6-september.md` and `nelson-september.json` (Nelson's passage from Portsmouth to the fleet off Cádiz, 14–28 September 1805; unchecked). Lost: the check of that passage and the Stage B names research, both running and neither had written a file (their transcripts: `C:\Users\User\.claude\projects\d--dev-trafalgar-1805\3386dedb-84d9-453c-a2c2-40d1fd02aab2\subagents\workflows\wf_a3bbc971-449\`). Not started: the editor, the re-check, the fixes. The script with every prompt: `C:\Users\User\.claude\projects\d--dev-trafalgar-1805\3386dedb-84d9-453c-a2c2-40d1fd02aab2\workflows\scripts\scene2-history-finish-wf_a3bbc971-449.js`.
- The owner's screenshots: no `owner-feedback` folder exists on this machine (searched D:\ and the home folder by name). Worked from his written notes.

**Step 2, the ships (points 1 to 3): done in session 12.** What changed and why is in `decisions.md`, "Scene 2, Stage B: the owner's review of the ships (sessions 11 and 12)". In short: the water writes the sea's depth on the coastal patches (inland patches drawn first without it); squadrons are tidy blocks of staggered rows, every hull showing; headings and squadron rooms are read ahead and eased over the scroll; the anchorage blend no longer breaks between legs; the combined fleet weighs on the 20th as the sources say (before, a dozen ships "weighed" on 28 September); the fleets' tracks of 19–21 October keep their order drawn closer, so no ship crosses the land; glyphs larger far off; a ship at anchor no wider than her berth. Verified: the sweep at every 0.0005 of p flags nothing (it flagged 286); no ship under way within 1.5 km of the coast; screenshots of the chase, Finisterre, the anchorage and the last frame looked at. Not done: the frame time (an A/B put the sea's depth at a quarter to a third of the terrain's GPU time, measured on battery with other work running: re-measure on mains with the machine quiet, at step 5's measurement; a fallback that costs nothing is to lower the coastal land a cell more, so no triangle with water is lifted); the anchorage still a forest of masts from 16 km (the beat 4 camera comes down nearer with the relay).

**Step 2 as session 11 left it** (for the record):
- Done in code:
  - sinking: the terrain writes the sea's own depth wherever it draws water (`GLSL_SEA_DEPTH`); the mesh reads the coast four times finer than its own level before land rises (`GLSL_SURFACE`, shared by the terrain, the lettering's drape and the ink ribbons); a squadron's ships each stand on the sea under their own foot on screen (`glyphFoot`);
  - smoothness: a ship weighing crossfades between her two glyphs over three story hours, with her wake and her room following; a squadron waits in the roads on its own route; ships joining, leaving or changing type fade over a fixed stretch of scroll; the mirror crossfades where the glyph is narrowest; a formation closes up end-on; the atlas's two nearest drawn levels blend by size on screen;
  - sharpness: the atlas draws every type at eight heights, 12 to 136 px, each drawn for its size from scene 1's geometry (spars, sail gaps, rigging where it resolves, scene 1's cloth shading, bands and port lids at the larger sizes), one atlas shared by the fleets and the squadrons;
  - tools: `glyphs/probe.ts` runs the glyph shader's own GLSL and reads every glyph's foot, height and opacity back; `window.__road.sample(p)`; `scripts/dev/glyph-sweep.mjs` flags any change much larger than its neighbours'.
- Looked at by session 11 in dev at p = 0.085, 0.3, 0.41, 0.54, 0.745 and 1: the ships read as ships at squadron size; the Cádiz close-up still shows a polygonal coast and blobby shading (point 4).
- **Not done:** sorting the sweep's flags (session 11's sweep of 2,001 steps flagged clusters in the chase and Finisterre beats, p ≈ 0.29–0.59, and among the dawn fleets, p ≈ 0.75–0.83; some are steep but smooth fades, some may be real); the GPU cost of the sea-depth write (unmeasured); the atlas's size figures in `decisions.md` (written before measuring); screenshots near and far and at a slant, in the places the owner describes; the chart close up (point 4).

**Where it stopped (session 12, 5 November 2026, about 23:30).** The owner stopped the session deliberately, just after step 2 (the ships) was committed (`4edd800`) and two background workflows had been launched. Everything is committed and the working tree is clean. Nothing is left running: both workflows were stopped and the dev server killed; no node or browser process of the project remains. The four agent worktrees are exactly as session 10 left them (each its one WIP commit on `dba5a5a`, clean, no rebase begun).
- **Done in session 12:** the recovery (`b3e4acd`); the owner's points 1 to 3, the ships (`4edd800`, above and in `decisions.md`); the check of Nelson's September passage (`research/scene-02/v-h6-september.md`, the leg corrected in `nelson-september.json`) and the research of the Stage B names (`h5-names.md`, unchecked), moved in at the stop; three development scripts kept (`scripts/dev/glyph-inspect.mjs`: a glyph's probe values and the parts of her height over a range of p; `glyph-ashore.mjs`: ships under way near the coast; `ab-seadepth.mjs`: the sea-depth write on and off in one page of the lab).
- **Half-done:**
  - The history section: the names check and the editor were stopped. The editor's unfinished copy and notes are in `research/scene-02/session-12-edit/` (not checked; redo the edit from the inputs rather than trust it). Not started: the re-check, the fixes, the names part.
  - The owner's point 4, the chart close up: looked at and planned (below), no code yet.
  - The branch workflow `scene2-branches-prepare` was stopped before any agent changed anything. Its script, with every prompt (rebase onto main, finish the layer to the design plan, lab demo and screenshots, then an independent review and fixes; nothing merged into main), is `C:\Users\User\.claude\projects\d--dev-trafalgar-1805\3f01e52b-44e9-4a6e-a65b-e439e223362e\workflows\scripts\scene2-branches-prepare-wf_fd874391-929.js`; the history workflow's is `...\scene2-history-finish-2-wf_65723570-f2c.js` in the same folder.
- **Not verified in session 12:** `next build` and every Playwright project after `b3e4acd` (lint and typecheck pass on every commit); scene 1's regression check after the ship work (scene 1's code is untouched); the frame time (below).
- **What the close-up looks like now** (shots at p = 0.735, 16 km over Cádiz bay, and the last frame): the coast, the waterlines and the isobaths run in steps: the field is read bilinearly, so its lines kink at every texel's edge (15″, about 0.46 km on the Cádiz tile, 30–40 px from 16 km up; the overview's 3′ texels make the coast polygonal at continental scale too). The coastline is a heavy line, the lowland soft blobs (slopes interpolated bilinearly), the bay's shape Natural Earth's coarse polygon, and the anchorage a forest of masts.

**Next steps, in order** (the owner's order of session 11):
1. **The chart close up (point 4).** In the terrain's fragment shader (`terrain/shaders.ts`): (a) read the field through a cubic B-spline (four bilinear taps per layer, Sigg and Hadwiger's method; `textureSize` for the layer's size) wherever a texel spans more than about a pixel, for the field and the smoothed field alike (they are the same once magnified): the coast, the waterlines, the isobaths and the contours become curves, the shading continuous; (b) the coastline thinner and crisper close up (its width falling with km per pixel); (c) sharper relief close up: shading from the smooth field with more contrast, a finer contour interval low down (`contourIntervalAt`); (d) soundings: a build-time list for the detail tiles only (the views that come close are Cádiz, the Gulf and Boulogne): points by Poisson disc in ranks from 8 km to 0.5 km apart, finer ranks only near the coast, each with ETOPO's depth in fathoms (halves in shoal water), a few hundred kB; drawn by an instanced layer of SDF digits (Baskervville italic, the waters' face) lying flat on the sea at a constant size on screen, each rank fading in by the octave as the waterlines' sets do, giving way to the waterlining band and fading with the haze; (e) the camera's closest view of the harbour (beat 4, `camera.ts`, p = 0.735) comes down to about 5 km over the anchorage, so its ships stand apart. ETOPO 2022's 15″ is the finest relief and Natural Earth 10 m the finest coast the licences allow: record that in `decisions.md`. Then screenshots near and far, looked at, and the frame time.
2. **The frame time.** On mains power, with nothing else running: `scripts/dev/ab-seadepth.mjs` (the sea's depth on and off) and `scripts/dev/bench.mjs` on the production preview. Session 12's A/B, on battery with other work running, put the depth write at a quarter to a third of the lab's GPU time even with the inland patches drawn first without it. If the worst point leaves too little headroom, the fallback costs nothing: lower the coastal land a cell and a half more, so no triangle that holds water is lifted at all, and drop the write.
3. **The history section.** Re-run the names check on `h5-names.md`, the editor (from `history-scene-02-merged.md`, the four ruling files, the owner's six decisions in that workflow's prompt and `v-h6-september.md`), the re-check, the fixes and the names part; then merge into `history-notes.md` as session 9's steps say. Add to "Assumptions and licences" what the scene now does: the fleets' order drawn closer on 19–21 October (`spread` in `movements.ts`) and the weighing times of the 20th. Draw Nelson's September leg (`nelson-september.json` into `routes.ts` with `scripts/dev/gen-routes.mjs`, and into the director's legs).
4. **The four branches:** re-run the branch workflow's stages (or do them by hand), then merge one by one into main, the build and tests passing after each.
5. **The rest of Stage B:** the names of 1805 into `gazetteer.ts`; the signal relay (beat 4: `Hoists.ts`, the gun puffs, the timing, the camera along the chain); scene 2's tests; the stills re-rendered; staged loading; screenshots at the four sizes; the frame time of the whole scene; the docs; the full `npm run check`; then the report and a stop.

**Questions for the owner** (in the report): whether a squadron's block may overlap small islands at ocean scale (a printed fleet symbol, kept legible; shrinking it does not keep it off the islands); where his screenshots of the problems are, if he wants those exact views checked (`docs/owner-feedback/` is not on this machine).

**Session 12's earlier plan** (superseded by the steps above):
1. Finish step 2: sort the sweep's flags and fix what is real; measure the sea-depth write on the GPU (`scripts/dev/bench.mjs`) and the atlas; screenshots near, far and at a slant (squadrons as the camera pulls back, the anchorage off Cádiz, the dawn fleets), each looked at and fixed; commit.
2. The chart close up (point 4): a finer coast, sharper relief, period detail such as soundings near the coasts, coming in smoothly, inside the frame budget; more data only with a reason in `decisions.md`.
3. The history section: re-run the September check and the names research (salvaging what the lost agents found), then the editor, the re-check and the fixes; merge it into `history-notes.md`.
4. The four agent branches, reviewed and merged one by one, the build and tests passing after each.
5. The rest of Stage B: the names of 1805, the signal relay, scene 2's tests, the stills, staged loading, screenshots at four sizes, frame time; then the report in Russian and a stop.

## Scene 2, Stage B: the full scene (from session 10, 1 November 2026)

**Stage A is approved.** The owner checked `/lab/chart?debug` on the production preview on his laptop: a steady 60 fps. Owner-verified, 1 November 2026.

**The owner's answers before session 10** (to session 9's questions):
1. The dawn fleets go at their true spacing, about five miles. If the Gulf view shows only each fleet's flagship, that is intended; the scene's last frame must come close enough for the formation to read. The spread-out layout of the lab is no longer a licence.
2. The British keep heading 047° at dawn, as in scene 1: a deliberate licence (the log has N by E, about 350° true, at sunrise).
3. Beat 4's caption says "a chain of frigates and ships of the line".

**Where it stopped (session 10, 1 November 2026, about 18:00).** The owner stopped the session deliberately in the middle of Stage B. Everything is committed and the working tree is clean. Nothing is left running: the three workflows (`scene2-history-check`, `scene2-layers`, `scene2-names-stage-b`) were stopped, and every dev server (the main one and the four agents' on ports 3101–3104) was killed. Session 10 started from a clean tree at `6845eba`; lint and typecheck passed before any change and pass now. The owner's order for the session: check the merged "Scene 2" history section and move it into `history-notes.md`, then Stage B to its definition of done, then a report and a stop.

**Warning: `npm run check` fails now.** Three of scene 1's tests still expect the "Chapter II follows" placeholder that scene 2 replaced: `scene.spec.ts` ("pins for the scene and releases into the scene 2 placeholder"), `perf.spec.ts` (its scroll ends on that text) and `reduced-motion.spec.ts` (`#chapter-2`). They must be rewritten for scene 2 (next steps, 5). No `next build` and no Playwright run happened in session 10.

- **Done in session 10, committed on main:**
  - the Stage B design plan in `decisions.md`, "Scene 2, Stage B: design plan" (`a8fd6ac`): beats and scroll lengths, the handoff from scene 1, the camera, the look of each beat, the fallbacks, the budgets, the parallel build;
  - the glyphs' size on screen shared in `glyphs/height.ts`, so lights, smoke and flags can stand at a ship (the Gulf frame unchanged, mean difference 0.08 of a level against `laptop-p024.png`); `?demo=<name>` in the lab loads one layer's demo (`dba5a5a`);
  - **scene 2's skeleton, working end to end in dev** (`8f6177c`): `src/scenes/02-road/` (`Scene02Road.tsx`, `beats.ts`, `camera.ts`, `director.ts`, `stage.ts`, `choreography.ts`, `movements.ts`, `squadrons.ts`, `dates.ts`, `content.ts`, `layers/RoadText.tsx`, `layers/RoadStills.tsx`), `src/scenes/handoff.ts`, the registry (scene 2, then "Chapter III follows", then the credits). What it does:
    - the handoff: scene 1's pin runs on 2.5 viewport heights (`HANDOFF_LENGTH`) after its p = 1 with an empty timeline tail, so its p maps to the same scroll as before; scene 2's wrapper is pulled up by a negative margin (set from JS in the motion branch) so both pins overlap, scene 1 above (z-index 2 over 1); scene 2's timeline fades scene 1's painted layers and text over the chart's matching dawn key while the camera holds, then the director moves and scales scene 1's own Victory box (`[data-el=hull-box]`, clipped at her waterline) onto her glyph as the camera rises and turns, and crossfades her into it (`director.ts`, `applyPainted`);
    - the camera through every beat (keys in `camera.ts`, first pass), the light (dawn, campaign, the morning of 19 October in the dawn state, night, dawn), the date line running day by day (`beats.ts`, `dayAt`, `dateLineAt`), the five captions (beat 1's says "invasion craft", not "barges": the flotilla was rigged gun craft; beat 4's has the owner's wording);
    - all eleven legs from `routes-draft.json` with ruling 1 of `a-v-draft-h1.md` (the Vigo legs), dated by day (`routes.ts`, generated by `scripts/dev/gen-routes.mjs`), drawn by date with Stage A's route style for now;
    - the squadrons at the drawing heads as blocks of glyphs whose count is the fleet's size at each stage (`squadrons.ts`; `Glyphs.setFormation`, offsets in glyph heights on screen), standing in the roads off a port while they lie there, with a floor of room near coasts (`Room` `{ coast: km }`);
    - both fleets ship by ship (`fleets.ts`: 27 + 4 frigates British, 33 + 5 frigates combined, by name and type) from the anchorage off Cádiz (28 September) through the sortie of 19–20 October, the station, the chain and the frigates, the night to the dawn positions at the sources' spacing (`movements.ts`; `DAWN` laid out in `fleets.ts`); glyphs change type when they weigh (`Glyphs.setType`);
    - the chart loads as its own chunk in idle time while scene 1 plays (`stage.ts`, dynamic import) and draws only from just before scene 2's pin until its wrapper leaves, while the scrub settles back;
    - `?debug` shows a "road p" line once scene 2 reports; scene 2's text starts transparent in motion mode (`globals.css`).
  - the last frame (`aab7ce2`): looking east-north-east (77.5°) from west of the British, 6.5 km up, the sun rising on the right as scene 1 began: the British in their two bodies in the foreground, the combined fleet's line strung across the water under the coast, the frigates between; Boulogne seen up the Strait from the south-west with England across the water.
  - `biome.json` and `.gitignore` ignore `.claude/` (the agents' worktrees live there); `scripts/dev/road.mjs` takes screenshots of scene 2 on the home page by its p (`node scripts/dev/road.mjs <dir> 0 0.05 0.2 …`, a negative value is scene 1's p minus 1).
  - **Parked, not wired:** `src/components/chart/glyphs/Hoists.ts`, flag signals at glyph mastheads for the day relay (hand-tinted flags, Popham's telegraph flag, the distant signal's dark shapes); it typechecks; never drawn or seen.
- **Half-done:**
  - **The history section's check** (the owner's first task): the four checks and the rulings on three of them are in `docs/research/scene-02/` (`v-merged-h1.md` … `v-merged-lead.md`, `a-v-merged-h1.md`, `a-v-merged-h2.md`, `a-v-merged-h3.md`; README there). Not run: the ruling on `v-merged-lead.md`, the editor who applies every ruling that holds and the owner's three answers to a copy of `history-scene-02-merged.md`, the final re-check. The section is not yet in `history-notes.md`. The workflow's script (prompts for every stage) is `C:\Users\User\.claude\projects\d--dev-trafalgar-1805\e9a0e7b8-e3f9-4707-b98f-23473d29859b\workflows\scripts\scene2-history-check-wf_42fe8d29-641.js` (local); resuming it with run id `wf_42fe8d29-641` would reuse the finished agents only in this same session, so a new session re-runs the last three stages from the files.
  - **The four layer branches** (workflow `scene2-layers`, stopped before any agent reported or was reviewed). Each agent's work is committed as one WIP commit on its own branch; the worktrees are in `.claude/worktrees/wf_016f0c7a-068-N` (with their own `node_modules`; `git worktree remove --force` when done):
    - `worktree-wf_016f0c7a-068-1` (`ec9acc1`), detail: the Channel tile (`scripts/data/config.ts`, a generated `public/chart/channel.webp` and manifest) and detail tiles sharing one slot (`terrain/field.ts`, `engine/Chart.ts`);
    - `worktree-wf_016f0c7a-068-2` (`89f2dd5`), signals: `src/components/chart/fx/` (smoke puffs, night lights) and the `signals` demo;
    - `worktree-wf_016f0c7a-068-3` (`d004c9c`), boulogne: small-craft glyph types (`glyphs/atlas.ts`, `ship/geometry/smallcraft.ts`), `marks/` (the camps), `scenes/02-road/boulogne.ts`, the `boulogne` demo;
    - `worktree-wf_016f0c7a-068-4` (`368e8a4`), tracks: `lines/Track.ts`, `lines/dates.ts`, dash patterns in `ribbon.ts`, `lettering/TrackLabels.ts` and changes to `Lettering.ts`, the `tracks` demo.
    None is reviewed or proven; how far each got is unknown (read its diff: `git diff main...<branch>`).
  - **Beat 4** (Cádiz, the chain, the relay): camera keys are a first pass; the relay (flags and gun puffs pulsing west from the Sirius to the Victory, 7 a.m. to 9.30) is not built; the fleet movements exist.
- **Not started:** the names Stage B adds (Ulm, Dover, Calais, A Coruña, Vigo, Antigua, Trinidad and others: the research workflow wrote nothing); the stills (the modes are wired in `RoadStills.tsx`, the images in `public/stills/scene-02/` do not exist, so reduced motion and a WebGL failure show captions without images); staging the chart's setup so no task exceeds 50 ms while scene 1 scrolls; scene 2's tests; the contrast measurement; screenshots at the four resolutions; the frame-time measurement of the whole scene; the docs for Stage B (decisions, history notes, README).
- **Verified in session 10:** lint and typecheck on every commit; screenshots in dev of the handoff (scene 2 p = 0 to 0.085) and of every beat at 1280×720 (each looked at; they were in the session's temporary scratchpad and are not kept: re-take them with `scripts/dev/road.mjs`). **Not verified:** `next build`, any Playwright project, scene 1's regression check after the pin extension (its p maps to the same scroll by construction, so its frames should match), the chart chunk's size, frame time, long tasks.
- **Next steps, in order:**
  1. Finish the history section: rule on `v-merged-lead.md`; apply every ruling that holds or partly holds and the owner's three answers (decisions.md, "Scene 2, Stage B") to a copy of `history-scene-02-merged.md`; check the edit; merge it into `docs/history-notes.md` as session 9's next steps said (after scene 1's sections, as "## Scene 2: the road to Trafalgar"; drop the first-line comment; note at the top that scene 2's facts follow; list `research/scene-02/`; README's line on `history-notes.md`). Later, update its "What the chart draws" bullet to match the code.
  2. Review each layer branch (its diff, lint, typecheck, its lab demo and screenshots), finish what is missing, merge into main one by one; then use them in the scene: the Channel tile and the camps and flotilla at Boulogne; `Track` for the routes (pale ink and carmine wash, day circles and numerals) and the army's dashed line to Ulm; the smoke at Finisterre and the gun puffs of the relay; the night lights.
  3. Re-run the names research (the workflow's prompts are in `scene2-names-stage-b-wf_67a573d7-2f2.js` in the same scripts folder) and add the names to `gazetteer.ts`.
  4. Beat 4: wire `Hoists.ts` and the relay timing from the history notes ("The signal chain, 19 to 21 October"); tune the camera along the chain.
  5. Tests: rewrite the three placeholder assertions for scene 2; add scene 2's spec (no console errors over a full scroll and back, same-origin requests, the canvas renders, the pin releases into "Chapter III follows", the reduced-motion stills, the phone loading nothing from scene 2); keep scene 1's regression check green.
  6. The stills: a script (`npm run stills`) renders one still per beat from the scene at 1920×1080 or larger into `public/stills/scene-02/` as WebP (about 1.5 MB in all).
  7. Loading: stage `Chart.create` and the layers' setup across frames or idle callbacks; measure long tasks while scrolling scene 1 (`perf`).
  8. Caption contrast over the chart at every 0.01 of p; screenshots of every beat at 1280×720 (scale 1.5), 1920×1080, 2560×1440 and 3440×1440; look and fix.
  9. Frame time over the whole scene on this laptop (the bench method of Stage A, extended to scene 2); the chunk's size, the assets, the draw calls.
  10. Docs (decisions: tuned lengths, the handoff, the licences; history notes; README; backlog), the full `npm run check`, the report.
- **Questions for the owner** (in the report): the last frame from the west into the sunrise, where the British (heading 047°) show their bows to the left as they sail away toward the enemy, or a view from the south where they face right as in scene 1 but the enemy's line is seen end-on (recommended: from the west); "invasion craft" for "invasion barges" in beat 1's caption (recommended: craft); whether Nelson's track runs on from Gibraltar to Ushant and Spithead in beat 3 (it does now; recommended: keep it, it explains why he was away until late September).

## Scene 2, Stage A: engine, data and look (sessions 4 to 9, 25 October – 1 November 2026)

Stage A builds the chart engine, its data and its look, proven by one camera flight on `/lab/chart`, then stops for the owner's performance check on his GPU. Stage B (the full scene) waits for his approval.

**The owner's verdict before session 6.** He looked at `/lab/chart` in dev mode and loves it: the look, and the flight from Cádiz onward. Keep this direction; the fixes refine it, they don't change it.

**The owner's answers before session 8** (on session 7's look work): keep the new wide, softly fading waterline band, as on the engravings; keep the small soft halo round lone islands; the ships at anchor off Cádiz stand on the shore, fix that first; settle the contested 1805 names from the sources and record the doubts in `history-notes.md`; measure the frame load before closing the stage and leave headroom, since 60 fps on his laptop stays a hard requirement; close Stage A fully (names, the "Scene 2" history section, the credits line, README, `next build` and every browser test, screenshots looked at and fixed).

**Where it stopped (session 9, 1 November 2026, about 15:00).** The owner stopped the session deliberately just after the merged "Scene 2" history section was written and before it was checked. Everything is committed and the working tree is clean. Nothing is left running: the research workflow `scene2-history-close` was stopped (its last two stages, the check of the merged section and the fixes, never ran), and the dev and preview servers and every project process were stopped. Session 9 started from a clean tree at `6bd91b9` (the owner's `CLAUDE.md`); the owner's message repeated his answers before session 8 (recorded above).
- **Stage A's state.** Every item of the brief's Stage A holds except one: the "Scene 2" section of `docs/history-notes.md` is merged as a draft but not checked, so it is not in `history-notes.md` yet (below). The owner's GPU check is the stop the brief asks for; the report in Russian went to him with this stop.
- **Half-done:** the "Scene 2" history section. `docs/research/scene-02/history-scene-02-merged.md` (431 lines, its first line an HTML comment saying it is unchecked) is the whole section, merged by a workflow agent from the four drafts, the open points of `v-draft-h3.md` and session 9's rulings, in the order session 8 gave, with an "Assumptions and licences" part added. The agent never reported which fixes it applied and which it left out. Its script, with the prompts of the merge, the check and the fixes: `C:\Users\User\.claude\projects\d--dev-trafalgar-1805\07e3993c-6725-40d8-bd11-d2da8ae0c0fc\workflows\scripts\scene2-history-close-wf_ffe476d8-5f0.js` (local to this machine; the prompts can be rewritten from this description).
- **Not verified in session 9:** the merged section; the owner's own look at `?debug` in a real browser (only he can confirm 60 fps). Since the full check passed on `97e41aa`, only documents and three development scripts in `scripts/dev/` (linted) have changed.
- **Next steps, in order:**
  1. Check the merged section independently (completeness against each draft and each ruling that holds; no contradiction with the adjudications, with scene 1's sections or with what `src/scenes/02-road/` draws; our own words, short period quotations only), apply what holds, and read it through once against the code: the names (`gazetteer.ts`), the route (`routes.ts`), the glyphs and the licences (`fleets.ts`, `decisions.md`, "The dawn fleets are spread out").
  2. Merge it into `docs/history-notes.md` after the scene 1 sections, as `## Scene 2: the road to Trafalgar` (drop the file's first-line comment); note at the top of the file that scene 2's facts follow scene 1's; add `research/scene-02/` to its list of research files; set the research README's status line to merged; adjust README's line on `history-notes.md`.
  3. The owner's GPU check of `/lab/chart?debug` on the production preview; then Stage B after his approval, starting from his answers to the questions below.
- **Questions for the owner** (in the report): whether to keep the dawn fleets spread out for legibility (a recorded licence) or draw them at the true spacing, about five miles, which shows one ship per fleet at the Gulf key; whether the British keep heading 047° at the dawn handoff (after bearing up, as scene 1's Victory sails east) or show the N by E (about 350° true) they steered at sunrise; whether beat 4's caption becomes "a chain of frigates and ships of the line" (the outer links were ships of the line).
- **Done in session 9, committed:**
  - the first screenshots of the flight (`npm run screenshots:chart`) showed the anchored fleet still on the shore at the Gulf key, from the rising shot and in the dawn close-up, the dawn fleets piled over the coast at p = 0.3–0.45, and Villeneuve's squadron on the Spanish shore at Cape de Gata and in the Strait. Every glyph now fits the open water beyond it as the camera sees it, foreshortened; rooms are measured; the squadron reads its own from the chart; a far-off group gives way to its lead (`238788e`; `decisions.md`, "No glyph stands on the shore"). The dawn frame is unchanged pixel for pixel;
  - Cape Trafalgar's name runs from the cape along the coast to the south-east: below it, its first letters lay on the combined fleet's masts at the Gulf key (`a4b1e88`).
  - the checks of `draft-h1.md`, `draft-h2.md` and `a-h4.md` and the rulings on them, moved into `docs/research/scene-02/` (`cf5c2e9`). The names hold, all 34 (`a-v-a-h4.md`); the narrows ship moved between the Puntal and Matagorda forts, off today's Matagorda shore (`a223f02`); Villeneuve's track is drawn from the ruled table, which keeps 2.2 nm off every coast but Toulon road (`89deada`); the dawn fleets' spread and the British heading of 047° are recorded as licences (`decisions.md`);
  - the Playwright projects match their specs by whole file name: `chart` and `chart-gpu` had also run the docs screenshots, which failed in software WebGL and quietly rewrote `docs/screenshots/scene-02` on the GPU (`bde84f9`);
  - the screenshots for the owner, `docs/screenshots/scene-02/` (20 frames, each looked at; `fa8b32a`), and the frame time at the close of the stage (`ca58271`).
- **Verified in session 9:** the full `npm run check` passes on `97e41aa`: lint, typecheck, the lettering check, `next build` and all 27 Playwright tests in every project (`laptop`, `desktop-1080` with the credits line, `phone`, `perf`, `chart`, `chart-gpu`, `regression`, `chart-frames`). The chart chunk is 192 KB gzipped, not loaded by the home page. Frame time on this laptop (the owner's, on mains power), every 0.02 of the flight, best of two sweeps: at most 8.6 ms of GPU at the 95th percentile (rising into the Gulf, p = 0.14–0.18), CPU at most 1.5 ms; `chart-frames` in the full run: 8.5 ms. In the full run `perf` shares the machine with the software chart tests and records long tasks of up to 2.4 s in scene 1's scroll; run alone it records none (it records them, it doesn't judge them).

**Where it stopped (session 8, 31 October 2026, about 23:00).** The owner stopped the session deliberately while the "Scene 2" history section was being assembled. Everything is committed and the working tree is clean. Nothing is left running: the research workflow (its last three checks), the dev server and the preview server were stopped, and no project process remains. Session 8 started from a clean tree at `d736d6c`; lint, typecheck and the lettering check passed before any change, and after every commit.
- **Done in session 8, committed:**
  - the anchored fleet off Cádiz is on the water: a glyph in confined water has a `room` on the chart and shrinks with the bay when seen from farther off; the anchorage follows `a-h2c.md` (`8a58e85`);
  - frame timing on the GPU from the lab (`window.__chart.bench`, `scripts/dev/bench.mjs`; `ef4843c`), measured on the owner's laptop on battery: at most 8.8 ms of GPU a frame at the worst point of the flight (95th percentile), CPU at most 2.5 ms, no long tasks while scrolling; guarded by the `chart-frames` test project, which runs after all the others (`6a03587`; "Budgets" in `decisions.md`);
  - the credits line after the scenes and on the lab, and the README rewritten for scene 2's engine (`4c828d5`; `c285ec9` adds the warning that `npm run screenshots` rewrites scene 1's approved frames);
  - a test that the chart comes back after a lost WebGL context: it does, pixel for pixel, on the GPU and in SwiftShader (`5a35b92`);
  - the lettering's ink follows the ground under each letter, switching at the coast within a pixel (Cádiz's name had stayed pale on its isthmus close up); Gibraltar's name moved onto the open sea east of the Rock (`829d879`);
  - Villeneuve's Toulon–Cádiz track from table A as ruled, checked against the coastline (`fdc304c`);
  - the 1805 names as adjudicated (`a-h4.md`): English Channel, C. St. Vincent, Azores or Western Islands, Martinique; West Indies a regional label that fades out close up (`5f8032f`);
  - the fleets at dawn on 21 October: the British in loose order in two groups strung north and south, on 047° true (the course after bearing up at about 6.45; in a column on that course they stacked into one pile at the Gulf key); the combined fleet standing south at 180–195° (`aa7a358`);
  - `npm run screenshots:chart` and the `docs-chart` project (`c285ec9`), not yet run;
  - the research moved into `docs/research/scene-02/` (this commit): `a-h4.md`, `draft-h1.md`, `draft-h2.md`, the revised `draft-h3.md` with its check `v-draft-h3.md`, the lead's parts `draft-lead.md`, `routes-draft.json` (every route's waypoints, for Stage B) and `drafts-data.json`; its README says what each is.
- **Half-done:**
  - the "Scene 2" section of `history-notes.md`: every part is drafted (above), none is merged. The independent checks of `draft-h1.md`, `draft-h2.md` and `a-h4.md` were stopped before they reported. Of `v-draft-h3.md`'s 28 points, some are applied and the rest are listed in the research README.
  - the Toulon–Cádiz route: `routes.ts` draws table A with the adjudicated 4 p.m. point. `draft-h1.md`'s table refines it (the start in the middle of the Grande Rade, 43°05.5′ N 5°59.4′ E; a point in the offing of Cádiz, 36°25′ N 6°22′ W, keeping the line 3 nm off the shore; three estimated points dropped) and is not applied.
- **Not started:** the screenshots for the owner (`npm run screenshots:chart`, then a look at each and fixes); the full `npm run check`; the report.
- **Verified in session 8:** `next build` passes (last built after `fdc304c`). Playwright on those builds: `chart-gpu`, all 3 tests (the flight, the frames, the context restore); `chart` (SwiftShader), the context test; `chart-frames`, both tests. **Not run:** `laptop`, `desktop-1080` (with the new credits-line check in `scene.spec.ts`), `phone`, `perf`, `regression` (scene 1's code is untouched; the page gained the credits line after the placeholder), the full `chart` project, `docs-chart`, and anything after `fdc304c` (the names and the dawn positions, data only). The chart chunk's size was not measured.
- **Next steps, in order:**
  1. Run the stopped checks of `draft-h1.md`, `draft-h2.md` and `a-h4.md` (session 8's script, with the prompts: `C:\Users\User\.claude\projects\d--dev-trafalgar-1805\3e5770fc-9e19-4fc6-aa58-37980a54d14f\workflows\scripts\scene2-names-and-history-drafts-wf_cb84ee3e-304.js`; reports go to the scratchpad, then into `docs/research/scene-02/`). Apply what holds, to the names too if `a-h4` falls on any.
  2. Merge the section into `docs/history-notes.md`, after the scene 1 sections, as "## Scene 2: the road to Trafalgar", in this order: `draft-lead.md`'s opening and brief table; `draft-h1.md` from "Dates and conventions" to "Ferrol, the turn south and Cádiz"; `draft-h2.md` from "Boulogne" to "Orders, Rosily and the sortie"; the lead's "Fleet sizes at each stage"; the three parts of `draft-h3.md`; `draft-h2.md`'s "Positions on the chart" without its table of 19 October (`draft-h3.md`'s tables replace it); `draft-h1.md`'s "Routes on the chart"; the lead's "The names on the chart", "Open doubts" and "Key sources". Apply the rest of `v-draft-h3.md` and the other checks' fixes; in the brief table's relay row say "with guns", not "counted guns" (counted guns with each hoist are logged only on the 20th). Note at the top of the file that scene 2's facts follow scene 1's.
  3. Apply `draft-h1.md`'s Toulon–Cádiz table to `src/scenes/02-road/routes.ts` if its check holds.
  4. Screenshots: `npm run screenshots:chart`; look at every one (and close crops); fix what is off.
  5. The full `npm run check`, then the report in Russian, and stop for the owner's GPU check.
- **For the report:** the drafters' questions for the owner are in `drafts-data.json` ("ownerQuestions"); the ones worth asking: the British heading at the handoff to scene 3 (350° true at sunrise, or the later course as a licence); whether the beat 4 caption becomes "a chain of frigates and ships of the line"; how far Nelson's return line runs (Gibraltar, or on to Ushant).

**Where it stopped (session 7, 29 October 2026, about 23:05).** The owner stopped the session deliberately. Everything is committed and the working tree is clean. Nothing is left running: both research workflows and the dev server were stopped, and no project process remains.
- **Done in session 7** (details under "Taken in session 7" and in `docs/decisions.md`, "Scene 2, Stage A"):
  - every item of the owner's look list: the waterlining (the period profile; soft small halos for lone islands; no targets), town marks with names beside them, lettering sizes, caps and roles (Cádiz shows close up), tapering rivers in a lighter ink, cast shadows that no longer blotch the lowland, and with that the Gulf's tile edge;
  - two refinements from the chart-style adjudication: isobaths of one weight, the 200-fathom line faint;
  - the design plan in `docs/decisions.md`, reviewed against the brief and both avoid-lists;
  - research, all moved into `docs/research/scene-02/` (its README says what each file is): the adjudications of every contested verdict on h1–h3 (`a-h1ac`, `a-h1b`, `a-h2a`, `a-h2b`, `a-h2c`, `a-h3`); the 1805 names researched and checked (`h4-names`, `v-h4`); the chart-style check and its adjudication (`v-t4`, `a-t4`); a draft of the signals part of the history notes (`draft-h3`).
- **Stopped half-way:**
  - the history workflow's drafting stage: `draft-h3.md` exists; the drafts of the h1 and h2 parts were being written and left nothing;
  - the names workflow's last stage: the adjudication of the names `v-h4.md` contests did not run, so the gazetteer still letters the provisional forms.
- **Not started:** the "Scene 2" section of `history-notes.md`; applying it (the Toulon–Cádiz waypoints, the 1805 names, the glyph positions: the anchored fleet still stands on the bay's shore); the screenshots for the owner; the credits line and README notes; the full `npm run check`.
- **Not verified in session 7:** no `next build` and no Playwright run after this session's changes, so the chart tests, scene 1's regression check and the chart chunk's size are as of session 6 (scene 1's code is untouched; the lab now makes 8 draw calls, well inside the test's 1–150). Lint, typecheck and the lettering check pass. Frame rate on the owner's GPU is unmeasured; this session added work per frame (the terrain reads a land mask per vertex; the waterlining evaluates four line sets instead of two). The context-loss restore now also rebuilds the land masks (it runs in `decode`), still untested.

**Session 6 (26 October 2026)**, for reference: the ship glyphs; a clear rising shot; the Atlantic view out to the West Indies; end-to-end tests for `/lab/chart`; the regression check of scene 1; the first `next build` of the chart code; the research notes moved into the repository with independent fact-checks of h1–h3 and the period-chart notes (t4).

**Verified in session 6** (at commit `868f33d` plus the test and doc commits that follow it):
- `tsc --noEmit` and `biome check`: clean.
- `next build`: passes. The chart chunk (three, troika, the engine and the ship geometry for the glyphs) is 189 KB gzipped (budget about 300 KB); the home page's scripts don't include it.
- Playwright against that build, project by project:
  - `laptop`: 8 tests (scene 1, fonts, reduced motion and the new `?debug` overlay test);
  - `regression`: scene 1 at p = 0, 0.5 and 0.75;
  - `chart-gpu` and `chart` (software): both chart tests in each.
  - All passed. The flight test's sampling was reduced afterwards (every 0.1 down, every 0.2 back, 2 frames a step) and re-run only on `chart`.
- **Not run in session 6:** `desktop-1080`, `phone` and `perf`, and the whole suite in one `npm run check`. Scene 1's code is unchanged since its approval (`f2c0725`); shared code it uses changed only in additions (the overlay's chart block, `debug.ts`, an exported `ENEMY_TYPES`, a new "furled" sail set that leaves the old ones as they were).

1. Research
   - [x] ERDDAP subsetting (session 4): coastwatch.pfeg.noaa.gov serves only `ETOPO_2022_v1_15s` (and `_Lon0360`); the `_30s` and `_60s` ids return 404 there. Requests use grid indices with a stride, in latitude bands.
   - [x] GSAP skills (session 4 notes, applied to the lab flight in session 5): `docs/research/scene-02/t3-gsap-skills.md`.
   - [x] three r186 (`t1-three-r186.md`) and troika 0.52.5 (`t2-troika.md`), session 5, checked against the installed packages. Still to apply:
     - context restore: render targets come back empty; `field.restore()` rebakes them, but it is untested;
     - `renderer.info` counting when other passes render in the same tick;
     - troika: in-plane arcs for names along coasts (its section 5.3, a `customRewriter`), and the readiness sequence with `initTexture` on the glyph atlas (its section 7).
   - [x] History (`h1-campaign.md`, `h2-boulogne-cadiz.md`, `h3-signals.md`, session 5): independently fact-checked in session 6 (`v-h1a.md` … `v-h3b.md`); every contested verdict adjudicated against the primary sources in session 7 (`a-h1ac.md`, `a-h1b.md`, `a-h2a.md`, `a-h2b.md`, `a-h2c.md`, `a-h3.md`). The corrections that change the scene are summarised in `docs/research/scene-02/README.md`.
   - [x] The 1805 names: researched (`h4-names.md`) and checked (`v-h4.md`) in session 7, adjudicated (`a-h4.md`) and applied to the gazetteer in session 8 (`5f8032f`). Checked in session 9 (`v-a-h4.md`) and ruled (`a-v-a-h4.md`): all 34 forms stand.
   - [x] Period chart conventions (`t4-chart-style.md`, session 6): checked (`v-t4.md`) and adjudicated (`a-t4.md`) in session 7, and applied as `decisions.md` records.
   - [~] The "Scene 2" section of `history-notes.md`: every part drafted in session 8; the stopped checks of `draft-h1.md`, `draft-h2.md` and `a-h4.md` run and ruled in session 9; the whole section merged as a draft (`history-scene-02-merged.md`), not yet checked or moved into `history-notes.md`; see "Where it stopped (session 9)".
2. [x] Design plan in decisions.md ("Scene 2, Stage A"), reviewed against the brief and both avoid-lists (session 7). The detailed log of decisions stays below.
3. Data pipeline
   - [x] `npm run data:build`: built in session 4 (`b4cb148`) and revised in session 5 (`5ce1c8b`).
     - ETOPO 2022 overview (3′ cells, 72° W–20° E, 5–57° N).
     - Gulf of Cádiz tile (15″, 9.6–4.3° W, 34.9–37.8° N).
     - Surround tile (12′, 110° W–60° E, 10° S–72° N).
     - Natural Earth 5.1.2 land, minor islands and rivers.
     - 4.31 MB in `public/chart/`: overview 2.29 MB, Cádiz 0.97 MB, surround 0.72 MB, land grid 159 kB, rivers 166 kB (with each point's distance from its source since session 7), plus the manifest (version 4).
     - Raw downloads in git-ignored `data/raw/`.
     - `scripts/data/preview.ts` renders a CPU preview of the tiles.
4. Engine and the chart's look (`src/components/chart/`)
   - [x] Terrain, sea, isobaths, waterlining, coast, relief, shadows, contours, sky and haze, rivers, the Toulon–Cádiz route and the lettering (sessions 4 and 5).
   - [x] **Ship glyphs (session 6, `868f33d`)**: `glyphs/atlas.ts` and `glyphs/Glyphs.ts`; the lab's ships in `src/scenes/02-road/fleets.ts`. See the decisions below.
     - [x] **The anchored fleet is on the water (sessions 8 and 9).** It stood on the bay's north shore at the Gulf key: an open-sea glyph is taller than the bay is deep there. Session 8 gave a glyph in confined water a `room` and moved the anchorage after `a-h2c.md` (H2-36c–e): a line strung WNW–ESE in the outer bay north-east of the entrance shoals, the outermost ship toward the entrance roads, one still in the Puntal–Matagorda narrows, heads about 294° true. Its screenshots at the Gulf key (session 9) still showed the ships on the shore: the cap ignored that the bay is seen foreshortened. Session 9 measures the room on the chart beyond the ship, as the camera sees it; every ship of the lab has a measured room, the moving squadron reads its own from the chart, and a far-off group gives way to its lead (`decisions.md`, "No glyph stands on the shore", "A group gives way to its lead").
   - [x] **The rising shot is clear (session 6)**: the haze now clears quickly as the camera climbs out of the sea-level layer; the dawn frame and the higher views are as before.
   - [ ] Known look problems, still to fix (the owner's list first):
     - [x] waterlining round small islands reads as target rings (worst on the Atlantic view: the Azores, Madeira, the Canaries, the Cape Verde Islands, Bermuda, the Lesser Antilles; also the Channel Islands). Fixed in session 7;
     - [x] no town marks beside place names; the "Cadiz" label sits inland, east of the bay, away from the town. Fixed in session 7;
     - [x] label sizes only roughly tuned; names fade out when the camera comes close (Cádiz at 30 km altitude shows none). Fixed in session 7;
     - [x] rivers look uniform and mechanical and can read as borders (northern France at p = 1). Fixed in session 7;
     - [x] in the Gulf close-up the relief beyond the Cádiz tile (inland Andalusia) is visibly coarser: frame around it. Settled in session 7 by the shadow fix: the contrast came from the detail tile's shadow-speckled lowland against the smooth overview; with that gone the seam at 37.8° N no longer shows at p = 0.24, so the approved framing stays;
     - [x] at dawn light the low sun's cast shadows on the Andalusian lowlands read as dark blotches at close range (seen at 30 km altitude). Fixed in session 7.
   - [x] **The lettering's ink follows the ground under the letters (session 8):** pale on the sea, dark on land, switching at the coast within a pixel. Cádiz's name, pale for the sea it lies on from afar, had stayed pale on its isthmus close up. Gibraltar's name moved to the open sea east of the Rock: above it, the name lay half on each.
   - Noted for Stage B's close-ups (not in the lab's flight): within about 60 km Gibraltar's name begins on the Rock (a placement over the bay, west of the town, would suit those views); within about 1,000 km Ferrol's name crosses its inner ria, which the overview's 3′ grid draws as a lake.
   - [ ] Not yet looked at: the glyph colours against the owner's taste.
   - Optional refinements from `a-t4.md`, not done: the waterlines' hand (spacing jitter, a slow wobble, dashed outer hairlines: directive 3), the 100-fathom line as a stippled bank edge (7), a coastal fringe of stipple and cliff strokes (8), a river meander (6). Route styling (a dotted hairline under a wash, day circles and numerals: 10), shoals, battle marks and an anchor at the Cádiz anchorage belong to Stage B.
5. [x] The `/lab/chart` flight (`4f45b56`, keys retuned in session 6).
   - SmoothScroll (Lenis on the shared ticker) and a pinned ScrollTrigger (`id: "chart-lab"`, scrub 0.6, 8 viewport heights).
   - One duration-1 timeline drives the camera's progress, the light (dawn to campaign) and the route's drawing, with labels `dawn`, `gulf`, `atlantic` and `channel`.
   - Rendering stops off screen and in hidden tabs.
   - Query parameters: `?p` (jumps there with the scrub settled), `?light`, `?route`, `?quality`, `?debug`, and since session 6 `?eye=lon,lat,km` with `?look=lon,lat` (and `?fov=`) to hold the camera on one place.
   - `?debug` shows the chart's draw calls (8 with the glyphs and the town marks since session 7), triangles, textures, programs, quality level, render resolution, GPU memory (about 54 MB with the glyph atlas and the land masks), altitude and exaggeration, plus fps and both progress values.
   - Since session 7 the lab exposes every name's size on screen and opacity (`window.__chart.labels()`); `LABELS=1 node scripts/dev/shot.mjs <dir> "p=0.42"` prints them with each screenshot.
6. [x] Tests (session 6): `tests/e2e/chart.spec.ts` (projects `chart`, software, and `chart-gpu`), `tests/e2e/regression.spec.ts` with `tests/e2e/imageDiff.ts` (project `regression`), and the `?debug` overlay test in `tests/e2e/scene.spec.ts`. All are in `npm run test:e2e`.
7. [x] Screenshots of the flight at 1280×720 (scale 1.5) and 1920×1080, and five close views, in `docs/screenshots/scene-02/` (session 9, `fa8b32a`), each looked at and fixed.
8. [x] Credits line and README notes (session 8, `4c828d5`; README revised in session 9). The full `npm run check` passes (session 9, on `97e41aa`); the report in Russian went to the owner with the stop of session 9.

### Log of decisions (consolidated in `docs/decisions.md`, "Scene 2, Stage A")

#### Taken in sessions 4 and 5
- **Source grid.** Only the 15″ ETOPO grid is served by ERDDAP. The overview takes every fourth 15″ sample (1′) and the build tent-filters it to 3′ cells; the Cádiz tile uses every sample; the surround every 48th (12′).
- **World space.** Mercator km at the equator's scale, origin at 36° N 6° W (precision where the camera comes closest), x east, y north, z up. Tiles are Mercator grids with square map cells, row 0 north. Heights are scaled by sec φ before exaggeration.
- **Encoding (revised in session 5).** Lossless WebP per tile.
  - Height: a 12-bit asinh code, in steps of 0.14 m at sea level to 11 m at 4,000 m.
  - Coast distance: a 12-bit code, linear over ± the tile's range (1/32 cell on the overview).
  - Packing: R and G's high nibble hold the height code, B and G's low nibble the distance code.
  - Why the change: session 4's 8-bit distance code with a logarithmic tail stepped by two cells far out, and waterlines there broke into dashes.
  - Natural Earth decides land and sea; ETOPO heights are reconciled to it.
- **Tile layers (session 5).** Three layers by role: the surround under everything, the overview (the stage) over it, the Cádiz tile over that, each blended in at its edges (160 km, 18 km).
  - The surround means no view ever meets an edge of the map; distance fades into haze over real coasts (brief: "never into a hard edge").
  - A finer layer's capped coast distance hands over to the layer below near its cap, which removed false waterlines across the blend bands.
- **Decoding on the GPU.** Images decode off the main thread (`createImageBitmap`, no colour conversion). One full-screen pass per tile writes a mipmapped half-float field (height, coast distance, slopes). No JavaScript loops over the data.
- **Shadows baked on the GPU at load, not at build time** (a deviation to justify).
  - The horizon maps store true-scale horizon tangents per sun azimuth (dawn and campaign), so shadows stay right for any exaggeration and sun height, and the download is about 1.5 MB smaller.
  - Session 5 adjustments:
    - cast shadows follow at most 3.5× exaggeration (at continental scale a dawn sun threw shadows 100 km long across the plains);
    - their penumbra grows with the sun's height;
    - the surround casts none.
- **Terrain mesh (session 5).** CDLOD patches of 32 × 32.
  - Open sea is flat: a patch with no land within 25 km (a summed-area table over the land grid) splits only while the camera is nearer than its size.
  - Nothing splits beyond the distance where the haze is opaque.
  - Every patch has skirts against seams.
  - The first frame went from 1.75 M to 0.12 M triangles.
- **Haze (session 5).**
  - Visibility is 17 km + 3.5 × altitude, divided by the light state's density.
  - It is opaque by 2.3 visibilities, so the coast 20 nautical miles off is lost in the dawn haze, as in scene 1.
  - The haze takes the colour of the sky behind each point, at that point's own elevation, so distant land leaves no silhouette.
- **Exaggeration (session 5).** A monotone cubic in log–log space through (0.5 km, 1×), (20 km, 1.5×), (150 km, 3×), (1,200 km, 8×) and (6,000 km, 15×). True scale low over the sea, where scene 1's horizon must match.
- **Relief (session 5).**
  - Only real relief is shaded (true-scale slope from 0.2 % to 4 %); gentle lowland stays plain paper.
  - The facing term is compressed, so slopes toward a low sun never blaze.
  - Cast shadows are a separate term.
  - Soundings, contours and the shading normals read the field at a mip bias of +1.5: smooth period-like lines, no crumpled relief.
- **Isobaths on the shelf only** (10, 20, 50, 100, 200 fathoms): deep water was unsounded in 1805 and stays blank.
- **Waterlining** in world space as nested line sets: the spacing doubles each time the distance from the coast doubles beyond a band, and the set for the next zoom octave is a subset of the current one. The reach is now 12 spacings (it was 30); the final count waits for `t4`.
- **The sun's road** is a soft column, narrow at the horizon and widening toward the viewer. It never sparkles.
- **The flight's first frame.** Scene 1 is a stylised north-facing panorama, but its sun sits 25° right of centre. With the true sunrise azimuth (102.5°) that puts the camera's heading at about 77.5°: "looking east", with the sun where scene 1 has it. A 40° lens pitched about 4.6° up puts the horizon at 61 %; the sky stops are scene 1's CSS gradient read at those elevations.
- **Camera rig (session 5).**
  - Centripetal Catmull–Rom across the chart for the eye and the target.
  - The eye's ln altitude, the target's height and the field of view on monotone cubics over the keys. One spline for all three axes had flung the camera four times past its highest key.
  - The camera is a pure function of the scrubbed timeline's progress: no per-frame smoothing.
- **Ink lines (session 5): own ribbons, not Line2.**
  - Each line is a triangle strip widened in screen space, with miter joins and anti-aliased edges.
  - Lines on land read the terrain field where the surface does; every line is pulled toward the camera along its view ray (0.4 % of the distance).
  - A route draws itself to a head (km along it) and fades with the haze.
  - Why not Line2: the ribbons have to read the field to sit on the relief, draw up to a moving head and share the haze, and Line2's instance cap freezes at its first draw.
- **Lettering (session 5).**
  - troika-three-text in one BatchedText (one draw call). Its base material (MeshBasicMaterial derived with troika-three-utils) drapes each glyph on the relief and pulls it toward the camera.
  - Names fade by on-screen size, using the nearest letters for long names, by foreshortening and by haze.
  - One SDF size (128) for every name: a batch binds one glyph atlas.
  - `letterSpacing` is in ems (the README is wrong).
  - Pale ink on the sea, dark ink on land.
- **Lettering fonts and same origin (session 5).**
  - Every label sets its font and the default font is Bodoni Moda.
  - `scripts/check-lettering.ts` (`npm run check:lettering`, now part of `npm run check`) parses the WOFFs with troika's own parser and fails on any missing glyph. troika fetches a fallback font from jsDelivr for any uncovered character, and a same-origin `unicodeFontsURL` doesn't stop that (it retries on the CDN).
  - Local type declarations in `src/types/troika.d.ts`, because troika's bundled ones are stale.
  - **New direct dependency `troika-three-utils` 0.52.5** (the same troika release, already installed under troika-three-text, now imported directly for `createDerivedMaterial`). Justify it in decisions.md.
- **Colour.**
  - Shader colours are raw sRGB uniforms with no three colour management, so the chart matches scene 1's CSS palette exactly.
  - Since session 5 the renderer's `outputColorSpace` is `LinearSRGBColorSpace`: no output conversion at all. This also makes troika's BatchedText colours exact; 0.52.5 packs them as sRGB bytes read as linear. Verified by sampling the rendered ink.
- **Depth.** No reversed depth (no gain with a 24-bit integer buffer); near and far planes follow the altitude each frame; lines and names are pulled toward the camera.
- **Warm-up (session 5).** `compileAsync`, then one drawn frame; ANGLE on Direct3D finishes compiling at the first draw.
- **Quality ladder.** Device pixel ratio 1.5, 1.25, 1.0, then 0.85 with optional effects off. It steps down after sustained missed frames and up after long clean stretches, with a waiting time that doubles after a failed step up.
- **Scripts.** The data and check scripts are TypeScript run by Node 24's type stripping, with `--disable-warning=MODULE_TYPELESS_PACKAGE_JSON`, rather than switching the package to ES modules under the approved scene 1 setup. `tsconfig.json` gained `allowImportingTsExtensions`.
- **`.gitattributes`** marks `.webp`, `.woff` and `.bin` as binary (session 5).

#### Taken in session 6
- **Ship glyphs.** Scene 1's silhouettes, drawn once at load from the same geometry (`buildShip`) into a coverage atlas: red the canvas, green the dark parts over it (hull, spars, rigging). Cut at the waterline; every type at one scale, so a 74 stands smaller than a first rate.
  - A glyph is a billboard anchored at its waterline, upright on screen at any pitch (an upright world-space card goes flat when seen from high above). It faces the side its heading points to on screen and narrows to 40 % when the heading turns toward or away from the camera. Mirrored glyphs are the quad flipped, so the material is double-sided.
  - Sorted back to front each frame (an insertion sort over last frame's order); premultiplied alpha; no depth writes. One draw call for the ships, one for the wakes.
  - Size is a chart convention, not true scale: a cell's height on screen per camera altitude (`GLYPH_PX`): 22 CSS px at 0.05 km (scene 1's ships on the horizon), 28 at 9 km, 34 at 120 km, 21 at 1,400 km, 14 at 6,000 km; times (distance to the target ÷ distance to the glyph)^0.35, clamped to 0.55–1.8, so nearer glyphs read a little larger.
  - Colours by side: the British in scene 1's two tones (canvas `#ebe2ce`, hulls `#26231f`); the combined fleet in the slate-violet of scene 1's enemy line (canvas `#a9a6b4`, hulls `#34343f`). The canvas takes 18 % of the sun's colour and dims at night. A first pass for the owner to judge.
  - Wakes: two fine pale-ink arms at Kelvin's 19.5° either side of the track, 1.5 glyph heights long, thinning and fading astern, at half opacity; none at anchor.
  - A "furled" sail set (`specs/derive.ts`) for ships at anchor: bare masts and yards. The existing "full" and "easy" sets are unchanged.
  - The lab shows two moments at once: the fleets near Cape Trafalgar at dawn on 21 October, and the combined fleet at anchor off Cádiz before the sortie (Stage B gives each its beat). Spacing within a group is opened up a few times over the true cables, as the glyphs are enlarged, so ships read one by one. Villeneuve's squadron (three glyphs) sails at the route's drawing head.
- **Haze (revised).** A monotone cubic in log–log space through (0.05 km, 17.2 km), (1, 24), (9, 105), (115, 420), (1,400, 4,917) and (6,000, 21,017): the dawn frame keeps scene 1's haze, the camera climbs out of the sea-level layer within a few kilometres so the rising shot's coast is clear, and the higher views are as before (17 km + 3.5 × altitude).
- **The Atlantic key** (p = 0.62): eye 37° W 11° S at 5,000 km, target 32° W 24.5° N, field of view 52°. Seen from the south, the West Indies are nearest, lower left, with South America below them; Europe and Africa on the right; the British Isles at the top. The in-between frames (p = 0.33–0.9) were checked for overshoot.
- **`Route.pointAt`** fills a plain `{ x, y, heading }`, so a host page needs no import from three.
- **Tests.**
  - The chart lab runs twice: in the default headless shell (SwiftShader: 2.4–5 s a frame at the laptop's 1920×1080 device pixels, so that project uses 960×540 at scale 1) and in the new headless mode on the GPU at the owner's viewport.
  - The flight test scrolls through Lenis every 0.1 of the flight down and every 0.2 back. It checks for errors, draw calls (1–150) and triangles, and that every request is same-origin (`blob:` and `data:` exempt), the manifest and the 3D fonts included.
  - The render test samples screenshots at p = 0, 0.24 and 0.62: luminance spread, distinct colours, and the share of sea and paper.
- **Scene 1's regression check.** The idle loops move scene 1 continuously, so a plain pixel comparison fails against itself. Measured on this build against itself 2.3 s later, and against the approved screenshots:
  - the share of pixels with no match within 24 levels in a 7 × 7 neighbourhood at half size: ≤ 0.17 % against itself, ≤ 0.2 % against the approved;
  - the median 20-pixel block difference: ≤ 0.22 and ≤ 0.16;
  - the 99th percentile block difference: ≤ 14 and ≤ 13.7 levels.
  - The limits are about three times those (0.6 %, 1.2, 28). Rendered as the approved screenshots were: the new headless mode on the GPU, 1280×720 at scale 1.5.
- **Scene 1's `?debug` overlay** is tested: exactly two lines (fps, the dawn progress), and the chart's readout block empty and zero pixels tall.
- **Research notes in the repository.** All research notes, with the fact-check reports, are in `docs/research/scene-02/`. On copying, every quotation of 26 words or more was cut to its opening phrase (20 of them, all from public-domain period sources).
- **Dev tooling in the repository.** `scripts/dev/shot.mjs` takes screenshots of `/lab/chart`; `scripts/dev/sheet.mjs` makes contact sheets and crops. Both are development aids, not part of the site.

#### Taken in session 7
- **Waterlining after Hall** (`t4-chart-style.md`, section 1; terrain/shaders.ts). Replaces the scheme whose spacing doubled each time the distance doubled, which drew few, wide, equally strong rings: a target round every small island.
  - Lines every 2.2 CSS px at the shore, the spacing opening smoothly about twofold across the band to a reach of 26 spacings (about 57 CSS px): four nested sets (s, 2s, 4s, 8s), the finest giving way at 0.45 of the reach and each coarser one reaching 0.45 farther, instead of a step. The period range is twofold (Hall 1817) to fourfold (the Ordnance Survey, 1801–1809), always smooth (`v-t4`). Each line stays put in the world as the camera zooms, and nothing jumps when the octave changes.
  - Strength falls as (1 − d/reach)^1.5; the first few lines about twice the middle ones' weight, a rim of tone at the shore; each line's weight and ink vary ±20 % and ±15 %, hashed from its distance from the coast so a line keeps its hand at every zoom.
  - A small island far from other land keeps a small, soft halo (55 % of the reach, 60 % strength, after `a-t4.md`, directive 4; a first try at full reach and 18 % strength kept a faint target's geometry), as Hall drew a soft small patch round an isolated rock. "Far from other land" is the share of land in a window round the water that reaches past its own coast distance by 0.3 reach: along any coast the window always holds land (above 0.11 out to the reach), round a speck almost none, even in a strait between two coasts (Alborán). The window follows the water, not its nearest coast, so halos meet without seams and islets close inshore (Ushant, the Channel Islands) leave the coast's band whole.
  - The share of land comes from a land mask per tile, baked on the GPU at load at half resolution and mipmapped (about 3 MB), read once per terrain vertex.
  - Tried and dropped: the share of land in a fixed window (a speck in a narrow sea such as Alborán got a full target); the mean coast distance in a window (a cluster such as the Azores averages like a coast, and the overview's distance range of 356 km caps it at ocean scale).
  - Isobaths give way where the waterlining is strong (from 0.2 to 0.55 of the reach).
- **Town marks** (`lettering/marks.ts`; `t4`, section 6, and `v-t4`): an open ring about the lettering's x-height across (outer radius 0.22 em, stroke 0.07 em) on the town's site, a capital's with a dot at its centre (Hall 1817's ⊙; Faden's pictogram is one engraver's habit). The name is set beside it (`side`: right by default, or left, above, below). Marks are one instanced, draped mesh owned by the lettering layer: one more draw call (8 in all), faded and scaled with their names. A cape's name can end at the cape the same way, without a mark.
- **Lettering sizes and roles.**
  - Each name is sized to be about 12 CSS px at the farthest view of the flight where it matters (`scratchpad` script; the lab's `window.__chart.labels()` and `LABELS=1 node scripts/dev/shot.mjs` print every name's size on screen).
  - Close up, towns stop growing at 19 px, capitals at 22, capes and islands at 18, and stay, as a chart of a smaller area letters its towns again; oceans, seas, waters and lands fade out instead. The period hierarchy (capital 1.4 : port 1.2 : minor 1) sets the caps.
  - New roles: `cape` (italic, capped) and `island` (roman, pale ink, since island names lie on the sea). A label can set its ink (`ink: "pale"` for Cádiz, whose name lies on the open sea west of its isthmus).
  - "Barbary" moved onto the plains: on the High Atlas the exaggerated relief hid a letter. London and Portsmouth set their names above the mark, clear of the Thames and the Solent.
- **Rivers taper** (`lines/Rivers.ts`, `scripts/data/lib/rivers.ts`): `npm run data:build` now orders each river from its source downstream (Natural Earth digitises them that way; 16 lines whose ends rise by more than 50 m were turned round) and stores each point's distance from the source (u16 km), carried through lines that continue one another (152 of 412). The width grows with the square root of that distance, from a fading hairline to 1.6 px (scalerank 0) or 0.8 px (minor) at 450 km; the ink is the contours' brown at 0.8, a step lighter than the coast, so a river no longer reads as a border. Manifest version 4; rivers.bin 142 → 166 kB; the tiles are byte-identical.
- **Cast shadows** (terrain/shaders.ts, engine/Chart.ts): a shadow deepens with how far the relief rises above the sun's line (from the geometric edge over 0.04, or half the sun's tangent), so a low hill that barely clips a dawn sun casts a faint wash and a sierra its full shadow; and cast shadows come in with the camera's altitude, from nothing at 20 km to full at 160 km (about 75 % at the Gulf key). From a few dozen kilometres the lowland's hills had shredded it into blotches under the 4° dawn sun; the hill shading stays at every height. Trafalgar's name is set below the cape, clear of the fleets.

### Next steps, in order
See "Where it stopped (session 9)" at the top of this section: session 8 worked through session 7's list, and session 9 through session 8's (the checks and rulings, the route, the screenshots, the frame time, the full check); what remains is listed there.

## Scene 1

Legend: `[x]` done, `[~]` built but not yet reviewed or finished, `[ ]` not started.

## Session log
- Session 1 (24 October 2026): phases 0–2, the ship engine and a first pass of the whole scene (environment, choreography, text). It ran out of usage during phase 5 tuning; the retuning it left uncommitted was finished and committed as `bd0c849`. The research for `docs/history-notes.md` was done (three research tracks, one fact-checked), but the session stopped before the file was written, so it did not exist in the repository.
- Session 2 (25 October 2026): resumed from the repository and the previous session's research files. Wrote `docs/history-notes.md` (and kept the full research in `docs/research/`), ran a review round on screenshots and close-ups, fixed what was off, finished phases 5–7. Interrupted once when the editor closed; resumed from the repository again.
- Owner review (25 October 2026): the production preview with `?debug` runs at a steady 60 fps on the owner's laptop (Intel Arc integrated graphics). **Owner-verified.**
- Session 3 (25 October 2026): a short follow-up round on the owner's review: the real fonts, his answers on the rig and flags, 15 lower-deck ports, a backlog for later scenes, and public-repository hygiene. See "Follow-up round" below.
- Session 4 (25 October 2026): scene 2 Stage A begun. ERDDAP research, the data pipeline, and the engine core written but never run; stopped by the owner mid-step 4.
- Session 5 (25 October 2026): the engine type-checked, run and proven on `/lab/chart`; first-run defects fixed (12-bit coast distance, the surround tile, a flat-sea LOD with skirts, the haze model); restrained relief; rivers, the route, the scroll flight, the debug readouts and the lettering. The research was re-run in parallel and stopped with the session. Stopped deliberately by the owner after the lettering commit.
- Session 6 (26 October 2026): ship glyphs, a clear rising shot, the Atlantic view out to the West Indies, the chart lab's tests and scene 1's regression check, the first `next build` of the chart; the history notes fact-checked and all research moved into `docs/research/scene-02/`. Stopped deliberately by the owner while the research's last stages ran.
- Session 8 (31 October 2026): the anchored fleet on the water; the frame load measured on the owner's laptop (about half a 60 fps frame at the worst point) and guarded by a test; the context-loss restore tested; the lettering's ink by the ground under it; the 1805 names adjudicated and applied; Villeneuve's Toulon–Cádiz track and the dawn positions from the research; the credits line and README; the history section drafted and partly checked. Stopped deliberately by the owner while the section was being assembled; see "Where it stopped (session 8)".
- Session 9 (1 November 2026): the screenshots of the flight showed the anchored fleet still on the shore at the Gulf key; every glyph now fits the water beyond it as the camera sees it, a far-off group gives way to its lead, and the moving squadron reads its room from the chart; Cape Trafalgar's name moved clear of the fleets; the stopped checks of the h1, h2 and names work run and ruled (the names hold; the narrows ship and the Toulon–Cádiz track corrected; the dawn layout and heading recorded as licences); the Playwright projects' spec patterns fixed; the screenshots for the owner; the frame time measured at the close of the stage (8.6 ms of GPU at worst); the full `npm run check` passing. Stopped deliberately by the owner as the merged history section was written; see "Where it stopped (session 9)".
- Session 10 (1 November 2026): Stage A approved by the owner (60 fps on his laptop). The merged history section checked in four parts and three of the checks ruled on (not yet merged); the Stage B plan; scene 2's skeleton working end to end in dev: the handoff from scene 1 through overlapping pins with Victory carried onto her glyph, every beat's camera, light, routes, squadrons, both fleets ship by ship, captions and date line, the last frame into the sunrise; four layers started by agents on their own branches (unreviewed). Stopped deliberately by the owner; see "Where it stopped (session 10)".
- Session 7 (29 October 2026): the owner's look list done (waterlining, town marks, lettering, rivers, shadows, the Gulf's tile edge), isobaths of one weight, and the design plan in `decisions.md`; the history adjudicated, the 1805 names researched and checked, the chart style checked and adjudicated, all moved into the repository. Stopped deliberately by the owner while the history drafts and the names adjudication ran; see "Where it stopped" above.

## 0. Setup
- [x] Node 24.15.0 and git 2.55 checked; git user configured
- [x] Versions confirmed with `npm view` (see decisions.md, "Versions")
- [x] Scaffolded with create-next-app 16.4.3 (TypeScript, Tailwind, Biome, App Router, `src/`, `@/*`, npm, no git)
- [x] Exact versions pinned; rest of the stack installed; Playwright Chromium installed
- [x] `.nvmrc`, `engines`, `.gitattributes` (LF), `.gitignore`, Biome config migrated to 2.5
- [x] git initialised on `main`; first commit

## 1. Research and design plan
- [x] Victory 1805 hull, rig, flags and the dawn setting researched; `docs/history-notes.md` written, full research in `docs/research/`
- [x] GSAP skills and current docs (GSAP 3.15, Lenis 1.3, Next 16.4, Tailwind 4.3, Biome 2.5, Playwright 1.64): findings applied, see decisions.md
- [x] Design plan in `docs/decisions.md`: palette, type roles, layout sketch, layer stack, choreography table
- [x] Plan reviewed against the brief and the avoid-list (decisions.md, "Review against the brief and the avoid-list")

## 2. Foundations
- [x] `src/lib/gsap.ts`, `SmoothScroll` (Lenis on the GSAP ticker, prioritised; keyboard guard)
- [x] `Experience` + scene registry; pinned scene with a debug progress readout (`?debug`)
- [x] Fallback branch (CSS switch, `gsap.matchMedia`), reduced-motion branch
- [x] Font variables and `docs/fonts.md` (real faces wired in session 3)
- [x] Playwright smoke tests against the export (laptop, 1080p, phone, perf with video)

## 3. The ship
- [x] `ShipSpec` types, seeded variation, geometry functions
- [x] `VICTORY_1805` spec with the research figures (15/15/15 ports, the lower deck as on the contemporary model since session 3; 2015 paint survey colours, Steel 1794 spars, main truck 60.2 m, four topsail reef bands)
- [x] Hero rendering (hull, ports, chequer, copper, masts, sails, rigging, flags, details); mast highlights behind the sails, warm light on canvas only
- [x] Silhouette mode
- [x] `/lab/ship` (noindex) with detail, lighting, backdrop and close-up controls
- [x] Visual iteration rounds with screenshots and close-up crops at device scale 2

## 4. Environment
- [x] Sky (night and dawn gradients, stars, moon, procedural cloud strands), sun and glow
- [x] Sea strips (tiling SVG, two colour variants), front strip, sun reflection
- [x] Haze canvases (back and front), glitter canvas
- [x] Distant fleets (33 enemy in four groups, enemy lights, 3 British astern in two tones)

## 5. Choreography and text
- [x] Master scroll timeline (300vh pin), idle loops with pause logic (in view and tab visibility)
- [x] SplitText title (never wraps), copy, scrim, scroll cue, chapter marker
- [x] Scene 2 placeholder

## 6. Polish and performance
- [x] Profile; long tasks; element budgets (no long tasks during scroll; about 600 SVG elements in the scene, 270 in the hero)
- [x] 60 fps while scrolling on the owner's laptop: owner-verified with `?debug` on the production preview (25 October 2026)
- [x] Easing and timing (checked frame by frame at p = 0.1, 0.25, 0.4, 0.5, 0.62, 0.75, 0.85, 0.95, 1)
- [x] Avoid-list walk-through

## 7. Verification and report
- [x] Fallback shows a static composition with Victory in dawn light (client-mounted)
- [x] Playwright: SVG element count test; screenshot spec (`docs` project)
- [x] `npm run check` green
- [x] Screenshots in `docs/screenshots/scene-01/`, reviewed
- [x] Scroll-through video in `test-results/` (headless video looks choppier than real hardware)
- [x] Docs current (README rewritten); everything committed
- [x] Final report (Russian)

## Follow-up round (session 3)
- [x] Owner's 60 fps result recorded as owner-verified
- [x] Fonts: Bodoni Moda (title) and Baskervville (text) through next/font/local from `src/fonts/`; SplitText re-split on font load and resize with kerning restored; title on one line at every screenshot size (tested); small text one step larger, contrast measured over the moving background
- [x] Owner's answers applied: no studding sails, no stern ensign at dawn (`flying` prop; the spec keeps the ensign for later), vice-admiral's flag kept (sources split, not against)
- [x] Lower gun deck: 15 ports a side, as on the contemporary model (bow port kept, aftmost dropped); derived specs now scale explicit port positions too
- [x] `docs/backlog.md` for later scenes: studding sails and the ensign hoist (approach scene), port interiors (when ports open)
- [x] Public-repository hygiene: research notes keep only our own words and links (modern quotations paraphrased, long period quotations trimmed; rules in `docs/research/README.md`); nothing downloaded was ever committed; `/docs/research/sources/` git-ignored; history rewritten with the owner's approval (25 October 2026), so no commit holds the old wording; the old history is in a git bundle outside the repository
- [x] `npm run check` green (16 tests, no long tasks during the scripted scroll; video in `test-results/`); all 17 screenshots regenerated and reviewed (laptop set, large screens, reduced motion, fallback, lab and close-ups); one fix from the review: the title block's spacing around Bodoni Moda's long descender; docs updated
