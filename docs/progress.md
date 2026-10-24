# Progress

Live checklist for the scene 1 session. A later session picks up from here. The brief is `docs/scene-01-brief.md`; decisions and deviations are in `docs/decisions.md`.

Legend: `[x]` done, `[~]` in progress, `[ ]` not started.

## 0. Setup
- [x] Node 24.15.0 and git 2.55 checked; git user configured
- [x] Versions confirmed with `npm view` (see decisions.md, "Versions")
- [x] Scaffolded with create-next-app 16.4.3 (TypeScript, Tailwind, Biome, App Router, `src/`, `@/*`, npm, no git)
- [x] Exact versions pinned; rest of the stack installed; Playwright Chromium installed
- [x] `.nvmrc`, `engines`, `.gitattributes` (LF), `.gitignore`, Biome config migrated to 2.5
- [x] git initialised on `main`; first commit

## 1. Research and design plan
- [~] Victory 1805, the rig, flags and the dawn setting researched; `docs/history-notes.md` (setting done; hull and rig in progress)
- [x] GSAP skills and current docs (GSAP 3.15, Lenis 1.3, Next 16.4, Tailwind 4.3, Biome 2.5, Playwright 1.64): findings applied, see decisions.md
- [x] Design plan in `docs/decisions.md`: palette, type roles, layout sketch, layer stack, choreography table
- [ ] Plan reviewed against the brief and the avoid-list

## 2. Foundations
- [x] `src/lib/gsap.ts`, `SmoothScroll` (Lenis on the GSAP ticker, prioritised; keyboard guard)
- [x] `Experience` + scene registry; pinned empty scene with a debug progress readout (`?debug`)
- [x] Fallback branch (CSS switch, `gsap.matchMedia`), reduced-motion branch
- [x] Font variables and `docs/fonts.md`
- [x] Playwright smoke tests against the export (laptop, 1080p, phone, perf with video)

## 3. The ship
- [x] `ShipSpec` types, seeded variation, geometry functions (first pass)
- [~] `VICTORY_1805` spec (draft numbers; to be replaced by the verified research figures)
- [~] Hero rendering (hull, ports, chequer, copper, masts, sails, rigging, flags, details)
- [x] Silhouette mode (first pass)
- [x] `/lab/ship` (noindex) with detail, lighting, backdrop and close-up controls
- [ ] Visual iteration rounds with screenshots and close-up crops

## 4. Environment
- [ ] Sky (two gradient layers, stars), sun and glow
- [ ] Sea strips (tiling SVG, two colour variants), front strip
- [ ] Haze canvases, glitter
- [ ] Distant fleets (33 enemy, 2 or 3 British astern)

## 5. Choreography and text
- [ ] Master scroll timeline (300vh pin), idle loops with pause logic
- [ ] SplitText title, copy, scrim, scroll cue, chapter marker
- [ ] Scene 2 placeholder

## 6. Polish and performance
- [ ] Profile; long tasks; element budgets
- [ ] Easing and timing
- [ ] Avoid-list walk-through

## 7. Verification and report
- [ ] `npm run check` green
- [ ] Screenshots in `docs/screenshots/scene-01/`, reviewed
- [ ] Scroll-through video in `test-results/`
- [ ] Docs current; everything committed
- [ ] Final report (Russian)
