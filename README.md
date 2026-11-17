# Trafalgar 1805

A scroll-driven, cinematic telling of the Battle of Trafalgar, 21 October 1805, as a sequence of scenes. Two are built:

- **I. Dawn.** Dawn breaks off Cape Trafalgar, the haze lifts, HMS Victory comes in under full sail, the title assembles, and the enemy fleet appears on the eastern horizon.
- **II. The road to Trafalgar.** A three-dimensional sea chart in the manner of 1805 (waterlined coasts, soundings, relief under a low sun, lettering lying on the chart, small ships), filmed by a camera the scroll drives, follows the campaign in six beats: up from the battle's sea to Europe; Boulogne, where the invasion army waits, with an interlude that dives into a painted view of the flotilla from the sea at dusk; the chase to the West Indies and back; the action off Finisterre, in its smoke; Cádiz, where the signal runs down the chain of frigates on 19 October; and the night of 20 to 21 October, the fleets closing with their lanterns lit, to the dawn of the battle.

They are published as part one, closed by a card: "To be continued", the battle itself coming next.

Desktop only: below 1024 px wide, or with a coarse pointer, visitors get a single static screen instead. With reduced motion, scene 1 shows its hero frame without a pin and scene 2 shows one still per beat with its caption; where WebGL is unavailable, or its context is lost for good, scene 2's stills crossfade in the pinned stage under the captions.

Built with Next.js 16 (static export), React 19, GSAP 3.15 (ScrollTrigger, SplitText), Lenis 1.3, Tailwind CSS 4 and TypeScript 7. The chart is three.js r186 (`WebGLRenderer`, WebGL 2, our own GLSL) with troika-three-text for the lettering; it loads as its own chunk. One clock, `gsap.ticker`, drives Lenis, ScrollTrigger and every render loop. Biome lints and formats; Playwright tests the exported site. Everything loads from the site's own origin. Type is Bodoni Moda (the title) and Baskervville, both under the SIL Open Font License and self-hosted.

