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
- **The title block's spacing.** Bodoni Moda's "g" has a long descender, which left it about 11 px above the lede on the laptop while the dateline sat 21 px above the title's capitals. 0.6 vh moved from under the dateline to above the lede (`mb-[1vh]`, `mt-[2.8vh]`): the dateline keeps its place clear of Victory's hull, the title rises about 4 px, and the gaps become about 16 and 14 px.
- **Legibility over the moving background, measured.** With the glyphs hidden and the scrim kept, the background behind each text block was sampled at p = 0 to 1 in steps of 0.05, twice per step while the sea, haze and glitter kept moving, at 1280×720, 1920×1080 and 3440×1440. Against the 99th-percentile brightest background pixel, the worst cases were: chapter marker 6.1:1, dateline 6.1:1, closing caption 6.5:1, lede 10.1:1, scroll cue 13.5:1, title 6.2:1. All clear WCAG AA (4.5:1 for small text) with margin, so the scrim stays as it was.

### The owner's answers on the rig and flags
- **No studding sails in scene 1.** Unchanged in the drawing (there were none); they belong to the approach scene (`docs/backlog.md`).
- **No ensign at dawn.** Which flags fly is the scene's state, not the ship's, so the spec keeps the White Ensign (position, size, design) and `ShipOfTheLine` gained a `flying` prop: the ids of the spec's flags that are flying, all of them when omitted. Scene 1 and the fallback pass `VICTORY_FLAGS_AT_DAWN` (`composition.ts`), the vice-admiral's flag only. The viewBox still leaves room for every flag in the spec, so hoisting the ensign later in the approach scene never moves or rescales the ship. The lab has a "Flags" control (`?flags=all` shows the ensign).
- **The vice-admiral's flag stays at the fore.** The sources are split rather than clearly against it (history notes, assumption 3), so nothing changed.
- **Accepted as they are:** the main truck at 60.2 m from Steel's 1794 tables, and the sun in frame as artistic licence. The colour inside the ports waits until a scene shows them open.

### Lower gun deck: 15 ports a side
The owner chose 15, matching her 15 lower-deck guns a side and the contemporary 1:48 model of the 1800–03 repair, over the 16 that a Trafalgar midshipman and the present ship give. The model's 15 are not the pre-1800 row: it has the new bow port, one space forward of the foremost upper-deck port, and no port under the aftmost upper-deck port. The spec follows the model, so the aftmost lower port went, not the bow port.

While there: `decksFor` in `specs/derive.ts` scaled `firstX` and `lastX` for derived ships but passed explicit port positions (`xs`) and the bow port through unscaled. Scene 1 draws derived ships only as silhouettes, which have no ports, so nothing showed; a later scene drawing a two-decker at hero size would have had misplaced ports. Both are scaled now.

