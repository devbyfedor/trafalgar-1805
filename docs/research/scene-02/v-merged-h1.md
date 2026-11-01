# v-merged-h1: adversarial check of the chase in the merged "Scene 2" section

- **Object:** `docs/research/scene-02/history-scene-02-merged.md` (434 lines), the chase: the brief-table rows from Toulon to the arrival at Cádiz (lines 13–19); "Dates and conventions" (28–35); "Toulon to the West Indies" (37–51); "Nelson's pursuit" (53–65); "Cape Finisterre" (67–80); "Ferrol, the turn south and Cádiz" (82–93); "Routes on the chart" with the Toulon–Cádiz table (302–334); "Fleet sizes", rows "Villeneuve leaves Toulon" to "The British off Cádiz" (158–174); "Open doubts", bullets "Toulon to Cádiz" to "The turn south and Cádiz" (385–392).
- **Measured against:** `draft-h1.md` (paragraph by paragraph), `v-draft-h1.md` and its rulings `a-v-draft-h1.md` (all 17 rulings and the 18 doubts), `a-h1ac.md`, `a-h1b.md`, element [3] of `drafts-data.json`, `routes-draft.json`, `draft-lead.md` (the brief rows, the fleet table and the doubts came from it), and as background `h1-campaign.md`, `v-h1a.md`, `v-h1b.md`, `v-h1c.md`, `a-h2c.md`, `a-h2b.md`, `h2-boulogne-cadiz.md`; scene 1's sections of `docs/history-notes.md`; the chart code `src/scenes/02-road/routes.ts` and `fleets.ts`, and `src/components/chart/lines/Route.ts`.
- **Own tests:** three scripts in `scratchpad/scripts/` (`vmh1-stageA.js`, `vmh1-departure.js`, `vmh1-islands.js`) re-ran the Toulon–Cádiz line on Natural Earth 10 m land and minor islands with the chart's own Mercator and centripetal Catmull–Rom curve (sampled every 0.25 km). No primary page needed opening: every point below is settled by the repository's files, which agree.
- **Repository:** nothing in it was changed.

## Verdict

The chase is sound and the merge was faithful. Every fact, date, time, number, position, doubt and source of `draft-h1.md` is still in the section, or merged with an equal statement in the lead's brief rows, fleet table or doubts. All 17 rulings of `a-v-draft-h1.md` are applied with their texts in the section, and all 18 doubts it asked for are in "Open doubts". The Toulon–Cádiz table matches `routes.ts` point for point (all 20 positions to the tenth of a minute) and the ruling's table row by row, and my own run on Natural Earth reproduces its claims: every point at sea, no straight leg or curve sample on land, Punta Cires 2.8 / 2.35 nm, Tarifa 3.8 / 4.1, Cape Trafalgar 4.5 / 4.9, Las Puercas 3.2, Sancti Petri 4.4, row 1 0.6 nm from the coast, row 2 2.3 nm, largest curve departure 4.47 nm. Nothing contradicts scene 1's "The setting" or "The fleets". What remains:
- one date that contradicts another part of the section (Calder's flagship leaving the fleet);
- route data the section describes as corrected that is not (`routes-draft.json` still lacks rulings 1, 2, 6, 11, 16 and 17);
- a mis-sorted island list and a loose "off Barcelona";
- an "August to October" berth that contradicts the section's own anchorage history;
- two of James's "right" dates that clash with other bullets;
- two final statements of `a-h1b.md` not carried (the Channel fleet on 15 August with Nelson's stage north, and Maurice's false "Ferrol Squadron");
- Corbett's rejection of the staff map, lost from the data's doubt;
- small losses and style points.

None changes a date on the date line or a glyph count already in the table.

## Issues, most severe first

### 1. Calder's flagship left the fleet on the evening of 13 October, not "14 October" (internal contradiction, medium)

**Where:** "Cape Finisterre, 22 and 23 July", bullet "Calder's fate" (line 80).

**Problem.** The bullet says the Prince of Wales "parted on 14 October by the Victory's log". That is the log's nautical date. The section's own rule (line 30) makes every date civil, and two other places in the section give the civil date: "27 that evening, when Calder went home in the Prince of Wales" on the 13th (line 127) and "before the Prince of Wales sailed on the evening of 13 October" (line 393). Nelson wrote to Marsden on the 13th that she "leaves the Fleet this evening"; the log's "October 14th" began at noon on the civil 13th. `v-h1c.md` (S4-Nelson) flagged the nautical day and nothing fixed it. James and Clowes give the 14th, a version the section should keep.

**Fix (the whole bullet):**

> - **Calder's fate.** At his own request he was tried in Portsmouth harbour on 23–26 December 1805 and cleared of cowardice and disaffection, but for an error in judgment in not renewing the action he was "severely reprimanded" (Naval Chronicle XV 174–175). Nelson let him go home in his own flagship, the Prince of Wales, which left the fleet on the evening of 13 October (Nelson to Marsden that day, Nicolas VII 120; Corbett 1910, p. 330; the Victory's log enters it under the nautical "October 14th", VII 121 n., and James and Clowes give the 14th), so he missed Trafalgar. High.

