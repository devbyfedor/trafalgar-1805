# T2: troika-three-text 0.52.5 with three r186, for lettering lying on the chart

Research notes for the Trafalgar 1805 scene 2 chart engine (track T2). Written 2026-10-25.

## Scope, versions and method

Installed and examined (all paths below are relative to `D:\dev\trafalgar-1805\node_modules` unless they start with `src/`, `tests/` or `public/`, which are relative to the repository):

| package | version | notes |
|---|---|---|
| troika-three-text | 0.52.5 | dated 2026-07-24 in CHANGELOG.md:6 |
| troika-three-utils | 0.52.5 | |
| troika-worker-utils | 0.52.0 | |
| bidi-js | 1.1.0 | |
| webgl-sdf-generator | 1.1.1 | |
| three | 0.186.1 | `three/package.json` |
| @types/three | 0.186.0 | |
| typescript | 7.0.2 | native compiler (`@typescript/typescript-win32-x64`) |

How each claim was established:

- **Ground truth is the installed code.** Claims cite `file:line`. Where the README, docs site or web disagree with the code, the code wins, and the disagreement is listed in section 10.
- **Node experiments** ran troika's own `FontParser`, `Typesetter` and `FontResolver` on the owner's five WOFF files. The scripts are in `C:\Users\User\AppData\Local\Temp\claude\d--dev-trafalgar-1805\81d46a93-68b9-4541-8365-f913ef045b3d\scratchpad\t2-scripts\`.
- **Browser experiments** bundled three r186.1 and troika 0.52.5 with esbuild 0.28.2, served them with a small local server that logs every request, and drove them with Playwright 1.64.1 in Chromium 1248 headless shell (WebGL2). The scripts and screenshots are in `C:\Users\User\AppData\Local\Temp\claude\d--dev-trafalgar-1805\81d46a93-68b9-4541-8365-f913ef045b3d\scratchpad\tscheck\browser\`.
- **TypeScript checks** ran the project's own TS 7.0.2 and Biome 2.5.15 on a scratch project in `C:\Users\User\AppData\Local\Temp\claude\d--dev-trafalgar-1805\81d46a93-68b9-4541-8365-f913ef045b3d\scratchpad\tscheck\`.
- Nothing inside the repository was created or modified. A temporary directory junction to the repository's node_modules, used for module resolution, has been removed.

Confidence follows the brief's legend. For software claims it means:

- **High:** read in the installed code, and reproduced where it says "verified".
- **Medium:** read in the code but not reproduced, or one web source.
- **Low:** an inference or estimate.

---

## 0. Answers in brief

1. **Fonts.** WOFF works in 0.52.5. Troika recognises the file by its magic bytes (`wOFF`), rebuilds an OpenType file in JavaScript (fflate inflate), then parses it with Typr. WOFF2 throws. All five owner fonts parse, kern and render. Fonts are fetched by XHR from inside the worker, and the URL is made absolute against the page, so `/fonts/3d/*.woff` stays on our origin. High, verified.
2. **Same-origin.** The only live cross-host path is the unicode-font-resolver fallback on cdn.jsdelivr.net. Two things trigger it:
   - a Text with no `font` while `defaultFontURL` is unset (the "default font" is jsDelivr Noto Sans, not Google Fonts Roboto);
   - any character that neither the label's font nor `defaultFontURL` covers.

   A same-origin `unicodeFontsURL` does not stop it, because the client retries on jsDelivr after any failure. The guarantee is to always set `font`, set `defaultFontURL` to one of our WOFFs, and make sure every label character is covered (build-time check plus a runtime guard). Troika does create its Worker from `blob:` URLs, which is harmless without a CSP. High, verified in Node and Chromium.
3. **BatchedText.** It is in 0.52.5, marked experimental, and draws one call per batch (two if any member has an outline).
   - **May differ per member:** transform, text and all layout properties (font, fontSize, letterSpacing and so on), colour, fillOpacity, curveRadius, clipRect, stroke and outline.
   - **Shared by the batch:** material, sdfGlyphSize, orientation, depthOffset, glyphGeometryDetail, renderOrder and culling.
   - **Ignored:** `member.visible`.
   - **Bug:** colours ignore three's colour management and come out much lighter. This is fixed upstream in 0.53.0, and there is a verified workaround for 0.52.5.
4. **Materials.** Text derives a material from `text.material` with troika-three-utils `createDerivedMaterial` (prototype-chained).
   - Custom uniforms and GLSL take two places, both verified.
     - **Vertex work goes in a derived *base* material.** Its `vertexTransform` sees the laid-out glyph positions.
     - **Fragment work on the final sRGB value goes in a derivation *on top of* the text material,** using `fragmentMainOutro` from a Text/BatchedText subclass. Any fragment hook in the base material (`fragmentColorTransform` or `fragmentMainOutro`) runs before three's colour-space chunk.
   - `depthOffset` is polygonOffset (factor = units).
   - `text.color` is colour-managed: the exact hex appears on screen (verified). BatchedText colours and `colorRanges` are not.
   - The chart's own GLSL3 materials cannot serve as text bases.
5. **Layout.**
   - letterSpacing is in **ems**, not world units as the README says (verified).
   - Kerning (GPOS pairs) works.
   - Only `liga`/`rlig`/`ccmp`-type substitutions apply. There are no small caps and no figure-style switch: Baskervville defaults to old-style figures, Bodoni to lining.
   - `curveRadius` bends glyphs out of the plane around a vertical cylinder. A verified shader rewrite gives in-plane arcs instead.
   - Use sdfGlyphSize 128 for Bodoni Moda (its hairlines break at 64, verified visually) and 64 for Baskervville.
   - In 0.52.5, `textRenderInfo` has `blockBounds`, `visibleBounds`, `topBaseline` and `caretPositions`, but the font-metric fields are **undefined**.
6. **Orientation.** The text plane is local XY facing +Z. In our z-up world (x east, y north) the default already lies flat on the chart, north-up; rotate about z for a bearing. Prefer object rotation over `orientation`.
7. **Readiness.** `sync(cb)` calls back only if that call started a sync; `synccomplete` fires on every sync. `preloadFont` puts glyphs into the atlas. For first render, await one `sync` per Text or batch (with a timeout), then call `compileAsync` (it works even before sync, verified), then `initTexture` on the atlas.
8. **Compatibility.**
   - Works with three r186.1 (verified in Chromium); no known breakage.
   - **TypeScript:** no `types` field, so TS 7.0.2 reports TS7016. The bundled `dist/types` are stale and broken (Text does not extend Mesh; BatchedText is missing), so use a local ambient declaration (Appendix A, verified with TS 7.0.2 and Biome).
   - **SSR:** importing troika and constructing a Text is safe on the server; `sync()` is not.
   - **Size:** about 44.5 KB gzip including dependencies, excluding three.

---

## 1. Font loading: WOFF in 0.52.5, served from /fonts/3d/

**Supported formats (README):** .ttf, .otf and .woff; ".woff2 is not supported" (troika-three-text/README.md:145-150).

**How a WOFF is parsed (high, verified):**

- `FontParser.js:407-417` peeks at the first 4 bytes.
  - `wOFF`: the buffer goes through `woff2otf` (src/woff2otf.js:23-149). It rebuilds an sfnt table directory and inflates each zlib-compressed table with fflate `inflateSync` (woff2otf.js:21, 117-131).
  - `wOF2`: throws `woff2 fonts not supported`.
- Detection is by content, not by file extension.
- The result goes to `Typr.parse(buffer)[0]`, so only the first face of a collection is used.
- Metrics come from OS/2 `sTypo*` with hhea fallbacks (FontParser.js:305-320).
- `supportsCodePoint` is "cmap gives a glyph id > 0" (FontParser.js:321-323).

**How it is fetched (high, verified):**

- `XMLHttpRequest` GET with `responseType = 'arraybuffer'` (FontResolver.js:50-77), inside the typesetting worker by default.
- Before the request leaves the page, troika makes the URL absolute with an `<a>` element (TextBuilder.js:128-137, 412-420). `/fonts/3d/Baskervville-Italic.woff` becomes `http(s)://<our origin>/fonts/3d/...`.
- Each absolute URL is fetched and parsed once per worker (`parsedFonts` cache, FontResolver.js:40-101). The browser HTTP cache also applies.
- Verified: the request log of the local server and Playwright show exactly one same-origin GET per WOFF.

**Which face is used (high):**

- Only the `font` URL selects the face. `fontStyle` and `fontWeight` only steer the unicode fallback (Text.js:157-167; FontResolver.js:123-126, 214-218).
- So water names must pass `Baskervville-Italic.woff` as `font`. `fontStyle: "italic"` does nothing for our fonts.

**If the file fails (high, verified in Node):**

- A status of 400 or above, or a network error, logs `console.error("Failure loading font <url>", err)` (FontResolver.js:51-53, 58-61).
- The callback is never called, so the Text never finishes syncing and never appears.
- The project's console-error test would catch the error; a readiness wait would hang without a timeout.

### The owner's five WOFFs, as troika 0.52.5 sees them (high, verified with troika's own parser)

| file | bytes | UPM | ascender / descender | cap height | x-height | lineGap | "normal" line height | default figures | kerning |
|---|---|---|---|---|---|---|---|---|---|
| Baskervville-Regular.woff | 43,932 | 1000 | 998 / −295 | 710 | 436 | 0 | 1.293 em | old-style | GPOS pairs, + `cpsp` |
| Baskervville-Italic.woff | 37,336 | 1000 | 998 / −295 | 710 | 440 | 0 | 1.293 em | old-style | GPOS pairs |
| Baskervville-SemiBold.woff | 45,568 | 1000 | 998 / −295 | 710 | 441 | 0 | 1.293 em | old-style | GPOS pairs, + `cpsp` |
| BodoniModa-28pt-Regular.woff | 32,084 | 2000 | 2250 / −800 | 1500 | 920 | 0 | 1.525 em | lining | GPOS pairs |
| BodoniModa-28pt-Italic.woff | 35,572 | 2000 | 2250 / −800 | 1500 | 920 | 0 | 1.525 em | lining | GPOS pairs |

Sample kerning applied by troika, in font units:

- Baskervville Regular: AV −90, To −69, Wa −95, P. −140.
- Bodoni Regular: AV −223, To −126, VA −310.

The "old-style" call comes from the digit extents. In Baskervville, 3, 4, 5, 7 and 9 descend to −224, 6 and 8 rise to 667, and 0, 1 and 2 sit at x-height. Bodoni's digits are all at about 1500, the cap height.

**Character coverage** (troika's `supportsCodePoint`):

- **All five fonts:**
  - Printable ASCII is complete.
  - Latin-1 is complete except U+00AD (soft hyphen).
  - Present: ° · NBSP – — ‘ ’ “ ” † • … ½ ⁄ ẞ æ œ.
- **Baskervville (all three):**
  - Lacks 19 Latin Extended-A letters: Ĉĉ Ĕĕ Ĝĝ Ĩĩ Ĭĭ Ĵĵ ĸ ŉ Ŏŏ Ŝŝ ſ.
  - Lacks U+2009 (thin space), U+200A (hair space), U+200B–U+200D, U+2010/2011 (hyphens), ′ ″ (primes), →, №, ⅓ and ⅛.
  - None of these is needed for English, Spanish, French or Portuguese place names of 1805.
- **Bodoni Moda (both):**
  - Full Latin Extended-A including ſ, plus thin and hair space, U+200B, U+2010/2011 and №.
  - Lacks U+00AD, U+200C/D, primes, arrows, ⅓ and ⅛.

**Console noise:** while parsing these fonts, Typr logs `console.debug` messages such as "unsupported GPOS table LookupType 5 format 1" and "unsupported GSUB table LookupType 6 format 1". They are debug level, not errors; Playwright reports them with type `debug`.

**Timings** (indicative only: this Windows machine, headless Chromium, renderer string masked):

| measurement | result |
|---|---|
| Parse in Node | 1–5 ms per font (16 ms for the first, including warm-up) |
| 20 labels in two fonts, cold sync | about 100 ms |
| `preloadFont` for 3 fonts × about 75 characters, cold | 465 ms |
| A further label after preloading | 4 ms |

---

## 2. Same-origin safety

### 2.1 Everything troika can fetch from another host (high, verified)

**(a) The unicode-font-resolver fallback. This is the only live cross-host path.**

- Default data URL: `https://cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver@v1.0.1/packages/data`. It is inside the bundled client (libs/unicode-font-resolver-client.factory.js:6) and in the ESM bundle at dist/troika-three-text.esm.js:453.
- It is called from `FontResolver.js:210-240` in two cases:
  - no user fonts at all (FontResolver.js:205-207);
  - a character that no user font covers (FontResolver.js:157-165).
- Verified chain in Chromium, all made from the worker and all on cdn.jsdelivr.net:
  1. `codepoint-index/plane0/<block>.json`
  2. `font-meta/latin.json`
  3. `font-files/latin/sans-serif.normal.400.woff` (Noto Sans).
- The text then renders, mixing in that CDN font.

**(b) The "default font".**

- In 0.52.5, `CONFIG.defaultFontURL` is `null` (TextBuilder.js:9-17). A Text with no `font` sends its whole string to path (a).
- In Chromium, a `"Cadiz"` with no font fetched exactly the three jsDelivr files above.
- The README (README.md:152), the docs site and the JSDoc (TextBuilder.js:31) still say "Roboto from Google Fonts CDN". The code comment says "Noto Sans" (Text.js:144).
- The brief's phrase "fetched from Google's CDN" is outdated in detail, but its conclusion stands: the default font is cross-origin.

**(c) Nothing else.**

- The other URLs in the bundle are in comments.
- A WebGLDebugUtils CDN script sits inside a block comment (dist/troika-three-text.esm.js:1918-1938).
- `find-google-font-url.js` is a Node command-line tool that nothing imports.
- webgl-sdf-generator, bidi-js and troika-three-utils do no network I/O.

### 2.2 What does NOT protect you (high, verified)

- **Pointing `unicodeFontsURL` at our own origin.** If any request there fails, the client logs `console.error('unicode-font-resolver: Failed loading from dataUrl "…", trying default CDN. …')` and retries the same file on jsDelivr. This is in the client code and verified in Node case C: the same-origin 404 was followed by a jsDelivr fetch.
- **The client's cache.** It keeps each fetch promise, rejected ones included, keyed only by the relative path (for example `codepoint-index/plane0/0-ff.json`). One failure therefore makes every later lookup in that block fail for the life of the page (observed in Node).
- **A failed fallback.** It leaves an unhandled promise rejection and the sync never completes; the text never appears.
- **There is no switch to disable the fallback** in 0.52.5. None was found in the code, README, docs site or the resolver repository.

### 2.3 `configureTextBuilder` options and per-Text settings (high)

Source: `TextBuilder.js:9-17` and its JSDoc at 26-56.

| option | default | meaning |
|---|---|---|
| `defaultFontURL` | `null` | Font added to every request's font list after the label's own font. It is used for characters the label font lacks, or when `font` is unset. |
| `unicodeFontsURL` | `null` (meaning jsDelivr) | Base URL for the fallback resolver's data. Also settable per Text as `text.unicodeFontsURL` (Text.js:148, 442). |
| `sdfGlyphSize` | 64 | Default SDF square size; must be a power of two; one atlas per size. |
| `sdfMargin` | 1/16 | Margin around each glyph in the SDF, as a fraction of the glyph's size. |
| `sdfExponent` | 9 | Exponential encoding of distances: more precision near the edge. |
| `textureWidth` | 2048 | Atlas width; the atlas grows in height. |
| `useWorker` | `true` | When `false`, typesetting and font parsing run on the main thread, still asynchronously (TextBuilder.js:194, 482). |

Rules and caveats:

- **Call it once, before the first font request.** After the first `getTextRenderInfo` (any sync or `preloadFont`), later calls only `console.warn` and are ignored (TextBuilder.js:57-63, 124).
- **Spelling matters.** The README heading spells the per-Text property `unicodeFontsUrl` (README.md:304), its examples spell it `unicodeFontsURL` (README.md:331, 338), and the code reads only `unicodeFontsURL`. The other spelling is silently ignored.
- **Font order.** The request's list is `[default, user]` (TextBuilder.js:130-138); the resolver reverses it and tries the user font first (FontResolver.js:128-135).
- **The default font loads lazily.** It is fetched only when a character needs it. Verified in Node case H: № in a Baskervville label came from Bodoni, with only same-origin requests.

### 2.4 Recipe: nothing is ever fetched from another host, even for a character the font lacks

1. **Always set `text.font`** to one of the `/fonts/3d/*.woff` URLs.
2. **Set a same-origin default font at module start,** before any sync or `preloadFont`:

   ```ts
   configureTextBuilder({ defaultFontURL: "/fonts/3d/BodoniModa-28pt-Regular.woff" })
   ```

   Bodoni Moda has the wider coverage (2.1). A character missing from a Baskervville label then renders from Bodoni, still on our origin. This is a safety net, not a design choice.
3. **Never hand troika an uncovered character.** This is the real guarantee.
   - **Build-time check.** A Node script loads each WOFF with troika's own parser, as in the scratch `font-check.mjs`, and fails if any label string, date or `preloadFont` character list contains a code point its font and the default font both lack.
   - **Runtime guard.** A small sanitiser, plus a dev assertion against a generated coverage list:
     - ′ → ’ and ″ → ”;
     - thin space (U+2009) and hair space (U+200A) → ordinary space (use letterSpacing for fine spacing);
     - drop U+00AD, U+200B–U+200D, U+2060 and U+FEFF. They are invisible anyway (Typesetter.js:99).
   - **Whitespace caveats (verified in Node, cases F and G).**
     - An uncovered whitespace character inside a string borrows the previous character's font (FontResolver.js:148-153). That avoids a fetch, but troika then uses the font's `.notdef` advance: 0.87 em in Baskervville, so the gap is visibly wrong.
     - The same character at index 0 goes to the CDN.
4. **Keep the existing Playwright checks.** `collectRequests` and `collectErrors` in tests/e2e/helpers.ts:7-21 see the worker's XHR and fetch requests and the worker's console messages (verified with Playwright 1.64.1). scene.spec.ts:24-28 already exempts `blob:` and `data:` URLs.
5. **Leave `unicodeFontsURL` unset.** Setting it to a same-origin path does not prevent the leak (2.2). At most it makes a regression show up first as a same-origin 404 with a console error.

### 2.5 Workers, `blob:` URLs and CSP (high, verified)

**How the workers are created:**

- `supportsWorkers()` first creates and terminates a test Worker from an empty Blob (troika-worker-utils/src/supportsWorkers.js:6-23).
- The real worker is `new Worker(URL.createObjectURL(new Blob([bootstrap])))` (troika-worker-utils/src/WorkerModules.js:131-160).
- Inside it, each module function is rehydrated with `importScripts(blob:…)` (workerBootstrap.js:81-98).
- There is no `eval` or `new Function` anywhere. The main-thread fallback calls the init functions directly (mainThreadFallback.js:6-43).

**What Chromium and Playwright show:**

- About 15 `blob:http://<origin>/<uuid>` entries in `page.on("request")`. They are same-origin by construction.
- The existing same-origin test already skips them.

**Does it matter for a static site with no CSP?**

- No.
- If a CSP is ever added, it would need `worker-src blob:` and `script-src blob:` (a blob worker inherits the page's policy, which governs its `importScripts`), plus `connect-src 'self'`. It would not need `'unsafe-eval'`.
- The alternative under a CSP is `useWorker: false`.

**Other workers:**

- If GPU SDF generation fails, troika generates SDFs in JavaScript on up to four more blob workers, terminated after 2 s idle (SDFGenerator.js:68-128). This happens whatever `useWorker` says.
- In our runs the GPU path worked; there was no "WebGL SDF generation failed" warning.

---

## 3. BatchedText

**Status (high):**

- Present and exported in 0.52.5: `src/BatchedText.js`, `src/index.js:6`; the dist export was verified in Node.
- Marked `@experimental` (BatchedText.js:39-49); introduced as "ALPHA" in 0.50.0 (CHANGELOG.md:133-139).
- Not on the docs site and missing from dist/types.

**API (high, from code):**

- `new BatchedText()`.
- `batch.add(...objects)`:
  - Text instances become **members**. They are held in a Map, not as scene-graph children.
  - Any other Object3D becomes an ordinary child (BatchedText.js:75-98).
- `addText(text)` and `removeText(text)` (103-121).
- `batch.sync(cb)`: syncs dirty members, then repacks, then fires `synccomplete` and calls `cb` (258-333). As with Text, `cb` fires only if something was dirty.
- `batch.material`: one base material for every member; members' `material` is ignored (39-49).
- `batch.color`: fallback colour for members without one (226-229).
- `dispose()` also disposes the data textures (344-347).

**Member transforms (high):**

- A member's own `matrix` is used, relative to the batch. Troika calls `updateMatrix()`; the world matrix is ignored (138-147, 193-197).
- So position members in batch-local coordinates, and add only the batch to the scene.

**Per-member data is packed into a float DataTexture,** 32 floats per member (BatchedText.js:12-34, 162-256).

**What may differ between members:**

| differs per member | shared by the whole batch |
|---|---|
| position, rotation, scale | material (opacity, blending, depthTest/Write, side, fog, toneMapped) |
| text and every layout property: **font**, fontSize, letterSpacing, lineHeight, maxWidth, anchors, textAlign, direction (verified: mixed fonts in one batch, 1 draw call) | **sdfGlyphSize**: the batch takes its atlas and size from the *last* member's textRenderInfo (BatchedText.js:290-295), so mixing sizes breaks |
| colour (with the bug in 3.1), stroke colour | orientation, depthOffset, glyphGeometryDetail, debugSDF |
| **fillOpacity** (verified: 0.3 gives peak 76/255 for that member only) | renderOrder, frustum culling (one union bounding sphere, 138-147) |
| curveRadius (verified, used for arcs in 5.3) | — |
| clipRect, strokeWidth/Opacity, outline width/colour/opacity/blur/offsets | — |

**Ignored:**

- `member.visible` (verified: no effect).
- Hide a member with `scale.setScalar(0)` (verified), `fillOpacity = 0`, or `removeText` (which triggers a repack).
- `colorRanges`: the glyph-colour attribute is not batched. If the last member had colorRanges, the shader would read a missing attribute and the text would turn black. Don't mix them.

**Limits (high):**

- Needs WebGL2 or `OES_texture_float` (BatchedText.js:48, 173-179).
- Member index is stored as Uint16, so at most 65,535 members (284).
- The data texture is at most 1024 texels wide (172).

**Per-frame CPU cost (medium; the closures are visible in the code):**

- O(members): `_prepareForRender` replays each member's `Text._prepareForRender` and compares its 32 floats; `updateBounds` runs on every `updateMatrixWorld`.
- A couple of closures are allocated per frame. This is minor for about 100 labels.
- The texture is re-uploaded only when a packed value changes.

**Draw calls (high, verified):**

| setup | draw calls |
|---|---|
| 20 separate Texts | 20 (316 triangles) |
| 20-member BatchedText | 1 (same 316 triangles) |
| an outline on one member | 2 (outline and main passes via geometry groups: Text.js:539-559, GlyphsGeometry.js:62-65, BatchedText.js:150-156) |
| a member's layout changed | the batch re-synced itself on render and stayed at 1 call |

### 3.1 Colour bug in 0.52.5, and the workaround (high, verified)

**The bug:**

- Colours are packed as sRGB hex with `tempColor.set(c).getHex()` (BatchedText.js:230 and 247). three's `getHex()` returns sRGB (three/src/math/Color.js:539-545).
- The GLSL unpacks them as `byte/256` with no sRGB-to-linear step (BatchedText.js:428-430). Three then encodes to sRGB again on output.
- Result: ink #6b5a45 rendered as **[173,160,142]** in a batch, against **[107,90,69]** for a plain Text in the same frame.
- This affects member colours, `batch.color` and the material colour alike, since they all go through the same packing.

**Upstream:** fixed in 0.53.0 by commit b6565f4, which divides by 255 and applies `sRGBTransferEOTF` when `ColorManagement.enabled`.

**Workaround on 0.52.5** (verified: renders [107,90,68]): pre-encode the colour, so that the bytes troika packs carry the linear values that the shader reads.

```ts
import { Color, SRGBColorSpace } from "three";

const lin = new Color();
/** troika 0.52.5 BatchedText reads its packed sRGB bytes as linear: feed it linear values in disguise. */
export function batchColor(hex: number): Color {
  lin.set(hex); // three converts the sRGB hex to linear working values
  const k = 256 / 255;
  return new Color().setRGB(
    Math.min(1, lin.r * k),
    Math.min(1, lin.g * k),
    Math.min(1, lin.b * k),
    SRGBColorSpace,
  );
}
// member.color = batchColor(0x6b5a45)   // drop this helper if the project moves to 0.53.0
```

**Also fixed upstream:** 0.53.0 fixes "BatchedText not rendering due to empty drawRange" (commit f29e40e). The commit doesn't say when this happens, and it did not occur in our runs on 0.52.5.

---

## 4. Materials

### 4.1 How Text builds its material (high, verified)

**The derivation:**

- `text.material` is a getter (Text.js:524-560). It derives `createTextDerivedMaterial(base)` (Text.js:518-520) from the material you assigned.
- If none was assigned, it derives from a per-instance clone of the default `MeshBasicMaterial({color: 0xffffff, side: DoubleSide, transparent: true})` (Text.js:16-20, 526).
- The derivation is troika-three-utils `createDerivedMaterial(base, {chained: true, …})` (TextDerivedMaterial.js:208-254). It creates the derived material with `Object.create(base)` (troika-three-utils/src/DerivedMaterial.js:142-167).
- So any property the derived material does not override reads through to the base, and later changes to the base (opacity, depthWrite, fog and so on) are picked up.
- The README's warning that changes to your original material are not reflected (README.md:198-214) is stale for those properties.
- Verified: `depthWrite: false` on the base showed on the derived material.

**Own properties of the derived material, which the base cannot change:**

| property | why |
|---|---|
| `uniforms`, `defines`, `extensions`, `id`, `uuid` | set by the derivation |
| `transparent = true` | forced (TextDerivedMaterial.js:256-257) |
| `forceSinglePass = true` | forced (TextDerivedMaterial.js:259-260) |
| `polygonOffset`, `polygonOffsetFactor`, `polygonOffsetUnits` | rewritten every frame from `text.depthOffset` (Text.js:666-667) |
| `color` | set while `text.color` is set (Text.js:669-680) |

**Programs and warm-up:**

- Each Text gets its own derived *instance*, but they share one GL program. The cache key is the base key plus the options key (DerivedMaterial.js:187-193; the define `TROIKA_DERIVED_MATERIAL_<n>` at 160).
- `renderer.compile` / `compileAsync` read `object.material`, which triggers the derivation and `onBeforeCompile` (three/src/renderers/WebGLRenderer.js:1458-1492).
- Warm-up works **before** the text has synced. Verified: 2 programs after `compile`, still 2 after the first render.

**Allocations, disposal and type:**

- With an outline set, the getter returns a **new** `[outline, main]` array on every read (Text.js:553-556): a per-frame allocation. Avoid outlines; halos would read as the avoid-listed drop shadows anyway.
- `text.dispose()` frees only the geometry (Text.js:499-501). Dispose the base material to release the derived ones (Text.js:530-533).
- The derived material reports the base's `type` (DerivedMaterial.js:173-176) and carries `isTroikaTextMaterial` (TextDerivedMaterial.js:262-275).

### 4.2 Adding your own GLSL and uniforms

**(a) Preferred: give Text a derived base material** (verified). Build it with `createDerivedMaterial` from troika-three-utils and assign it to `text.material`.

- **Vertex order.** The final shader runs the outer derivation's transform first. So your `vertexTransform` runs **after** troika's glyph layout and sees every glyph vertex in the text's local space; in a BatchedText, in the batch's local space after the member matrix.
- **Verified:** a `position.x += 100.0` moved the lit columns from 58–141 to 158–241, a clean shift.
- **Fragment order in a base material.** Both `fragmentColorTransform` and `fragmentMainOutro` run **before** troika's own colour transform (fill opacity, edge alpha, discard: TextDerivedMaterial.js:179-202). They also run before three's post chunks (tonemapping, colorspace, fog, premultiplied_alpha, dithering), so they work on **linear** values.
  - The reason: troika's text derivation is applied *after* yours, and it pulls the post chunks out of the inner `main` and appends them after its own transform (DerivedMaterial.js:315-346; three meshbasic.glsl.js:108-113).
- **Fragment order on top of the text material.** A derivation added by overriding `createDerivedMaterial` (option b) runs its `fragmentMainOutro` **after** the post chunks, on the final sRGB value. This holds even with a `customRewriter`, as long as that derivation has no `fragmentColorTransform` (which would hoist the chunks again).
- **Measured** by setting `gl_FragColor.rgb = vec3(0.5)` at each hook and reading the pixel; 188 means linear (encoded afterwards), 128 means sRGB:

  | hook | pixel read |
  |---|---|
  | base `fragmentColorTransform` | 188 |
  | base `fragmentMainOutro` | 188 |
  | outer `fragmentMainOutro` | 128 |
  | outer `fragmentMainOutro` + `customRewriter` | 128 |

- **Built-ins:** `modelMatrix` and `cameraPosition` are available in the vertex code (verified). Vertex hooks in an *outer* derivation run *before* troika's layout, on the raw unit quad, so keep vertex work in the base material.
- **Uniforms:** keep the uniform objects. Passing an existing `{value}` object, for example one shared with the terrain material, makes both update together.

**(b) Subclass and override `createDerivedMaterial(base)`** (Text.js:518-520, added in 0.50.0), then derive on top of the text material with `customRewriter` to edit troika's own GLSL. This is how BatchedText itself works (BatchedText.js:126-128, 356-464), and it is used for the arcs in 5.3 (verified).

**(c) `onBeforeCompile` (avoid if you can):**

- **On the base material** it runs *first*, before troika's upgrade (DerivedMaterial.js:114). The base's `customProgramCacheKey` must change whenever the injected code changes.
- **On the derived material** it is stored as a post-hook that runs after troika's upgrade (DerivedMaterial.js:136-139, 195-202). It is *not* part of the program key (DerivedMaterial.js:187-193), so two texts with different hooks would share one program.

**A ShaderMaterial as the base:**

- Only GLSL1-style (the default `glslVersion`) works. Troika injects `attribute`, `varying`, `texture2D` and `gl_FragColor`, which three maps under WebGL2 only in that mode (three/src/renderers/webgl/WebGLProgram.js:808-829).
- **The chart's own materials are GLSL3** (src/components/chart/shaders/common.ts:2), so never use them as a text base.
- A ShaderMaterial base must declare `uniform vec3 diffuse` for `text.color` to take effect (TextDerivedMaterial.js:237-253). RawShaderMaterial is not supported.

### 4.3 Haze and a scroll-driven reveal for the chart lettering

The chart shaders write sRGB straight to the canvas and mix haze in sRGB (src/components/chart/shaders/common.ts:5-7; terrain/shaders.ts:139-142, 240-242). The text's haze must therefore be mixed *after* three's colour-space chunk, using the **same uniform objects** as the terrain. As measured in 4.2, that means two layers:

- the per-vertex distance goes in a derived **base** material;
- the sRGB mix goes in a `fragmentMainOutro` **on top of** the text material.

Code sketch (medium confidence: the hook order is verified, the haze GLSL is simplified):

```ts
import { type Material, MeshBasicMaterial, type Vector3 } from "three";
import { BatchedText } from "troika-three-text";
import { createDerivedMaterial } from "troika-three-utils";