The data, type and software it is built with are credited under [Credits](#credits); the project's own code, text and images are not licensed for reuse ([Licence](#licence)).

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

`?debug` adds the readouts: FPS, the scroll progress, the chart's draw calls, triangles, quality level and GPU memory, and ScrollTrigger's markers. The lab pages are development tools, not part of the published site: they exist under `npm run dev` and in `npm run build:labs`, never in `npm run build`. They are `/lab/chart/` (the chart engine on one flight; `?p=`, `?light=`, `?eye=…&look=…` and more, in `src/app/lab/chart/`), `/lab/sea/` (Boulogne's painting; `?phase=hold&t=0.38`), `/lab/craft/` (the flotilla's craft) and `/lab/ship/` (Victory large).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server on 127.0.0.1:3000 |
| `npm run build` | The production build, the site that is deployed: static export to `out/`, without the lab pages, stamped with its commit (`.next/build-stamp.json`, read by `served.mjs`) |
| `npm run build:labs` | The same with the lab pages (`TRAFALGAR_LABS=1`; `page.lab.tsx` is a page extension only then), for the tests and scripts that drive them |
| `npm run preview` | Serves `out/` on http://127.0.0.1:4173 |
| `npm run lint`, `lint:fix`, `format` | Biome |
| `npm run typecheck` | Route types, then `tsc --noEmit` |
| `npm run check:lettering` | Every character on the chart is in its font (troika would otherwise fetch a fallback from a CDN) |
| `npm run test:e2e` | The production build and the home page's tests, then a build with the labs and the lab's tests (`scripts/dev/test-e2e.mjs`) |
| `npm run notices`, `check:notices` | Writes `public/third-party-notices.txt` from the installed packages; checks it is up to date |
| `npm run check` | Lint, typecheck, the lettering check, the notices check and the end-to-end tests |
| `npm run screenshots` | Scene 1's approved frames in `docs/screenshots/scene-01/`, which the regression tests hold it to: run only to approve a new look |
| `npm run screenshots:chart` | The chart lab's frames in `docs/screenshots/scene-02/` (on `build:labs`, like `screenshots` and `stills`) |
| `npm run stills` | A fresh build, then scene 2's stills in `public/stills/scene-02/`. To re-render only the chart's six: `npx playwright test --project=stills -g "one still per beat"` after a build |
| `npm run data:download`, `data:build` | The chart's raw data into `data/raw/` (git-ignored), then its assets in `public/chart/` |
| `npm run deploy` | The production build; `scripts/deploy-check.mjs` (refuses a build whose link preview is not on an https address, one with the lab pages, or a stale notices file); then `wrangler deploy` to Cloudflare Workers: `out/` as static assets on workers.dev, configured in `wrangler.jsonc` (needs `wrangler login` first, and `SITE_URL`: see below) |

**The site's address.** The link preview (`og:image`, `og:url`) and the canonical link need the public address, read at build time from `SITE_URL` (`src/lib/site.ts`): put the line `SITE_URL=https://<the site's address>` in a file `.env.production.local` in the project folder (git-ignored; Next.js reads it during `next build`), or set it in the environment. Without it a build points at the local preview, and `npm run deploy` stops before uploading.

All scripts work in PowerShell. The test server binds to 127.0.0.1:4174, so a running preview doesn't get in the way.

**Before measuring anything**, make sure the server answers with the build you mean: `node scripts/dev/served.mjs --free <port>` before starting one; `npm run build` in the folder you measure (`npm run build:labs` when it is a lab page); serve its `out/` with `node_modules/.bin/serve` (not `npx serve`); then `node scripts/dev/served.mjs <port> <folder>` must print OK (that build, of the expected commit, no source changed since).

### The chart's data

`npm run data:build` regenerates `public/chart/` (about 4.7 MB, committed) from public-domain sources, in plain Node: relief and depths from ETOPO 2022 fetched through NOAA's ERDDAP for each tile's region only (an overview, a coarse surround, and detail tiles at 15″ for the Gulf of Cádiz and the Channel by Boulogne), land and rivers from Natural Earth 5.1.2. Each tile is a lossless WebP holding a 12-bit height and a 12-bit coast distance, decoded on the GPU.

### Development aids

`scripts/dev/` holds tools for working on the scenes, not part of the site or the tests. Most need a server (`npm run dev`, or the preview with `BASE=http://127.0.0.1:4173`, built with `npm run build:labs` for the lab pages); `W`, `H` and `S` set the viewport and device scale (1280, 720 and 1.5 by default: the owner's laptop). Among them: `devices.mjs` (the site on phones, tablets and small or touch screens, `ENGINE=webkit` for Safari's engine: what each gets, and no black screen, crash, foreign request or stuck page), `og-image.mjs` (the link preview from scene 1's hero frame, `public/link-preview.jpg`), `icons.mjs` (the favicon and the Apple touch icon from Victory's silhouette in the ship lab), `road.mjs` (screenshots of scene 2 at any p or interlude point), `sheet.mjs` (contact sheets and crops), `contrast.mjs` (the text's contrast over the scene, `NOWEBGL=1` over the stills), `road-bench.mjs` (scene 2's frames timed on the GPU), `look-diff.mjs` (frames against reference frames), and the checks for ships, labels and effects (`glyph-clash.mjs`, `glyph-motion.mjs`, `label-flicker.mjs`, `signals-clear.mjs`, `lights-clear.mjs` and others). Each file's head says how to use it.

## Tests

Playwright, in Chromium, against the served export; `npm run test:e2e` runs the home page's projects on the production build and the chart lab's on a build with the labs:

- `laptop` (1280×720 at 1.5) and `desktop-1080`: scene 1, its fonts, reduced motion and the `?debug` overlay;
- `phone`: the fallback screen, loading nothing of scene 2;
- `perf`: a scripted scroll-through with video and long tasks recorded;
- `chart` and `chart-gpu`: the chart lab's flight in software WebGL and on the GPU, same-origin requests only, a lost context coming back;
- `road`: scene 2 on the home page (its beats, its pin, Boulogne's interlude, the page's width with classic scroll bars, the stills without WebGL);
- `regression`: scene 1 at p = 0, 0.5 and 0.75 against its approved frames;
- `road-frames` and `chart-frames` (the two halves of `chart-frames.spec.ts`), each after the others of its build, so nothing else uses the GPU: scene 2's frames through Boulogne's interlude (on the production build) and the chart lab's along its flight (on the build with the labs), timed on the GPU (each under 11 ms at the 95th percentile on the owner's Intel Arc graphics), and no long tasks while scrolling with the wheel. Alone: `npx playwright test --project=road-frames --no-deps` after `npm run build`, `--project=chart-frames --no-deps` after `npm run build:labs`.

