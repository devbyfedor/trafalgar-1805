# Progress

Live checklist. A later session picks up from here. The briefs are `docs/scene-01-brief.md` and `docs/scene-02-brief.md`; decisions and deviations are in `docs/decisions.md`.

## Scene 2, Stage A: engine, data and look (session 4, 25 October 2026)

Stage A builds the chart engine, its data and its look, proven by one camera flight on `/lab/chart`, then stops for the owner's performance check on his GPU. Stage B (the full scene) waits for his approval.

**Where it stopped (25 October 2026).** The owner stopped the session mid-step 4. Everything is committed; the last commit is a work-in-progress commit of engine code that has **never been run, type-checked or linted**. No test was run in this session. Scene 1 is untouched.

1. Research
   - [x] ERDDAP subsetting: coastwatch.pfeg.noaa.gov serves only `ETOPO_2022_v1_15s` (and `_Lon0360`); the `_30s` and `_60s` ids return 404 there. Requests use grid indices with a stride, in latitude bands.
   - [ ] History (campaign and dates, Boulogne, Ulm, Cádiz and the sortie, fleet sizes, signals by day and night, 1805 names for the lettering) — **to redo**. A research workflow (four history tracks, each with an independent fact-check) was started and then stopped at the owner's request before any history track finished. Nothing is in `history-notes.md` yet.
   - [ ] three r186, troika-three-text 0.52.5, period chart conventions — **to redo** (same workflow, unfinished). Its script is saved at `C:\Users\User\.claude\projects\d--dev-trafalgar-1805\77ea0797-a7cb-4b62-862c-c645c2812e68\workflows\scripts\scene2-research-wf_e9d907ad-a91.js` and can be re-run as it is.
   - [~] The GSAP skills: the one track that finished. Its notes are outside the repository at `C:\Users\User\AppData\Local\Temp\claude\d--dev-trafalgar-1805\77ea0797-a7cb-4b62-862c-c645c2812e68\scratchpad\research\t3-gsap-skills.md` (not yet read or applied).
   - Checked by hand while writing the engine (three r186 source and types in `node_modules`): every `ShaderMaterial` compiles as GLSL ES 3.00 (with `glslVersion: GLSL3` the shader declares its own output); r186 has `reversedDepthBuffer`, but the default framebuffer's depth stays 24-bit integer; on context restore three re-initialises its state, so render-target contents must be rebuilt by the app; `compileAsync`, `initTexture`, `addUpdateRange`/`clearUpdateRanges` exist. troika 0.52.5 ships its own `.d.ts` in `dist/types`.
2. [ ] Design plan in decisions.md, reviewed against the brief and both avoid-lists. Not written; the decisions already taken are listed below so they aren't lost.
3. Data pipeline
   - [x] `npm run data:build` (commit `b4cb148`): ETOPO 2022 overview (3′ cells, 72° W–20° E, 5–57° N) and Gulf of Cádiz tile (15″, 9.6–4.3° W, 34.9–37.8° N); Natural Earth 5.1.2 land, minor islands and rivers; 3.04 MB in `public/chart/` (overview 2.03 MB, Cádiz 0.79 MB, low-res heights 77 kB, rivers 142 kB, manifest). Raw downloads (92 MB) in git-ignored `data/raw/`. `scripts/data/preview.ts` renders a CPU preview of the tiles for checking by eye; both tiles were checked this way.
