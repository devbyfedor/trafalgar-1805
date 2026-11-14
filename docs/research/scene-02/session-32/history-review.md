# The Scene 2 history draft: the four reviews and what was done (session 32)

Four independent reviews of `session-17/history-scene-02-wip.md` and `session-32/army-march.md` are in this folder: `review-facts-campaign.md` (C), `review-facts-autumn.md` (A), `review-code.md` (K) and `review-rules.md` (R). Each finding below was checked against the evidence it names before anything changed. The sources were read in public-domain scans: Desbrière 1907 with the annexes, Nicolas VI and VII, James III, Corbett 1910, Clowes V, Beatty 1807, Hubback 1906, the *Naval Chronicle* XIV, NRS II, Alombert and Colin I, II and III/1, Maude 1912 and the *Correspondance* XI. The code was read at main's `1a1378d`, the version merged into this branch.

In all: 68 findings. 58 fixed, 3 of them only in part (K21, R11, R17). 10 left for the lead or for the merge. Four are citations in code and in the lead's files (K13–K16). Six are for the merge's shape or touch an approved section (R1, R2, R3, R6, R8, R19). None rejected: every finding held on the evidence.

"Left" means the finding holds but the change is not this review's to make. It belongs to code or to `decisions.md` and `progress.md`, which the lead owns; or to the approved sections of `docs/history-notes.md` (scene 1, "Boulogne from the sea"); or to the shape of the merge.

## Facts: the campaign (C)

- **C1. Nelson's memorandum, "thirty-four sail".** Fixed. The memorandum supposes an enemy of 46 sail of the line against 40 (margin note, Nicolas VII 90 n.); its "34 Sail" is the remainder after twelve are cut off (VII 91). Both are now cited, with the letter of 19–20 October that shows both uses of "sail" (VII 132).
- **C2. Desbrière's 32 and "about 26".** Fixed in "After", "Not lettered" and the doubts. Desbrière himself corrects his 32: the Dragon and Goliath never joined, and the total was 26 (pp. 143, 145). James III 379 and Corbett p. 267 give only the parts. The 24 or 25 seen from the San Sebastián tower is added.
- **C3. A fourth British position at Finisterre.** Fixed in "Where" and the doubts. The Windsor Castle's minutes give 44°10′ N 11°22′ W (*Naval Chronicle* XIV, p. 168). With the allies about 16 miles SSW, that puts them about 43°55′ N 11°31′ W, on the edge of the 43°20′–43°55′ N range, so the range stands.
- **C4. The peak of 29.** Fixed. Beatty, James and Clowes imply it only by their loose groupings ("between the 7th and the 13th"). The Victory's log and Nicolas VII 94 n. stand against them.
- **C5. Austen's "five sail of the line".** Fixed under Collingwood, "Not lettered", "20 August" and the doubts (Hubback 1906, p. 142). Austen's "21st", from the Euryalus's report, is listed for 21 August as probably a nautical date.
- **C6. The 12.30 at Ares.** Fixed. Desbrière p. 97 has "vers midi". The 12.30, with nine Spaniards, is Escaño's, in an entry for the 10th to the 13th (annexes p. 7).
- **C7. "Four of Ferrol's six French 80s drawn as 74s".** Fixed, together with K7. "Drawn with other types" now lists what the squadron blocks draw and what the October and dawn fleets draw, each with its size, as `squadrons.ts` and `fleets.ts` `RIGS` have them. All four French 80s are drawn as 80s.
- **C8. WSW of Toro.** Fixed: W¾S. The log has "Toro bore E. ¾ N."; Desbrière (p. 11) has "O. 3/4 S." at 10.20 a.m.
- **C9. 13 from 2 August.** Fixed in the text. Escaño has the Argonauta and Terrible anchoring at Ferrol at 9 a.m. (annexes p. 7), so the label's noon is three hours late on the rule. Changing the label is for the lead (`squadrons.ts`, `V.coruna`).
- **C10. 29 from 9 a.m. on 13 August.** Fixed: high for 29 and the day, medium for the hour. Desbrière has the last three joining "avant midi" (p. 98).
- **C11. The run east.** Fixed: from the 19th by Reille (Desbrière p. 57), from the 17th by Corbett (p. 195). Added to the doubts.
- **C12. "Some 450–500 nm".** Fixed: at least 500 nm. That is about 514 nm straight from the drawn bend, about 565 by Cape St Vincent (computed); Corbett has 550 miles (p. 261 n.).
- **C13. The Barbadoes and Netley.** Fixed in the narrative and the doubts. James names Nourse and Harward (III 351); Corbett finds no authority for either (p. 166 n.).
- **C14. "13 for two days".** Fixed: one or two days. Villeneuve has the América back on the 11th, Reille on the 12th.
- **C15. Bickerton's four.** Fixed. Desbrière's first list (p. 109 n., after Leyland) has the Mars for the Tonnant, and James names only the Queen. The count is the same.
- **C16. "The figure and the ships drawn there always agree".** Fixed: "where the ships are drawn". Off Cádiz in October the British label runs ahead of the drawing.

