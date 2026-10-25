# Trafalgar 1805: scene 2 brief

This file is the brief for scene 2. It lives in `docs/scene-02-brief.md`. Don't edit it during a session; record changes and disagreements in `docs/decisions.md`.

`docs/scene-01-brief.md` stays in force for everything this brief doesn't cover: stack rules, project structure, the avoid-list, boundaries, the final-report format and how your turns end. Where the two differ, this brief wins.

<context>
Scene 1 ("Dawn") is finished and approved by the owner, Fedor. It runs at a steady 60 fps on his laptop, owner-verified. Read `docs/progress.md`, `docs/decisions.md`, `docs/history-notes.md` and `docs/backlog.md` before you start.

The owner's standard for the whole project: maximum beauty and effect, no simplified solutions, the same bar to the end. Smoothness is part of beauty: a scene that stutters has failed, so 60 fps on his laptop remains a hard requirement. His machine: Windows, Intel Core Ultra 5 125H with Intel Arc integrated graphics, 16 GB RAM, browser viewport about 1280×720 CSS pixels at device pixel ratio 1.5.

The fixed decisions from scene 1 still hold: desktop only with a single fallback screen for phones, English site, zero budget, public repository.
</context>

<goal>
Scene 2, "The road to Trafalgar": a living, three-dimensional sea chart of the Atlantic and western Europe, drawn like a chart of 1805 and filmed by a cinematic camera driven by scroll. Think of the campaign map of a grand-strategy game, but rendered as an engraved period chart: real relief lit by a low sun, depths drawn as ink lines, lettering lying on the surface of the chart, and small ships sailing the routes that led to Trafalgar.

The scene tells, as a flashback after the dawn of scene 1, how the two fleets came to meet: the invasion army at Boulogne, Villeneuve's run to the West Indies with Nelson in pursuit, the fight off Cape Finisterre, the retreat to Cádiz, Napoleon turning his army east, and the sortie from Cádiz that ends at dawn off Cape Trafalgar, where scene 3 begins.

The 3D chart is also the engine for scenes 3 and 4, which will show the battle itself on the same chart. Build it as a reusable engine, not a one-off.

The work is split in two stages. Stage A builds the engine, the data and the chart's look, proven by one camera flight on a lab page; then you stop so the owner can check performance on his own GPU. Stage B builds the full scene. This session does Stage A only.
</goal>

<history>
Research every point below, follow the sources where they differ from this brief, and record facts, dates, sources and doubts in a "Scene 2" section of `docs/history-notes.md`. The owner knows the period well. Where sources disagree on a date, say so instead of picking silently.

- The threat. From 1803 Napoleon gathers an army and a flotilla of invasion barges in camps around Boulogne, opposite England. To cross he needs command of the Channel.
- The plan and the chase.
  - Villeneuve breaks out of Toulon on 29 or 30 March 1805 (sources differ), passes Gibraltar, collects Spanish ships at Cádiz and crosses to Martinique, arriving around 14 May.
  - Nelson, delayed by contrary winds and uncertain where the French had gone, follows. He reaches Barbados in early June, commonly given as 4 June.
  - Villeneuve sails back for Europe around 9 to 11 June, with Nelson in pursuit.