// Shared once at module level, so every label (and the terrain) updates through the same objects.
// `terrainUniforms` stands for the terrain ShaderMaterial's `uniforms` (terrain/shaders.ts names).
export const lettering = {
  uHazeColor: terrainUniforms.uHazeColor as { value: Vector3 }, // sRGB, as in the chart shaders
  uHazeVisibility: terrainUniforms.uHazeVisibility as { value: number },
  uReveal: { value: 1 },
};

// Inner layer (the base material): vertex work after troika's layout.
export const letteringBase = createDerivedMaterial(
  new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, fog: false }),
  {
    vertexDefs: "varying float vDist;",
    vertexTransform: "vDist = length((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);",
  },
);

// Outer layer: fragment work on the final sRGB colour, exactly like terrain/shaders.ts.
const HAZE_OUTER = {
  chained: true,
  uniforms: lettering,
  fragmentDefs: "uniform vec3 uHazeColor; uniform float uHazeVisibility; uniform float uReveal; varying float vDist;",
  fragmentMainOutro:
    "float hx = vDist / uHazeVisibility; gl_FragColor.rgb = mix(gl_FragColor.rgb, uHazeColor, 1.0 - exp(-hx * hx)); gl_FragColor.a *= uReveal;",
};
export class ChartBatchedText extends BatchedText {
  override createDerivedMaterial(base: Material): Material {
    return createDerivedMaterial(super.createDerivedMaterial(base), HAZE_OUTER);
  }
}
// const batch = new ChartBatchedText(); batch.material = letteringBase;
// For arcs as well, put `customRewriter: inPlaneArc` (5.3) in the same outer options;
// with no fragmentColorTransform, the outro still runs after the colorspace chunk (verified).
```

**Reusing the chart's haze GLSL:** the chart's `hazeColorFor()` and other functions that use only uniforms can be injected into `fragmentDefs`. Three compiles GLSL1-mode materials as `#version 300 es` on WebGL2, so `texture()` works. Do not inject `in`/`out` declarations.