**Evidence:** `h2-boulogne-cadiz.md`, table of British ships, "Prince of Wales" row (evening of 13 Oct, Corbett p. 330, Beatty, Desbrière p. 148 n.; "October 14th" in the log; 14 Oct in James and Clowes); `v-h2b.md` H2-18g and its evidence (Nicolas VII 117, 120); `a-h2b.md`, the October tally ("13 Oct, evening … p. 120") and the Africa entry; `v-h1c.md` S4-Nelson; merged lines 30, 127, 393.

### 2. `routes-draft.json` lacks the corrections the section describes (chart mismatch, medium)

**Where:** "Routes on the chart", bullet "How they are drawn" (line 304): "…the Vigo legs use the south mouth of the ría, 0.6 nm or more from the rocks off the south end of the Illa de San Martiño (the drawn curve 0.9 nm), and about 0.5 nm or more from the shores inside it … the others are data for the full scene (`research/scene-02/routes-draft.json`, with the corrections of `research/scene-02/a-v-draft-h1.md`, rulings 1, 2, 11 and 16)."

**Problem.** The text states the corrected routes as fact, but the data file it points to has none of them:
- `villeneuve-return` points 20–22 are still {−8.98, 42.18}, {−8.88, 42.18}, {−8.80, 42.24}: the leg along 42°10.8′ N that ruling 1 found crossing the islet off San Martiño (OSM way 638538031).
- `villeneuve-vigo-coruna` points 2–4 are still {−8.80, 42.24}, {−8.88, 42.18}, {−9.00, 42.20}.
- Both notes still say the line runs "1-2 nm from the shore" in the ría.
- The `nelson-homeward` note still reads "North of the Azores the 8 July log fix…" (ruling 2).
- The `nelson-ushant-spithead` note still reads "the Tetuan call of 22-25 July" (ruling 16).
- The `combined-ferrol-cadiz` note still reads "0.2-0.4 nm from the buoys" (ruling 16).
- The `villeneuve-toulon-cadiz` notes still read "middle of the Grande Rade", "about 20 nm off Benidorm" and "at least 3.5 nm off those coasts" (ruling 6).
- In `drafts-data.json` [3], `allies-noon` still has `headingTrue: 100` (ruling 17: 89).

Once merged, the section would describe Stage B data the repository does not hold.

