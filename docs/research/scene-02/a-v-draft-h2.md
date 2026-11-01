# A-V-draft-h2: adjudication of the check of the Boulogne–Cádiz draft

Material: `docs/research/scene-02/draft-h2.md` and its structured data, element [1] of `docs/research/scene-02/drafts-data.json`. Check: `scratchpad/research/v-draft-h2.md` (28 issues). Session 9, 1 November 2026. Nothing in the repository was changed.

## Verdict

The check is right on 22 of its 28 points and partly right on 6. None fails outright. Its two biggest points stand:

- **The lab's narrows ship is on land.** It is on the Matagorda point, both on today's shore and on Faden's plan of 1797.
- **The draft's text about the lab is stale.** The lab draws the British on 047°, not 068°.

The check goes wrong in four places:

- **No. 7832.** It keeps this letter as support for a claim the letter contradicts: Napoleon calls both Wimereux and Ambleteuse new ports he had built.
- **No. 9209.** It treats this note's 500 craft and 80,000 men as Desbrière's summary only. The note itself has 500 craft, and an army of 60,000–80,000 (80,000–100,000 in another article).
- **Faden's plan.** It says no ships are drawn "through" the narrows. The plan in fact draws two Spanish ships of 1797 between the forts.
- **The British track.** It says no other draft carries the British movements of 20–21 October. The revised signals draft (`draft-h3.md`) carries the evening of the 19th, the 5 p.m. telegraph, the Naiad's report and both wears.

**Chart.** One glyph moves. The narrows ship goes from 36.5178 N 6.2488 W to 36.5165 N 6.2535 W, in 8 m of water today, 0.25 nm off the chart's coast, at the outer end of the channel between the forts.

**The dawn layout stays as drawn.** The notes record it as a licence, and the owner decides whether to keep it.

## Method

- Read the draft, its data, the check, `a-h2a.md`, `a-h2b.md`, `a-h2c.md`, `v-h2c.md`, the notes `h2-boulogne-cadiz.md` (sections 2–11), `draft-h3.md`, `v-draft-h3.md`, `draft-lead.md`, scene 1's notes (`history-notes.md`, `research/dawn-setting.md` sections 1, 4, 5), the brief, `src/scenes/02-road/fleets.ts` at commit `238788e` (positions unchanged since `aa7a358`; per-ship rooms since `238788e`) and the glyph room logic in `src/components/chart/glyphs/Glyphs.ts` and `docs/decisions.md`.
- Fresh archive.org OCR, split into leaves from the hOCR page index, each book in its own folder under `scratchpad/dl/`. Books: Desbrière 1907, NRS *Logs* II, Nicolas VII, James III, Maude, *Correspondance* IX and XI, and Beatty 1825. I also took the 1807 Beatty text and leaf images of pp. 1–4.
- Every leaf cited below was matched to its printed page. For James III, *Correspondance* IX and XI and Beatty 1807 I checked the page heads on the BookReader images: the BookReader leaf runs 3 behind the hOCR index for James III and 5 behind for *Correspondance* XI.
- Faden's *Plan of the Harbour of Cadiz* (1797): a full-resolution IIIF crop of the narrows from the Yale image service. I georeferenced it roughly on the two forts: north lies about 30° above the sheet's left edge, at about 239 px per nautical mile at full size.
- Positions: my own Natural Earth 10 m script reproduces the lab's rooms to 0.05 map km. It tests land or sea, distance to the chart's coast, room along 040° (Mercator map km) and plane-sailing fixes with variation 21° W. Modern depths come from the EMODnet point service, as profiles across the narrows. Fort and tower positions come from OpenStreetMap (Overpass, Nominatim).

## Ruling table

