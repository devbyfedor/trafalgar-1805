# Progress

Live checklist. A later session picks up from here. The briefs are `docs/scene-01-brief.md` and `docs/scene-02-brief.md`; decisions and deviations are in `docs/decisions.md`.

## Scene 2, Stage A: engine, data and look (sessions 4 and 5, 25 October 2026)

Stage A builds the chart engine, its data and its look, proven by one camera flight on `/lab/chart`, then stops for the owner's performance check on his GPU. Stage B (the full scene) waits for his approval.

**Where it stopped (session 5, 25 October 2026, about 22:35).** The owner stopped the session deliberately, right after the lettering commit (`2d68450`). Everything is committed and the working tree is clean.
- **The engine runs.** `/lab/chart` flies the whole Stage A flight, pinned and scrubbed by scroll. It shows the terrain with sea, isobaths, waterlining, inked coast, relief, shadows and contours, plus sky and haze, rivers, the Toulon–Cádiz route drawing itself, and the names. In headless Chromium on this laptop's GPU it runs at 5 draw calls, 0.12–0.75 M triangles depending on the view, and 47 MB of field textures.
- **Checked at the last commit:** `tsc --noEmit`, `biome check` and `npm run check:lettering` are clean.
- **Not run in session 5:** `next build`, `npm run test:e2e`, and therefore the full `npm run check`. No test covers `/lab/chart` yet.
- **Scene 1 code changes, not yet re-tested:**
  - `DebugOverlay` gained a `progress` prop (default `["dawn"]`, so scene 1 shows the same readout as before) and a chart readout block that stays empty unless a chart registers.
  - `src/lib/debug.ts`: additions only.
- **Stopped:** the research workflow and the dev server.

