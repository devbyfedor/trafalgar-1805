# T3: GreenSock's official agent skills, applied to scene 2

Research notes for Stage A of scene 2 ("The road to Trafalgar"): a pinned, scroll-scrubbed WebGL chart whose camera follows scroll progress and whose renderer draws from `gsap.ticker`. Prepared 25 October 2026.

## 0. Scope, versions and method

- **Project versions** (`package.json`, checked in `node_modules`): gsap 3.15.0, @gsap/react 2.1.2, lenis 1.3.27, react 19.3.1, next 16.4.3. `npm view` on 25 October 2026 gives the same three as the latest releases (gsap 3.15.0 was published 13 April 2026). Confidence: high.
- **The skills**: repository `greensock/gsap-skills`, branch `main`, commit `aed9cfd` (21 April 2026), cloned in full with history. It holds eight skills (`gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-utils`, `gsap-react`, `gsap-performance`, `gsap-frameworks`), each a **single `SKILL.md`**, plus `skills/llms.txt`, Copilot instruction files under `.github/` and small examples. **There are no `references/` files, and the history shows there never were any.** The repo's own `AGENTS.md` only says long material *could* go in `references/`. Confidence: high.
- **What the skills don't cover** (so these notes take it from the official docs and the 3.15 source, and say so each time): `anticipatePin`, `invalidateOnRefresh` (only named once, as an option `batch()` refuses), `gsap.ticker` and `lagSmoothing`, `ScrollTrigger.normalizeScroll`, Lenis, `labelToScroll`, canvas or WebGL rendering, and React StrictMode beyond "useGSAP cleans up".
- **Source checks**: GSAP's tagged sources at `3.15.0` (`src/ScrollTrigger.js`, `src/gsap-core.js`, `src/SplitText.ts`) are byte-identical to `node_modules/gsap/src/`. The same holds for `@gsap/react` tag `2.1.2` (`src/index.js`). Lenis is cited at tag `v1.3.27`. All line numbers below refer to those tagged files, so the links are stable.
- **Confidence scale, adapted to software.** *High*: the skill, the official docs and the 3.15 source agree, or the docs and the source agree. *Medium*: one of them (usually the source alone), or a direct inference from the source. *Low*: an inference not yet tested on the owner's machine, or sources that conflict.
- Everything below is paraphrased. The only verbatim text is API identifiers and short code tokens, where the token itself is the evidence.

## 1. The ten things that matter most for scene 2

1. **Drive the camera from the scrubbed timeline, not from ScrollTrigger's `onUpdate`.** `onUpdate` fires only when the raw scroll progress changes, and passes that raw progress. With a numeric `scrub` the timeline's playhead lags behind it, eased. A camera fed from `onUpdate` would run ahead of the captions and stop once the scroll settles, while they are still moving. Put the camera's parameters on the master timeline: tween a plain "rig" object, or read `tl.progress()` in the ticker. (§4.1; high)
2. **One render per tick, from `gsap.ticker`, added with a plain `add()` (not prioritised).** GSAP's root render is ticker listener 0, the prioritised Lenis step runs before it, and ordinary listeners run after it. So a draw added with `gsap.ticker.add(draw)` sees this tick's scroll and this tick's tween values. (§2.7; high)
3. **The skills get `refreshPriority` backwards.** The ScrollTrigger skill says, in both its config table and its best practices, that lower values refresh first. The official docs and the 3.15 sort function both refresh **higher** values first. This matters if scene 2's chunk-loaded triggers are created after triggers lower on the page. (§5; high)
4. **Keep scene 1's separate in-view ScrollTrigger pattern** (wrapper, `"top bottom"` to `"bottom top"`, `onToggle` plus `onRefresh`, plus `visibilitychange`). Renders stop when the scene is off screen or the tab is hidden. (§4.2; high)
5. **Never use `easeReverse` or `yoyoEase` in the scrubbed timeline** (`easeReverse` is new in 3.15.0). The 3.15 source re-bases a tween every time its playhead changes direction, so the same scroll position would give different frames depending on scroll history. The camera must be a pure function of progress. (§2.1; high)
6. **`anticipatePin` under Lenis needs testing at the scene 1 to 2 handover.** It looks ahead 45 ms × the value at the current velocity and pins early. Lenis moves the scroll on the main thread inside the GSAP tick (wheel only), so the threaded-scroll flash it exists to hide shouldn't happen for wheel input, while the early pin could cause a jump of up to a few dozen pixels. Keys and the scrollbar stay native and threaded, and there it still helps. (§2.3; low, untested)
7. **No per-frame allocations from GSAP helpers.** Every `gsap.utils` call that is given its value (`clamp`, `mapRange`, `normalize`, `interpolate`…) builds a fresh closure. Build the function forms once and call them per frame. Tween numbers, not colour strings, for uniforms. (§2.8; high)
8. **Create the pin and the timeline at mount, not when the three.js chunk arrives.** The page length is then fixed from the start, and the engine attaches to the rig object later. A pinned trigger created late queues a full refresh by itself, but a page that grows under a scrolling reader still jumps. (§4.4; medium)
9. **StrictMode runs the useGSAP callback twice in development**, reverting the first run completely. GSAP objects are cleaned up for you; WebGL, ticker listeners, observers and DOM listeners are not. Give each mount its own canvas element, or keep the engine outside the effect. (§2.6; medium)
10. **Don't add `ScrollTrigger.normalizeScroll`, ScrollSmoother or ScrollTrigger `snap`.** Lenis already owns wheel input, and a second wheel interceptor or scroll tween would fight it. No `will-change` on the pinned section or any ancestor: it breaks `position: fixed` pinning. (§2.9, §2.10; medium)

## 2. Rules that apply to a pinned, scrubbed WebGL scene

Each topic gives what the skills say, what the docs and the source add, and how it applies to scene 2.

### 2.1 Timeline structure

- **Skills.** Put the ScrollTrigger on the top-level timeline or tween only, never on a child tween, and never nest a ScrollTriggered animation inside another timeline ([scrolltrigger L283–L285][sk-st-dont], [timeline L100, L107][sk-tl-best]). Use `scrub` *or* `toggleActions`, never both; if both are given, scrub wins ([scrolltrigger L277, L287][sk-st-best]). Pass `defaults` to the timeline and place tweens with the position parameter and labels ([timeline L26–L71][sk-tl-pos]). When several `from()`/`fromTo()` tweens target the same property of the same element, give the later ones `immediateRender: false` ([core L65][sk-core-ir]). Function-based values run once per target, at the tween's first render ([core L178–L186][sk-core-fn]). Confidence: high.
- **Docs.** Under scrub, tween durations only set *proportions* of the scroll distance; more scroll per beat means a longer start-to-end distance ([ScrollTrigger docs, FAQ on duration with scrub][docs-st]). Confidence: high.
- **3.15 source.** `easeReverse` (new in 3.15.0, replacing `yoyoEase` internally) makes a tween re-base its ratio whenever its local time reverses direction ([gsap-core L2125][gs-core-ereverse], [L2481–L2493][gs-core-inv]). Under scrub every reversal of scrolling triggers this, so the rendered value depends on scroll history. The 3.15.0 release notes announce the feature without warning about scrubbing ([release 3.15.0][gs-rel]). Confidence: high, from source reading.
- **Scene 2.** Keep scene 1's conventions (documented in [choreography.ts L5–L18][pj-chor]): a master timeline of duration exactly 1 (closed with `tl.set({}, {}, 1)`), absolute positions equal to p, `defaults: { ease: "none" }`, plain eases only. Add **labels for the beats** (`boulogne`, `chase`, `finisterre`, `cadiz`, `night`). They make the choreography readable and let tests scroll to a beat exactly (see `labelToScroll`, §6.3).

### 2.2 Scrub