**Reveal options:**

| scope | how |
|---|---|
| per label | `text.fillOpacity` (a uniform on a plain Text; packed per member in a BatchedText, verified) |
| per material | a uniform such as `uReveal` above (verified: alpha 255 → 127 → 0) |
| per batch | `material.opacity` |

**Night light:** for the lighting states, a shared uniform tint in the lettering material is cheaper than rewriting member colours, which would repack the batch.

### 4.4 Depth, `depthOffset`, `renderOrder` and `polygonOffset` (high)

**`depthOffset`:**

- Sets `polygonOffset = !!depthOffset` and `polygonOffsetFactor = polygonOffsetUnits = depthOffset` every frame (Text.js:666-667). Negative values pull toward the camera (README.md:125-131).
- It overrides any `polygonOffset` you set on the base material.
- three r186 negates the factor only with a reversed depth buffer (three/src/renderers/webgl/WebGLState.js:860-883).
- The engine uses a standard depth buffer (src/components/chart/engine/Chart.ts:127-133), so `depthOffset` behaves normally. It would do nothing if a logarithmic depth buffer (which writes `gl_FragDepth`) were ever enabled.

**`renderOrder`:**

- Text is always in the transparent pass because `transparent` is forced, and it sorts by `renderOrder` as usual.
- Current WIP chart orders: Terrain 0 (terrain/Terrain.ts:117), Sky 10 (sky/Sky.ts:91), Rivers 20 (lines/Rivers.ts:43), Route 21 (lines/Route.ts:108).
- Put lettering at about 30 if names should overprint routes, or about 15 if routes should overprint names.

