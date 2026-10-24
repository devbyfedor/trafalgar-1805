# Decisions

Decisions, deviations from the brief and disagreements with it, newest sections last. The brief (`docs/scene-01-brief.md`) is never edited; this file records what changed and why.

## Setup (session 1, 24 October 2026)

### Versions
Checked with `npm view` on 24 October 2026. All pinned exactly in `package.json`.

| Package | Brief | Installed | Note |
| --- | --- | --- | --- |
| next | 16.4.2 | 16.4.3 | Newer patch of the same minor, as the brief asks |
| react, react-dom | 19.3.1 | 19.3.1 | |
| gsap | 3.15.0 | 3.15.0 | |
| @gsap/react | 2.1.2 | 2.1.2 | |
| lenis | 1.3.27 | 1.3.27 | |
| typescript | 7.0.2 | 7.0.2 | |
| tailwindcss, @tailwindcss/postcss | 4.3.3 | 4.3.3 | |
| @biomejs/biome | 2.5.15 | 2.5.15 | 2.6.2 exists but is a different minor; stayed on 2.5 |
| @playwright/test | 1.64.x | 1.64.1 | |
| serve | latest | 14.2.6 | |
| wrangler | 4.x | 4.152.0 | |
| @types/react, @types/react-dom | latest 19.x | 19.3.0 | |
| @types/node | latest major ≤ Node major | 24.19.2 | The machine runs Node 24.15.0, so the 24.x types |

- Node: the machine has Node 24.15.0, which meets the minimum (24.x). `.nvmrc` says `26` as the brief asks (Node 26 becomes Active LTS on 28 October 2026); `engines` accepts `>=24`.
- `npm audit` reports 5 advisories, all in local dev tooling (`serve` → `compression`, `wrangler` → `miniflare` → `undici`). None of it ships: the site is a static export. The offered `npm audit fix --force` would downgrade `serve` and `wrangler` majors, so it was not applied.

### Scaffold
- `create-next-app@16.4.3` accepted the folder with `docs/` in it, so the scaffold went straight into the root (no `.scaffold/` detour). Flags: `--ts --tailwind --biome --app --src-dir --import-alias "@/*" --use-npm --disable-git --skip-install --no-react-compiler --agents-md --no-agent-feedback --yes`.
- The 16.4.3 template wires Tailwind through a Turbopack loader (`@tailwindcss/turbopack`) and turns on `cacheComponents` and `partialPrefetching`. Following the brief, Tailwind runs through `@tailwindcss/postcss` with `postcss.config.mjs` instead, and the two caching flags are removed: a static export has no server to cache for.
- `AGENTS.md` from the template is kept. It points coding agents at the version-matched docs in `node_modules/next/dist/docs/`, which later sessions need, and `next dev` re-creates it anyway.
- TypeScript 7: `next build` type-checks through the project's `tsc` CLI by default in 16.4 (`experimental.useTypeScriptCli` defaults to on), so no extra config was needed. The template `tsconfig.json` passes TS 7 unchanged.
- Biome 2.5 deprecates `linter.rules.recommended`; `biome migrate` rewrote it to `"preset": "recommended"`. Build output, test output and `.wrangler/` use Biome's force-ignore syntax (`!!**/out`).
- `.gitattributes` forces LF line endings. Git on Windows defaults to `autocrlf`, which would check files out with CRLF and make `biome check` fail on a fresh clone.
- Playwright's Chromium was installed with `npx playwright install chromium`, as the brief says. This machine sets `PLAYWRIGHT_BROWSERS_PATH=D:\ms-playwright`, so the browsers live there, outside the project folder (Playwright's normal behaviour; nothing else was installed globally).

## Design plan (phase 1)

### Palette
Starting from the brief's palette, tuned for harmony. Warm notes stay golden (amber, straw, ochre), never red-brown, so nothing reads as terracotta.