| # | Where | Point | Ruling | What to apply |
| --- | --- | --- | --- | --- |
| 1 | Positions: "Outer and inner ships"; data `cadiz-anchorage-inner`; `fleets.ts` narrows mark | The lab's narrows ship stands on land; the draft does not say the chart has no narrows | holds | New bullet text (below, A1); data point 36.5165 N 6.2535 W; the lab's mark moves there |
| 2 | "Where this differs from scene 1"; data `british-dawn-21oct`; owner question 1 | The text says the lab draws 068°; it draws 047°, and 068° was never a logged course | holds | The check's three replacements, as given in A2 |
| 3 | Dawn layout vs `fleets.ts` | The lab's 16 nm line and 11 nm British spread are an unrecorded licence | partly | Record the licence (A3); no move of the dawn glyphs: owner's call (doubts) |
| 4 | Table row Colossus; data `colossus-19oct` | Placed against `a-h2c.md` H2-40c without saying so | holds | Row and point with the Mars, 36°32′ N 7°04′ W, as the revised `draft-h3.md` already has it |
| 5 | The turn east | Never says the army turned against Austria and the coalition | holds | New bullet "Why east" (A5) |
| 6 | "At sea", night of 20–21 October | Drops the night dispute and the nightfall position | holds | Appended text and data point (A6), cross-referred to `draft-h3.md` |
| 7 | Nelson off Cádiz / positions | No British track between 9.30 on the 19th and dawn on the 21st | partly | New bullet on the track (A7), without repeating what `draft-h3.md` carries |
| 8 | Key sources | Missing works and links; Beatty edition | partly | Key-source lines and Beatty page fixes (A8) |
| 9 | "The sortie"; `algesiras-19oct-1600` | The latitude does not follow from Philibert's bearings | holds | 36°33.0′ N 6°22.0′ W; data lat 36.550 |
| 10 | Table row Sirius; `sirius-19oct-firstlight` | The bearing is the 4 a.m. entry, not first light | holds | Row text (A10); same fix in `draft-h3.md`'s table |
| 11 | "Outer and inner ships": outermost ships | Departs from H2-36d without saying so | holds | Covered by A1 |
| 12 | "Not here"; "The anchorage" depths | Wrong citation; weak reason first; box depths wrong | holds | A12 |
| 13 | "19 October" | French counts dropped from the text | holds | A13 |
| 14 | "Into the roadstead" | "Lay first in the inner harbour" overstates | holds | A14 (adds Corbett's version too) |
| 15 | "At sea": the afternoon wear | The Sirius's two logs, and James's version, missing | holds | A15 |
| 16 | "Put off, not abandoned" | No. 9209's figures and date | partly | A16: the note's own figures, Desbrière's rounding, James's 30,000–40,000 |
| 17 | "Basin and road" | The 88 craft of July 1804 were the ones left in a blow | holds | A17 ("strong wind", not "gale") |
| 18 | "The ports" | Ambleteuse was enlarged, not dug | partly | A18: two versions, Napoleon's and James's |
| 19 | "The dashed line" | "South-east by Augsburg and Memmingen" is wrong in direction | holds | A19 |
| 20 | "Boulogne", "Napoleon at Boulogne" | Confidence above the ruling and above one source | holds | A20 |
| 21 | "Strength on arrival" | Beatty has "five or six" inshore | holds | A21 (Beatty p. 2, not p. 3) |
| 22 | "To the Rhine" | 24 days is No. 9137's, not Maude's | holds | A22 |
| 23 | "Dawn, 21 October: the British" | 27 in two groups counts the Africa; bearing-up time | holds | A23 |
| 24 | Rosily; data `dates[15]` | Arrival stated as the 23rd; "never reached him" | holds | A24 |
| 25 | Data: `dates[3]`, road line, Defence row, right camp | Four small mismatches | holds | A25 |
| 26 | "Dawn, 21 October: the British" | Desbrière's "north-west" version dropped | holds | A26 |
| 27 | "Blackwood's squadron" | The closest logged station was north of San Sebastián | holds | A27 |
| 28 | "Method", "The bay in 1797" | Faden's orientation, what it draws in the narrows, Tofiño's date, residuals | partly | A28 (two ships are drawn between the forts) |

## Chart changes

1. **Move the narrows ship.** This is the last `french-74-anchored` mark in `LAB_MARKS`.
   - **Move:** from lon −6.2488, lat 36.5178 to lon −6.2535, lat 36.5165.
   - **Unchanged:** heading 294° true, `underWay: false`.
   - **Room:** about 4.1 map km. That is the open water along 040° to Natural Earth's coast, measured as the lab measures it; it is 3.2 now.
   - **The old point is on land.** Today it is the Matagorda shore: EMODnet gives 0.3 m, and it is about 110 m from the Matagorda power-line tower. On Faden's 1797 plan it falls on the land of the Matagorda point, under the name lettering. It is not between the forts: it lies 0.2 nm north of the Matagorda fort, beyond it along the line from Puntal.
   - **The new point is in the channel.** It is in 8 m today, 0.2 nm from the Matagorda fort and 0.6 nm from Puntal, at the outer end of the channel between them, and 0.25 nm off the chart's coast. That is about the most clearance a point in today's channel can have.
   - **Check on screen** at the Gulf key and the rising shot.
2. **Nothing else.**
   - The five outer-bay marks are on the draft's line, in 6.0–9.4 m today and 1.5–1.8 nm off the chart's coast.
   - The British keep 047° as a recorded licence.
   - The dawn layout is a recorded licence; whether to tighten it is the owner's call (doubts).
   - The chain ships and the Algésiras are not drawn in Stage A.

## Doubts for the history notes

These are versions the material does not yet carry, each with who holds it:

1. **Wimereux and Ambleteuse.**
   - Napoleon calls both "deux nouveaux ports" he had built (Corr. IX No. 7832, 2 July 1804).
   - James has Wimereux made into a port, and Ambleteuse's harbour deepened and enlarged (III 217).
2. **The force left at Boulogne after the turn east.**
   - No. 9209 (13 September, a date the editors supply): an army of 60,000–80,000 men on the heights of Boulogne and 500 craft for 40,000–50,000 men (art. 4); 80,000–100,000 men encamped (art. 5).
   - Desbrière (1907, p. 120) rounds this to 500 craft and 80,000 men.
   - James (III 332): 30,000–40,000 men encamped on the heights, with the gun-vessels in the basin and road.
3. **The combined fleet's wear on the afternoon of 20 October.**
   - Between 1 and 3 p.m., many reports saying 3 (Desbrière p. 164).
   - The van already on the starboard tack after 1 p.m. (the Sirius's master's log, NRS II 313).
   - 3.30 (the Sirius's log as Nicolas prints it, VII 134).
   - About 4 (Corbett; Prigny).
   - Still on the larboard tack until it tacked toward the Strait at about 5 (James III 388).
4. **The combined fleet's night of 20–21 October.**
   - It wore and stood north-west after the Aigle's signal at 7.30 p.m. (James III 388).
   - It wore twice (Beatty 1825, p. 10; Nicolas VII 136, after Beatty).
   - The two reports of its going about that reached Nelson were wrong (Desbrière p. 178). The French reports keep it on the starboard tack (`draft-h3.md`, "Which half of the code").
   - The mean course was about south (Corbett p. 338).
5. **The combined fleet at nightfall on the 20th.**
   - Desbrière (p. 164), from the British frigates' logs: at most 8–10 miles south-west of Cádiz.
   - That is about 36°25′ N 6°27′ W if south-west is true, and about 36°23.5′ N 6°23.5′ W if it is by compass.
6. **The British on 20 October.**
   - **Noon.**
     - Nelson's diary: Cádiz NE, 9 leagues. That is 36°07′ N 6°33′ W if by compass, 36°13′ N 6°43′ W if true.
     - James: 8–9 leagues.
     - Corbett: about 20 miles.
     - Desbrière (p. 177): about 25 miles.
     - Clowes (V 130): about 28 miles.
   - **The turn north.** Wore at 4 p.m. (James III 390), or tacked at 4.40 (Desbrière p. 178).
   - **The wear to the south-west.** At 8 (Corbett p. 340 n.) or 8.40 (James III 390).
7. **The British at daylight on the 21st.**
   - West, slightly south of west, of Cape Trafalgar, 20–21 nm off (Collingwood's "E by S about seven leagues", the logs; `research/dawn-setting.md` 1.2).
   - About 21 miles north-west of the cape (Desbrière p. 179).
8. **Where the combined fleet lay in late September and early October.**
   - The inner harbour, the Argonauta between the Puntal and Matagorda forts (Escaño).
   - Its fastest ships brought down to just within the harbour mouth within ten days of arrival (Fraser p. 29).
   - "Crowded up in the harbour" about 29 September (Corbett p. 318).
   - At anchor in the outer harbour, apparently ready for sea, on 1 October (the Euryalus, James III 380).
9. **The ships in the narrows.**
   - Their number in 1805 is not recorded. The Fougueux was there by her own report, and the Thémis mentions "the innermost ships" still at anchor on the 19th.
   - Faden's plan of 1797 draws two Spanish ships between the forts.
   - Natural Earth has no Matagorda shore, so the chart draws no narrows.
10. **Louis's inshore squadron when Nelson arrived.**
    - 6 (the Victory's log; Nelson to Acton).
    - 5 (James III 379; Corbett).
    - "Five or six" (Beatty, p. 2 in the 1807 and 1825 editions).
11. **The lab's dawn licences (the owner's call).**
    - **The combined line.**
      - In the lab: about 16 nm long (36°00′–36°16′ N), its northern glyph 4.8 nm off the chart's coast near Conil.
      - In the sources: nearly 5 miles long (James III 389). Its northern end lay about 7–9 nm off the coast by the British reckoning, and 18–24 nm off by the French (Dumanoir, Scipion).
    - **The British spread.**
      - In the lab: about 11 nm north to south, the southern pair 6–8 nm from the Victory.
      - In the logs: single ships 3–4 nm from her at 4 a.m. (the Mars, the Ajax); nothing on the two groups' separation.
    - **The British heading.**
      - In the lab: 047° true, the course after bearing up at about 6.50.
      - In the Victory's log: N by E by compass, about 350° true, at first light and at sunrise.
12. **The Sirius at first light.**
    - Her first-light position is not logged. The nearest entry is the 4 a.m. bearing, "Cadiz NE by E, 4 miles" (NRS II 312).
    - She telegraphed the enemy's topsail yards at 6.04 by the Euryalus's signal log.
13. **The coalition's dates rest on Maude alone.**
    - Russia approached Austria in October 1803. The courier with Austria's adherence left Vienna on 7 July 1805, and Russia and Austria signed a treaty on 9 August (pp. 76, 90).
    - On 23 August Napoleon still expected Austria's coalition act to be signed "cet hiver" (Corr. XI No. 9117).
    - The treaties and Britain's part were not researched.

---

## Final texts and evidence, issue by issue

### A1. The narrows (issues 1 and 11)

**Apply.** This replaces the bullet "Outer and inner ships":

> - **Outer and inner ships.** The outermost ships, the seven that got out on the 19th, lie at the WNW end toward the passes, about 36°33.7′ N 6°17.2′ W, in 9 m today. That is 0.25 nm north-east of the point `research/scene-02/a-h2c.md` (H2-36d) gives them, 36°33.5′ N 6°17.4′ W. That point lies on the line of the modern El Diamante buoys, in the fairway the same ruling keeps the anchored fleet out of, so it serves here as the harbour mouth instead. A few ships (the Fougueux among them; the number is not recorded) lie at the outer end of the Puntal–Matagorda narrows, about 36°31.0′ N 6°15.2′ W. This is 8 m today, 0.2 nm from the Matagorda fort and 0.6 nm from the Puntal, in the channel where Faden's plan of 1797 draws two Spanish ships between the forts. The ruling's midpoint between the forts (36°30.7′ N 6°15.4′ W) falls on Natural Earth's coastline. Natural Earth has no Matagorda point at all: the chart shows open water east of the isthmus and no narrows, and the glyph stands 0.25 nm off the chart's Puntal shore. Low.

**Data.** Changes to drafts-data [1]:
- `cadiz-anchorage-inner`: lon −6.2535, lat 36.5165, note: "Escaño: the Argonauta 'between the castles of Puntal and Matagorda' (annex p. 8). The outer end of the narrows, 8 m today (EMODnet), 0.2 nm from the Matagorda fort and 0.6 nm from Puntal; Faden's 1797 plan draws two Spanish ships between the forts. a-h2c's midpoint (36.512 N 6.256 W) falls on Natural Earth's coastline. Natural Earth has no Matagorda shore, so the chart draws no narrows; 0.25 nm off the chart's coast, room along 040° about 4.1 map km."
- `cadiz-anchorage-outer`: add to the note "0.25 nm NE of a-h2c's point (36.558 N 6.29 W), which lies on the El Diamante buoy line".

**Evidence.**
- **The lab's point (36.5178 N 6.2488 W) is on land.**
  - On the chart it is sea, 0.48 nm off the coast.
  - Today it is the shoreline: EMODnet gives a depth of 0.3 m (https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(-6.2488%2036.5178)). It is about 110 m from the base of the Matagorda power-line tower (OSM, 36.5188 N 6.2491 W).
  - It is 0.20 nm from the Matagorda fort (OSM node, 36.5144 N 6.2498 W), at bearing 014°. Measured along the Puntal–Matagorda line (0.66 nm, 058° true), it lies 0.81 nm from Puntal, beyond the Matagorda fort, so it is not "between" the castles.
  - On Faden's plan (full-resolution crop: https://collections.library.yale.edu/iiif/2/15504962/2550,1350,1000,800/full/0/default.jpg) the Matagorda castle stands at the south-east tip of the Matagorda point. The point's sandy shore runs north-north-west and north from it. A point 0.2 nm NNE of the castle falls on the land of the point, under the name "Matagorda". The georeference is rough (±0.1–0.2 nm), but the point is well inside the land.
- **What the plan draws in the narrows.** It draws a row of ships crossing the narrows at mid-gap: one just outside the line between the forts and one just inside it. The rest stand beyond, in the inner bay toward Fort Louis and La Cantera.
- **The candidate points.** My script and EMODnet give:

| Point | Chart | Off the chart's coast | Room 040° | Depth today | From Matagorda fort |
| --- | --- | --- | --- | --- | --- |
| Lab (36.5178, −6.2488) | sea | 0.48 nm | 3.17 map km | 0.3 m (shore) | 0.20 nm @014° |
| Draft (36.5150, −6.2550) | sea | 0.14 nm | 4.38 | 7 m | 0.25 nm @277° |
| Check (36.5165, −6.2535) | sea | 0.25 nm | 4.13 | 7.8 m | 0.22 nm @304° |
| a-h2c midpoint (36.512, −6.256) | coastline | 0.01 nm | — | 6 m | 0.33 nm @243° |

- **Choosing the point.** Today's channel at 36.515–36.517 N runs from about 6.270 to 6.2525 W; the Matagorda shipyard shore lies about 0.07 nm east of the check's point. Natural Earth's isthmus coast lies 0.3–0.4 nm east of the real one here, and on the chart there is no land on the Matagorda side until about 1.1 nm east of the fort. Of the points in today's channel, the check's has the most clearance from the chart's coast. It also sits at the outer end of the channel between the forts, as Escaño's "entre los castillejos de Puntal y Matagorda" (Desbrière 1907, annex p. 8: https://archive.org/details/la-campagne-maritime-de-1805/page/n277/mode/1up) and the Fougueux's "entre les forts du Pontal et du Port-Réal" (annex pp. 213, 216: https://archive.org/details/la-campagne-maritime-de-1805/page/n492/mode/1up) require.
- **The outermost ships.** `a-h2c.md` H2-36d rejected the checker's layout because it lay "on the line of the modern El Diamante buoys". Its own outer point, 36.558 N 6.29 W, lies 110–150 m north of that line (buoys No. 4 at 36.5578 N 6.2984 W and No. 6 at 36.5562 N 6.2819 W; OSM). The draft's 36.5617 N 6.2867 W is in 9.4 m (EMODnet), off El Diamante's shallow core. The move follows the ruling's own reasoning, but the notes must say so.
- **The owner's complaint.** The check links issue 1 to the owner's complaint. That complaint was about glyphs over the chart's shore of El Puerto, fixed in `238788e` by the room cap. On the chart, the lab's narrows ship stood in water 0.48 nm off the drawn coast. It is wrong historically, not on screen, and the move brings it nearer the drawn coast. Hence the on-screen check above.

### A2. The British heading in the lab (issue 2)

- **Since `aa7a358`** (31 October, 22:43) `fleets.ts` draws all six British marks on 047°. The commit message reads "ENE by compass, about 047 degrees true, not 068".
- **The Victory's master's log** has these courses (NRS II 183; `research/dawn-setting.md` F-27):
  - N by E at 05:00 and 06:00 (about 350° true);
  - ENE at 07:00 (047°);
  - E by N from 08:00 (058°).
- So 068° matches no logged course. `draft-lead.md` already says "The lab draws them on 047°".

**Apply** the check's three texts:
- **The bullet.** "Where this differs from scene 1": "(the lab draws them on 047° true, the course after bearing up, some 20–30 minutes after scene 1's sunrise)".
- **The data note.** It ends "…then E by N (058° true) from 8 a.m. The lab draws 047°, the course after bearing up."
- **Owner question 1.** "The British heading at the handoff to scene 3. At first light and at sunrise (06:27) they still steered N by E by compass, about 350° true, as scene 1's notes have Victory at sunrise. They bore up to ENE (about 047° true) after the signal at 6.50, and steered E by N (058°) from 8. The lab draws them on 047°, which suits scene 1's picture of Victory sailing east. Keep that as a licence, or show 350° at first light and turn them as the fleets close?"

### A3. The lab's dawn layout (issue 3)

**Ruling: partly.**
- **The sources back the draft:**
  - a line "of nearly five miles" at daybreak (James III 389: https://archive.org/details/navalhistoryofgr03jameuoft/page/n406/mode/1up);
  - its centre about 36°09′ N 6°14′ W, 9.2 nm off the chart's coast;
  - its northern end about 7.6 nm off;
  - single British ships 3–4 nm from the Victory at 4 a.m.
- **The lab's stretch is deliberate.** `fleets.ts` says it opens the spacing "a few times over the true cables, as the glyphs are, so the ships read one by one". The group-gives-way rule of session 9 depends on it (`docs/decisions.md`: "At the Gulf key the spacing is about 0.6 of a glyph").
- **What the lab draws.** Its northern combined glyph (36.27 N 6.25 W) is 4.8 nm off the coast, and the next one 6.4 nm. The British run 11 nm north to south, the southern pair 5.9 and 7.9 nm from the Victory.
- **What changes.** Nothing in the history moves. What the notes lack is the licence. Tightening the layout would make the Gulf key show one ship per fleet; that is a design choice for the owner, recorded as a doubt (No. 11).

**Apply.** Append to "Where this differs from scene 1", and list it among the section's licences:

> The lab opens the spacing within each fleet a few times over the true distances, as it draws the glyphs larger than true scale, so that the ships read one by one from the Gulf. Its combined line runs about 16 nm, 36°00′–36°16′ N, its northern glyph 4.8 nm off the chart's coast near Conil. Its British are spread over about 11 nm north to south, the southern pair 6–8 nm from the Victory. That is a licence. The sources give a line nearly five miles long (James III 389), its northern end about 7–9 nm off the coast by the British reckoning and 18–24 nm by the French. The logs put single British ships 3–4 nm from the Victory at 4 a.m. and say nothing of how far apart the two groups were.

### A4. Colossus (issue 4)

- **What the sources say.**
  - `a-h2c.md` H2-40c places "Mars and Colossus at about 7.06–7.09 W".
  - The diary of 14 October has them together, five leagues east of the fleet (Beatty 1825, p. 97: https://archive.org/details/authenticnarrati00beat/page/n109/mode/1up).
  - Corbett (p. 334 n. 2) has the Defence and Agamemnon nearest Cádiz, with the Mars and Colossus as connecting ships.
  - The memorandum of 20 October (Nicolas VII 136: https://archive.org/details/dispatchesletter07nelsuoft/page/n171/mode/1up) is the night chain.
- **The other draft.** The revised `draft-h3.md` already has the row the check asks for. The two drafts' tables of 19 October should merge into one.

**Apply.**
- **Table row.** `| Colossus | about 36°32′ N 7°04′ W, with the Mars | morning, 19 Oct | 5 leagues east of the fleet with the Mars (diary, 14 Oct; research/scene-02/a-h2c.md, H2-40c); the memorandum of 20 Oct puts her between the Defence and the Mars only for the night of 20–21 Oct | Low |`
- **Data.** `colossus-19oct`: lon −7.067, lat 36.533 (sea, 32.5 nm off the coast).

### A5. Why east (issue 5)

**Evidence.**
- **The brief's history** says the army marched east "against Austria (the Third Coalition)".
- **Maude p. 76** (https://archive.org/details/ulmcampaign180500mauduoft/page/n107/mode/1up): Russia approached Austria about a fresh coalition in October 1803.
- **Maude p. 90** (https://archive.org/details/ulmcampaign180500mauduoft/page/n121/mode/1up):
  - the courier with Austria's definite adherence left Vienna on 7 July 1805;
  - a Russo-Austrian treaty was signed on 9 August.
- **Maude p. 98** (https://archive.org/details/ulmcampaign180500mauduoft/page/n129/mode/1up): Mack sent two columns to cross the Inn on the 8th of September, for Parsdorf and Freising.
- **Corr. XI No. 9117** (23 August, p. 117: https://archive.org/details/correspondancede11napouoft/page/n126/mode/1up):
  - Austria would play for time until her coalition was signed;
  - by April he would face 100,000 Russians in Poland paid by England;
  - so he would raise his camps, be in Germany with 200,000 men by 1 vendémiaire, and march on Vienna.
- **No. 9130** (25 August, p. 133: https://archive.org/details/correspondancede11napouoft/page/n142/mode/1up): Austria's preparations had suspended his embarkation.

**Apply.** A new bullet after "The decision, 22–26 August":

> - **Why east.** Austria had joined Russia in a new coalition. Russia first approached her in October 1803; the courier with Austria's definite adherence left Vienna on 7 July 1805, and the two signed a treaty on 9 August (Maude 1912, pp. 76, 90). On 23 August Napoleon told Talleyrand that Austria was playing for time, and that by spring he would face Russians in Poland paid by England. So he would raise his camps, be in Germany with 200,000 men by 1 vendémiaire (23 September) and march on Vienna (Corr. XI No. 9117). On the 25th he wrote that Austria's preparations had suspended his embarkation (No. 9130). Mack's columns were to cross the Inn into Bavaria on 8 September (Maude 1912, p. 98). The brief's "against Austria (the Third Coalition)" stands. High for Napoleon's letters; medium for the coalition's dates, which rest on Maude alone (the treaties, and Britain's part, were not researched).

### A6. The combined fleet's night (issue 6)

**Evidence.**
- **James III 388** (https://archive.org/details/navalhistoryofgr03jameuoft/page/n405/mode/1up):
  - still on the larboard tack, the fleet tacked toward the mouth of the Strait at about 5 p.m.;
  - at 7.30 the Aigle signalled 18 British ships in line to the south;
  - shortly afterwards it wore and stood north-west.
- **Beatty 1825, p. 10** (https://archive.org/details/authenticnarrati00beat/page/n20/mode/1up) and **Nicolas VII 136**: "The Enemy wore twice during the night."
- **Desbrière p. 178** (https://archive.org/details/la-campagne-maritime-de-1805/page/n205/mode/1up): Nelson twice received an inaccurate report that the allies were going about.
- **Desbrière p. 164** (https://archive.org/details/la-campagne-maritime-de-1805/page/n189/mode/1up): at nightfall the fleet was still "8 ou 10 milles au plus" south-west of Cádiz, by the British scouts' logs.
- **Corbett p. 338:** the mean course was about south (`v-h2c.md` H2-31i, confirmed).
- **Overlap with `draft-h3.md`.** Its "Which half of the code" already sets James against the French reports. The text below completes the dispute without contradicting it.

**Apply.** Append to "At sea":

> Whether they wore in the night is disputed. James (III 388) has them tack toward the Strait at about 5 p.m. Then, after the Aigle signalled 18 British ships in line to the south at 7.30, he has them wear and stand north-west. Beatty (1825, p. 10) and Nicolas (VII 136) say they wore twice in the night. Desbrière (p. 178) says the two reports of their going about that reached Nelson were wrong, and the French reports keep them on the starboard tack (see "Which half of the code"). Corbett (p. 338) makes the mean course about south. At nightfall they were at most 8–10 miles south-west of Cádiz by the British frigates' logs (Desbrière p. 164): about 36°25′ N 6°27′ W, or 36°23.5′ N 6°23.5′ W if the bearing is by compass. High for the order; low for the night's track.

**Data.** A new point:
- id `combined-fleet-20oct-nightfall`; lon −6.448, lat 36.422; confidence low; when "nightfall, 20 October 1805".
- note: "at most 8–10 miles SW of Cádiz (Desbrière p. 164); 36.391 N 6.392 W if SW is by compass; 9.4 nm off the chart's coast".

### A7. The British, 19–21 October (issue 7)

**Ruling: partly.**
- **What `draft-h3.md` already has:**
  - the evening of the 19th, with six fast ships ahead with lights;
  - the 5 p.m. telegraph and the Naiad's 31 sail;
  - the 8 p.m. and 4 a.m. wears, with their lights.
- **What no draft has:**
  - the fleet's track on the 20th: daybreak near the Strait, the turn north-west, the noon position, the 2 p.m. shift, the 4 p.m. turn north;
  - the Africa's missing the evening wear.
- **The check's text has one timing slip.** James (III 390: https://archive.org/details/navalhistoryofgr03jameuoft/page/n407/mode/1up) has the fleet wear at daybreak and the Phoebe's signal at 7, not a wear at 7.

**Apply.** A new bullet in "Nelson off Cádiz":

> - **The British track, 19–21 October.** After the general chase at 9.30 the fleet ran south-east for the Strait (the night's signals and lights are under "The signal chain, 19 to 21 October"). It hove to at 1 a.m. on the 20th (Corbett 1910, p. 335). At daybreak it lay "between Trafalgar and Cape Spartel", in sight of Gibraltar, with no enemy in sight, in rain and a fresh SSW wind (diary, Nicolas VII 137; Corbett 1910, pp. 335–336): about 36°00′ N 5°58′ W. It wore and stood north-west, and at 7 the Phoebe signalled the enemy to the north (James III 390). At noon Cádiz bore NE, 9 leagues (diary, Nicolas VII 137). That puts the fleet about 36°07′ N 6°33′ W if the bearing is by compass, 36°13′ N 6°43′ W if true. James has 8–9 leagues, Corbett about 20 miles, Desbrière about 25 (p. 177), Clowes about 28 (V 130). At 2 p.m. a shift of wind to WNW took the fleet aback. At 4 it wore and stood north on the larboard tack (James III 390; Desbrière has it tack at 4.40, p. 178). At 8 (8.40 by James) it wore to the south-west, and the Africa, missing the signal, held on north (Corbett 1910, p. 340 n.). At 4 a.m. on the 21st it wore again: N by E by the Victory's log, "to the N.E." by Nelson's diary (Corbett 1910, p. 340; James III 390). Desbrière's midnight estimate, about 20 miles south-west of Cádiz with the allies 5–6 miles off (p. 178), cannot be joined to the dawn position to better than 5–15 nm (`research/scene-02/a-h2c.md`, H2-32i). High for the sequence; low for the positions.

**Data.** Two new points:
- `british-20oct-dawn`: lon −5.97, lat 36.00; low-medium; note "'between Trafalgar and Cape Spartel' (diary); 9.6 nm off the chart's coast".
- `british-20oct-noon`: lon −6.543, lat 36.117; medium-low; note "'Cadiz N.E. 9 leagues' by compass; 36.210 N 6.711 W if true".

**Sources:**
- Nicolas VII 137: https://archive.org/details/dispatchesletter07nelsuoft/page/n172/mode/1up
- Desbrière pp. 177–178: https://archive.org/details/la-campagne-maritime-de-1805/page/n204/mode/1up
- `v-h2c.md` H2-32a–j (all confirmed).

### A8. Key sources (issue 8)

**Ruling: partly.**
- **URLs belong in Key sources.** Scene 1's notes keep URLs in the research files and the Key sources list, not inline, so the draft's text needs none.
- **What is missing from the lead's list** (`draft-lead.md`, which the merge uses):
  - Clowes V, cited three times, is absent there and from the data;
  - Schuermans, Codrington and the Fondation Napoléon page are absent;
  - the links for *Projets* IV, *Correspondance* IX, and Alombert and Colin II and III/1 are absent.
- **Beatty's two editions page differently in places:**
  - the arrival count and "five or six" inshore: p. 2 in both editions (in 1807 the sentence ends on p. 3);
  - the cordon of 19 October: p. 6 in both, not p. 7;
  - the night's "wore twice": p. 10 in 1825;
  - the diary: p. 97.

**Apply.** Add these lines to Key sources, or fold them into the existing entries:
- W. L. Clowes, *The Royal Navy: A History*, vol. V (1900), pp. 62, 121, 128–130: https://archive.org/details/royalnavyhistory0005clow
- A. Schuermans, *Itinéraire général de Napoléon Ier* (1908), p. 180: https://archive.org/details/itinrairegnrald00unkngoog/page/n200/mode/1up
- *Memoir of the Life of Admiral Sir Edward Codrington*, vol. I (1873), pp. 51, 57: https://archive.org/details/cu31924087998500/page/n73/mode/1up
- É. Desbrière, *Projets et tentatives*, vol. IV (1902), pp. 433, 459–461: https://archive.org/details/projetsettentat02histgoog/page/n92/mode/1up
- *Correspondance de Napoléon Ier*, vol. IX (1862), Nos. 7832 and 7874 (pp. 405–406, 433–434): https://archive.org/details/correspondancede09napouoft/page/n415/mode/1up
- P.-C. Alombert and J. Colin, vol. II (the Rhine): https://archive.org/details/la-campagne-de-1805-en-allemagne-vol.-2/page/n54/mode/1up ; vol. III/1 (Ulm): https://archive.org/details/la-campagne-de-1805-en-allemagne-vol.-3-p.-1/page/n239/mode/1up
- F. N. Maude, *The Ulm Campaign 1805* (1912), pp. 76, 90, 98, 123, 199–200, 250: https://archive.org/details/ulmcampaign180500mauduoft/page/n121/mode/1up
- W. Beatty, *Authentic Narrative*, 1st ed. (1807): https://archive.org/details/b22036611_0001 ; 3rd ed. (1825): https://archive.org/details/authenticnarrati00beat. Name the edition with each page: the arrival on p. 2 in both, the cordon on p. 6 in both, "wore twice" on p. 10 (1825), the diary on p. 97.
- Fondation Napoléon, newsletter 410 (2005): https://www.napoleon.org/wp-content/archives/newsletters/410.html

**Also in the draft's text:**
- "(Beatty 1825, p. 7; Codrington 1873, I 57)" becomes "(Beatty, p. 6; Codrington 1873, I 57)";
- "Beatty (p. 3)" becomes "Beatty (p. 2)" (see A21).

**Evidence:**
- Beatty 1807, pp. 1–4 are leaves n10–n13; p. 2 is https://archive.org/details/b22036611_0001/page/n11/mode/1up
- Beatty 1825, p. 2 is https://archive.org/details/authenticnarrati00beat/page/n12/mode/1up ; p. 6 is /page/n16/mode/1up

### A9. The Algésiras at 4 p.m. (issue 9)

- **The bearings.** Philibert's journal (Desbrière 1907, annex p. 230: https://archive.org/details/la-campagne-maritime-de-1805/page/n509/mode/1up): the Tour de Cadix SE½E, the Rota tower NNE½E, by compass.
- **The fix.** The Tour de Cadix is the Torre Tavira, the vigías' tower that Prigny also names (annex p. 138); it stands at 36.53196 N 6.29840 W. For Rota I tried the Castillo de Luna, the Torre de la Merced and the modern light. With variation 20–22° W, the fix falls at 36.549–36.552 N, 6.366–6.370 W.
- **A slip in `a-h2c`.** Its 36.564 N would need the Tavira tower to bear about 141° by compass (SE by S−), not SE½E (129°). It is a computing slip, not a reading of the source; the bearings themselves are as `a-h2c` quotes them.

**Apply.**
- **Text.** "At 4 p.m. on 19 October the Algésiras lay about 36°33.0′ N 6°22.0′ W, about 3¾ nm W by S of the passes (Philibert's cross-bearings, Tour de Cadix SE½E and Rota NNE½E by compass, Desbrière 1907, annex p. 230; the 36.564 N in `research/scene-02/a-h2c.md`, H2-38b, does not follow from them)."
- **Data.** `algesiras-19oct-1600` lat 36.550 (lon −6.367), "19 m today".

### A10. The Sirius (issue 10)

- **The log entry.** The Sirius's master's log for 19 October a.m. (NRS II 312: https://archive.org/details/logsofgreatseaf02jack/page/n330/mode/1up) reads, in order:
  - tacked at 2;
  - lost sight of the squadron at 3;
  - tacked at 3.45;
  - "At 4, Cadiz NE by E, 4 miles";
  - then the topsail yards seen and telegraphed (6.04 by the Euryalus's signal log).
- **Two readings.** Worked from San Sebastián the bearing gives 36°28.4′ N 6°21.8′ W; from the Tavira tower, 36°28.7′ N 6°20.8′ W.

**Apply.**
- **Table row.** `| Sirius | 36°28.4′ N 6°21.8′ W | 4 a.m., 19 Oct (her last bearing before first light) | Cádiz NE by E, 4 miles, worked from San Sebastián light (NRS II 312); 36°28.7′ N 6°20.8′ W if "Cadiz" is the Tavira tower | Medium |`
- **Data.** `sirius-19oct-firstlight` when "4 a.m., 19 October 1805".
- **The other draft.** `draft-h3.md`'s "first light" row needs the same fix in the merge.

### A12. "Not here" and the box depths (issue 12)

- **Where the 4 m comes from.** The 4 m and "too shallow" are `a-h2c.md` H2-36d's. `v-h2c.md` H2-36d gives the reef (0.17 nm) and the city wall (0.73 nm).
- **The box today.** The checker's EMODnet grid over the draft's box (36.5567–36.5683 N, 6.2583–6.2867 W; 55 cells) gives 5.6–12.0 m. None of it is 4 m.

**Apply.**
- **"Not here."** "- **Not here.** The first suggested centre, 36°33′ N 6°18′ W, lies 0.17 nm from the Las Puercas reef and 0.7 nm from the city wall, within range of its guns, against Escaño's statement that the fleet lay out of range (`research/scene-02/v-h2c.md`, H2-36d). It is also in about 4 m today, too shallow for a ship of the line (`research/scene-02/a-h2c.md`, H2-36d). High."
- **"The anchorage."** "5¾–7 on the plan, about 6–12 m today".
- **"The bay in 1797."** "the outer bay is a few metres shallower today (about 6–12 m in the glyphs' box)".
- **Data note.** In `cadiz-anchorage-main`, write "about 6–12 m today".

### A13. The count of 19 October (issue 13)

**Apply.** After the seven names: "Other French counts: 'six à sept' (the Rhin), '7 ou 8' (the Fougueux), eight French (the Observateur), a division of four at 4.30 p.m. (the Thémis) and nine (Prigny, writing from memory) (`research/scene-02/a-h2c.md`, H2-30c)."

**Evidence:** `a-h2c.md` H2-30c, with the annex links there.

### A14. Into the roadstead (issue 14)

**Evidence.**
- **Fraser:**
  - p. 29: https://archive.org/details/enemyattrafalgar00frasuoft/page/n54/mode/1up
  - p. 53: https://archive.org/details/enemyattrafalgar00frasuoft/page/n80/mode/1up
- **James III 380** (https://archive.org/details/navalhistoryofgr03jameuoft/page/n395/mode/1up): on 1 October the Euryalus "plainly discovered, at anchor in the outer harbour" 18 French and 16 Spanish of the line, apparently ready for sea.
- **Corbett p. 318:** "not in the bay, but crowded up in the harbour" (`v-h2c.md` H2-36b, confirmed).

**Apply.** "…and lay at first in the inner harbour, the Argonauta between the Puntal and Matagorda forts (Desbrière 1907, annexes 8). Within ten days Villeneuve brought his fastest ships down to just within the harbour mouth (Fraser 1906, p. 29). Corbett has the fleet still crowded up in the harbour about 29 September (p. 318), and on 1 October the Euryalus saw it at anchor in the outer harbour, apparently ready for sea (James III 380). From 9–10 October it moved down to the roadstead…"

### A15. The afternoon wear (issue 15)

**Evidence.**
- **NRS II 313** (https://archive.org/details/logsofgreatseaf02jack/page/n331/mode/1up), the Sirius's master's log for 20 October p.m.:
  - "At 1, it cleared up";
  - the enemy's fleet NE by N;
  - the van of the enemy's fleet on the starboard tack;
  - "At 3.30, wore", which is the frigate herself.
- **Nicolas VII 134** (https://archive.org/details/dispatchesletter07nelsuoft/page/n169/mode/1up), the Sirius's log as Nicolas prints it: at 3.30 she saw the enemy's fleet wear and come to on the starboard tack, then wore herself.
- **James III 388:** the tack at about 5 p.m.

**Apply.** "…wore onto the starboard tack in mid-afternoon:
- between 1 and 3 (Desbrière p. 164, adding that many reports say 3; the Sirius's master's log already has the van on the starboard tack after 1, NRS II 313);
- at 3.30 (the Sirius's log as Nicolas prints it, VII 134);
- or about 4 (Corbett; Prigny).

James (III 388) keeps them on the larboard tack until they tacked toward the Strait at about 5. They formed in three columns (Prigny, Fougueux, Desbrière) or five (James; the Spanish official report, per Nicolas)."

### A16. Put off, not abandoned (issue 16)

**Ruling: partly.**
- **The note's own figures.** No. 9209 (Corr. XI pp. 192–193: https://archive.org/details/correspondancede11napouoft/page/n201/mode/1up) carries the footnote "Date présumée". Its art. 4 has an army of 60,000 to 80,000 men on the heights of Boulogne and 500 craft able to carry 40,000–50,000 men; art. 5 gives the pretext of 80,000 or 100,000 men encamped there. So 500 is the note's own figure; 80,000 is the top of its range.
- **Desbrière p. 120** (https://archive.org/details/la-campagne-maritime-de-1805/page/n145/mode/1up) summarises it as 500 craft and 80,000 men.
- **James III 332** (https://archive.org/details/navalhistoryofgr03jameuoft/page/n347/mode/1up): a body of 30,000 or 40,000 men to stay encamped on the heights, with the gun-vessels in the basin and road.

**Apply.** "…on 13 September (a date the editors supply) he set out a plan to keep an army of 60,000–80,000 men on the heights of Boulogne and 500 craft able to carry 40,000–50,000 of them, as a standing threat (No. 9209; Desbrière 1907, p. 120, rounds it to 500 craft and 80,000 men). James (III 332) has 30,000–40,000 men kept encamped on the heights, with the gun-vessels in the basin and road. High."

### A17. Basin and road (issue 17)

- **James III 227** (https://archive.org/details/navalhistoryofgr03jameuoft/page/n242/mode/1up): on 19 July 1804 a strong north-north-easterly wind raised a heavy sea in the road. About 8 p.m. the leewardmost brigs got under way and some luggers ran for Étaples, "leaving in the road at anchor 45 brigs and 43 luggers". James says strong wind, not gale.
- **James III 232** (https://archive.org/details/navalhistoryofgr03jameuoft/page/n247/mode/1up): about 150 vessels moored in a double line outside the pier, before the attack of 1–2 October 1804.

**Apply.** "On the evening of 19 July 1804, with a strong wind from the north-north-east, 45 brigs and 43 luggers were left at anchor in the road after others had got under way (III 227). At the start of October 1804 about 150 craft lay moored in a double line outside the pier (III 232)."

### A18. Wimereux and Ambleteuse (issue 18)

**Ruling: partly.**
- **James III 217** (https://archive.org/details/navalhistoryofgr03jameuoft/page/n232/mode/1up) has Wimereux formed into a port expressly for the flotilla, and Ambleteuse's harbour deepened and enlarged.
- **No. 7832** (2 July 1804, Corr. IX p. 406: https://archive.org/details/correspondancede09napouoft/page/n415/mode/1up) calls both "deux nouveaux ports que j'ai fait construire". The check kept this letter as support for James's version, which the letter contradicts. The notes need both versions.

**Apply.** "Wimereux and Ambleteuse were made flotilla ports in 1803–04. Napoleon called both new ports he had built (Corr. IX No. 7832, 2 July 1804); James has Wimereux formed into a port and Ambleteuse's existing harbour deepened and enlarged (III 217)."

### A19. Soult after Donauwörth (issue 19)

- **The route.** `a-h2a.md` R6, from Maude pp. 205, 231, 240, 250, gives Augsburg, Landsberg, Memmingen and the Biberach road.
- **The geography.** Augsburg lies SSE of Donauwörth and Landsberg south of Augsburg; Memmingen lies west of Landsberg and Biberach further west. So "south-east" (R6's own loose word) misdescribes the route: it ran south, then west.

**Apply.** "…from Donauwörth Soult went south by Augsburg and Landsberg, then west to Memmingen and the Biberach road, while Ney's VI corps took Elchingen and Ulm (`research/scene-02/a-h2a.md`, R6)."

### A20. Confidence levels (issue 20)

- **R15 rules medium.** `a-h2a.md` R15 rates the camp sites medium.
- **The embarkations rest on one source.** The two embarkations are James III 326 alone (https://archive.org/details/navalhistoryofgr03jameuoft/page/n341/mode/1up: the operation executed twice in his presence, all on board an hour and a half after the générale). The notes cite nothing else (H2-07; `v-h2a.md` H2-07).

**Apply.**
- **"Boulogne"** ends: "Medium (`research/scene-02/a-h2a.md`, R15): the right and left camps (No. 9137), the Tour d'Ordre hut and Pont-de-Briques are in period documents; Outreau for the left camp, and Terlincthun for the right camp's extent, rest on an uncited Wikipedia page."
- **"Napoleon at Boulogne"** ends: "High for the date; medium for the two embarkations, which rest on James alone (III 326)."

### A21. Beatty's inshore squadron (issue 21)

- **The sources:**
  - James III 379 (https://archive.org/details/navalhistoryofgr03jameuoft/page/n394/mode/1up): 27, 22 cruising about 15 miles off Cádiz and 5 under Louis close off the harbour;
  - Beatty: 27, with Louis's "five or six" ships close in shore, on p. 2 in both editions (1807 p. 2 runs into p. 3);
  - `a-h2b.md` H2-16 rules the same.

**Apply.** "James (III 379) gives 27, 22 cruising about 15 miles off Cádiz and 5 inshore; Beatty (p. 2) gives 27, with five or six inshore."

### A22. To the Rhine (issue 22)

- **Maude p. 123** (https://archive.org/details/ulmcampaign180500mauduoft/page/n154/mode/1up): 400 miles from the coast to the Rhine, 300 from the Rhine to the Inn.
- **No. 9137** (Corr. XI pp. 141–144: https://archive.org/details/correspondancede11napouoft/page/n151/mode/1up): 24 days' march by three roads.

**Apply.** "About 400 miles from the coast to the Rhine (Maude 1912, p. 123), in 24 days' march by three roads (No. 9137)."

### A23. The British at dawn (issue 23)

- **The signal times.** `research/dawn-setting.md` 4.3: No. 72 and No. 13 at 6.40, No. 76 at 6.50 by the Victory's clock (James III 390). Scene 1's notes date the bearing up "about 06:40–07:00".
- **The count.** The data already says 26 in loose order, with the Africa detached.

**Apply.** "26 of the line 'sans ordre' in two groups strung north to south (Scipion), the Africa apart to the north; some ships 3–4 nm from the Victory at 4 a.m. (Mars, Ajax); heading N by E by compass, about 350° true, until they bore up after the Victory's signal No. 76 at 6.50 by her clock (about 06:40–07:00 in scene 1's notes), to ENE (about 047° true), then E by N (058° true) from 8 a.m. (Victory's log)."

### A24. Rosily (issue 24)

- **Desbrière p. 142** (https://archive.org/details/la-campagne-maritime-de-1805/page/n167/mode/1up): neither Decrès nor Beurnonville had told Villeneuve of his replacement when he wrote on 18 October.
- **`v-h2c.md` H2-26h:** the arrival date stays 23–25 October; the first letter from Cádiz is of 3 brumaire, 25 October (annex p. 118).

**Apply.**
- **Data.** `dates[15]`: display "23–25 October 1805"; event "Rosily reaches Cádiz (expected on the 23rd; his first letter from Cádiz is of the 25th)".
- **Text.** "Decrès's letter of 20 September superseding Villeneuve had not reached him by 18 October: neither Decrès nor Beurnonville had told him (Desbrière p. 142)."

### A25. Data mismatches (issue 25)

**(a) The date of departure.** `a-h2a.md` R4 sets "Date line: 28 August 1805", and R6 a label beside the march line.
- Apply: `dates[3]` where "date line (and beside the march line)".

**(b) The road line.** Natural Earth (my script) puts its endpoints at these distances off the coast:

| Endpoint | Off the coast |
| --- | --- |
| 50.725 N 1.555 E | 0.61 nm |
| 50.745 N 1.565 E | 0.64 nm |
| 50.725 N 1.565 E | 0.25 nm |
| 50.745 N 1.555 E | 1.00 nm |

- Apply: spread "a line parallel to the shore from 50.725 N 1.555 E to 50.745 N 1.565 E, 0.6 nm inside the chart's water".

**(c) The Agamemnon.** `a-h2b.md` H2-37f: she was boarding a brig that morning.
- Apply: the table row reads "Defence (the Agamemnon stationed with her; her place that morning not logged)", and the data's `defence-19oct-0800` "what" is changed to match.

**(d) The right camp.** `a-h2a.md` R15.
- Apply: `boulogne-right-camp` spread "About 50.73–50.745 N toward Terlincthun (the extent toward Terlincthun rests on an uncited Wikipedia page)".

### A26. Desbrière's north-west (issue 26)

- **Desbrière p. 179** (https://archive.org/details/la-campagne-maritime-de-1805/page/n206/mode/1up): at daylight the British were about 21 miles NW of Cape Trafalgar.
- **The bearings disagree.** Collingwood's "E by S about seven leagues" and the logs put them west, slightly south of west (`research/dawn-setting.md` 1.2).

**Apply.** Append: "Desbrière (p. 179) has them about 21 miles north-west of the cape; the logged bearings put them west, slightly south of west (`research/dawn-setting.md`, section 1.2)."

### A27. Blackwood's stations (issue 27)

- **James III 380** (https://archive.org/details/navalhistoryofgr03jameuoft/page/n395/mode/1up): when the Euryalus tacked to stand out, Rota point bore N½W and San Sebastián S½W, 2¼ miles. Worked by compass, that is 36°33.9′ N 6°19.7′ W, north-west of Las Puercas in the mouth of the bay. The two bearings agree on it.

**Apply.** "By day they kept close off the harbour, usually 2–8 nm west or south-west of San Sebastián. On 8 October the Euryalus stood in until San Sebastián bore S½W, 2¼ miles, in the mouth of the bay (James III 380)."

### A28. Faden's plan (issue 28)

**Ruling: partly.** What I saw on the plan (catalogue: https://collections.library.yale.edu/catalog/15502198; narrows crop as in A1):
- **Orientation.** The north arrow of the compass rose points to the left of the sheet, about 30° above the horizontal, so the top of the sheet faces about ENE.
- **The outer-bay line.** The line of seven Spanish ships runs about north–south true.
- **The narrows.** The fleet's second group runs as a row through the gap between "Cast. de Matagorda" and "Cast.º de Puntales". One ship is just outside the line joining the forts and one just inside it; the rest lie in the inner bay toward Fort Louis and the Pta. de la Cantera.
- **The title.** It names "the Spanish Chart of D. Vicente Tofiño" without a date.

**Apply** to "Method" and "The bay in 1797":
- **The line and the narrows.** "It draws a line of seven Spanish ships of 1797 in the outer bay, running about north–south (true) along about 6°15.8′ W from 36°33.5′ N to 36°31.8′ N toward the narrows. Two more stand in the narrows between the Puntal and Matagorda forts, and the rest of that fleet beyond them in the inner bay toward Fort Louis and La Cantera. Its north points to the left of the sheet, about 30° above the horizontal."
- **Tofiño.** "from the Spanish chart of Vicente Tofiño (the sheet gives no date; his Atlas Marítimo de España appeared in 1789)".
- **The residuals.** Say which residual is the bay's and which is the rms over all eight points, for example "with a residual of 0.18 nm rms over the eight points and about 0.1 nm at the forts round the bay". These are the drafter's figures, not recomputed here.

## Files

- **Downloads**, each in its own folder under `C:/Users/User/AppData/Local/Temp/claude/d--dev-trafalgar-1805/07e3993c-6725-40d8-bd11-d2da8ae0c0fc/scratchpad/dl/`:
  - OCR by leaf: `avdh2-desb1907`, `avdh2-nrs2`, `avdh2-nic7`, `avdh2-james3`, `avdh2-maude`, `avdh2-corr9`, `avdh2-corr11`, `avdh2-beatty1825`;
  - `avdh2-beatty1807` (the 1807 text);
  - `avdh2-pages` (page images used to fix leaf numbers);
  - `avdh2-faden-info` and `avdh2-faden-narrows` (the IIIF information and the narrows crop);
  - `avdh2-osm` (Nominatim and Overpass answers);
  - `avdh2-emodnet` (the narrows profiles).
- **Scripts** in `C:/Users/User/AppData/Local/Temp/claude/d--dev-trafalgar-1805/07e3993c-6725-40d8-bd11-d2da8ae0c0fc/scratchpad/scripts/`:
  - `avdh2-lib.js`: Natural Earth land, coast distance, room along a bearing, plane sailing, two-bearing fixes;
  - `avdh2-narrows.js`;
  - `avdh2-emod.js`;
  - `avdh2-ia.js`: archive.org hOCR leaves, grep and leaf read.
