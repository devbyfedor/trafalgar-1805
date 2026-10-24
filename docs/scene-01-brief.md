# Trafalgar 1805: scene 1 brief

This file is the complete brief for one Claude Code session. It lives in `docs/scene-01-brief.md`. Don't edit it during the session; record changes and disagreements in `docs/decisions.md` instead.

<context>
You are building a portfolio project for Fedor, a self-taught front-end developer who acts as product owner and art director: he decides, you build. He will review the result by eye when you finish, and his taste decides what counts as good. He speaks Russian. Everything in the repository (code, comments, docs, UI copy) is in English.

The project is a desktop-first, scroll-driven interactive story about the Battle of Trafalgar, 21 October 1805, told as a sequence of cinematic scenes. This session covers scene 1 plus the foundations every later scene will reuse. Later scenes will be built in separate sessions on top of what you make now, so the structure matters as much as the scene.

What the owner cares about most: it has to look beautiful and it has to feel smooth. A visitor should come away thinking it was made by someone who cares about craft. Go beyond the basics; this piece is the centre of his portfolio.

His machine: Windows, VS Code with Claude Code, Lenovo Yoga Slim 7 14 (Intel Core Ultra 5 125H, Intel Arc integrated graphics, 16 GB RAM, 1920×1200 display). Integrated graphics is the performance baseline. Windows usually scales this display to 150%, so his browser viewport is around 1280×720 CSS pixels at device pixel ratio 1.5: treat that as the primary viewport, and make sure the scene also holds up on large external monitors.

Fixed decisions by the owner:
- Desktop only. Phones and tablets get a single fallback screen, not a mobile version.
- English site.
- One scene at a time: scene 1 is finished and polished before anything else.
- Zero budget: nothing that costs money, ever. Hosting will be the Cloudflare Workers free plan.
- The repository will be public, so it holds no secrets.
</context>

<goal>
Scene 1, "Dawn": a pinned, scroll-scrubbed opening. Dawn breaks over a long Atlantic swell off Cape Trafalgar, the morning haze lifts, HMS Victory comes in under full sail, and the title "Trafalgar" assembles. In the last part of the scene the enemy fleet appears on the eastern horizon, handing over to scene 2.
</goal>

<stack>
Use these versions, checked on 23 October 2026. Before installing, confirm each with `npm view <package> version`. If a newer patch of the same minor exists, use it; if a listed version doesn't exist, use the nearest newer patch and note it in `docs/decisions.md`. Pin exact versions in package.json (no `^` or `~`).

Runtime
- Node.js 26.x (Active LTS from 28 October 2026). Minimum accepted: 24.x. Add `.nvmrc` containing `26` and `"engines": { "node": ">=24" }`.
- npm, bundled with Node. Don't use pnpm, yarn or bun.

Dependencies
- next 16.4.2 (App Router, static export)
- react 19.3.1 and react-dom 19.3.1
- gsap 3.15.0 (ScrollTrigger, SplitText and the other plugins ship in the public npm package)
- @gsap/react 2.1.2 (useGSAP)
- lenis 1.3.27 (includes `lenis/react`)

Dev dependencies
- typescript 7.0.2 (native compiler)
- @types/react and @types/react-dom (latest 19.x), @types/node (latest major that does not exceed the installed Node major)
- tailwindcss 4.3.3 and @tailwindcss/postcss 4.3.3
- @biomejs/biome 2.5.15 (lint and format; there is no ESLint or Prettier in this project)
- @playwright/test, latest 1.64.x patch
- serve, latest (serves the static export for end-to-end tests)
- wrangler, latest 4.x (deployment config only; you never run deploy or login)

