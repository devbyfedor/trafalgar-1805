# Progress

Live checklist. A later session picks up from here. The briefs are `docs/scene-01-brief.md` and `docs/scene-02-brief.md`; decisions and deviations are in `docs/decisions.md`.

## Scene 2, Stage A: engine, data and look (sessions 4 to 6, 25–26 October 2026)

Stage A builds the chart engine, its data and its look, proven by one camera flight on `/lab/chart`, then stops for the owner's performance check on his GPU. Stage B (the full scene) waits for his approval.

**The owner's verdict before session 6.** He looked at `/lab/chart` in dev mode and loves it: the look, and the flight from Cádiz onward. Keep this direction; the fixes refine it, they don't change it.

**Session 7 (29 October 2026), in progress.** Resumed from a clean tree; lint, typecheck and the lettering check passed; nothing was left running.
- Research, two workflows in the background, writing only to this session's scratchpad (`C:\Users\User\AppData\Local\Temp\claude\d--dev-trafalgar-1805\ff8b9f97-a497-42fd-91fd-249d772d747a\scratchpad\research\`): (1) adjudication of every contested verdict in `v-h1a` … `v-h3b` (`a-*.md`), then a draft of each track's part of the "Scene 2" history notes (`draft-h1.md`, `draft-h2.md`, `draft-h3.md`); (2) the 1805 names (`h4-names.md`, `v-h4.md`, `a-h4.md`) and an independent check of `t4` (`v-t4.md`, `a-t4.md`). If the session stops, move what exists there into `docs/research/scene-02/` under the same rules.
- Done: the waterlining after Hall (no more target rings); see "Taken in session 7" below.

**Where it stopped (session 6, 26 October 2026, about 23:50).** The owner stopped the session deliberately, while the tests were being finished. Everything is committed and the working tree is clean. Nothing is left running: the research workflow, the dev server and the static server were stopped.
- **Done in session 6:** the ship glyphs; a clear rising shot (new haze curve); the Atlantic view now reaches the West Indies; end-to-end tests for `/lab/chart`; a regression check of scene 1 against its approved screenshots; a test that scene 1's `?debug` overlay is unchanged; the first `next build` of the chart code; the research notes moved into the repository (`docs/research/scene-02/`) with independent fact-checks of h1–h3 and the new period-chart notes (t4).
- **Stopped half-way:** the research workflow's last stages. Its fact-checks of h1–h3 finished (eight reports, saved). The adjudication of contested points and the 1805 names (h4) were still running and left nothing. The check of t4 never started.
- **Not started:** the "Scene 2" section of `history-notes.md`; the design plan in `decisions.md`; the look fixes (waterlining round islands, town marks, rivers, label sizes, the Cádiz label); the screenshots for the owner; the credits line and README notes.

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
   - [~] History (`h1-campaign.md`, `h2-boulogne-cadiz.md`, `h3-signals.md`, session 5): independently fact-checked in session 6 (`v-h1a.md` … `v-h3b.md`). The corrections that change the scene are summarised in `docs/research/scene-02/README.md`. **The adjudication of the "corrected" and "disputed" verdicts has not run.**
   - [ ] The 1805 names (h4): not written. The gazetteer stays provisional.
   - [~] Period chart conventions (`t4-chart-style.md`, session 6): written; its independent check has not run; not applied yet.
   - [ ] The "Scene 2" section of `history-notes.md`: not written.
2. [ ] Design plan in decisions.md, reviewed against the brief and both avoid-lists: **not written**. All decisions taken so far are listed below.
3. Data pipeline
   - [x] `npm run data:build`: built in session 4 (`b4cb148`) and revised in session 5 (`5ce1c8b`).
     - ETOPO 2022 overview (3′ cells, 72° W–20° E, 5–57° N).
     - Gulf of Cádiz tile (15″, 9.6–4.3° W, 34.9–37.8° N).
     - Surround tile (12′, 110° W–60° E, 10° S–72° N).
     - Natural Earth 5.1.2 land, minor islands and rivers.
     - 4.28 MB in `public/chart/`: overview 2.29 MB, Cádiz 0.97 MB, surround 0.72 MB, land grid 159 kB, rivers 142 kB, plus the manifest (version 3).
     - Raw downloads in git-ignored `data/raw/`.
     - `scripts/data/preview.ts` renders a CPU preview of the tiles.