**Recommended depth setup:**

- Base material: `depthTest: true` (mountains in front hide names), `depthWrite: false`.
- Sea labels: a small lift above the sea plane plus `depthOffset` of −1 or −2.

### 4.5 Colour per text and three's colour management (high, verified)

**Plain Text:**

- `text.color` sets the derived material's own Color with `Color.set` (Text.js:669-680), which converts an sRGB hex to linear working space (three/src/math/Color.js:149-216). `ColorManagement.enabled` is `true` by default (three/src/math/ColorManagement.js:21).
- MeshBasicMaterial encodes back to sRGB on output.
- Verified: #6b5a45 rendered exactly [107,90,69] on the canvas.

**Not colour-managed in 0.52.5:**

- BatchedText colours (see 3.1).
- `colorRanges`: raw bytes are divided by 255 and used as linear (TextDerivedMaterial.js:248; TextBuilder.js:147-159).

**Tone mapping:** MeshBasicMaterial is tone-mapped when drawing to the canvas if `renderer.toneMapping` is not `NoToneMapping` (three/src/renderers/webgl/WebGLPrograms.js:177-187). Set `toneMapped: false` on the base to keep exact ink colours.

**Render targets:** into a non-XR render target, programs write linear working colour (WebGLPrograms.js:213). A final pass must then encode to sRGB.

---

## 5. Layout and typography

### 5.1 Properties (high unless marked)

**Anchors** (Typesetter.js:366-396):

- `anchorX`: a number (local units, measured from the left edge), `'left'`, `'center'`, `'right'`, or `'N%'` of the block width.
- `anchorY`: a number (local y from the top of the block; down is negative), `'top'`, `'top-baseline'`, `'top-cap'`, `'top-ex'`, `'middle'`, `'bottom-baseline'`, `'bottom'`, or `'N%'`.
- `'middle'` centres the *line box*, including half-leading. For an optical centre, shift by `visibleBounds` after sync.
- For a single cap-height line, `'middle'` happens to land within about 0.1 em of the caps' centre in both families (verified: Baskervville caps span −3.6 to +3.7 at fontSize 10).

**letterSpacing is in ems** (high, verified):