- **Skills.** `scrub: true` links the playhead directly to scroll; a number is the time in seconds the playhead takes to catch up ([scrolltrigger L52, L151–L167][sk-st-scrub]). The performance skill adds that a small numeric scrub can reduce work while scrolling, and to test on low-end devices ([performance L56–L60][sk-perf-st]). Confidence: high for the definition, medium for the performance claim (see §5).
- **3.15 source.** A numeric scrub creates one paused tween per trigger, `gsap.to(animation, { totalProgress, ease: "expo", duration: scrub, inherit: false })` ([ScrollTrigger L654–L661][gs-st-scrubdur]). Each scroll update retargets it with `resetTo("totalProgress", clipped, …)` ([L1114][gs-st-resetto]), so the playhead eases out (expo.out) toward the latest scroll progress over `scrub` seconds. `scrub: true` or `scrub: 0` sets `animation.totalProgress()` directly inside the update (`isToggle = !scrub && scrub !== 0`, [L615][gs-st-istoggle]). `self.getTween()` returns the scrub tween ([L1200][gs-st-gettween]); `onScrubComplete` fires when it settles. Confidence: high.
- **With Lenis there are two smoothing stages in series.** Lenis's `lerp` is applied as a frame-rate-independent exponential damp with λ = `lerp` × 60 = 6 per second at the default 0.1 ([Lenis animate.ts L43][ln-animate], [maths.ts L46–L48][ln-maths]). That is a time constant of about 0.17 s. Then comes the scrub tween (0.6 s expo.out in scene 1). Both stages act on the whole timeline, so captions, date line and camera stay in step. Confidence: high for the mechanics.
- **Scene 2.** Use the same scrub as scene 1 (`0.6`, [Scene01Dawn.tsx L156][pj-dawn-st]) so the handover feels like one continuous scroll. Revisit only if the camera feels sluggish on the owner's laptop, and record the value. **Never add a third smoothing in the renderer** (for example lerping the camera toward a target each frame). It adds lag and breaks "same scroll position, same frame". Confidence: medium (design inference).

### 2.3 Pin and `anticipatePin`

- **Skills.** `pin: true` pins the trigger element. Don't animate the pinned element itself; animate its children. `pinSpacing` defaults to true (a spacer keeps the layout from collapsing); set it false only when the layout is handled another way ([scrolltrigger L54–L55, L169–L183][sk-st-pin]). With `pin: true` the default start is `"top top"` ([L49][sk-st-table]). Pin only what's needed ([performance L58][sk-perf-st]). Confidence: high.
- **Docs, not in the skills.** `anticipatePin` defaults to 0; 1 is typically fine. It exists because most browsers scroll on a separate thread, so content can show unpinned for about a frame when you scroll fast into a pin. For the viewport scroller, pinning uses `position: fixed`. A `transform` or `will-change: transform` on an ancestor breaks fixed positioning, and the pinning FAQ also names triggers created out of page order and `content-visibility` as causes of jumping pins ([ScrollTrigger docs][docs-st]). Confidence: high.
- **3.15 source.**
  - `anticipatePin` is multiplied by 45 ([L639][gs-st-ap45]). While the page is scrolling, an inactive trigger whose start lies within velocity (px/ms) × 45 ms × `anticipatePin` of the current scroll is treated as entered (progress 0.0001). A trigger past its end is treated the same way, as just re-entered (0.9999) ([L1085–L1091][gs-st-apuse]). Confidence: high.
  - While pinned, the element gets explicit pixel width and height and `position: fixed` ([L971–L979][gs-st-pxsize]).
  - When `pinSpacing` is left unset and the pin's parent is `display: flex`, it defaults to **false**; an explicit `true` forces padding ([L738][gs-st-flex]).
  - Creating a trigger with a pin queues a full refresh on the next animation frame ([L1294][gs-st-queue]).
  - During a refresh, a pinned trigger renders its animation to the end and back to 0, with callbacks suppressed, to measure transforms ([L985][gs-st-measure]). A renderer that reads values in its own ticker callback never sees these intermediate states; one that renders from tween callbacks might.
- **Inference for Lenis (needs testing).** Lenis cancels native wheel scrolling (`preventDefault`, [lenis.ts L577–L579][ln-wheel]) and writes the scroll position with `window.scrollTo({ behavior: "instant" })` from its `raf` ([L348–L355][ln-setscroll]), which here runs inside the GSAP tick. ScrollTrigger updates in the same tick, so for wheel input the new scroll offset and the pin's `position: fixed` reach the screen in the same frame, and the threaded-scroll flash shouldn't occur. `anticipatePin: 1` would then only pin early: at 1,000 px/s, about 45 px before the section reaches the top, so the section jumps up by that much as it pins. Scene 1 never shows this, because its pin starts at scroll 0. Scene 2's pin starts mid-scroll, exactly where the brief forbids any visible jump. Keyboard and scrollbar scrolling stay native ([SmoothScroll.tsx L54–L62][pj-ss-keys]), and there `anticipatePin` still earns its place. **Test 0 against 1 at the handover with wheel, keys and a scrollbar drag, and record the choice in decisions.md.** Confidence: low until tested.

### 2.4 `invalidateOnRefresh`, refresh, and async loading

- **Skills.** ScrollTrigger refreshes automatically on viewport resize, debounced by 200 ms. Call `ScrollTrigger.refresh()` after DOM or layout changes (new content, images, fonts), only when layout actually changed, and debounced where possible ([scrolltrigger L259–L270, L275][sk-st-refresh], [performance L60][sk-perf-st]). Create triggers top to bottom in page order, or set `refreshPriority` (see §5 for the sign) ([L279, L289][sk-st-best]). The skills don't describe `invalidateOnRefresh` at all. Confidence: high.
- **Docs.** `invalidateOnRefresh: true` calls the animation's `invalidate()` on every refresh. Function-based `start`/`end` values are re-run on every refresh. `refresh(true)` ("safe") waits at least one animation frame and up to about 200 ms. A refresh is much heavier than an update: it recomputes positions and reverts and re-applies pins ([refresh() docs][docs-refresh]). Confidence: high.
- **3.15 source.**
  - With `invalidateOnRefresh`, each refresh runs `animation.revert({ kill: false }).invalidate()` and re-renders the `immediateRender` children ([L838–L839][gs-st-inval]).
  - Function `start` and `end` are evaluated on every refresh **whether or not** `invalidateOnRefresh` is set ([L876, L879][gs-st-fnpos]).
  - `refresh()` with no argument is forced and runs at once, even mid-scroll. `refresh(true)` restarts the 0.2 s delayed call, whose non-forced refresh waits for `scrollEnd` if the user is still scrolling ([L1496][gs-st-refresh], [L264–L269][gs-st-refreshall], [L1410][gs-st-resize]).
  - The automatic refresh events are `visibilitychange` (only if the size changed while hidden), `DOMContentLoaded`, `load` and `resize` ([L1411][gs-st-resize]).
  - A media-query change reverts all triggers, re-runs the matching `matchMedia` handlers, then refreshes ([L1370–L1373][gs-st-mm]).

  Confidence: high.
- **Scene 2.**
  - The camera tweens write plain numbers into a rig object, so they don't need `invalidateOnRefresh`. Handle the aspect ratio in the renderer (camera aspect from the canvas size), not in tween values. Keep `invalidateOnRefresh` only if some DOM tween value is a function of the viewport. Confidence: medium.
  - `end` written as `"+=600%"` (six viewport heights) is equivalent to scene 1's function form, which is also fine ([L40][sk-st-startend]).
  - Async loading: see §4.4. If an async step does change layout, call `ScrollTrigger.refresh()` once after it. Never call it from a ResizeObserver or from the renderer.

### 2.5 `gsap.matchMedia()`

