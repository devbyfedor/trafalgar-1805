# Progress

Live checklist for scene 1. A later session picks up from here. The brief is `docs/scene-01-brief.md`; decisions and deviations are in `docs/decisions.md`.

Legend: `[x]` done, `[~]` built but not yet reviewed or finished, `[ ]` not started.

## Session log
- Session 1 (24 October 2026): phases 0–2, the ship engine and a first pass of the whole scene (environment, choreography, text). It ran out of usage during phase 5 tuning; the retuning it left uncommitted was finished and committed as `bd0c849`. The research for `docs/history-notes.md` was done (three research tracks, one fact-checked), but the session stopped before the file was written, so it did not exist in the repository.
- Session 2 (25 October 2026): resumed from the repository and the previous session's research files.

## 0. Setup
- [x] Node 24.15.0 and git 2.55 checked; git user configured
- [x] Versions confirmed with `npm view` (see decisions.md, "Versions")
- [x] Scaffolded with create-next-app 16.4.3 (TypeScript, Tailwind, Biome, App Router, `src/`, `@/*`, npm, no git)
- [x] Exact versions pinned; rest of the stack installed; Playwright Chromium installed
- [x] `.nvmrc`, `engines`, `.gitattributes` (LF), `.gitignore`, Biome config migrated to 2.5
- [x] git initialised on `main`; first commit

## 1. Research and design plan
- [~] Victory 1805 hull, rig, flags and the dawn setting researched (done in session 1); `docs/history-notes.md` still to be written from that research
- [x] GSAP skills and current docs (GSAP 3.15, Lenis 1.3, Next 16.4, Tailwind 4.3, Biome 2.5, Playwright 1.64): findings applied, see decisions.md
- [x] Design plan in `docs/decisions.md`: palette, type roles, layout sketch, layer stack, choreography table
- [ ] Plan reviewed against the brief and the avoid-list

## 2. Foundations
- [x] `src/lib/gsap.ts`, `SmoothScroll` (Lenis on the GSAP ticker, prioritised; keyboard guard)
- [x] `Experience` + scene registry; pinned scene with a debug progress readout (`?debug`)
- [x] Fallback branch (CSS switch, `gsap.matchMedia`), reduced-motion branch
- [x] Font variables and `docs/fonts.md`
- [x] Playwright smoke tests against the export (laptop, 1080p, phone, perf with video)

## 3. The ship
- [x] `ShipSpec` types, seeded variation, geometry functions
- [x] `VICTORY_1805` spec with the research figures (16/15/15 ports, 2015 paint survey colours, Steel 1794 spars, main truck 60.2 m, four topsail reef bands)
- [~] Hero rendering (hull, ports, chequer, copper, masts, sails, rigging, flags, details): built, needs a review round
- [x] Silhouette mode
- [x] `/lab/ship` (noindex) with detail, lighting, backdrop and close-up controls
- [~] Visual iteration rounds with screenshots and close-up crops (some rounds in session 1; final critique pending)

## 4. Environment (first pass built)
- [~] Sky (night and dawn gradients, stars, moon, procedural cloud strands), sun and glow
- [~] Sea strips (tiling SVG, two colour variants), front strip, sun reflection
- [~] Haze canvases (back and front), glitter canvas
- [~] Distant fleets (33 enemy in four groups, enemy lights, 3 British astern)

## 5. Choreography and text (first pass built)
- [~] Master scroll timeline (300vh pin), idle loops with pause logic (in view and tab visibility)
- [~] SplitText title, copy, scrim, scroll cue, chapter marker
- [x] Scene 2 placeholder

## 6. Polish and performance
- [ ] Profile; long tasks; element budgets
- [ ] Easing and timing
- [ ] Avoid-list walk-through

## 7. Verification and report
- [ ] Fallback shows a static composition with Victory (currently text on a gradient only)
- [ ] Playwright: SVG element count test; screenshot spec (`docs` project)
- [ ] `npm run check` green
- [ ] Screenshots in `docs/screenshots/scene-01/`, reviewed
- [ ] Scroll-through video in `test-results/`
- [ ] Docs current; everything committed
- [ ] Final report (Russian)