| Role | Colour | Note |
| --- | --- | --- |
| Pre-dawn sky | `#1E2A3A` top, `#2C3949` middle, `#4A5566` horizon | Brief values plus a middle stop for a smoother ramp |
| Dawn sky | `#3B5068` top, `#6E7C8C` upper middle, `#B9A08C` lower middle, `#E8B07A` near horizon, `#F2C994` horizon line | The grey-lilac middle stop is how real dawn skies pass from blue to amber without a muddy green band |
| Sun | `#FFE2A8` disc, `#F6BF7E` low-sun disc | Two stacked discs crossfaded as the sun climbs |
| Horizon glow | `#F3C58C` at the horizon, fading to transparent | Hugs the horizon under the sun |
| Sea | `#1D2B33` pre-dawn, `#34505A` dawn, lighter toward the horizon (sky reflection); crest highlights `#C9B48C` at dawn, `#3E4E5A` pre-dawn | |
| Haze | `#8C98A4` cool, warming to `#E9D6B8` | One tint, interpolated from a pre-built table |
| Hull | `#1B1714` hull, `#C99A3E` ochre bands (see history notes on the shade), copper `#9C6B45` / shade `#7A5236` | |
| Canvas | `#E9DFC8` lit, `#CFC3A6` shade, seams a few percent darker | Weathered: cloth tones vary slightly by seeded noise |
| Rigging | `#2A221C` standing, `#5A4A3A` running | Thin and low contrast |
| Text | `#F3EAD8` | One text colour; secondary text uses the same colour, smaller, never a low-contrast grey |
| Page and scene 2 placeholder | `#1B2529` deep sea-grey | Not cream, not white |

### Type roles
- `--font-display`: the title only. `--font-text`: everything else. Both fall back to "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif until the owner supplies faces (`docs/fonts.md`).
- Scale, sized from the viewport height like the composition, with pixel floors and ceilings:
  - Title "Trafalgar": `clamp(56px, 10.5vh, 168px)`, weight 400, tracking −0.01em, `font-optical-sizing: auto`, kerning on, line-height 0.95. Sentence case, never all caps.
  - Lede and closing caption: `clamp(16px, 2.35vh, 23px)`, line-height 1.45, measure about 34em.
  - Dateline and chapter marker: `clamp(13px, 1.85vh, 17px)`, regular weight, normal tracking, sentence case.
  - Scroll cue: `clamp(12px, 1.6vh, 14px)`.
- No small caps, no tracked capitals, no italics in the title, no monospace anywhere.

### Layout at 1280×720 (the owner's laptop)
Percentages are of the viewport height. The ship is sized from the height so the whole rig fits at every aspect from 4:3 to 21:9; sky, sea and haze simply extend sideways.

```
 0% +--------------------------------------------------------------------+
    | I. Dawn                       .                  .        .        |
    |                         _|_  (main truck ~11%)          .          |
    |                   _|_   |#|   _|_                                  |
    |      [ fore, main and mizzen square sails, filled toward the bow ] |
    |   <spanker        |#|   |#|   |#|  jibs >                          |
    |                                                    glow  (  sun  ) |
 53%|            ____/=================\____                             |
 61%|---(British)----| VICTORY  hull   |--------- . . enemy fleet . . . -| horizon
 69%|~~~~~~~~~~~~~~~~ waterline, front sea strip ~~~~~~~~~ glitter ~~~~~~~|
    | Off Cape Trafalgar, at dawn on 21 October 1805                       |
    | Trafalgar                                                            |
    | Twenty-seven British ships of the line. Thirty-three French and      |
    | Spanish. One morning off the coast of Spain.        Scroll           |
100%+--------------------------------------------------------------------+
```

- Horizon at 61%. Victory's waterline at 69%. At her hero position her mainmast truck is about 11% from the top and her hull centre near 47% of the width.
- The title card sits in the band below her waterline (about 74% to 95%), on the left. The brief asks for the card "over the sea and clear of the hull and rig": Victory sails in from the left through the left half of the frame while the title assembles, so only the band below her waterline stays clear for the whole scroll. On narrow screens (4:3) the card's width is capped so it never reaches the scroll cue.
- Chapter marker top left; scroll cue bottom centre.
- A scrim: a low, wide darkening gradient anchored bottom left behind the card, strongest at p = 0 when the haze is densest, and only as strong as contrast requires.