- Troika adds `letterSpacing × fontSize` after every glyph (FontParser.js:390-392; Typesetter.js:259, 326, 330; dist/troika-three-text.esm.js:408, 1053, 1057).
- README.md:184-188 and the docs site say "local world units". The package wins.
- Verified: "CADIZ" at fontSize 10 with letterSpacing 0.2 is 8.0 units wider (4 gaps × 0.2 × 10).
- Trailing spacing is not counted in the width (Typesetter.js:335-345), so centred labels stay centred.
- Widely spaced ocean capitals: about 0.25–0.5.

**Other properties:**

- `lineHeight`: `'normal'` = (ascender − descender + lineGap) / UPM (Typesetter.js:229-230), which is 1.293 em for Baskervville and 1.525 em for Bodoni. A number means a multiple of `fontSize`.
- `maxWidth`: default `Infinity`, so no wrapping. It wraps after whitespace (except NBSP), hyphen-minus, soft hyphen and dashes (Typesetter.js:101-106, 279-312); `overflowWrap: 'break-word'` allows breaks inside words.
- `textAlign`: `'left'`, `'right'`, `'center'` or `'justify'`; justify applies only to soft-wrapped lines (Typesetter.js:435-461).
- `glyphGeometryDetail`: segments per side of each glyph quad (GlyphsGeometry.js:11-17, 80-92), so triangles = glyphs × 2 × detail². Raise it to 2–4 only for vertex effects (arcs, draping).

**Kerning** (verified on all five fonts):

- Applied from GPOS: pair adjustment (type 2, formats 1 and 2), single adjustment (1), mark-to-base (4) and mark-to-mark (6) (FontParser.js:165-251).
- Extension lookups are unwrapped by Typr (libs/typr.factory.js:5).
- The legacy `kern` table is used only when there is no GPOS (FontParser.js:253-264).
- Kerning applies within one font run only.
- All GPOS type-1 lookups are applied regardless of feature (FontParser.js:174-188). So Baskervville's `cpsp` (capital spacing: +10 units of placement and advance) applies to every capital, even in mixed case. That is about 0.01 em per side: negligible, and right for spaced capitals.

**Substitutions:**

