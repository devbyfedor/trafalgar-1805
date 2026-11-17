# Trafalgar 1805

A scroll-driven, cinematic telling of the Battle of Trafalgar, 21 October 1805, as a sequence of scenes. Two are built:

- **I. Dawn.** Dawn breaks off Cape Trafalgar, the haze lifts, HMS Victory comes in under full sail, the title assembles, and the enemy fleet appears on the eastern horizon.
- **II. The road to Trafalgar.** A three-dimensional sea chart in the manner of 1805 (waterlined coasts, soundings, relief under a low sun, lettering lying on the chart, small ships), filmed by a camera the scroll drives, follows the campaign in six beats: up from the battle's sea to Europe; Boulogne, where the invasion army waits, with an interlude that dives into a painted view of the flotilla from the sea at dusk; the chase to the West Indies and back; the action off Finisterre, in its smoke; Cádiz, where the signal runs down the chain of frigates on 19 October; and the night of 20 to 21 October, the fleets closing with their lanterns lit, to the dawn of the battle.

A placeholder stands for chapter III.

Desktop only: below 1024 px wide, or with a coarse pointer, visitors get a single static screen instead. With reduced motion, scene 1 shows its hero frame without a pin and scene 2 shows one still per beat with its caption; where WebGL is unavailable, or its context is lost for good, scene 2's stills crossfade in the pinned stage under the captions.

Built with Next.js 16 (static export), React 19, GSAP 3.15 (ScrollTrigger, SplitText), Lenis 1.3, Tailwind CSS 4 and TypeScript 7. The chart is three.js r186 (`WebGLRenderer`, WebGL 2, our own GLSL) with troika-three-text for the lettering; it loads as its own chunk. One clock, `gsap.ticker`, drives Lenis, ScrollTrigger and every render loop. Biome lints and formats; Playwright tests the exported site. Everything loads from the site's own origin. Type is Bodoni Moda (the title) and Baskervville, both under the SIL Open Font License and self-hosted.

Relief: NOAA NCEI ETOPO 2022. Coastlines and rivers: Natural Earth.

## Running it

Node 24 or later (`.nvmrc` says 26) and npm.

```powershell
npm install
npx playwright install chromium   # once, for the tests
npm run dev                       # http://127.0.0.1:3000
```

To judge the motion, use the production build, not the dev server:

```powershell
npm run build
npm run preview                   # then open http://127.0.0.1:4173/?debug
```

`?debug` adds the readouts: FPS, the scroll progress, the chart's draw calls, triangles, quality level and GPU memory, and ScrollTrigger's markers. The lab pages (not indexed): `/lab/chart/` (the chart engine on one flight; `?p=`, `?light=`, `?eye=…&look=…` and more, in `src/app/lab/chart/`), `/lab/sea/` (Boulogne's painting; `?phase=hold&t=0.38`), `/lab/craft/` (the flotilla's craft) and `/lab/ship/` (Victory large).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server on 127.0.0.1:3000 |
| `npm run build` | Static export to `out/`, stamped with its commit (`.next/build-stamp.json`, read by `served.mjs`) |
| `npm run preview` | Serves `out/` on http://127.0.0.1:4173 |
| `npm run lint`, `lint:fix`, `format` | Biome |
| `npm run typecheck` | Route types, then `tsc --noEmit` |
| `npm run check:lettering` | Every character on the chart is in its font (troika would otherwise fetch a fallback from a CDN) |
| `npm run test:e2e` | A fresh build, then the Playwright projects below |
| `npm run check` | Lint, typecheck, the lettering check and the end-to-end tests |
| `npm run screenshots` | Scene 1's approved frames in `docs/screenshots/scene-01/`, which the regression tests hold it to: run only to approve a new look |
| `npm run screenshots:chart` | The chart lab's frames in `docs/screenshots/scene-02/` |
| `npm run stills` | A fresh build, then scene 2's stills in `public/stills/scene-02/`. To re-render only the chart's six: `npx playwright test --project=stills -g "one still per beat"` after a build |
| `npm run data:download`, `data:build` | The chart's raw data into `data/raw/` (git-ignored), then its assets in `public/chart/` |
| `npm run deploy` | Build, then `wrangler deploy` to Cloudflare Workers (static assets) |

All scripts work in PowerShell. The test server binds to 127.0.0.1:4174, so a running preview doesn't get in the way.

**Before measuring anything**, make sure the server answers with the build you mean: `node scripts/dev/served.mjs --free <port>` before starting one; `npm run build` in the folder you measure; serve its `out/` with `node_modules/.bin/serve` (not `npx serve`); then `node scripts/dev/served.mjs <port> <folder>` must print OK (that build, of the expected commit, no source changed since).