### Layer stack (back to front)
Every moving thing is a wrapper animated by transform or opacity. Static art never changes after first paint.

| # | Layer | Element | What moves |
| --- | --- | --- | --- |
| 1 | Sky | Two full-bleed gradient divs (pre-dawn, dawn) and a star SVG (one path per brightness) | Dawn opacity, and a small upward translate so the warmth rises from the horizon; star opacity |
| 2 | Sun | A glow div (radial gradient) and two disc divs (low-sun, high-sun) | Disc translate (rising), disc crossfade, glow opacity and scale |
| 3 | Horizon band | One SVG of 33 enemy silhouettes in four groups; British silhouettes astern of Victory | Group opacity (emerging), British x with Victory |
| 4 | Back haze | Canvas at half resolution | Drawn each frame from the shared ticker |
| 5 | Sea | Back strips (horizon to just below the waterline), each two stacked SVG variants (pre-dawn, dawn) in a looping wrapper; a static sun-reflection band | Wrapper `xPercent` loop and slow vertical swell; dawn variant opacity; reflection opacity |
| 6 | Victory | Wrapper (scroll x) → heave and pitch wrapper → ship SVG, veil SVG (her silhouette in haze colour), warm-light SVG, flag SVGs, bow-wave SVG | x; y and rotation; veil and warm-light opacity; flag transforms; bow-wave scale and opacity |
| 7 | Front sea | The strip covering her waterline and the foreground strips, built like layer 5 | As layer 5 |
| 8 | Front haze and glitter | Canvas at half resolution (haze) and a narrow canvas under the sun at capped device resolution (glitter) | Drawn each frame |
| 9 | Text | Real HTML: chapter marker, title card (dateline, h1, lede, closing caption), scroll cue, scrim | Opacity; title letters by transform and opacity |

The glitter gets its own canvas so it stays crisp: at half resolution the glints smear. It covers only the column under the sun, so its fill cost is small.

### Choreography (p = scroll progress through the 300vh pin)

| p | Sky and sun | Sea, haze, glitter | Victory | Fleets | Text |
| --- | --- | --- | --- | --- | --- |
| 0 | Pre-dawn, stars | Dark sea; haze dense and cool | A dim partial shape at the left edge, veiled | Hidden | Chapter marker, dateline, scroll cue |
| 0.00–0.03 | | | | | Scroll cue fades out |
| 0.03–0.30 | Stars fade | | | | |
| 0.05–0.45 | Dawn layer fades in and rises; glow grows on the right | Haze thins (1 → 0.45), warms, lifts; dawn sea fades in, far strips first | Sails in from the left; veil fades (gaining contrast) | British astern emerge (0.30–0.60) | Title assembles letter by letter (0.06–0.42) |
| 0.45–0.75 | Sun disc clears the horizon (0.45–0.66); the low-sun disc gives way to the pale disc | Glitter path (0.48–0.72); sun reflection on the water | Reaches the hero position (about 0.62), full colour; warm light on the sunward edges (0.45–0.75) | | Lede (0.50–0.60) |
| 0.75–1.00 | Sun keeps climbing slowly | Haze settles at a light veil | Keeps moving slowly toward the enemy | Enemy fleet emerges on the eastern horizon in four groups (0.78–0.98) | Title and lede ease out (0.76–0.84); closing caption (0.84–0.92) |
| 1 | Pin releases into the scene 2 placeholder | | | | |

Victory's x follows one continuous curve with no stop at the hero position: brisk on entry, slowing into the hero position, then carrying on at a slow constant drift, with matched velocity where the pieces join.

Idle loops on the shared ticker, independent of scroll: sea strips drift (crests travel left to right), a slow vertical swell per strip, Victory's heave and pitch in phase with the front strip's swell, flags, haze drift, glitter shimmer, bow wave. All pause when the scene leaves the viewport (ScrollTrigger toggle) or the tab is hidden.

The title's letters assemble rather than fade-and-slide: each letter starts loosely spaced and faint, as if seen through the haze, and draws into its place in the word from left to right. On the way out the letters loosen and fade toward the right, the way the haze drifts.
