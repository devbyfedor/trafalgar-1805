# Fonts

The site uses two type roles, wired as CSS variables:

- `--font-display`: the title "Trafalgar" only. **Bodoni Moda**, variable (wght 400–900, opsz 6–96).
- `--font-text`: everything else (dateline, lede, closing caption, chapter marker, scroll cue, fallback screen, scene 2 placeholder). **Baskervville**, variable (wght 400–700).

Both are under the SIL Open Font License 1.1. The owner supplied them as WOFF2 files converted from the Google Fonts variable TTFs; neither licence names a Reserved Font Name. They are self-hosted: no font is ever requested from another host (a Playwright test checks every request is same-origin).

## Where things are

```
src/fonts/
  index.ts                            the next/font/local definitions
  README.md                           the owner's notes on the files
  BodoniModa-Variable.woff2           wired: the title
  BodoniModa-Italic-Variable.woff2    not wired (for later scenes)
  OFL-BodoniModa.txt                  its licence, next to the fonts
  Baskervville-Variable.woff2         wired: everything else
  Baskervville-Italic-Variable.woff2  not wired (for later scenes)
  OFL-Baskervville.txt                its licence, next to the fonts
```

- `src/fonts/index.ts` calls `localFont()` once per family, with `variable: "--font-display-face"` and `variable: "--font-text-face"`.
- `src/app/layout.tsx` puts both `.variable` classes on `<html>`, so the root layout preloads the two files on every route.
- `src/app/globals.css` maps the roles in `@theme inline`: `--font-display: var(--font-display-face, <serif stack>)`, the same for `--font-text`. The serif stack ("Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif) only shows while a face is still loading, or if it fails.
- next/font hashes the files into `/_next/static/media/` in the export, so they are served from the same origin with long-lived caching.

## Settings and why

- `display: "swap"`. With the preload links the files usually arrive before first paint; on a slow connection the text shows in the serif stack first instead of staying invisible.
- `adjustFontFallback: false` keeps the serif stack above as the fallback. The default would put a metric-adjusted Arial in front of it.
- Only the upright faces are wired. Nothing in scene 1 is italic, and next/font preloads every file listed in one `localFont()` call. To use an italic later, add it to that family's call as an array (`src: [{ path: "./Baskervville-Variable.woff2", style: "normal" }, { path: "./Baskervville-Italic-Variable.woff2", style: "italic" }]`, each with `weight: "400 700"`), and accept the extra preload, or check whether the page that needs it can live without one.
- Title: `font-optical-sizing: auto` (Tailwind `[font-optical-sizing:auto]`), so Chromium sets Bodoni Moda's `opsz` axis to the font size in CSS pixels: about 76 on the owner's laptop, and the axis maximum, 96, on larger screens. That is the high-contrast display cut. Weight 400, tracking −0.01em, unchanged from the plan.

## Rules next/font enforces

- The `localFont()` calls sit at module scope, each assigned to an exported `const`, with literal options: no variables, no spreads. That is why the fallback list is written out twice.
- `src` paths are relative to `index.ts`. A missing file fails the build.
- **Quote multi-word fallback names with single quotes inside the string** (`"'Iowan Old Style'"`). next/font pastes the list into generated JavaScript without escaping, and double quotes (`'"Iowan Old Style"'`) break the build with "Expected ','". (This page's earlier example had double quotes; it was wrong.)

## The split title and the fonts

The title is split into letters with GSAP SplitText (`src/scenes/01-dawn/Scene01Dawn.tsx`). Three things depend on the loaded face:

1. **When it splits.** After `document.fonts.ready`, which waits for the preloaded faces when they are still loading.
2. **Re-splitting.** SplitText's `autoSplit` only watches fonts and width when lines are split, and the title is split into characters only, so the scene wires it: every `loadingdone` event on `document.fonts`, and every window resize (debounced 200 ms), calls `split.split()`. SplitText reverts the old letters and the old title tween, splits again, and `onSplit` rebuilds the tween at the same playhead.
3. **Kerning.** Each letter becomes an inline block, which loses the face's kerning: in Bodoni Moda "fa", "ga" and "ar" opened up by 1–2 px at the laptop size and up to 4 px on a 1440 px tall screen. `restoreKerning` (in `choreography.ts`) measures the kerned position of every letter in an unsplit copy of the title and gives the letters the difference as left margins in em. The measurement belongs to the face and size in use, which is why the re-splits above matter.

`ScrollTrigger.refresh()` runs after `document.fonts.ready` and again on every later `loadingdone` (`src/components/experience/Experience.tsx`).

`tests/e2e/fonts.spec.ts` checks, at 1280×720 and 1920×1080: both faces load; the title uses the display face with optical sizing; it stays on one line; every letter sits within 0.5 px of its kerned position; a face that finishes loading later replaces the letters; and with the font files delayed by 1.5 s the title still ends up split and kerned in the real face.

## Changing a face

1. Put the `.woff2` file and its licence in `src/fonts/`.
2. Point the `src` of the matching `localFont()` call at it and set its `weight` range (or a single weight for a static font).
3. If the new display face has no optical-size axis, `font-optical-sizing: auto` does nothing and can stay. Look at the title's tracking and size (`TextOverlay.tsx`; the type scale is in `docs/decisions.md`), and at the size of the smallest text tier, which was tuned to Baskervville's x-height.
4. Run `npm run check` and `npm run screenshots`.