- Only `rlig liga mset isol init fina medi half pres blws ccmp` are applied (FontParser.js:137). The joining features act only for Arabic-type joining.
- **Not available from these fonts:** `smcp`/`c2sc` (small caps), `onum`/`lnum`/`pnum`/`tnum`, `dlig`/`hlig` (Bodoni's ſt), `calt`, `ss01`–`ss04`, `frac`, `ordn`, `case`.
- Ligatures cannot be switched off. The usual breaker, U+200C, is in none of the fonts and would trigger the CDN fallback.
- The `liga` sets that troika applies:
  - Baskervville: ff fi fl fb fh fj fk ffi ffl ffb ffh ffj ffk (+ ft fft in the Italic).
  - Bodoni: ff fi fj fl ffi ffl.
- Letter-space capitals only; tracked lowercase would keep these pairs tight.

**Default figures:** Baskervville is old-style and Bodoni lining (section 1). Troika cannot switch them.

### 5.2 sdfGlyphSize: crisp at large and small sizes

**What the setting does:**

- It must be a power of two, and each size has its own atlas texture shared by all fonts (TextBuilder.js:65-80, 163-189).
- Anti-aliasing uses screen-space derivatives: `fwidth` in `troikaGetAADist`, TextDerivedMaterial.js:115-126. So edges stay sharp when magnified; the SDF size only limits corners and thin strokes.

**At large sizes (verified visually):**

- See `sdf-compare.png` and `sdf-zoom-A.png` in the scratch browser folder.
- Bodoni Moda at about 150 px em at **64**: the hairlines (A's thin stroke, N's thin strokes, the serifs, C's thin part) break into dashes.
- At **128**: continuous.
- So use **128 for every Bodoni label** and **64 for Baskervville**. Put each size in its own BatchedText (section 3).

**Atlas memory (high):**

| sdfGlyphSize | initial atlas | holds | RGBA8 size |
|---|---|---|---|
| 64 | 2048×128 | 256 glyphs | about 1 MB |
| 128 | 2048×512 | 256 glyphs | about 4 MB |

- Each atlas also has a same-sized drawing buffer in troika's own WebGL canvas.
- The atlas doubles in height when full, logs `console.info` and re-uploads (TextBuilder.js:258-268).

**At small sizes (medium):**

- The atlas has no mipmaps (`generateMipmaps = false`, LinearFilter: TextBuilder.js:176-187).
- In our render, Baskervville Italic was illegible at 8 px em, marginal at 10 px and clean from about 12 px (DPR 1).
- At the owner's DPR 1.5, about 10–12 CSS px is the floor.
- Fade labels out below their legible size; tiny SDF text also shimmers in motion.

### 5.3 curveRadius vs names that follow a curve on the chart

**`curveRadius` bends the text out of its plane** (high). The bend in TextDerivedMaterial.js:47-52 maps x to xz, wrapping the text around a vertical cylinder like letters on a can. On a chart lying flat, that lifts letters off the surface.

**In-plane arcs.** Rewrite troika's bend line into a polar warp within XY (verified for Text and for per-member radii in a BatchedText; see `arc-compare.png`):

```ts
import type { Material } from "three";
import { BatchedText, Text } from "troika-three-text";
import { createDerivedMaterial } from "troika-three-utils";

// Matches the bend whatever later derivations renamed `position` to (BatchedText renames it).
const BEND = /(\w+)\.xz = vec2\(sin\(angle\) \* rad, rad - cos\(angle\) \* rad\);/;
const NORMAL_BEND = /(\w+)\.xz = vec2\(sin\(angle\), cos\(angle\)\);/;
function inPlaneArc(s: { vertexShader: string; fragmentShader: string }) {
  if (!BEND.test(s.vertexShader)) throw new Error("troika curve GLSL changed; recheck after upgrading");
  return {
    vertexShader: s.vertexShader
      .replace(BEND, (_m, p) => `${p}.xy = vec2(sin(angle) * (rad + ${p}.y), cos(angle) * (rad + ${p}.y) - rad);`)
      .replace(NORMAL_BEND, ""),
    fragmentShader: s.fragmentShader,
  };
}
export class ArcText extends Text {
  override createDerivedMaterial(base: Material): Material {
    return createDerivedMaterial(super.createDerivedMaterial(base), { chained: true, customRewriter: inPlaneArc });
  }
}
export class ArcBatchedText extends BatchedText {
  override createDerivedMaterial(base: Material): Material {
    return createDerivedMaterial(super.createDerivedMaterial(base), { chained: true, customRewriter: inPlaneArc });
  }
}
// curveRadius > 0: the name bows toward +y (centre below); < 0: it sags; 0: straight.
```

Caveats for the arc rewrite:

- **The regex looks for the exact GLSL.** The literal line is `position.xz = …` in a plain Text and `troika_position_<n>.xz = …` inside BatchedText, because a later derivation renames `position` (troika-three-utils/src/DerivedMaterial.js:381).
- Set `glyphGeometryDetail` to 4 so glyphs bend smoothly.
- Troika's bounds assume the cylinder (GlyphsGeometry.js:130-155), so set `frustumCulled = false` or pad the bounds.
- Re-verify after any troika upgrade; the guard throws if the GLSL changes.

**Names along an arbitrary polyline** (rivers; medium, untested): use one member per glyph in a BatchedText. Take each glyph's x from a straight layout's `caretPositions` (4 floats per character: start x, end x, bottom y, top y; Typesetter.js:510-529), then place the member at that distance along the path, rotated to the local tangent.

### 5.4 `textRenderInfo` after sync (high, verified in Node and Chromium)

Fields delivered (TextBuilder.js:284-303):

| field | notes |
|---|---|
| `parameters` | the normalised input arguments |
| `sdfTexture`, `sdfGlyphSize`, `sdfExponent` | the atlas and its encoding |
| `glyphBounds` | Float32Array, [minX, minY, maxX, maxY] per glyph |
| `glyphAtlasIndices` | a **Uint16Array**, not Float32Array as typed |
| `glyphColors?` | only with `colorRanges` |
| `caretPositions` | always requested by Text (Text.js:439) |
| `chunkedBounds` | |
| `topBaseline` | y of the first line's baseline |
| `blockBounds` | [minX, minY, maxX, maxY] of the line boxes (Typesetter.js:630-635) |
| `visibleBounds` | the ink |
| `timings` | |

**`ascender`, `descender`, `lineHeight`, `capHeight` and `xHeight` are present as keys but `undefined`.**

- The typesetter's result no longer carries them (Typesetter.js:618-638; dist/troika-three-text.esm.js:1345-1365), yet TextBuilder still copies them (TextBuilder.js:294-298; dist/troika-three-text.esm.js:1877-1881).
- Take metrics from the table in section 1, or from `visibleBounds`.

---

## 6. Orientation: lettering lying on a tilted chart

**Lying flat** (high):

- Text puts glyphs in its local XY plane, facing +Z. The default `orientation` is `'+x+y'` (Text.js:362-371).
- The chart world is x east, y north, z up, in Mercator km (src/components/chart/shaders/common.ts:4-5).
- So the default **already lies flat** on the chart: baselines run east, tops point north, faces point up. No `rotation.x` is needed.
- For a bearing, rotate about z: `text.rotation.z = θ` (radians, anticlockwise from east).
- `fontSize` is in world units, i.e. km: `fontSize = 12` is an em 12 km tall.

**Avoid other `orientation` values** (high): troika applies them in the shader (`uTroikaOrient`, TextDerivedMaterial.js:54-55; Text.js:682-698), but computes bounds for XY (GlyphsGeometry.js:130-155), so frustum culling goes wrong. Use object rotation instead.

**Culling and lifted glyphs** (high):

- three r186 culls a Mesh with `frustum.intersectsObject`, using `geometry.boundingSphere` (three/src/objects/Mesh.js:226-230; three/src/math/Frustum.js:146-166).
- Troika's sphere is flat at z=0 (GlyphsGeometry.js:149-152) and stays empty until the first sync.
- If a shader lifts or drapes glyphs, pad the sphere in a `synccomplete` handler, or turn culling off for those labels.

**Legibility from a tilted camera:**

- Edges stay sharp under foreshortening thanks to derivative-based anti-aliasing (high). Strokes running toward the horizon thin out.
- Mitigations (medium):
  - slightly larger `fontSize` and tracking for labels seen at low pitch;
  - SemiBold for far place names;
  - fade labels whose surface is seen at a grazing angle (small dot of normal and view direction) using `fillOpacity`;
  - show labels by scale band, as map engines do.
- **Design point for decisions.md:** the Stage A flight opens low off Cape Trafalgar looking **east**, so north-up names read sideways, with baselines running away from the camera. Two options:
  - accept it, as a real chart on a table looks;
  - rotate the few names in focus about z toward the camera heading, eased per beat and without roll.

**Relief** (medium):

- Sea names sit on the flat sea; lift them slightly and use `depthOffset` (section 4.4).
- Land names must follow the exaggerated relief:
  - **CPU:** set `z = height × exaggeration(t)` per label each frame.
  - **GPU:** drape in the lettering material's `vertexTransform` (which runs after troika's layout, verified). Sample the chart's own terrain-field textures with the same exaggeration uniform as the terrain, using `glyphGeometryDetail` 2–4 and padded bounds. This is untested here.

---

## 7. sync, events, preloading, and knowing all text is ready

**`sync(callback)`** (high, verified):

- Every layout setter sets `_needsSync` (Text.js:782-796).
- `sync(cb)` starts a sync only if `_needsSync` is set. If a sync is already in flight, `cb` is queued for the follow-up sync (Text.js:410-475).
- **If nothing changed, `cb` never fires** (README.md:354). Verified: a second `sync(cb)` timed out.
- `onBeforeRender` calls `sync()` every frame (Text.js:483-490), so a Text updates itself asynchronously a frame or more later.
- After a sync completes, troika requests no render; our gsap.ticker loop covers that.

**Events** (high):

- `syncstart` and `synccomplete` fire on every sync (Text.js:419, 468).
- `textRenderInfo` is already set when `synccomplete` fires (Text.js:447).
- BatchedText's sync waits for its members, repacks, then fires (BatchedText.js:258-333).

**`preloadFont({font, characters, sdfGlyphSize}, cb)`** (high):

- It equals `getTextRenderInfo({font, sdfGlyphSize, text: characters joined by "\n"}, cb)` (TextBuilder.js:396-399).
- It loads and parses the font and writes the glyph SDFs into the atlas for that size.
- It honours ligatures, so the characters must be listed as they occur.
- It uses `defaultFontURL` and `unicodeFontsURL`, so its characters must pass the coverage check too.
- The bundled d.ts wrongly marks `sdfGlyphSize` as required (TextBuilder.d.ts:180-184).
- Preload with the same `sdfGlyphSize` the labels use, or it warms the wrong atlas.

**Readiness sketch for the first frame and for screenshots** (the mechanics are verified; the code is a sketch):

```ts
function synced(obj: Text, ms = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`lettering never synced: "${obj.text}"`)), ms);
    obj.sync(() => { clearTimeout(timer); resolve(); });   // call once, right after setting properties
  });
}

// 1. configureLettering() at module start (section 2.4); 2. build every Text, add members to batches
await Promise.all([...batches, ...singles].map((o) => synced(o)));   // fonts, layout, SDFs done
await renderer.compileAsync(scene, camera);                          // can also run before the syncs
for (const tex of new Set(allTexts.map((t) => t.textRenderInfo?.sdfTexture))) if (tex) renderer.initTexture(tex);
renderer.render(scene, camera);   // first frame creates BatchedText data textures; do it before reveal
```

**After load:**

- Never change layout properties while scrolling: no text, font, fontSize, letterSpacing or anchor changes.
- A change re-runs typesetting in the worker and SDF generation on the main thread, in setTimeout chunks of about 5 ms (SDFGenerator.js:35-66). A new glyph can also grow and re-upload the atlas (TextBuilder.js:258-268).
- Animate only transforms, `fillOpacity` and uniforms.

---

## 8. Compatibility with three r186, TypeScript 7, SSR, and size

### 8.1 three r186 (high, verified in Chromium)

**Declared support:** peer range `three >= 0.125.0` (troika-three-text/package.json:22).

**Every r186.1 hook troika relies on is present:**

| hook | where in r186.1 |
|---|---|
| `material.onBeforeCompile(parameters, renderer)` | WebGLRenderer.js:2248 |
| `customProgramCacheKey` | WebGLPrograms.js:386, 436; Material.js:544-546 |
| per-group `object.onBeforeRender(...)` | WebGLRenderer.js:2158 |
| `forceSinglePass` | Material.js:431; WebGLRenderer.js:2165 |
| GLSL1 compatibility defines under WebGL2 | WebGLProgram.js:808-829 |
| meshbasic post chunks, incl. `colorspace_fragment` | meshbasic.glsl.js:109-113 |

Troika marks those post chunks itself (DerivedMaterial.js:320-323) and handles `MAP_UV` (DerivedMaterial.js:385-389).

**Fixes for recent three releases:**

| version | fix |
|---|---|
| 0.50.0 | `colorspace_fragment` (three r154) |
| 0.50.3 | derived materials under r170 |
| 0.52.4 | custom depth/distance material setters (three r175, #357) |
| troika-three-utils 0.52.5 | no `inout` parameters (#390, Safari/ANGLE Metal) |

**Evidence for r186:**

- No public reports of breakage with three r180–r186 were found.
- Rendering with r186.1 was verified for Text, BatchedText, derived materials and arcs.
- The shader chunk names troika needs are unchanged in r186. three r163+ is WebGL2-only, which is fine.

**Not supported:** WebGPURenderer, since troika patches WebGL programs. That is consistent with the brief's choice of WebGLRenderer.

**Forward risk (low):** chained derivation uses `Object.create(material)`. If three ever moves Material state into `#private` fields, it breaks.

**Extra WebGL contexts:** each SDF atlas lives on its own canvas with a WebGL1 context, one per sdfGlyphSize (TextBuilder.js:169; webgl-sdf-generator/dist/webgl-sdf-generator.mjs:150). Troika regenerates SDFs when that context is restored (TextBuilder.js:332-378) and logs `console.log('Context Lost'/'Context Restored')`.

### 8.2 TypeScript 7.0.2 with moduleResolution "bundler" (high, verified)

**Why the types are not found:**

- troika-three-text/package.json has **no `types`/`typings` and no `exports`**; only `main` (UMD) and `module` (ESM) (package.json:12-15).
- TS resolves `main` → `dist/troika-three-text.umd.js`, finds no `.d.ts` beside it, then no `index.d.ts`, then no `@types`.
- Result: `error TS7016: Could not find a declaration file for module 'troika-three-text'`. Verified with `--traceResolution`, using the project's tsconfig settings: `allowJs`, `skipLibCheck` and `strict` (tsconfig.json:5-12).
- `@types/troika-three-text` does not exist (npm returns 404).

**The bundled `dist/types` are stale and broken:**

- `index.d.ts` does not export BatchedText.
- `Text.d.ts:7` declares `export class Text {` **without extending Mesh**. So `text.position`, `rotation`, `renderOrder` and `addEventListener` don't type-check, and `scene.add(text)` fails.
- `preloadFont` requires `sdfGlyphSize`.
- It references undeclared names (`TypesetParams`, `Texture`, `ClientOptions`, `Vector4`, …), uses `override` without a base class (Text.d.ts:266, 303), and has `readonly get` (Text.d.ts:283, TS1024).
- Mapping `paths` to them gave 4 usage errors with `skipLibCheck: true`, plus 12 internal errors with `skipLibCheck: false` (verified).

**The fix:** a local ambient declaration, for example `src/types/troika-three-text.d.ts`, with **no top-level imports** (otherwise it becomes an augmentation of an untyped module).

- Appendix A has the tested text.
- It type-checks cleanly with TS 7.0.2, strict, with `skipLibCheck` both true and false, against @types/three 0.186.0, and passes Biome 2.5.15 with the project's rules.
- troika-three-utils has the same missing-types problem; the shim covers it.
- Add **troika-three-utils 0.52.5 to package.json** if the code imports it directly. Today it is only a transitive dependency, hoisted by npm.

### 8.3 Server-side rendering (high, verified)

- In plain Node, `require("troika-three-text")` (UMD) and importing `dist/troika-three-text.esm.js` both succeed and leave `window`, `document` and `self` undefined.
- `new Text()` and `new BatchedText()` also work.
- `sync()` throws `ReferenceError: self is not defined` (TextBuilder.js:21-23). Sync only in the browser, after the dynamic import.
- The Typr factory sets `self.window = self` when it first parses a font (libs/typr.factory.js:5), inside the worker. This is harmless.

### 8.4 Bundle size (high for these numbers; real tree-shaking may differ slightly)

Measured with esbuild 0.28.2, minified, three external:

| entry | minified | gzip | brotli |
|---|---|---|---|
| Text, BatchedText, configureTextBuilder, preloadFont | 120.3 KB | **44.5 KB** | 38.7 KB |
| Text only | 114.3 KB | 42.6 KB | 37.1 KB |

Minified bytes by package:

| package | minified |
|---|---|
| troika-three-text (includes Typr, woff2otf + fflate, the unicode client) | 86.6 KB |
| bidi-js | 12.5 KB |
| webgl-sdf-generator | 10.5 KB |
| troika-three-utils | 5.1 KB |
| troika-worker-utils | 4.6 KB |

- That is about 15% of the 300 KB gzip budget for the scene chunk.
- The package declares `"sideEffects": false` (package.json:12), so a bundler can drop unused exports.
- The worker code is built from these same functions at runtime, so it costs no extra download.
- The WOFFs actually used add about 113 KB (Regular, Italic, Bodoni Regular). WOFF is already compressed, so gzip gains little.

---

## 9. Version notes: 0.52.5 vs 0.53.0

**Publication** (high):

- npm shows 0.53.0 published 2026-07-24 14:57 UTC and 0.52.5 at 15:25 UTC the same day. The `latest` tag points to **0.52.5**.
- 0.53.0 has the same package layout (no `types`, no `exports`) and depends on troika-three-utils/worker-utils ^0.53.0.

**What each release contains:**

- 0.52.5, troika-three-text: only "Add .js to imports in BatchedText (#356)" (CHANGELOG.md:6-11).
- 0.52.5, troika-three-utils: the `inout` fix (#390).
- 0.53.0, from the GitHub changelog (medium: one source, not installed or tested here):
  - BatchedText colours under colour management (b6565f4);
  - BatchedText empty drawRange (f29e40e);
  - resolveFonts with a string array;
  - a `preloadFont` language option (#368);
  - new `styleRanges` (inline font, colour, size and vertical alignment).

**Earlier changes that shape today's behaviour:**

| version | change |
|---|---|
| 0.48.0 | unicode fallback fonts from the CDN (#279), the origin of section 2 |
| 0.50.0 | BatchedText (alpha); `createDerivedMaterial` override hook |
| 0.50.1 | `forceSinglePass` instead of a double draw for DoubleSide |
| 0.51.0 | `useWorker` option (#337); BatchedText `fillOpacity` |
| 0.52.0 | BatchedText supports the remaining visual properties |
| 0.52.1–0.52.2 | BatchedText removal and texture-leak fixes |

**Decision needed:** the brief says 0.52.x. Staying on 0.52.5 needs the colour workaround (3.1). Moving to 0.53.0 is a deviation to record in decisions.md, after which this research must be re-verified (in particular the arc rewrite and the colour helper).

---

## 10. Where the docs disagree with the installed package (follow the package)

| topic | docs, README or types say | 0.52.5 code does | confidence |
|---|---|---|---|
| default font | Roboto from Google Fonts CDN (README.md:152; docs site; TextBuilder.js:31 JSDoc); Text.js:144 says Noto Sans | `defaultFontURL: null`, so the whole string is resolved by unicode-font-resolver on **jsDelivr** (Noto Sans "latin") | high, verified |
| letterSpacing units | "local world units" (README.md:184-188; docs site) | multiplied by fontSize, so **ems** | high, verified |
| per-Text property name | `unicodeFontsUrl` (README.md:304; docs property list) | `unicodeFontsURL` (Text.js:148) | high |
| material changes after assignment | "not reflected" (README.md:198-214) | chained prototype: base changes are reflected except for the derived material's own properties (4.1) | high, partly verified |
| `textRenderInfo` metrics | documented and typed (TextBuilder.d.ts; JSDoc TextBuilder.js:94-98) | `undefined` | high, verified |
| `glyphAtlasIndices` type | Float32Array (d.ts) | Uint16Array | high, verified |
| Text class (d.ts) | does not extend Mesh | `class Text extends Mesh` (Text.js:91) | high |
| `preloadFont` `sdfGlyphSize` | required (d.ts:180-184) | optional (TextBuilder.js:143) | high |
| BatchedText | not on the docs site; missing from the d.ts | exported, experimental | high |

---

## 11. Recommended shape for the chart lettering (medium; a synthesis of the above)

**Configuration and fonts:**

- **One lettering module** calls `configureTextBuilder({ defaultFontURL: "/fonts/3d/BodoniModa-28pt-Regular.woff" })` once at import, and owns the font table:
  - places → Baskervville Regular;
  - waters, bays and capes → Baskervville Italic;
  - strong far names → Baskervville SemiBold;
  - oceans → Bodoni Moda Regular at sdfGlyphSize 128.
- **Sanitise and check coverage** for every label string (section 2.4). Add a Node coverage check to `npm run check`; keep the Playwright same-origin and console-error tests.

**Batches:**

| batch | contents | sdfGlyphSize |
|---|---|---|
| A | Baskervville places and waters (members may mix fonts) | 64 |
| B | Bodoni ocean names | 128 |

- Use `ArcBatchedText` for both if any names arc (radius 0 means straight).
- That gives 2–3 lettering draw calls in total.
- Apply the 0.52.5 colour helper (3.1) to every member colour.

**Material:**

- One shared lettering material, in two layers (sections 4.2 and 4.3):
  - **base:** MeshBasic with `depthWrite: false`, `toneMapped: false`, plus a `vertexTransform` for the distance varying (and draping, if used);
  - **outer** (a BatchedText subclass): the sRGB haze in `fragmentMainOutro`, sharing the terrain's uniform objects, a global reveal uniform, and the arc `customRewriter`.
- Per-label `fillOpacity` for staged reveals.
- `renderOrder` about 30, or about 15 if routes should overprint names.

**Placement:**

- Default orientation (flat, north-up), bearings by `rotation.z`, positions in km.
- Small z lift and `depthOffset` −1 over the sea; terrain-following z on land (CPU per label, or a GPU drape).
- Scale-band visibility, plus a fade below about 12 CSS px em.

**Loading:**

- Readiness as in section 7: await syncs, `compileAsync`, `initTexture` on both atlases, one hidden frame.
- Change nothing about layout once scrolling starts.

**Types:** the ambient declaration from Appendix A.

## 12. Open items to check on the owner's laptop (Intel Arc, Chrome)

- Whether troika's GPU SDF path works on Arc, or falls back to the JS workers. Look for the console warning "WebGL SDF generation failed".
- Time from scene-2 mount to all lettering ready.
- Shimmer of small labels while the camera moves.
- Whether north-up names read well enough in the east-looking opening shot (the design point in section 6).
- Whether to stay on 0.52.5 with the workarounds or move to 0.53.0 (section 9).

---

## Sources

**Installed packages (primary; paths under `D:\dev\trafalgar-1805\node_modules`):**

- troika-three-text 0.52.5:
  - README.md, CHANGELOG.md, package.json;
  - src/{index,Text,TextBuilder,FontResolver,FontParser,woff2otf,Typesetter,BatchedText,TextDerivedMaterial,GlyphsGeometry,SDFGenerator}.js;
  - dist/troika-three-text.esm.js; dist/types/*.d.ts;
  - libs/{typr,woff2otf,unicode-font-resolver-client}.factory.js.
- troika-three-utils 0.52.5: src/DerivedMaterial.js, src/voidMainRegExp.js, src/expandShaderIncludes.js, CHANGELOG.md, dist/troika-three-utils.esm.js.
- troika-worker-utils 0.52.0: src/{WorkerModules,workerBootstrap,mainThreadFallback,supportsWorkers}.js, CHANGELOG.md.
- webgl-sdf-generator 1.1.1: README.md, dist/webgl-sdf-generator.mjs.
- three 0.186.1:
  - src/renderers/WebGLRenderer.js;
  - src/renderers/webgl/{WebGLPrograms,WebGLProgram,WebGLState}.js;
  - src/renderers/shaders/ShaderLib/meshbasic.glsl.js;
  - src/materials/{Material,ShaderMaterial}.js;
  - src/math/{Color,ColorManagement,Frustum}.js;
  - src/textures/{Texture,DataTexture}.js;
  - src/objects/Mesh.js.
- @types/three 0.186.0: src/objects/Mesh.d.ts, src/core/Object3D.d.ts.
- typescript 7.0.2 (the compiler used for the checks).

**Repository files read (not modified):**

- docs/scene-02-brief.md
- package.json, tsconfig.json, biome.json, playwright.config.ts
- tests/e2e/helpers.ts, tests/e2e/scene.spec.ts
- public/fonts/3d/README.md and the five WOFFs
- src/components/chart/{engine/Chart.ts, shaders/common.ts, terrain/shaders.ts, terrain/Terrain.ts, sky/Sky.ts, lines/Rivers.ts, lines/Route.ts}

**Web (to explain and date changes; the installed code wins where they differ):**

- npm registry, troika-three-text versions and dates (`npm view`): https://www.npmjs.com/package/troika-three-text?activeTab=versions
- Troika changelog on GitHub (0.53.0 entries): https://github.com/protectwise/troika/blob/main/packages/troika-three-text/CHANGELOG.md
- BatchedText colour-management fix, commit b6565f4: https://github.com/protectwise/troika/commit/b6565f4
- BatchedText empty drawRange fix, commit f29e40e: https://github.com/protectwise/troika/commit/f29e40e
- Issue #356, .js imports in BatchedText: https://github.com/protectwise/troika/issues/356
- Issue #390, inout params on Safari/ANGLE Metal: https://github.com/protectwise/troika/issues/390
- Issue #357, three r175 depth/distance material setters: https://github.com/protectwise/troika/issues/357
- Troika text docs site (last updated 2026-07-24): https://protectwise.github.io/troika/troika-three-text/
- unicode-font-resolver repository: https://github.com/lojjic/unicode-font-resolver
- Default fallback data URL used by the client: https://cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver@v1.0.1/packages/data
- @types/troika-three-text: not published (npm 404): https://www.npmjs.com/package/@types/troika-three-text
- Playwright network events, general background (worker capture was verified empirically): https://playwright.dev/docs/network
- three.js forum thread reporting troika text under WebGPU rendering a white square (pointer only): https://discourse.threejs.org/t/troika-three-text-and-webgpu/55737

---

## Appendix A: ambient declaration for troika 0.52.5 (tested with TS 7.0.2 and Biome 2.5.15)

```ts
// Ambient types for troika-three-text 0.52.5, written against its src/*.js (the package ships no
// "types" field, and its dist/types are stale: Text does not extend Mesh, BatchedText is missing).
// Keep this file free of top-level imports so `declare module` is a declaration, not an augmentation.
declare module "troika-three-text" {
  import type {
    BufferGeometry,
    ColorRepresentation,
    InstancedBufferGeometry,
    Material,
    Mesh,
    Object3D,
    Object3DEventMap,
    Texture,
    Vector2,
    Vector3,
  } from "three";

  export type AnchorX = number | "left" | "center" | "right" | `${number}%`;
  export type AnchorY =
    | number
    | "top"
    | "top-baseline"
    | "top-cap"
    | "top-ex"
    | "middle"
    | "bottom-baseline"
    | "bottom"
    | `${number}%`;
  export type Rect = [minX: number, minY: number, maxX: number, maxY: number];

  /** What 0.52.5 really delivers (TextBuilder.js callback). Font metrics are NOT included. */
  export interface TroikaTextRenderInfo {
    readonly parameters: Readonly<Record<string, unknown>>;
    readonly sdfTexture: Texture;
    readonly sdfGlyphSize: number;
    readonly sdfExponent: number;
    readonly glyphBounds: Float32Array;
    readonly glyphAtlasIndices: Uint16Array;
    readonly glyphColors?: Uint8Array;
    readonly caretPositions?: Float32Array;
    readonly chunkedBounds: ReadonlyArray<{
      start: number;
      end: number;
      rect: Rect;
    }>;
    readonly topBaseline: number;
    readonly blockBounds: Readonly<Rect>;
    readonly visibleBounds: Readonly<Rect>;
    readonly timings: Readonly<Record<string, unknown>>;
  }

  export interface TextEventMap extends Object3DEventMap {
    syncstart: Record<string, never>;
    synccomplete: Record<string, never>;
  }

  export class Text extends Mesh<
    BufferGeometry,
    Material | Material[],
    TextEventMap
  > {
    text: string;
    anchorX: AnchorX;
    anchorY: AnchorY;
    curveRadius: number;
    direction: "auto" | "ltr" | "rtl";
    font: string | null;
    unicodeFontsURL: string | null;
    fontSize: number;
    fontWeight: number | "normal" | "bold";
    fontStyle: "normal" | "italic";
    lang: string | null;
    /** In ems: multiplied by fontSize (FontParser.js), not world units as the README says. */
    letterSpacing: number;
    lineHeight: number | "normal";
    maxWidth: number;
    overflowWrap: "normal" | "break-word";
    textAlign: "left" | "right" | "center" | "justify";
    textIndent: number;
    whiteSpace: "normal" | "nowrap";
    color: ColorRepresentation | null;
    colorRanges: Record<number, ColorRepresentation> | null;
    outlineWidth: number | string;
    outlineColor: ColorRepresentation;
    outlineOpacity: number;
    outlineBlur: number | string;
    outlineOffsetX: number | string;
    outlineOffsetY: number | string;
    strokeWidth: number | string;
    strokeColor: ColorRepresentation;
    strokeOpacity: number;
    fillOpacity: number;
    depthOffset: number;
    clipRect: Rect | null;
    orientation: string;
    glyphGeometryDetail: number;
    sdfGlyphSize: number | null;
    gpuAccelerateSDF: boolean;
    debugSDF: boolean;
    readonly textRenderInfo: TroikaTextRenderInfo | null;
    /** The callback fires only if a sync was actually started by this call. */
    sync(callback?: () => void): void;
    hasOutline(): boolean;
    /** Override hook (0.50+): return a custom derived material. */
    createDerivedMaterial(baseMaterial: Material): Material;
    localPositionToTextCoords(position: Vector3, target?: Vector2): Vector2;
    worldPositionToTextCoords(position: Vector3, target?: Vector2): Vector2;
    dispose(): void;
  }

  /** @experimental Batches member Text objects into one draw call (WebGL2 float textures). */
  export class BatchedText extends Text {
    addText(text: Text): void;
    removeText(text: Text): void;
    add(...objects: Object3D[]): this;
    remove(...objects: Object3D[]): this;
  }

  export class GlyphsGeometry extends InstancedBufferGeometry {
    detail: number;
    curveRadius: number;
  }

  export interface TextBuilderConfig {
    defaultFontURL?: string | null;
    unicodeFontsURL?: string | null;
    sdfGlyphSize?: number;
    sdfExponent?: number;
    sdfMargin?: number;
    textureWidth?: number;
    useWorker?: boolean;
  }

  export function configureTextBuilder(config: TextBuilderConfig): void;
  export function preloadFont(
    options: {
      font?: string | null;
      characters: string | string[];
      sdfGlyphSize?: number;
    },
    callback: (info: TroikaTextRenderInfo) => void,
  ): void;
  export function getTextRenderInfo(
    args: Record<string, unknown>,
    callback: (info: TroikaTextRenderInfo) => void,
  ): void;
  export function createTextDerivedMaterial(baseMaterial: Material): Material;
  export function dumpSDFTextures(): void;
  export function getCaretAtPoint(
    info: TroikaTextRenderInfo,
    x: number,
    y: number,
  ): { x: number; y: number; height: number; charIndex: number } | null;
  export function getSelectionRects(
    info: TroikaTextRenderInfo,
    start: number,
    end: number,
  ): Array<{ left: number; top: number; right: number; bottom: number }> | null;
  export const typesetterWorkerModule: unknown;
  export const fontResolverWorkerModule: unknown;
}

declare module "troika-three-utils" {
  import type { Material } from "three";
  export interface DerivedMaterialOptions {
    defines?: Record<string, string | number | boolean>;
    extensions?: Record<string, boolean>;
    uniforms?: Record<string, { value: unknown }>;
    timeUniform?: string;
    vertexDefs?: string;
    vertexMainIntro?: string;
    vertexMainOutro?: string;
    vertexTransform?: string;
    fragmentDefs?: string;
    fragmentMainIntro?: string;
    fragmentMainOutro?: string;
    fragmentColorTransform?: string;
    customRewriter?: (shaders: {
      vertexShader: string;
      fragmentShader: string;
    }) => {
      vertexShader: string;
      fragmentShader: string;
    };
    chained?: boolean;
  }
  export function createDerivedMaterial<M extends Material>(
    baseMaterial: M,
    options: DerivedMaterialOptions,
  ): M & {
    uniforms: Record<string, { value: unknown }>;
    isDerivedMaterial: true;
    baseMaterial: M;
  };
  export function expandShaderIncludes(source: string): string;
  export const voidMainRegExp: RegExp;
}
```

## Appendix B: scratch experiments (outside the repository) and how to rerun them

All of these live under `C:\Users\User\AppData\Local\Temp\claude\d--dev-trafalgar-1805\81d46a93-68b9-4541-8365-f913ef045b3d\scratchpad\`.

**Node scripts** in `t2-scripts\`, run with `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON <script>`:

| script | what it shows |
|---|---|
| `font-check.mjs` | metrics, coverage, GSUB/GPOS, kerning, letterSpacing units, result keys |
| `font-check2.mjs` | ligature sets, default figures, `cpsp`, `.notdef` |
| `cpsp-check.mjs` | the `cpsp` value record |
| `resolver-check.mjs`, `resolver-check-iso.mjs <0-7>` | troika's FontResolver with stubbed XHR and fetch: which URLs are requested in each case |
| `ssr-check.cjs`, `ssr-check-esm.mjs` | import and construct with no DOM |

**Browser experiments** in `tscheck\browser\`:

- `entry.js` has the modes `basic`, `drawcalls`, `missing`, `nofont`, `preload`, `material`, `sdf`, `arc`, `fill` and `order` (where each fragment hook runs relative to the colour-space chunk). Bundle it with esbuild into `bundle.js`.
- `run.cjs <mode> shell` serves it plus `public/fonts/3d` and drives Chromium through Playwright.
- Screenshots: `sdf-compare.png`, `sdf-zoom-A.png`, `arc-compare.png`.
- Before rebuilding the bundle, recreate the module-resolution junction:

  ```
  cmd /c mklink /J ...\scratchpad\tscheck\node_modules D:\dev\trafalgar-1805\node_modules
  ```

  Remove it afterwards with `cmd /c rmdir`, never a recursive delete.

**TypeScript checks** in `tscheck\` (same junction needed):

- `tsconfig.json` with `src/a.ts`: TS7016 without the shim.
- `tsconfig.b.json`: errors from the shipped dist/types.
- `tsconfig.c.json` with `src/b.ts` and `src/troika-three-text.d.ts`: clean.
- Run `node D:\dev\trafalgar-1805\node_modules\typescript\bin\tsc -p <config>`.
