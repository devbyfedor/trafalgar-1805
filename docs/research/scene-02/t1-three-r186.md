# T1: three.js r186 for the WebGL 2 chart engine

Research notes for scene 2, Stage A. Written 2026-10-25.

## How this was researched

- **Ground truth.** The installed packages are `three` 0.186.1 (`REVISION = '186'`, `node_modules/three/src/constants.js:1`) and `@types/three` 0.186.0. `npm view` on 2026-10-25 shows 0.186.1 (published 2026-09-24) as `latest`, and 0.186.0 as the newest `@types/three`. Every API claim below cites the installed file and line. Paths are relative to `D:\dev\trafalgar-1805\node_modules\`.
- **Experiments.** I checked behaviour in Playwright 1.64.1's bundled Chromium 156.0.8078.4 on the owner's machine (Windows 11, Intel Arc iGPU). I used both the default headless shell (SwiftShader) and the new headless mode (`channel: "chromium"`, which uses the Arc through D3D11). The scripts live outside the repository, in `C:\Users\User\AppData\Local\Temp\claude\d--dev-trafalgar-1805\81d46a93-68b9-4541-8365-f913ef045b3d\scratchpad\t1-probe\`; the list is in section 15.
- **The web.** Migration guide, release notes, specs and Chromium documents were used to explain the code and to date changes. Where they disagree with the installed package, I follow the package and say so (section 14).
- **Confidence levels:**
  - **high:** read in the installed source, and usually also observed in the browser;
  - **medium:** one good source, or a consistent inference from source;
  - **low:** an estimate, or sources that conflict.
- **Engine code.** Observations about `src/components/chart/` refer to commit `d7cb296`, as read at the start. Another agent was editing those files while I worked.

---

## 0. The facts that matter most (short list)

1. **The context always has alpha.** `WebGLRenderer` requests the WebGL context with `alpha: true` regardless of the `alpha` option (`three/src/renderers/WebGLRenderer.js:388-397`). The option only sets the default clear alpha (`webgl/WebGLBackground.js:22`). An opaque `ShaderMaterial` that writes alpha < 1 makes the page show through the canvas: I wrote alpha 0.5 and read back alpha 128. **Always write `alpha = 1.0` for opaque layers.** [high]
2. **No implicit colour conversion for ShaderMaterial.** three defines `linearToOutputTexel()` and, when needed, `toneMapping()`, but never calls them. What the shader writes reaches the sRGB canvas byte for byte: 0.5 gives 128, and `linearToOutputTexel(0.5)` gives 188. In GLSL3 mode `gl_FragColor` is not defined, so the `<colorspace_fragment>` and `<tonemapping_fragment>` includes cannot be used. Call the functions on your own `out` variable. [high]
3. **ImageBitmap textures are never flipped or premultiplied by three or WebGL.** `texture.flipY` and `texture.premultiplyAlpha` are ignored for ImageBitmaps (`webgl/WebGLTextures.js:918-930`; WebGL spec). Orientation and premultiplication must be set in `createImageBitmap(...)`. Verified: with `premultiplyAlpha: "none", colorSpaceConversion: "none"` the bytes arrive unchanged, and texture row 0 is the image's top row. [high]
4. **Warm-up on the owner's GPU needs `compileAsync()` plus one hidden render.** On the Arc (D3D11, new headless), 6 heavy ShaderMaterials cost 663 to 866 ms on the first frame with no warm-up. Synchronous `compile()` alone left 217 to 629 ms. `compileAsync()` alone left 15 to 55 ms. `compileAsync()` followed by one render while the canvas was `visibility: hidden` brought the first visible frame to steady state (4 to 7 ms). ANGLE on D3D compiles shaders at draw time, which explains the residual cost. [high for the measurements; medium for transferring the exact numbers to his browser]
5. **Line2's instance cap freezes.** `Line2` and `LineSegments2` take `geometry._maxInstanceCount` at the first draw and never update it (`webgl/WebGLBindingStates.js:373-376, 415-418`). A later `setPositions()` with more points is silently truncated: I set 19 segments and only 9 were drawn. The same applies to any `InstancedBufferGeometry`: allocate capacity once. [high]
6. **Instanced culling uses the base geometry.** A `Mesh` with `InstancedBufferGeometry` is frustum-culled with the base geometry's bounding sphere, not the instances' (`math/Frustum.js:146`). It is wrongly culled when the instances are elsewhere: I observed 0 draw calls. Set `frustumCulled = false` or supply your own `geometry.boundingSphere`. [high]
7. **Context restore resets more than the GPU objects.** After a context restore three rebuilds all GL state: `info.programs` and `info.memory.textures` drop to 0, and `renderer.info` and `renderer.state` are new objects. The clear colour reverts to black. DataTextures and ImageBitmap textures re-upload themselves if their CPU data is still alive. **Render-target contents are lost** (they sample as 0,0,0,0) until you render them again. `restoreContext()` is refused if it is called before the `webglcontextlost` event has finished dispatching. [high]
8. **Tests run fine headless; GPU use depends on the mode.** In Playwright 1.64 the default headless shell renders WebGL 2 through SwiftShader with no extra flags, because Playwright itself adds `--enable-unsafe-swiftshader`. `channel: "chromium"` (new headless) on this Windows laptop uses the Intel Arc through D3D11. SwiftShader lacks `KHR_parallel_shader_compile`, so three prints a console **warning** when `compileAsync()` runs. It also has `MAX_TEXTURE_SIZE` 8192 against 16384 on the Arc, while the Arc allows only **16 texture units per stage** against 32 on SwiftShader. [high]
9. **A reversed depth buffer is available but has costs.** `reversedDepthBuffer` works on both backends: `EXT_clip_control` is present. But the canvas depth buffer stays 24-bit integer, so the precision gain is small unless you render into a `DepthTexture` of `FloatType`. And in r186 `depthFunc: AlwaysDepth` silently becomes "never" (and `EqualDepth` becomes "not-equal") when it is on (observed; `utils.js:481-491`). [high]
10. **Tree-shaken three costs about 130 KB gzipped.** With esbuild, named imports of `WebGLRenderer` and friends come to about 130 KB gzipped (about 137 KB with the Line2 addons). `import * as THREE` comes to about 186 KB. three's own CI reports 124.9 KB for its "minimal WebGL build". [high for esbuild; Turbopack not measured]

---

## 1. WebGLRenderer in r186

### 1.1 Constructor options (`three/src/renderers/WebGLRenderer.js:72-85`) [high]

| option | default | notes |
|---|---|---|
| `canvas` | new canvas | |
| `context` | `null` | a WebGL 1 context throws (line 100-104) |
| `depth` | `true` | the default framebuffer gave `DEPTH_BITS` 24 on both SwiftShader and the Arc (probe) |
| `stencil` | `false` | default has been false since r163 (migration guide) |
| `alpha` | `false` | only sets the default clear alpha (0 or 1). The context is created with `alpha: true` regardless (line 389). Verified: `getContextAttributes().alpha === true` with `alpha: false`. |
| `antialias` | `false` | MSAA on the default framebuffer: 4 samples on both backends. It is a context attribute, so it **cannot change at runtime**. The quality ladder cannot toggle it without creating a new renderer. |
| `premultipliedAlpha` | `true` | compositing of the canvas |
| `preserveDrawingBuffer` | `false` | keep it false. Read pixels in the same task as the render, or use `page.screenshot()` in tests. |
| `powerPreference` | `'default'` | a hint only. The owner's laptop has a single iGPU, so it changes nothing there. |
| `failIfMajorPerformanceCaveat` | `false` | in Chromium 156 a SwiftShader context was still created with `true` in the Playwright shell (probe), so it is no software-renderer detector here. Use the `WEBGL_debug_renderer_info` string instead. |
| `reversedDepthBuffer` | `false` | the name since r179 (was `reverseDepthBuffer`). It needs `EXT_clip_control` (`webgl/WebGLCapabilities.js:96-102`) and warns, falling back to normal depth, if that is missing. See section 9. |
| `outputBufferType` | `UnsignedByteType` | new HDR path: with `HalfFloatType`/`FloatType` and tone mapping or `setEffects()` on, the scene renders into an internal half-float target and a final pass (`webgl/WebGLOutput.js`) applies tone mapping and sRGB. **Not needed for the chart. Keep the default.** |
| `precision` | `'highp'` | through `WebGLCapabilitiesParameters`. highp is supported in fragment shaders on both backends (23-bit mantissa). |
| `logarithmicDepthBuffer` | `false` | see section 9 |

All of these are fixed for the renderer's lifetime. The exception is `outputColorSpace`, which is a property (below).

### 1.2 Colour management defaults [high]

- `renderer.outputColorSpace` is `SRGBColorSpace` (`'srgb'`) by default (WebGLRenderer.js:312). The setter also sets `gl.drawingBufferColorSpace` and `gl.unpackColorSpace` (lines 3670-3678).
- `renderer.toneMapping` is `NoToneMapping` (line 277), and `toneMappingExposure` is 1.
- `ColorManagement.enabled` is `true`. `workingColorSpace` is `LinearSRGBColorSpace` (`'srgb-linear'`) (`math/ColorManagement.js:21-23`).
- `THREE.Color` converts sRGB input to linear on `setHex()`/`setStyle()`/`new Color(0x…)` (`math/Color.js:204-212, 286`). Verified: `new Color(0x808080).r` = 0.2159. `Vector3` values and plain arrays are never converted.

### 1.3 How ShaderMaterial meets colour space and tone mapping [high]

- **The program's colour space depends on where you render.** When rendering to the canvas it is `renderer.outputColorSpace`. When rendering to a render target it is `ColorManagement.workingColorSpace`; since r184 (#33036) render targets use the working space (WebGLRenderer.js:2378; WebGLPrograms.js:213).
- **What three prepends to every non-raw program's fragment shader** (WebGLProgram.js:781-783):
  - the `colorspace_pars_fragment` chunk (`LinearTransferOETF`, `sRGBTransferEOTF`, `sRGBTransferOETF`);
  - `vec4 linearToOutputTexel(vec4)`, built for that target. It is linear-to-sRGB for the canvas and the identity for render targets;
  - `float luminance(vec3)`.
- **Tone mapping.** Only if `material.toneMapped` (default `true`, `materials/Material.js:458`) **and** you render to the canvas **and** `renderer.toneMapping !== NoToneMapping` does three also add `#define TONE_MAPPING`, the tone-mapping chunk and `vec3 toneMapping(vec3)` (WebGLProgram.js:774-776; WebGLPrograms.js:177-187).
- **Nothing is called for you.** Built-in materials call these functions through `#include <tonemapping_fragment>` and `#include <colorspace_fragment>`, and both chunks operate on `gl_FragColor` (`shaders/ShaderChunk/colorspace_fragment.glsl.js`, `tonemapping_fragment.glsl.js`). With `glslVersion: GLSL3` three does **not** define `gl_FragColor` (WebGLProgram.js:819-820), so those includes would not compile. Call the functions yourself.
- **Verified in the browser:**

  | shader output | canvas pixel |
  |---|---|
  | `vec4(0.5)` | 128 |
  | `linearToOutputTexel(vec4(0.5))` | 188 |
  | `vec4(0.5)` with `renderer.toneMapping = ACESFilmic` but no `toneMapping()` call | 128 (unchanged) |
  | an explicit `#ifdef TONE_MAPPING fragColor.rgb = toneMapping(fragColor.rgb); #endif` | 142 |