## Structure

```
src/
  app/                    layout, page, not-found (the 404 page), favicon.ico and apple-icon.png,
                          globals.css, lab/ (chart, sea, craft, ship: page.lab.tsx,
                          in development and build:labs only)
  fonts/                  Bodoni Moda and Baskervville (OFL) and their next/font setup
  components/
    experience/           Experience (scenes in order, fallback), Fallback, Credits, DebugOverlay
    providers/            SmoothScroll: Lenis on the GSAP ticker
    ship/                 the ship of the line: specs, geometry, the fleets
    chart/                the chart engine: engine, terrain, sky, light, lines, lettering,
                          glyphs (the ships), marks, fx (smoke, lanterns, signal flags), camera
    fx/                   haze and glitter canvases
  lib/                    gsap registration, media queries, seeded random, curves, debug channel,
                          site (name, description, address, link preview)
  scenes/
    registry.ts           the scenes in story order
    handoff.ts            scene 1's pin overlapping scene 2's
    01-dawn/              scene 1
    02-road/              scene 2: beats, camera, director, fleets and movements, the relay and
                          its signals, smoke, lanterns, the march to Ulm, content (the copy),
                          layers/ (text, stills), boulogne-sea/ (the interlude's painting)
    ToBeContinued         the closing card after the last scene
public/
  chart/                  the chart's data (npm run data:build)
  stills/scene-02/        scene 2's stills (npm run stills)
  fonts/3d/               WOFF fonts for the lettering on the chart
  link-preview.jpg        the link preview (scripts/dev/og-image.mjs)
  third-party-notices.txt the credits and every notice and licence (npm run notices)
scripts/
  data/                   the chart's data pipeline
  dev/                    development aids
  check-lettering.ts      the lettering check
  notices.mjs             the notices file
  deploy-check.mjs        what npm run deploy checks before uploading
tests/e2e/                Playwright specs
docs/                     briefs, progress, decisions, history notes and research, fonts, screenshots
```

To add a scene, create `src/scenes/0n-…/`, then add its entry after scene 2's in `src/scenes/registry.ts`; the closing card follows the last scene.

## Documentation

- `docs/scene-01-brief.md`, `docs/scene-02-brief.md` and `docs/scene-02-boulogne-brief.md`: the briefs.
- `docs/progress.md`: where work stands and what comes next.
- `docs/decisions.md`: design and technical decisions and deviations from the briefs.
- `docs/history-notes.md`: the historical facts used, with sources and doubts; research notes in `docs/research/`.
- `docs/fonts.md`: the typefaces and how they are wired.
- `docs/backlog.md`: work deferred to later scenes or to before publication.

## Credits

### Data