Compatibility facts behind this stack
- TypeScript 7 ships without the JavaScript compiler API. typescript-eslint doesn't support TS 7 yet, which is why there is no ESLint; Biome doesn't depend on the TypeScript compiler.
- Next.js 16.3 and later can type-check with TypeScript 7 during `next build` by running the project's `tsc` CLI. If `next build` reports a TypeScript incompatibility, enable `experimental.useTypeScriptCli: true` in the Next config. If `next.config.ts` itself fails to load, switch to `next.config.mjs`. Don't downgrade TypeScript; if TS 7 can't be made to work, stop and explain.
- TS 7 turns several TS 6 deprecations into errors and defaults to strict settings. If `tsc` rejects options from the template's tsconfig, fix the tsconfig.
- Next.js 16 no longer lints during `next build`; linting is `biome check` through npm scripts.

Several of these releases are newer than your training data. Before writing code against an API, read the current official docs, README or type definitions: Next.js 16.4 (static export, next/font/local, metadata), Tailwind CSS 4.3, GSAP 3.15 (ScrollTrigger, SplitText, matchMedia), Lenis 1.3 (React and GSAP integration), Biome 2.5 (config, Tailwind directives), Playwright 1.64. Where docs and memory disagree, follow the docs.

GSAP practices: GreenSock publishes official agent skills at https://github.com/greensock/gsap-skills (core, ScrollTrigger, React, plugins, performance). If they are installed in this session, use them. If not, read the relevant skill files from that repository before writing animation code, and follow them.
</stack>

<history>
Accuracy matters: the owner knows the age of sail well and will notice mistakes. Research before you draw, and record facts, sources and doubts in `docs/history-notes.md`.

The setting
- Morning of 21 October 1805, off Cape Trafalgar, south-west Spain.
- Light wind from the west-north-west. A long, heavy swell rolling in from the west, the sign of the gale that followed the battle. Long smooth swells with little whitecapping, not a choppy sea.
- The British fleet, 27 ships of the line, sails east toward the combined Franco-Spanish fleet, 33 ships of the line, strung out in a long, ragged line to the east, between the British and the Spanish coast.
- HMS Victory, Nelson's flagship, leads the weather column; other British ships follow astern of her.
- The sun rises in the east, behind the enemy fleet.
- The morning haze is artistic licence, not a documented fog bank. Keep it a light dawn haze that lifts, never a dense fog.

HMS Victory as of 1805 (verify each point and follow the sources where they differ)
- First rate, three gun decks, 104 guns. Ports per side: lower deck 15, middle deck 14, upper deck 15, plus quarterdeck and forecastle ports. Ports closed at dawn (an assumption: flag it in history-notes).
- Paint: black hull with yellow-ochre bands along the gun decks and black port lids, the chequered pattern known as the "Nelson chequer". Copper sheathing below the waterline.
- Proportions: gun deck about 57 m (186 ft); the mainmast truck is commonly given as about 62 m (205 ft) above the waterline. The main is the tallest mast, the fore slightly shorter, the mizzen clearly shorter. Bowsprit and jib-boom rake forward and up. A first rate is roughly as tall as her hull is long; never squash the rig to make the hull bigger.
- Rig at dawn, full sail. Fore and main: course, topsail, topgallant, royal. Mizzen: spanker on gaff and boom, mizzen topsail, mizzen topgallant. Headsails: fore topmast staysail, jib, flying jib. Fighting tops, crosstrees, yards tapering toward the yardarms.
- Flags: Nelson was Vice-Admiral of the White, so the vice-admiral's flag (white with a red St George's cross) flies at the fore topgallant masthead, and the White Ensign at the mizzen gaff peak. No commission pennant. If your sources contradict any of this, follow the sources and note it.
- Details that sell it: quarter gallery and stern windows, entry port, channels where the shrouds meet the hull, catheads and anchors at the bow, a simplified figurehead.
</history>

<scene>
Orientation: side view looking north. Victory sails left to right (west to east) showing her starboard side. The sun rises on the right. The wind blows from the left, so flags stream to the right and the sails fill toward the bow. The swell rolls in from the west, so its crests travel left to right; the haze drifts slowly to the right with the wind.

