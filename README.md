# Trafalgar 1805

A scroll-driven, cinematic telling of the Battle of Trafalgar, 21 October 1805, as a sequence of scenes. Scene 1, "Dawn", is built: dawn breaks off Cape Trafalgar, the haze lifts, HMS Victory comes in under full sail, the title assembles, and the enemy fleet appears on the eastern horizon.

Scene 2, "The road to Trafalgar", is in progress. Its engine is built: a three-dimensional sea chart of the Atlantic and western Europe, drawn like a chart of 1805 (waterlined coasts, soundings, relief lit by a low sun, lettering lying on the chart, small ships of scene 1's drawing) and filmed by a camera driven by scroll. For now it flies on a lab page, `/lab/chart/`; the scene itself comes next.

Desktop only: below 1024 px wide, or with a coarse pointer, visitors get a single static screen instead. With reduced motion the scene shows its hero frame without a pin.

Built with Next.js 16 (static export), React 19, GSAP 3.15 (ScrollTrigger, SplitText), Lenis 1.3, Tailwind CSS 4 and TypeScript 7. The chart is three.js r186 (`WebGLRenderer`, WebGL 2, our own GLSL) with troika-three-text for the lettering; it loads as its own chunk. Biome lints and formats; Playwright tests the exported site. Type is Bodoni Moda (the title) and Baskervville, both under the SIL Open Font License and self-hosted.

Relief: NOAA NCEI ETOPO 2022. Coastlines and rivers: Natural Earth.

## Running it

Node 24 or later (`.nvmrc` says 26) and npm.

```powershell
npm install
npx playwright install chromium   # once, for the tests
npm run dev                       # http://127.0.0.1:3000
```

Add `?debug` to the URL for an FPS readout, the scroll progress and ScrollTrigger markers. The ship lab is at `/lab/ship/` (not indexed): Victory large, with detail, lighting, backdrop and close-up controls; the query string sets them too, for example `/lab/ship/?focus=bow&panel=off`.

### The chart lab

`/lab/chart/` (not indexed) flies the chart engine through one scroll-driven flight: low over the sea off Cape Trafalgar at dawn, looking east as scene 1 does; up and down onto the Gulf of Cádiz; back over the whole Atlantic; north to the Channel. To judge its speed, use the production build, not the dev server:

```powershell
npm run build
npm run preview                   # then open http://127.0.0.1:4173/lab/chart/?debug
```

`?debug` adds the chart's readouts to the FPS line: draw calls, triangles, textures, programs, the quality level and render resolution, GPU memory, the camera's altitude and the relief's exaggeration. Other query parameters: `?p=0.24` jumps to a point of the flight; `?light=dawn|campaign|night` and `?route=0..1` pin the light and how much of the route is drawn; `?quality=0` pins a quality level (0 is the top); `?eye=lon,lat,km&look=lon,lat` (and `?fov=`) hold the camera on one place.

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
| `npm run check:lettering` | Checks that every character of every name on the chart is in its font (troika would otherwise fetch a fallback font from a CDN) |
| `npm run test:e2e` | A fresh build, then Playwright against the served export (see "Tests") |
| `npm run check` | Lint, typecheck, the lettering check and the end-to-end tests |
| `npm run screenshots` | A fresh build, then the screenshots in `docs/screenshots/scene-01/` |
| `npm run data:download` | Downloads the chart's raw data into `data/raw/` (git-ignored), skipping what is already there |
| `npm run data:build` | Downloads, then builds the chart's assets in `public/chart/` |
| `npm run deploy` | Build, then `wrangler deploy` to Cloudflare Workers (static assets, `wrangler.jsonc`) |

All scripts work in PowerShell. The test server binds to 127.0.0.1:4174, so a running preview doesn't get in the way. Run `npm run screenshots` before `npm run check` if you want to keep the scroll-through video: each Playwright run clears `test-results/`.

### The chart's data

`npm run data:build` regenerates everything in `public/chart/` (about 4.3 MB, committed) from public-domain sources:

- relief and depths from NOAA NCEI ETOPO 2022, fetched through NOAA's ERDDAP griddap subsetting for each tile's region only (never the global grid): an overview of the whole stage (3′), the Gulf of Cádiz (15″) and a coarse surround so no view meets the map's edge (12′);
- land, minor islands and rivers from Natural Earth 5.1.2 (1:10 million).

Each tile is a lossless WebP holding a 12-bit height and a 12-bit coast distance, decoded on the GPU. `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/data/preview.ts <out-dir>` renders a CPU preview of the tiles. Everything is plain Node: no Python or GDAL.

### Development aids

`scripts/dev/` holds tools for working on the chart, not part of the site or the tests. Each needs a running server (`npm run dev`, or `npm run preview` with `BASE=http://127.0.0.1:4173`); `W`, `H` and `S` set the viewport and device scale (1280, 720 and 1.5 by default: the owner's laptop).

- `node scripts/dev/shot.mjs <dir> "p=0.24" "eye=-6.6,36.3,30&look=-6.3,36.55"`: a screenshot of `/lab/chart/` per query; `LABELS=1` also prints every visible name's size on screen.
- `node scripts/dev/sheet.mjs <out.png> <columns> <width> <images...>`: a contact sheet; `--crop` enlarges one region.
- `node scripts/dev/bench.mjs [step] [frames]`: times the chart's frames along the flight on this machine's GPU (median, 95th percentile and worst per point).

## Tests

Playwright runs against the served export, in Chromium:

- `laptop` (1280×720 at scale 1.5) and `desktop-1080`: scene 1, its fonts, reduced motion and the `?debug` overlay;
- `phone`: the fallback screen;
- `perf`: one scripted scroll-through with video and long-task recording;
- `chart` and `chart-gpu`: the chart lab's flight and back with no errors and same-origin requests only, and sampled frames of sea, land and sky; once in software WebGL (SwiftShader) and once on the machine's GPU;
- `regression`: scene 1 at p = 0, 0.5 and 0.75 against its approved screenshots.

## Structure

```
src/
  app/                    layout, page, globals.css (Tailwind and theme tokens), lab/ship, lab/chart
  fonts/                  Bodoni Moda and Baskervville (OFL, licences beside them) and their next/font setup
  components/
    experience/           Experience (scenes in order, fallback), Fallback, Credits, DebugOverlay
    providers/            SmoothScroll: Lenis on the GSAP ticker
    ship/                 ShipOfTheLine, ShipSpec types, specs (Victory 1805, the fleets), geometry
    chart/                the chart engine: engine (renderer, frame, quality ladder), terrain, sky,
                          lines (rivers, routes), lettering, glyphs, camera rig, light, data loaders
    fx/                   haze and glitter canvases
  lib/                    gsap registration, media queries, seeded random, curves, debug channel
  scenes/
    registry.ts           the scenes in story order
    01-dawn/              Scene01Dawn, choreography, composition, content (the copy), layers/
    02-road/              scene 2's data so far: the names on the chart, the routes, the ships
    ChapterPlaceholder    stands in for scene 2
public/
  chart/                  the chart's data (built by npm run data:build)
  fonts/3d/               WOFF fonts for the lettering on the chart (troika reads no WOFF2)
scripts/
  data/                   the chart's data pipeline
  dev/                    development aids (screenshots, contact sheets, frame timing)
  check-lettering.ts      the lettering check
tests/e2e/                Playwright specs
docs/                     the briefs, progress, decisions, history notes and research, fonts, screenshots
```

To add a scene, create `src/scenes/0n-…/`, then replace the placeholder entry in `src/scenes/registry.ts`. The copy for scene 1 is in `src/scenes/01-dawn/content.ts`.

## Documentation

- `docs/scene-01-brief.md` and `docs/scene-02-brief.md`: the briefs.
- `docs/progress.md`: the checklist and where work stands.
- `docs/decisions.md`: the design plans, decisions and deviations from the briefs.
- `docs/history-notes.md`: the historical facts used, with sources and doubts; the full research is in `docs/research/` (scene 2's in `docs/research/scene-02/`).
- `docs/fonts.md`: the typefaces, how they are wired with `next/font/local`, and how the split title follows them.
- `docs/backlog.md`: work deferred to later scenes (studding sails and hoisting the ensign in the approach scene, port interiors).