**Fix.** No change to the section's text. Before it is merged, apply the rulings to the data:
- `routes-draft.json`, `villeneuve-return`, points 20–22: {"lon": −8.98, "lat": 42.160, "note": "est., SW of the Cíes, clear of the rocks off San Martiño"}, {"lon": −8.88, "lat": 42.170, "note": "est., the south mouth of the Ría de Vigo"}, {"lon": −8.80, "lat": 42.232, "note": "est., in the ría"}.
- `villeneuve-vigo-coruna`, points 2–4: {"lon": −8.80, "lat": 42.232}, {"lon": −8.88, "lat": 42.170}, {"lon": −8.98, "lat": 42.160}, then on to 42°27′ N 9°07.2′ W as now.
- Both route notes: replace "inside the ría the line runs 1-2 nm from the shore" / "the ría legs run 1-2 nm from the shore" with "in the ría the line keeps about 0.5 nm or more from the shore".
- `nelson-homeward` note: "…which agree with seven log fixes within about 0.3°; among the Azores, between Terceira and São Miguel, the 8 July log fix replaces the chart's mark, and a control point at 37°58′ N 26°05′ W keeps the line about 3½ nm off São Miguel's north coast."
- `nelson-ushant-spithead` note: "The detour to Tetuan (22–23 July) and back to Tarifa (25 July) is left out."
- `combined-ferrol-cadiz` note: "…0.1–0.2 nm from the buoys and 0.4 nm from Las Puercas…"
- `villeneuve-toulon-cadiz`: point 1 note "Toulon road, the Grande Rade (berths not recorded; est.)"; point 9 note "…about 15 nm ESE of Benidorm"; route note: drop "middle of", and "without them the line keeps 8.7 nm off Cabo de la Nao, 3.6 nm off the coast between Cartagena and Cabo de Gata and 5.3 nm off the Alborán Sea coasts".
- `drafts-data.json` [3], `allies-noon`: `headingTrue: 89`, spread "three columns, Spaniards on the right, steering ESE by compass (about east true) in fog".

**Evidence:** `routes-draft.json` as read (route notes and points listed above); `a-v-draft-h1.md`, rulings 1, 2, 6, 11, 16 and 17, with their "Text to apply"; `drafts-data.json` [3] positions, `allies-noon`.

### 3. Alborán and Perejil listed among the islands Natural Earth lacks; "off Barcelona" (factual error, low)

**Where:** "Routes on the chart", bullet "Toulon to Cádiz (drawn now)" (line 305).

**Problem:**
- The sentence "Islands Natural Earth lacks (curve): … Las Puercas 3.2; Alborán 5.4 and Perejil 3.1" puts Alborán and Perejil in that list. The ruling lists them as islands Natural Earth has, and they are in its data: each has its own small polygon in both the land and the minor-islands files (Alborán about 35°56.7′ N 3°02.3′ W, Perejil about 35°54.8′ N 5°25.1′ W; `scratchpad/scripts/vmh1-islands.js`).
- The curve's largest departure from its straight legs (4.47 nm by my run) lies at about 40°36′ N 1°50′ E, on the leg from row 6 to row 7, some 50 nm SSW of Barcelona, not off it.

**Fix (two sentences of the bullet):**

> Islands Natural Earth lacks (curve): Hormigas 8.4, Isla Grosa 13.4, Tabarca 18.3, Isla de Benidorm 13.2, Columbretes 19.6, Isla de Sancti Petri 4.3, Las Puercas 3.2. Islands it has (curve): Alborán 5.4, Perejil 3.1.

> The curve departs at most 4.4 nm from the straight legs, between Barcelona and the Columbretes.

**Evidence:** `a-v-draft-h1.md`, "What changes on the chart", "Tested on Natural Earth" ("Islands Natural Earth has: Alborán 5.4, Perejil 3.1"); `data/raw/natural-earth/` (Alborán's polygon 35.9425–35.9455 N, 3.0364–3.0398 W; Perejil's 35.9109–35.9156 N, 5.4160–5.4208 W); `scratchpad/scripts/vmh1-stageA.js`, `vmh1-islands.js` and `vmh1-departure.js` (leg 6→7: 4.47 nm at 40.598 N 1.837 E).

### 4. "The outer-bay berth of August to October" contradicts the section's own history of the anchorage (internal contradiction, low)

**Where:** "Routes on the chart", bullet "Toulon to Cádiz (drawn now)" (line 305), and bullet "Vigo, A Coruña, and Ferrol to Cádiz" (line 308).

