# Trafalgar 1805

A scroll-driven, cinematic telling of the Battle of Trafalgar, 21 October 1805, as a sequence of scenes. Scene 1, "Dawn", is built: dawn breaks off Cape Trafalgar, the haze lifts, HMS Victory comes in under full sail, the title assembles, and the enemy fleet appears on the eastern horizon.

Desktop only: below 1024 px wide, or with a coarse pointer, visitors get a single static screen instead. With reduced motion the scene shows its hero frame without a pin.

Built with Next.js 16 (static export), React 19, GSAP 3.15 (ScrollTrigger, SplitText), Lenis 1.3, Tailwind CSS 4 and TypeScript 7. Biome lints and formats; Playwright tests the exported site. Type is Bodoni Moda (the title) and Baskervville, both under the SIL Open Font License and self-hosted.

## Running it

Node 24 or later (`.nvmrc` says 26) and npm.

```powershell
npm install
npx playwright install chromium   # once, for the tests
npm run dev                       # http://127.0.0.1:3000
```

Add `?debug` to the URL for an FPS readout, the scroll progress and ScrollTrigger markers. The ship lab is at `/lab/ship/` (not indexed): Victory large, with detail, lighting, backdrop and close-up controls; the query string sets them too, for example `/lab/ship/?focus=bow&panel=off`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server on 127.0.0.1 |
| `npm run build` | Static export to `out/` |
| `npm run preview` | Serves `out/` on http://127.0.0.1:4173 |
| `npm run lint` | `biome check` |
| `npm run lint:fix` | `biome check --write` |
| `npm run format` | `biome format --write` |
| `npm run typecheck` | Route types, then `tsc --noEmit` |
| `npm run test:e2e` | A fresh build, then Playwright against the served export (laptop 1280×720 at scale 1.5, 1920×1080, a phone, and a scroll-through with video and long-task recording) |
| `npm run check` | Lint, typecheck and the end-to-end tests |
| `npm run screenshots` | A fresh build, then the screenshots in `docs/screenshots/scene-01/` |
| `npm run deploy` | Build, then `wrangler deploy` to Cloudflare Workers (static assets, `wrangler.jsonc`) |

All scripts work in PowerShell. The test server binds to 127.0.0.1:4174, so a running preview doesn't get in the way. Run `npm run screenshots` before `npm run check` if you want to keep the scroll-through video: each Playwright run clears `test-results/`.

## Structure

```
src/
  app/                    layout, page, globals.css (Tailwind and theme tokens), lab/ship
  fonts/                  Bodoni Moda and Baskervville (OFL, licences beside them) and their next/font setup
  components/
    experience/           Experience (scenes in order, fallback), Fallback, DebugOverlay
    providers/            SmoothScroll: Lenis on the GSAP ticker
    ship/                 ShipOfTheLine, ShipSpec types, specs (Victory 1805, the fleets), geometry
    fx/                   haze and glitter canvases
  lib/                    gsap registration, media queries, seeded random, curves, debug channel
  scenes/
    registry.ts           the scenes in story order
    01-dawn/              Scene01Dawn, choreography, composition, content (the copy), layers/
    ChapterPlaceholder    stands in for scene 2
tests/e2e/                Playwright specs
docs/                     the brief, progress, decisions, history notes and research, fonts, screenshots
```

To add a scene, create `src/scenes/02-…/`, then replace the placeholder entry in `src/scenes/registry.ts`. The copy for scene 1 is in `src/scenes/01-dawn/content.ts`.

## Documentation

- `docs/scene-01-brief.md`: the brief for scene 1.
- `docs/progress.md`: the checklist and where work stands.
- `docs/decisions.md`: the design plan, decisions and deviations from the brief.
- `docs/history-notes.md`: the historical facts used, with sources and doubts; the full research is in `docs/research/`.
- `docs/fonts.md`: the typefaces, how they are wired with `next/font/local`, and how the split title follows them.