## Facts: the autumn (A)

- **A1. The head held at the Rhine and also at Bruchsal and Heilbronn.** Fixed by reading (a), in both files: the head goes on. It reaches Rheinhausen on 26 September, Bruchsal on the 27th and Heilbronn on the 29th. "26–30 September" letters only the corps' crossing span. Confirmed in A&C II 42–43.
- **A2. Ney by Höchstädt, not a joining stretch to Günzburg.** Fixed in "The dashed line", "Routes on the chart", licence 13 and army-march.md (verdict 4, row 36, "For the chart", "Donauwörth to Ulm"). Maude p. 200 has Ney at Höchstädt on the evening of 7 October; A&C III/1 20–21 has his corps along the left bank to Gundelfingen on the 8th; III/1 34 has Labassée marching from Gundelfingen. Only Donauwörth to Höchstädt is a joining stretch. The conflict over the 7th, Giengen (A&C II 61) against Höchstädt (Maude), is noted. Höchstädt (10.566 E, 48.611 N) is offered as an optional changeover point.
- **A3. Hall and Ellwangen "about 20 km" off the sketch's chord.** Fixed by dropping the first sketch's history (see R10). Computed: Hall about 9 km and Ellwangen about 3 km off the chord.
- **A4. The third small sail, "most likely a merchant prize".** Fixed. It is now contested, its identity unknown (a misjudged ship of the line or the Agamemnon's detained brig), and not drawn.
- **A5. The Observateur by the Bucentaure.** Fixed in the text (licence 10 and "What the chart draws, October"). The text now says what is drawn: the Furet and the Observateur by the commander-in-chief's flagship, the Argus by Gravina's. It adds that her station of 6 October was in Dumanoir's squadron, abreast the Rayo (annexes p. 124, confirmed). Moving her by the Formidable is the lead's choice (`fleets.ts`, `BY`).
- **A6. "North-east by Saint-Omer".** Fixed in both files: east to Saint-Omer (86°), then south-east to Cambrai (133°).
- **A7. Noon at the Rhine.** Fixed in both files: noon was Soult's plan that morning (A&C II 507–508); the narrative has only "dès le 26". It stays the line's convention.
- **A8. Leaving Metz on 18 September, "High".** Fixed in both files: medium-high, as ordered (A&C I 415). The 4th division's keeping of the same order to the day is cited as support. A&C I 436–437 was not re-read here.
- **A9. James III 325–326 for the camps.** Fixed. A new bullet, "Which troops lay where", cites No. 9137 for the camps of Ambleteuse, Boulogne and Étaples, and A&C I 277 for the grenadiers at Wimereux. James is given for the flotilla's divisions and whom each was to carry, his Calais "reserve" being the flotilla's.
- **A10. Oudinot's march on 26 August uncited.** Fixed: A&C I 277, 283–284 (confirmed).
- **A11. The Weazle and Pickle "both at 9".** Fixed in the narrative and the relay table. The Weazle was signalled at 8.40 (the Euryalus's signal log, NRS II 160–161); the Sirius logs both parting at 9.

## The code (K)

- **K1. The October labels fall in the fleets' fade-in.** Fixed in the text, at main's `1a1378d`: under "The British fleet off Cádiz, by date", the combined fleet's 32, licence 15, and the October bullet, whose example is now "Nelson, 27 sail". Both fleets come in over p 0.655–0.675 and stand at half strength only from about 6 October. So the 29 and the 32 never read and the 23 barely does; Nelson's squadron label fades from p 0.648. The code alternative (bring the fleets in by about p 0.65, or give the clock room) is for the lead, with a measurement.
- **K2. The harbour hold, "a little before 7 to 8.15".** Fixed: about 7.45 to 8.40 a.m. (p 0.72–0.75). The same old hours in `camera.ts` (comment at 156) and `decisions.md` (578) are for the lead.
- **K3. The hold at Rheinhausen.** Fixed with A1.
- **K4. The Danube's name.** Fixed: east of Donawerth, toward Neuburg, as `gazetteer.ts` sets it.
- **K5. "10 June", "2 August", "15 August", "20 August" as lettered dates.** Fixed in "Where the sources changed the brief" and "The turn, 10 June". The chart letters "10" at the turn and "2" at A Coruña; Ferrol to Cádiz has no day circles, so those two dates are on the date line only.
- **K6. The crossing "without day marks".** Fixed in "Routes on the chart", "Dates and conventions", licence 14 and the doubts: no day marks after the noon of 10 April, which is lettered.
- **K7. The French 80s; the October and dawn types missing.** Fixed with C7.
- **K8. Europa Point and Rock of Lisbon.** Fixed: they would be spelled out; neither is lettered now.
- **K9. Louis's ships at Gibraltar and Tetuan.** Fixed. The bullet is now Nelson's anchorages on his tracks, and Louis's ships are never drawn. Licence 10 is changed to match.
- **K10. The Finisterre meeting and the three stations.** Fixed. A new positions bullet, "Stations without tracks", gives Orde, Calder and Collingwood from `STATIONS`. A new licence 18 covers the meeting as `MEETINGS` draws it, and licence 10 now lists both.
- **K11. Beat 5 not described.** Fixed: a new bullet, "What the chart draws on the 20th and in the night", covers the cut-away to Ulm and the fleets out of the story from about 2.30 to 11.45 p.m. on the 20th. Licence 7 notes that the 145° evening heading is not on screen.
- **K12. The chain's four in place from 28 September.** Fixed as a licence (licence 8 and "How the chart shows the signals"). Timing their moves into the chain (from 4 October; the stations of 14–15 October) before the relay shows them apart is for the lead.
- **K13. fleets.ts 242 and 1106 cite a section the merge removes.** Left for the lead (code).
- **K14. decisions.md 688 and 704, progress.md 359.** Left for the lead (his files).
- **K15. Four boulogne-sea comments cite "The painting's light".** Left for the lead (code).
- **K16. boulogne.ts 61–64 and the lab's tracks.ts 34.** Left for the lead (code).
- **K17. Three craft "about 2 km" outside the lines.** Fixed: about 3 km (computed 2.65–2.96 km). The `boulogne.ts` 262 comment and `decisions.md` 755 are for the lead.
- **K18. 147° and 150°.** Fixed. One figure, 150° for the drawn centroid of all 33, with 147° to the main body's centre named beside it.
- **K19. "Sized by its corps' strength".** Fixed: "sized roughly".
- **K20. Boulogne's roads missing from licence 3's close views.** Fixed.
- **K21. Merge housekeeping.** Fixed in part: the WIP comment now records this review and says the merge removes it. Left for the merge: history-notes line 164 (inside the approved "Boulogne from the sea") and the deliberate dropping of main's change log (history-notes line 142).

## Rules (R)

- **R1. The section is three times the size of the file it joins.** Left for the lead, who decides the merge's shape. The recommendation stands: keep the finished draft as a research note (for example `research/scene-02/history-scene-02.md`) and merge a summary that points to it.
- **R2. The strengths list restates the narrative.** Holds; left for the merge's shape (R1). The Louis account is cut here (R4).
- **R3. Open doubts restate the body.** Holds; left for the merge's shape. The merged summary should get one line per question; the research note keeps the full list.
- **R4. Louis's detachment told twice.** Fixed. The narrative bullet now points to "Fleet sizes at each stage".
- **R5. Licence 9 restates "19 October".** Fixed. The record is replaced by pointers; the drawn hours and the departures stay. The Fougueux's place in the narrows is still told in several places, left with R2.
- **R6. Scene 1's row: "about NE then ENE true".** Holds: E by N less 21° is about 058°, NE by E. Left for the lead, since scene 1's sections are approved: history-notes line 22 should read "about NE, then NE by E true (047° and 058°)". The draft's line explaining the difference stays until that row is corrected.
- **R7. Boulogne repeats "Boulogne from the sea".** Fixed. "The harbour and the roads" and "The craft" now point there, keeping only James's 1804 account in one sentence; row 19 says "long lines cut by cross streets between battalions"; row 20 points to the bullets there; "The ports" is split from "Which troops lay where".
- **R8. history-notes.md at the merge.** Left for the merge: remove main's "Scene 2: the strengths lettered at the tracks' heads" (lines 95–154), deal with lines 97 and 164 (164 is in the approved "Boulogne from the sea"), and add `research/scene-02/README.md` to the opening list.
- **R9. How the owner's night-signal answer fits the history.** Fixed. "How the chart shows the signals" now states it. The night links were the same kind of ships, but a short chain under 10 nm between the closing fleets; the night of 19–20 October along the long chain is the nearest to "the same chain by night". For the lead, and perhaps the owner, before the relay session.
- **R10. The army line described as drawn.** Fixed. The line is marked as being built this session, the building-site wording and the first sketch's history are gone, and the paragraph says it is to be rewritten to the build at the merge.
- **R11. Stale markers.** Fixed in part. The WIP comment is updated, the process note at "How the chart shows the signals" is removed (it belongs in progress.md: for the lead), and the px detail is removed. The corrections of research notes at "Fourteen crossed together", "Barbados", "To the Rhine", the relay paragraph and "Boulogne" are removed. Those for `h1-campaign.md` and `a-h2a.md` R15 are now recorded in those notes; `a-h3.md` R5 and army-march.md already carry theirs. Left with R1: "Not here" and the names part's notes on `h5-names.md`, which belong to the research note if the merge takes that shape.
- **R12. "Dates beside it" listed twice.** Fixed: dropped, with a pointer to "Routes on the chart".
- **R13. The stragglers' option.** Fixed: "14 glyphs on the crossing, 17 and then 18 at Martinique".
- **R14. "From his arrival".** Fixed: "from the start of October".
- **R15. Modern pages without links.** Fixed in the draft's key sources, `session-17/small-craft.md` and `session-17/anchorage-19oct.md`: maritimeviews.co.uk "The prelude", Wikipedia "Arsenal de La Carraca", Hispanopedia "Batalla de la Poza de Santa Isabel", threedecks.org, and the RMG page of Pocock's BHC0548.
- **R16. The scene-02 README.** Fixed: `session-17/`, `session-21/`, `session-23/`, `session-32/` and `boulogne-sea/` are listed.
- **R17. Conventions.** Fixed in part:
  - months spelled out in the Toulon table (16 cells);
  - times after midnight as "12.20 a.m.";
  - the km exception stated in the opening paragraph;
  - "the" with ship names at the places cited;
  - Beatty as "p. 10 in both editions" (p. 10 in the 1807 text, confirmed);
  - paths as `decisions.md`, like the file's `research/` paths.

  The *Projets* dates (the draft's "1901–02" against "1902" in the approved "Boulogne from the sea") were not checked; left for the merge.
- **R18. The variation rule repeated.** Fixed: the signal chain's opening and both position methods now point to "Dates and conventions", "Bearings".
- **R19. The fleet in port told several times.** Holds; left for the merge's shape (R1).
- **R20. "Each glyph is drawn larger" with a bare pointer.** Fixed: it points to licence 3.