**Problem.** The Toulon–Cádiz bullet sets the 9 April anchorage against "the outer-bay berth of August to October". The section itself ("Into the roadstead", line 143) and `a-h2c.md` (H2-36c, H2-36e) say that after the arrival on 20 August the fleet lay at first in the inner harbour, with the Argonauta between the Puntal and Matagorda forts, and moved down to the roadstead only from 9–10 October. The Ferrol–Cádiz line ends "to the anchorage's centre", which is the October anchorage. That is an estimate for the evening of 20 August, and the data's own note on the arrival ("on arrival some went further in (Argonauta between Puntal and Matagorda)", `drafts-data.json` [3], `cadiz-road-20aug`) was lost in the merge.

**Fix.** In "Toulon to Cádiz (drawn now)", replace "not the outer-bay berth of August to October" with:

> not the outer-bay anchorage of 10–19 October

In "Vigo, A Coruña, and Ferrol to Cádiz", the last two sentences:

> The line enters Cádiz bay by the channel between Las Puercas and the El Diamante shoal, 0.1–0.2 nm from the buoys and 0.4 nm from Las Puercas, and ends at the centre of the October anchorage (`research/scene-02/a-h2c.md`, H2-36d; see "Positions on the chart"). That is an estimate for the evening of 20 August, when the fleet anchored in Cádiz road (James III 375) and some ships went further in, the Argonauta to the narrows between the Puntal and Matagorda forts (Escaño, Desbrière 1907, annexes 8; see "Into the roadstead"). Low.

**Evidence:** merged lines 143, 287, 305, 308; `a-h2c.md` H2-36c, H2-36e; `drafts-data.json` [3], positions `cadiz-road-20aug` and `cadiz-9apr`; `routes-draft.json`, `combined-ferrol-cadiz` point 14.

### 5. Two of James's "right" dates clash with other bullets (internal contradiction, low)

**Where:** "Dates and conventions", bullet "James's one-day shift" (line 32).

**Problem.** The sentence ruling 7 added lists "Diamond Rock 29 May to 2 June" and "Corvo 30 June" among James's correct dates.
- **Diamond Rock.** "At Fort-de-France" (line 49) says the rock "was attacked from 31 May". James's 29 May is the day the expedition sailed (James III 349: sailed 29 May at 5.30 p.m., bore down on the rock at 7 a.m. on the 31st), so both hold, but read side by side they look like rival dates.
- **Corvo.** The section's own doubt (line 389, and "Corvo to Finisterre", line 71) sets James's "about 20 leagues NE of Corvo" on 30 June against Reille's first sight of Corvo on 2 July. Calling "Corvo 30 June" right takes James's side of a doubt the section leaves open.

The qualifiers below keep the ruling's sentence.

**Fix (the sentence, from "Other dates"):**

> Other dates in his French narrative are right: the San Rafael at Martinique on 16 May, Diamond Rock 29 May to 2 June (the expedition sailed on the 29th and opened the attack on the 31st), Basse-Terre 6 June, the convoy 8 June, the five frigates rejoining on 30 June (where they rejoined is disputed; see "Open doubts"); his 9 July for the gale is his conversion of the Moniteur letter's "21 messidor" (10 July) and matches Reille's 20 messidor (9 July) only by chance (James III 351, 353).

