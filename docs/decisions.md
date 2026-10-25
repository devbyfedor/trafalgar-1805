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

## Implementation decisions

### Foundations
- **One clock.** Lenis runs with `autoRaf: false` and is stepped from `gsap.ticker` as a prioritised callback, so ScrollTrigger and the canvas draws later in the same tick see the current scroll. Lenis scroll events call `ScrollTrigger.update`. GSAP's lag smoothing is off while Lenis runs (`lagSmoothing(0)`, as the Lenis docs advise), and restored when it is torn down.
- **Reduced motion.** No Lenis instance is created at all, so native scrolling applies. Lenis 1.3.27 would honour the preference by itself anyway (`respectReducedMotion`, on by default since 1.3.26; checked in the installed README). The scene builds the same timeline paused and sets it to p = 0.7: no pin, no scrub, no idle loops, one static canvas draw.
- **Fallback.** Switched by CSS (the `fallback` custom variant, `(max-width: 1023.98px), (pointer: coarse)`), so the server HTML is identical for everyone. `gsap.matchMedia` mirrors the query: in fallback mode no Lenis, no ScrollTriggers and no loops are created, and a live resize across the breakpoint tears them down or rebuilds them. The story stays in the accessibility tree (visually hidden), so the one h1 is kept; the fallback's title and dateline are visual duplicates marked `aria-hidden`.
- **SplitText.** The title is split into chars after `document.fonts.ready`, with `aria: "auto"` (the h1 gets an `aria-label`, the letters `aria-hidden`) and `autoSplit`; the title tween is built in `onSplit`, so a re-split rebuilds it. Text fades use opacity, never `autoAlpha`, so nothing leaves the accessibility tree.
- **Pin.** `anticipatePin: 1`, `invalidateOnRefresh`, `scrub: 0.6`; ScrollTrigger refreshes after fonts load. The master timeline lasts exactly 1, so every tween's position is its p.
- **Idle loops** live in one paused timeline, played only while the scene's wrapper is within the viewport (a ScrollTrigger toggle) and the tab is visible. After a hidden tab they resume from a one-shot ticker callback so the root clock's jump never shows.

### The ship
- The geometry functions are pure and cached per spec; the component only renders. Silhouette mode is a handful of paths with one fill.
- **Two-tone silhouettes (deviation).** The brief asks for one fill in silhouette mode. The distant enemy line keeps one fill. The three British ships astern are at mid distance, and with one fill their hulls read lighter than their canvas against the dark sea, the reverse of reality. They take an optional second tone (`hullFill`) for hull and spars: pale canvas, dark hulls, both veiled more with distance. Still a handful of paths.
- **The warm-light layer** is a separate SVG above the ship whose wrapper opacity the scroll drives. It repaints the yards and the rigging in front of the sails, so the warm light falls on the canvas only; the lower-mast highlights are drawn behind the sails, where the courses hide them.
- **Hull colours follow the paint research, not the starting palette.** The 2015 paint survey gives a near-neutral black (`#2D2C2B` here, against the brief's brownish `#1B1714`) and a pale, slightly pinkish ochre (`#C29A77`, against the golden `#C99A3E`). The golden accents of the palette stay elsewhere: the lower masts, the warm light, the sun.
- Historical choices (ports, paint, entry port, truck height, flags, studding sails) are recorded with their sources in `history-notes.md`.

### Environment and choreography
- **Sun and enemy scale.** Both are enlarged about three times over their true angular size, keeping their ratio: the sun disc is 6.2 vh, a first rate's rig on the enemy line 2.4 vh (a 74's about 2.0 vh), a third of the sun as the research gives. At true size the enemy would be a few pixels tall.
- **Enemy line.** 33 ships along 0.60–0.88 of the width, the sun at 0.86 at its southern (right-hand) end. Seeded ragged spacing with bunches and gaps, and a depth spread that sets both size and how pale each silhouette is. Some ships are hidden behind Victory's hull by the end of the scroll; the line is a ragged straight line, since the crescent formed only later in the morning.
- **Clouds** are procedural strands of stratocumulus (seeded): a gradient body and a lit underside deepest toward the sun. They are static art; only their wrappers' opacity changes.
- **The sun's two discs** are flat in tone; the low disc starts flattened by refraction and rounds as it climbs (a scale on a plain div), so the crossfade to the pale disc shows no ring.

### Text (changes to the design plan)
- **The title never wraps.** After the split its letters are inline blocks, so the h1 is `white-space: nowrap`, and the title card is `min(80vh, 58vw)` wide instead of `min(36em, 58vw)`: the card scales with the viewport height like the type, so 1440p and 21:9 screens keep "Trafalgar" on one line.
- **Caps for large monitors.** Dateline and chapter marker `clamp(13px, 1.85vh, 20px)`, lede and caption `clamp(16px, 2.35vh, 27px)`, scroll cue `clamp(12px, 1.6vh, 16px)`, so the small text keeps its proportion to a 151 px title on a 1440 px tall screen.

### Performance (headless Chromium on the owner's GPU family, Intel Arc, through Playwright's new headless mode)
- No long tasks during the scripted scroll; long animation frames during scroll had no blocking time.
- At load there are a few long tasks (about 60–190 ms across runs): hydration, building the timelines, the SplitText split and the one-time haze sprites. They happen before the first scroll; the brief's budget is for scrolling.
- The numbers are sensitive to what else uses the GPU. One run made while a desktop browser played video on the same machine recorded over 200 long tasks during the scroll and timed out encoding its video; the same code on a quiet machine recorded none, twice. Real smoothness has to be confirmed on the owner's laptop with `?debug`.
- About 600 SVG elements in the scene (budget 2,500), about 270 in the hero ship (budget 1,200), tested in `tests/e2e/scene.spec.ts`.