4. Engine and the chart's look
   - [~] Written, not yet run (`src/components/chart/`): `geo/mercator.ts` (committed with the pipeline), `data/manifest.ts`, `data/loaders.ts`, `shaders/common.ts` (field sampling, line coverage, sky and haze GLSL), `terrain/field.ts` (GPU decode of the WebP tiles into half-float fields; horizon maps baked on the GPU at load), `terrain/cdlod.ts`, `terrain/shaders.ts` (sea, shelf isobaths, waterlining, coast, land relief, shadows, contours, haze), `terrain/Terrain.ts`, `light/states.ts` (dawn, campaign, night), `sky/Sky.ts`, `camera/rig.ts` (spline rig, exaggeration and contour interval by altitude), `engine/quality.ts` (quality ladder), `engine/Chart.ts` (renderer, frame, stats, context loss, warm-up).
   - [ ] Not started: `src/components/chart/index.ts` (the dynamic-import entry), rivers and the route as ribbon lines, lettering (troika, the owner's WOFF fonts from `/fonts/3d/`, no CDN fallback), the 1805 gazetteer, ship glyphs (atlas drawn from `buildShip` silhouettes, instanced upright glyphs, ink wakes).
5. [ ] `/lab/chart` flight with `?debug` readouts. Not started; `DebugOverlay` and `src/lib/debug.ts` still need a stats channel for the chart.
6. [ ] Tests (lab page: no console errors, canvas renders, same-origin; scene 1 unchanged)
7. [ ] Screenshots of the flight at 1280×720 (scale 1.5) and 1920×1080, reviewed and fixed
8. [ ] Commit, progress, report in Russian

### Decisions taken so far (to move into decisions.md)
- **Source grid.** Only the 15″ ETOPO grid is served by ERDDAP, so the overview takes every fourth 15″ sample (1′) and the build tent-filters it to 3′ cells; the Cádiz tile uses every sample.
- **World space.** Mercator km at the equator's scale, origin at 36° N 6° W (precision where the camera comes closest), x east, y north, z up. Tiles are Mercator grids with square map cells, row 0 north. Heights are scaled by sec φ before exaggeration.
- **Encoding.** Lossless WebP per tile: R and G a 12-bit asinh height code (steps of 0.14 m at sea level to 11 m at 4,000 m; a third smaller than 16-bit with no visible terracing), B the coast's signed distance (linear within 4 cells, logarithmic beyond, joined with matching slope). Natural Earth decides land and sea; ETOPO heights are reconciled to it.
- **Decoding on the GPU.** Images decode off the main thread (`createImageBitmap`, no colour conversion); one full-screen pass per tile writes a mipmapped half-float field (height, coast distance, slopes). No JavaScript loops over the data.
- **Shadows baked on the GPU at load, not at build time** (a deviation to justify): the horizon maps store true-scale horizon tangents per sun azimuth (dawn and campaign), so shadows stay right for any exaggeration and sun height, and the download is about 1.5 MB smaller.
- **Isobaths on the shelf only** (10, 20, 50, 100, 200 fathoms): deep water was unsounded in 1805 and stays blank. The preview showed deep isobaths turning the Mid-Atlantic Ridge into squiggles.
- **Waterlining** in world space as nested line sets: the spacing doubles each time the distance from the coast doubles beyond a band, and the set for the next zoom octave is a subset of the current one, so lines thin out smoothly as the camera pulls back and stay crisp at every zoom.
- **The flight's first frame.** Scene 1 is a stylised north-facing panorama, but its sun sits 25° right of centre; with the true sunrise azimuth (102.5°) that puts the camera's heading at about 77.5°, which is "looking east" with the sun where scene 1 has it. A 40° lens pitched about 4.6° up puts the horizon at 61 %; the sky stops are scene 1's CSS gradient read at those elevations.
- **Light states.** Dawn (sun 102.5°, 4.1° up), campaign (low warm light from 292°, 16° up: upper-left light, so relief never reads inverted on a north-up chart), night (moonless). Palettes blend on the CPU; each sunlit state has its own horizon-map channel.
- **Colour.** Shader colours are raw sRGB uniforms with no three colour management, so the chart matches scene 1's CSS palette exactly.
- **Depth.** No reversed depth (no gain with a 24-bit integer buffer); near and far planes follow the altitude each frame; overlays will be pulled slightly toward the camera.
- **Quality ladder.** Device pixel ratio 1.5, 1.25, 1.0, then 0.85 with optional effects off; steps down after sustained missed frames, up after long clean stretches, with a waiting time that doubles after a failed step up.
- **Scripts.** The data scripts are TypeScript run by Node 24's type stripping, with `--disable-warning=MODULE_TYPELESS_PACKAGE_JSON` rather than switching the package to ES modules under the approved scene 1 setup; `tsconfig.json` gained `allowImportingTsExtensions`.

### Next steps, in order
1. Re-run the research: the four history tracks with their fact-checks, three r186, troika 0.52.5 and period chart conventions (the saved workflow script above does all of it). Read the GSAP-skills notes.
2. `npx tsc --noEmit` and `npx biome check src/components/chart`; fix what they find.
3. Write `src/components/chart/index.ts` and `/lab/chart` (ScrollTrigger pin with Lenis, flight keyframes, `?p`, `?light`, `?quality`, `?debug`); get terrain and sky rendering and look at them before adding more.
4. Rivers and the Toulon–Cádiz route as ribbon lines, lettering, ship glyphs, the chart's debug readouts.
5. The design plan in decisions.md, reviewed against the brief and both avoid-lists; the Scene 2 section of history-notes.md.
6. Tests, screenshots and review rounds; the credits line and README; `binary` entries for `.webp`, `.woff` and `.bin` in `.gitattributes`; commit; the report in Russian.

## Scene 1

Legend: `[x]` done, `[~]` built but not yet reviewed or finished, `[ ]` not started.

## Session log
- Session 1 (24 October 2026): phases 0–2, the ship engine and a first pass of the whole scene (environment, choreography, text). It ran out of usage during phase 5 tuning; the retuning it left uncommitted was finished and committed as `bd0c849`. The research for `docs/history-notes.md` was done (three research tracks, one fact-checked), but the session stopped before the file was written, so it did not exist in the repository.
- Session 2 (25 October 2026): resumed from the repository and the previous session's research files. Wrote `docs/history-notes.md` (and kept the full research in `docs/research/`), ran a review round on screenshots and close-ups, fixed what was off, finished phases 5–7. Interrupted once when the editor closed; resumed from the repository again.
- Owner review (25 October 2026): the production preview with `?debug` runs at a steady 60 fps on the owner's laptop (Intel Arc integrated graphics). **Owner-verified.**
- Session 3 (25 October 2026): a short follow-up round on the owner's review: the real fonts, his answers on the rig and flags, 15 lower-deck ports, a backlog for later scenes, and public-repository hygiene. See "Follow-up round" below.

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