**Evidence:** `a-h1ac.md`, H1-09 evidence (James III 349) and H1-15; `v-h1a.md` (James's British-sourced dates, III 349, 353); merged lines 49, 71, 389.

### 6. Nelson's stage north to Ushant and the Channel fleet: a final statement of `a-h1b.md` not carried (omission, low)

**Where:** "Fleet sizes at each stage" (rows 158–174), and "Nelson's pursuit", bullet "North" (line 65).

**Problem.** The fleet table stops Nelson at "Nelson homeward, 13 June – 19 July". The section draws his line on north to Ushant and Spithead ("Routes on the chart", "Nelson": tables F–J, the August tacks; `routes-draft.json`, `nelson-ushant-spithead`), and the data had the row ("Nelson joins Cornwallis, then home", `drafts-data.json` [3]; also `h1-campaign.md` §6). `a-h1b.md` S6-CORNWALLIS gives the final statement for that moment: 24 of the Channel fleet in sight at noon, about 40 with Calder's ships and Nelson's 11 (Desbrière p. 88), some 36 after Nelson's ships went in (Corbett p. 240). The section keeps only the 24.

**Fix.** Insert after "After Finisterre" (line 169):

> | Nelson north to Ushant | 25 July – 15 August | 11 | 11 | High |

Insert after "Leaving Ferrol" (line 171):

> | Nelson joins Cornwallis | 15 August | 11 join the Channel fleet: 24 of the line in sight at noon, about 40 with Calder's ships (Desbrière), some 36 with the flag or joining it after Nelson's went in, besides the Dragon and Goliath (Corbett); nine stay, and the Victory and Superb go on to Spithead | 11, then 2 | High for 11 and 2, medium for the Channel fleet |

In "North", replace the sentence beginning "On 15 August":

> On 15 August he joined Cornwallis off Ushant (24 of the line in sight at noon; with Calder's ships, just rejoined, and Nelson's eleven, Cornwallis briefly had about 40, Desbrière 1907, p. 88, and some 36 with his flag or joining it after Nelson's went in, besides the Dragon and Goliath, Corbett 1910, p. 240) and left him nine ships, then anchored with Victory and Superb at Spithead at 8.30 a.m. on 18 August and struck his flag on the 19th (Nicolas VII 4–8). High; medium for the Channel fleet's strength.

**Evidence:** `a-h1b.md` S6-CORNWALLIS (ruling table and evidence: Nicolas VII 4; Desbrière pp. 88, 103; Corbett p. 240) and "Scene impact" 7; `drafts-data.json` [3] fleetRows ("Nelson joins Cornwallis, then home"); `h1-campaign.md` §3 "North to Ushant and Spithead" and §6.

### 7. Maurice's false "Ferrol Squadron" and the American's report at Tobago: two final statements of `a-h1b.md` missing (omission, low)

**Where:** "Nelson's pursuit", bullet "Trinidad" (line 62).

**Problem.** `a-h1b.md` rules two points with a final statement for the history notes that neither the draft nor the merge carries:
- **MISSED-4 (high).** On 8 June Maurice, late of Diamond Rock, passed on the French commodore's claim that a "Ferrol Squadron" of six French and eight Spanish ships had reached Fort Royal on 4 June; only Magon's two 74s had.
- **S3-AMERICAN (medium-high).** Off Tobago at noon on 6 June Nelson heard of an American who had been boarded by a French ship to windward of St Vincent three days before, the fleet standing south.

Both are part of why Nelson went to Trinidad and why he took the enemy for stronger than it was.

**Fix (the whole bullet):**

> - **Trinidad.** On a report from St Lucia that 28 sail had passed Gros Islet on the night of 28 May, Nelson embarked about 2,000 troops and sailed south at 9.30 a.m. on 5 June. Off Tobago at noon on the 6th he heard of an American who had been boarded by a French ship to windward of St Vincent three days before, the fleet standing south (Nicolas VI 451). At 6.10 p.m. a schooner made, by chance, the signal for the enemy at Trinidad. On the 7th he went through the Bocas into the Gulf of Paria ready for battle and found nothing. At daylight on the 8th he learned the enemy had been at Martinique on the 4th, and Maurice, late of Diamond Rock, passed on a French claim that a "Ferrol Squadron" of six French and eight Spanish ships had reached Fort Royal that day; only Magon's two 74s had come (Nicolas VI 446–451; diary, VI 449). High.

**Evidence:** `a-h1b.md` MISSED-4 and S3-AMERICAN, with evidence (Nicolas VI 449, 451, 447–448).

### 8. Corbett's rejection of the staff map is lost (lost in merge, low)

**Where:** "Ferrol, the turn south and Cádiz", bullet "The turn, 15 August" (line 89), and "Open doubts", bullet "The turn south and Cádiz" (line 392).

**Problem.** The data's doubt read "near 44°40′ N 12°25′ W (Desbrière's staff map, rejected by Corbett)". `h1-campaign.md` and `v-h1c.md` (H1-32: Corbett p. 261 n., "the staff map rejected") agree. The merged text gives the staff map's position bare, as one version among equals.

**Fix.** In "The turn, 15 August", replace "Desbrière's staff map has the fleet near 44°40′ N 12°25′ W;" with:

> Desbrière's staff map has the fleet near 44°40′ N 12°25′ W, which Corbett rejects (p. 261 n.);

In "Open doubts", "The turn south and Cádiz", replace "Desbrière's staff map puts the fleet near 44°40′ N 12°25′ W." with:

> Desbrière's staff map puts the fleet near 44°40′ N 12°25′ W (rejected by Corbett, p. 261 n.).

**Evidence:** `drafts-data.json` [3] openDoubts ("Where Villeneuve turned south on 15 August…"); `h1-campaign.md` §5 "The turn south" ("Corbett rejects it"); `v-h1c.md` H1-32 evidence (Corbett p. 261 n.).

### 9. Brief rows 1 and 2: the stragglers option lost; italic ship names (lost in merge, low)

**Where:** "Where the sources changed the brief", rows "Villeneuve breaks out of Toulon…" and "He collects Spanish ships at Cádiz…" (lines 13–14).

**Problem:**
- **The stragglers.** The data's Scene column for row 2 had "14 glyphs on the crossing (4 more apart if stragglers are drawn)", which is `a-h1b.md`'s scene impact 1 ("If stragglers are drawn, add 4 Spanish sailing apart"). The merged row drops the option.
- **Italics.** Rows 1, 2 and 4 set *Atlas*, *San Rafael* and *Didon* in italics, while every bullet of the section and scene 1's notes set ship names in roman.

**Fix (the two rows):**

> | Villeneuve breaks out of Toulon on 29 or 30 March | He weighed at about 4 p.m. on 30 March (Reille, the Atlas's log, his letter of 9 germinal; Nelson: "in the night of Saturday, March 30th"). 29 March is James's slip in converting the Republican date, copied by Clowes | 30 March 1805 | High |
> | He collects Spanish ships at Cádiz and crosses to Martinique | A stop of about six hours on the night of 9–10 April (Corbett: "less than four hours"). Of 18 ships of the line nominally together, 14 crossed in company; three Spaniards met him at Martinique on 14 May and the San Rafael on the 16th | 14 glyphs on the crossing (4 more sailing apart if the stragglers are drawn), 18 at Martinique | High |

The same applies to "the *Atlas*'s tables" in "Key sources" (line 413) and "the *Didon*" in row 4 (see 10).

**Evidence:** `drafts-data.json` [3] briefRows[1]; `a-h1b.md`, "Scene impact" 1; `docs/history-notes.md`, "The setting" and "The fleets" (ship names in roman).

### 10. Brief row 4: the caveat on "across the Atlantic and back" is lost (lost in merge, low)

**Where:** "Where the sources changed the brief", row "Beat 2: 'races back for the Channel'; Nelson 'follows him across the Atlantic and back'" (line 16).

**Problem.** The data's row for Nelson's caption said "'and back' holds only loosely": Nelson came home by Gibraltar and never caught up. The merged row says only "the captions can keep the plan's aim", which covers "races back for the Channel" and leaves Nelson's half of the caption unjudged. The row also italicises *Didon*.

**Fix (the whole row):**

> | Beat 2: "races back for the Channel"; Nelson "follows him across the Atlantic and back" | Decrès's dispatch of 29 April, with the Emperor's orders of 14 April (both brought by the Didon), and Villeneuve's decision of 10 June sent him back to Ferrol first, to gather the ships there before Brest and the Channel (Desbrière 1907, pp. 30–34, 41–42). Homeward the tracks parted: Villeneuve went north of the whole Azores group for Ferrol; Nelson went south of the western and central Azores and through the group, north of São Miguel, to Cape St Vincent and Gibraltar (19 July), then north to Ushant (15 August), and never caught up | Villeneuve's line heads for Ferrol; Nelson's runs south of it to Gibraltar; the captions can keep the plan's aim, and "across the Atlantic and back" holds only loosely, since Nelson came home by another track | High |

**Evidence:** `drafts-data.json` [3] briefRows[3] (Scene: "Nelson's homeward line runs south of Villeneuve's, to Gibraltar; 'and back' holds only loosely") and ownerQuestions[1].

### 11. Fleet table intro: "the lab", and the chase rows' glyphs on the chart now (style, low)

**Where:** "Fleet sizes at each stage", the paragraph above the table (line 154).

**Problem.** "(the lab shows six for each fleet…)" is process language the section should not use. For the chase rows it is also incomplete: the chart now draws three glyphs, an 80 and two 74s (`fleets.ts`, `ROUTE_SQUADRON`), at the head of the Toulon–Cádiz line, against the table's 11.

**Fix (the paragraph):**

> Ships of the line only; frigates and smaller craft are in the sections above. "Glyphs" is how many ship glyphs the full scene shows at that moment. The chart now draws three at the head of the Toulon–Cádiz line (see "Routes on the chart") and six for each fleet at Cádiz and at dawn (see "Positions on the chart").

(This paragraph touches the owner's first decision; see the list at the end.)

**Evidence:** `src/scenes/02-road/fleets.ts` (`ROUTE_SQUADRON`, `LAB_MARKS`); merged line 305 ("Three glyphs, an 80 and two 74s, sail at its drawing head").

### 12. "At Fort-de-France": the exceptions to "High" have no confidence (style, low)

**Where:** "Toulon to the West Indies", bullet "At Fort-de-France" (line 49), last sentence.

**Problem.** "High, except the Didon's date and where Magon joined." leaves the two exceptions unrated. The style splits confidences ("High for the date, medium for the hour"). The Didon's date has four versions (`a-h1ac.md` H1-10), which the scale calls low ("conflicting sources"). Magon's junction is Desbrière and Corbett against James, which is medium.

**Fix:**

> High; low for the Didon's date, medium for where Magon joined.

**Evidence:** `a-h1ac.md` H1-10; `a-v-draft-h1.md`, doubt 12; the confidence scale of `docs/history-notes.md`.

### 13. The bear-away position does not say which reading it uses (style, low)

**Where:** "Nelson's pursuit", bullet "Lagos and the bear-away" (line 59).

**Problem.** "Bearings" (line 35) says "Positions worked from bearings say which reading they use". The bear-away point, "about 36°47′ N 8°41′ W", is the mean of the true and compass readings (`a-h1b.md` S3-11MAY: 36°43′ N 8°45′ W true, 36°49′–50′ N 8°37′–38′ W by compass, ±5 nm), and the bullet does not say so.

**Fix (the clause):**

> …and at 6.50 p.m. bore up for the West Indies with Cape St Vincent NW by N 7 leagues: about 36°43′ N 8°45′ W if the bearing is true, 36°49′–50′ N 8°37′–38′ W by compass, so about 36°47′ N 8°41′ W, ±5 nm (Nicolas VI 433; `research/scene-02/a-h1b.md`, S3-11MAY).

**Evidence:** `a-h1b.md` S3-11MAY and its evidence ("Computing the bore-away position").

## Checked and found sound

- **Merge losses.** Every bullet of `draft-h1.md` is in the section. The changes are the ruled ones plus three equal rewordings:
  - "about 3 nm west of the entrance shoals" became "3.2 nm west of Las Puercas", matching the table;
  - "Cape de Gata" became "Cabo de Gata" throughout;
  - the draft's Stage A clearances moved into "Toulon to Cádiz (drawn now)" with the ruling's figures.
- **Data doubts.** All 16 doubts of `drafts-data.json` [3] are in "Open doubts" (the 13 July signal-log bearing among them, supported by `h1-campaign.md` §3 and `v-h1b.md` S3-HOMEEND), apart from the loss in 8.
- **Rulings.** All 17 rulings of `a-v-draft-h1.md` are applied in the text with their wording, and all 18 doubts it asked for are in "Open doubts":
  - 1, the islands sentence; 2 and 3, the Azores; 4, "The plan", "His orders", "At Fort-de-France" and brief rows 4 and 7; 5, the Strait; 6, the table; 7, James's list; 8, the turn;
  - 9, the "19 Août"; 10, the run home; 11, Reille's noon; 12, "After" and the fleet row; 13, all ten insertions and James's afternoon;
  - 14, the paraphrase; 15, the three "notes"; 16, all nine slips; 17, "ESE by compass (about east true)".
  - Rulings 1, 2, 6, 11, 16 and 17 still need their data halves (issue 2).
- **The Toulon–Cádiz table.** It matches `routes.ts` point for point (rows 1–20) and `a-v-draft-h1.md` ruling 6 row by row, with two harmless additions: row 11 "clear of the Hormigas", and row 18's source note "est." and "when the frigates signalled Orde's six".
- **The route's text.** The "Changes from `h1-campaign.md`" list matches `h1-campaign.md` table A ("off Garrucha and Águilas" is its row 14, "~11 nm off Garrucha/Águilas").
- **Calendar and arithmetic.** Every Republican conversion and weekday checks (Saturday 30 March, Tuesday 9 April, Saturday 15 June), and so do the 20 August 10 a.m. positions (36°07′ N 6°32′ W by compass with 21° W, 36°13′ N 6°42′ W true).
- **Fleet rows.** The rows in scope agree with `a-h1ac.md`, `a-h1b.md` and the bullets: 11, 11, 6, 14 (18 nominal), 10, 17/18, 20, 12, 11, 20, 15, 18, 15, 29, 3 (4), 29 (35), 26 (29 and 32).
- **Scene 1.** Nothing in scope touches the dawn of 21 October or contradicts "The setting" or "The fleets".
- **Style.** Every bullet in scope has a bold lead-in and ends with a confidence; the tables render (4, 5 and 6 columns, every row complete). There is no process language in scope beyond 11. The period quotations in scope are short and evidential ("in the night of Saturday, March 30th", "à l'entrée de la nuit", "goes off this day", "severely reprimanded", "only three poor things with a frigate and a bomb", "36 sail of men-of-war", "ralliés en route", "dès le 10 juin").
- **Code comments.** `routes.ts`'s doc comment ("the drawn curve keeps at least 2.2 nautical miles off every coast and cape but the road it leaves") holds on my run (2.32 nm at row 2 outside the road). It cites `draft-h1.md` as ruled; after the merge it could cite `docs/history-notes.md`, "Scene 2", "Routes on the chart" instead. That is a code note, not a section issue.

## Where the section touches the owner's three decisions (for the agent that applies them)

None of the rows or bullets in this scope rule on them, except the fleet-table intro (issue 11). Elsewhere in the section:
- **Decision 1 (true dawn spacing; the 16 nm / 11 nm / 4.8 nm licence withdrawn):**
  - "Fleet sizes", intro (line 154);
  - "Positions on the chart": "Dawn, 21 October: the British" (295), "Dawn, 21 October: the combined fleet" (296), "Where this differs from scene 1" (297: the lab's 16 nm line, 4.8 nm, 11 nm and "That is a licence"), "What the chart draws now" (300: the dawn glyph coordinates and "the dawn spacing and the British heading are licences");
  - "Assumptions and licences" 2 "The dawn spacing" (339) and 3 "Glyphs and counts" (340); 6 "The night tracks" (343) and the night table's centre row (276) anchor on the dawn positions;
  - "Open doubts": "Dawn, 21 October" (404) and "The chart's dawn licences (the owner's call)" (405).
- **Decision 2 (047° kept as a deliberate licence):**
  - "Positions on the chart", lines 295, 297 and 300;
  - "Assumptions and licences" 1 (338), which cites `docs/decisions.md`, "The dawn fleets are spread out", a heading that decision 1 overtakes;
  - "Open doubts" 404 and 405;
  - `fleets.ts`'s comment cites the same decisions.md heading.
- **Decision 3 (the caption "a chain of frigates and ships of the line"):**
  - the brief row "Beat 4 caption" (line 25: drop "or 'a chain of warships' at the same length");
  - also "The chain" (133, "beat 4's 'chain of frigates' is wrong") and "What would be wrong" (253, "a chain of frigates only"), which stay true.
