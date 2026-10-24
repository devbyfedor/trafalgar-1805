# Fonts

The site uses two type roles, wired as CSS variables:

- `--font-display`: the title "Trafalgar" only.
- `--font-text`: everything else (dateline, lede, captions, chapter marker, scroll cue, fallback screen).

Until real faces are added, both fall back to a system serif stack: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif. Nothing references a font file yet, and no font is ever requested from another host.

## How the wiring works

`src/app/globals.css` defines the two roles in `@theme inline`:

```css
--font-display: var(--font-display-face, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif);
--font-text: var(--font-text-face, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif);
```

`--font-display-face` and `--font-text-face` are not set anywhere today, so the fallback stack after the comma applies. When you add fonts with `next/font/local`, it sets those two variables on `<html>` and the real faces take over. **No CSS change is needed.**

## Adding the .woff2 files

1. Put the files in `src/app/fonts/` (create the folder). Not in `public/`: next/font hashes the files and serves them from `/_next/static/media/`, same-origin, with preload links.

2. Create `src/app/fonts.ts`. Adjust file names, weights and styles to what you have:

   ```ts
   import localFont from "next/font/local";

   export const displayFace = localFont({
     src: [
       { path: "./fonts/Display-Regular.woff2", weight: "400", style: "normal" },
     ],
     variable: "--font-display-face",
     display: "swap",
     adjustFontFallback: false,
     fallback: ['"Iowan Old Style"', '"Palatino Linotype"', '"Book Antiqua"', "Palatino", "Georgia", "serif"],
   });

   export const textFace = localFont({
     src: [
       { path: "./fonts/Text-Regular.woff2", weight: "400", style: "normal" },
       { path: "./fonts/Text-Italic.woff2", weight: "400", style: "italic" },
     ],
     variable: "--font-text-face",
     display: "swap",
     adjustFontFallback: false,
     fallback: ['"Iowan Old Style"', '"Palatino Linotype"', '"Book Antiqua"', "Palatino", "Georgia", "serif"],
   });
   ```

   For a variable font, give one file and the weight range instead: `src: "./fonts/Text-Variable.woff2", weight: "300 700"`.

3. In `src/app/layout.tsx`, add the two variable classes to `<html>`:

   ```tsx
   import { displayFace, textFace } from "./fonts";
   // ...
   <html lang="en" className={`${displayFace.variable} ${textFace.variable}`}>
   ```

4. Run `npm run check`.

## Rules next/font enforces

- Only create `fonts.ts` once the files exist: a missing file fails the build.
- The `localFont()` calls must sit at module scope, each assigned to a `const`, with literal options: no variables, no spreads. That is why the fallback list is written out twice.
- `src` paths are relative to `fonts.ts`.
- `adjustFontFallback: false` keeps the serif stack above as the fallback. The default would insert a metric-adjusted Arial or Times New Roman in front of it.

## What else happens when the fonts arrive

- The scroll machinery already waits for `document.fonts.ready` and then calls `ScrollTrigger.refresh()`, so pins and positions are re-measured with the real metrics.
- The title is split into letters (GSAP SplitText) after fonts are ready. A letters-only split reflows by itself if metrics change, so nothing re-splits.
- If the display face has an optical-size axis, `font-optical-sizing: auto` on the title uses it. If its kerning or proportions differ a lot from Palatino, look at the title's tracking (`tracking-[-0.01em]` in `src/scenes/01-dawn/Scene01Dawn.tsx`) and the title size in the type scale (`docs/decisions.md`).
