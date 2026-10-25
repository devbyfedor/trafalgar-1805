# Progress

Live checklist. A later session picks up from here. The briefs are `docs/scene-01-brief.md` and `docs/scene-02-brief.md`; decisions and deviations are in `docs/decisions.md`.

## Scene 2, Stage A: engine, data and look (session 4, 25 October 2026)

Stage A builds the chart engine, its data and its look, proven by one camera flight on `/lab/chart`, then stops for the owner's performance check on his GPU. Stage B (the full scene) waits for his approval.

1. Research
   - [~] History of the campaign, fleet sizes, signals, 1805 names (research workflow running; fact-checked track by track)
   - [~] three r186, troika-three-text 0.52.5, the GSAP skills, period chart conventions
   - [x] ERDDAP subsetting: `ETOPO_2022_v1_15s` on coastwatch.pfeg.noaa.gov (the 30″ and 60″ ids are not served there); index-based requests with a stride, in latitude bands
2. [ ] Design plan in decisions.md, reviewed against the brief and both avoid-lists
3. Data pipeline
   - [x] `npm run data:build`: ETOPO 2022 overview (3′, Caribbean to the upper Danube) and Gulf of Cádiz tile (15″), Natural Earth land, islands and rivers; 3.0 MB in `public/chart/`
4. [ ] Engine and the chart's look (sea, isobaths, waterlining, coast, relief, contours, light, lettering, sky and haze, ship glyphs, one route)
5. [ ] `/lab/chart` flight with `?debug` readouts
6. [ ] Tests (lab page: no console errors, canvas renders, same-origin; scene 1 unchanged)
7. [ ] Screenshots of the flight at 1280×720 (scale 1.5) and 1920×1080, reviewed and fixed
8. [ ] Commit, progress, report in Russian

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