- **Skills.** Use it for breakpoints and reduced motion, with the conditions object form. The handler gets a context with `context.conditions` and may return a custom cleanup. `mm.revert()` undoes everything the handlers created; an optional third argument scopes selectors. Don't nest `gsap.context()` inside a matchMedia handler (it already is one). `gsap.matchMediaRefresh()` re-runs the handlers ([core L206–L237][sk-core-mm]). Confidence: high.
- **Docs.** The returned function runs when the query stops matching; don't call `revert()` inside it ([matchMedia docs][docs-mm]). Confidence: high.
- **3.15 source, beyond the docs.**
  - The handler also receives a second argument, a context-safe wrapper factory (`f => context.add(null, f)`) ([gsap-core L3001][gs-core-mmargs]).
  - A `MatchMedia` created while a context is active (for example inside a `useGSAP` callback) registers itself in that context ([L2978][gs-core-mmpush]), and the context reverts it on cleanup ([L2944][gs-core-revertdata]). The docs say nothing either way.

  Confidence: medium (source only).
- **Scene 2.** Use the same conditions as scene 1 (`DESKTOP_QUERY`, `REDUCED_MOTION_QUERY` from `src/lib/media.ts`). Desktop with motion: pin, timeline, engine. Reduced motion: the stills sequence the brief asks for, with no WebGL and no pin. Fallback: nothing is created and the chunk is never imported.

### 2.6 Cleanup: `useGSAP`, contexts and React 19 StrictMode

- **Skills.**
  - Prefer `useGSAP()` with a `scope`; register it once at module level as a plugin (`gsap.registerPlugin(useGSAP)`) ([react L24–L43][sk-react-use], [plugins L36][sk-plugins-reg]).
  - Wrap anything created *later* (event handlers, timeouts) with `contextSafe`, and remove manually added listeners in the returned cleanup ([react L80–L111][sk-react-safe]).
  - Without `useGSAP`, use `gsap.context()` in `useEffect` and call `ctx.revert()` in its cleanup ([L63–L78][sk-react-ctx]).
  - With dependencies, cleanup runs only on unmount unless `revertOnUpdate` is set ([L49–L61][sk-react-deps]).
  - Never touch GSAP during SSR ([L113–L118][sk-react-ssr]).
  - The skill's React example runs under `React.StrictMode` with gsap ^3.15.0 and @gsap/react ^2.1.2 ([examples/react][sk-ex-react]).

  Confidence: high.
- **Docs.** StrictMode runs effects twice, which can duplicate animations unless they are reverted, and `useGSAP` handles this through its context. App Router files need `"use client"` ([React guide][docs-react]). Confidence: high.
- **@gsap/react 2.1.2 source** ([index.js L14–L45][gr-src]).
  - It uses `useLayoutEffect` in the browser (`useEffect` on the server). It keeps one context per component instance and reuses it across StrictMode's mount, unmount and mount again.
  - In development the callback therefore **runs twice**, and the first run is fully reverted: tweens, timelines and their ScrollTriggers and pins, SplitText, any nested matchMedia, then the callback's returned cleanup functions ([gsap-core L2940–L2947][gs-core-revertdata]).
  - The callback receives `(context, contextSafe)`.

  Confidence: high.
- **Contexts don't track** ticker listeners, DOM and window listeners, `ResizeObserver`s, Lenis, timers, promises or WebGL objects. Those must be undone in the returned cleanup, as scene 1 does ([Scene01Dawn.tsx L238–L247][pj-dawn-cleanup]). Confidence: high.
- **Scene 2 (inference).**
  - Because the callback runs twice in development, a `WebGLRenderer` built inside it is created, disposed and created again. Per the HTML spec, `getContext("webgl2")` returns the *same* context object every time for a given canvas. If cleanup forced context loss on a canvas that the second mount reuses, that mount would start with a lost context.
  - So create the `<canvas>` element inside the effect (append on mount, remove on cleanup), or keep the engine outside the effect lifecycle, and dispose fully in cleanup.
  - `useLayoutEffect` runs before paint, so heavy work there delays first paint. Build the timeline and triggers synchronously (cheap), and create the WebGL engine asynchronously after the chunk loads.
  - Guard the async continuation with a `cancelled` flag, and create any GSAP object in it through the context, as scene 1 does for SplitText ([Scene01Dawn.tsx L191–L198][pj-dawn-split]).

  Confidence: medium.

### 2.7 `gsap.ticker` and `lagSmoothing` (not in the skills)

- **Docs** ([ticker docs][docs-ticker]).
  - `add(callback, once, prioritize)`, where both options arrived in 3.10.0. The callback receives `time` (seconds since the ticker started, pushed forward by lag smoothing), `deltaTime` (milliseconds since the last tick) and `frame`. `prioritize` puts the callback ahead of the global timeline update.
  - `remove(callback)`.
  - `lagSmoothing(threshold, adjustedLag)` defaults to 500 ms and 33 ms; `lagSmoothing(0)` effectively disables it.
  - `fps()` can only lower the rate; `deltaRatio(fps = 60)`; properties `time` and `frame`.
  - In hidden tabs, rAF and so the ticker are heavily throttled.

  Confidence: high.
- **3.15 source.**
  - `Timeline.updateRoot` is added to the ticker when the module loads ([gsap-core L3155][gs-core-root]), so it is listener 0. `add()` with `prioritize` uses `unshift`, otherwise `push` ([L957–L960][gs-core-add]).
  - **The order inside one tick in this project**: the Lenis step (prioritised) → Lenis emits `scroll` → `ScrollTrigger.update` retargets the scrub tween → `updateRoot` renders the global timeline (scrub tween, then master timeline, then rig values) → scene draws in the order they were added → the debug FPS counter.
  - Listeners receive `(time, deltaTime, frame)` ([L914][gs-core-call]).
  - `add(cb, true)` returns a *wrapper*, and only that wrapper can be removed. `add()` first removes an identical callback, so re-adding is idempotent ([L957–L960][gs-core-add]).
  - Defaults are a lag threshold of 500 ms and an adjusted lag of 33 ms; the ticker is capped at 240 fps ([L888–L892][gs-core-lag]). `lagSmoothing(0)` sets the threshold to Infinity ([L949–L950][gs-core-lagfn]).
  - The ticker only auto-sleeps when it has fewer than two listeners and nothing is active ([L1969–L1977][gs-core-sleep]). With Lenis's step plus `updateRoot` it never sleeps on desktop.

  Confidence: high.
- **Lenis** recommends exactly this wiring: `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add(time => lenis.raf(time * 1000))` and `gsap.ticker.lagSmoothing(0)` ([Lenis README L145–L161][ln-readme]). `raf(time)` derives its delta from the time passed in ([lenis.ts L713–L716][ln-raf]), and its damping is time-based, so a large delta simply completes the ease. Confidence: high.
- **Consequences for scene 2.**
  - With lag smoothing off for the whole page, a long frame (a shader compile, a texture upload, garbage collection) advances GSAP time by the full gap. The scrub tween simply finishes, and time-based loops jump.
  - Clamp `deltaTime` in any time-based motion of the renderer (ship bobbing, wake growth).
  - Pause time-based motion on `document.hidden` and resume it from a one-shot ticker callback, as scene 1 does ([Scene01Dawn.tsx L226–L232][pj-dawn-vis]).
  - Never run a second rAF loop: three.js's `setAnimationLoop` must not be used (the brief's one-clock rule).

  Confidence: high for the mechanics, medium for the advice.

### 2.8 Avoiding per-frame allocations

- **Skills.** Reuse timelines and never create tweens or timelines every frame ([performance L36–L40][sk-perf-many]). Use `gsap.quickTo()` for values that change often ([L42–L54][sk-perf-quickto]). For values used many times, build the function form of a utility once by omitting its last argument ([utils L19–L29, L273][sk-utils-fn]). Confidence: high.
- **3.15 source.**
  - `clamp`, `mapRange`, `normalize` and `wrap` all build their closure *before* checking whether a value was passed ([gsap-core L434–L437][gs-core-cond], [L574][gs-core-maprange]), so every call with a value allocates.
  - `interpolate(a, b, p)` builds a new interpolator on every call ([L579][gs-core-interp]). Its prebuilt object form mutates and returns the *same* object on each call: no allocation, but don't keep the reference expecting a snapshot.
  - String and colour interpolation builds new strings on every call.

  Confidence: high.