- **Two consistent ways to handle colour:**
  - **(a) What the engine does now:** palette as sRGB-encoded `Vector3`s, written straight out. It matches CSS hex exactly, but mixing and lighting then happen in gamma space. The engine's terrain and sky shaders write `fragColor = vec4(color, 1.0)` with no conversion (`terrain/shaders.ts:243`, `sky/Sky.ts:58`).
  - **(b) Decode, mix, encode:** decode the palette with `sRGBTransferEOTF()` (or pass `THREE.Color`, which is already linear), light and mix in linear, and end with `fragColor = linearToOutputTexel(fragColor)`. Unlit colours still match CSS exactly, and blends and haze behave physically. I'd pick (b) for the haze and light blends. Either works if it is used consistently, including in troika text and line materials. Built-in `LineMaterial` and troika materials **do** convert their `Color` uniforms (linear) back to sRGB on output.
- **Banding.** Smooth gradients written to an 8-bit canvas can band (sky, haze). three's `dithering()` (`#define DITHERING` when `material.dithering = true`) or your own blue-noise dither is the cheap fix. [medium]

### 1.4 `glslVersion: GLSL3` with ShaderMaterial: what three prepends [high, verified by reading back the compiled source]

- **Version line.** Every non-raw material (`ShaderMaterial` included) gets `#version 300 es`, whatever `glslVersion` is (WebGLProgram.js:804-833, 808). **Do not write `#version` yourself**: a second version line is a compile error. `GLSL3 === '300 es'` (`constants.js:1648`). Only `RawShaderMaterial` uses `glslVersion` to choose the version line.
- **Vertex prefix, in order:**
  - `#define attribute in`, `#define varying out`, `#define texture2D texture`;
  - `precision highp` for float, int and every sampler type, then `#define HIGH_PRECISION`;
  - `#define SHADER_TYPE ShaderMaterial`, `#define SHADER_NAME <material.name>`, your `defines`;
  - feature defines: `USE_INSTANCING` (only for `InstancedMesh`), `USE_LOGARITHMIC_DEPTH_BUFFER`, `USE_REVERSED_DEPTH_BUFFER`, `DOUBLE_SIDED`/`FLIP_SIDED`, `USE_CLIP_DISTANCE`, and others;
  - uniforms: `modelMatrix`, `modelViewMatrix`, `projectionMatrix`, `viewMatrix`, `normalMatrix`, `cameraPosition`, `isOrthographic`;
  - attributes: `position`, `normal`, `uv`, plus `instanceMatrix`/`instanceColor`, `uv1..3`, `tangent`, `color` and skinning attributes under their defines (WebGLProgram.js:475-672).
  - **Never redeclare any of these** (for example `in vec3 position;` or `uniform mat4 projectionMatrix;`): that is a redefinition error.
- **Fragment prefix, in order** (WebGLProgram.js:674-789, 817-831):
  - `#define varying in`, `#define gl_FragDepthEXT gl_FragDepth`, `texture2D`/`textureCube`/`…LodEXT` mapped to their ES 3.0 names;
  - the precision block;
  - `SHADER_TYPE`/`SHADER_NAME`/your defines;
  - `OPAQUE` (when `transparent === false`, blending is Normal and `alphaToCoverage` is off), `PREMULTIPLIED_ALPHA`, `ALPHA_TO_COVERAGE`, `DITHERING`, `USE_FOG`, `USE_LOGARITHMIC_DEPTH_BUFFER`, `USE_REVERSED_DEPTH_BUFFER`;
  - `uniform mat4 viewMatrix; uniform vec3 cameraPosition; uniform bool isOrthographic;`;
  - the tone-mapping functions (when they apply), the colour-space functions, `linearToOutputTexel` and `luminance`.
- **The output variable.** With GLSL3 three does **not** declare an output. You must write `out vec4 fragColor;` (any name; `layout(location = 0)` is optional for one output). Without GLSL3, three adds `layout(location = 0) out highp vec4 pc_fragColor; #define gl_FragColor pc_fragColor` (lines 819-820, verified).
- **Uniforms three sets for you** (WebGLRenderer.js):
  - when the program or the camera changes: `projectionMatrix`, `viewMatrix`, `cameraPosition` and `isOrthographic` (2593-2651), and `logDepthBufFC` when log depth is on (2618-2623);
  - per object: `modelViewMatrix`, `normalMatrix` and `modelMatrix` (2810-2812);
  - per material refresh: `toneMappingExposure` (2751).
- **When your own uniforms upload.** For a `ShaderMaterial`, three uses `material.uniforms` itself; nothing is cloned (WebGLPrograms.js:608-626). Values upload when the material is first used in a frame or after a program switch (2749-2793). `material.uniformsNeedUpdate = true` forces a re-upload within a frame (2795-2800).
- **Uniform arrays.** An array of `Vector3`s must have at least as many elements as the GLSL array. The flatten helper calls `.toArray()` on each declared slot and throws on an empty or short array (`webgl/WebGLUniforms.js:74`). The engine's `uSkyStops` (9 slots, `shaders/common.ts:123`) is fine because `LightBlend.skyStops` has 9 (`light/states.ts:145`), but it starts as `[]` (`sky/Sky.ts:80`). Never render before `applyLight()` has run.
- **Extensions and the program cache.** `ShaderMaterial.extensions` only has `clipCullDistance` and `multiDraw` (`materials/ShaderMaterial.js:222-225`). Derivatives (`dFdx`, `fwidth`), `textureLod` and `gl_FragDepth` are core GLSL ES 3.00, so do not add `#extension` lines for them. `customProgramCacheKey()` defaults to `onBeforeCompile.toString()` (`materials/Material.js:544-548`).

### 1.5 Sketch: a GLSL3 ShaderMaterial for the chart

```ts
import { GLSL3, ShaderMaterial, Vector3 } from "three";

// position, uv, the matrices and cameraPosition are declared by three
const ink = new ShaderMaterial({
  glslVersion: GLSL3,
  vertexShader: /* glsl */ `
    in vec4 node;                 // only custom attributes are declared here
    out vec3 vWorld;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }`,
  fragmentShader: /* glsl */ `
    in vec3 vWorld;
    uniform vec3 uInkSrgb;        // a Vector3 holding CSS-hex/255 values (not converted)
    out vec4 fragColor;           // GLSL3: declare the output yourself
    void main() {
      vec3 ink = sRGBTransferEOTF(vec4(uInkSrgb, 1.0)).rgb;   // decode to linear
      vec3 c = ink;               // ... light, haze, mix in linear ...
      fragColor = vec4(c, 1.0);   // alpha 1: the canvas always has alpha
      fragColor = linearToOutputTexel(fragColor);             // encode for the canvas
    }`,
  uniforms: { uInkSrgb: { value: new Vector3(0.17, 0.16, 0.15) } },
});
```

---

## 2. Textures

### 2.1 DataTexture with HalfFloatType and Red/RG/RGBA formats [high]

- **Defaults.** `DataTexture` sets `magFilter`/`minFilter = NearestFilter`, `generateMipmaps = false`, `flipY = false` and `unpackAlignment = 1` (`textures/DataTexture.js:32, 60, 71, 81`).
- **Internal formats** come from format and type in `getInternalFormat()` (`webgl/WebGLTextures.js:129-252`):

  | format | `HalfFloatType` | `FloatType` | `UnsignedByteType` |
  |---|---|---|---|
  | `RedFormat` | `R16F` | `R32F` | `R8` |
  | `RGFormat` | `RG16F` | `RG32F` | `RG8` |
  | `RGBAFormat` | `RGBA16F` | `RGBA32F` | `RGBA8` (`SRGB8_ALPHA8` if `colorSpace` is sRGB) |

  - `texture.internalFormat = 'RG16F'` (any WebGL 2 sized-format name) overrides this. An unknown name only warns (lines 131-137).
  - Every float or half-float internal format calls `extensions.get('EXT_color_buffer_float')` (lines 242-248), which warns once if the extension is missing, even for sampling-only textures.
- **Data must be a `Uint16Array` of half-float bit patterns**, made with `DataUtils.toHalfFloat()` (`extras/DataUtils.js:150`). Verified: Chromium 156 rejects a `Float16Array` for a `HALF_FLOAT` upload with *"INVALID_OPERATION: texSubImage2D: type HALF_FLOAT_OES but ArrayBufferView is not NULL and not Uint16Array"*, and the texture stays empty. If you hold a `Float16Array`, pass `new Uint16Array(f16.buffer)`. (`Float16Array` is defined in Chromium 156, and three does accept it for **vertex attributes**: `webgl/WebGLAttributes.js:24`.)
- **Upload is lazy.** It happens at first use when `texture.version > 0`, so set `needsUpdate = true` after creating it (`webgl/WebGLTextures.js:553-586`). three allocates with `texStorage2D`, so storage is immutable. Changing the size later needs a new texture (or `dispose()`).

### 2.2 Linear filtering of half-float textures in WebGL 2 [high]

- `R16F`, `RG16F` and `RGBA16F` are filterable in core WebGL 2 / ES 3.0. Verified: a 2×1 `R16F` DataTexture holding (0, 1000) sampled at the midpoint gives 500 with `LinearFilter`, and 1000 with Nearest.
- 32-bit float textures need `OES_texture_float_linear` for linear filtering. three warns and silently skips anisotropy without it (`webgl/WebGLTextures.js:664-709`). Both SwiftShader and the Arc expose it (probe), and `R32F` linear gave 500.

### 2.3 Mipmaps for float textures and render targets [high]

