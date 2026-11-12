# Backlog

Work the owner has deferred to later scenes. Each item says where it belongs, what the sources say and what the ship engine needs. Facts and sources are in `docs/history-notes.md`; decisions in `docs/decisions.md`.

## Approach scene

### Studding sails
The fleet sets every scrap of canvas in the light wind.
- **History.** Victory's log: on bearing up for the enemy, about 06:40–07:00, she let out all reefs and set royals and studding sails. Other logs have lower, topmast and topgallant studding sails, later on both sides. The wind was very light and westerly, dying toward calm by noon (history notes, "Wind"; assumption 4).
- **Engine.** Not modelled yet. `ShipSpec` needs studding-sail booms on the course, topsail and topgallant yards (run out beyond the yardarms), the studding sails themselves (lower studding sails spread from a swinging boom at the waterline end, the others outboard of each square sail), and a choice of side. The sail renderer's two-tone shading, cloths and warm-light layer should apply to them as they are.

### Hoisting the ensign
A deliberate moment before battle, not something already flying.
- **History.** Colours went up in both fleets at about 12:15, as the action began (Euryalus log; James). British ships wore the White Ensign by Nelson's order, with Union Jacks on the fore topgallant stay and the main topmast stay; the Combined Fleet hoisted its ensigns at the same time, and every Spanish ship hung a large wooden cross from the end of the spanker boom (James, via Nicolas). "England expects" was signalled at about 11:45.
- **Engine.** The White Ensign is already in `VICTORY_1805.flags` (`id: "ensign"`, at the spanker gaff peak, drawn about 1:2 and foreshortened). Scene 1 leaves it out through the `flying` prop of `ShipOfTheLine` (`VICTORY_FLAGS_AT_DAWN`). The approach scene can include it and animate the hoist on its wrapper (`[data-flag=ensign]`): translate up the peak halyard and unfurl with scale, transform and opacity only, as everywhere else. The viewBox already leaves room for it, so the ship does not move. The Union Jack design exists (`"union-flag"`); stay positions for flags are not modelled yet.
- The vice-admiral's flag stays at the fore throughout (owner's decision; history notes, assumption 3).

## When a scene shows the ports open

### Port interiors
- **History.** The museum's specifications paint the port linings and the inner faces of the lids red, but a summary of Goodwin's 2013 *Mariner's Mirror* paint article says the 1805 accounts list no red. Unresolved: read Goodwin first-hand, or ask the owner, before drawing open ports.
- **Engine.** `paint.portLining` (`#a6432a` today) is used only for the lidless upper-deck, quarterdeck and forecastle openings. Open lids, raised and hinged at the top, and guns run out are not modelled: a deck needs an "open" state and the lid geometry.

## The start-up dip (closed by the owner, 12 November 2026)

The owner watched the production preview several times with `?debug` and sees no dip: the work on the first seconds after load stops. Nothing of it is on main but the investigation, `docs/research/perf-load-s21.md` (the causes, measured; the ranked plan; the measurement protocol). Kept, not merged, not to be deleted:
- **Branch `s21-load-wip`** (`93b0f7c`, on `53899e6`): the plan's first changes, written but neither timed nor checked for the look. In `engine/context.ts`, the first-vertex convention (`WEBGL_provoking_vertex`, so ANGLE compiles no geometry shader on the GPU process's main thread at the tracks' first draw) and the parameters three asks for at its start served from values read while the context is made (no 13 to 33 ms round trips after hydration); both were proven pixel-identical by the scout's prototypes. In `Chart.warm`, each object's programs issued in an idle slice of its own, every texture upload and first draw in a frame of its own (`slice.ts`, `afterFrame`). In `stage.ts`, the rivers, the tracks and the heads' labels each in an idle slice of their own (the chain of 39 to 73 ms at about two seconds). Before any merge: the before/after by the note's protocol, `look-diff.mjs` against reference frames, scene 1's regression, the lab's `chart-frames`.
- **Branch `s21-perf`** (`bae9c20`): the scout's tools and prototypes (`scripts/dev/perf/`, "Session 21" in its `INDEX.txt`: `startup.mjs`, `s21-measure.sh`, `s21-ab.sh`, `gpumain.mjs`, `d3d.mjs`, `loafs-after.mjs`, `proto-*.js`) and `look-diff.mjs` taking `INIT=`.
- **Proposed, never decided** (the owner's call if the dip ever comes back):
  - **Scene 1's idle loops started late.** The overlay's first reading is mostly scene 1's own first raster: the swell, the haze and the glitter start with hydration and move at about 30 fps for the quarter second the GPU first rasters the page. They could start only once scene 1's first frames come on time: a change to how scene 1 starts, not to what it shows, but scene 1 is approved.
  - **A patched copy of one troika file.** Troika keeps its glyph atlas on a second WebGL context of its own (a support test, program links waited for, a pixel read, then a copy across contexts every visit). Keeping the atlas in a `DataTexture` written on the CPU needs a vendored, patched copy of troika's `TextBuilder.js` (MIT, kept with its licence) and `webgl-sdf-generator` aliased in `next.config.ts`. A patched dependency must then be kept in step with troika's updates.
  - The rest of the note's plan: the readback decoded in a worker, the director's constructor sliced, the uploads in bands, the chart's chunk in pieces.

## Also noted
- **Italic faces.** Bodoni Moda Italic and Baskervville Italic are in `src/fonts/` but not wired (`docs/fonts.md` says how). Ship names in captions are a likely first use.
- **Other ships at hero size.** Derived specs (two-deckers, the four-decker) have only been drawn as silhouettes. Their port positions now scale correctly (`specs/derive.ts`), but a hero rendering of each needs its own visual check.
