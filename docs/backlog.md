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

## Also noted
- **Italic faces.** Bodoni Moda Italic and Baskervville Italic are in `src/fonts/` but not wired (`docs/fonts.md` says how). Ship names in captions are a likely first use.
- **Other ships at hero size.** Derived specs (two-deckers, the four-decker) have only been drawn as silhouettes. Their port positions now scale correctly (`specs/derive.ts`), but a hero rendering of each needs its own visual check.