- **Generation.** three calls `gl.generateMipmap` whenever `texture.generateMipmaps` is true (`webgl/WebGLTextures.js:108-112`). Since r170 this no longer depends on the filter setting (migration guide). The level count is `log2(max(w, h)) + 1`, truncated by WebGL to the right count for NPOT sizes (lines 296-320).
- **Requirements.** `generateMipmap` needs a format that is both filterable and colour-renderable:
  - `RGBA16F`/`RG16F`/`R16F` need `EXT_color_buffer_float` (or `_half_float`);
  - 32-bit floats also need `OES_texture_float_linear`;
  - `RG8`/`RGBA8` are fine in core.
  - Verified on both backends: generating mipmaps on `RGBA16F` raised no GL error.
- **Render targets.** `WebGLRenderTarget` defaults to `generateMipmaps: false` (`core/RenderTarget.js` options). When it is true, three regenerates the mip chain after **every** `render()` into that target at mip level 0 (WebGLRenderer.js:1794-1804), and once at setup (`webgl/WebGLTextures.js:2232-2236`).
- **The filter is a box average.** Driver mipmaps average the levels. That suits shading at a distance, but peaks get lower. For "highest land" use your own max-reduction.

### 2.4 unpackAlignment and flipY [high]

- **`unpackAlignment`.** `Texture` defaults to 4, `DataTexture` to 1. Rows of `R8`, `RG8` or `R16F` data whose byte length is not a multiple of 4 come out sheared unless it is 1. three sets `UNPACK_ALIGNMENT` for every upload (`webgl/WebGLTextures.js:932`).
- **`flipY`.**
  - It applies to typed-array (`DataTexture`) 2D uploads in WebGL 2. Verified: with `flipY = true` the rows were flipped, with no GL error.
  - For HTML images and canvases it applies as usual.
  - For **ImageBitmap** it is ignored (next section).
- **Every one of these properties is part of the texture's GPU cache key**: `flipY`, `premultiplyAlpha`, `unpackAlignment`, `colorSpace`, the filters, `anisotropy`, `internalFormat`, `format`, `type` and `generateMipmaps` (`webgl/WebGLTextures.js:528-549`). Changing one after upload creates a new GL texture.
- **Manual `gl.pixelStorei` calls desynchronise three's cache.** Since r184 three caches pixel-store state. Go through `renderer.state.pixelStorei(...)` (migration guide r183 to r184), or call `renderer.state.reset()` after raw GL work.

### 2.5 ImageBitmap uploads [high]

