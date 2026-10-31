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

| Role | Face | Ink | Close up |
| --- | --- | --- | --- |
| Oceans | Bodoni Moda 28 pt, capitals tracked 0.32 em (the brief's one exception to the spaced-capitals rule) | pale | fades out |
| Seas | Baskervville italic capitals, tracked 0.22 em | pale | fades out |
| Waters (gulfs, bays, straits, the Channel) | Baskervville italic | pale | fades out |
| Capes | Baskervville italic, the name ending at the cape | pale | stops at 18 px |
| Islands and island groups | Baskervville roman | pale (they lie on the sea) | stops at 18 px |
| Towns, with a ring on the site (capitals ⊙) | Baskervville roman, beside the mark | dark (pale where the name lies on the sea: Cádiz) | stops at 19 px, capitals 22 |
| Countries and regions | Baskervville roman | dark | fades out |

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
- **Glyphs in confined water (session 8).** A glyph in a bay is no larger than the bay can hold: its `room` is the most of the chart it may stand on, as a height in km. Seen from farther off it keeps that size on the chart and shrinks on screen with the bay, fading out below about 7 CSS px, so its hull stays on the water. An open-sea glyph is 34 CSS px at the Gulf key, where the outer bay of Cádiz is about 10 device pixels deep, so the anchored fleet stood on the shore of El Puerto beyond it. The anchorage has a room of 3.6 km in the outer bay (about 13 CSS px at the Gulf key, 260 km off; full size within about 110 km) and 1.5 km in the narrows between Puntal and Matagorda. Displacing the glyphs into open water as the camera climbs was the alternative; it moved ships that were at anchor.
- **Town marks.** An open ring on the site, about an x-height across with a stem-weight stroke; a capital's ring has a dot. The name sits beside it.
- **Sky, horizon and haze.** At the dawn key the chart's horizon, sky and sun are scene 1's: a 40° lens pitched 4.6° up puts the horizon at 61 % of the height, the sky stops are scene 1's, and the sun stands at the true sunrise azimuth (102.5°), 25° right of a camera heading 77.5°. Visibility grows with altitude on a monotone curve (17 km at the dawn key, opening within a few kilometres of climb, then 17 km + 3.5 × altitude); the haze is opaque past 2.3 visibilities, and nothing is detailed beyond it.

### Terrain mesh

CDLOD patches of 32 × 32 cells with skirts, morphing at their range ends. Open sea is flat: a patch with no land within 25 km (a summed-area table over the land grid) splits only while the camera is nearer than its size; nothing splits beyond the opaque haze. The first frame fell from 1.75 M to 0.12 M triangles when this went in.

### Camera rig

Keys placed by progress p. Across the chart each path (eye and target) is a centripetal Catmull–Rom spline, which never loops between unevenly spaced keys; the eye's altitude (in ln km), the target's height and the field of view are monotone cubics over the keys' index, so nothing overshoots a key (one spline for all three axes had flung the camera four times past its highest key). The camera is a pure function of the scrubbed timeline's progress: no per-frame smoothing, fully reversible, no roll. The lab's keys: dawn off Cape Trafalgar (p = 0), rising (0.09), the Gulf (0.24), Iberia (0.42), the Atlantic from the south out to the West Indies (0.62), north (0.82), the Channel (1).

### Quality ladder

Device pixel ratio 1.5, 1.25 and 1.0, then 0.85 with the optional effects (cast shadows) off. It steps down after two 90-frame windows with more than 12 % of frames over 19.5 ms, and tries a step up only after six clean windows (fewer than 2 % misses); a step up that fails doubles the wait. On the owner's laptop the scene must hold the top rung: the ladder is a safety net for weaker machines, not a way to hide a slow scene.

### Budgets

- The chart chunk (three, troika and the engine) loads by dynamic import, never in the initial bundle; 189 KB gzipped at session 6's build (budget about 300 KB).
- GPU memory about 51 MB of textures at session 6, plus about 3 MB of land masks (budget about 256 MB).
- Assets 4.31 MB (budget about 10 MB); the overview alone, 2.29 MB, shows a whole chart.

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