### The chart's data

`npm run data:build` regenerates `public/chart/` (about 4.7 MB, committed) from public-domain sources, in plain Node: relief and depths from ETOPO 2022 fetched through NOAA's ERDDAP for each tile's region only (an overview, a coarse surround, and detail tiles at 15″ for the Gulf of Cádiz and the Channel by Boulogne), land and rivers from Natural Earth 5.1.2. Each tile is a lossless WebP holding a 12-bit height and a 12-bit coast distance, decoded on the GPU.

### Development aids

`scripts/dev/` holds tools for working on the scenes, not part of the site or the tests. Most need a server (`npm run dev`, or the preview with `BASE=http://127.0.0.1:4173`); `W`, `H` and `S` set the viewport and device scale (1280, 720 and 1.5 by default: the owner's laptop). Among them: `road.mjs` (screenshots of scene 2 at any p or interlude point), `sheet.mjs` (contact sheets and crops), `contrast.mjs` (the text's contrast over the scene, `NOWEBGL=1` over the stills), `road-bench.mjs` (scene 2's frames timed on the GPU), `look-diff.mjs` (frames against reference frames), and the checks for ships, labels and effects (`glyph-clash.mjs`, `glyph-motion.mjs`, `label-flicker.mjs`, `signals-clear.mjs`, `lights-clear.mjs` and others). Each file's head says how to use it.

## Tests

Playwright, in Chromium, against the served export:

- `laptop` (1280×720 at 1.5) and `desktop-1080`: scene 1, its fonts, reduced motion and the `?debug` overlay;
- `phone`: the fallback screen, loading nothing of scene 2;
- `perf`: a scripted scroll-through with video and long tasks recorded;
- `chart` and `chart-gpu`: the chart lab's flight in software WebGL and on the GPU, same-origin requests only, a lost context coming back;
- `road`: scene 2 on the home page (its beats, its pin, Boulogne's interlude, the page's width with classic scroll bars, the stills without WebGL);
- `regression`: scene 1 at p = 0, 0.5 and 0.75 against its approved frames;
- `chart-frames`, last, so nothing else uses the GPU: the chart lab's and scene 2's frames timed on the GPU (each under 11 ms at the 95th percentile on the owner's Intel Arc graphics) and no long tasks while scrolling with the wheel. Alone: `npx playwright test --project=chart-frames --no-deps` after a build.

## Structure

```
src/
  app/                    layout, page, globals.css, lab/ (chart, sea, craft, ship)
  fonts/                  Bodoni Moda and Baskervville (OFL) and their next/font setup
  components/
    experience/           Experience (scenes in order, fallback), Fallback, Credits, DebugOverlay
    providers/            SmoothScroll: Lenis on the GSAP ticker
    ship/                 the ship of the line: specs, geometry, the fleets
    chart/                the chart engine: engine, terrain, sky, light, lines, lettering,
                          glyphs (the ships), marks, fx (smoke, lanterns, signal flags), camera
    fx/                   haze and glitter canvases
  lib/                    gsap registration, media queries, seeded random, curves, debug channel
  scenes/
    registry.ts           the scenes in story order
    handoff.ts            scene 1's pin overlapping scene 2's
    01-dawn/              scene 1
    02-road/              scene 2: beats, camera, director, fleets and movements, the relay and
                          its signals, smoke, lanterns, the march to Ulm, content (the copy),
                          layers/ (text, stills), boulogne-sea/ (the interlude's painting)
    ChapterPlaceholder    stands in for chapter III
public/
  chart/                  the chart's data (npm run data:build)
  stills/scene-02/        scene 2's stills (npm run stills)
  fonts/3d/               WOFF fonts for the lettering on the chart
scripts/
  data/                   the chart's data pipeline
  dev/                    development aids
  check-lettering.ts      the lettering check
tests/e2e/                Playwright specs
docs/                     briefs, progress, decisions, history notes and research, fonts, screenshots
```

To add a scene, create `src/scenes/0n-…/`, then replace the placeholder entry in `src/scenes/registry.ts`.

## Documentation

- `docs/scene-01-brief.md`, `docs/scene-02-brief.md` and `docs/scene-02-boulogne-brief.md`: the briefs.
- `docs/progress.md`: where work stands and what comes next.
- `docs/decisions.md`: design and technical decisions and deviations from the briefs.
- `docs/history-notes.md`: the historical facts used, with sources and doubts; research notes in `docs/research/`.
- `docs/fonts.md`: the typefaces and how they are wired.
- `docs/backlog.md`: work deferred to later scenes or to before publication.