Composition (adapt the numbers if the result looks better, and say why in decisions.md)
- Horizon at about 60–62% of viewport height.
- Victory is closer than the horizon, so her waterline sits below it, at about 68–72%. At her hero position the whole ship is in frame, mainmast truck about 10–12% from the top, hull centred around 40–50% of the width. Size the ship from viewport height so the full rig stays in frame on every aspect ratio from 4:3 to 21:9; full-bleed layers (sky, sea, haze) simply extend sideways.
- Two or three faint British silhouettes follow astern of Victory on the left, deeper in the haze.
- The enemy fleet: 33 small silhouettes strung irregularly along the right half of the horizon, backlit by the sunrise and partly lost in the haze.

Scroll choreography. The scene is pinned for about 300vh of scroll. Progress p runs from 0 to 1, scrubbed and fully reversible.
- p = 0, on load: pre-dawn. Deep blue-grey sky with a few stars, dense haze, dark sea moving slowly. Victory is only a dim partial shape at the left edge inside the haze. Visible text: the dateline, the chapter marker and the scroll cue.
- p 0.05–0.45: the haze thins, the sky warms from the horizon upward, a glow grows behind the horizon on the right. Victory sails in from the left, gaining contrast. The title "Trafalgar" assembles letter by letter (SplitText, chars) in step with the scroll.
- p 0.45–0.75: the sun disc clears the horizon and a glitter path appears on the water beneath it. Victory reaches her hero position in full colour, and sunlight warms the sunward (right) edges of her sails. The lede appears under the title.
- p 0.75–1: the title and lede ease out, the closing caption appears, the enemy fleet emerges on the eastern horizon, and Victory keeps moving slowly toward it. The pin then releases into a short placeholder section for scene 2: a quiet block reading "Chapter II follows", on a deep sea-grey background, there only to prove the unpinning works.

Continuous time-based motion, independent of scroll: the swell; Victory's gentle heave and pitch, roughly in phase with the swell; flags streaming; haze drifting; the glitter shimmering; a small bow wave at her stem. All of it pauses when the scene is off-screen or the tab is hidden.

Copy (keep it in a content file so the owner can edit it)
- Dateline: "Off Cape Trafalgar, at dawn on 21 October 1805"
- Title, the page's only h1: "Trafalgar"
- Lede: "Twenty-seven British ships of the line. Thirty-three French and Spanish. One morning off the coast of Spain."
- Closing caption: "At first light the British sighted the enemy: thirty-three ships of the line, strung out along the eastern horizon."
- Chapter marker: "I. Dawn"
- Scroll cue: "Scroll", with a small, quiet animated line; it fades out once scrolling begins.

Text placement: a title card in the lower left, over the sea and clear of the hull and rig. The dateline sits above the title, the lede below it, and the closing caption takes the same area after the title leaves. The chapter marker is small, top left; the scroll cue bottom centre. Add a subtle scrim only where legibility needs it.
</scene>

<ship>
The ship is the most important part of this session. Build a reusable `ShipOfTheLine` SVG component. Scene 1 uses it for Victory at hero size and in a silhouette mode for distant ships. Later scenes will use it for all 60 ships of the line (British, French and Spanish; two-deckers, three-deckers and the four-decker Santísima Trinidad), so shape the data model for that now, but only implement and polish what scene 1 needs.

Design
- Data-driven: a `ShipSpec` type (nation, number of decks, ports per deck per side, proportions, paint, rig, flags) and a `VICTORY_1805` spec.
- Pure, deterministic geometry functions turn a spec into SVG path data; the React component only renders. No `Math.random` during render; use seeded variation if you need irregularity.
- Props at least: `spec`, `detail: "hero" | "silhouette"`, and a lighting option. Expose the animated parts (flags, bow wave) as separate elements the scene can drive.
- Silhouette mode: a handful of paths with a single fill, for the distant fleets.
- A dev page at `/lab/ship` (marked noindex) shows Victory large on a neutral backdrop with toggles for detail and lighting. Use it for screenshots and iteration.

