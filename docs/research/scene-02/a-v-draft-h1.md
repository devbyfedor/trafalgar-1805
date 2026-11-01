# a-v-draft-h1: adjudication of the check of the chase draft

- **Material:** `docs/research/scene-02/draft-h1.md`, with its structured data (element [3] of `drafts-data.json`).
- **Check:** `scratchpad/research/v-draft-h1.md`, 17 issues.
- **Final word:** the session 7 adjudications (`a-h1ac.md`, `a-h1b.md`, `a-h2c.md`) settle the points they rule. Where an issue turned on a point they do not rule, I opened the source myself.
- **Repository:** nothing in it was changed.

## Method

- **Period texts.** I fetched page-indexed OCR from archive.org for four books, split it by leaf and read every cited passage in full:
  - Desbrière 1907;
  - Nicolas vol. VI;
  - James vol. III (1886 printing);
  - Corbett 1910.
- **Leaf links.** I checked the links against the page images: Corbett n278 = p. 247, n294 = p. 261; James n357 = p. 342; Nicolas n439 = p. 400. In this range James p. P is at n(P+15). Corbett's offset changes where plates are bound in, so I took every Corbett link from that leaf's running head.
- **Staff map.** I read Desbrière's staff map "Situation au 15 août" (leaf n126) on the image.
- **Mahan.** *Life of Nelson* vol. II: the Gutenberg text (#16915).
- **Coastline:**
  - **Natural Earth.** 10m land and minor islands, read with two scripts. The checker's `landlib.js` was reviewed: it uses the same Mercator and centripetal Catmull–Rom as `src/components/chart/lines/Route.ts`. My own is `scratchpad/scripts/avdh1-stageA.js`.
  - **OpenStreetMap.** The coastline of the Ría de Vigo, fetched afresh from Overpass (data of 2026-11-01 13:01 UTC) and read with `scratchpad/scripts/avdh1-osm.js`.
  - **Toulon road.** OSM's coastline and capes there, to judge the start point.
- **Downloads.** `scratchpad/dl/avdh1-*` (texts, the map leaf, leaf images, OSM, Mahan).
- **Derived files.** `scratchpad/look/avdh1-*` (pages split by leaf, crops, the route tables tested).

## Verdict

The check holds on 15 of its 17 issues and in part on the other two:
- **Issue 9, the staff map's "19 Août".** It is real, but what it dates is unclear.
- **Issue 12, the British strength off Cádiz.** The alternative figure Desbrière's own lists give is 29, not 28.

Three of the check's fix texts needed correcting before use:
- **The plan (issue 4).** The 35-day wait and the return to Ferrol came from the Emperor's orders of 13–14 April, not from Decrès's dispatch of 29 April. The same slip ("Napoleon's orders of 29 April") is in the draft's "At Fort-de-France" bullet and in two brief rows.
- **The Vigo fix (issue 1).** It keeps the drawn curve 0.9 nm from the rocks in the mouth, but only about 0.5 nm from the north shore inside the ría, not 0.85 nm.
- **Smaller points.** Ganteaume's return is on Desbrière p. 5, not pp. 5–6. The Cádiz channel line passes the buoys at 0.1–0.2 nm; the 0.4 nm is the Las Puercas reef.

My own check added three things:
- **Two variants.** James's "afternoon" for the first sighting on 31 March, and Nelson's own order of 18 April with "off Cape de Gatte on the 7th".
- **Corbett's reading of Reille's bearing.** He reads the noon position as true and the course as magnetic.
- **The Toulon–Cádiz line now on the chart.** It breaks the 2 nm rule twice:
  - its first leg comes within 0.06 nm of Natural Earth's coast at Cap Cépet (the drawn curve 0.23 nm);
  - its last leg comes within 1.8–1.9 nm of Cádiz.

  The draft's 20-point table, which the check found drawable, fixes both. It should replace `TOULON_TO_CADIZ` (see "What changes on the chart").

## Ruling table

| # | Where | Point | Ruling |
| --- | --- | --- | --- |
| 1 | Routes, "How they are drawn"; data, Vigo legs | The Vigo legs cross the rocks off the Illa de San Martiño (OSM); the list of islands Natural Earth lacks is short | holds (fix's clearance figures corrected) |
| 2 | Routes, "Nelson"; data note of `nelson-homeward` | "North of the Azores" contradicts a-h1b | holds |
| 3 | "Homeward" | "Not south of the islands" contradicts a-h1b | holds |
| 4 | "Toulon to the West Indies", "Ferrol, the turn south and Cádiz" | The plan of 2 March and the orders of 16 July are missing | holds (text corrected; same slip fixed in "At Fort-de-France" and brief rows 5 and 8) |
| 5 | "The Strait, 9 April" | "Every British document written at the time" is too broad | holds (text refined) |
| 6 | Stage A table | Row 9 label, confidences, times of rows 3–4 | holds |
| 7 | "James's one-day shift" | "Dates from British reports"; the gale of 9 July | holds |
| 8 | "The turn, 15 August" | Desbrière's "16 août"; the reading of Reille's bearing | holds (Corbett's own reading added) |
| 9 | "20 August" | The staff map's "19 Août" | partly |
| 10 | "Villeneuve's run home" | Citation: Reille p. 57 does not carry the NNE run | holds |
| 11 | Routes, "Vigo, A Coruña, and Ferrol to Cádiz" | The line does not use Reille's noon | holds |
| 12 | "After" | Dragon and Goliath, 26 against 32 | partly |
| 13 | Ten bullets and a brief row | Variants dropped | holds (two more added) |
| 14 | "The action" | The James quotation is not evidence | holds |
| 15 | Three places | "The notes" means `h1-campaign.md` | holds |
| 16 | Nine places | Small slips | holds (two refined) |
| 17 | Data, `allies-noon` | Heading 100 for "ESE by compass" | holds |

## Rulings and the text to apply

### 1. The Vigo legs (holds)

**Evidence:**
- **The draft's legs cross the rocks.** On my own OpenStreetMap download, the draft's straight segment 20→21 of `villeneuve-return` runs along 42°10.8′ N and crosses the islet at 42.1800 N 8.9091 W (way 638538031, `place=islet`).
- **The drawn curve.** It passes 0.24 nm from the rock at 42.1774 N 8.9072 W (way 292616904) on the return leg. On the outbound leg (span 3→4) it passes 0.03 nm from way 638538028.
- **The check's replacement points:**
  - straight segments 0.60 nm or more from every rock and shore in the mouth, drawn curve 0.92 nm;
  - inside the ría the curve passes 0.54 nm, and the straight leg 0.61 nm, from the north shore near Cangas (ways 939526131, 4889550). The check's "curve 0.85 nm" holds for the mouth only.
- **The approach west of the Cíes.** It keeps 3.2 nm in both versions.
- **The ría notes are wrong.** The route notes say "inside the ría the line runs 1–2 nm from the shore". The draft's line runs 0.2–0.5 nm from it; the fixed line runs 0.5–0.9 nm.
- **Islands Natural Earth lacks.** I tested a point on each of these islands and reefs; every one falls in Natural Earth's sea, between 0.6 and 27 nm from its nearest coast: the Cíes, Ons, Sálvora, the Sisargas, Toro, the Hormigas, Isla Grosa, Tabarca, the Isla de Benidorm, the Columbretes, the Isla de Sancti Petri, the Las Puercas reef and Diamond Rock.

**Text to apply:**

*Data, `villeneuve-return`, points 20–22:*
- {lon −8.98, lat 42.160, note "est., SW of the Cíes, clear of the rocks off San Martiño"};
- {lon −8.88, lat 42.170, note "est., the south mouth of the Ría de Vigo"};
- {lon −8.80, lat 42.232, note "est., in the ría"}.

*Data, `villeneuve-vigo-coruna`, points 2–4:* {lon −8.80, lat 42.232}, {lon −8.88, lat 42.170}, {lon −8.98, lat 42.160}, then on to 42°27′ N 9°07.2′ W as now.

*Both route notes:* "in the ría the line keeps about 0.5 nm or more from the shore".

*"How they are drawn", the sentence on the islands:*

> Natural Earth lacks the Cíes, Ons, Sálvora, the Sisargas, Toro, the Hormigas, Isla Grosa, Tabarca, the Isla de Benidorm, the Columbretes, the Isla de Sancti Petri, the Las Puercas reef and Diamond Rock, so the lines were checked against them by hand, and at Vigo against OpenStreetMap's coastline: the Vigo legs use the south mouth of the ría, 0.6 nm or more from the rocks off the south end of the Illa de San Martiño (the drawn curve 0.9 nm), and about 0.5 nm or more from the shores inside it. High for the check against Natural Earth, medium for the islands and rocks checked by hand.

This is Stage B data; Stage A does not draw Vigo.

### 2. "North of the Azores" (holds)

**Evidence:**
- **The ruling.** `a-h1b.md` (S3-HOMEROUTE) puts the 8 July fix "between the island groups", near 37°50′ N 26°57′ W.
- **The data point.** On Natural Earth the point (37°52.8′ N 26°57.6′ W) is 46 nm from Terceira's south coast and 53 nm from the west tip of São Miguel, among the islands, not north of them.
- **The drawn line.** It passes 3.6 nm off São Miguel's north coast.
- **The data note.** The note of `nelson-homeward` repeats "North of the Azores".

**Text to apply.** In "Routes on the chart", "Nelson", and in the data note of `nelson-homeward`:

> …which agree with seven log fixes within about 0.3°; among the Azores, between Terceira and São Miguel, the 8 July log fix replaces the chart's mark, and a control point at 37°58′ N 26°05′ W keeps the line about 3½ nm off São Miguel's north coast.

### 3. "Not south of the islands" (holds)

**Evidence:**
- **The ruling.** `a-h1b.md` (S3-HOMEROUTE) rules: south of the western and central groups, then through the archipelago between Terceira and São Miguel, north of São Miguel on 8–9 July.
- **Mahan.** He has the French "to the northward of the group" and the British passing "through it on the 8th of July". He also has the anchoring at Gibraltar on the 20th.

**Text to apply.** The check's bullet, unchanged:

> **Homeward.** Thinking the allies bound for Cádiz or Toulon, he kept south of their track: south of the western and central Azores, then through the archipelago between Terceira and São Miguel, passing north of São Miguel on 8–9 July (log, Nicolas VI 468; Mahan). Villeneuve had gone north of the whole group, by Corvo. His frigates left on the way: the Decade and the sloop Martin on 19 June, the Amazon on 13 July, the Amphion on a day not recorded. He made Cape St Vincent on 17 July and anchored in Rosia Bay, Gibraltar, at 7.30 a.m. on 19 July (Mahan once has the 20th); ashore on the 20th, he noted it was his first time since June 1803 (Nicolas VI 471–475). High.

### 4. The plan, and the orders behind the turn to Cádiz (holds)

**Why it holds.** The brief's `<history>` asks for "the plan and the chase". It also asks why Villeneuve went south "instead of heading north for the Channel", and beat 2's caption opens "Napoleon's plan". None of the drafts says what the plan was. `draft-lead.md` only says "Napoleon's orders of 29 April sent Villeneuve back to Ferrol first".

**The 2 March instructions** (Desbrière pp. 4–5):
- **Ganteaume.** Out of Brest with 21 of the line. He was to attack and take the seven or eight British ships off Ferrol, and collect Gourdon's four and the Spanish ships there. Then over to the Antilles to join Villeneuve and Missiessy. The 40 ships so united were to come back by Ushant and run straight for Boulogne.
- **Villeneuve.** To Cádiz to collect the Aigle and the ready Spanish ships, then to Martinique to wait 40 days for Ganteaume. Failing a junction, he was to land 1,300 troops, cruise off the Canaries for the India convoys, then return to Cádiz.
- **Ganteaume's attempt** (p. 5). He came to Bertheaume on 27 March and 28 British sail appeared. Under orders not to attack, and unwilling to fight at anchor, he went back in. Desbrière dates that "le jour même" Villeneuve left Toulon.
- **Page slip.** p. 6 is "La sortie de Toulon", so the check's "pp. 5–6" should be p. 5.

**The new orders of April** (pp. 30–34):
- **The Emperor's orders of 13–14 April**, sent on the 17th and carried by Magon from Rochefort on 1 May:
  - wait about a month (35 days) after Magon's arrival;
  - take islands meanwhile;
  - then go back to Ferrol and collect the 15 ships there (Desbrière notes there were only 11);
  - free Ganteaume at Brest and enter the Channel with more than 50.
- **Decrès's dispatch of 29 April** pressed the capture of British islands. Its postscript of 1 May told him to return to Ferrol whatever happened.
- **The Didon.** She carried that dispatch with a duplicate of Magon's papers, left two days after him, and reached Martinique first, on 30 May (Villeneuve: "votre dépêche du 9 floréal (29 avril)", with a duplicate of that of 27 germinal).
- **The check's slip.** It gives the 35 days and the return to Ferrol to the 29 April dispatch; they came from the April orders.

**The July orders** (p. 81):
- **What arrived.** The Emperor's letter, Decrès's dispatch of 16 July, and his private letter of the 17th, which Villeneuve got at Ferrol only on 6 August.
- **What they ordered.** Rally Gourdon, free Rochefort, and make France master of the Pas de Calais by one of three combinations. The third was to take the Rochefort squadron round Ireland and Scotland.
- **The Cádiz clause.** After a check, separations or other events that changed the situation, he was authorised to go to Cádiz.
- **The turn rests on that clause.** Villeneuve's letter of 22 August grounds the turn on "la dépêche … du 27 messidor (16 juillet)". Decrès told the Emperor on 23 August that this was his only ground (p. 112 and n.).
- **Ferrol.** The Emperor's letter of 16 July also kept the French out of Ferrol (p. 86).

**Text to apply:**

*New first bullet under "Toulon to the West Indies":*

> **The plan.** Napoleon's instructions of 2 March 1805 sent Villeneuve, with his 11 of the line, from Toulon to Cádiz to collect the Aigle and the Spanish ships ready there, and on to Martinique to wait 40 days for Ganteaume. Ganteaume was to come out of Brest with 21 of the line, attack the seven or eight British ships off Ferrol, collect Gourdon's four and the Spanish ships there and cross to the West Indies; joined there by Villeneuve and Missiessy, about 40 of the line were to come back by Ushant and make straight for Boulogne. If Ganteaume did not come, Villeneuve was to land 1,300 troops, cruise off the Canaries for the India convoys and go back to Cádiz (Desbrière 1907, pp. 4–5). Ganteaume never got out: he anchored in Bertheaume roads on 27 March, the British appeared in strength, and under orders not to attack he went back into Brest, on the day, Desbrière writes, that Villeneuve sailed (p. 5). The Emperor's new orders of 13–14 April, sent on the 17th with Magon, told Villeneuve to wait about a month (35 days) after Magon's arrival, taking what British islands he could, then return to Ferrol, collect the ships there, free Ganteaume at Brest and enter the Channel with more than 50 of the line; Decrès's dispatch of 29 April, with a postscript of 1 May, pressed the attack on the islands and the return to Ferrol in any case. The Didon carried both and reached Martinique first, on 30 May (pp. 30–34). High.

*"At Fort-de-France", first sentence:*

> The Didon brought Decrès's dispatch of 29 April with a copy of the Emperor's orders of 14 April: take British islands, wait 35 days after Magon's arrival, then return to Ferrol.

*New bullet before "The turn, 15 August":*

> **His orders.** The Emperor's letter and Decrès's dispatch of 16 July, with Decrès's private letter of the 17th (received at Ferrol only on 6 August), told Villeneuve, once he had Gourdon's ships, to free the Rochefort squadron and make France master of the Strait of Dover: by joining the Brest and Rochefort squadrons, or the Brest squadron alone, or by taking the Rochefort squadron round Ireland and Scotland. After a defeat, a separation or any change in the situation, he was allowed to go to Cádiz (Desbrière 1907, p. 81). The Emperor's letter also kept the French out of Ferrol itself (p. 86). His letter from Cádiz of 22 August rests the turn on the dispatch of 16 July, and Decrès told Napoleon on the 23rd that it was his only ground (p. 112 and n.). High.

*Data, brief row 5 (and the lead's matching row):*

> Decrès's dispatch of 29 April, with the Emperor's orders of 14 April (both brought by the Didon), and Villeneuve's decision of 10 June sent him back to Ferrol first, to gather the ships there before Brest and the Channel (Desbrière 1907, pp. 30–34, 41–42).

*Data, brief row 8, add:*

> His orders of 16 July allowed him Cádiz after a defeat, a separation or a change in the situation, and his letter of 22 August rests the turn on them (Desbrière 1907, pp. 81, 112 n.).

### 5. "Every British document written at the time" (holds)

**Evidence:**
- **Nelson's letter.** To Marsden, off Toro, 18 April (Nicolas VI 408). It is a British document of the time, and it reports the enemy through the Straits "the 8th of April".
- **Nelson's order to Capel.** The same day, on the same page, it has the fleet off Cape de Gata on the 7th and through the Straits "on the day following".
- **James.** He carries the 8th twice:
  - as the news that reached Nelson (III 341, after the neutral's report to the Leviathan);
  - in his French narrative, where Gibraltar is in sight at daylight on the 8th, the Strait passed at noon and Cádiz bay reached at 4 p.m. (III 342), his one-day conversion slip.
- **Mahan.** He has Gibraltar on the 8th and Cádiz on the 9th.

**Text to apply:**

> **The Strait, 9 April.** The Rock and Ape's Hill were in sight in the morning, and at about 9 a.m. the fleet entered the Strait in two columns, frigates ahead (Desbrière 1907, p. 9). Every British document written at or near the scene gives the 9th: Orde's two letters of 10 April, Gardner's of 22 April, the Admiralty's order of 25 April and the Beagle's sighting off Cape Spartel; so do the American consuls at Cádiz and Lisbon. "8 April" goes back to a Ragusan's report that reached Nelson off Toro on 18 April; he passed it to the Admiralty that day, and his order to Capel of the same day has the enemy off Cape de Gata on the 7th and through the Strait the day after (Nicolas VI 408). Nicolas's chronology, Mahan (for Gibraltar) and Adkin carry it; James gives it both as the news that reached Nelson (III 341) and in his French narrative, where it is his one-day slip (III 342), and Clowes copies him. The scene uses 9 April. High.

### 6. The Stage A table (holds)

**Evidence:**
- **The positions.** All stand. I reproduced the check's distances (see "What changes on the chart").
- **Row 9.** It is 14.8 nm from Benidorm town, bearing 110° from it, and 11.6 nm from the nearest coast, by Calpe.
- **Rows 3 and 4** (Nicolas VI 396, 398, 400):
  - The note to Ball (VI 400) puts the first sighting at ten o'clock.
  - The letters to Otway and Ball give the second fix "at sunset", with the bearing marked true. The letter to Marsden puts the Phoebe's detaching at eight in the evening.
- **Row 2.** Read by compass, which the draft uses, it is 43°02.6′–02.7′ N 6°00′–6°00.4′ E. Read as true it is about 1 nm SW. Medium matches the draft's own rule for worked positions.

**Text to apply.** The table below replaces the draft's. Positions are those of the data. Rows 19 and 20 are printed to match the data, and the confidence column follows the text.

| # | Point | Position | Time | Source | Confidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Toulon road, the Grande Rade | 43°05.5′ N 5°59.4′ E | 30 Mar, weighed about 4 p.m. | Desbrière 1907, p. 7; berth est. | High (place), low (berth) |
| 2 | A league SE of Cap Sépet | 43°02.7′ N 6°00′ E | 30 Mar, about 7 p.m. | Atlas's log (Desbrière, p. 9), worked by compass with 19.8° W (as a true bearing, about 1 nm SW) | Medium |
| 3 | Cape Sicié N by E 10 leagues | 42°33′ N 5°50′ E | 31 Mar, 8 a.m. (10 a.m. in Nelson's note to Ball) | Nicolas VI 398, 400; mean of the true and compass readings, 10 nm apart | Medium |
| 4 | Cape Sicié N by E (true) 20 leagues | 42°04′ N 5°36′ E | 31 Mar, 8 p.m. (sunset in the letters to Otway and Ball) | Nicolas VI 396, 398, 400 (the frigates' position, the fleet in sight) | High (the frigates'), medium (the fleet's) |
| 5 | Noon, open sea south of the Gulf of Lion | 41°39′ N 4°31′ E | 1 Apr | Atlas | High |
| 6 | Noon, about 25 nm SE of Barcelona | 41°04′ N 2°33′ E | 2 Apr | Atlas | High |
| 7 | Noon, east of the Columbretes | 40°00′ N 1°14′ E | 3 Apr | Atlas | High |
| 8 | Noon, between Ibiza and Cabo de la Nao | 38°59′ N 0°45′ E | 4 Apr | Atlas latitude; longitude est. | High (latitude), low (longitude) |
| 9 | Noon, about 15 nm ESE of Benidorm | 38°27′ N 0°10′ E | 5 Apr | Atlas latitude; longitude est. | High (latitude), low (longitude) |
| 10 | Noon, about 20 nm off the Mar Menor | 37°43′ N 0°20′ W | 6 Apr | Atlas latitude; longitude est. | High (latitude), low (longitude) |
| 11 | About 8 nm south of Cabo de Palos | 37°30′ N 0°38′ W | 6–7 Apr | est. | Low |
| 12 | Becalmed off Cartagena | 37°30′ N 1°00′ W | 7 Apr | Atlas latitude; Desbrière, p. 8; longitude est. | High (latitude), low (longitude) |
| 13 | About 8 nm south of Cabo de Gata | 36°35′ N 2°12′ W | night of 7–8 Apr | est. | Low |
| 14 | Noon, NE of Alborán Island | 36°05′ N 2°50′ W | 8 Apr | Atlas latitude; longitude est. | High (latitude), low (longitude) |
| 15 | Entering the Strait in two columns | 36°01′ N 5°15′ W | 9 Apr, about 9 a.m. | Desbrière, p. 9; position est. | Medium |
| 16 | Mid-Strait off Tarifa | 35°56′ N 5°35′ W | about 11 a.m. | est. (`a-h1ac.md`, H1-35e) | Low |
| 17 | West mouth, mid-channel | 36°00′ N 6°00′ W | early afternoon | est. | Low |
| 18 | Just past Cape Trafalgar, off Conil | 36°14′ N 6°11′ W | about 4 p.m. | `a-h1ac.md`, H1-35e | Low |
| 19 | In the offing of Cádiz | 36°25.2′ N 6°21.6′ W | evening | est., keeps the line about 3 nm off the shore | Low |
| 20 | Anchored outside the bay | 36°33′ N 6°22.2′ W | about 7.45 p.m. to 1.30–2 a.m. on 10 Apr | Desbrière, pp. 9, 26 n.; Corbett 1910, p. 68; position est. | High (times), low (position) |

Row 1 drops "middle of": on OpenStreetMap's coast the berth is in the eastern half of the Grande Rade, about 0.8 nm off its north shore.

### 7. James's dates (holds)

**Evidence:**
- **The Moniteur letter** (III 351). James converts its "21 messidor" (10 July) as the 9th, the day he says the fleet made Cape Finisterre. On p. 353 he puts the gale and the Indomptable's topmast on "the 9th of July", the day it reached "off Cape Finisterre".
- **Reille.** He has the gale on 20 messidor, 9 July (Desbrière p. 57).
- **The coincidence.** James's 9 July is right only because two errors cancel.
- **What a-h1ac rules.** `a-h1ac.md` (H1-02b) calls the other dates "dates in his French narrative", not "from British reports".

**Text to apply.** The check's sentence, unchanged:

> …Other dates in his French narrative are right: the San Rafael at Martinique on 16 May, Diamond Rock 29 May to 2 June, Basse-Terre 6 June, the convoy 8 June, Corvo 30 June; his 9 July for the gale is his conversion of the Moniteur letter's "21 messidor" (10 July) and matches Reille's 20 messidor (9 July) only by chance (James III 351, 353). Two are two days early (Vigo reached 26 July for 28, out of Ferrol 11 August for 13), and his A Coruña on 1 August is tied to the British being blown off station that morning, so it is not simply his slip. No James date can be corrected mechanically (`research/scene-02/a-h1ac.md`, H1-02b). High.

### 8. The turn of 15 August (holds)

**Evidence:**
- **Desbrière's narrative:**
  - p. 101: the fleet ran WNW "toute la journée du 14" and did the same on the 15th;
  - p. 102: it closes "cette journée décisive du 16 août", with the order to steer south at nightfall;
  - p. 103: his print of Villeneuve's letter reads "le 27 (13 août)", with 80 leagues WNW;
  - p. 112 n.: the same letter reads "le 27 (15 août), à l'entrée de la nuit".
- **The dates.** The 16th and the 13th are slips against the letter's 27 thermidor, which is the 15th.
- **Corbett** (p. 261 n.) reconciles Reille's noon with the logged WNW course by reading "the positions … 'true' and the courses 'magnetic'". On p. 263 n. he quotes Reille's "A midi … 40 lieues Ouest-nord-ouest du Cap Finisterre".
- **The two readings.** Read true, that is 43°39′ N 11°48′ W. Read by compass with 23–24° W, it is 42°50′–52′ N 12°00′ W, some 50 nm further south.
- **The Iris's fix.** Captain Brace's report has the fleet on the 14th at 44°17′ N 9°26′ W, steering W by N ½ N (Corbett p. 259 n.). At about five knots that course, whether read by compass or true, would put the fleet at about 44° N or further north, near 12° W, by noon on the 15th. That fits the true reading, not the compass one.

**Text to apply:**

> **The turn, 15 August.** Still standing WNW against the north-east gale, Villeneuve turned for Cádiz "à l'entrée de la nuit" on 15 August, the third day out (his letter of 22 August, Desbrière 1907, p. 112 n.). Desbrière's narrative once calls the 16th the decisive day (p. 102), and his print of the same letter on p. 103 reads "13 août"; both are slips, since the days described are the 14th and 15th. Reille's noon put the fleet 40 leagues WNW of Finisterre (Corbett 1910, p. 263 n.): about 43°39′ N 11°48′ W if the bearing is true, as Corbett reads it (p. 261 n.), about 42°50′ N 12°00′ W if by compass; the Iris's fix of the 14th favours the first. Villeneuve wrote 80 leagues, which Corbett shows to be impossible; Desbrière's staff map has the fleet near 44°40′ N 12°25′ W; James implies the evening of the 14th. The scene bends the line south at about 43°45′ N 12°20′ W. High for the date, low for the position.

### 9. The staff map's "19 Août" (partly)

**Evidence.** On the image of leaf n126 (between pp. 102 and 103):
- **The label.** "19 Août" is set in italic beside a hatched square marked "6 Vaisseaux" east of Cádiz: the Spanish ships in port.
- **The fleet's track.** The dashed track runs from "Cap St Vincent 18 Août" and ends in an arrow off the port, by Collingwood's square, with no date of its own.
- **The italic dates.** The others ("14 Août", "16 Août" at Vigo, "18 Août") date tracks.

So the label may date the fleet's arrival, or the Spanish squadron's situation. The check is right that it should be recorded, but not as a plain arrival date.

**Text to apply.** Append to "20 August":

> Desbrière's staff map "Situation au 15 août" prints "19 Août" beside the six Spanish ships in Cádiz, while the fleet's track ends in an arrow off the port; if the label dates the arrival, it is a day earlier than his own text (p. 107).

### 10. The citation for the run home (holds)

**Evidence:**
- **p. 43** (leaf n64) has the order that, with the wind still SE, the fleet steered NNE.
- **p. 57** (n78) starts Reille's extract at 13 messidor, 2 July, Corvo in sight.
- **33–35° N on 21–24 June** comes from Corbett's chart (table D of `h1-campaign.md`).

**Text to apply.** The check's sentence:

> From the turn the fleet stood NNE (Desbrière 1907, p. 43) to about 33–35° N on 21–24 June (Corbett's chart, after Desbrière's), then ENE, north of the whole Azores group, sighting Corvo on 2 July (Reille, in Desbrière 1907, p. 57).

### 11. Reille's noon and the Ferrol–Cádiz line (holds)

**Evidence.** `combined-ferrol-cadiz` runs from the Iris's fix (44.283 N 9.433 W) to the turning point (43.75 N 12.33 W). At 11°48′ W it lies at 43°51′ N, 12 nm north of Reille's noon read true. The route's own note says so.

**Text to apply** (text and data note):

> …then table E: one British fix (the Iris, 14 August), the rest estimated; Reille's noon of the 15th (about 43°39′ N 11°48′ W if its bearing is true) lies about 12 nm south of the line.

### 12. The British off Cádiz at the end of August (partly)

**Evidence:**
- **James** (III 379): Bickerton's four joined Collingwood's four on 22 August, and Calder joined on the 30th "with 18 line-of-battle ships" (III 311 has him detached with 18). Corbett p. 267 also gives eighteen.
- **Desbrière, p. 109.** Collingwood had 11 when Calder came with 21, "dont le Dragon et le Goliath ralliés en route", 32 in all. His 11 counts the Minotaur, Mars and Bellerophon twice (p. 108, `a-h1b.md` S6-BRIT-CADIZ).
- **The double count removed.** Collingwood's eight plus his named 21 gives 29, not the check's 28 (which is James's 26 plus two).
- **Whether the two were meant to join:**
  - Captain Hallowell's letter of 17 August, which Desbrière prints (p. 103 n.), lists Calder's ships with the Dragon and Goliath "to be joined on the way";
  - Corbett says Cornwallis's order of the 16th gave Calder 18, "which, with the Dragon and Goliath already to the southward, would give him twenty" (p. 247).
- **Whether they stayed.** On 10 October Allemand nearly took the Dragon off Vigo (Desbrière p. 108 n.).
- **Allemand's intelligence.** On 11 September his news from a captured brig gave 26 before Cádiz (p. 108).
- **The two rulings.** `a-h1ac.md` (S5-reinf) leaves 26 against 32 open; `a-h1b.md` prefers 26.

**Text to apply** ("After", from "Bickerton's ships…"):

> Bickerton's ships joined Collingwood from 22 August, and Calder came south from Cornwallis's fleet on 30 August with 18, giving about 26 of the line (James III 379; Corbett 1910, p. 267); the news Allemand had from a captured brig on 11 September also gave 26 (Desbrière 1907, p. 108). Desbrière's total of 32 (p. 109) counts the Minotaur, Mars and Bellerophon twice; without the double count his lists give 29, because he has Calder bring 21, the Dragon and Goliath among them, "ralliés en route", as Cornwallis's orders intended (Desbrière p. 103 n.; Corbett p. 247); the Dragon was off Vigo again on 10 October (Desbrière p. 108 n.). Calder's ships included eight of the eleven Nelson had brought back from the West Indies (Desbrière 1907, p. 109 n.) (`research/scene-02/a-h1b.md`, S6-BRIT-CADIZ; `a-h1ac.md`, S5-reinf). … High for 29 in, medium for 35 and 26.

### 13. Variants dropped (holds; two more added)

Each of the check's ten insertions is supported:
- **31 March.** The note to Ball has the sighting at ten o'clock (Nicolas VI 400).
- **Cape de Gata on the 7th.** The neutral's report to the Leviathan (James III 341). To that I add **Nelson's own order to Capel of 18 April** (Nicolas VI 408).
- **Magon.** James has him joining at sea on the day of sailing or the next (III 351).
- **The convoy.** James has all 15 taken (III 351, 353).
- **The Martin.** "goes off this day" (VI 432; `a-h1b.md` S3-MARTIN).
- **Bettesworth.** He arrived in London while Barham slept and Barham woke early (Corbett p. 181); Mahan and Desbrière have daylight on the 9th (`h1-campaign.md` §2).
- **The Termagant.** "3.30 A.M." in Mahan; "four o'clock" in Nelson to Collingwood (`a-h1b.md` S3-TETUAN-JUL).
- **Finisterre.** Mahan: "on the 26th lost sight".
- **A Coruña.** Corbett's narrative of 1 August (p. 218; `a-h1ac.md` H1-30).
- **The Cádiz stop.** Corbett's "less than four hours" (p. 68).

I also add **James's "afternoon" for the first sighting**: Cape Sicié north, 10 or 12 leagues (III 339). `h1-campaign.md` §1 records it.

**Text to apply** (into the bullets named):
- *Toulon, 30 March:* "…saw him at 8 a.m. on the 31st (10 a.m. in his note to Ball, Nicolas VI 400; James, III 339, and Clowes have the afternoon), ten leagues south of Cape Sicié…"
- *Inside the Balearics:* "…past Cape de Gata that night; a neutral's report to the Leviathan, and Nelson's order to Capel of 18 April, have him off the cape on the 7th (James III 341; Nicolas VI 408)."
- *At Fort-de-France:* "…(Desbrière 1907, p. 36); James has the junction at sea, on the day the fleet sailed or the next (III 351)."
- *North through the islands:* "…after a five-hour chase took 14 (James: all 15)."
- *Lagos and the bear-away:* "The sloop Martin, which Nelson had written on the 10th was going 'this day', parted ahead that afternoon by the log."
- *The Curieux:* "He reached Plymouth on 7 July and the Admiralty late on the 8th (Corbett) or by daylight on the 9th (Mahan, Desbrière), and Barham at once…"
- *North:* "Off Tarifa at about 3.30–4 a.m. on 25 July (3.30 by Mahan; 'four o'clock' in Nelson's letter to Collingwood)…"
- *23 and 24 July:* "…or the next morning (Corbett 1910, p. 205); Mahan has the 26th."
- *To A Coruña:* "James and Mahan, and Corbett's narrative (p. 218), have him in on 1 August; Corbett dates the junction 2 August (p. 219)…"
- *Brief row "collects Spanish ships at Cádiz"* (data and lead): "A stop of about six hours on the night of 9–10 April (Corbett: 'less than four hours')…"

### 14. The James quotation (holds)

`docs/research/README.md` keeps quotations to wording that is itself evidence; the fog phrase is description. Text to apply: "…in fog and smoke so thick that a ship could see little beyond her own length (James III 361)…"

### 15. "The notes" (holds)

Inside `docs/history-notes.md` the phrase reads as the file itself. Text to apply:
- "`research/scene-02/h1-campaign.md` (section 6) has '17 sailed together', which is wrong";
- "Changes from `h1-campaign.md`:";
- the "Homeward" phrase goes with ruling 3.

### 16. Small slips (holds; two refined)

**Evidence:**
- **Barbados.** `a-h1b.md` (S3-BARBADOS): the page image reads 4.50 and the 4.30 was OCR.
- **Campbell.** S3-GIB-6MAY: the complaint is Campbell's.
- **The Jason.** The 1 p.m. news is in Nicolas VI 452: "At 1, p. M., I received a letter from General Prevost by the Jason".
- **Tetuan.** He anchored there on 22 July and weighed on the 23rd (`a-h1b.md`).
- **"Pléiade".** `a-h1ac.md` H1-03.
- **The 12 July point.** 365 nm from the coast west of Oporto, by computation.
- **The Cádiz buoys.** The channel line runs along 36.5545 N. It passes the buoys at 0.10 nm (No. 6 El Diamante), 0.19–0.20 nm (Nos. 1, 4, 5) and the Las Puercas reef at 0.37 nm (`a-h2c.md`).
- **The Atlas table.** Its labels are start dates (`a-h1ac.md` H1-07).

**Text to apply:**
- "Desbrière too prints 4.50; the notes' '4.30' was an OCR misreading";
- "the Decade and the sloop Martin";
- "by Campbell's own later complaint, Rear-Admiral Donald Campbell…";
- "Off Grenada on 9 June he learned, from the Jason at 1 p.m., that the enemy had passed Dominica on the 6th, steering north";
- in "Nelson" (routes) and the `nelson-ushant-spithead` note: "The detour to Tetuan (22–23 July) and back to Tarifa (25 July) is left out";
- "Reille's 'Pléiade' is an error";
- "…within about 300 miles of the coast west of Oporto (about 365 nm on his chart)…";
- "0.1–0.2 nm from the buoys and 0.4 nm from Las Puercas";
- "a row labelled N germinal gives the noon position of N+1 germinal (the label is the day on which that noon-to-noon run began)".

### 17. The allies' heading at noon on 22 July (holds)

**Evidence:**
- **The order.** At noon Villeneuve ordered the fleet to keep on "dans l'E.-S.-E." (Desbrière p. 59).
- **Corbett.** He gives the course as "about east direct for Ferrol" (p. 196).
- **The arithmetic.** ESE (112.5°) by compass with 24° W is 088.5° true, which agrees with Corbett. True ESE (112.5°) would head for northern Portugal.

**Text to apply.** `allies-noon`:
- `headingTrue: 89`;
- spread: "three columns, Spaniards on the right, steering ESE by compass (about east true) in fog".

## What changes on the chart

### The Toulon–Cádiz line (`src/scenes/02-road/routes.ts`)

**The present line.** `TOULON_TO_CADIZ` has 22 points: table A of `h1-campaign.md` with the 4 p.m. point of `a-h1ac.md`. On Natural Earth it breaks the routes' own rule ("at least 2 nautical miles off every coast but the roads it leaves") twice:
- **Toulon.** Its first leg, from 43°06′ N 5°56′ E to 43°02′ N 6°00′ E, cuts the corner of Cap Cépet:
  - the straight leg passes 0.06 nm from Natural Earth's coast at 43°04.8′ N 5°57.1′ E;
  - the drawn curve passes 0.23 nm from it, and 0.9 nm from the cape itself.
- **Cádiz.** Its last leg, from off Conil straight to the anchorage, passes 2.07 nm from the coast, 1.84 nm from San Sebastián castle and 2.1 nm from the Isla de Sancti Petri; the drawn curve 1.9 and 2.2 nm.

**The draft's table.** Its 20 points, which the check found drawable, fix both:
- **The start.** It moves the start into the eastern Grande Rade.
- **Row 2.** It recomputes row 2 from the Atlas's log.
- **The offing.** It adds a point off Cádiz.
- **Three estimates dropped.** It drops three estimated points that add nothing: east of Cabo de la Nao, off Águilas and south of Málaga. These are not zigzags. Without them the line still keeps 8.7 nm off Cabo de la Nao, 3.6 nm off the coast between Cartagena and Gata, and 5.3 nm off the Alborán Sea coasts.

**Zigzags.** No point in the table makes the line zigzag. The turns of 40° or more are all real changes of course, and none reverses it:
- row 4, where the fleet hauled west on 31 March;
- the dog-leg round Cabo de Palos to Cartagena (+42°, −44°), where it lay becalmed on the 7th;
- row 14, west for the Strait;
- row 17, round Cape Trafalgar.

No point needs dropping as reckoning noise.

**The table to draw** ([lon, lat], decimal degrees):

| # | [lon, lat] | Date | Note |
| --- | --- | --- | --- |
| 1 | [5.990, 43.092] | 30 March, weighed about 4 p.m. | Toulon road, the Grande Rade; berth est. (Desbrière 1907, p. 7) |
| 2 | [6.000, 43.045] | 30 March, about 7 p.m. | a league SE of Cap Sépet: the Atlas's log, the cape NW ¼ N one league, by compass with 19.8° W (Desbrière p. 9) |
| 3 | [5.833, 42.550] | 31 March, 8 a.m. | first seen by Active and Phoebe, Cape Sicié N by E 10 leagues, mean of the true and compass readings (Nicolas VI 398, 400) |
| 4 | [5.600, 42.067] | 31 March, 8 p.m. (sunset) | Cape Sicié N by E true 20 leagues, the frigates' position with the fleet in sight (Nicolas VI 396) |
| 5 | [4.517, 41.650] | 1 April, noon | Atlas's log, open sea south of the Gulf of Lion |
| 6 | [2.550, 41.067] | 2 April, noon | Atlas's log, about 25 nm SE of Barcelona |
| 7 | [1.233, 40.000] | 3 April, noon | Atlas's log, east of the Columbretes |
| 8 | [0.750, 38.983] | 4 April, noon | Atlas's latitude; longitude est., mid-channel between Ibiza and Cabo de la Nao |
| 9 | [0.167, 38.450] | 5 April, noon | Atlas's latitude; longitude est., about 15 nm ESE of Benidorm |
| 10 | [-0.333, 37.717] | 6 April, noon | Atlas's latitude; longitude est., about 20 nm off the Mar Menor |
| 11 | [-0.633, 37.500] | 6–7 April | est., about 8 nm south of Cabo de Palos, clear of the Hormigas |
| 12 | [-1.000, 37.500] | 7 April | becalmed off Cartagena (Atlas's noon latitude; Desbrière p. 8); longitude est. |
| 13 | [-2.200, 36.583] | night of 7–8 April | est., about 8 nm south of Cabo de Gata |
| 14 | [-2.833, 36.083] | 8 April, noon | Atlas's latitude; longitude est., NE of Alborán |
| 15 | [-5.250, 36.017] | 9 April, about 9 a.m. | entering the Strait in two columns (Desbrière p. 9); position est. |
| 16 | [-5.583, 35.933] | 9 April, about 11 a.m. | mid-Strait off Tarifa (est.; a-h1ac H1-35e) |
| 17 | [-6.000, 36.000] | 9 April, early afternoon | west mouth, mid-channel (est.) |
| 18 | [-6.183, 36.233] | 9 April, about 4 p.m. | just past Cape Trafalgar, off Conil, when the frigates signalled Orde's six (a-h1ac H1-35e; est.) |
| 19 | [-6.360, 36.420] | 9 April, evening | est., in the offing; keeps the line about 3 nm off Sancti Petri and Cádiz's west shore |
| 20 | [-6.370, 36.550] | 9 April, about 7.45–8 p.m., to 1.30–2 a.m. on 10 April | anchored outside the bay, 3.2 nm W of Las Puercas (Desbrière pp. 9, 26 n.; Corbett p. 68); position est. |

**Tested on Natural Earth** (`avdh1-stageA.js`, curve sampled every 0.25 km). Every point is at sea, and no straight segment or stretch of the drawn curve touches land.
- **Outside Toulon road.** Coast at least 2.3 nm (row 2, straight and curve).
- **Closest approaches** (straight / curve):
  - Cap Cépet 2.1 / 2.2 nm;
  - Punta Cires 2.8 / 2.4;
  - the shore east of Cartagena 3.35 / 2.5;
  - Cabo Tinoso 4.3; Tarifa 3.7 / 4.1; Cape Trafalgar 4.45 / 4.9;
  - Europa Point 7.2 / 6.4; Punta Almina 7.2 / 6.7;
  - San Sebastián castle 2.7 / 2.8; Rota 4.2.
- **Islands Natural Earth lacks** (curve): Hormigas 8.4, Isla Grosa 13.4, Tabarca 18.3, Isla de Benidorm 13.2, Columbretes 19.6, Isla de Sancti Petri 4.3, Las Puercas 3.2.
- **Islands Natural Earth has:** Alborán 5.4, Perejil 3.1.
- **Leaving Toulon road.** The first leg passes 2.1 nm from Cap Cépet and 1.4–1.5 nm from Natural Earth's east shore of the road's mouth, which is about 3.4 nm wide, so no exit can keep 2 nm from both sides. This is the road the rule exempts.
- **The curve's spread.** Its largest departure from the straight legs is 4.4 nm, off Barcelona.

The doc comment of `routes.ts` should cite this table (`draft-h1.md`, as ruled here) instead of table A. Its "at least 2 nautical miles off every coast but the roads it leaves" is then true.

Nothing in these rulings changes `fleets.ts` or `gazetteer.ts`.

## Doubts the history notes should record

None of these is yet in the draft's text or its 16 open doubts:
1. **The first sighting on 31 March:**
   - 8 a.m.: Nelson to Marsden and to Otway (Nicolas VI 396, 398);
   - 10 a.m.: his note to Ball (VI 400);
   - the afternoon, Sicié north 10–12 leagues: James III 339, Clowes.

   The second fix is 8 p.m. in the letter to Marsden and sunset in those to Otway and Ball.
2. **Cape de Gata:**
   - passed in the night of 7–8 April: Desbrière's narrative and the Atlas's noon of the 8th;
   - "off Cape de Gata on the 7th": the neutral to the Leviathan (James III 341) and Nelson's order to Capel of 18 April (VI 408).
3. **What the Didon brought:** Decrès's dispatch of 29 April with the Emperor's orders of 14 April (Desbrière pp. 31–34; Villeneuve's letter of 1 June). The draft, the lead and the data call them "Napoleon's orders of 29 April".
4. **Ganteaume's return to Brest.** Desbrière dates it to the day Villeneuve left Toulon (p. 5); no other version was found.
5. **The day of the turn south:**
   - 15 August at nightfall: Villeneuve's letter of 22 August (Desbrière p. 112 n.);
   - "16 août": Desbrière's narrative (p. 102);
   - "13 août": his print of the letter (p. 103);
   - the evening of the 14th: implied by James.
6. **Reille's noon of 15 August:**
   - 43°39′ N 11°48′ W if the bearing is true: Corbett, who reads positions true and courses magnetic (p. 261 n.);
   - 42°50′ N 12°00′ W if by compass with 23–24° W.
7. **The staff map's "19 Août"** beside the Spanish ships at Cádiz (Desbrière, leaf n126). Its meaning is uncertain. Read as the arrival, it is a day before his own text (p. 107) and James (III 375).
8. **British ships off Cádiz at the end of August:**
   - 26: James III 379; Allemand's intelligence of 11 September, Desbrière p. 108;
   - 29: Desbrière's own lists without his double count, with the Dragon and Goliath "ralliés en route" (p. 109; Hallowell's letter of 17 August, p. 103 n.; Corbett p. 247, Cornwallis's orders);
   - 32: Desbrière's printed total.

   The Dragon was off Vigo on 10 October (Desbrière p. 108 n.).
9. **Bettesworth's arrival at the Admiralty:** late on 8 July (Corbett p. 181) or by daylight on the 9th (Mahan, Desbrière).
10. **When the fleets lost sight after Finisterre:** the evening of 24 July (James III 365), the morning of the 25th (Corbett p. 205), or the 26th (Mahan).
11. **The convoy of 8 June:** 14 of 15 taken (Reille, Desbrière p. 41; Villeneuve's report; Nelson's "fourteen Sail") or all 15 (James III 351, 353).
12. **Magon's junction:** at Fort-de-France on 4 June (Desbrière p. 36; Corbett p. 160) or at sea on the day of sailing or the next (James III 351).
13. **The Martin:** "goes off this day", Nelson on 10 May (VI 432); parted on the afternoon of 11 May by the log (VI 433).
14. **The Termagant:** 3.30 a.m. (Mahan; the log as read) or "four o'clock" (Nelson to Collingwood, VI 497).
15. **The Cádiz stop of 9–10 April:** about six hours (anchored 7.45–8 p.m., under sail by 1.30–2 a.m.; Desbrière, Reille) or "less than four hours" (Corbett p. 68).
16. **The anchoring at Gibraltar:** 19 July (log, Nicolas VI 473; James; Desbrière) or 20 July (Mahan, the day Nelson went ashore).
17. **The gale of 9 July:** Reille's 20 messidor. James's 9 July is his conversion of the Moniteur letter's 21 messidor (10 July) and matches only by chance.
18. **The allies' course at noon on 22 July:** ESE by compass (Villeneuve's order, Desbrière p. 59), "about east" for Ferrol (Corbett p. 196); 089° true by the 1805 variation.

## Sources

- **Desbrière, É.**, *La campagne maritime de 1805: Trafalgar* (1907), https://archive.org/details/la-campagne-maritime-de-1805:
  - p. 4, n23: https://archive.org/details/la-campagne-maritime-de-1805/page/n23/mode/1up
  - p. 5, n24: https://archive.org/details/la-campagne-maritime-de-1805/page/n24/mode/1up
  - p. 30, n51: https://archive.org/details/la-campagne-maritime-de-1805/page/n51/mode/1up
  - p. 31, n52: https://archive.org/details/la-campagne-maritime-de-1805/page/n52/mode/1up
  - p. 32, n53: https://archive.org/details/la-campagne-maritime-de-1805/page/n53/mode/1up
  - p. 33, n54: https://archive.org/details/la-campagne-maritime-de-1805/page/n54/mode/1up
  - p. 34, n55: https://archive.org/details/la-campagne-maritime-de-1805/page/n55/mode/1up
  - p. 43, n64: https://archive.org/details/la-campagne-maritime-de-1805/page/n64/mode/1up
  - p. 57, n78: https://archive.org/details/la-campagne-maritime-de-1805/page/n78/mode/1up
  - p. 59, n80: https://archive.org/details/la-campagne-maritime-de-1805/page/n80/mode/1up
  - p. 81, n102: https://archive.org/details/la-campagne-maritime-de-1805/page/n102/mode/1up
  - p. 101, n124: https://archive.org/details/la-campagne-maritime-de-1805/page/n124/mode/1up
  - p. 102, n125: https://archive.org/details/la-campagne-maritime-de-1805/page/n125/mode/1up
  - staff map "Situation au 15 août", n126: https://archive.org/details/la-campagne-maritime-de-1805/page/n126/mode/1up
  - p. 103 and n., n128: https://archive.org/details/la-campagne-maritime-de-1805/page/n128/mode/1up
  - p. 108, n133: https://archive.org/details/la-campagne-maritime-de-1805/page/n133/mode/1up
  - p. 109, n134: https://archive.org/details/la-campagne-maritime-de-1805/page/n134/mode/1up
  - p. 112 and n., n137: https://archive.org/details/la-campagne-maritime-de-1805/page/n137/mode/1up
- **Nicolas, N. H.** (ed.), *Dispatches and Letters of … Nelson*, vol. VI (1845):
  - p. 396, n435: https://archive.org/details/dispatchesletter06nelsiala/page/n435/mode/1up
  - p. 398, n437: https://archive.org/details/dispatchesletter06nelsiala/page/n437/mode/1up
  - p. 400, n439: https://archive.org/details/dispatchesletter06nelsiala/page/n439/mode/1up
  - p. 408, n447: https://archive.org/details/dispatchesletter06nelsiala/page/n447/mode/1up
  - p. 452, n491: https://archive.org/details/dispatchesletter06nelsiala/page/n491/mode/1up
  - p. 468, n507: https://archive.org/details/dispatchesletter06nelsiala/page/n507/mode/1up
- **James, W.**, *The Naval History of Great Britain*, vol. III (1886):
  - p. 311, n326: https://archive.org/details/navalhistoryofgr03jameuoft/page/n326/mode/1up
  - p. 339, n354: https://archive.org/details/navalhistoryofgr03jameuoft/page/n354/mode/1up
  - p. 341, n356: https://archive.org/details/navalhistoryofgr03jameuoft/page/n356/mode/1up
  - p. 342, n357: https://archive.org/details/navalhistoryofgr03jameuoft/page/n357/mode/1up
  - p. 351, n366: https://archive.org/details/navalhistoryofgr03jameuoft/page/n366/mode/1up
  - p. 353, n368: https://archive.org/details/navalhistoryofgr03jameuoft/page/n368/mode/1up
  - p. 379, n394: https://archive.org/details/navalhistoryofgr03jameuoft/page/n394/mode/1up
- **Corbett, J. S.**, *The Campaign of Trafalgar* (1910):
  - p. 68, n93: https://archive.org/details/campaignoftrafal00corb/page/n93/mode/1up
  - p. 181, n208: https://archive.org/details/campaignoftrafal00corb/page/n208/mode/1up
  - p. 196, n227: https://archive.org/details/campaignoftrafal00corb/page/n227/mode/1up
  - p. 247, n278: https://archive.org/details/campaignoftrafal00corb/page/n278/mode/1up
  - p. 259 n., n292: https://archive.org/details/campaignoftrafal00corb/page/n292/mode/1up
  - p. 261, n294: https://archive.org/details/campaignoftrafal00corb/page/n294/mode/1up
  - p. 263, n296: https://archive.org/details/campaignoftrafal00corb/page/n296/mode/1up
  - p. 267, n300: https://archive.org/details/campaignoftrafal00corb/page/n300/mode/1up
- **Mahan, A. T.**, *The Life of Nelson*, vol. II, ch. XX (Project Gutenberg #16915): https://www.gutenberg.org/ebooks/16915
- **OpenStreetMap** coastline, via Overpass (https://overpass-api.de/), data of 2026-11-01:
  - islet: https://www.openstreetmap.org/way/638538031
  - rocks off San Martiño: https://www.openstreetmap.org/way/292616904 and https://www.openstreetmap.org/way/638538028
  - Illa de San Martiño: https://www.openstreetmap.org/way/720479377
  - north shore near Cangas: https://www.openstreetmap.org/way/939526131
  - Cap Cépet: https://www.openstreetmap.org/#map=15/43.0676/5.9465
- **Natural Earth** 1:10m land and minor islands (`data/raw/natural-earth/`): https://www.naturalearthdata.com/downloads/10m-physical-vectors/
- **Repository files:**
  - `docs/research/scene-02/a-h1ac.md` (H1-02b, H1-03, H1-05, H1-07, H1-30, H1-35e, S5-reinf);
  - `docs/research/scene-02/a-h1b.md` (S3-HOMEROUTE, S3-BARBADOS, S3-GIB-6MAY, S3-MARTIN, S3-TETUAN-JUL, S6-BRIT-CADIZ);
  - `docs/research/scene-02/a-h2c.md` (buoys and reef);
  - `docs/research/scene-02/h1-campaign.md`.