- **What three does.** For an `ImageBitmap` source three sets no `UNPACK_FLIP_Y_WEBGL`, `UNPACK_PREMULTIPLY_ALPHA_WEBGL` or `UNPACK_COLORSPACE_CONVERSION_WEBGL` at all (`webgl/WebGLTextures.js:918-930`; r184 #33073 "prevent flipping of image bitmaps"). The WebGL spec's Pixel Storage Parameters section says browsers ignore those three parameters for ImageBitmap sources anyway; the ImageBitmapOptions given at creation decide instead (https://registry.khronos.org/webgl/specs/latest/1.0/). three's own `ImageBitmapLoader` documents this: `texture.flipY` and `premultiplyAlpha` are ignored with image bitmaps (`loaders/ImageBitmapLoader.js:12`). The loader always forces `colorSpaceConversion: 'none'` (line 179).
- **Verified, with a 1×2 ImageData whose top row is red at alpha 128 and bottom row blue:**

  | bitmap options | texture flags | row 0 | row 1 | meaning |
  |---|---|---|---|---|
  | `premultiplyAlpha: 'none', colorSpaceConversion: 'none'` | `texture.flipY = true, premultiplyAlpha = true` | red (255,0,0,128) | blue | flags ignored: no flip, no premultiply |
  | same + `imageOrientation: 'flipY'` | | blue | red | flipped at creation |
  | `premultiplyAlpha: 'premultiply'` | | (128,0,0,128) | | premultiplied at creation |

- **Texture row 0 is the image's top row.** In UV terms `v = 0` is the top of the WebP. The engine's decode shader reads rows with `texelFetch(…, ivec2(gl_FragCoord.xy))` and comments "Row 0 is the northern edge" (`terrain/field.ts:97`). That matches: the field render target's row 0 is north, so field UV `v = 0` is north.
- **Size limit.** An ImageBitmap larger than `MAX_TEXTURE_SIZE` is silently downscaled through a 2D canvas, which destroys exact data (`webgl/WebGLTextures.js:46-106`; it logs a warning). SwiftShader's limit is 8192 and the Arc's is 16384. The current tiles (largest 1840 × 1295 in `public/chart/manifest.json`) are far below both.
- **Lossless data only.** Packed height data must be lossless WebP (or PNG). Lossy WebP would corrupt the codes. [medium]

### 2.6 Uploading ahead of time [high]

- **`renderer.initTexture(texture)`** uploads now, through unit 0, then unbinds (WebGLRenderer.js:3595-3617). Verified: `r.initTexture(tex)` followed by reading the GL texture back returned the data before any draw.
- **`renderer.initRenderTarget(rt)`** allocates a render target without rendering (3579-3587).
- **Geometry buffers have no init API.** They upload on first draw, so the hidden warm-up render (section 4) covers them.

### 2.7 Sketch: a half-float lookup texture

```ts
import { DataTexture, DataUtils, HalfFloatType, LinearFilter, RGFormat } from "three";

const data = new Uint16Array(w * h * 2);            // RG16F: two halves per texel
for (let i = 0; i < w * h * 2; i++) data[i] = DataUtils.toHalfFloat(values[i]);
const lut = new DataTexture(data, w, h, RGFormat, HalfFloatType);
lut.magFilter = lut.minFilter = LinearFilter;          // filterable in WebGL 2 core
lut.needsUpdate = true;                                 // version > 0, or nothing uploads
renderer.initTexture(lut);                               // upload now, not on the first visible frame
```

---

## 3. Render targets

### 3.1 HalfFloatType target for a one-time GPU decode pass [high]

- **Defaults.** `new WebGLRenderTarget(w, h, { type: HalfFloatType, format: RGBAFormat, depthBuffer: false, generateMipmaps: …, minFilter: … })` is the right shape. Defaults are `depthBuffer: true`, `stencilBuffer: false`, `samples: 0`, `generateMipmaps: false`, `minFilter: LinearFilter` and `flipY: false` (`core/RenderTarget.js`). Turn `depthBuffer` off for full-screen passes, or a 24-bit depth renderbuffer is allocated for nothing.
- **Allocation.** Lazy, on the first `setRenderTarget(rt)` (WebGLRenderer.js:2966-2969): `texImage2D(…, null)` for level 0 (`webgl/WebGLTextures.js:1647-1688`, 2015-2250).
- **Readback.** Verified: rendering `vec4(1000.5, -3.25, 0.125, 1)` into a 4×4 half-float target and reading it back gave exactly those values. It worked both as `Uint16Array` (`HALF_FLOAT` read) and as `Float32Array` (`FLOAT` read), with no GL error on either backend.
- **Colour space inside the pass.** A pass into a render target compiles with `outputColorSpace = working` and no tone mapping, so `linearToOutputTexel` is the identity there. **The same ShaderMaterial drawn to the canvas and into a render target compiles two programs**: the colour space is in the cache key (WebGLPrograms.js:432, 445). Verified: one program each.

### 3.2 Is EXT_color_buffer_float or EXT_color_buffer_half_float needed? How does three check? [high]

- **Yes.** In WebGL 2, half-float and float formats are colour-renderable only with `EXT_color_buffer_float` (`R16F`/`RG16F`/`RGBA16F`/`R32F`/`RG32F`/`RGBA32F`/`R11F_G11F_B10F`). `EXT_color_buffer_half_float` also exists on WebGL 2, as a 16-bit-only alternative (MDN, https://developer.mozilla.org/en-US/docs/Web/API/EXT_color_buffer_half_float). Both are present on SwiftShader and the Arc in Chromium 156 (probe).
- **three enables but never verifies.** It enables both at startup (`webgl/WebGLExtensions.js:31-40`), but **never checks framebuffer completeness**: there is no `checkFramebufferStatus` anywhere in the WebGL renderer. An unsupported target silently renders nothing (the browser logs GL errors).
- **Check it yourself before relying on it**, as `Chart.create` already does: `renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float')`. three itself only checks this when choosing the transmission target's type (WebGLRenderer.js:2014).

### 3.3 RGFormat with UnsignedByteType as a render target [high]

- Maps to `RG8`, which is colour-renderable and filterable in core WebGL 2. Verified: framebuffer complete and no GL error after rendering, mipmaps included.
- `readRenderTargetPixels` on an RG target needs the implementation's read format to be RG, otherwise it logs an error (`webgl/WebGLCapabilities.js:28-38`). RGBA targets are always readable.

### 3.4 copyTextureToTexture signature (r186) [high]

```ts
renderer.copyTextureToTexture(srcTexture, dstTexture, srcRegion = null, dstPosition = null, srcLevel = 0, dstLevel = 0)
```

- Source: WebGLRenderer.js:3336; types: `@types/three/src/renderers/WebGLRenderer.d.ts:462-469`. `srcRegion` is a `Box2` or `Box3`; `dstPosition` a `Vector2` or `Vector3`.
- For render-target textures, both targets must exist first (`initRenderTarget`).
- After a level-0 copy, mipmaps are generated if `dstTexture.generateMipmaps` (3562-3566).
- The r165 migration note shows a single `level` argument. The installed r186 has `srcLevel, dstLevel`; follow the package. `copyTextureToTexture3D` is deprecated (r170).

### 3.5 Sketch: the decode pass

```ts
const ok = renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float");
if (!ok) throw new Error("no half-float render targets");          // three will not tell you
const field = new WebGLRenderTarget(cols, rows, {
  type: HalfFloatType, format: RGBAFormat, depthBuffer: false,
  generateMipmaps: true, minFilter: LinearMipmapLinearFilter, magFilter: LinearFilter,
});
const prev = renderer.getRenderTarget();
renderer.setRenderTarget(field);
renderer.render(passScene, passCamera);   // mipmaps are rebuilt automatically after this call
renderer.setRenderTarget(prev);
// field contents die with the context: re-run this pass on 'webglcontextrestored'
```

---

## 4. Shader warm-up: compile and compileAsync [high]

- **Signatures** (WebGLRenderer.js:1396-1499, 1515-1573; types `WebGLRenderer.d.ts:363, 370`):
  - `renderer.compile(scene, camera, targetScene = null): Set<Material>`
  - `renderer.compileAsync(scene, camera, targetScene = null): Promise<Object3D>`
- **What `compile()` covers:**
  - It traverses `scene.traverse()`, so **invisible objects are included**.
  - It builds a program for each `(material, object)` pair with the current lights, fog, clipping and **render target**. The render target matters because colour space and tone mapping are in the cache key. Compile with `renderer.getRenderTarget() === null` to warm canvas programs. For render-target passes, compile or just run them with that target set.
  - It does **not** upload textures or geometry.
- **How `compileAsync()` waits.** It calls `compile()`, then polls `program.isReady()` every 10 ms (`setTimeout`) until every material's program reports `COMPLETION_STATUS_KHR`.
  - **Without `KHR_parallel_shader_compile`** (SwiftShader), `isReady()` is true at once, and `extensions.get()` logs **`THREE.WebGLRenderer: KHR_parallel_shader_compile extension not supported.`** as a console warning (WebGLRenderer.js:1555; WebGLExtensions.js:42-52). Observed in the headless shell.
  - The Arc has the extension.
  - r185 and r186 fixed `compileAsync` crashes (#33668, #33784, #34378).
- **Measured on the Arc** (new headless, D3D11; 6 ShaderMaterials of about 60 lines of math each; render plus a 1-pixel `readPixels` as a sync point; two runs):

  | strategy | main-thread or wait time | first frame | second frame |
  |---|---|---|---|
  | no warm-up | | **866 / 663 ms** | 5.5 ms |
  | `compile()` | 5 / 3 ms | **629 / 217 ms** | 5.4 / 5.8 ms |
  | `compileAsync()` | 543 / 253 ms (async) | **55 / 15 ms** | 5.2 / 6 ms |
  | `compileAsync()` + one hidden render (`visibility: hidden`) | hidden render 11 / 22 ms | **3.6 / 7.1 ms** | |

  - SwiftShader: every strategy had a first frame of 250 to 360 ms. Meaningless for timing, as the brief says.
- **Why a hidden render is needed.** The residual cost after `compileAsync()` matches ANGLE's design on D3D: the final HLSL is generated and compiled at **draw time**, because it depends on the vertex and pixel stage signatures. A change of render-target layout can force another compile at draw time (https://chromium.googlesource.com/angle/angle/+/HEAD/doc/DynamicShaderCompilation.md). The owner's Windows Chrome uses ANGLE on D3D11 (probe renderer string).
- **Recommended sequence** before scene 2 becomes visible:
  1. Load assets and decode the fields.
  2. `initTexture()` every sampled texture.
  3. `await compileAsync(scene, camera)` with every layer in the scene, the not-yet-visible ones included (`visible = false` still compiles).
  4. Render **one frame per program variant** while the canvas is hidden or under scene 1, **with every layer made visible for that frame**. `render()` skips invisible objects (WebGLRenderer.js:1862), unlike `compile()`, so anything left invisible only gets the `compileAsync()` part of the warm-up.
  5. Avoid toggling `defines` at runtime (each set is a new program). Drive light states and effects through uniforms.
- **After a context restore** all programs are gone (section 6). Run the same warm-up again.

```ts
async function warm(chart: Chart) {
  for (const t of chart.textures()) chart.renderer.initTexture(t);
  await chart.renderer.compileAsync(chart.scene, chart.camera);
  const c = chart.renderer.domElement;
  const v = c.style.visibility;
  c.style.visibility = "hidden";                       // still renders; nothing is shown
  chart.renderer.render(chart.scene, chart.camera);    // uploads buffers, D3D draw-time compile
  c.style.visibility = v;
}
```

---

## 5. renderer.info [high]

- **Shape** (`webgl/WebGLInfo.js`):
  - `info.render`: `{ frame, calls, triangles, points, lines }`;
  - `info.memory`: `{ geometries, textures }`;
  - `info.programs`: the live `WebGLProgram` array (`programs.length` is the program count);
  - `info.autoReset` (default `true`) and `info.reset()`.
  - `triangles` counts `instanceCount × count / 3` for instanced draws. A draw with `instanceCount` 0 issues no call at all (`webgl/WebGLIndexedBufferRenderer.js:30`).
- **Counters reset on every `render()` call.** `render()` does `info.render.frame++` and, if `autoReset`, `info.reset()` at the start of **every** `render()` call (WebGLRenderer.js:1729-1731). With decode, bake or other render-target passes in the same tick, the counters reflect only the last `render()`.
  - Verified: one render-target pass plus a 3-object scene gave `calls = 3` with `autoReset`, and `4` with `autoReset = false` plus a manual `reset()`.
  - `info.render.frame` counts `render()` calls, not animation frames (it went up by 2 for two renders).
- **To count per frame:** set `renderer.info.autoReset = false`. Call `renderer.info.reset()` at the start of each `gsap.ticker` tick, before any pass. Read the counters after the last `render()`. `memory.*` is never reset; it tracks live GL textures and geometries.
- **What `memory.textures` counts.** GL texture objects created by three, render-target textures included. Textures sharing a `TextureSource` share one entry. No byte counts exist; the engine's own `gpuBytes` estimate is the right approach.
- **The `outputBufferType` path breaks the counters.** With a non-`UnsignedByteType` output and tone mapping or effects, the final output pass is a nested `render()` that **resets** the counters (WebGLOutput.js:254-256), so `calls` would read 1. Not relevant with the default output type.
- **Read `renderer.info` fresh each time.** After a context restore it is a **new object** (WebGLRenderer.js:463, 559).

---

## 6. WebGL context loss and restore [high]

- **What three registers.** Listeners for `webglcontextlost`, `webglcontextrestored` and `webglcontextcreationerror` are registered **before** the context is created (WebGLRenderer.js:402-405), so they run before any listener the app adds later.
- **On loss:**
  - three calls `event.preventDefault()`, which is required for the browser to restore at all;
  - it logs `THREE.WebGLRenderer: Context Lost.` (console.log);
  - every later `render()` returns early (1113-1121, 1646).
- **On restore**, three calls `initGLContext()` again (1123-1143), which creates new extensions, capabilities, state, info, properties, textures, attributes, programs, background, shadow map and binding states. It keeps `info.autoReset` and the shadow-map settings. Renderer fields like `toneMapping`, `outputColorSpace`, pixel ratio and size survive, because they live on the renderer object. (Verified: pixel ratio 1.5 survived.)
- **What three restores by itself (verified):**
  - **Programs** are recompiled lazily on the next draw: `info.programs.length` was 0 after restore and 2 after two renders. Expect the same first-frame hitch as section 4.
  - **DataTextures and image or ImageBitmap textures** re-upload on next use, because their `version > 0` and the property cache is fresh. This works **only if the CPU data is still alive**: the ImageBitmap not `close()`d, the DataTexture's array kept, no `onUpdate` hook that drops the image. Verified: a DataTexture sampled correctly after restore without any app action.
  - **Geometry buffers** re-upload from `attribute.array` on next use. Do not free arrays with `BufferAttribute.onUpload()`.
  - **Render-target objects** are re-created on the next `setRenderTarget(rt)`.
  - The r185 fix for stale scratch framebuffers after restore (#33533) and r186's "more robust GL initialisation" (#34299) are in this version.
- **What the app must redo:**
  - **The contents of every render target** (decode passes, horizon bakes, anything rendered once). Until then they sample as transparent black (verified 0,0,0,0): three binds a 1×1 empty texture when the GL texture is missing (`webgl/WebGLState.js:952`).
  - **`setClearColor`/`setClearAlpha`.** The clear colour reverts to black (verified `000000`) because `WebGLBackground` is rebuilt (`webgl/WebGLBackground.js:21`).
  - **The warm-up** (section 4).
  - **Any cached references** to `renderer.state`, `renderer.info`, `renderer.properties`, `renderer.capabilities` or `renderer.extensions`. They are new objects (WebGLRenderer.js:492-559).
  - Do not call `compileAsync` while the context is lost. `getProgramParameter` returns null on a lost context, so `isReady()` never becomes true and the promise never resolves (inferred from 1001-1005). [medium]
- **Testing.**
  - `renderer.forceContextLoss()` and `forceContextRestore()` use `WEBGL_lose_context` (607-622). Both backends expose it.
  - **Gotcha (verified):** calling `restoreContext()` in a microtask chained from the `webglcontextlost` listener fails with *"INVALID_OPERATION: restoreContext: context restoration not allowed"*. Chromium only allows restoration once the lost event has finished dispatching and its default was prevented. Wait one task (`setTimeout(0)`) first.
  - In Playwright, the page's own canvas context is reachable without a debug hook: `canvas.getContext('webgl2')` returns three's existing context.
  - Note that the browser may refuse to restore after repeated losses (blocked from 3D APIs). That is the job of the engine's 4-second give-up timer (`engine/Chart.ts:286`).

```ts
// Playwright: lose and restore the chart's context
await page.evaluate(async () => {
  const canvas = document.querySelector("canvas[data-engine]") as HTMLCanvasElement; // three sets data-engine
  const ext = canvas.getContext("webgl2")!.getExtension("WEBGL_lose_context")!;
  await new Promise<void>((ok) => { canvas.addEventListener("webglcontextlost", () => ok(), { once: true }); ext.loseContext(); });
  await new Promise((ok) => setTimeout(ok, 0));          // let the lost event finish dispatching
  await new Promise<void>((ok) => { canvas.addEventListener("webglcontextrestored", () => ok(), { once: true }); ext.restoreContext(); });
});
// then: wait two animation frames and check that the canvas pixels are not blank again
```

---

## 7. Instancing [high]

### 7.1 InstancedMesh

- **Per-instance data.** `instanceMatrix`, a mat4 `InstancedBufferAttribute` of 64 bytes per instance; optional `instanceColor`; `count`, which can drop below the capacity freely (draws use `object.count`, WebGLRenderer.js:1337-1339) (`objects/InstancedMesh.js`).
- **In a ShaderMaterial** three adds `#define USE_INSTANCING` and declares `in mat4 instanceMatrix`, but **your shader must apply it** (`modelViewMatrix * instanceMatrix * vec4(position, 1.0)`).
- **Culling** uses `mesh.boundingSphere`, computed once from all instances on first need. **Call `computeBoundingSphere()` again after moving instances** (Frustum.js:146-153; InstancedMesh.js:151).
- **Usage.** `instanceMatrix` starts as `StaticDrawUsage`. For per-frame motion call `mesh.instanceMatrix.setUsage(DynamicDrawUsage)` before the first render.

### 7.2 InstancedBufferGeometry with InstancedBufferAttribute

- **Any per-instance layout you like**, for example a vec4 (x, y, heading, scale) at 16 bytes instead of 64. That is cheaper to update. The engine uses this for CDLOD patches.
- **`geometry.instanceCount`** defaults to `Infinity`. Draws use `min(instanceCount, _maxInstanceCount)` (WebGLRenderer.js:1341-1346).
- **`_maxInstanceCount` is fixed at the first bind**, to `meshPerAttribute × count` of the first instanced attribute (`webgl/WebGLBindingStates.js:415-418`), and is never refreshed. **Allocate the maximum capacity once.** Replacing an attribute with a bigger one does not raise the cap.
- **Frustum culling uses the base geometry's bounding sphere.** A `Mesh` has no `boundingSphere` of its own (Frustum.js:146-160). Verified: instances in view, base triangle at the origin out of view, 0 draw calls. Use `frustumCulled = false` (as the engine's terrain does) or set `geometry.boundingSphere` to a sphere that encloses every instance.

### 7.3 Updating buffers (both kinds)

- **`setUsage(DynamicDrawUsage)`** only matters at buffer creation (`gl.bufferData(…, usage)`, `webgl/WebGLAttributes.js:14`). Set it before the first render.
- **The per-frame pattern:** write into `attr.array`, then `attr.addUpdateRange(startElement, elementCount)` (units are array elements, not bytes or items), then `attr.needsUpdate = true`.
  - three merges overlapping ranges, uploads them with `bufferSubData` and clears the list itself (`webgl/WebGLAttributes.js:80-151`), so `clearUpdateRanges()` beforehand is only defensive.
  - Without ranges the whole array uploads.
- **Gotcha: `addUpdateRange(start, 0)` uploads from `start` to the end of the array.** WebGL 2's `bufferSubData` treats a length of 0 as "the rest of the source" (WebGL 2 spec, Buffer objects). The engine's `Terrain.update()` calls `addUpdateRange(0, count * 4)` even when `count` is 0 (`terrain/Terrain.ts:167-169`). Skip the update when nothing changed.
- **The buffer size is fixed after the first upload.** Resizing throws *"Resizing buffer attributes is not supported"* (`webgl/WebGLAttributes.js:214`).

### 7.4 Sketch: glyph instances

```ts
const geo = new InstancedBufferGeometry();
geo.index = base.index;
geo.setAttribute("position", base.getAttribute("position"));
const glyph = new InstancedBufferAttribute(new Float32Array(MAX_GLYPHS * 4), 4); // x, y, heading, scale
glyph.setUsage(DynamicDrawUsage);              // before the first render
geo.setAttribute("aGlyph", glyph);
geo.instanceCount = 0;
const mesh = new Mesh(geo, glyphMaterial);
mesh.frustumCulled = false;                     // or: geo.boundingSphere = sphereAroundAllGlyphs
// per frame, only when something moved:
if (n > 0) { glyph.addUpdateRange(0, n * 4); glyph.needsUpdate = true; }
geo.instanceCount = n;
```

---

## 8. Fat lines: Line2, LineSegments2, LineGeometry, LineMaterial

### 8.1 Imports and types [high]

- **Imports:**
  - `import { Line2 } from "three/addons/lines/Line2.js"`
  - `import { LineMaterial } from "three/addons/lines/LineMaterial.js"`
  - `import { LineGeometry } from "three/addons/lines/LineGeometry.js"`
  - `import { LineSegments2 } from "three/addons/lines/LineSegments2.js"`
  - `import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js"`
- **Resolution.** `three/package.json` maps `./addons/*` to `./examples/jsm/*`, and `@types/three` has the same map, giving `@types/three/examples/jsm/lines/*.d.ts`. Verified to type-check under TypeScript 7.0.2 with `moduleResolution: "bundler"` (section 11).
- **WebGPU.** `examples/jsm/lines/webgpu/` holds the WebGPU variants. Do not mix them in.

### 8.2 Width, resolution and world units [high]

- **`linewidth` is in CSS pixels** when `worldUnits` is false (the default).
- **`resolution` is set automatically.** `LineSegments2.onBeforeRender()` copies `renderer.getViewport()` into `material.resolution` before every draw (`examples/jsm/lines/LineSegments2.js:419-430`). `getViewport()` returns the **logical** (CSS-pixel) viewport, so the width stays in CSS pixels at any pixel ratio. Verified: resolution read 320 × 180 for a 320 × 180 CSS canvas at DPR 1.5.
- **Two caveats on resolution:**
  - an object that is culled or invisible does not update it;
  - rendering into a render target of another size still uses the canvas viewport.
- **`worldUnits: true`** makes width and dash sizes world-space (the define `WORLD_UNITS`; setting it triggers a recompile, LineMaterial.js:508-526). Ink lines on a chart want screen units.
- **Native `gl.LINES` are useless here.** `ALIASED_LINE_WIDTH_RANGE` is [1, 1] on both backends (probe), so native lines are always 1 device pixel.

### 8.3 Dashes [high]

- `dashed` (define `USE_DASH`), `dashSize`, `gapSize`, `dashScale` and `dashOffset` are uniforms.
- The fragment shader discards where `mod(vLineDistance + dashOffset, dashSize + gapSize) > dashSize` (LineMaterial.js:346), so dashes have **hard, unsmoothed ends**.
- In dashed mode the round end caps are discarded (line 344), so joins lose their round caps.
- **Call `line.computeLineDistances()` after every `setPositions()`.** It writes the `instanceDistanceStart`/`End` attributes as cumulative lengths along the segment order (`LineSegments2.js:283-310`).

### 8.4 alphaToCoverage [high]

- `material.alphaToCoverage = true` adds the `USE_ALPHA_TO_COVERAGE` define, which turns caps and edges into smooth alpha. three also enables `SAMPLE_ALPHA_TO_COVERAGE` for it (`webgl/WebGLState.js:786-788`).
- It only helps with an MSAA target (`antialias: true`; 4 samples here), and gives at best 4 coverage levels.

### 8.5 Drawing a line progressively [high]

- **Whole segments: `geometry.instanceCount = k`** draws the first `k` segments (each instance is one segment of 8 vertices and 6 triangles). Verified: 4 segments gave 24 triangles. It can only cut at vertices.
  - **Never grow a line with a second `setPositions()`.** The draw stays capped at the first count (section 7; verified: 19 segments set, 9 drawn).
  - Set the full route once and reveal it.
- **Exact cut, no shader edits: the dash trick.** Use `dashed: true`, `gapSize: 1e9`, and animate `dashSize` to the drawn length (in `dashScale × world` units).
  - Verified: on a 2-unit line, `dashSize = 1.0` lit exactly the left half (pixels 40 to 199 of 40 to 360), and `1.5` lit up to pixel 279.
  - Costs: a hard cut at the head and no start cap.
- **A custom uniform through `onBeforeCompile`** is possible. `onBeforeCompile` receives the raw sources, before `#include` resolution (WebGLRenderer.js:2248). Note that `vLineDistance` is only written by the vertex shader under `USE_DASH`, so you would add your own varying.

### 8.6 Lifting line vertices onto displaced terrain [medium: technique; high: anchor lines]

- Patch the two lines that place the segment ends in view space (LineMaterial.js:101-102), as in the sketch below.
- Segments stay straight between the lifted ends. Resample polylines finely enough for the relief (rivers and the march to Ulm). Sea routes need no lift, only a depth strategy against the sea surface (section 9).
- The geometry's bounding sphere is flat, so pad it or set `frustumCulled = false`.

```ts
const lm = new LineMaterial({ color: 0x2a2620, linewidth: 1.4 });
lm.onBeforeCompile = (shader) => {
  Object.assign(shader.uniforms, terrainField.uniforms, { uExag: exagUniform });   // share the same uniform objects
  shader.vertexShader = shader.vertexShader
    .replace("void main() {", `${GLSL_FIELD}\nvec3 lift(vec3 p) { return vec3(p.xy, max(sampleHeightKm(p.xy), 0.0) * uExag + 0.02); }\nvoid main() {`)
    .replace("vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );", "vec4 start = modelViewMatrix * vec4( lift( instanceStart ), 1.0 );")
    .replace("vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );", "vec4 end = modelViewMatrix * vec4( lift( instanceEnd ), 1.0 );");
};
lm.customProgramCacheKey = () => "line-lift-1";
```

(LineMaterial's shaders are GLSL1-style; three converts them to 300 es. Any GLSL you inject must use `texture2D`/`texture` accordingly. Both work, since `texture2D` is `#define`d to `texture`.)

### 8.7 Line2 or your own ribbon? [medium]

| | Line2 / LineMaterial | own screen-space ribbon ShaderMaterial |
|---|---|---|
| geometry | 1 instance per segment: 8 vertices / 18 indices; the vertex shader projects both ends at every vertex | about 2 vertices per point (position, previous, next, side, distance along) |
| joins | round caps on every segment, so round joins for free. **With opacity < 1 the overlapping caps double-blend into darker beads at every vertex.** | miter joins (with a miter limit or bevel) and no overlap, so **translucent ink stays even** |
| anti-aliasing | triangle edges get MSAA; round caps are hard discards unless `alphaToCoverage` is on (4 levels) | analytic: distance-to-edge in pixels with `fwidth` smoothing, crisp at any DPR, no MSAA needed |
| drawing head | `instanceCount` (vertex cut) or the dash trick (hard cut, no start cap) | one uniform against the interpolated distance, so a smooth, anti-aliased, sub-pixel head |
| dashes | hard-edged; caps dropped | analytic, any pattern, anti-aliased |
| width along the line | constant | free (quill-like taper or pressure), which suits an engraved chart |
| terrain lift | `onBeforeCompile` patch | native in your vertex shader |
| draw calls | 1 per Line2. Many segments can share one `LineSegments2`, but per-line drawing heads then need hand-made distance attributes. | 1 per batch; per-line data in attributes |
| cost to write | none | about 200 lines of TS and GLSL plus testing of sharp turns |

- **Verdict.** For translucent, tapered ink lines with a moving head, the own ribbon is the better-looking and cheaper option. The engine's new `lines/ribbon.ts` (seen in the working tree) takes that route: `transparent: true`, `depthWrite: false`, a `uHead` discard.
- **Line2 remains a good quick start for opaque, uniform lines.**
- **Canvas alpha stays opaque under translucent ink.** With non-premultiplied `NormalBlending`, three uses `blendFuncSeparate(SRC_ALPHA, ONE_MINUS_SRC_ALPHA, ONE, ONE_MINUS_SRC_ALPHA)` (`webgl/WebGLState.js:674-675`). Destination alpha stays 1 over the opaque chart, so translucent lines do not make the canvas see-through. [high]

---

## 9. PerspectiveCamera, lens shift, near/far and depth precision

### 9.1 Lens shift [high, verified numerically in Node with the installed build]

- **`setViewOffset(fullW, fullH, x, y, w, h)`** (`cameras/PerspectiveCamera.js:304`) also sets `aspect = fullW / fullH`, so call it again on every resize.
  - **A vertical lens shift is `camera.setViewOffset(W, H, 0, dy, W, H)`: the image moves UP by `dy` pixels**, and `projectionMatrix.elements[9]` becomes `-2·dy/H`.
  - Verified: `dy = +72` at H = 720 put a centred point at NDC y = +0.2 (72 px up), and `dy = -72` put it at -0.2.
  - Undo with `clearViewOffset()`.
- **By hand:** after `updateProjectionMatrix()`, set `projectionMatrix.elements[9] = s` (this moves the image **down** by `s` in NDC, i.e. `s·H/2` px), then `projectionMatrixInverse.copy(projectionMatrix).invert()`.
  - Verified: `s = 0.2` moved the image down 72 px.
  - **Any later `updateProjectionMatrix()` erases it.** That includes the one three calls itself the first time a reversed depth buffer is active (WebGLRenderer.js:2599-2602). Prefer `setViewOffset`, or a subclass that re-applies the shift in `updateProjectionMatrix()`.
- **`filmOffset` is horizontal only**, in millimetres of a `filmGauge` (35 mm) film. It shifts `elements[8]`, as `left += near·filmOffset / getFilmWidth()` (PerspectiveCamera.js:374-375). Verified: `elements[9]` unchanged.

### 9.2 Depth precision for 0.05 km to 20,000 km

- **Standard 24-bit depth.** The step at distance `z` is about `z² / (near · 2²⁴)`. The canvas depth buffer is 24-bit on both backends (probe).

  | near | z | step |
  |---|---|---|
  | 0.02 km | 1 km | 3 mm |
  | 0.02 km | 100 km | 30 m |
  | 0.02 km | 1000 km | 3 km |
  | 1 km | 1000 km | 60 m |
  | 50 km | 10,000 km | 120 m |

  - The engine already ties near and far to altitude (`near = clamp(0.3 · altitude, 0.02, 200)` km, `engine/Chart.ts:190-191`). That is the right first move: terrain against terrain is fine.
  - The risk is **overlays that lie on the surface** (lettering, routes, rivers) at long range in low views. Draw them after the terrain with `depthTest: false` and an explicit `renderOrder`, or use `polygonOffset`, which works for triangle-based lines and text meshes and is sign-corrected for reversed depth since r183 (`webgl/WebGLState.js:860-885`). [high: maths; medium: advice]
- **`logarithmicDepthBuffer: true`.**
  - **Precision:** the step is about `(1 + z) · ln(1 + far) / 2²⁴`. With far = 60,000 km that is 0.07 m at 100 km and 0.66 m at 1000 km.
  - **Cost:** every ShaderMaterial must include `<common>`, `<logdepthbuf_pars_vertex>`, `<logdepthbuf_vertex>` (after `gl_Position`), `<logdepthbuf_pars_fragment>` and `<logdepthbuf_fragment>`. The fragment chunk writes `gl_FragDepth`, which **disables early-z for every fragment** (`shaders/ShaderChunk/logdepthbuf_*.glsl.js`; the WebGLRenderer option docs at line 3699-3700 say so). three only adds the define and the `logDepthBufFC` uniform.
  - For a heavy terrain fragment shader with oblique overdraw, that is a real cost. A forum report measured 65 fps falling to 35 fps on a foliage scene (https://discourse.threejs.org/t/beware-of-logarithmic-depth-buffer-it-can-degrade-scene-performance/88495). **Not recommended here.** [high: mechanism; medium: cost estimate]
- **`reversedDepthBuffer: true`.**
  - **Mechanism:** it requires `EXT_clip_control`, present on the Arc (D3D11) and on SwiftShader in Chromium 156 (probe). three switches the clip range to [0, 1] (`clipControlEXT(LOWER_LEFT, ZERO_TO_ONE)`), maps the depth functions, inverts `clearDepth`, and lazily flips the camera's projection through `camera._reversedDepth` on first render (`webgl/WebGLState.js:78-102, 201-217`; WebGLRenderer.js:2597-2602; `math/Matrix4.js:1140-1185`).
  - **The canvas depth buffer stays 24-bit integer.** Reed's analysis: reversed-Z helps an integer buffer only modestly. The full benefit needs a 32-bit **float** depth buffer, which you get only by rendering into a `WebGLRenderTarget` with `depthTexture: new DepthTexture(w, h, FloatType)` (giving `DEPTH_COMPONENT32F`, `webgl/WebGLTextures.js:280-282`) and then copying to the canvas. That costs a full-screen pass, memory, and the free canvas MSAA (or samples on the target) (https://developer.nvidia.com/content/depth-precision-visualized).
  - **Pitfalls:**
    - **r186 bug, observed on both backends:** with it on, `depthFunc: AlwaysDepth` becomes "never" and `EqualDepth` becomes "not-equal". `utils.js:481-491` maps them as logical negations. `LessEqual`/`Greater` and `depthTest: false` behave correctly. Use `depthTest: false`, never `AlwaysDepth`.
    - Your own frustum code must pass the flag: `frustum.setFromProjectionMatrix(m, WebGLCoordinateSystem, camera.reversedDepth)` (`math/Frustum.js:95-140`). Without it the far plane is lost and culling becomes merely conservative. The engine's `Chart.ts` frustum is correct only while reversed depth is off.
    - Shaders that read or write depth must branch on `USE_REVERSED_DEPTH_BUFFER`.
    - Do not combine it with `logarithmicDepthBuffer`. The source does not stop you, but the log-depth chunk writes unreversed values. A forum answer also says the two are exclusive and that the option is creation-time only.
  - [high: mechanism and the bug; medium: precision gain]
- **Recommendation:** keep standard depth plus the adaptive near/far, and an overlay draw-order and offset strategy. If screenshots show z-fighting that this cannot fix, move to a reversed depth buffer **with a float depth render target**, not to log depth.

---

## 10. Breaking changes r160 to r186, packaging, bundle size

### 10.1 Changes that touch this engine (migration guide and release notes; verified in source) [high unless marked]

| release | change |
|---|---|
| r161 | `build/three.js` and `three.min.js` removed (ESM only). Precision qualifiers for all sampler types. |
| r162 | `WebGLMultipleRenderTargets` removed; use the `count` option. |
| r163 | **WebGL 1 removed** (the constructor throws for a WebGL 1 context). **`stencil` defaults to false.** |
| r165 | New signatures for `copyTextureToTexture` / `copyFramebufferToTexture`. r186 has `(src, dst, srcRegion, dstPosition, srcLevel, dstLevel)`. |
| r170 | `Material.type` is static. **Mipmaps are generated whenever `generateMipmaps` is true, regardless of filter.** `copyTextureToTexture3D` deprecated. |
| r171 | `three/webgpu` and `three/tsl` entry points. The `three.core.js` split (PR #29404, per a forum thread) [medium] |
| r174 | `Timer` no longer uses the Page Visibility API unless you call `timer.connect(document)`. |
| r177 | `ColorManagement.fromWorkingColorSpace`/`toWorkingColorSpace` renamed to `workingToColorSpace`/`colorSpaceToWorking`. |
| r179 | **`Timer` moved to core** (`THREE.Timer`). **`reverseDepthBuffer` renamed to `reversedDepthBuffer`.** |
| r180 | GLSL defines renamed: `USE_LOGDEPTHBUF` to `USE_LOGARITHMIC_DEPTH_BUFFER`, `USE_REVERSEDEPTHBUF` to `USE_REVERSED_DEPTH_BUFFER`. Matters if your shaders test them. |
| r182 | `PCFSoftShadowMap` deprecated for WebGL (`PCFShadowMap` is now soft). |
| r183 | **`Clock` deprecated.** Constructing one logs a warning (`core/Clock.js:61`); use `Timer`. The engine uses `gsap.ticker`, so neither applies. |
| r184 | Render targets use the working colour space (#33036). **ImageBitmaps are never flipped** (#33073). Pixel-store caching: use `renderer.state.pixelStorei()` (#33227). `FileLoader.load()`/`ImageBitmapLoader.load()` no longer return a value. |
| r185 | GLSL `inverseTransformDirection()` deprecated (use `transformDirectionByInverseViewMatrix()`). `Object3D.updateWorldMatrix()` honours `matrixWorldNeedsUpdate`. `position` always bound to location 0. Context-restore framebuffer fix. Reversed-depth sorting fix. |
| r186 | `Object3D.dispose()` added (subclasses must call `super.dispose()`). `Source` renamed to `TextureSource` (the old name warns). **The CommonJS build is deprecated:** `build/three.cjs` is a `require(esm)` shim that emits a `DeprecationWarning` (relevant only to Node scripts that `require('three')`). **Minified builds removed.** Top-level side effects removed in `src/nodes` (tree-shaking). |
| in source, date unconfirmed | WebGLRenderer `outputBufferType` + `setEffects()` + `WebGLOutput` (an HDR output path). Not in the migration guide; `WebGLOutput` already existed in r185 (#33446). [low on the release] |

Also gone from r186 (grep finds none): `outputEncoding`, `sRGBEncoding`, `useLegacyLights`, `physicallyCorrectLights`; and the `ShaderMaterial.extensions` flags `derivatives`, `fragDepth`, `drawBuffers` and `shaderTextureLOD`.

### 10.2 Packaging [high]

- **Exports map** (`three/package.json`):

  | specifier | file |
  |---|---|
  | `"."` (import) | `./build/three.module.js` |
  | `"."` (require) | `./build/three.cjs` |
  | `"./addons"` | `./examples/jsm/Addons.js` (a barrel) |
  | `"./addons/*"` | `./examples/jsm/*` |
  | `"./examples/jsm/*"` | `./examples/jsm/*` |
  | `"./src/*"` | `./src/*` |
  | `"./webgpu"` | `./build/three.webgpu.js` |
  | `"./tsl"` | `./build/three.tsl.js` |

- **Build files.** `"type": "module"`. `"sideEffects": ["./src/nodes/**/*"]`, so everything else is declared side-effect-free and tree-shakable. `build/` holds only `three.core.js` (1.46 MB unminified), `three.module.js` (0.66 MB, which imports `./three.core.js` and adds `WebGLRenderer`, ShaderChunk and ShaderLib), `three.webgpu.js`, `three.webgpu.nodes.js`, `three.tsl.js` and the `three.cjs` shim. **There are no `.min.js` files any more.**
- **Import from `"three"` and `"three/addons/…"` only.** Mixing in `three/src/*` paths duplicates classes (two `Mesh` classes, broken `instanceof`).

### 10.3 Tree-shaking and size [high for the measured numbers; medium for transfer to Turbopack]

Measured with esbuild 0.28.2 (installed as a wrangler dependency): bundle, minify, ESM, gzip level 9. Scripts are in `scratchpad\t1-bundle\`.

| entry | minified | gzip | brotli |
|---|---|---|---|
| `import { Vector3 }` only (the floor) | 243 KB | 55 KB | 45 KB |
| `WebGLRenderer`, `Scene`, both cameras, `ShaderMaterial`, `Mesh`, `BufferGeometry`/`BufferAttribute`, the Instanced* classes, `WebGLRenderTarget`, `Texture`/`DataTexture`, constants, `Vector3`/`Vector4`/`Matrix4`/`Frustum`/`Box3` | 517 KB | **130 KB** | 107 KB |
| the same + Line2, LineMaterial, LineGeometry, LineSegments2 | 545 KB | **137 KB** | 113 KB |
| `import * as THREE from "three"` | 725 KB | **186 KB** | 151 KB |

- **three's own size bot agrees.** On PR #34332 (r186) it reports "Minimal WebGL build" 515.85 KB minified / **124.88 KB gzip**, "Core" 388.49 / 101.98 KB, and "Full WebGL ESM" 372.43 / 87.92 KB (https://github.com/mrdoob/three.js/pull/34332).
- **What tree-shaking means here.** Named imports through `"three"` shake down to roughly the renderer plus core; three cannot get below about 55 KB gzipped. Never use `import * as THREE` in the scene-2 chunk: that adds about 55 KB gzipped for nothing.
- **Turbopack and webpack** both honour ESM plus `sideEffects`, so expect the same order of size. **Measure the real chunk after `next build`.** Budget: 300 KB gzipped for scene 2, so three takes about 130 to 140 KB of it, and troika and scene code share the rest.

---

## 11. @types/three 0.186.0 with TypeScript 7 and moduleResolution "bundler" [high]

- **Test set-up.** I type-checked a sample file with TypeScript **7.0.2** (the installed native compiler), `moduleResolution: "bundler"`, `module: "esnext"`, `strict` and **`skipLibCheck: false`** (scratchpad `t1-tscheck`). It covered every API used in these notes: `WebGLRenderer` options including `reversedDepthBuffer`/`outputBufferType`, `setViewOffset`/`filmOffset`/`reversedDepth`, GLSL3 `ShaderMaterial`, half-float and RG targets, `DataTexture.internalFormat`, `initTexture`/`initRenderTarget`, the `copyTextureToTexture` 6-argument form, `compileAsync`, `info`, `forceContextLoss`, `InstancedBufferAttribute.setUsage/addUpdateRange/clearUpdateRanges`, Line2/LineMaterial/LineGeometry/LineSegments2 from `three/addons/lines/*.js`, `import * as Addons from "three/addons"`, `Timer`, `TextureSource` and `setConsoleFunction`.
- **Result: no errors.** The whole reachable `.d.ts` graph checks cleanly. A control file with three planted errors produced exactly those three errors, so the check was real.
- **The project's `"types": ["node"]` does not block @types/three.** It only limits global auto-inclusion; `import … from "three"` still resolves `@types/three`.
- **Small type quirks** (seen in the `.d.ts`):
  - `renderer.getContext()` is typed `WebGLRenderingContext | WebGL2RenderingContext`. Cast it for WebGL 2-only calls.
  - `LineSegments2` declares a `resolution: Vector2` property that does not exist at runtime. The real one is `material.resolution`.
  - `ShaderMaterial.uniforms` values are `any`.
  - `geometry._maxInstanceCount` and `material`/`texture` GPU properties are not typed (they are internals).
  - `@types/three` declares `"typeScriptVersion": "5.6"` as its minimum. TS 7 is fine.

---

## 12. Headless testing (Playwright 1.64.1, Chromium 156.0.8078.4) [high: observed on this machine]

### 12.1 What Playwright installs and how it launches

- **Browsers.** `playwright-core/browsers.json` lists `chromium` revision 1248 (Chrome for Testing 156.0.8078.4) and `chromium-headless-shell` revision 1248 (156.0.8078.4). Both are installed under `D:\ms-playwright` (`PLAYWRIGHT_BROWSERS_PATH`).
- **Executable choice.** Playwright runs `chromium-headless-shell` for `headless: true` without a channel, and the full Chromium (new headless) for `channel: "chromium"` (`playwright-core/lib/coreBundle.js:44791-44796`). Since v1.49 the old headless lives only in the shell build; new headless is opt-in through `channel: "chromium"` (https://github.com/microsoft/playwright/issues/33566).
- **Default switches** (`lib/coreBundle.js:44756-44760` and `chromiumSwitches` at 36209-36258):
  - **`--enable-unsafe-swiftshader`** on every Chromium launch through CDP. The BiDi path adds it only on macOS (44960). **So SwiftShader WebGL works with no extra flags.**
  - `--force-color-profile=srgb`, which makes screenshots colour-stable.
  - No `--use-angle`, `--use-gl` or `--disable-gpu`.

### 12.2 What each mode renders with (probe)

| launch | WebGL 2 renderer (`UNMASKED_RENDERER_WEBGL`) |
|---|---|
| headless shell (default) | `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)…), SwiftShader driver)` |
| headless shell + `--enable-gpu` | `ANGLE (Intel, Intel(R) Arc(TM) Graphics … Direct3D11 vs_5_0 ps_5_0, D3D11)` |
| headless shell + `--use-gl=angle --use-angle=swiftshader` | SwiftShader |
| **`channel: "chromium"` (new headless), no flags** | **Intel Arc, D3D11**: new headless uses the GPU on this Windows laptop |
| new headless + `--enable-gpu` or `--use-angle=d3d11` | Intel Arc, D3D11 |
| new headless + `--use-gl=angle --use-angle=swiftshader` | SwiftShader, which forces software rendering for machine-independent screenshots |

- The project's playwright config comment that the `perf` and `docs` projects "render on the GPU" with `channel: "chromium"` is correct on this machine. On a machine without a usable GPU the same config falls back to SwiftShader. Playwright's flag allows that.

### 12.3 Flags, and since when they are needed

- **`--enable-unsafe-swiftshader`.** Chromium deprecated the automatic SwiftShader fallback for WebGL from **Chrome 130** (a console warning, which the flag silences). Sources disagree on when the fallback became opt-in:
  - the Intent to Remove gave **137** as the estimated desktop milestone;
  - a chromedp commit says it is **opt-in from Chromium 139**, and already so in upstream Chromium 138 builds.

  From then on, WebGL context creation **fails** instead of falling back, unless the flag is passed (https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM/m/oLrB5up_BwAJ; https://chromium.googlesource.com/external/github.com/chromedp/chromedp/+/refs/tags/v0.14.1). [medium on the exact milestone; high that 156 needs it and that Playwright adds it]
- **`--use-gl=angle --use-angle=swiftshader`** selects SwiftShader as the driver. **`--use-angle=swiftshader-webgl`** (with `--enable-unsafe-swiftshader`) selects the WebGL-only fallback path (https://chromium.googlesource.com/chromium/src/+/HEAD/docs/gpu/swiftshader.md).
- **Headless defaults to SwiftShader, and `--enable-gpu` restores normal GPU selection.** A Chromium developer said so for headless from m112 (https://groups.google.com/a/chromium.org/g/chromium-dev/c/8eR2GctzGuw). Chrome's own blog says headless disables the GPU by default, but that was about Linux (https://developer.chrome.com/blog/supercharge-web-ai-testing). Observed here: true for the **headless shell**, not for **new headless on Windows**, which picked the Arc unprompted.
- **`--ignore-gpu-blocklist`** only matters when the GPU is blocklisted (VMs, old drivers). It is not needed here.

### 12.4 Where SwiftShader and the Arc differ (probe and `limits.cjs`)

- **`KHR_parallel_shader_compile`:** missing on SwiftShader, so three warns on `compileAsync`.
- **`EXT_texture_norm16`:** missing on SwiftShader.
- **`EXT_disjoint_timer_query_webgl2`:** missing in the default shell; present on the Arc, which allows GPU timing in `?debug`.
- **Limits:**

  | limit | SwiftShader | Arc |
  |---|---|---|
  | `MAX_TEXTURE_SIZE` | 8192 | 16384 |
  | **`MAX_TEXTURE_IMAGE_UNITS` (fragment) and vertex texture units** | 32 | **16** |
  | `MAX_FRAGMENT_UNIFORM_VECTORS` | 4096 | **1024** |
  | `MAX_VARYING_VECTORS` | 31 | 30 |
  | `MAX_SAMPLES` | 4 | 8 |

  Canvas MSAA gave 4 samples on both, and `DEPTH_BITS` was 24 on both. **A shader that passes on SwiftShader can fail on the owner's GPU** if it uses more than 16 samplers per stage or more than 1024 fragment uniform vectors. Test in `channel: "chromium"` as well.
- **Console noise.** SwiftShader prints *"GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels"* as a **warning** whenever a test calls `gl.readPixels`. Together with three's KHR warning, this means "no console messages" assertions should check **errors** only, or filter these two.
- **Pixel sampling in tests.** With `preserveDrawingBuffer: false`, read the canvas through `page.screenshot()` and decode the PNG (for example with `sharp`, already a dev dependency). Alternatively, call `renderer.render()` and `gl.readPixels()` inside the same `page.evaluate()`. `toDataURL` or `drawImage` in a later task returns blank.
- **Timing is meaningless on SwiftShader.** New headless on the GPU is closer, but still not the owner's screen. The perf budget stays owner-verified.

### 12.5 Sketch: Playwright projects

```ts
// correctness and screenshots on any machine (SwiftShader; Playwright adds --enable-unsafe-swiftshader)
{ name: "chart", use: { ...desktop, viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 } },
// the same suite on this laptop's GPU (catches the 16-sampler and 1024-uniform limits of the Arc)
{ name: "chart-gpu", use: { ...desktop, channel: "chromium", viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 } },
// identical software rendering even in new headless (stable screenshots across machines)
{ name: "chart-sw", use: { ...desktop, channel: "chromium", launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader"] } } },
```

---

## 13. Notes on the existing engine code (commit d7cb296), from this research

These are read-only observations for step 1 (type-check and lint).

1. **`terrain/field.ts` against the v3 data manifest.** `decode()` reads `this.manifest.sdf.core`, `this.manifest.sdf.coreShare` and `tile.info.sdfTail`. The `ChartManifest`/`TileInfo` types (`data/manifest.ts`) and `public/chart/manifest.json` have only `sdf.bits`, `height.bits` and `sdfRange`. `tsc` will flag this, and the decode constants must follow the v3 codes (12-bit height and SDF).
2. **Tile order.** `load()` treats `manifest.tiles[0]` as the overview and the rest as details, but the v3 manifest lists `surround`, `overview` and `cadiz` (detail), in that order. Pick tiles by `role`.
3. **`Terrain.update()`** calls `addUpdateRange(0, count * 4)` even when `count === 0`, which uploads the whole instance buffer (section 7.3).
4. **`Chart.ts` frustum** omits the reversed-depth flag. That is fine while `reversedDepthBuffer` is off (section 9).
5. **Opaque shaders already write alpha 1**, which is needed because the context always has alpha. Palette `Vector3`s are written without conversion, i.e. treated as sRGB-encoded (section 1.3).
6. **`Chart.warm()`** uses `compileAsync()` only. Add the hidden warm-up render and `initTexture()` (section 4). Run both again after a context restore, together with the render-target re-bake that `onRestored()` already does.
7. **The stats readout** takes `renderer.info.render.calls` right after the main render. That is correct for the main pass only; re-bakes or other `render()` calls in the same tick are not counted unless `autoReset` is off (section 5).

---

## 14. Where sources disagree (the package wins where it is the question)

| topic | source A | source B | what this note follows |
|---|---|---|---|
| `copyTextureToTexture` level arguments | migration guide r164 to r165: single `level` | installed r186: `srcLevel, dstLevel` (WebGLRenderer.js:3336; types agree) | the package |
| reversed depth versus log depth | WebGLRenderer JSDoc (line 3701-3702): reversed is "faster and more accurate" than log depth | Reed: with an **integer** depth buffer (the canvas's 24-bit) reversed-Z gains little; a float depth buffer is needed | both true. Faster: yes, early-z is kept. More accurate: only with a float depth attachment. |
| combining log and reversed depth | forum answer: can't enable both | r186 source: no guard, both defines emitted | don't combine (the log chunk writes unreversed depth) |
| SwiftShader fallback becomes opt-in | Intent to Remove: estimated Chrome 137 | chromedp commit: 139 (138 upstream already) | the exact milestone is uncertain. 156 needs the flag; Playwright adds it. |
| headless GPU use | Chrome blog (Linux): headless disables GPU by default; Chromium developer: headless uses SwiftShader by default | observed on Windows with Chromium 156: the headless **shell** uses SwiftShader; **new headless** uses the Arc (D3D11) | observation |
| `alpha: false` | the option name suggests an opaque context | source and the browser: the context always has alpha; the option only sets the clear alpha | the package |
| `LineSegments2.resolution` | @types declares the property | runtime: only `material.resolution` exists | the runtime |
| `reverseDepthBuffer` | older posts and examples | renamed `reversedDepthBuffer` in r179 (migration guide; WebGLCapabilities.js:96) | the package |
| when `three.core.js` appeared | forum: r171 PRs (#29404, #29644) | CDN listing first seen at 0.172.0 | r171 [medium] |

---

## 15. Experiments run (all outside the repository)

Root: `C:\Users\User\AppData\Local\Temp\claude\d--dev-trafalgar-1805\81d46a93-68b9-4541-8365-f913ef045b3d\scratchpad\`

- **`t1-probe\probe.cjs`:** raw WebGL 2 capabilities and extensions under 7 launch configurations (section 12).
- **`t1-probe\run3.cjs`** and **`run-any.cjs`:** these serve three's build files through `page.route` to an import-mapped page, then run a test module in both the headless shell and new headless. The modules:
  - `test.js`: shader prefixes, colour output, alpha, ImageBitmap and DataTexture flipY/premultiply, half-float target readback, RG8 target, programs per target, info counters, instanced culling, Line2 cap, compileAsync timing, context loss and restore;
  - `warm.js`: first-frame cost per warm-up strategy;
  - `test2.js`: half-float filtering, the Float16Array upload, the Line2 dash trick;
  - `revdepth.js`: `depthFunc` under reversed depth.
  - Output of the first run: `t1-probe\run3-output.txt`.
- **`t1-probe\limits.cjs`, `caveat.cjs`:** WebGL limits; `failIfMajorPerformanceCaveat`.
- **`t1-probe\cam.mjs`:** `setViewOffset`, the manual lens shift, `filmOffset`, the reversed frustum, depth-step tables (Node, against `three.module.js`).
- **`t1-bundle\build.cjs`:** esbuild size measurements.
- **`t1-tscheck\check.ts`, `tsconfig.json`:** TypeScript 7 type-check. The temporary junction to node_modules was removed with `rmdir` (link only) afterwards.

---

## Sources

**Installed files** (ground truth; paths under `D:\dev\trafalgar-1805\node_modules\`):

- three:
  - `three/package.json`; `three/build/three.cjs`; `three/src/constants.js`; `three/src/utils.js`
  - `three/src/renderers/WebGLRenderer.js`; `three/src/renderers/webgl/WebGLProgram.js`, `WebGLPrograms.js`, `WebGLTextures.js`, `WebGLState.js`, `WebGLCapabilities.js`, `WebGLExtensions.js`, `WebGLInfo.js`, `WebGLAttributes.js`, `WebGLBindingStates.js`, `WebGLUniforms.js`, `WebGLBackground.js`, `WebGLOutput.js`, `WebGLIndexedBufferRenderer.js`
  - `three/src/materials/ShaderMaterial.js`, `Material.js`; `three/src/textures/Texture.js`, `DataTexture.js`; `three/src/core/RenderTarget.js`, `BufferAttribute.js`, `InstancedBufferGeometry.js`, `Clock.js`, `Timer.js`
  - `three/src/objects/InstancedMesh.js`, `Mesh.js`; `three/src/math/Frustum.js`, `Matrix4.js`, `ColorManagement.js`, `Color.js`; `three/src/cameras/PerspectiveCamera.js`, `Camera.js`; `three/src/loaders/ImageBitmapLoader.js`; `three/src/renderers/shaders/ShaderChunk/*.glsl.js`
  - `three/examples/jsm/lines/LineMaterial.js`, `LineSegments2.js`, `LineSegmentsGeometry.js`, `LineGeometry.js`, `Line2.js`
- @types/three: `@types/three/package.json`, `src/renderers/WebGLRenderer.d.ts`, `src/renderers/webgl/WebGLCapabilities.d.ts`, `src/renderers/webgl/WebGLInfo.d.ts`, `examples/jsm/lines/*.d.ts`, `src/materials/ShaderMaterial.d.ts`
- Playwright: `playwright-core/browsers.json`, `playwright-core/lib/coreBundle.js`, `@playwright/test/package.json`
- TypeScript: `typescript/package.json` (7.0.2)

**Web:**

- three.js:
  - Migration guide: https://github.com/mrdoob/three.js/wiki/Migration-Guide
  - Release notes: r186 https://github.com/mrdoob/three.js/releases/tag/r186 · r185 https://github.com/mrdoob/three.js/releases/tag/r185 · r184 https://github.com/mrdoob/three.js/releases/tag/r184 · r183 https://github.com/mrdoob/three.js/releases/tag/r183
  - Tree-shaking PR with the size bot figures: https://github.com/mrdoob/three.js/pull/34332
  - Manual, WebGPURenderer page (WebGLRenderer still recommended for pure WebGL 2; WebGPURenderer experimental; no ShaderMaterial/onBeforeCompile there): https://threejs.org/manual/pages/webgpurenderer.html
- Specifications and MDN:
  - WebGL 1.0 spec, Pixel Storage Parameters (ImageBitmap ignores the three unpack flags): https://registry.khronos.org/webgl/specs/latest/1.0/
  - WebGL 2.0 spec, `bufferSubData` length 0: https://registry.khronos.org/webgl/specs/latest/2.0/
  - MDN, EXT_color_buffer_half_float: https://developer.mozilla.org/en-US/docs/Web/API/EXT_color_buffer_half_float
- Depth precision and ANGLE:
  - N. Reed, Depth Precision Visualized (NVIDIA): https://developer.nvidia.com/content/depth-precision-visualized
  - ANGLE, Dynamic Shader Compilation: https://chromium.googlesource.com/angle/angle/+/HEAD/doc/DynamicShaderCompilation.md
- Chromium and Playwright:
  - Chromium, Using Chromium with SwiftShader: https://chromium.googlesource.com/chromium/src/+/HEAD/docs/gpu/swiftshader.md
  - blink-dev, Intent to Remove: SwiftShader Fallback: https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM/m/oLrB5up_BwAJ
  - chromedp commit on `--enable-unsafe-swiftshader` (139/138): https://chromium.googlesource.com/external/github.com/chromedp/chromedp/+/refs/tags/v0.14.1
  - chromium-dev, headless uses SwiftShader by default; `--enable-gpu` from m112: https://groups.google.com/a/chromium.org/g/chromium-dev/c/8eR2GctzGuw
  - Chrome blog, headless GPU testing (Linux): https://developer.chrome.com/blog/supercharge-web-ai-testing
  - Playwright v1.49 headless changes: https://github.com/microsoft/playwright/issues/33566
  - (low weight) a guide on headless GPU flags: https://screenshotneo.com/blog/headless-chrome-real-gpu-swiftshader/
- three.js forum (pointers only):
  - `three.core.js` split: https://discourse.threejs.org/t/three-js-now-imports-three-core-js/75187
  - `reversedDepthBuffer` at runtime: https://discourse.threejs.org/t/can-three-js-dynamically-set-reverseddepthbuffer-what-is-the-proper-way-to-do-it/90217
  - Log-depth cost: https://discourse.threejs.org/t/beware-of-logarithmic-depth-buffer-it-can-degrade-scene-performance/88495
  - Growing Line2: https://discourse.threejs.org/t/adding-points-drawcount-for-line2-dynamically/48980