Rendering
- Sails: weathered canvas with visible vertical cloths, reef bands on the topsails, a slight curve showing the wind filling them toward the bow, two-tone flat shading (lit and shade). The dawn warmth is a separate stacked layer whose opacity changes, not recoloured paths.
- Rigging: shrouds with simplified but credible ratlines, stays, backstays and a little running rigging, in thin, low-contrast strokes.
- Hull: the chequer bands follow the sheer line, the port lids sit inside the bands, the copper shows just above the waterline.

Quality bar: at hero size, both on the owner's laptop (about 1280×720 CSS pixels at DPR 1.5) and on a 1920×1080 monitor, it should hold up next to a good period illustration. Correct proportions, believable sail shapes, crisp rigging, no gaps or misaligned parts, nothing that reads as clip art. Expect several rounds: render, screenshot, compare against your reference notes, fix, repeat. Take close-up crops (bow, stern, tops, rigging) at device scale 2 to check details. Don't move on from the ship until it passes your own critique.
</ship>

<environment>
Layers from back to front:
1. Sky: two full-bleed CSS gradient layers (pre-dawn and dawn) crossfaded by opacity, plus a sparse star layer that fades out.
2. Sun: a positioned element with a radial glow and a disc, moved with transforms.
3. Horizon band with the distant fleets (static silhouettes; their wrappers fade in).
4. Back haze: canvas.
5. Sea: several wide wave strips at different depths, built from seamlessly tiling SVG paths. Each loops horizontally by translating its wrapper, with a slow vertical swell. The colour shift from pre-dawn to dawn is two stacked variants crossfaded by opacity.
6. Victory in her own wrapper, with flags and bow wave as separate small layers.
7. Front sea strip, covering Victory's waterline.
8. Front haze and glitter: canvas.
9. Text overlay: real HTML text above everything.

Haze: render the canvas at about half resolution (soft haze looks right that way), pre-render soft sprites once to an offscreen canvas, draw them with drifting positions, and drive density from scroll.
</environment>

<art_direction>
Mood: a 19th-century marine painting translated into crisp, flat-shaded vector illustration with atmospheric light. Restrained, cinematic, quiet. Spend the boldness in one place: the ship in dawn light. Keep everything around it disciplined.

Starting palette (tune it for harmony, keep the mood)
- Pre-dawn sky #1E2A3A at the top to #4A5566 at the horizon
- Dawn sky #3B5068 at the top to #E8B07A near the horizon; sun #FFE2A8
- Sea #1D2B33 pre-dawn, #34505A at dawn, warm highlights #C9B48C
- Haze #8C98A4 cool, warming to #E9D6B8
- Hull #1B1714, ochre bands #C99A3E, canvas lit #E9DFC8, canvas shade #CFC3A6, rigging #2A221C
- Text #F3EAD8

Typography
- The owner will supply the font files later. Wire two CSS variables, `--font-display` for the title and `--font-text` for everything else, with a system serif fallback stack such as "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif. Nothing may reference font files that don't exist yet.
- Document in `docs/fonts.md` exactly how to drop in .woff2 files with next/font/local.
- No font requests to any external host.
- Set a clear type scale. The title is large and set with care (tracking, optical sizing if the face supports it); the dateline small and quiet.

Patterns to avoid in this project
- tracked-out all-caps labels or eyebrows
- metadata joined with middle dots
- labels built as "word — fragment" with a spaced em dash
- monospace labels
- arrows appended to link or button text
- italic or coloured accent words inside headlines
- pill buttons, cards or glass panels
- terracotta or clay accents
- a cream or off-white page background
- decorative gradient blobs
- drop shadows on text
- a centred hero with a button
- fade-and-slide-up on every element

After your first full build, check the result against this list and against the brief. Extend the list in decisions.md if you catch other defaults creeping in.
</art_direction>