- **Scene 2.**
  - Build `mapRange`/`interpolate` functions at setup. Tween numbers (a 0–1 mix between baked lighting states, or RGB channels as numbers), never colour strings, for uniforms. Write into preallocated three.js vectors and uniforms; three's `Curve.getPointAt(u, target)` takes an output vector. This is outside the skills; check it against the r186 docs.
  - Touch the DOM only when a displayed value changes. The date line's text, for example, changes only when the day index changes, which is the dirty check GSAP's own image-sequence helper uses ([imageSequenceScrub helper][docs-imgseq]).
  - No React state per frame (scene 1 brief).

  Confidence: high.

### 2.9 `will-change`

- **Skills.** Animate transform and opacity. Put `will-change: transform` in CSS only on elements that actually animate, never on everything "just in case" ([performance L15–L30, L69, L77][sk-perf-wc]). Confidence: high.
- **Docs.** `will-change: transform` on an ancestor breaks fixed pinning, just as a transform does ([ScrollTrigger docs, pinType and FAQ][docs-st]). Confidence: high.
- **Scene 2.** No `will-change` on the WebGL canvas: nothing moves it with CSS, and an accelerated canvas is composited anyway (inference). None on the pinned section or any ancestor. Use it only on caption and date-line wrappers that move by transform, as `globals.css` already does for scene 1 ([globals.css L91–L101][pj-css]).

### 2.10 `ScrollTrigger.normalizeScroll`, ScrollSmoother and Lenis

- **Skills.** Lenis and `normalizeScroll` don't appear. For third-party scrollers the skills cover `scrollerProxy()`, which needs `ScrollTrigger.update` registered as the scroller's listener; its `pinType` is `"fixed"` if pins jitter and `"transform"` if they don't stick ([scrolltrigger L120–L149][sk-st-proxy]). For smoothing they recommend GSAP's own ScrollSmoother ([plugins L60–L73][sk-plugins-ss]). Confidence: high.
- **Docs.** `normalizeScroll()` moves scrolling onto the JavaScript thread, mainly to fix mobile problems (address bar, iOS jitter, overscroll). It is opt-in and called experimental, and handles wheel and touch, plus pointer if asked ([normalizeScroll docs][docs-norm]). Confidence: high.
- **3.15 source.** The normaliser cancels events with `preventDefault`, default type `"wheel,touch"` ([L1601–L1604][gs-st-normvars], [L1754][gs-st-norm]). ScrollTrigger also listens to `wheel` on the window, as a hook for third-party smooth scrollers ([L1359][gs-st-wheel]). Confidence: high.
- **Scene 2 (inference).** Lenis scrolls the real window, not a transformed wrapper, so no `scrollerProxy` is needed and pins use `position: fixed`. Don't enable `normalizeScroll`: the site is desktop-only and Lenis already takes the wheel, so two interceptors would compete. Don't add ScrollSmoother: it would be a second smoothing system. Don't use ScrollTrigger `snap` either: it tweens the native scroll position behind Lenis's back, and Lenis itself says CSS scroll-snap needs its own `lenis/snap` ([Lenis README, Limitations][ln-readme-lim]). Confidence: medium.

## 3. The existing code against these rules

| Where | What it does | Verdict |
| --- | --- | --- |
| [gsap.ts L1–L20][pj-gsap] | `"use client"`; registers `ScrollTrigger`, `SplitText`, `useGSAP` once, guarded by `typeof window` | Follows the skills (register once at top level; useGSAP as a plugin; no GSAP during SSR) |
| [SmoothScroll.tsx L31–L79][pj-ss] | `useEffect` + `gsap.matchMedia` (desktop, no reduced motion); `new Lenis({ autoRaf: false })`; `lenis.on("scroll", ScrollTrigger.update)`; `gsap.ticker.add(step, false, true)`; `lagSmoothing(0)` and restores `(500, 33)`; `lenis.resize()` on ScrollTrigger `refresh`; `mm.revert()` in cleanup | Follows Lenis's documented recipe, improved by prioritising the step (a documented ticker option). The restore values are GSAP's defaults. `ScrollTrigger.update` receives the Lenis instance as its `force` argument; only `=== true` forces, so this is harmless ([L1497][gs-st-update]). `useEffect` instead of `useGSAP` is fine: the matchMedia is the context and `mm.revert()` undoes it |
| [Scene01Dawn.tsx L119–L253][pj-dawn] | `useGSAP` with `scope`; matchMedia inside; scrubbed master timeline with the ScrollTrigger on the timeline; `pin`, `pinSpacing: true`, `anticipatePin: 1`, `scrub: 0.6`, `invalidateOnRefresh`, `markers: isDebug()` | Follows the skills. Markers appear only with `?debug`, which meets the "no markers in production" intent. Explicit `pinSpacing: true` also protects against the flex-parent default |
| [Scene01Dawn.tsx L159][pj-dawn-st] | `onUpdate: (self) => reportProgress("dawn", self.progress)` | Reports the **raw** scroll progress, not the smoothed playhead the viewer sees. Fine for scene 1's debug; for scene 2, report both (§4.6) |
| [Scene01Dawn.tsx L157][pj-dawn-st] | `invalidateOnRefresh: true` | Not needed by today's tweens, which all use fixed numbers; the `end` function re-runs anyway. Harmless, since the cost falls only at refresh. Not a departure from the skills, which are silent on it |
| [Scene01Dawn.tsx L250][pj-dawn-mmrevert] | `return () => mm.revert()` inside the useGSAP callback | Redundant: the 3.15 source registers the matchMedia in the hook's context and reverts it (§2.5), and a second `revert()` is a no-op. Keeping it is a reasonable guard against relying on undocumented behaviour |
| [Scene01Dawn.tsx L186–L198][pj-dawn-split] | SplitText created in `context.add()` after `fonts.ready`, with a `cancelled` guard; manual re-splits on `loadingdone` and on resize | Follows the skills (split after fonts; animations returned from `onSplit`). The manual re-splits are right: in 3.15 `autoSplit` watches fonts and width only when *lines* are split ([SplitText.ts L463–L469][gs-split-auto]). One small gap: the re-split listeners run outside the context, so a `gsap.set` made there isn't tracked. The handler's second argument (context-safe wrapper) would close it. No visible effect today |
| [choreography.ts][pj-chor] | Duration exactly 1, absolute positions, plain eases, staggers by `amount`, `immediateRender: false` on the second `fromTo` of the title opacity ([L316–L321][pj-chor-ir]), `fx` plain object read by the canvas each frame ([L38–L53][pj-chor-fx]) | Follows the skills. The `fx` object is the pattern scene 2's camera rig should copy. Banning `easeReverse`/`yoyoEase` is confirmed by the 3.15 source (§2.1) |
| Text fades | `opacity`, never `autoAlpha` | Departs from the skills on purpose: they prefer `autoAlpha`, whose `visibility: hidden` would drop text from the accessibility tree. Keep it |
| SplitText kerning | Restores kerning with measured margins | Departs from the skills' tip (`font-kerning: none`) on purpose, for the look. Keep it |
| [Scene01Dawn.tsx L202–L236][pj-dawn-inview] | Separate in-view trigger on the wrapper (`"top bottom"` to `"bottom top"`, `onToggle` + `onRefresh`); `visibilitychange`; one-shot ticker resume; `gsap.ticker.add(draw)` with a running flag; full manual cleanup | Follows the skills' "pause what isn't visible". The draw is pushed after `updateRoot`, so it sees this tick's values. The one-shot callback is removed through its returned wrapper, which is correct (§2.7) |
| [Experience.tsx L17–L30][pj-exp] | `ScrollTrigger.refresh()` on `fonts.ready` and on every `loadingdone` | Follows the skills (refresh after fonts). Note it is the *forced* form. A face that finishes loading mid-scroll would re-measure every pin mid-gesture; `refresh(true)` would debounce it and wait for scroll end (§2.4). Low risk at present, since fonts load at start |
| [globals.css L91–L101][pj-css] | `will-change: transform` only on moving wrappers, never above the pinned stage | Follows the skills and the docs' pinning caveat |
| [DebugOverlay.tsx][pj-debug] | FPS measured from a ticker callback | Fine. It counts ticks, which on Chromium follow presented frames. Scene 2 adds renderer statistics |