- **Relief and depths:** NOAA National Centers for Environmental Information (2022), *ETOPO 2022 15 Arc-Second Global Relief Model*, https://doi.org/10.25921/fd45-gt74, described in MacFerrin et al. (2025), *Earth System Science Data* 17, 1835–1849, https://doi.org/10.5194/essd-17-1835-2025. Subset through NOAA's CoastWatch ERDDAP (dataset `ETOPO_2022_v1_15s`). A US government work, dedicated to the public domain worldwide under CC0 1.0. Not for navigation.
- **ETOPO 2022's own sources,** credited as their publishers ask. Land heights in the chart's region come from FABDEM v1.0 (Hawker et al. 2022, *Environmental Research Letters*, https://doi.org/10.1088/1748-9326/ac4d4f), built on the Copernicus DEM: produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved. The organisations in charge of the Copernicus programme by law or by delegation do not incur any liability for any use of the Copernicus WorldDEM-30. Depths come from sources among them the GEBCO_2022 Grid (GEBCO Compilation Group 2022, https://doi.org/10.5285/e0f0bb80-ab44-2739-e053-6c86abc0289c) and GMRT (Ryan et al. 2009, https://doi.org/10.1029/2008GC002332, CC BY 4.0).
- **Land, coastlines and rivers:** Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com. Version 5.1.2: `ne_10m_land`, `ne_10m_minor_islands`, `ne_10m_rivers_lake_centerlines` and `ne_10m_rivers_europe` (whose European rivers derive from the European Commission JRC's CCM 2.1 database). Public domain.
- The chart's tiles in `public/chart/` are derived from these datasets and carry their sources' terms, not this project's reservation of rights below.
- Consulted for the history notes only, nothing of them shipped: OpenStreetMap (© OpenStreetMap contributors, ODbL), EMODnet Bathymetry, TICON-3 tidal constants (Hart-Davis, Dettmering and Seitz 2022, CC BY 4.0) and NOAA's historical magnetic declination. The notes in `docs/` cite every source they rely on.
- The site's own credits, after the scenes, name ETOPO 2022 with its land heights (FABDEM on the Copernicus DEM, with its copyright holders) and depths (GEBCO, GMRT), Natural Earth, and the two typefaces with ANRT's mention, and link to the notices file below. No agency or publisher named here endorses this project.

### Type

- **Bodoni Moda** by Owen Earl (indestructible type*). Copyright 2020 The Bodoni Moda Project Authors (https://github.com/indestructible-type/Bodoni).
- **Baskervville** by ANRT (Atelier National de Recherche typographique), Nancy: Thomas Huot-Marchand (director) with Alexis Faudot, Rémi Forte, Morgane Pierson, Rafael Ribas, Tanguy Vanlæys and Rosalie Wagner. Copyright 2018 The Baskervville Project Authors (https://github.com/anrt-type/ANRT-Baskervville).

Both under the SIL Open Font License 1.1 (https://openfontlicense.org), converted from Google Fonts' files to WOFF2 and WOFF without other changes; each file keeps its copyright and licence in its own metadata, and the licence texts are in `src/fonts/` and `public/fonts/3d/`.

### Software

The site's JavaScript and CSS include:

- Next.js with its Turbopack runtime, © Vercel, Inc., MIT; with React, React DOM, Scheduler and the React Server Components client, © Meta Platforms, Inc. and affiliates, MIT; `@swc/helpers`, © SWC contributors, Apache-2.0; the `process` shim, © Roman Shtylman, MIT; and its polyfill for old browsers: core-js (© Denis Pushkarev), whatwg-fetch (© GitHub, Inc.) and object-assign (© Sindre Sorhus), MIT.
- three.js, © three.js authors, MIT.
- troika-three-text, troika-three-utils and troika-worker-utils, © ProtectWise and Jason Johnston, MIT; bidi-js and webgl-sdf-generator, © Jason Johnston, MIT; and, inside troika-three-text, Typr.ts (© Photopea, MIT), @unicode-font-resolver/client (© Jason Johnston, MIT), fflate (© Arjun Barrett, MIT) and woff2otf.js (© Steffen Hanikel, Apache-2.0).
- Tailwind CSS's base styles, © Tailwind Labs, Inc., MIT.
- Lenis, © darkroom.engineering, MIT.
- GSAP 3.15 with CSSPlugin, Observer, ScrollTrigger and SplitText, and `@gsap/react`: Copyright 2008–2026 GreenSock (Webflow), all rights reserved; used under the GSAP Standard "No Charge" License, https://gsap.com/standard-license.

The build strips every licence comment from the minified files, so the site serves the notices itself: `public/third-party-notices.txt` (at `/third-party-notices.txt`, linked from the credits) has each package's version, notice and licence text, GSAP's notices, the Apache License 2.0, and the data and type credits above. `npm run notices` regenerates it from `node_modules`; `npm run check:notices` (part of `npm run check`) fails when it is stale.

## Licence

No licence is granted for this project's own code, text and images: © 2026 the project's author, all rights reserved. The data, type and software credited above stay under their own licences, and the chart's tiles keep their sources' terms. The research notes in `docs/` paraphrase their sources in our own words and link to them; verbatim quotations are short, and nearly all come from period sources in the public domain.
