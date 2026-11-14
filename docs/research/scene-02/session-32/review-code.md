# Review of the scene 2 history section: agreement with the code and the decisions (session 32)

Reviewer's lens: does `docs/research/scene-02/session-17/history-scene-02-wip.md` (branch `s23-history`, at a970ab1, main merged at 1a1378d) describe what the chart actually draws and letters? Read against main's code in this worktree (`src/scenes/02-road/`: `routes.ts`, `fleets.ts`, `squadrons.ts`, `movements.ts`, `beats.ts`, `camera.ts`, `director.ts`, `boulogne.ts`, `gazetteer.ts`, `stage.ts`; `src/components/chart/lines/Track.ts`; `src/app/lab/chart/demos/tracks.ts`) and `docs/decisions.md`. Nothing was built or run. The story's clock was worked out by copying `lib/curve.ts`'s `monotoneCurve` and `beats.ts`'s unbroken keys into a small Node script, and the rest by reading the code. "Unchecked" means not checked.

Most serious first.

## Findings

1. **Some October strengths are never readable (wrong).** Several places say the October labels letter 29 from Nelson's arrival, 23 by 5 October and 32 from 28 September: "Fleet sizes at each stage" ("The British fleet off Cádiz, by date", "The combined fleet in Cádiz"), "What the chart draws, October" ("Nelson, 29 sail") and licence 15. In the code, an October label's presence is `fleetsShownAt(p)` (`director.ts` 273–280, 1907–1938). That value is a smoothstep over p 0.655–0.675, which by the clock runs from 1 October about 5 p.m. to 10 October about 10 p.m., and it reaches half only at p 0.665 (6 October, about 10 p.m.). So 29 gives way at p ≈ 0.657 (2 October, 6 p.m.) at about 2 % presence, 32 gives way at p 0.658 (3 October, noon) at about 6 %, and 23 is at half presence or more only from p 0.665 until its change to 24 at p ≈ 0.6664, about 30 px of scroll. Under the readability rule now adopted (half opacity or more), 29 and 32 are never readable and 23 hardly at all. Nelson's own squadron label also starts to fade with the squadrons' beat at p 0.648 (27 September, 3.37 a.m.; `applySquadrons`), not "at 6 p.m. on 28 September". Fix: the lead decides between the code (bring the fleets in by about p 0.65, or give the clock room after the fade) and the text (say that these figures fall inside the fleets' fade-in). Measure the result with `scripts/dev/label-changes.mjs` or `contrast.mjs`.
2. **The harbour hold's hours (wrong).** "Not on screen in the two fleet views" gives the harbour's close view as "held from a little before 7 to 8.15 a.m. on 19 October". `camera.ts` holds over the harbour from p 0.72 to 0.75. On the current clock `dayAt(0.72)` is about 7.45 a.m. and `dayAt(0.75)` about 8.41 a.m. The fast stretch before p 0.70 bends the monotone curve: p 0.705 is 6.34 a.m. and p 0.71 is 7.02 a.m. So No. 370 at 7.00 falls during the descent, not during the hold. `decisions.md` line 578 and the comment at `camera.ts` 156 have the same old hours. Fix: "from about 7.45 to 8.40 a.m.". Confirm by evaluating `dayAt` in the dev console, or retime the hold (this matters for the relay plan).
3. **The march's Rhine hold contradicts its own table (wrong).** "Routes on the chart", "The army's march" says the head "reaches the river at noon on the 26th and holds there to the 30th". The same table has Bruchsal on 27 September and Heilbronn on 29 September. A `TrackPoint.until` holds the head (`Track.ts`), so a hold to the 30th cannot come before a point dated the 27th. `army-march.md` (line 68) gives the hold only "if the line shows the whole corps crossing". The lab's sketch has `until: 30 September` at the Rhine with Heilbronn undated. Fix: choose one. Either the head goes on (no hold, and "26–30 September" marks the corps' crossing) or it holds and the later stages are re-dated. Make the text match the lead's build.
4. **The Danube's name is placed wrongly in the text (wrong).** "Rhine and Danube" says the Danube's name lies "between Ulm and Donawerth by Höchstädt". `gazetteer.ts` sets it at 11.22° E 48.745° N, east of Donawerth on the reach toward Neuburg. Its comment says that between Ulm and Donawerth the name lay over Donawerth's. Fix the text.
5. **Dates the tracks do not letter (wrong).** The brief table and the bullets say "'10 June' at the turn", "'2 August' at A Coruña", "'15 August' at the bend" and "'20 August' at Cádiz". `legTracks` (`routes.ts`) sets no key-date labels. `Track.ts` (668–669) adds the month to a noon circle only at the track's first noon or on the 1st. So the chart letters "10" at the turn (the West Indies leg's first noon is 6 June) and "2" at A Coruña (the Vigo leg's first noon is 31 July). Nothing is lettered at the 15 August bend or at Cádiz on 20 August, because `combinedFerrolCadiz` has no `mark`. Only the date line shows those dates. Fix the wording ("the date line reads …"; "a day circle '10'"), or the lead adds labels.
6. **The crossing has one day mark (wrong).** "The crossing" (drawn without day marks), licence 14 and the open doubt ("so the crossing has no day marks") all say it has none. `villeneuveCrossing` has `mark: true` at noon on 10 April (`routes.ts` 71, table A's last row), lettered "10 April" as the leg's first noon. The comment at the head of `routes.ts` also says none. Fix: "no day marks after the 10 April noon of table A", or the lead removes the mark.
7. **"Drawn with other types" (wrong, and incomplete).** No French 80 is drawn as a 74, despite the text's "four of Ferrol's six French 80s". `squadrons.ts` draws the Bucentaure, Formidable, Neptune and Indomptable as `french-80` throughout, and so does `RIGS.french80` in `fleets.ts`. The six 80s out of Ferrol were those four and two Spaniards (the Argonauta and the Neptuno), and "Spanish 80s" already covers those two. The same clause is in main's `history-notes.md` at line 140. The list also leaves out the substitutions in the October and dawn views: the Royal Sovereign and Britannia (100s) drawn as 98s at 1.03, the Tonnant (80) as a 74 at 1.03, the British 64s (Agamemnon, Africa, Polyphemus) as 74s at 0.93, and the Rayo (100) as a Spanish 112 at 0.97.
8. **Two names not on the chart (wrong).** "Capes and the article" says Europa Point and Rock of Lisbon are "spelled out as the period spelled them". `gazetteer.ts` letters neither. Fix: say that they would be (not on the chart), or move them to "For later scenes".
9. **Gibraltar and Tetuan (wrong).** The bullet in "Positions on the chart" and licence 10 ("the berths of Louis's ships at Gibraltar and Tetuan") imply that Louis's ships are drawn there. They are never drawn (`NOT_AT_TRAFALGAR`). The two points serve Nelson's track: Tetuan on 4–5 May at −5.25, 35.63 (a-h2c H2-39) and Rosia Bay at −5.365, 36.123. Fix the wording.
10. **Finisterre and the three stations (missing).** At the meeting the chart draws Villeneuve and Calder as two single lines on the action's course of 247°, Villeneuve above, Calder below, with a lane between (`director.ts`, `MEETINGS`). The lines are formed from about 4 a.m. on 22 July (days[1] = 4.2 h), before the fog lifted and before Calder formed his line at 11.30. They stand until 6 p.m. on the 23rd and are apart by noon on the 24th (decisions, "The meeting's licence"). Orde, Calder and Collingwood have no tracks; each stands at a fixed station (`STATIONS`):
   - Orde: 36°27′ N 6°33′ W, heading 280.
   - Calder: 43°49.8′ N 11°33′ W, heading 245, about 30 km NNE of the action as drawn. That is none of the three noon positions under "Where"; the nearest is James's, about 5.5 nm away.
   - Collingwood: 36°18′ N 6°27′ W, heading 150.

   Neither the licence nor these estimates is in the section. Add them to "Assumptions and licences" and licence 10.
11. **The cut-away to Ulm (missing).** The fleets, ships and labels alike, leave the story over p 0.835–0.85 and come back over p 0.905–0.925 (`fleetsShownAt`). By the clock they fade out from about 2.30 p.m. to 6 p.m. on the 20th and are back between about 10.20 and 11.45 p.m. Between those times the camera goes to Ulm (p 0.855–0.885, about 6.50–9.10 p.m.). The "What the chart draws" bullets skip the night. "Lettered 'Nelson' … from his arrival to the dawn of the 21st" implies the label stays throughout. The 145° evening heading of licence 7 is never on screen. Add a bullet.
12. **The chain's ships from 28 September (missing).** Licence 8 and licence 15 leave this out. The Defence, Agamemnon, Colossus and Mars stand at their 19 October places in the chain from Nelson's arrival (`movements.ts`, `britishKeys`: keys at `SEPT_28` and 9.30 a.m. on 19 October). That is before the chain was set (4 October) and before those stations (14–15 October). The British gate hides it now, but showing the chain apart from the fleet (the owner's answer of 14 November) will make it visible. Record it as a licence, or plan a move.
13. **The three craft under sail at Boulogne (wrong, minor).** "Positions on the chart", "Boulogne" says the three under sail lie "about 2 km outside" the lines. Computed from `UNDER_SAIL` against the axis of the outer line in `LINES`, they lie 2.65, 2.96 and 2.95 km outside. The 1.3 km gaps and the 2.6 and 5.6 km offsets are right. Fix: "about 3 km". The comment at `boulogne.ts` 262 and `decisions.md` line 755 say 2 km as well.
14. **Midnight to dawn: 147° or 150° (style).** The positions table and the open doubt give about 147°; licence 7 gives 150°. Both are right for their own centre: the main body's 36°09′ N 6°14′ W, or the drawn centroid of all 33 with Gravina's squadron. Use one figure and say which centre.
15. **The camps "sized by their corps' strength" (style).** `CAMP_PLANS` gives Davout's corps (33,000) and Ney's (27,000) the same 24 hut places, Soult's two camps 51 and the grenadiers 10. Say "roughly".
16. **Licence 3's close views (missing, minor).** The list leaves out Boulogne's flotilla, which comes in under the same rule behind its own gate (`FLOTILLA_GATE`).
17. **Merge housekeeping (style).** Remove the work-in-progress comment on line 1. `history-notes.md` line 164 ("Boulogne from the sea") calls the draft superseded; once merged, point it at "Scene 2: the road to Trafalgar", "Boulogne and the invasion army", which f92fc24 reconciled. Main's "What changed from session 20's figures" (`history-notes.md`, line 142) is not carried into the draft. Dropping a change log is reasonable, but make it a deliberate choice.

## Citations of history-notes headings (checked by grep in src/, scripts/, tests/ and docs/)

These assume a merge as "## Scene 2: the road to Trafalgar" beside "## Scene 2: Boulogne from the sea (beat 1)", with "## Scene 2: the strengths lettered at the tracks' heads (sessions 20 and 21)" removed. The `scripts/` and `tests/` folders cite none.

**Will break:**
- The comments at `src/scenes/02-road/fleets.ts` 242 and 1106, "Scene 2: the strengths lettered at the tracks' heads". Cite "Scene 2: the road to Trafalgar", "Fleet sizes at each stage" ("The strengths lettered at the tracks' heads", "The British fleet off Cádiz, by date").
- `docs/decisions.md` 688 and 704: the same heading and the same fix.
- `docs/progress.md` 359: the same heading. It is a log entry, so the lead may leave it.
- The four "The painting's light" comments. Each should cite "Scene 2: Boulogne from the sea (beat 1)", "The evening and its light", "The hold opens in the light of 18:33":
  - `boulogne-sea/plates/sky/cumulus.ts` 15.
  - `boulogne-sea/plates/town/houses.ts` 71.
  - `boulogne-sea/plates/town/kit.ts` 13.
  - `boulogne-sea/plates/water/shore.ts` 98. This one describes the water mirroring the eastern sky, so add "The eastern sky after sunset".
- `src/app/lab/chart/demos/tracks.ts` 34 cites `history-scene-02-merged.md`, "The turn east and Ulm". Point it at `history-notes.md`, "The turn east and Ulm" and "Routes on the chart", "The army's march". Its 9-point `ARMY` is the replaced first sketch.

**Resolve, but the content is stale:** `boulogne.ts` 64, `history notes, "Boulogne"`, says the Outreau site and the extent toward Terlincthun rest on "an uncited modern account". The draft now documents them (Desbrière III 428; Bertrand I 334). Cite "Boulogne from the sea", "The camps", "Where they stood", and drop the sentence.

**Resolve:**
- Scene 2 code:
  - `dates.ts` 4: "Dates and conventions".
  - `routes.ts` 7: "Routes on the chart".
  - `squadrons.ts` 5: "Fleet sizes at each stage". Line 226: "Nelson's passage", by prefix.
  - `fleets.ts` 22: "Positions on the chart", "Fleet sizes at each stage". Line 502: "Dawn, 21 October". Line 908: "Positions on the chart".
  - `movements.ts` 21: "Nelson off Cádiz", "Orders, Rosily and the sortie", "The signal chain, 19 to 21 October", "Positions on the chart". Line 106: "Orders, Rosily and the sortie". Line 138: "20 October". Line 170: "Positions, 19 October", the bold label under "How the chart shows the signals".
  - `director.ts` 253: "The action".
  - `boulogne.ts` 12: "Boulogne and the invasion army", "Positions on the chart". Line 192: "The flotilla".
- Loose "Scene 2" citations, which resolve as prefixes but would be clearer naming the section:
  - `gazetteer.ts` 4: "Scene 2", names.
  - `Hoists.ts` 22: "How the chart shows the signals". `Hoists.ts` is used nowhere in the scene.
  - `components/ship/craft/specs.ts` 6.
  - `components/ship/geometry/smallcraft.ts` 9 and 13.
- `decisions.md`:
  - 286: "Scene 2", open doubts.
  - 371: "Fleet sizes at each stage".
  - 372: "Positions on the chart", Boulogne.
  - 376: "How the chart shows the signals".
  - 758: "Scene 2", Boulogne. Better: "Boulogne from the sea", "The flotilla in the roads and in the harbour".
  - 794, 839, 854–856: "Boulogne from the sea" subsections, all present.
- `progress.md` 684 and 300: "The signal chain".
- `backlog.md` 9: "Wind", in scene 1.
- The reviews: "The cliffs" and "The lower town".
- The Boulogne-from-the-sea code: "The belfry is the skyline's one tower", "Napoleon's pavilion", "Which way it faced", "What the roads see", "The lower town", "Churches", "What crowned it in August 1805", "The belfry", "The upper town", "The harbour works" and "The cliffs".
- The draft's own internal cross-references all resolve (checked by script).

## Checked and found right

- **Toulon to Cádiz:** the 20 points of the table, against `villeneuveToulonCadiz`.
- **The tables of 19 October and of the night:** every position of the chain, the frigates, the combined fleet and the British, against `CHAIN`, `frigateKeys`, `COMBINED_TRACK` and `BRITISH_TRACK`.
- **The British spreads and hours:** the spreads 1, 0.4, 0.6, 0.85 and 0.95, and the station until 9.30 a.m. on the 19th.
- **The combined fleet's spreads and headings:** 0.45, 0.75 and 0.9; 193° at the keys, 189° in the afternoon and 145° in the evening.
- **The sortie's hours:** the Rhin at 6.15 a.m. (at the mouth at about 10.20), the seven from 7 a.m. at 0.04 of a day apart (the last at 12.46 p.m., each at the mouth after 1 hour 41 minutes), the Hermione at 8.15 (at the mouth at 9.56), the Thémis, Cornélie and Hortense between 4.30 and 4.48 p.m., the rest from 6 to 6.48 a.m. on the 20th, the Rayo at 8.18, the Argus at 8.30 and the Furet at 6.54. At 8 a.m. three ships are weighing.
- **The anchorage:** the three lines, the 1.2 opening about 36°33.8′ N 6°16.4′ W (the Thémis moves 0.26 km), the frigates at the head, the Cornélie and Hortense south of the lines, each brig about a cable south of her flagship, the Fougueux at 36°31.0′ N 6°15.2′ W, the Observateur left at anchor, and every ship heading 294°.
- **The dawn layout:**
  - The Victory, the Royal Sovereign's place, the Africa and the Entreprenante.
  - The main body's line, about 7.3 nm from 36°13.3′ N to 36°06.0′ N, and the Príncipe de Asturias at 36°05.4′ N 6°16′ W.
  - The French frigates and brigs.
  - The 14 shifts over 1 km and their figures, the maximum for Gravina's squadron (0.88 km), for the frigates (0.82 km) and for the British (68 m), the mean over all 73 (0.43 km) and the allied centre 0.3 km to the south.
- **Every squadron strength by date** for Villeneuve, Nelson, Orde, Calder and Collingwood, against `squadrons.ts`.
- **The British October steps** (29, 23, 24, 26, 27, 28, 28 and 27) and the combined fleet's 32 and 33, against `lineStrength`. The values are right; their visibility is the subject of finding 1.
- **Boulogne:** the twenty craft (17 at anchor and 3 under sail), the kinds in each line, the line ends to 0.1′, the 1.3 km gaps, the 2.6 and 5.6 km offsets, and the five camps' coordinates.
- **The small craft:** the lengths of 29.5, 22.3 and 20.6 m, and the Weazle drawn at 1.03.
- **The September line:** its 22 points.
- **The points dropped as zigzags**, and the control points.
- **The names:** all 82 gazetteer forms, which match the lists for each beat, and the placements of Deal, The Downs, Guadaloupe, CARIBBEAN SEA, Fort Royal, the Rhine, Vienna and Munich.
- **What is not drawn:** no signals, smoke, lanterns, hoists or army track are drawn in the scene; the scene uses no `Hoists`.

## Unchecked

- Distances to the chart's coast (the Natural Earth checks), and the depths.
- Everything seen on screen: the gate opening only after the Donegal leaves, the 40 ships in the harbour view and the 72 in the last frame, the Fougueux and the Africa outside the frame, and the minor names giving way.
- The army line as the lead is building it now: its points, its labels ("26–30 September" here, "25–30 September" in the lab), its legend ("March of the Grande Armée" in the lab) and any new names it letters (Günzburg, Elchingen, Bitche and so on), which would need entries under "The names on the chart".
- Historical facts beyond this lens.