## 4. What scene 2 should do (and do differently)

### 4.1 The camera follows the scrubbed timeline

- **Why not `onUpdate`.** In 3.15 a scrubbed trigger calls `onUpdate` from its `update()` only when the raw scroll progress (`clipped`) changes, and `self.progress` *is* that raw value ([ScrollTrigger L1093–L1098, L1144][gs-st-onupdate]); the docs say the same ([ScrollTrigger docs][docs-st]). With `scrub: 0.6` the timeline's playhead trails it. A camera fed from `onUpdate` would lead the captions by up to the scrub lag. It would also stop as soon as the scroll position settles (with Lenis, when its easing ends), while the scrub tween goes on moving the captions for up to `scrub` seconds more. Confidence: high.
- **Pattern A (recommended): a rig object on the master timeline.** A plain object holds numbers only: `u` (along the position spline), `v` (along the target spline), extra pitch, vertical exaggeration, light mix, route draw progress, glyph positions. It is allocated once and tweened at absolute p positions with `ease: "none"` or plain eases, exactly like scene 1's `fx` ([choreography.ts L38–L53, L207–L240][pj-chor-fx]). The renderer reads it once per tick. GreenSock's own canvas-scrub helper uses the same idea: it tweens a plain object with `ease: "none"` under a ScrollTrigger and draws from the animated value ([imageSequenceScrub][docs-imgseq]). Confidence: high.
- **Pattern B: read `tl.progress()` in the ticker** and evaluate prebuilt interpolators. It is simpler for a single parameter, but each beat's camera move is then authored outside the timeline. Confidence: high.
- **Render once per tick, in the ticker callback, not in tween `onUpdate`s**: several tweens can update in one tick. To render on demand, set a dirty flag in the master timeline's own `onUpdate` (it fires whenever the scrub tween moves the playhead) and render when the flag is set or time-based motion is running.
- **The camera stays a pure function of the playhead**: no `easeReverse`, no per-frame lerp, no scroll-coupled time-based drift.

A minimal shape, as illustration, not project code:

```ts
const rig = { u: 0, v: 0, lift: 0, exaggeration: 1, light: 0 }; // numbers only, allocated once
const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { /* pin, scrub: 0.6, … */ } });
tl.fromTo(rig, { u: 0 }, { u: 1, duration: 1, ease: flightEase }, 0); // like scene 1's asEase curves
tl.addLabel("cadiz", 0.18); /* … */ tl.set({}, {}, 1);
const render = (time: number, deltaMs: number) => { if (running && engine) engine.render(rig, time, deltaMs); };
gsap.ticker.add(render); // pushed: runs after GSAP's root render in the same tick
```

### 4.2 A separate in-view trigger

- Keep scene 1's pattern: `ScrollTrigger.create({ trigger: wrapper, start: "top bottom", end: "bottom top", onToggle, onRefresh })`, plus the `document.hidden` check and the one-shot resume. Create it right after the pinned timeline, so creation order is page order. The pin trigger's own active range starts only at `"top top"`, so it can't serve as the visibility signal for the scroll-in from scene 1 or for the release into "Chapter III follows". Confidence: high.
- An optional second "pre-warm" trigger a viewport or so earlier can compile shaders and upload textures if idle-time prefetch hasn't finished yet. Its callbacks should only flip flags or start async work, never block. The skills' "reduce simultaneous work" points the same way ([performance L62–L65][sk-perf-reduce]). Confidence: medium.

### 4.3 `/lab/chart`: pinning a canvas for a scroll flight

The lab page should run the production path, so the owner judges the real thing. Confidence: medium (design inference from the rules above).

- **Wrap the page in `<SmoothScroll>`**, so Lenis runs on the ticker with `lagSmoothing(0)` exactly as on the site. `/lab/ship` doesn't use it, and a natively scrolled lab would feel and measure differently.
- **Structure.** A wrapper `div` (the in-view trigger) contains a `section` that is `h-screen w-full overflow-hidden` (the pinned element). Inside it sits an `aria-hidden` canvas host at `absolute inset-0`, where the engine appends its own canvas. Leave room after the pin (a trailing block) so the release is visible and testable. No `transform` or `will-change` on the section or its ancestors. Don't make the section's parent a flex container, or set `pinSpacing: true` explicitly.
- **ScrollTrigger.** Use the scene's own config: `trigger: section`, `start: "top top"`, `end: "+=N00%"` or a function, `pin: true`, `pinSpacing: true`, the scene's `scrub`, `anticipatePin` as decided in §2.3, `markers: isDebug()`, and an `id` so tests can find it with `ScrollTrigger.getById()` ([scrolltrigger L60][sk-st-table]).
- **One flight definition.** The flight timeline builder and the camera rig live in `src/components/chart/` and are shared by the lab and the scene. The lab adds only the page shell and the `?debug` overlay.
- **Tests.** Labels per beat let Playwright scroll to an exact beat with `ScrollTrigger.getById(id).labelToScroll(label)` (§6.3).
- **Resizing.** Size the WebGL drawing buffer from the viewport or a `ResizeObserver`, but call `renderer.setSize` only when the size really changes. A pin swap during a refresh can make observers fire with identical or sub-pixel sizes, since a pinned element is given ceiled pixel sizes ([ScrollTrigger L971][gs-st-pxsize]). Never call `ScrollTrigger.refresh()` from the renderer.

### 4.4 Async engine loading and creation order