- Cape Finisterre, 22 July 1805. Calder's squadron intercepts Villeneuve in fog and takes two Spanish ships.
- Villeneuve reaches A Coruña and Ferrol around 1 August. Instead of heading north for the Channel, he sails south to Cádiz, arriving around 20 August.
- Late August 1805: Napoleon abandons the invasion and marches the army east against Austria (the Third Coalition). On 20 October an Austrian army under Mack surrenders at Ulm. This is the day before Trafalgar; use it.
- Nelson joins the fleet off Cádiz at the end of September (commonly 28 September). He keeps his main fleet out of sight over the horizon, with frigates watching the harbour and a chain of ships to relay signals between them.
- Napoleon orders Villeneuve into the Mediterranean and sends Admiral Rosily to replace him. Villeneuve puts to sea before Rosily arrives: the combined fleet begins leaving Cádiz on 19 October and is out by 20 October. The British frigates shadow it and signal its movements, including through the night of 20 to 21 October.
- At dawn on 21 October the fleets are off Cape Trafalgar.
- Fleet sizes at each stage (Villeneuve's fleet in the West Indies, Nelson's pursuing squadron, Calder's squadron at Finisterre, the fleets at Cádiz) are shown with ship glyphs. Research the numbers and record them; where numbers are uncertain, use the best-supported figure and note it.
- How British frigates signalled by day and by night in 1805 decides how the signal chain looks. Research it rather than assuming.
</history>

<concept>
The look: an 1805 chart brought to life, not a satellite map. It continues scene 1's palette and typography, so the dawn sea of scene 1 can become the chart without a visual break.

- Sea: dark slate blue-grey, the colour of scene 1's dawn sea. Depths are drawn as fine pale ink isobaths, like soundings on a period chart. Shallow water near the coasts is slightly lighter.
- Coasts: an inked coastline plus waterlining, the parallel lines that follow the coast out to sea on charts of the period. This is the signature detail of the chart; it must stay crisp at every zoom.
- Land: bone and ochre paper tones with real relief from elevation data, lit by the scene's sun, with thin contour lines and restrained hill shading. Mountains (the Pyrenees, the Cantabrian range, the Sierra Nevada, the Alps, the Atlas) should read clearly when the light is low. At continental scale true relief is invisible, so exaggerate it vertically and let the exaggeration ease off as the camera comes closer, so it reads from far away without looking absurd up close.
- Lettering lies on the surface of the chart and tilts with it, as on a real chart: places in Baskervville roman, waters (seas, bays, capes) in Baskervville italic, the largest names (oceans) in Bodoni Moda. Ocean and sea names may use widely spaced capitals, as period charts did; this is the one exception to the avoid-list rule about spaced capitals. Names are the ones used in 1805.
- Show coastlines, rivers and relief only. No modern political borders.
- Sky and horizon: when the camera is low or tilted, the horizon, sky gradient and atmospheric haze match scene 1. Distance fades into haze, never into a hard edge of the map.
- Light changes with the story: low warm light, a night passage for the sortie from Cádiz, and the same dawn as scene 1 at the end. Long shadows from a low sun are part of the drama. Shadows can be baked per lighting state at build time and crossfaded, if real-time shadows don't fit the budget.
- Ships are glyphs of the `ShipOfTheLine` component from scene 1, in silhouette or simplified mode: small upright side views standing on the chart, facing their direction of travel, coloured by side, leaving ink wakes behind them. They must read as the same ships as in scene 1.
- Routes are ink lines laid on the sea surface that draw themselves as the story advances, with the date of key points written beside them.
- The army at Boulogne: rows of tiny tents and the invasion flotilla in the harbour (instanced). The march east: a dashed ink line across the relief toward Ulm.
- Finisterre: puffs of smoke on the chart where the squadrons meet.
- The signal chain off Cádiz: the chain of ships between the harbour and Nelson's fleet lights up ship by ship when the combined fleet sails, in a form true to how signals were made (see history).
- A date line in HTML at a fixed place on screen, set in Baskervville, runs through the dates as the story advances.
- Captions in HTML, in the same title-card position and style as scene 1.

Patterns to avoid in this scene, in addition to the scene 1 avoid-list:
- satellite or photographic textures
- neon or glowing "data visualisation" lines
- cyan-on-black tech styling
- lens flares, bloom haze over everything, sparkle particles
- a spinning-globe intro
- glossy 3D map pins
- drop shadows under labels
- a hard cut between scene 1 and scene 2
</concept>

<beats>
The scene is pinned and scrubbed by scroll, fully reversible. As a guide, the whole scene should take about 60 to 90 seconds of steady scrolling, with each beat getting enough scroll that nothing feels rushed and nothing makes the visitor wait. Tune the lengths by feel and record them.

0. Transition in. The scene starts from scene 1's last frame: same horizon height, same sky, same sun on the right. The camera rises off the sea beside Victory and pitches down. As it climbs, the painted dawn sea becomes the chart's sea, and Victory shrinks to a glyph near Cape Trafalgar. No blank frame, no visible cut, no jump in horizon or colour.
1. Boulogne. The camera pulls back and travels north over Iberia and France to the Channel and the camps at Boulogne, with England across the water.
   Caption: "Summer 1805. At Boulogne, across the Channel from England, Napoleon's army waits beside a flotilla of invasion barges. It needs one thing: command of the Channel."
2. The chase. The camera rises over the whole Atlantic. Villeneuve's route draws itself from Toulon past Gibraltar to Cádiz and across to Martinique, then back toward Europe. Nelson's route follows, behind. The ships sail along the drawing heads and the date line runs.
   Caption: "Napoleon's plan: Villeneuve breaks out of Toulon, gathers Spanish ships at Cádiz and sails for the West Indies to draw the Royal Navy away, then races back for the Channel. Nelson follows him across the Atlantic and back."
3. Finisterre and the turn. Smoke off Cape Finisterre. Villeneuve's line bends south to Cádiz. Then the army's dashed line leaves Boulogne for the east across the relief.
   Caption: "Off Cape Finisterre, Calder's squadron catches Villeneuve and takes two Spanish ships. Villeneuve turns south and shelters in Cádiz. At the end of August, Napoleon gives up on England and marches his army east."
4. Cádiz. The camera descends to the Gulf of Cádiz: the combined fleet in the harbour, the watching frigates, the signal chain, and Nelson's fleet over the horizon. The fleet comes out and the chain lights up.
   Caption: "Nelson takes command off Cádiz and keeps his fleet out of sight, linked to the coast by a chain of frigates. On 19 October the combined fleet begins to put to sea, and the signal runs down the chain."
5. Night and descent. Night light. A brief cut-away of the chart to Ulm with the date, then back to the fleets closing in the dark. The camera descends toward Cape Trafalgar as dawn returns, and the fleets take up their dawn positions: the British to the west, the combined fleet in its ragged line to the east. This is the handoff to scene 3; the pin releases into a placeholder reading "Chapter III follows".
   Caption: "On 20 October, far to the east, an Austrian army surrenders to Napoleon at Ulm. Through that night the fleets close on each other off Cape Trafalgar."

Chapter marker: "II. The road to Trafalgar". Copy goes in a content file so the owner can edit it.
</beats>

<technology>
Rendering
- three, latest r186 at the time of writing (npm `three@0.186.x`; confirm with `npm view three version` and use the newest patch of the newest release).
- Use `WebGLRenderer` (WebGL 2) with your own `ShaderMaterial`/GLSL for the chart.
  - three.js's own manual still recommends `WebGLRenderer` for pure WebGL 2 applications and describes `WebGPURenderer` as still experimental in places.
  - troika text and the fat-line addons are proven on WebGL.
  - Record this decision in decisions.md.
- Fat lines: `Line2`/`LineMaterial` from three/addons, or your own ribbon geometry if it looks better.
- Text on the chart: troika-three-text 0.52.x. It reads .ttf, .otf and .woff, not .woff2. The owner has put static WOFF instances of the site's fonts in `public/fonts/3d/` (see the README there). Always pass one of those URLs as the font: troika's default font is fetched from Google's CDN, which would break the same-origin rule.
- Post-processing only if it earns its cost within the budget (for example a final colour and grain pass, or a subtle depth haze). No bloom haze. If you add a library, justify it in decisions.md.
- No React Three Fiber: the scene is driven from GSAP like scene 1, and a second render loop must not exist. No OrbitControls: the camera moves only by scroll.

Data, prepared at build time by Node scripts. The owner's Windows machine has no Python or GDAL, so use Node packages only.
- Relief and depths: NOAA NCEI ETOPO 2022 (topography and bathymetry, public domain as a US government work). Download only the regions and resolutions you need, through NOAA's ERDDAP griddap subsetting (dataset ids such as `ETOPO_2022_v1_15s`, `_30s`, `_60s`) or NCEI's Grid Extract. Never download the global grid.
  - An overview grid for the whole stage, from the Caribbean to the upper Danube.
  - Detail tiles for the close-ups: the Gulf of Cádiz with the Strait of Gibraltar; and, in Stage B, the Channel around Boulogne.
- Coastlines, land and rivers: Natural Earth (public domain), from its official GeoJSON.
- Projection: Mercator, as charts of the period used.
- Precompute what the shaders need: packed height and depth textures, a coastal distance field for the waterlining, and baked shadow or light maps per lighting state if you use them.
- Raw downloads stay out of git (gitignored folder). Processed, compressed assets are committed together with a note on their sources.
- One documented command (for example `npm run data:build`) regenerates everything.
- Credits: add "Relief: NOAA NCEI ETOPO 2022. Coastlines and rivers: Natural Earth." to the site (a small credits line after the scenes is enough) and to README.md.

Loading
- three.js and the scene-2 code load as a separate chunk via dynamic import, never in the initial bundle.
- Prefetch the chunk and the scene-2 assets once scene 1 is interactive and the browser is idle.
- Compile shaders and upload textures before scene 2 becomes visible, so entering it never hitches.
- On phones and in the fallback, nothing from scene 2 is downloaded at all.

Before writing code against three r186 or troika 0.52, read their current docs and changelogs: these versions may be newer than your training data. Re-read the GSAP skills for ScrollTrigger and React.
</technology>

<performance>
Budgets, on the owner's laptop at his viewport:
- a steady 60 fps through the whole scene, owner-verified;
- no main-thread long tasks over 50 ms while scrolling;
- around 150 draw calls or fewer;
- GPU texture memory within about 256 MB;
- the scene-2 JS chunk within about 300 KB gzipped;
- scene-2 assets within about 10 MB in total, with the first chart view usable from a fraction of that.

Rules:
- One clock. Render from `gsap.ticker`, the same ticker that drives Lenis and the scene 1 canvas. Render only while scene 2 is in view, and stop rendering when it isn't or when the tab is hidden.
- Cap the render resolution (start at device pixel ratio 1.5).
- Instancing for tents, barges and glyph groups. No per-frame allocations. Frustum culling on.
- Shaders: derive isobaths, contours and waterlining analytically in the fragment shader (anti-aliased with screen-space derivatives), so they stay crisp at every zoom without extra geometry.
- An adaptive quality ladder (render resolution, then optional effects) with hysteresis, as a safety net for weaker machines. On the owner's laptop the scene must hold the top level: the ladder is not a way to hide a slow scene.
- Handle WebGL context loss: restore if possible, otherwise switch to the stills fallback below.
- Debug mode (`?debug`): FPS, draw calls, triangles, texture count, current quality level and render resolution, alongside scene 1's readouts.
</performance>

<fallbacks_and_accessibility>
- Reduced motion, WebGL unavailable or a lost context that can't be restored: show scene 2 as a sequence of stills, one per beat, each with its caption, crossfading or stacked. The stills are rendered from the scene itself by a script (Playwright is fine) at 1920×1080 or larger, stored as WebP, about 1.5 MB in total.
- Phone fallback: unchanged from scene 1. Scene 2 is not mounted and loads nothing.
- The canvas is decorative and `aria-hidden`. Captions are real HTML text. The running date line is `aria-hidden` (it changes too fast for assistive technology); the captions carry the dates that matter.
- Text keeps WCAG AA contrast over the chart at every point.
</fallbacks_and_accessibility>

<integration>
- Scene 2 plugs into the scene registry after scene 1 and replaces the "Chapter II follows" placeholder. A new placeholder "Chapter III follows" follows it, with the credits line after.
- Scene 1 must not regress. Its tests keep passing. Its screenshots at p = 0, 0.5 and 0.75 match the approved ones (a pixel-difference check with a small tolerance). Only its last moments may change, for the transition.
- Structure: `src/scenes/02-road/` for the scene, and `src/components/chart/` for the reusable chart engine (renderer setup, terrain, sea, coast, lettering, glyphs, routes, camera rig). `scripts/data/` holds the data pipeline. Add a `/lab/chart` page (noindex) like `/lab/ship`.
</integration>

<stage_a>
Stage A: engine, data and look, proven by one flight.

1. Research: the history above (written into history-notes.md); the three r186 and troika docs; ERDDAP subsetting.
2. Design plan in decisions.md:
   - palette, type roles and the layer stack;
   - how each chart feature is drawn (sea, isobaths, coast, waterlining, land, contours, lettering, sky and haze, light);
   - the camera rig (spline paths for position and target, no roll);
   - the quality ladder.
   Review the plan against this brief and both avoid-lists, and revise anything that reads like a default.
3. Data pipeline for the overview grid and the Gulf of Cádiz detail tile, plus Natural Earth coastlines and rivers.
4. The engine and the full chart look, ready for the owner to judge:
   - sea with isobaths and waterlining, inked coast, land relief with contours and light;
   - lettering for the main names;
   - sky, horizon and haze;
   - a few ship glyphs near Cape Trafalgar and at Cádiz;
   - one route drawing itself (Toulon to Cádiz).
5. `/lab/chart`: one scroll-driven camera flight. Start low over the sea off Cape Trafalgar at dawn, looking east as scene 1 does. Rise and pitch down to the Gulf of Cádiz, pull back over the whole Atlantic, then glide north to the Channel. The `?debug` overlay shows the performance readouts.
6. Tests: the lab page loads with no console errors, the canvas renders (sample pixels, not blank), all requests are same-origin. Scene 1's tests still pass.
   - Headless Chromium renders WebGL in software. That's fine for correctness and screenshots, and meaningless for frame rates.
   - If WebGL won't initialise in headless Chromium, look up the current Chromium flags for software WebGL (SwiftShader) and configure Playwright with them. Don't skip or weaken the tests.
7. Screenshots of the flight at several points, at 1280×720 with device scale 1.5 and at 1920×1080. Look at them and fix what is off before you stop: the chart is the thing being judged.
8. Commit, update progress.md, and stop with a short report in Russian:
   - what to look at, with screenshot paths;
   - how to run `/lab/chart?debug` on the production preview;
   - the history points you weren't sure about;
   - at most three questions.

Stage A is done when items 1 to 8 hold and `npm run check` passes. Stopping here is deliberate: only the owner can measure performance on his GPU, and nothing in Stage B should be built on an engine he hasn't seen run.
</stage_a>

<stage_b>
Stage B: the full scene, in a later session after the owner approves Stage A.

1. The Channel detail tile and any remaining data.
2. The chart features each beat needs:
   - the camps and the flotilla at Boulogne;
   - all routes with their dates;
   - the Finisterre smoke;
   - the army's line to Ulm;
   - the Cádiz harbour and the signal chain;
   - the night lighting;
   - the fleets at their dawn positions.
3. The transition from scene 1 and the handoff to the scene 3 placeholder.
4. The choreography of all beats, the captions, the date line and the chapter marker.
5. The stills fallback, prefetching and shader warm-up.
6. Polish and performance, with every pattern on both avoid-lists checked.
7. Verification:
   - `npm run check` passes;
   - scene 1's regression check passes;
   - Playwright covers scene 2: no console errors over a full scroll and back, same-origin requests only, the canvas renders, the pin releases into the scene 3 placeholder, the reduced-motion stills, and the phone fallback loading nothing from scene 2;
   - screenshots of every beat at the owner's viewport and at 1920×1080, 2560×1440 and 3440×1440, each one looked at and fixed;
   - docs are current;
   - everything is committed.
8. A final report in Russian, as in the scene 1 brief, then stop.
</stage_b>

<process>
- Keep a live checklist with your to-do tool and mirror it in progress.md.
- Commit after every finished step, so an interruption never loses work.
- Usage limits matter: don't spawn subagents unless a task truly needs one.
- Research what this brief asks for, and anything you have a concrete reason to doubt; don't re-research what history-notes.md already covers well.
- When the brief leaves something open, decide, record it in decisions.md, and keep going.
- When the brief looks wrong, technically or historically, say so, choose the closest faithful option, and keep going.
</process>

<boundaries>
The boundaries of the scene 1 brief apply, plus:
- No map tiles, map APIs, CDNs or other external services at runtime. Everything the site loads comes from its own origin.
- Data licences: ETOPO 2022 and Natural Earth only, both credited. No copyrighted maps, images or text in the repository.
- Research notes paraphrase their sources and link to them. The only verbatim text allowed is a short public-domain quote where the exact wording is the evidence, as already agreed for scene 1. Downloaded pages, PDFs and images stay outside the repository.
- Don't move scene 1 forward: it is approved. Change it only where the transition requires, and keep its regression check green.
- This session: Stage A only.
</boundaries>

<how_your_turns_end>
A standing instruction from the user, the person you are working for. It is about how your turns end. A message with no tool call in it ends your turn, and the work stops there until you are asked to continue. The user has seen you end turns in four ways while work they asked for was still owed, and does not want any of them. One: a long summary of what was done that closes by announcing the next step and has no tool call, so the next thing never starts. Two: an offer to carry on with something unless the user would prefer otherwise, which stops to wait for an answer the user was not going to give. Three: a list of decisions for the user when, by your own account, none of them blocks the rest of the work. Four: deciding that this is a good place to report, because the turn has been long or a milestone is done. Status notes are welcome, and so are your recommendations on open decisions, but put them in the same message as your next tool call and carry on with whatever does not depend on the user's answer. If you notice yourself inviting the user to redirect you or offering to wait, delete it and do the next thing. The stops the user does want are the ones where nothing can move without them, or where the thing blocking you is deliberately protected from you. This does not override the need for confirmation on risky or destructive actions.

The end of Stage A is one of the stops the owner wants: the performance check on his GPU is something only he can do.
</how_your_turns_end>