4. Engine and the chart's look (`src/components/chart/`)
   - [x] Terrain, sea, isobaths, waterlining, coast, relief, shadows, contours, sky and haze, rivers, the Toulon–Cádiz route and the lettering (sessions 4 and 5).
   - [x] **Ship glyphs (session 6, `868f33d`)**: `glyphs/atlas.ts` and `glyphs/Glyphs.ts`; the lab's ships in `src/scenes/02-road/fleets.ts`. See the decisions below.
     - Positions are **provisional**. The fact-check found that the suggested anchorage centre (36.550 N, 6.300 W) sits beside the Las Puercas reef: move the anchored glyphs into open water north or north-west of it (`v-h2c.md`, H2-36d, H2-40a).
   - [x] **The rising shot is clear (session 6)**: the haze now clears quickly as the camera climbs out of the sea-level layer; the dawn frame and the higher views are as before.
   - [ ] Known look problems, still to fix (the owner's list first):
     - [x] waterlining round small islands reads as target rings (worst on the Atlantic view: the Azores, Madeira, the Canaries, the Cape Verde Islands, Bermuda, the Lesser Antilles; also the Channel Islands). Fixed in session 7;
     - no town marks beside place names; the "Cadiz" label sits inland, east of the bay, away from the town;
     - label sizes only roughly tuned; names fade out when the camera comes close (Cádiz at 30 km altitude shows none);
     - rivers look uniform and mechanical and can read as borders (northern France at p = 1);
     - in the Gulf close-up the relief beyond the Cádiz tile (inland Andalusia) is visibly coarser: frame around it;
     - at dawn light the low sun's cast shadows on the Andalusian lowlands read as dark blotches at close range (seen at 30 km altitude); look at it again when framing the Gulf.
   - Ideas for the target rings, not yet tried: make the waterlines' reach depend on the size of the nearest land, either from a field baked at build time (for each sea texel, the inscribed radius of the nearest landmass, from the coast transform's nearest-seed labels, in the free alpha channel of the tile WebP) or from a few samples inland along the distance field's gradient in the shader. Check `t4-chart-style.md` first for how engravers handled small islands.
5. [x] The `/lab/chart` flight (`4f45b56`, keys retuned in session 6).
   - SmoothScroll (Lenis on the shared ticker) and a pinned ScrollTrigger (`id: "chart-lab"`, scrub 0.6, 8 viewport heights).
   - One duration-1 timeline drives the camera's progress, the light (dawn to campaign) and the route's drawing, with labels `dawn`, `gulf`, `atlantic` and `channel`.
   - Rendering stops off screen and in hidden tabs.
   - Query parameters: `?p` (jumps there with the scrub settled), `?light`, `?route`, `?quality`, `?debug`, and since session 6 `?eye=lon,lat,km` with `?look=lon,lat` (and `?fov=`) to hold the camera on one place.
   - `?debug` shows the chart's draw calls (7 with the glyphs), triangles, textures, programs, quality level, render resolution, GPU memory (51 MB with the glyph atlas), altitude and exaggeration, plus fps and both progress values.
6. [x] Tests (session 6): `tests/e2e/chart.spec.ts` (projects `chart`, software, and `chart-gpu`), `tests/e2e/regression.spec.ts` with `tests/e2e/imageDiff.ts` (project `regression`), and the `?debug` overlay test in `tests/e2e/scene.spec.ts`. All are in `npm run test:e2e`.
7. [ ] Screenshots of the flight at 1280×720 (scale 1.5) and 1920×1080 into `docs/screenshots/scene-02/`: not taken. Only scratch renders exist.
8. [ ] Credits line, README notes, the full `npm run check`, commit, the report in Russian.