- Mount the scene's DOM (section, captions, date line, canvas host) with the page. Create the pin, the master timeline (rig, captions, date line) and the in-view trigger synchronously in `useGSAP`. Then `import()` the engine chunk on idle. When it resolves, if `cancelled` is false, create the engine and point it at the rig.
- The page length is then fixed from the first frame, and no pin appears under a reader who is already scrolling. A pinned trigger created late does queue a full refresh by itself ([L1294][gs-st-queue]), but that doesn't stop the page jumping.
- Any GSAP object created in the async continuation goes through the matchMedia handler's context-safe wrapper or `context.add()` (skills: [react L80–L111][sk-react-safe]; source: [gsap-core L3001][gs-core-mmargs]).
- If triggers ever end up created out of page order (for example scene 3 mounting before scene 2's chunk), either create scene 2's triggers synchronously as above or give them a **higher** `refreshPriority` than triggers below them (§5).

Confidence: medium.

### 4.5 Reduced motion and fallback

- Reduced motion builds no pin, no Lenis (SmoothScroll already skips it) and no WebGL; it shows the stills sequence.
- The fallback creates nothing and never imports the chunk.

Both are handled by the same matchMedia conditions as scene 1. Confidence: high.

### 4.6 Debug readouts

Show both the raw progress (`self.progress`, from `onUpdate`) and the rendered progress (`tl.progress()`, read in the ticker). The gap between them is the scrub lag; it explains "the camera feels late" reports and makes scrub tuning measurable.

### 4.7 The handover from scene 1 (Stage B, mechanics only)

Brief beat 0 wants scene 2's first frame to equal scene 1's last, with no jump. Several facts bear on it:

- triggers refresh in creation order, which here is page order;
- pin spacers add the pin length to the page;
- `anticipatePin` can move a pin start by velocity × 45 ms (§2.3);
- both scenes should share one scrub value.

Whichever layout is chosen (overlapping sections with negative margin, `pinSpacing: false` for the overlap, or one canvas shown across both), verify it with wheel, keys and a scrollbar drag at speed. Confidence: low (design open).

## 5. Where sources disagree

| Point | Version A | Version B | Follow |
| --- | --- | --- | --- |
| `refreshPriority` sign | **Skill**: lower values refresh first (config table, [scrolltrigger L61][sk-st-table]), and the first section on the page should get the lower number (best practices, [L279][sk-st-best]). The do-not line at L289 states no sign | **Docs**: a trigger with `refreshPriority: 1` refreshes before one with 0 ([ScrollTrigger docs][docs-st]). **3.15 source**: the sort key is `-(priority × 1e6) + documentY`, ascending, so higher refreshes earlier ([ScrollTrigger L1751][gs-st-sort]). Setting the option at all also turns on sorting of every trigger by document position at each refresh ([L645][gs-st-prio], [L276][gs-st-sortcall]) | Docs and source (high). The skill's sign is wrong |
| A `matchMedia` nested in a `useGSAP`/context | Docs: silent; they only say the two together are redundant ([matchMedia docs][docs-mm]) | Source: it registers in the outer context and is reverted with it ([gsap-core L2978, L2944][gs-core-mmpush]) | Source (medium). Scene 1's extra `mm.revert()` is harmless |
| Does a numeric scrub reduce work? | Performance skill: a small numeric scrub can reduce work while scrolling ([performance L59][sk-perf-st]) | Source: a numeric scrub folds updates into one timeline render per tick, but keeps rendering every tick for up to `scrub` seconds after scrolling stops ([L654–L661, L1114][gs-st-scrubdur]). With Lenis, scroll updates come once per tick anyway | Neither is decisive; choose scrub by feel and keep one value for the page (medium) |
| Fade text with `autoAlpha` or `opacity` | Skills prefer `autoAlpha` ([core L85][sk-core-aa]) | Project: `opacity`, to keep text in the accessibility tree ([decisions.md, SplitText][pj-dec]) | Project (deliberate) |
| Avoiding kerning shift after a char split | Skill tip: `font-kerning: none` ([plugins L218][sk-plugins-split]) | Project: restore kerning by measurement ([choreography.ts L338–L373][pj-chor-kern]) | Project (deliberate) |
| `anticipatePin` | Docs: 1 is typically fine | Source plus the Lenis inference: may pin early by velocity × 45 ms under main-thread wheel scrolling (§2.3) | Test on the owner's laptop (low) |

The skills' snippets aren't proof-read. The ScrollTrigger skill's `containerAnimation` example calls `Max.max` and mixes pixels into `xPercent` ([scrolltrigger L235][sk-st-typo]). Treat the skills as a checklist and verify the API against the docs and the source, as these notes do.

## 6. Exact API details for GSAP 3.15

### 6.1 As the skills give them

- **`scrollTrigger` config** ([scrolltrigger L46–L66][sk-st-table]):

  | Option | Values |
  | --- | --- |
  | `trigger` | String or Element |
  | `start` | String, Number or Function. Default `"top bottom"`, or `"top top"` with `pin` |
  | `end` | String, Number or Function. Default `"bottom top"` |
  | `endTrigger` | Element used for `end` |
  | `scrub` | Boolean, or Number (seconds to catch up) |
  | `toggleActions` | Four actions for enter, leave, enter-back, leave-back. Default `"play none none none"` |
  | `pin` | Boolean, String or Element. Don't animate the pinned element itself |
  | `pinSpacing` | Default `true`; `false` or `"margin"` |
  | `horizontal` | Boolean |
  | `scroller` | Scroll container (default: viewport) |
  | `markers` | Boolean or `{ startColor, endColor, fontSize, … }` |
  | `once` | Kills itself after the end is reached once |
  | `id` | For `ScrollTrigger.getById(id)` |
  | `refreshPriority` | See §5 for the sign |
  | `toggleClass` | String, or `{ targets, className }` |
  | `snap` | Number, Array, Function, `"labels"`, or `{ snapTo, duration, delay, ease }` |
  | `containerAnimation` | Tween or Timeline; no pin and no snap with it |
  | Callbacks | `onEnter`, `onLeave`, `onEnterBack`, `onLeaveBack`, `onUpdate`, `onToggle`, `onRefresh`, `onScrubComplete`, each receiving the instance (`progress`, `direction`, `isActive`, `getVelocity()`) |

- **`start`/`end` syntax** ([L40][sk-st-startend]). `"<trigger position> <viewport position>"`, for example `"top top"` or `"bottom 80%"`. A number is an absolute scroll position. `"+=300"` is pixels past the start, `"+=100%"` is one scroller height past the start, and `"max"` is the end of the page. `clamp(...)` exists since 3.12. A function receives the instance and is re-run on every refresh. Relative offsets on a position, such as `"bottom 50%+=100px"`, are allowed ([L74][sk-st-standalone]).
- **Statics**:
  - `ScrollTrigger.create(vars)` (standalone, callbacks only)
  - `ScrollTrigger.refresh()`: automatic on resize, debounced 200 ms
  - `ScrollTrigger.getAll()`, `getById(id)`, `.kill()`
  - `ScrollTrigger.batch(targets, { interval, batchMax, onEnter… })`: callbacks get `(targets, triggers)`
  - `ScrollTrigger.scrollerProxy(scroller, { scrollTop, scrollLeft, getBoundingClientRect, scrollWidth, scrollHeight, fixedMarkers, pinType })`, with `ScrollTrigger.update` registered on the scroller

  ([L68–L149, L259–L270][sk-st-refresh])
- **`gsap.matchMedia()`**, 3.11+ ([core L206–L237][sk-core-mm]):
  - `mm.add(queryOrConditions, (context) => { …; return cleanup }, scope?)`
  - `context.conditions`
  - `mm.revert()`
  - `gsap.matchMediaRefresh()`
- **`useGSAP`** ([react L24–L78][sk-react-use]):
  - `useGSAP(callback, deps)` or `useGSAP(callback, { dependencies, scope, revertOnUpdate })`
  - returns `{ context, contextSafe }`; the callback receives `(context, contextSafe)`
  - register with `gsap.registerPlugin(useGSAP)`
  - target refs with `ref.current`, not the ref object ([react instructions L12][sk-gh-react])
  - the manual alternative is `gsap.context(fn, scope)` with `ctx.revert()`
- **`gsap.quickTo(target, property, { duration, ease })`** returns a setter function ([performance L42–L54][sk-perf-quickto]).
- **`SplitText.create(target, vars)`** ([plugins L174–L220][sk-plugins-split]):

  | Option | Values |
  | --- | --- |
  | `type` | `"chars,words,lines"` by default |
  | `charsClass`, `wordsClass`, `linesClass` | `"++"` appends an increment |
  | `aria` | `"auto"` (default), `"hidden"` or `"none"` |
  | `autoSplit` | Boolean |
  | `onSplit(self)` | 3.13+; return the animation so SplitText reverts and re-syncs it on re-split |
  | `mask` | `"lines"`, `"words"` or `"chars"` |
  | `tag` | Default `"div"` |
  | Other options | `deepSlice`, `ignore`, `smartWrap`, `wordDelimiter`, `prepareText`, `propIndex`, `reduceWhiteSpace`, `onRevert` |

  The instance has `chars`, `words`, `lines`, `masks` and `revert()`.
- **Core** ([core L46–L65, L178–L203][sk-core-fn]):
  - `overwrite` is `false` (default), `true` or `"auto"`
  - `immediateRender` defaults to true for `from`/`fromTo`
  - function-based values receive `(index, target, targets)`
  - relative values `+=`, `-=`, `*=`, `/=`
  - `gsap.defaults()`
- **Timeline** ([timeline L26–L92][sk-tl-pos]):
  - position parameter: absolute, `"+=0.5"`, `"-=0.2"`, `"label"`, `"label+=0.3"`, `"<"`, `">"`, `"<0.2"`
  - `addLabel()`
  - `tweenFromTo()`
  - constructor `defaults`, `paused`
- **Utilities** ([utils][sk-utils-fn]): `clamp`, `mapRange`, `normalize`, `interpolate`, `snap`, `wrap`, `wrapYoyo`, `pipe`, `distribute`, `toArray`, `selector`, `splitColor`, `getUnit`, `unitize`. Each returns a reusable function when its last argument is left out; `random` is the exception and uses `true`.

### 6.2 Verified elsewhere (docs or source), not in the skills

- **Ticker**:
  - `gsap.ticker.add(cb, once?, prioritize?)` returns the function actually added (a wrapper when `once`); `remove(fn)`
  - `cb(time, deltaTime, frame)`, with `time` in seconds and `deltaTime` in milliseconds
  - `lagSmoothing(500, 33)` defaults; `lagSmoothing(0)` disables
  - `fps(n)` only lowers the rate; `deltaRatio(60)`; `time`; `frame`
  - root render is listener 0; auto-sleep needs fewer than two listeners

  (§2.7)
- **Scrub internals**: a numeric scrub is an expo.out tween on `totalProgress`, retargeted with `resetTo`; `true` and `0` are direct. `self.getTween()` returns that tween; `onScrubComplete` fires when it settles (§2.2).
- **`anticipatePin`**: default 0; acts only while scrolling; looks ahead `value × 45` ms at the current velocity (§2.3).
- **`invalidateOnRefresh`**: revert without kill, invalidate, re-render `immediateRender` children on each refresh (§2.4).
- **`ScrollTrigger.refresh(safe?)`**: no argument means forced and immediate; `true` means debounced 200 ms and deferred until scrolling ends. `ScrollTrigger.update(force?)`: only `true` forces (§2.4).
- **`ScrollTrigger.config({ autoRefreshEvents, limitCallbacks, syncInterval, ignoreMobileResize })`**: the defaults are listed in §2.4. `ignoreMobileResize` acts only on touch devices, so it is irrelevant here ([ScrollTrigger L1434–L1443][gs-st-config]).
- **`self.labelToScroll(label)`**: the scroll position of a timeline label on that trigger ([ScrollTrigger L1058][gs-st-label]). Useful for Playwright beat screenshots: `lenis.scrollTo(st.labelToScroll("cadiz"), { immediate: true })`, or `window.scrollTo` when Lenis is off.
- **`self.getVelocity()`**: pixels per second ([L1049][gs-st-vel]).
- **`easeReverse`**: new in 3.15.0, replaces `yoyoEase`; direction-dependent, so never use it under scrub (§2.1).

### 6.3 Lenis 1.3.27 (for completeness)

- Options: `autoRaf` (default false), `lerp` 0.1, `duration` 1.2 (ignored when `lerp` is set), `smoothWheel` true, `syncTouch` false, `autoResize` true (ResizeObserver), `respectReducedMotion` true.
- Methods and events: `raf(timeMs)`, `resize()`, `scrollTo(target, { immediate, lock, force, offset, onComplete })`, `on("scroll", cb)`, `stop()`, `start()`, `destroy()`.
- Properties: `isScrolling` is `false`, `"native"` or `"smooth"`.

Source: [Lenis README][ln-readme-settings].

## 7. Doubts and things only the owner's laptop can settle

- `anticipatePin` 0 or 1 at the scene 1 to 2 handover under Lenis (§2.3). Low confidence until tested with wheel, keys and scrollbar.
- Whether `scrub: 0.6` still feels right when the camera moves a continent per screen. Measure the raw-to-rendered gap with the §4.6 readout.
- No long task when entering scene 2. Shader compile and texture upload must be finished before the in-view trigger fires; its callbacks only flip flags.
- Whether a late `loadingdone` refresh mid-scroll is ever visible (§3, Experience row). If it is, switch to `refresh(true)`.

## Sources

Skills (commit `aed9cfd`, 21 April 2026):
- [gsap-scrolltrigger/SKILL.md][sk-st] · [gsap-react/SKILL.md][sk-react] · [gsap-performance/SKILL.md][sk-perf] · [gsap-core/SKILL.md][sk-core] · [gsap-timeline/SKILL.md][sk-tl] · [gsap-plugins/SKILL.md][sk-plugins] · [gsap-utils/SKILL.md][sk-utils] · [gsap-frameworks/SKILL.md][sk-fw] · [.github/instructions/react.instructions.md][sk-gh-react] · [.github/instructions/scrolltrigger.instructions.md][sk-gh-st] · [examples/react][sk-ex-react]

Official docs:
- [ScrollTrigger][docs-st] · [ScrollTrigger.refresh()][docs-refresh] · [ScrollTrigger.normalizeScroll()][docs-norm] · [gsap.ticker][docs-ticker] · [gsap.matchMedia()][docs-mm] · [React guide][docs-react] · [imageSequenceScrub helper][docs-imgseq] · [GSAP 3.15.0 release notes][gs-rel]

Source code (tagged; byte-identical to the installed packages):
- GSAP 3.15.0: [src/ScrollTrigger.js][gs-st-file] · [src/gsap-core.js][gs-core-file] · [src/SplitText.ts][gs-split-file]
- @gsap/react 2.1.2: [src/index.js][gr-src]
- Lenis 1.3.27: [README][ln-readme] · [packages/core/src/lenis.ts][ln-core] · [animate.ts][ln-animate] · [maths.ts][ln-maths]

Project files read (all in `D:\dev\trafalgar-1805`): `src/lib/gsap.ts`, `src/components/providers/SmoothScroll.tsx`, `src/scenes/01-dawn/Scene01Dawn.tsx`, `src/scenes/01-dawn/choreography.ts`, `src/components/experience/Experience.tsx`, `src/components/experience/DebugOverlay.tsx`, `src/app/globals.css`, `src/lib/media.ts`, `src/app/lab/ship/*`, `docs/decisions.md`, `docs/scene-01-brief.md`, `docs/scene-02-brief.md`.

[sk-st]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-scrolltrigger/SKILL.md
[sk-st-startend]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-scrolltrigger/SKILL.md#L40
[sk-st-table]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-scrolltrigger/SKILL.md#L46-L66
[sk-st-standalone]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-scrolltrigger/SKILL.md#L68-L77
[sk-st-proxy]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-scrolltrigger/SKILL.md#L120-L149
[sk-st-scrub]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-scrolltrigger/SKILL.md#L151-L167
[sk-st-pin]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-scrolltrigger/SKILL.md#L169-L183
[sk-st-typo]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-scrolltrigger/SKILL.md#L231-L243
[sk-st-refresh]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-scrolltrigger/SKILL.md#L259-L270
[sk-st-best]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-scrolltrigger/SKILL.md#L272-L291
[sk-st-dont]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-scrolltrigger/SKILL.md#L281-L291
[sk-react]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-react/SKILL.md
[sk-react-use]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-react/SKILL.md#L24-L43
[sk-react-deps]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-react/SKILL.md#L49-L61
[sk-react-ctx]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-react/SKILL.md#L63-L78
[sk-react-safe]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-react/SKILL.md#L80-L111
[sk-react-ssr]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-react/SKILL.md#L113-L118
[sk-perf]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-performance/SKILL.md
[sk-perf-wc]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-performance/SKILL.md#L15-L30
[sk-perf-many]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-performance/SKILL.md#L36-L40
[sk-perf-quickto]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-performance/SKILL.md#L42-L54
[sk-perf-st]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-performance/SKILL.md#L56-L60
[sk-perf-reduce]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-performance/SKILL.md#L62-L65
[sk-core]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-core/SKILL.md
[sk-core-ir]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-core/SKILL.md#L65
[sk-core-aa]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-core/SKILL.md#L85
[sk-core-fn]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-core/SKILL.md#L178-L203
[sk-core-mm]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-core/SKILL.md#L206-L237
[sk-tl]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-timeline/SKILL.md
[sk-tl-pos]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-timeline/SKILL.md#L26-L92
[sk-tl-best]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-timeline/SKILL.md#L94-L107
[sk-plugins]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-plugins/SKILL.md
[sk-plugins-reg]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-plugins/SKILL.md#L22-L36
[sk-plugins-ss]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-plugins/SKILL.md#L60-L73
[sk-plugins-split]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-plugins/SKILL.md#L174-L220
[sk-utils]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-utils/SKILL.md
[sk-utils-fn]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-utils/SKILL.md#L19-L29
[sk-fw]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-frameworks/SKILL.md
[sk-gh-react]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/.github/instructions/react.instructions.md
[sk-gh-st]: https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/.github/instructions/scrolltrigger.instructions.md
[sk-ex-react]: https://github.com/greensock/gsap-skills/tree/aed9cfd3277740755f6bfc1155c7aa645403b760/examples/react

[docs-st]: https://gsap.com/docs/v3/Plugins/ScrollTrigger/
[docs-refresh]: https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.refresh()
[docs-norm]: https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.normalizeScroll()
[docs-ticker]: https://gsap.com/docs/v3/GSAP/gsap.ticker/
[docs-mm]: https://gsap.com/docs/v3/GSAP/gsap.matchMedia()
[docs-react]: https://gsap.com/resources/React
[docs-imgseq]: https://gsap.com/docs/v3/HelperFunctions/helpers/imageSequenceScrub
[gs-rel]: https://github.com/greensock/GSAP/releases/tag/3.15.0

[gs-st-file]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js
[gs-st-refreshall]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L264-L269
[gs-st-istoggle]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L615
[gs-st-ap45]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L639
[gs-st-prio]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L645
[gs-st-scrubdur]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L654-L661
[gs-st-flex]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L738
[gs-st-inval]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L838-L839
[gs-st-fnpos]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L876-L879
[gs-st-pxsize]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L971-L979
[gs-st-measure]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L985
[gs-st-vel]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1049
[gs-st-label]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1058
[gs-st-apuse]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1085-L1091
[gs-st-onupdate]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1093-L1144
[gs-st-resetto]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1114
[gs-st-gettween]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1200
[gs-st-queue]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1294
[gs-st-wheel]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1359
[gs-st-mm]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1370-L1373
[gs-st-resize]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1410-L1411
[gs-st-refresh]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1496
[gs-st-update]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1497
[gs-st-sort]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1751
[gs-st-norm]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1754
[gs-st-normvars]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1601-L1604
[gs-st-sortcall]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L276
[gs-st-config]: https://github.com/greensock/GSAP/blob/3.15.0/src/ScrollTrigger.js#L1434-L1443

[gs-core-file]: https://github.com/greensock/GSAP/blob/3.15.0/src/gsap-core.js
[gs-core-cond]: https://github.com/greensock/GSAP/blob/3.15.0/src/gsap-core.js#L434-L437
[gs-core-maprange]: https://github.com/greensock/GSAP/blob/3.15.0/src/gsap-core.js#L574
[gs-core-interp]: https://github.com/greensock/GSAP/blob/3.15.0/src/gsap-core.js#L579
[gs-core-lag]: https://github.com/greensock/GSAP/blob/3.15.0/src/gsap-core.js#L888-L892
[gs-core-call]: https://github.com/greensock/GSAP/blob/3.15.0/src/gsap-core.js#L914
[gs-core-lagfn]: https://github.com/greensock/GSAP/blob/3.15.0/src/gsap-core.js#L949-L950
[gs-core-add]: https://github.com/greensock/GSAP/blob/3.15.0/src/gsap-core.js#L957-L960
[gs-core-sleep]: https://github.com/greensock/GSAP/blob/3.15.0/src/gsap-core.js#L1969-L1977
[gs-core-ereverse]: https://github.com/greensock/GSAP/blob/3.15.0/src/gsap-core.js#L2125
[gs-core-inv]: https://github.com/greensock/GSAP/blob/3.15.0/src/gsap-core.js#L2481-L2493
[gs-core-revertdata]: https://github.com/greensock/GSAP/blob/3.15.0/src/gsap-core.js#L2940-L2947
[gs-core-mmpush]: https://github.com/greensock/GSAP/blob/3.15.0/src/gsap-core.js#L2974-L2978
[gs-core-mmargs]: https://github.com/greensock/GSAP/blob/3.15.0/src/gsap-core.js#L3001
[gs-core-root]: https://github.com/greensock/GSAP/blob/3.15.0/src/gsap-core.js#L3155
[gs-split-file]: https://github.com/greensock/GSAP/blob/3.15.0/src/SplitText.ts
[gs-split-auto]: https://github.com/greensock/GSAP/blob/3.15.0/src/SplitText.ts#L463-L469

[gr-src]: https://github.com/greensock/react/blob/2.1.2/src/index.js#L14-L45

[ln-readme]: https://github.com/darkroomengineering/lenis/blob/v1.3.27/README.md#L145-L161
[ln-readme-settings]: https://github.com/darkroomengineering/lenis/blob/v1.3.27/README.md#settings
[ln-readme-lim]: https://github.com/darkroomengineering/lenis/blob/v1.3.27/README.md#limitations
[ln-core]: https://github.com/darkroomengineering/lenis/blob/v1.3.27/packages/core/src/lenis.ts
[ln-setscroll]: https://github.com/darkroomengineering/lenis/blob/v1.3.27/packages/core/src/lenis.ts#L348-L355
[ln-wheel]: https://github.com/darkroomengineering/lenis/blob/v1.3.27/packages/core/src/lenis.ts#L577-L579
[ln-raf]: https://github.com/darkroomengineering/lenis/blob/v1.3.27/packages/core/src/lenis.ts#L713-L716
[ln-animate]: https://github.com/darkroomengineering/lenis/blob/v1.3.27/packages/core/src/animate.ts#L43
[ln-maths]: https://github.com/darkroomengineering/lenis/blob/v1.3.27/packages/core/src/maths.ts#L46-L48

[pj-gsap]: file:///D:/dev/trafalgar-1805/src/lib/gsap.ts
[pj-ss]: file:///D:/dev/trafalgar-1805/src/components/providers/SmoothScroll.tsx
[pj-ss-keys]: file:///D:/dev/trafalgar-1805/src/components/providers/SmoothScroll.tsx
[pj-dawn]: file:///D:/dev/trafalgar-1805/src/scenes/01-dawn/Scene01Dawn.tsx
[pj-dawn-st]: file:///D:/dev/trafalgar-1805/src/scenes/01-dawn/Scene01Dawn.tsx
[pj-dawn-split]: file:///D:/dev/trafalgar-1805/src/scenes/01-dawn/Scene01Dawn.tsx
[pj-dawn-inview]: file:///D:/dev/trafalgar-1805/src/scenes/01-dawn/Scene01Dawn.tsx
[pj-dawn-vis]: file:///D:/dev/trafalgar-1805/src/scenes/01-dawn/Scene01Dawn.tsx
[pj-dawn-cleanup]: file:///D:/dev/trafalgar-1805/src/scenes/01-dawn/Scene01Dawn.tsx
[pj-dawn-mmrevert]: file:///D:/dev/trafalgar-1805/src/scenes/01-dawn/Scene01Dawn.tsx
[pj-chor]: file:///D:/dev/trafalgar-1805/src/scenes/01-dawn/choreography.ts
[pj-chor-fx]: file:///D:/dev/trafalgar-1805/src/scenes/01-dawn/choreography.ts
[pj-chor-ir]: file:///D:/dev/trafalgar-1805/src/scenes/01-dawn/choreography.ts
[pj-chor-kern]: file:///D:/dev/trafalgar-1805/src/scenes/01-dawn/choreography.ts
[pj-exp]: file:///D:/dev/trafalgar-1805/src/components/experience/Experience.tsx
[pj-css]: file:///D:/dev/trafalgar-1805/src/app/globals.css
[pj-debug]: file:///D:/dev/trafalgar-1805/src/components/experience/DebugOverlay.tsx
[pj-dec]: file:///D:/dev/trafalgar-1805/docs/decisions.md