### Public-repository hygiene
- **What was checked.** Every file ever committed (`git log --all --name-only`), the working tree including ignored folders, and the scratch folders of earlier sessions.
- **Never in the repository:** no PDF, page image, saved web page or downloaded text has ever been committed. The screenshots in `docs/screenshots/` are renders of this project; the fonts are OFL with their licences.
- **Outside the repository:** the material downloaded during the session 1 research (about 1,350 files, about 300 MB, including the Caldercraft/JoTiKa Victory manual as a PDF, RMG PDFs, log page scans and archive.org texts) is in that session's scratch folder under the Windows temp directory, not in the project. It never entered git. It is the owner's to delete.
- **The research notes** (`docs/research/*.md`) are our own notes, but they quoted their sources verbatim in places, about 1,500 words in all. The passages from modern sources (the official 2012 site, the NMRN press release and conservation log, interviews with the curator, an auction house's notes, RMG catalogue text, a kit manual, Wikipedia, a 1935 journal article) are now paraphrased with their citations and links. Long passages from public-domain period sources are trimmed to the words that carry the evidence. The rules are in `docs/research/README.md`, and `/docs/research/sources/` is git-ignored for any source files a later session keeps locally.
- **History, rewritten with the owner's approval (25 October 2026).** The earlier wording of the three research notes was in every commit from "Write the history notes from the session 1 research" up to the cleanup. Each of those commits now holds the cleaned notes and nothing else changed: same other files, messages, authors and dates, and the final tree is identical. The commit that set the rules ("Set the rules for the research notes") got a new message, because after the rewrite it no longer edits the notes. Commits before the research notes kept their hashes. A scan of every commit and every object in the repository finds none of the removed quotations. The old history is kept as a git bundle outside the repository; nothing had been pushed.

## Scene 2, Stage A: the chart engine (sessions 4 to 7, 25–29 October 2026)

The brief is `docs/scene-02-brief.md`. Stage A builds the engine, its data and its look, proven by one camera flight on `/lab/chart`. The owner saw the lab after session 5 and approved its direction ("the look, and the flight from Cádiz onward"); everything since refines it. Live status and the session-by-session record are in `docs/progress.md`; the research behind the look is in `docs/research/scene-02/` (`t4-chart-style.md` with its check `v-t4.md` and adjudication `a-t4.md`).

### What the brief asked to record

- **Renderer: three r186 `WebGLRenderer` (WebGL 2) with our own `ShaderMaterial`s in GLSL ES 3.00.** three's manual still recommends it for pure WebGL 2 work and calls `WebGPURenderer` experimental in places; troika's text and our line work are proven on WebGL; and every chart feature is drawn analytically in our own fragment shaders, which gains nothing from three's node materials. No React Three Fiber and no OrbitControls: the host drives the chart from `gsap.ticker`, the page's one clock, and the camera moves only by scroll.
- **Dependencies added for scene 2.**
  - `three` 0.186.1 and `@types/three` 0.186.0: the brief's renderer, the newest patch of r186.
  - `troika-three-text` 0.52.5: the brief's lettering.
  - `troika-three-utils` 0.52.5, imported directly: the same troika release (already installed under troika-three-text), for `createDerivedMaterial`, which lets the lettering's material drape each glyph on the relief in the vertex shader while keeping troika's SDF text shading. Without it the lettering would need a fork of troika's material. It adds no code to the bundle that troika didn't already bring.
  - `netcdfjs` 4.0.0 (dev): reads the NetCDF files ERDDAP serves, in the Node data pipeline; the owner's machine has no Python or GDAL (brief).
  - `sharp` 0.35.5 (dev): encodes the lossless WebP tiles in the pipeline, and crops screenshots in `scripts/dev/`. Neither dev dependency ships.
- **Shadows baked on the GPU at load, not at build time (deviation).** The brief allows shadows baked per lighting state at build time. Instead, the horizon maps (for each texel, the steepest true-scale rise of the land toward each state's sun azimuth) are baked on the GPU when the tiles load. Shadows then stay right for any exaggeration and sun height, and the download is about 1.5 MB smaller. The bake reads the decoded field, so a lost WebGL context rebuilds it from the kept bitmaps.
- **Waterlining on a sea chart is licence.** No navigational sea chart of 1780–1814 that the research examined waterlines its coasts; English survey and atlas engraving did, from the Ordnance Survey's Kent map (1801) to Arrowsmith and Hall (1817) (`v-t4.md`, `a-t4.md`). The brief chose waterlining as the chart's signature, so it is drawn as the best period engraving drew it.

### Palette

Colours are sRGB values written straight to the canvas (`outputColorSpace` is linear, no conversion anywhere), so the chart matches scene 1's CSS palette exactly. Three lighting states (`light/states.ts`), blended per frame:

| Role | Dawn | Campaign (low summer light) | Night |
| --- | --- | --- | --- |
| Sea, deep and shallow | `#2b3f47`, `#3d5961` (bracketing scene 1's dawn sea `#34505A`) | `#2f4851`, `#43626a` | `#141d24`, `#1c2830` |
| Paper, low and high land | `#e3d6bb`, `#c9ad7f` (bone to ochre) | `#e6dbc3`, `#cdb185` | `#4b4f52`, `#44464a` |
| Ink: coast, pale (sea), contour (also rivers) | `#2a221c`, `#d8ceb9`, `#5b4a38` | `#2a221c`, `#ddd4c0`, `#5b4a38` | `#121416`, `#8f97a0`, `#2b2e31` |
| Light on relief: sun, shade | `#ffe2b8`, `#8d96a6` | `#fff0d6`, `#9aa1ab` | none |
| Sky | scene 1's dawn gradient read at the elevations its rows show through a 40° lens, `#ecbd88` at the horizon to `#22344a` overhead | warmer and paler, `#e6cfa6` to `#38485b` | `#2a3442` to `#10151d` |
| Haze | `#9e9a92` | `#a7a69d` (thinner, 0.85) | `#232c37` |

Ship glyphs take scene 1's two tones: the British canvas `#ebe2ce` with hulls `#26231f`; the combined fleet the slate violet of scene 1's enemy line, canvas `#a9a6b4`, hulls `#34343f`. The canvas takes 18 % of the sun's colour.

### Type roles

| Role | Face | Lies on | Close up |
| --- | --- | --- | --- |
| Oceans | Bodoni Moda 28 pt, capitals tracked 0.32 em (the brief's one exception to the spaced-capitals rule) | the sea | fades out |
| Seas | Baskervville italic capitals, tracked 0.22 em | the sea | fades out |
| Waters (gulfs, bays, straits, the Channel) | Baskervville italic | the sea | fades out |
| Capes | Baskervville italic, the name ending at the cape | the sea | stops at 18 px |
| Islands and island groups | Baskervville roman | the sea beside them | stops at 18 px |
| Towns, with a ring on the site (capitals ⊙) | Baskervville roman, beside the mark | the land, or the sea where a port's name fits there better (Cádiz, Gibraltar) | stops at 19 px, capitals 22 |
| Countries and regions | Baskervville roman | the land | fades out |

- **The ink follows the ground under the letters (session 8):** pale on the sea, dark on the land's paper, switching at the coast within a pixel, as the coastline is drawn. A name keeps its contrast at every scale even where the ground under it changes: Cádiz's lies on the sea west of the town from afar and on its isthmus close up, and had been pale on the land there. Names are placed so they don't straddle a coast in the views that matter; Gibraltar's moved from above the Rock, where it lay half on the land, to the open sea east of it.
- One troika `BatchedText` for every name (one draw call), one SDF size (128), glyphs draped on the relief and pulled toward the camera; fonts only from this site (`public/fonts/3d/`), with `npm run check:lettering` failing on any glyph a font lacks, because troika would fetch a fallback from a CDN.
- Sizes are world km, each name about 12 CSS px at the farthest view of the flight where it matters; the period hierarchy (capital 1.4 : port 1.2 : minor 1, `t4`, section 7) sets the caps. Names fade in once readable, with foreshortening and with the haze.
- Not adopted from the period sources: countries and capitals in spaced roman capitals (Faden, Hall). The brief allows spaced capitals for oceans and seas only, so they stay in upper and lower case, and the ring with a dot and the larger cap carry a capital's rank.

### Layer stack (render order)

| Order | Layer | Draws |
| --- | --- | --- |
| 0 | Terrain (`terrain/`) | One instanced CDLOD mesh for land and sea; every chart feature on it is analytic in the fragment shader |
| 10 | Sky (`sky/`) | A full-screen triangle at the far plane: scene 1's gradient, glow, sun halo and disc, only where the chart leaves sky |
| 20 | Rivers (`lines/Rivers.ts`) | Tapering ink ribbons on the relief |
| 21 | Routes (`lines/Route.ts`) | Ink ribbons on the sea, drawing to a head |
| 22, 25 | Glyph wakes and ships (`glyphs/`) | Two instanced draws, sorted back to front |
| 29 | Town marks (`lettering/marks.ts`) | One instanced draw |
| 30 | Lettering (`lettering/Lettering.ts`) | One BatchedText |

Eight draw calls in the lab (budget about 150). Lines, glyphs, marks and names don't write depth; they are pulled toward the camera along their view rays (0.4 % of the distance) so they stay in front of the surface they lie on.

### How each feature is drawn

- **World and data.** Mercator (the period's projection) in km at the equator's scale, origin off Cape Trafalgar for float precision; heights scaled by sec φ. Three tiles from ETOPO 2022 via ERDDAP: the surround (12′, 110° W–60° E, 10° S–72° N), the overview (3′, the stage from the Caribbean to the upper Danube) and the Gulf of Cádiz (15″), layered with blend bands so no view meets a map edge. Natural Earth decides land and sea; ETOPO's heights are reconciled to it. Lossless WebP per tile with a 12-bit asinh height and a 12-bit coast distance, decoded on the GPU into half-float fields (height, coast distance, slopes); a half-resolution land mask per tile, mipmapped, gives the share of land around any point at any scale. `npm run data:build` regenerates everything; 4.31 MB in `public/chart/`.
- **Sea.** The colour deepens with the depth on the shelf; the sky reflects at grazing angles as scene 1's sea does; the sun's road is a soft column under the sun, never a sparkle. Haze takes the colour of the sky behind each point, so distance dissolves into the very sky and never into an edge.
- **Isobaths.** 10, 20, 50 and 100 fathoms, on the shelf only (deep water was unsounded in 1805), all of one weight as Buache drew them, pale and fine; 200 fathoms at a third of their strength. They give way where the waterlining is strong.
- **Coast.** A hairline of 1.45 px in brown-black ink, from the distance field, so it is crisp at every zoom.
- **Waterlining** (`t4`, section 1; `v-t4`; `a-t4`, directives 1–4). Lines every 2.2 CSS px at the shore, a rim of heavier lines, the spacing opening smoothly about twofold to a reach of 26 spacings (about 57 CSS px, 4.5 % of the owner's viewport, as on the period plates); strength (1 − d/reach)^1.5; each line's weight and ink vary a little, hashed from its distance from the coast. The line sets are world-fixed multiples of an octave spacing thinned by rank, so lines never swim or pop as the camera zooms. Close islands merge into one envelope with V cusps; straits and bays fill. A small island far from other land keeps a small, soft halo (55 % of the reach, 60 % strength), judged by the share of land in a window that reaches past the water's own coast distance: along any coast it holds land, round a speck almost none. Not done: per-line spacing jitter, a low-frequency wobble and dashed outer hairlines (`a-t4`, directive 3), which need an along-line coordinate the distance field doesn't give.
- **Land and light.** Paper from bone to ochre with height. Only real relief is shaded (true-scale slopes from 0.2 % to 4 %), read at a coarser mip so it follows landforms, not every gully; the facing term is compressed, so slopes toward a low sun never blaze. Cast shadows from the GPU-baked horizon maps, at an exaggeration capped at 3.5, deepening with how far the relief rises above the sun's line, and coming in with the camera's altitude (none at 20 km, full at 160 km): close up, a low dawn sun shredded the lowland into blotches. Thin contours, at an interval that doubles as the camera climbs, the faintest of the land's lines.
- **Exaggeration.** A monotone curve in log–log space from true scale at 0.5 km to 15× at 6,000 km, so relief reads at continental scale and is true low over the sea, where scene 1's horizon must match.
- **Rivers.** Natural Earth's rivers, each from its source downstream, tapering with the square root of the distance run, from a fading hairline to 1.6 px (0.8 px for minor ones), in the contours' brown, a step lighter than the coast. Minor rivers thin out as the camera climbs; the main ones run to their sources, as on the atlas maps of the period.
- **Routes.** An ink ribbon on the sea through the waypoints on a centripetal Catmull–Rom curve, drawing itself to a head, with ships sailing at the head. Period styling (a dotted hairline under a thin wash, with day circles and numerals) is for Stage B (`a-t4`, directive 10).
- **Ship glyphs.** Scene 1's silhouettes, drawn once at load from the same geometry into an atlas; billboards anchored at the waterline, upright at any pitch, facing the side their heading points to on screen, sized as a chart convention (22–34 CSS px across the flight) rather than true scale; wakes as two fine pale arms at Kelvin's angle; a furled sail set at anchor.
- **No glyph stands on the shore (sessions 8 and 9).** A glyph may cover on screen only the open water beyond it: its `room`, map km of chart toward the land the camera looks at from beyond the ship. That water is seen foreshortened, so the cap is the angle between the glyph's foot and the chart `room` km farther on, `atan(z, d) − atan(z, d + room)` for a camera z above the sea and d away. Session 8 capped the glyph at the angle a room-sized height would subtend, as if the bay stood upright: at the Gulf key, looking down at about 26°, that let a 3.6 km room draw 13 CSS px in an outer bay about 7 CSS px deep beyond the line, and the anchored fleet still stood on the shore of El Puerto (also from the rising shot and the dawn close-up, where the bay is a sliver). From low over the sea (the view falling less than about 2–5°) a ship stands against the sky and the haze, not the chart, and keeps her size: the dawn frame is unchanged.
  - Rooms are measured, not guessed: the open water beyond each ship along 40°, the bearing the flight looks along, to Natural Earth's coast (which the chart draws). The anchorage, 3.6–5.4 km (3.2 in the narrows): from the Gulf the ships stand about 6–9 CSS px tall, a dark row inside the bay; full size within about 30 km. The combined fleet at dawn, 13.6 km at its northern end to 33 km; the British, 38. A glyph fades out between 6.5 and 3.5 CSS px (5–9 before: the anchored row would have faded at the Gulf key).
  - A moving ship takes `room: "coast"`: her distance from the nearest coast, read from the chart's field in the vertex shader. Villeneuve's squadron, which stood on the Spanish shore at Cape de Gata and in the Strait when seen from 2,000–4,000 km, draws small there and full size in open water.
  - Displacing glyphs into open water as the camera climbs was the alternative; it moves ships that were at anchor.
- **A group gives way to its lead (session 9).** Seen from far off, the dawn fleets piled into one heap of masts over the coast at p = 0.3–0.45. A ship with a `spacing` (her distance from the next ship toward her group's lead, map km) fades once that spacing on screen is under half a glyph's width (gone at 0.3), and the lead (Victory; the lead of Collingwood's group; the Bucentaure) stands for the group, as a chart of a larger area shows a fleet by one ship. At the Gulf key the spacing is about 0.6 of a glyph, so that view keeps every ship.
- **The dawn fleets are spread out: a licence (session 9).** The lab opens the spacing within each fleet a few times over the true distances, as it draws the glyphs larger than true scale, so the ships read one by one from the Gulf: the combined line runs about 16 nm (36°00′–36°16′ N) where the sources give nearly five miles (James III 389), its northern glyph 4.8 nm off the chart's coast near Conil where the sources give 7–9 nm (British reckoning) or 18–24 nm (French); the British are spread over about 11 nm. The line's centre stays where the sources put it, about 36°09′ N 6°14′ W, 9–12 nm east of the Victory. Drawn to the true spacing, each fleet would show as one ship at the Gulf key; whether to tighten it is the owner's call (history notes, "Scene 2", open doubts). The British head 047° true, ENE by compass, the course they steered once they bore up after the signal of 6.50 by the Victory's clock, not the N by E (about 350° true) they steered at sunrise: a licence for continuity with scene 1's Victory sailing east.
- **Town marks.** An open ring on the site, about an x-height across with a stem-weight stroke; a capital's ring has a dot. The name sits beside it.
- **Sky, horizon and haze.** At the dawn key the chart's horizon, sky and sun are scene 1's: a 40° lens pitched 4.6° up puts the horizon at 61 % of the height, the sky stops are scene 1's, and the sun stands at the true sunrise azimuth (102.5°), 25° right of a camera heading 77.5°. Visibility grows with altitude on a monotone curve (17 km at the dawn key, opening within a few kilometres of climb, then 17 km + 3.5 × altitude); the haze is opaque past 2.3 visibilities, and nothing is detailed beyond it.

### Terrain mesh

CDLOD patches of 32 × 32 cells with skirts, morphing at their range ends. Open sea is flat: a patch with no land within 25 km (a summed-area table over the land grid) splits only while the camera is nearer than its size; nothing splits beyond the opaque haze. The first frame fell from 1.75 M to 0.12 M triangles when this went in.

### Camera rig

Keys placed by progress p. Across the chart each path (eye and target) is a centripetal Catmull–Rom spline, which never loops between unevenly spaced keys; the eye's altitude (in ln km), the target's height and the field of view are monotone cubics over the keys' index, so nothing overshoots a key (one spline for all three axes had flung the camera four times past its highest key). The camera is a pure function of the scrubbed timeline's progress: no per-frame smoothing, fully reversible, no roll. The lab's keys: dawn off Cape Trafalgar (p = 0), rising (0.09), the Gulf (0.24), Iberia (0.42), the Atlantic from the south out to the West Indies (0.62), north (0.82), the Channel (1).

### Quality ladder

Device pixel ratio 1.5, 1.25 and 1.0, then 0.85 with the optional effects (cast shadows) off. It steps down after two 90-frame windows with more than 12 % of frames over 19.5 ms, and tries a step up only after six clean windows (fewer than 2 % misses); a step up that fails doubles the wait. On the owner's laptop the scene must hold the top rung: the ladder is a safety net for weaker machines, not a way to hide a slow scene.

### Budgets

- The chart chunk (three, troika and the engine) loads by dynamic import, never in the initial bundle; 189 KB gzipped at session 6's build, 192 KB at session 9's (budget about 300 KB).
- GPU memory about 51 MB of textures at session 6, plus about 3 MB of land masks (budget about 256 MB).
- Assets 4.31 MB (budget about 10 MB); the overview alone, 2.29 MB, shows a whole chart.
- **Frame time, measured on the owner's laptop (session 8).** The GPU's time for each frame, from `EXT_disjoint_timer_query_webgl2` (which Chromium offers on ANGLE's Direct3D 11), at the owner's viewport (1920×1080 device pixels, the top quality level), along the whole flight in steps of 0.02, on the production build, on battery: 1.5 ms over the sea at dawn, 4–6 ms over the ocean, 7–8 ms at the worst points (rising into the Gulf at p ≈ 0.16, and the Channel), the 95th percentile at most 8.8 ms and the slowest single frame 9.1 ms: about half of a 60 fps frame. The CPU's share (the layers' updates and three's render calls) is at most 2.2 ms. Where the time goes: the terrain (700,000–770,000 triangles at the worst points). Not counted: the compositor's own pass and the multisample resolve, about a millisecond. No long tasks while the flight is scrolled with the wheel, down and back.
  - **How.** The lab's `window.__chart.bench(frames, p)` and `scripts/dev/bench.mjs`; the `chart-frames` test project repeats it after every other project, so nothing else uses the GPU, and fails on the owner's GPU family above 11 ms. Other work on the machine distorts the numbers by a factor of two or three, even in the background (on battery the CPU and GPU share one power limit; a Playwright trace captures the screen; two tests drawing at once), so each point keeps the best of three sweeps.
  - **Measured again at the close of Stage A (session 9)**, after the glyph and route changes, the same way but on mains power, every 0.02 of the flight, 40 frames a point, two sweeps (best of the two per point): dawn and the rising shot at most 4.7 ms of GPU (95th percentile), into the Gulf 8.6 ms (p = 0.14–0.18, the only points over 8 ms, about 770,000 triangles), Iberia and the Atlantic 6.0 ms, north to the Channel 7.5 ms; the slowest single frame 8.7 ms; the CPU at most 1.5 ms. The worst point takes about half of a 60 fps frame, so the headroom is a little under half, before the compositor's millisecond. The glyphs' new vertex work (a few field samples for a couple of dozen quads) doesn't show. A first sweep with other work on the machine read two to three times higher from p = 0.72 on, at the same triangle counts, and was discarded.
  - Only the owner's look at `?debug` in a real browser confirms 60 fps.

### Tests

`tests/e2e/chart.spec.ts` flies the lab through the whole flight and back by scrolling through Lenis, in software WebGL (SwiftShader) and on the GPU, and checks for console and page errors, draw calls and triangles in range, same-origin requests only (the manifest and the 3D fonts included), and rendered sea, land and sky in sampled screenshots. `tests/e2e/regression.spec.ts` holds scene 1 at p = 0, 0.5 and 0.75 against its approved screenshots with a displacement-tolerant difference whose limits are about three times what its idle loops produce by themselves. Scene 1's `?debug` overlay is tested to be unchanged.

### Review against the brief and both avoid-lists

The plan and the built lab were checked against `docs/scene-02-brief.md` and the avoid-lists of both briefs.

- Satellite or photographic textures: none. The land is paper tinted by height and shaded from the elevation data; the sea is a flat tint with drawn lines.
- Neon or glowing data-visualisation lines, cyan on black: none. Every line is ink, pale on the sea and dark on land, with no glow; the route is brown-black.
- Lens flares, bloom haze over everything, sparkle particles: none. The sun's road is a soft column, the glow is scene 1's horizon glow, and there is no post-processing.
- A spinning-globe intro: none. The chart is flat Mercator, as the period's charts were, and the flight starts on the sea at dawn.
- Glossy 3D map pins: none. Towns have flat engraved rings lying on the chart.
- Drop shadows under labels: none; no halos or knock-outs either. Names lie over the waterlines, as on the period plates.
- A hard cut between scene 1 and scene 2: the lab's first frame is scene 1's horizon, sky and sun (the transition itself is Stage B).
- Scene 1's list: spaced capitals only on ocean and sea names (allowed); no middot metadata, spaced em dashes, monospace, arrows, accent words, pills, cards, glass, terracotta or blobs. The cream of the land is the chart's paper inside the illustration; the page stays deep sea-grey. Names fade in place, never slide.
- Defaults caught and changed in Stage A:
  - waterlining whose spacing doubled with distance, which drew targets round islands: now the period profile, with soft halos for lone islands;
  - town names floating with no mark and fading out close up: now rings on the sites, and caps;
  - rivers of one width in the coast's ink, which read as borders: now tapering brown lines;
  - cast shadows that blotched the lowland under a low sun: now shadows that deepen with the relief and come in with altitude;
  - an index-weighted 100-fathom contour, a modern habit: now isobaths of one weight;
  - one spline for the camera's height, which overshot its keys: now separate monotone curves;
  - a haze that hid the coast in the rising shot: now a sea-level layer the camera climbs out of.

## Scene 2, Stage B: design plan (session 10, 1 November 2026)

The owner approved Stage A on 1 November 2026: a steady 60 fps on his laptop with `?debug` on the production preview. Stage B builds the full scene on that engine. His answers before this stage: the dawn fleets at their true spacing (about five miles), even if the Gulf view then shows one flagship per fleet, with a last frame close enough for the formation to read; the British heading 047° at dawn kept as a deliberate licence; beat 4's caption "a chain of frigates and ships of the line".

### Scroll and beats

Scene 2 is pinned for about 30 viewport heights and scrubbed (0.6 s), fully reversible; its timeline lasts 1, so a position on it is the scene's progress p. At a relaxed wheel pace (about 0.45 viewport heights a second) that is about 65 s, inside the brief's 60–90 s. First lengths, to be tuned by feel and recorded:

| Beat | p | Viewport heights | Date line | Light |
| --- | --- | --- | --- | --- |
| 0 Transition in | 0–0.085 | 2.5 | (scene 1's dateline fades) | dawn |
| 1 Boulogne | 0.085–0.235 | 4.5 | August 1805 | dawn to campaign |
| 2 The chase | 0.235–0.50 | 8 | 30 March to 22 July, day by day | campaign |
| 3 Finisterre and the turn | 0.50–0.65 | 4.5 | 22 July to September | campaign |
| 4 Cádiz | 0.65–0.82 | 5 | 28 September to 20 October | campaign to morning (the relay at 7–9.30 a.m.) |
| 5 Night and descent | 0.82–1 | 5.5 | 20 October to 21 October 1805 | night, then dawn |

Each caption fades in once its beat's camera has settled and holds long enough to read at that pace (about 8–12 s, 4–5 viewport heights), then gives way to the next; text moves by opacity only.

### The transition from scene 1 (beat 0)

The brief wants no cut: scene 2 starts from scene 1's last frame. The chart's dawn key already matches scene 1's horizon (61 %), sky and sun (Stage A). The handoff:
- **Overlapping pins.** Scene 1's pin is extended by the handoff's length (2.5 viewport heights) after its own choreography ends at p = 1; its timeline gains an empty tail, so its p still maps to the same scroll as before (its tests and approved frames are untouched). Scene 2's wrapper is pulled up by a negative margin so its pin starts exactly where scene 1's p reaches 1. For those 2.5 viewport heights both stages are pinned, scene 1 above scene 2 (its wrapper has the higher z-index), and scene 2's chart, already drawing the dawn key, lies under scene 1's frame.
- **The crossfade.** Scene 2's beat 0 owns a few of scene 1's wrappers for the handoff (exported selectors in `src/scenes/handoff.ts`): the sky, the sun, the enemy fleet, the seas, the haze and glitter canvases and the text fade out, revealing the chart; the chapter marker changes from "I. Dawn" to "II. The road to Trafalgar" in the same place. The camera holds still while the painted sea becomes the chart's sea, so the two horizons never part.
- **Victory becomes a glyph.** Scene 1's own Victory stays on screen (no copy, so her heave and flags never jump), clipped at her waterline from the first frame (the front sea hides that line at that moment). As the camera rises off the sea and turns to look north-north-east, her box is moved and scaled each frame to where the chart puts her glyph, until she is glyph-sized; then she crossfades into her glyph. Turning matters: a ship heading 047° faces left on screen from a camera heading 77.5° (the dawn key's), and faces right, as scene 1's Victory does, once the camera heads less than about 30°.
- After the handoff scene 1 is transparent and unpins under scene 2.

### Camera

One rig (`CameraRig`, Stage A) with keys per beat: the dawn key (eye 0.05 km up, about 875 m west-south-west of Victory's glyph, heading 77.5°, pitched 4.6° up: her waterline and the horizon where scene 1 draws them); rising and turning; the Gulf from the south-south-west (heading about 25°, so both fleets' glyphs face right, as in scene 1); north over Iberia and France to the Channel (Boulogne from over the Channel to its west, England across the water at the top left, the sea under the caption); the western Mediterranean (Toulon); the whole Atlantic; the West Indies; the return; Finisterre; Iberia and France; down to the Gulf of Cádiz (the harbour and the chain to the west); up and east to Ulm and back; down toward Cape Trafalgar to the last frame. The last frame looks north-north-east from south-south-west of the fleets, a few kilometres up and close enough that both formations read: the British on the left (west), the combined fleet's ragged line receding to the north on the right (east), as scene 1 has them. Light: dawn, campaign, morning, night, dawn (`LightBlend`, Stage A's three states; the morning of 19 October uses the dawn state's low eastern sun).

### What each beat draws

- **Routes, as period track charts drew them** (`a-t4.md`, directive 10): Nelson's (and Calder's) track a dotted pale-ink hairline under a thin translucent carmine wash 1.5–2.5 CSS px wide, slightly uneven like a hand wash; the combined fleet's a dash-dot pale-ink line with a faint slate-violet wash. Small open day circles at the dated noon positions (none on Villeneuve's crossing, whose dating is disputed), day-of-month numerals off the line, the month at its start and at key points, a short italic legend. Dashes keep their place on the chart and their size on screen (octave-blended, as the waterlines are). No glow. The drawing head rests at a day circle where the scroll rests.
- **Squadrons at the drawing heads** show their size at each stage (`history-notes.md`, "Fleet sizes at each stage"): a squadron is its lead glyph at the head and the others in a compact formation astern of it, spaced in screen units (a chart convention, as the glyphs' size is), so 11, 18 or 29 ships read as that many at any zoom.
- **Boulogne:** rows of small huts along camp streets on the plateaus either side of the Liane, at Wimereux, Ambleteuse and Étaples (marks in contour ink, draped on the relief); the flotilla as a double line of small rigged craft (prames, brigs, luggers) in the road outside the pier (`history-notes.md`, "Positions on the chart", Boulogne). A Channel detail tile (ETOPO 2022 at 15″) gives the coast its detail.
- **Finisterre:** engraved puffs of smoke between Villeneuve's 20 and Calder's 15 at 43°35′ N 11°40′ W; two Spanish glyphs leave the allied formation for the British.
- **The army's march:** a dashed dark-ink line on the relief from Boulogne (28 August) by Metz, Bitche and the Rhine at Speyer (25–30 September), Heilbronn, Nördlingen and the Danube at Donauwörth (7 October) to Ulm (20 October); in beat 3 it leaves Boulogne for the Rhine, and in beat 5's cut-away it reaches Ulm.
- **Cádiz:** the combined fleet at anchor (33 ready, the main group in the outer bay north-east of the entrance shoals, a few in the narrows), Blackwood's frigates inshore, the chain of ships of the line to the west (Defence and Agamemnon, Colossus and Mars), Nelson's main body some 50 nm west, out of sight of the port. The relay of 19 October in daylight: at each link two or three tiny hand-tinted flag dabs at the masthead and a counted pair or three of white gun puffs at her side, then a pause; hoists stay up until the answer runs back; 7 a.m. at Cádiz to 9.30 at the Victory. Seven of the line come out that day, the rest on the 20th.
- **Night of 20–21 October:** the chart in night light; the combined fleet's stern and top lanterns along a line about six miles long; the British dark but for the admiral's lights and answers; the short night chain with paired blue lights at the frigates, gold rockets and counted gun flashes (`history-notes.md`, "How the chart shows the signals"). No glowing line between ships, no red or green lights, no moon until the crescent at 5.20 a.m.
- **Dawn of 21 October:** both fleets at the sources' spacing (the owner's decision): the combined fleet's ragged line about five miles long north to south, centred about 36°09′ N 6°14′ W, heading 180–195° under easy sail, Gravina's squadron to windward of the van; the British in two loose groups, Nelson's round the Victory at 36°08′ N 6°28′ W and Collingwood's to the south, heading 047° (the owner's licence), the Africa apart to the north.

### Text

HTML over the canvas: the chapter marker "II. The road to Trafalgar" top left, as scene 1's; the captions in scene 1's title-card place and size; the date line in the place of scene 1's dateline, above the caption, Baskervville, `aria-hidden`, running day by day while routes draw. Contrast: a scrim as scene 1's, and camera framings that keep the sea under the card; measured over the rendered chart at every 0.01 of p (WCAG AA, 4.5:1).

### Fallbacks, loading, performance

- **Stills** (reduced motion, no WebGL, a context that does not come back): one still per beat, rendered from the scene itself by a Playwright script at 1920×1080 or larger and stored as WebP (about 1.5 MB in all). Reduced motion stacks them with their captions, unpinned; a WebGL failure crossfades them inside the pinned stage as the timeline runs. Mounted on the client only when used, so phones never download them.
- **Loading:** on desktop with motion, the chart chunk is imported and the chart created while scene 1 plays (idle time first), its setup staged so no main-thread task runs over 50 ms; shaders are compiled and one hidden frame is drawn before the handoff. Phones and the fallback load nothing of scene 2.
- **Budgets:** about 20 draw calls; the frame time measured on the owner's laptop along the whole scene (the `chart-frames` method, Stage A), 95th percentile under 11 ms of GPU; the chunk under 300 KB gzipped; assets under 10 MB.

### Built in parallel

Self-contained engine layers are built in parallel by agents in their own git worktrees, each proven on `/lab/chart` before it is merged: the Channel tile with detail tiles that share one slot (the field binds the one nearest the camera's target); engraved smoke puffs; night lights; Boulogne's camps and small craft; track styles (washes, dots and dashes, day circles, numerals and legends, the army's dashed line). The scene itself (its component, timeline, camera, fleets, transition, text, stills and tests) is built in the main tree and takes them in as they land.

## Scene 2, Stage B: the owner's review of the ships (sessions 11 and 12, 5 November 2026)

The owner looked at the site after session 10 and asked for four things before anything else: ships must never sink into the sea; glyphs must not jerk, flicker or jump in size as the camera pulls back; the ships must be sharper and finer, as scene 1's up close and a clean silhouette far off; and the chart must grow sharper and richer as the camera comes close, like an engraved pilot chart held to the eye. His screenshots (`docs/owner-feedback/`) are not on this machine; the work follows his written notes.

### Ships never sink: the causes and the fix

Three faults put the sea, or another ship, in front of a ship's hull. A glyph is a billboard upright on screen at its foot's depth, tested against the terrain's depth and writing none of its own.
- **The water's depth was not the sea's.** The terrain mesh is a grid whose triangles cross the coast; one with a land corner lifts the water near the coast toward the land's height, and from far off the land is exaggerated (8× at 1,000 km) and the cells are kilometres wide. Worse, the mesh read the coast at its own level: a level whose texels are a cell wide averages a bay or a strait a few cells across into land, and the mesh stood the whole bay up as a plateau, drawn as water (the fragment shader reads the coast at full resolution) but hundreds of metres above sea level in depth. Seen at a slant, the plateau in front of a ship hid her hull.
- **Squadrons kept their lead's depth.** A squadron's ships are placed on screen around their lead; moved down the screen at the lead's depth, a ship's lower half lay behind the sea in front of the lead.
- **A squadron's rows hid each other's hulls.** Its block stood in rows a third of a glyph apart, the nearer rows drawn over the farther: every ship but the front row's showed only her topsails and mastheads, which reads as ships sunk to their tops. The block also ran in columns along the heading as it ran on screen, so a squadron sailing away from the camera stood as a tall string of glyphs over the islands of the Antilles.
- **The fix.** (1) Where the terrain draws water it writes the sea's own depth: the depth of z = 0 on that pixel's ray (`gl_FragDepth`, `GLSL_SEA_DEPTH`), never nearer than its own, so nothing standing on the sea (a ship, her wake, a route, a sounding) can sink into it at any height, angle or distance. Writing depth stops the GPU from skipping hidden fragments early, which an A/B on the lab's flight (alternating in one page, on battery) put at a quarter to a third of the terrain's time; so the patches with no sea within 23 km (a cell of the coarse land grid) are drawn first, by a second material without the write, and the coasts and the sea keep it (`Terrain.inland`, one more draw call). The scene's frame time is measured again at the end of Stage B. (2) The mesh reads the coast at a level four times finer than its own before it lets land rise (`GLSL_SURFACE`, shared by the terrain, the lettering's drape and the ink ribbons, so they rise and fall together): bays and straits stay at sea level. (3) Every glyph stands on the sea under her own foot on screen (`glyphFoot`), and her wake is laid round that point. (4) A squadron is a block drawn as a chart draws a fleet: rows across the screen, each ship one step astern of the next on the side away from the bows, the rows above and below staggered half a step and 0.8 of a glyph apart, so every hull shows (`formationPx`, `formationSlot`); one to three rows by the squadron's largest make-up, so no ship changes place when others join or leave. Seen end-on the steps close up with the glyphs' width; as the heading turns through end-on the rows fold through the lead with the mirror's crossfade.
- **Kept off the land.** The probe found ships sailing over the land: the fleets' tracks of 19 to 21 October set each ship at her dawn place about the fleet's centre, and at the mouth of the Strait the British northern ships (above all the Africa, 13 nm north at dawn) crossed the coast at Conil and Barbate, while the combined fleet forming off the port stood on the shore at Rota. The fleets now keep their dawn order drawn closer while they sailed in closer order (`spread`, a share of the dawn offset at each key: 0.4 in the chase into the Strait, 0.45 forming off the port, growing to the full order at dawn). No ship under way comes within 1.5 km of the coast from 28 September to dawn.

### Smooth from near to far

Every glyph property is a continuous function of the scroll, and its rate of change is bounded by the scroll's, not by the story's clock. What jumped, and what it does now:
- a ship weighing swapped her furled glyph for her sailing one, switched her wake on and her room from the bay to the coast in one frame: now she crossfades between the two glyphs over three story hours (`WEIGH_DAYS`), her wake fades up, her room passes smoothly from the bay's 4.2 km to her distance from the coast (`setRoomBlend`), and the rule that a group gives way to its lead applies as she gets under way. The crossfade was cut off when her first leg out was shorter than three hours: she is now at anchor by the day she weighed and the day she next anchors, whatever the legs between (`Track`, movements.ts);
- the combined fleet's ships weighed on the 20th from 6 a.m. at 17-minute intervals, the last at 1 p.m., two hours after the fleet is set forming outside: sorted by time, their keys had a dozen ships weigh on 28 September and creep across the bay for three weeks, under way with wakes and hidden behind their leads. They now weigh as the history notes have it ("20 October"): the ships of the line from 6 a.m. to about 6.50, out of the bay by about 8.30, the Rayo last at about 10, the frigates behind them; the Rhin and Hermione with the seven on the 19th, the Thémis that evening;
- a ship's heading jumped at every key that gave none (from the leg in to the leg out), and a squadron's at every waypoint of its route; on the crossings a few pixels of scroll cover a day, so the glyph flipped from one facing to the other in a frame and the formation swung across its lead. Headings are now read ahead at every 0.0005 of p, unwrapped and smoothed over about 0.0025 either side (`easeHeadings`): a ship turns through the change of course, and a reversal turns through end-on. The last stretch comes back to the headings as given, so the scene ends on the British 047°;
- a squadron's size followed the coast's distance under its lead, which on a crossing changes by a hundred kilometres in a few pixels of scroll: leaving Antigua its glyphs grew a third in one step, and passing an island from 5,000 km up they shrank to nothing and flickered. Its room is now read ahead from the chart at every 0.0005 of p along its way (`readCoastKm`, on the GPU, without stalling a frame), taken as the least within 0.006 either side and smoothed in proportion (`easeRooms`), so the block shrinks before a strait or an island and grows after it at the pace of the scroll. A squadron's block also keeps 85 % of its size for want of room (`uRoomFloor`): it reaches well beyond its lead's room, so shrinking it keeps it off no island, it only makes the count hard to read. In port it stands in the roads 30 km out on its route;
- a squadron reaching port jumped 22 km into the roads: now its block stops in the roads on the route it came in by and waits there, and slides to the roads on the next leg's way out just before that leg begins;
- a ship joining a squadron appeared, one taken or detached vanished, and one replaced by another type swapped: now they fade in, fade out or crossfade over a fixed stretch of scroll (`CHANGE_P`, about 130 px), not of story days, whose pace differs tenfold between beats;
- the squadrons showed for a moment at the end of beat 1 at their August places (the chase's clock begins with beat 2; before it the story is in August): they now come in with the chase;
- a glyph mirrored at once when its heading crossed the line of sight: now the two facings crossfade over a narrow band, where the glyph is narrowest (30 % of its width), so the two images nearly coincide;
- one atlas drawing reduced by mipmaps changed its look with every mip level: now the glyph's two nearest drawn levels are blended by its size on screen.

Verified by a probe that runs the glyph shader's own GLSL and reads every glyph back (`glyphs/probe.ts`, `window.__road.sample(p, mode)`: her foot, height and opacity; how her height came about; her facing and the cells she is drawn from; her wake and room) and a sweep of the whole scene at every 0.0005 of p that flags any change much larger than the changes on either side of it: jumps, size steps, fades, flicker, turns, swaps of drawing and wakes (`scripts/dev/glyph-sweep.mjs`, the quality pinned, since a step of the ladder rescales every glyph). Session 11's sweep flagged 258 steps and its first rerun with the new checks 286; the sweep of the finished work flags none.

### Sharper ships: a ladder of drawings, and room to read

A glyph stands 12 to about 100 device pixels tall. One 192-px drawing reduced by mipmaps blurred its sails into one pale blot and lost its masts and yards. The atlas now draws every type at eight cell heights a factor of √2 apart (12 to 136 px, `LEVEL_PX`), each drawing made for its size from scene 1's geometry, as an engraver redraws a symbol for a smaller plate:
- spars stroked so the thinnest reads as about 0.85 px at every size;
- a hairline of daylight between sails that would run together when small;
- the rigging only where its lines resolve (from about 0.45 px a metre), never under 0.4 px;
- from about 30 px up, the lit and shaded cloths of scene 1's sails, the hull's ochre bands (Victory's 2015 paint research colour, `#c29a77`; the combined fleet's a lighter slate of its hull), and from about 70 px the port lids on the bands and the sails' inked edges;
- the waterline on a whole pixel row at every level.

The atlas holds coverage per channel (canvas, dark, bands, and the canvas's lit share), so the shader colours by side and light as before; it is drawn level by level between frames (no long task), shared by the fleets and the squadrons, 2048 × 1,288 texels, about 14 MB on the GPU with mipmaps (the scene's whole chart about 58 MB). The shader blends the two levels nearest the glyph's height on screen, sampled with explicit gradients and anisotropic filtering, so a glyph narrowed end-on stays sharp. The quad, the foot (1/12 of the cell) and the scale (a cell drawn for the Santísima Trinidad's 66 m) are unchanged, so scene 1's Victory still hands over to her glyph at the same size.

A clean silhouette far off needs pixels as well as drawing: at the squadrons' heights the glyphs stood 14 to 21 CSS px and shrank further for want of room, so their sails read as specks. `GLYPH_PX` now reaches 25 px at 1,400 km and 20 at 6,000 km (it was 21 and 14); the views below 120 km are unchanged. In a crowded anchorage a ship at anchor draws no wider than about 1.35 times the gap to her nearest neighbour on screen, down to half her size (`glyphBerth`, `ShipMark.berth`), and the rule eases off as she weighs. From 16 km over Cádiz bay the anchorage still stands as a forest of masts, its three rows 240 to 280 m apart closing up on screen; the harbour's closest view comes down nearer with the relay (beat 4).

## Scene 2, Stage B: the chart held to the eye (session 13, 6 November 2026)

The owner's point 4 of his review: close up the chart should grow sharper and richer, like an engraved pilot chart (a thinner coast, sharper relief, period detail such as soundings), with nothing soapy or pixelated and detail coming in smoothly. Done in `d1bb69f` except the soundings (parked, below) and the harbour's closer view (with the relay, beat 4).

### The data is what the licences allow
- ETOPO 2022's 15″ grid is the finest relief and Natural Earth 10 m the finest coast the brief's licences allow; the detail tiles already use both.
- ETOPO's own shoreline (height above 0 at 15″) was compared with Natural Earth's around Cádiz bay: the same shape within one to three cells, with the salt marshes and salinas at or below 0 m and inland reservoirs as water. It adds noise, not detail, so Natural Earth stays the coast. Richness close up comes from drawing, not data.

### A smooth field close up (`GLSL_FIELD_SMOOTH`, `shaders/common.ts`)
- **The fault:** the field was read bilinearly, so every line drawn from it (the coast, the waterlines, the isobaths, the contours) was a chain of short curves kinking at each texel's edge (30–40 px apart on the Cádiz tile from 16 km up; the overview's 5.5 km texels made the coast polygonal at continental scale), and the shading fell into soft lozenges.
- **The read:** wherever a texel spans more than a pixel (along the footprint's longer axis), each layer is read through a cubic B-spline in four bilinear taps (Sigg and Hadwiger, *GPU Gems 2*, ch. 20), blended with the hardware's filtering over an octave, so nothing changes in a step. The field (`f`) uses the base level. The smoothed read serves two ends: its slopes (the shading) through the base level's B-spline, crisp and without facets; its height (the isobaths and contours) through the next level's B-spline (0.93 km texels on a detail tile), so those lines follow the landforms as an engraver's form lines did. Layers a finer one hides are not read (inside the detail tile, short of its distance cap, the overview and the surround cost nothing). The lettering's ground is read the same way, so its ink still switches at the drawn coast.
- **Flat ground:** where the sea floor or the land is nearly flat, the half-float filtering's rounding (about 1 part in 2,000) moves a level's crossing by pixels from pixel to pixel, and an isobath broke into speckle on the Channel's floor. A line fades out where that noise, in pixels, outgrows a quarter pixel (`steady`, `terrain/shaders.ts`); the slope it is judged by, and drawn with, comes from the B-spline's taps about two texels apart, which carry almost none of the noise (a screen derivative of a flat field is mostly noise; with it the fade itself speckled, and a stricter fade emptied the Channel of its long isobaths).

### Drawn as held to the eye (`closeUp`, `terrain/shaders.ts`)
- How close the chart is held is judged per pixel by the area it covers on the chart (km per CSS px, `uCloseKm` 0.05 to 0.16): at a slant, the foreshortened axis alone had counted a 16 km view as far.
- Close up the coastline thins from 1.45 to 0.9 CSS px (`uCoastPx`); hill shading starts at a true-scale slope of 1.2 % instead of 0.2 % (`uReliefCloseFrom`), since the data's gentle swells shaded as soft pillows; the contours take the light as an engraver's lines do, finer and paler on slopes that face it, heavier on those turned from it (`uContourWeight` 0.5); and the contour interval comes down to 25 m from about 5 km up (100 m at 40 km, halving and doubling with the altitude, `contourIntervalAt`).
- Checked against the scene's frames before and after at p = 0.085, 0.165, 0.35, 0.43, 0.535, 0.65, 0.82 and 0.95: the far views keep the approved look; the relief is a little crisper and the contours smoother at middle distance.

### Soundings (drawn in session 14; see below)
- **Why:** the most period detail a pilot chart held to the eye shows: the depths written over its shoal water, in fathoms, thick along the shore and in the bays, thinning out to sea.
- **Data** (`scripts/data/lib/soundings.ts`, `npm run data:soundings`, run last by `data:build`): read from each built detail tile, so the depths agree with the isobaths. Five ranks of Poisson-disc points, 8 km of chart down to 0.5 km, each filling between those above it; a rank finer than the first lies within eight of its spacings of the coast. ETOPO's depth at each point, in halves of a fathom under ten fathoms and whole fathoms beyond, none deeper than 120 fathoms (the period's deep-sea lead) and none where the floor is the reconciliation's metre (a marsh or harbour work Natural Earth calls sea), none within 0.25 km of the coast or 20 km of the tile's edge. Seeded, so every build gives the same. The Cádiz tile: 13,117 soundings (243, 601, 1,497, 3,530 and 7,246 by rank), 94 kB in `public/chart/soundings-cadiz.bin`, indexed by `soundings.json` (not in the manifest, which the Channel tile's branch rewrites).
- **Drawing** (`lettering/Soundings.ts`, `lettering/digits.ts`; written and type-checked, never run or seen): small Baskervville italic figures (the waters' face, old-style figures and the half), as a signed-distance atlas drawn at load from the site's own WOFF through a FontFace and a 2D canvas; lying flat on the sea at one size on screen (11 CSS px em), each rank coming in as its points stand 55–85 CSS px apart on screen, giving way to the waterlining's band at the shore, fading with the foreshortening and the haze, in the sea's pale ink; one instanced draw of every figure. Open: whether the figures stand north-up or on a plate angle chosen per tile for the views of that water (the option exists, `angles`); the weight and size by eye.

### Frame time
- Not measured cleanly in session 13: the owner's browser played a video all session (about 12–14 % of the GPU's 3D engine), and the GPU's elapsed time counts the other app's interleaved work (the lab's dawn view read 13.5 ms against Stage A's 1.5 ms). No decision on the sea-depth write was taken from it. `scripts/dev/road-bench.mjs` now times scene 2 itself along its p (`AB=1` alternates the sea-depth write).

## Scene 2, Stage B: frame time and the sea's depth (session 14, 7 November 2026)

The owner's order for session 14: the clean frame-time measurement first, and the sea-depth write decided from its numbers; if it costs too much, take the fallback without bringing the sinking back.

### The measurement, and why absolute numbers don't count on battery
- The owner wrote that the laptop was on mains; Windows reported it on battery all session (`PowerLineStatus` Offline, discharging about 22 W from 93 %). No other app drew on the GPU (VS Code about 5 % of the 3D engine, the window manager 2 %; Edge idle).
- On battery a sustained load throttles this laptop within a minute or so: Stage A's own build (`6845eba`, rebuilt in a worktree) timed now read 1.6 ms at dawn and 5–8 ms into the Gulf, as session 9 measured on mains, then 10–31 ms in stretches where session 9 measured 6–7.5 ms. Builds timed a burst apart, even alternated point by point in one browser (`scripts/dev/ab-builds.mjs`), varied two- to threefold. Absolute frame times taken on battery are not evidence; the owner's look at `?debug` on mains is.
- What holds regardless of the clock is a ratio taken on alternate frames: the bench can switch a variant before each frame (`benchFrames`' `before`), so both are timed at the same clock (the pairs' ratios agree with the medians' within a few per cent).

### The sea-depth write is dropped
- Timed on alternate frames along the whole scene (every 0.02 of p, 40 frames each way), the write made the frame 2.0–2.5 times as long at dawn, 1.14–1.42 rising into the Gulf, 1.4–1.9 over the ocean and the chase, 1.15–1.35 at Cádiz and 1.3–1.6 at the last frame: far more than session 12's estimate. A shader that writes depth loses the GPU's early and coarse depth tests for its draw, and with multisampling the depth buffer's compression too.
- **The fallback, as session 12 named it:** the mesh keeps any triangle that holds water flat at sea level, so the water's depth is the sea's own by construction (`GLSL_SURFACE`). Every point of a triangle lies within √2 cells of each of its corners; morphing stretches a cell up to twice (the terrain passes `cell × (1 + morph)`); the coast the vertex reads (bilinear, a level four times finer than the mesh's) lies within 0.6 of that read's texel of the coast the fragments draw. Land rises only beyond `1.42 × cell + 0.6 × texel` from the coast, over the next cell. Before, it eased up within one cell of the coast, so every triangle the coast crossed lifted its water.
- With the write gone, the inland and coastal patches are one draw again (nearest first, as the quadtree gives them): one draw call fewer.
- **Proof that nothing sinks:** `Chart.probeWaterLift` draws the terrain alone, each pixel as its height above the sea, and reads it back (`terrain/liftProbe.ts`; `scripts/dev/water-lift.mjs` sweeps the scene). At every 0.0025 of p (401 frames), no pixel of the sea, the bays, the anchorage or any water near a ship stands above the sea. A few dozen pixels in 62 frames do, all over land in the far haze at the top of the frame: inland water and thin land that the distant, coarse mip paints as water, on land the mesh rightly raises. They can't hide a ship that is visible, since that land stands there anyway.
- **The look:** frames before and after at eleven points of the scene differ in 0.01–0.18 % of pixels by more than 24 levels (p = 0.03's 0.56 % is scene 1's Victory, whose idle loops move): the coastal relief is a hair softer within a cell or two of the shore, and the shading and contours, drawn per pixel from the field, are unchanged.
- **Tools kept:** `Chart.showNamed(name, shown)` shows or hides the chart's objects by name (terrain, sky, glyphs, wakes, lettering, marks, soundings, rivers, route), and the benches time any of them on alternate frames (`AB=<name>` in `road-bench.mjs` and `bench.mjs`; `IDLE=ms` pauses before each burst). `ab-seadepth.mjs` is gone with the write.

### Soundings, drawn
- Wired into scene 2 and the lab (`loadSoundings`, `buildDigitAtlas`, `Soundings`; one draw call more, about 110 kB of atlas on the GPU), and timed on alternate frames where they show (p = 0.69–1): about 1 % of the frame, within the noise.
- **The plate angle (the owner's licence, 7 November 2026):** period charts set their figures to the sheet, and a sheet was not always north-up, so the Gulf's figures are turned about 50°: upright for a view toward bearing 50°, between beat 4's views up the coast (bearings 0–26°) and the descent and the last frame's (52–77.5°) (`src/scenes/02-road/soundings.ts`).
- **Tuned by eye** on the production build at 1280×720 (scale 1.5), at native size: the em 14 CSS px (11 read as specks once a slant foreshortened them), the ink 0.75 of the sea's pale ink (0.55 was too faint by day), the weight a shade heavier (0.03 of the distance field). Each rank comes in as its points stand 55–85 CSS px apart; they give way to the waterlining's band at the shore, fade with the haze and when the view grazes the sea (so the dawn's last frame stays clean). Looked at from 16 km over the bay (p = 0.735) and at night from 38 km (p = 0.95): the depths agree with the isobaths (42–49 fathoms inside the 50-fathom line, 55–93 beyond), thick in the shoal water and thinning to sea.
- `npm run check:lettering` now also checks that the figures' face (Baskervville italic) has every figure and the half: a 2D canvas would quietly draw a missing one in a system face.