<motion_and_performance>
Smoothness is a requirement, and the baseline is integrated graphics, so build for the compositor:
- One clock. Lenis runs with `autoRaf: false` and is driven from `gsap.ticker`; Lenis scroll events feed `ScrollTrigger.update`; follow the Lenis docs on lag smoothing. The only other per-frame work is the canvas draw, which runs from the same ticker.
- Movement means transform and opacity on wrapper elements, so the browser composites instead of repainting. Complex SVG art (the hero ship, wave paths, silhouettes) stays static inside its wrapper. Never change path data, fills, gradient stops, filters or stroke attributes on complex art per frame.
- Lighting changes are stacked layers with changing opacity.
- No SVG filters, no CSS `filter: blur`, no `backdrop-filter`.
- Canvas: cap devicePixelRatio, resize with ResizeObserver, no per-frame allocations, sprites pre-rendered once.
- Time-based loops pause when the scene is out of view (ScrollTrigger toggle) and when the document is hidden.
- No React state updates per frame; animation lives in GSAP and refs.
- React StrictMode runs effects twice in development: make the GSAP and Lenis setup clean up and re-initialise without leaks.
- Refresh ScrollTrigger after fonts load and on resize; use `anticipatePin` as the GSAP docs recommend.
- Budgets: sustained ~60 fps while scrolling on the owner's laptop; no long tasks over 50 ms during scroll; fewer than 2,500 SVG elements in the scene, and fewer than about 1,200 in the hero ship.
- Debug mode via `?debug` in the URL: an FPS readout and ScrollTrigger markers. Read the query from `window.location` on the client, which suits a static export.
</motion_and_performance>

<fallbacks_and_accessibility>
- Fallback: below 1024 px wide, or when the primary pointer is coarse, show a fallback screen instead of the scene: a static composition (Victory in dawn light, the title, the dateline) and one line saying the story is designed for a desktop browser. Switch with CSS, so the server-rendered HTML is identical for everyone and nothing mismatches on hydration. In that mode create no ScrollTriggers, no Lenis and no animation loops (use `gsap.matchMedia`). Handle a live switch when a desktop window is resized across the breakpoint. Both branches are in the same HTML, so two things follow. The fallback must not add a second h1: reuse the one h1, or set its title as non-heading text. And the hidden branch still costs DOM, so keep the fallback light: use the silhouette rendering of the ship there, or mount the fallback art on the client only when the fallback media query matches.
- Reduced motion (`prefers-reduced-motion: reduce`): no pin and no scrub. Show the hero frame (the p ≈ 0.7 composition: sun up, light haze, Victory in hero position, title and lede visible) statically, followed by the placeholder section. No idle loops. Lenis disables smoothing for reduced motion from 1.3.26 onward; verify it.
- Semantics: one h1, the decorative scene marked `aria-hidden`, meaningful text in HTML, `lang="en"`. Keyboard scrolling works. Text keeps WCAG AA contrast against whatever is behind it at every point of the scroll.
- SplitText: split after fonts are ready, re-split on resize (check the current docs for `autoSplit` and `onSplit`), and keep the h1's accessible name intact (check how the current SplitText handles aria).
- Replace the template favicon and boilerplate with a simple original favicon. Add basic metadata (title "Trafalgar 1805", a one-line description).
</fallbacks_and_accessibility>

<structure>
Adapt names if the template differs, but keep the idea:
- `src/app/layout.tsx`, `src/app/page.tsx` (server components), `src/app/globals.css` (Tailwind v4 import and `@theme` tokens)
- `src/app/lab/ship/page.tsx`: the ship lab, noindex
- `src/lib/gsap.ts`: the single place that registers ScrollTrigger, SplitText and useGSAP (client only)
- `src/components/providers/SmoothScroll.tsx`: Lenis plus GSAP ticker wiring
- `src/components/experience/Experience.tsx`: client component that renders scenes in order from a registry and handles the fallback
- `src/scenes/registry.ts`
- `src/scenes/01-dawn/`: `Scene01Dawn.tsx`, `choreography.ts`, `content.ts`, `layers/`
- `src/components/ship/`: `ShipOfTheLine.tsx`, `types.ts`, `specs/victory-1805.ts`, `geometry/`
- `src/components/fx/`: haze and glitter canvas
- `tests/e2e/`: Playwright
- `docs/`: this brief, `progress.md`, `decisions.md`, `history-notes.md`, `fonts.md`, `screenshots/`
- Next config with `output: "export"`, `images: { unoptimized: true }`, `trailingSlash: true`
- `wrangler.jsonc` for Workers static assets: name `trafalgar-1805`, a current `compatibility_date`, `assets.directory` set to `./out`
- `.nvmrc`; `README.md` (how to run, scripts, structure); `.gitignore` covering `out/`, `test-results/` and `playwright-report/`; Biome configured to ignore build output