### Decisions taken so far (to move into decisions.md)

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
  - Lines every 2.4 CSS px out to 12 spacings, every other one beyond, out to a reach of 22 spacings (about 53 CSS px): the spacing grows only twofold across the band, as on Arrowsmith and Hall's plates. The sets still nest across octaves, so zooming never pops.
  - Strength falls as (1 − d/reach)^1.5; the inner lines are about twice the middle ones' weight; each line's weight and ink vary ±20 % and ±15 %, hashed from its distance from the coast so a line keeps its hand at every zoom.
  - A small island far from other land keeps only a faint ripple (18 % strength), as Hall drew a soft small patch round an isolated rock. "Far from other land" is the share of land in a window round the water that reaches past its own coast distance by 0.3 reach: along any coast the window always holds land (above 0.11 out to the reach), round a speck almost none, even in a strait between two coasts (Alborán). The window follows the water, not its nearest coast, so halos meet without seams and islets close inshore (Ushant, the Channel Islands) leave the coast's band whole.
  - The share of land comes from a land mask per tile, baked on the GPU at load at half resolution and mipmapped (about 3 MB), read once per terrain vertex.
  - Tried and dropped: the share of land in a fixed window (a speck in a narrow sea such as Alborán got a full target); the mean coast distance in a window (a cluster such as the Azores averages like a coast, and the overview's distance range of 356 km caps it at ocean scale).
  - Isobaths give way where the waterlining is strong (from 0.2 to 0.55 of the reach).

### Next steps, in order
1. **Finish the research.** The saved workflow can't be resumed in a new session.
   - Write a short one that:
     - adjudicates every "corrected" and "disputed" verdict in `docs/research/scene-02/v-*.md` against the primary source;
     - researches and checks the 1805 English names (h4, prompt in the session 6 script);
     - checks `t4-chart-style.md` independently.
   - Session 6's script, with every prompt: `C:\Users\User\.claude\projects\d--dev-trafalgar-1805\43fa8065-09be-424a-8d60-8feee16ab4db\workflows\scripts\scene2-factcheck-wf_30289020-9d0.js`. Agents write only to the scratchpad; move the results into `docs/research/scene-02/` under the same rules.
2. **Write the "Scene 2" section of `history-notes.md`** (facts, dates, sources, doubts, fleet sizes, signals), then apply it:
   - the route waypoints (`h1` table A, checked in `v-h1c.md`);
   - the 1805 names in the gazetteer (`h4`), re-running `npm run check:lettering`;
   - the glyph positions: the anchorage off Las Puercas into open water; the dawn positions near Cape Trafalgar.
   - The brief's caption for beat 4 says "a chain of frigates"; the sources give frigates inshore and ships of the line in the chain. Record it for Stage B's copy.
3. **Write the design plan in `decisions.md`** from the decisions listed here: palette, type roles, layer stack, how each feature is drawn, the camera rig, the quality ladder, the glyphs, the tests, and the `troika-three-utils` dependency. Review it against the brief and both avoid-lists, then commit.
4. **Fix the look from `t4`**:
   - waterlining round islands (target rings), first;
   - town marks;
   - the rivers and the isobaths' style;
   - label sizes and the Cádiz label's place;
   - the Gulf view kept within the Cádiz tile.
   - Look at the glyph colours against the owner's taste.
5. **Screenshots** of the flight at 1280×720 (scale 1.5) and 1920×1080 into `docs/screenshots/scene-02/`. Look at each one and fix what is off (`scripts/dev/shot.mjs` against `npm run dev` or `npm run preview`).
6. **Close Stage A.**
   - The credits line on the site and in README: "Relief: NOAA NCEI ETOPO 2022. Coastlines and rivers: Natural Earth."
   - README notes on `/lab/chart`, `npm run data:build`, `npm run check:lettering` and `scripts/dev/`.
   - The full `npm run check`, a commit, then the short report in Russian, and stop for the owner's GPU check.

## Scene 1

Legend: `[x]` done, `[~]` built but not yet reviewed or finished, `[ ]` not started.

## Session log
- Session 1 (24 October 2026): phases 0–2, the ship engine and a first pass of the whole scene (environment, choreography, text). It ran out of usage during phase 5 tuning; the retuning it left uncommitted was finished and committed as `bd0c849`. The research for `docs/history-notes.md` was done (three research tracks, one fact-checked), but the session stopped before the file was written, so it did not exist in the repository.
- Session 2 (25 October 2026): resumed from the repository and the previous session's research files. Wrote `docs/history-notes.md` (and kept the full research in `docs/research/`), ran a review round on screenshots and close-ups, fixed what was off, finished phases 5–7. Interrupted once when the editor closed; resumed from the repository again.
- Owner review (25 October 2026): the production preview with `?debug` runs at a steady 60 fps on the owner's laptop (Intel Arc integrated graphics). **Owner-verified.**
- Session 3 (25 October 2026): a short follow-up round on the owner's review: the real fonts, his answers on the rig and flags, 15 lower-deck ports, a backlog for later scenes, and public-repository hygiene. See "Follow-up round" below.
- Session 4 (25 October 2026): scene 2 Stage A begun. ERDDAP research, the data pipeline, and the engine core written but never run; stopped by the owner mid-step 4.
- Session 5 (25 October 2026): the engine type-checked, run and proven on `/lab/chart`; first-run defects fixed (12-bit coast distance, the surround tile, a flat-sea LOD with skirts, the haze model); restrained relief; rivers, the route, the scroll flight, the debug readouts and the lettering. The research was re-run in parallel and stopped with the session. Stopped deliberately by the owner after the lettering commit.
- Session 6 (26 October 2026): ship glyphs, a clear rising shot, the Atlantic view out to the West Indies, the chart lab's tests and scene 1's regression check, the first `next build` of the chart; the history notes fact-checked and all research moved into `docs/research/scene-02/`. Stopped deliberately by the owner while the research's last stages ran; see "Where it stopped" above.

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