1. Research
   - [x] ERDDAP subsetting (session 4): coastwatch.pfeg.noaa.gov serves only `ETOPO_2022_v1_15s` (and `_Lon0360`); the `_30s` and `_60s` ids return 404 there. Requests use grid indices with a stride, in latitude bands.
   - [x] GSAP skills (session 4 notes, applied to the lab flight in session 5).
   - [~] **Research re-run in session 5** (workflow `scene2-research`, stopped at the owner's request after about an hour). The notes are outside the repository, in `C:\Users\User\AppData\Local\Temp\claude\d--dev-trafalgar-1805\81d46a93-68b9-4541-8365-f913ef045b3d\scratchpad\research\`.
     - `t1-three-r186.md`: **finished**. three r186, checked against the installed source.
       - Applied: the warm-up is `compileAsync` plus one draw; no instance upload when nothing is in view.
       - Still to apply:
         - Playwright projects: the default headless shell renders with SwiftShader (Playwright adds `--enable-unsafe-swiftshader` itself). `channel: "chromium"` renders on this laptop's Intel Arc, which allows only 16 texture units per stage and 1024 fragment uniform vectors, so test on both.
         - Context restore: render targets come back empty; `field.restore()` rebakes them, but it is untested.
         - `renderer.info` counting when other passes render in the same tick.
     - `t2-troika.md`: **finished**. troika 0.52.5, checked against the installed package.
       - Applied in the lettering: see 4.
       - Still open: in-plane arcs for names along coasts (its section 5.3, a `customRewriter`), and the readiness sequence with `initTexture` on the glyph atlas (its section 7).
     - `h1-campaign.md`, `h2-boulogne-cadiz.md`, `h3-signals.md`: the notes were written, but their independent fact-checks never ran. **Not read yet.**
     - `h4-names` (the 1805 names) and `t4-chart-style` (period chart conventions): **not written**; re-run them.
     - The workflow script is `C:\Users\User\.claude\projects\d--dev-trafalgar-1805\81d46a93-68b9-4541-8365-f913ef045b3d\workflows\scripts\scene2-research-wf_f8088a97-33c.js`. To redo only what is missing, keep the `names` and `chartstyle` tracks and add a verify-only stage for `campaign`, `cadiz` and `signals` that reads the existing notes.
   - [ ] The "Scene 2" section of `history-notes.md`: not written.
2. [ ] Design plan in decisions.md, reviewed against the brief and both avoid-lists: **not written** (the user's step 3, next after reading the research). All decisions taken so far are listed below.
3. Data pipeline
   - [x] `npm run data:build`: built in session 4 (`b4cb148`) and revised in session 5 (`5ce1c8b`).
     - ETOPO 2022 overview (3′ cells, 72° W–20° E, 5–57° N).
     - Gulf of Cádiz tile (15″, 9.6–4.3° W, 34.9–37.8° N).
     - Surround tile, new (12′, 110° W–60° E, 10° S–72° N).
     - Natural Earth 5.1.2 land, minor islands and rivers.
     - 4.28 MB in `public/chart/`: overview 2.29 MB, Cádiz 0.97 MB, surround 0.72 MB, land grid 159 kB, rivers 142 kB, plus the manifest (version 3).
     - Raw downloads in git-ignored `data/raw/` (the surround's two ERDDAP bands were added in session 5).
     - `scripts/data/preview.ts` renders a CPU preview of the tiles.
4. Engine and the chart's look (`src/components/chart/`)
   - [x] Type-check and lint of the work-in-progress engine (`d467a8a`).
   - [x] The entry point `index.ts` (a dynamic import, so its own chunk) and a minimal `/lab/chart` (`61aeb7e`). The first screenshots were looked at before anything else was written, and the first-run defects fixed (`5ce1c8b`). Hill shading restrained (`f45e0b7`).
   - [x] Rivers and the Toulon–Cádiz route as ribbons (`4f45b56`). The waypoints in `src/scenes/02-road/routes.ts` are **provisional** until `h1` is applied.
   - [x] Lettering, in one BatchedText (`2d68450`). The gazetteer in `src/scenes/02-road/gazetteer.ts` is **provisional**: the 1805 forms, sizes and positions are still unchecked (waits for `h4`).
   - [ ] Ship glyphs: **not started**. Plan:
     - an atlas drawn from `buildShip` silhouettes, as instanced upright glyphs facing their heading, coloured by side, with ink wakes;
     - a few near Cape Trafalgar and at Cádiz (positions from `h2`);
     - one ship sailing at the route's drawing head (`Route.pointAt`).
   - Known look problems, to fix:
     - waterlining round islands reads as target rings (waits for `t4`: line count, spacing, reach);
     - no town marks beside place names;
     - label sizes only roughly tuned;
     - the rising shot (p ≈ 0.09) is too hazy;
     - the Atlantic view (p = 0.62) doesn't reach the Caribbean;
     - rivers look uniform and mechanical;
     - in the Gulf close-up the relief beyond the Cádiz tile (inland Andalusia) is visibly coarser: frame around it.
5. [~] The `/lab/chart` flight (`4f45b56`).
   - SmoothScroll (Lenis on the shared ticker) and a pinned ScrollTrigger (`id: "chart-lab"`, scrub 0.6, 8 viewport heights).
   - One duration-1 timeline drives the camera's progress, the light (dawn to campaign) and the route's drawing, with labels `dawn`, `gulf`, `atlantic` and `channel`.
   - Rendering stops off screen and in hidden tabs.
   - Query parameters: `?p` (jumps there with the scrub settled), `?light`, `?route`, `?quality`, `?debug`.
   - `?debug` shows the chart's draw calls, triangles, textures, programs, quality level, render resolution, GPU memory, altitude and exaggeration, plus fps and both progress values (scroll and flight). **Done.**
   - The keys in `src/app/lab/chart/flight.ts` still need a framing pass (see 4).
6. [ ] Tests: none for `/lab/chart` yet. Planned `tests/e2e/chart.spec.ts`:
   - no console errors over the whole flight and back;
   - canvas pixels sampled, not blank;
   - every request same-origin, including troika's worker requests (`blob:` exempt), and none to cdn.jsdelivr.net;
   - run on the default headless (SwiftShader) and on `channel: "chromium"` (the Arc);
   - then scene 1's tests and its screenshot regression check at p = 0, 0.5 and 0.75.
7. [ ] Screenshots of the flight at 1280×720 (scale 1.5) and 1920×1080 into `docs/screenshots/scene-02/`. So far only scratch renders exist, in the scratchpad's `shots/r1`–`r13`.
8. [ ] Commit, progress, report in Russian.

### Decisions taken so far (to move into decisions.md)
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

### Next steps, in order
1. Read `h1`, `h2` and `h3` (and `t1`/`t2`, sections still to apply). Re-run the missing research: the 1805 names (`h4`), the period chart conventions (`t4`), and the independent fact-checks of `h1`–`h3`, with the saved script, trimmed as described in step 1 above.
2. Write the design plan into decisions.md from the list above: palette, type roles, layer stack, how each feature is drawn, the camera rig, the quality ladder, and the troika-three-utils dependency. Review it against the brief and both avoid-lists, then commit.
3. Write the "Scene 2" section of history-notes.md (facts, dates, sources, doubts, fleet sizes, signals) and apply it:
   - the route waypoints (`h1`);
   - the 1805 names in the gazetteer (`h4`), re-running `npm run check:lettering`;
   - glyph positions at Cádiz and near Cape Trafalgar (`h2`).
4. Look fixes:
   - from `t4`: waterlining round islands, the isobaths' style, the rivers;
   - town marks;
   - label sizes;
   - the flight's framing: the Caribbean in the Atlantic view, a clearer rising shot, the Gulf view kept within the Cádiz tile.
5. Ship glyphs (see 4 above).
6. Tests (see 6 above), then `npm run check`, which includes `next build`, never run on the new code, and scene 1's regression check.
7. Screenshots of the flight at 1280×720 (scale 1.5) and 1920×1080 into `docs/screenshots/scene-02/`, looked at and fixed.
8. The credits line on the site and in README ("Relief: NOAA NCEI ETOPO 2022. Coastlines and rivers: Natural Earth."); README notes on `/lab/chart`, `npm run data:build` and `npm run check:lettering`; commit; the short report in Russian, then stop for the owner's GPU check.

Dev tooling, outside the repository (session 5 scratchpad, `C:\Users\User\AppData\Local\Temp\claude\d--dev-trafalgar-1805\81d46a93-68b9-4541-8365-f913ef045b3d\scratchpad\`):
- `shot.mjs` screenshots `/lab/chart` from `npm run dev` (127.0.0.1:3000) on `channel: "chromium"`. Run it as `node shot.mjs <out-dir> "p=0.24" "p=0.62&light=campaign" …`; the environment variables `W`, `H`, `S` and `WAIT` set the width, height, scale and settle time.
- `crop.mjs` crops and enlarges a region.

## Scene 1

Legend: `[x]` done, `[~]` built but not yet reviewed or finished, `[ ]` not started.

## Session log
- Session 1 (24 October 2026): phases 0–2, the ship engine and a first pass of the whole scene (environment, choreography, text). It ran out of usage during phase 5 tuning; the retuning it left uncommitted was finished and committed as `bd0c849`. The research for `docs/history-notes.md` was done (three research tracks, one fact-checked), but the session stopped before the file was written, so it did not exist in the repository.
- Session 2 (25 October 2026): resumed from the repository and the previous session's research files. Wrote `docs/history-notes.md` (and kept the full research in `docs/research/`), ran a review round on screenshots and close-ups, fixed what was off, finished phases 5–7. Interrupted once when the editor closed; resumed from the repository again.
- Owner review (25 October 2026): the production preview with `?debug` runs at a steady 60 fps on the owner's laptop (Intel Arc integrated graphics). **Owner-verified.**
- Session 3 (25 October 2026): a short follow-up round on the owner's review: the real fonts, his answers on the rig and flags, 15 lower-deck ports, a backlog for later scenes, and public-repository hygiene. See "Follow-up round" below.
- Session 4 (25 October 2026): scene 2 Stage A begun. ERDDAP research, the data pipeline, and the engine core written but never run; stopped by the owner mid-step 4.
- Session 5 (25 October 2026): the engine type-checked, run and proven on `/lab/chart`; first-run defects fixed (12-bit coast distance, the surround tile, a flat-sea LOD with skirts, the haze model); restrained relief; rivers, the route, the scroll flight, the debug readouts and the lettering. The research was re-run in parallel and stopped with the session. Stopped deliberately by the owner after the lettering commit; see "Where it stopped" above.

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