npm scripts must work in PowerShell on Windows (no `rm -rf` or other Unix-only syntax). Local preview and test servers bind to 127.0.0.1, so Windows doesn't raise firewall prompts during unattended runs.
- `dev`
- `build`: static export to `out/`
- `preview`: serve `out/`
- `lint`: `biome check`
- `format`: `biome format --write`
- `typecheck`: `tsc --noEmit`
- `test:e2e`: Playwright against a fresh build, never a stale one
- `check`: lint, typecheck and test:e2e
- `deploy`: build, then `wrangler deploy` (defined, never run by you)
</structure>

<process>
Work through the phases in order. Keep a live checklist with your to-do tool and mirror it in `docs/progress.md`, so a later session can pick up where you stopped. After each phase, run the relevant checks and commit (branch `main`, small descriptive commits). The owner reviews at the end, so don't wait for approval between phases.

0. Setup
   - Check `node -v` and `git --version`, and that git has a user name and email. If Node is missing or older than 24, or git is missing or unconfigured, stop and tell the owner in Russian exactly what to install or run.
   - Scaffold with create-next-app without prompts. Read `npx create-next-app@latest --help` first, then pass every option as a flag: TypeScript, Tailwind, Biome, App Router, src directory, import alias `@/*`, npm. Disable its git initialisation; you initialise git yourself at the project root.
   - If it refuses because the folder isn't empty (this brief sits in `docs/`), scaffold into a temporary subfolder inside the project (for example `.scaffold/`) with installs skipped, move its contents up to the project root, remove the subfolder, and run `npm install` at the root.
   - Pin the versions, add the rest of the stack, run `npx playwright install chromium`, initialise git, and commit.
1. Research and design plan
   - Research Victory's 1805 appearance from reliable sources (museum pages, published plans, public-domain period paintings) and write the facts you will use, with sources, into `docs/history-notes.md`.
   - Read the GSAP skills and the current docs for the APIs you'll use.
   - Write a compact design plan into `docs/decisions.md`: palette, type roles, a layout sketch (ASCII is fine), the layer stack and a choreography table. Then review the plan against this brief and the avoid-list, and revise anything that reads like a default.
   - You may use subagents for research and documentation lookups to keep your main context focused.
2. Foundations
   - GSAP and Lenis wiring, Experience and the scene registry.
   - A pinned empty scene with a debug progress readout.
   - The fallback and reduced-motion branches, and the font setup.
   - A Playwright smoke test running against the export.
3. The ship: types, geometry, the Victory spec, silhouette mode and the lab page. Iterate visually until it passes your critique.
4. Environment: sky, sun, sea strips, haze, glitter and the distant fleets.
5. Choreography and text
   - The scroll timeline, and the idle loops with their pause logic.
   - The SplitText title, the copy, the scrim, the scroll cue and the chapter marker.
   - The scene-2 placeholder.
6. Polish and performance
   - Profile, fix jank and check the budgets.
   - Refine easing and timing until the scroll feels unhurried and continuous.
   - Walk through every pattern on the avoid-list.
7. Verification and report: run the definition of done below, update the docs, and write the final report.

When the brief leaves something open, decide, keep moving, and record the decision in `docs/decisions.md`. When the brief looks wrong, technically or historically, say so in decisions.md or history-notes.md, choose the closest faithful option, and keep going.
</process>