## Review against the brief and the avoid-list (session 2)

The design plan and the built scene were checked against the brief and the avoid-list.

- Tracked-out caps, eyebrows, small caps: none. The chapter marker and dateline are sentence case with normal tracking.
- Metadata joined with middle dots, "word — fragment" labels, monospace labels, arrows on links: none. The debug overlay (`?debug`) is a developer tool and uses the text face.
- Italic or coloured accent words in the headline: none; the title is one word in one colour.
- Pill buttons, cards, glass panels, `backdrop-filter`: none in the site. The lab page's control panel is a plain dark strip on a developer page.
- Terracotta or clay: the warm notes are golden (amber, straw, ochre). The red port linings are historical (the 2015 paint research), not an accent.
- Cream or off-white page background: the page is deep sea-grey `#1B2529`.
- Decorative gradient blobs: the radial gradients are the sun's glow, its reflection and the text scrim, each with a job.
- Drop shadows on text: none; legibility comes from the scrim.
- A centred hero with a button: none.
- Fade-and-slide-up on every element: text fades in place by opacity only; the title's letters draw together horizontally, the way the haze drifts.
- Defaults caught and changed in this pass: clouds that read as sticks, then as small boats; a dense, uniform enemy line; one-tone mid-distance silhouettes; a title that wrapped on large screens; a fallback without the ship.

## Follow-up round (session 3, 25 October 2026)

The owner reviewed scene 1: a steady 60 fps on his laptop with `?debug`. This round wires his fonts, applies his answers on the rig and flags, and prepares the repository to go public.

### Fonts
- **The faces.** Bodoni Moda for the title (`--font-display`), Baskervville for everything else (`--font-text`), both variable WOFF2 under the OFL, self-hosted with `next/font/local` from `src/fonts/` with their licences beside them. Details and the reasoning for each setting are in `docs/fonts.md`; the type roles in the design plan above are otherwise unchanged.
- **Upright faces only.** next/font preloads every file in a `localFont()` call and scene 1 has no italics, so the italic files stay in `src/fonts/` unwired.
- **Optical sizing.** `font-optical-sizing: auto` on the title (and the fallback screen's title): Bodoni Moda's `opsz` follows the font size, about 76 on the laptop and its maximum, 96, from 1080p up.
- **Kerning restored after the split (new).** SplitText wraps each letter in an inline block, which drops kerning; in Bodoni Moda "fa", "ga" and "ar" opened by 1–2 px on the laptop and up to 4 px at 1440p. The scene now measures the kerned positions in an unsplit copy and gives the letters the difference as em margins. Kerning depends on the loaded face, so the title is re-split on every `loadingdone` and on resize (SplitText's own `autoSplit` covers only line splits). A test holds every letter within 0.5 px of its kerned position.
- **The smallest text tier is one step larger.** Baskervville's x-height is 0.436 em against Palatino's 0.469, so at the same size the dateline, chapter marker and scroll cue read about 7 % smaller than planned. They go from `clamp(13px, 1.85vh, 20px)` to `clamp(14px, 2vh, 21px)` (the cue from `clamp(12px, 1.6vh, 16px)` to `clamp(13px, 1.75vh, 17px)`), which restores the planned x-height on the laptop. The lede and caption keep their size. Weight stays 400.
- **Legibility over the moving background, measured.** With the glyphs hidden and the scrim kept, the background behind each text block was sampled at p = 0 to 1 in steps of 0.05, twice per step while the sea, haze and glitter kept moving, at 1280×720, 1920×1080 and 3440×1440. Against the 99th-percentile brightest background pixel, the worst cases were: chapter marker 6.1:1, dateline 6.1:1, closing caption 6.5:1, lede 10.1:1, scroll cue 13.5:1, title 6.2:1. All clear WCAG AA (4.5:1 for small text) with margin, so the scrim stays as it was.

### The owner's answers on the rig and flags
- **No studding sails in scene 1.** Unchanged in the drawing (there were none); they belong to the approach scene (`docs/backlog.md`).
- **No ensign at dawn.** Which flags fly is the scene's state, not the ship's, so the spec keeps the White Ensign (position, size, design) and `ShipOfTheLine` gained a `flying` prop: the ids of the spec's flags that are flying, all of them when omitted. Scene 1 and the fallback pass `VICTORY_FLAGS_AT_DAWN` (`composition.ts`), the vice-admiral's flag only. The viewBox still leaves room for every flag in the spec, so hoisting the ensign later in the approach scene never moves or rescales the ship. The lab has a "Flags" control (`?flags=all` shows the ensign).
- **The vice-admiral's flag stays at the fore.** The sources are split rather than clearly against it (history notes, assumption 3), so nothing changed.
- **Accepted as they are:** the main truck at 60.2 m from Steel's 1794 tables, and the sun in frame as artistic licence. The colour inside the ports waits until a scene shows them open.

### Lower gun deck: 15 ports a side
The owner chose 15, matching her 15 lower-deck guns a side and the contemporary 1:48 model of the 1800–03 repair, over the 16 that a Trafalgar midshipman and the present ship give. The model's 15 are not the pre-1800 row: it has the new bow port, one space forward of the foremost upper-deck port, and no port under the aftmost upper-deck port. The spec follows the model, so the aftmost lower port went, not the bow port.

While there: `decksFor` in `specs/derive.ts` scaled `firstX` and `lastX` for derived ships but passed explicit port positions (`xs`) and the bow port through unscaled. Scene 1 draws derived ships only as silhouettes, which have no ports, so nothing showed; a later scene drawing a two-decker at hero size would have had misplaced ports. Both are scaled now.