<definition_of_done>
Scene 1 is done when all of the following hold.

1. `npm run check` passes:
   - Biome is clean.
   - `tsc --noEmit` is clean on TypeScript 7.
   - `next build` writes a static export to `out/`.
   - Playwright passes.
2. The Playwright tests run against the served export in Chromium, at 1280×720 with device scale 1.5 (the owner's laptop) and at 1920×1080, and cover:
   - no console errors or page errors on load or during a full scroll through the scene and back;
   - every network request is same-origin (no fonts, scripts or images from other hosts);
   - the h1 reads "Trafalgar";
   - the pin releases into the scene-2 placeholder;
   - emulated reduced motion shows the static hero frame without errors;
   - a 390×844 touch viewport shows the fallback, puts no `lenis` class on `<html>`, and creates no ScrollTriggers;
   - the scene's SVG element count is under budget.
3. Long tasks during a scripted scroll are recorded with a PerformanceObserver. Headless Chromium renders in software, so treat these numbers as indicative: investigate anything over 50 ms and list for the owner what he should confirm on his laptop with `?debug`.
4. Screenshots are saved in `docs/screenshots/scene-01/` and you have looked at every one and fixed what was off:
   - 1280×720 at device scale 1.5 (the owner's laptop) at p = 0, 0.25, 0.5, 0.75 and 1;
   - p = 0.6 at 1920×1080, 2560×1440 and 3440×1440;
   - the reduced-motion view and the fallback view;
   - `/lab/ship`, plus close-up crops of the ship at device scale 2.
5. A Playwright video of one full scroll-through is in `test-results/`, with a note that headless video looks choppier than real hardware.
6. `docs/progress.md`, `decisions.md`, `history-notes.md`, `fonts.md` and `README.md` are current.
7. Everything is committed.
</definition_of_done>

<boundaries>
- Stay inside the project folder. No global installs, no system changes.
- Don't deploy, don't log in to Cloudflare, and don't create or push to remote repositories. The owner connects GitHub and Cloudflare himself.
- Add no dependencies beyond the stack unless something essential is missing; if you add one, justify it in decisions.md. No UI kits, no state libraries, and no animation libraries besides GSAP and Lenis.
- No copyrighted images, fonts or code. Reference images inform your drawing; they don't go into the repository.
- Don't downgrade a pinned major version without stopping to explain why.
- Scene 1 only. Don't start scene 2.
- Nothing that costs money.
</boundaries>

<final_report>
Write the final report in Russian. The owner listens to it with text-to-speech, so use short plain sentences and no tables. Cover:
- what was built, and the three or four commands to run it;
- what to look at first, with screenshot paths;
- what you couldn't verify, and how he can (for example FPS with `?debug`);
- the historical points you weren't sure about;
- at most three questions that need his decision.

When every item in the definition of done holds, write this report and end the session: that is the stop the owner wants.
</final_report>

<how_your_turns_end>
A standing instruction from the user, the person you are working for. It is about how your turns end. A message with no tool call in it ends your turn, and the work stops there until you are asked to continue. The user has seen you end turns in four ways while work they asked for was still owed, and does not want any of them. One: a long summary of what was done that closes by announcing the next step and has no tool call, so the next thing never starts. Two: an offer to carry on with something unless the user would prefer otherwise, which stops to wait for an answer the user was not going to give. Three: a list of decisions for the user when, by your own account, none of them blocks the rest of the work. Four: deciding that this is a good place to report, because the turn has been long or a milestone is done. Status notes are welcome, and so are your recommendations on open decisions, but put them in the same message as your next tool call and carry on with whatever does not depend on the user's answer. If you notice yourself inviting the user to redirect you or offering to wait, delete it and do the next thing. The stops the user does want are the ones where nothing can move without them, or where the thing blocking you is deliberately protected from you. This does not override the need for confirmation on risky or destructive actions.
</how_your_turns_end>
