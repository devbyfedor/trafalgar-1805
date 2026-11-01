# a-v-merged-h1: rulings on the check of the chase in the merged "Scene 2" section

- **Material:** `docs/research/scene-02/history-scene-02-merged.md`, the chase. That is the brief rows from Toulon to Cádiz (lines 13–19), "Dates and conventions", "Toulon to the West Indies", "Nelson's pursuit", "Cape Finisterre", "Ferrol, the turn south and Cádiz", the chase rows of "Fleet sizes at each stage", "Routes on the chart" with its Toulon–Cádiz table, and the chase bullets of "Open doubts".
- **Check:** `scratchpad/history/v-merged-h1.md`, 13 issues.
- **Final word:** the session 7 adjudications (`a-h1ac.md`, `a-h1b.md`, `a-h2b.md`, `a-h2c.md`) and the session 9 rulings (`a-v-draft-h1.md`) settle the points they rule. No ruling is reopened here. Where a fix text turned on a source's exact wording, I read the source (issues 6, 7 and 8).
- **The owner's decisions of 1 November 2026** override any ruling that conflicts with them. In this scope only decision 1 applies (issue 11). Decisions 2 and 3 touch nothing in the chase.
- **Repository:** nothing in it was changed.

## Method

- **Read in full:** the chase part of the merged section; `draft-h1.md`; `a-v-draft-h1.md`; `a-h1b.md`; `a-h1ac.md`. **Read where they bear:** `draft-lead.md` (brief rows, fleet table), `a-h2b.md` (H2-18g, H2-19a), `a-h2c.md` (H2-36c–e), `v-h2b.md` (H2-18g), `v-h1c.md` (S4-Nelson, H1-32), `v-h1a.md` (James's dates), `h1-campaign.md` (§5). **With node:** element [3] of `drafts-data.json` and every route of `routes-draft.json`. **Code:** `src/scenes/02-road/routes.ts` and `fleets.ts`, `src/components/chart/lines/Route.ts`, `src/components/chart/geo/mercator.ts`.
- **Own tests** (scripts in `scratchpad/scripts/`):
  - `amh1-geo.js`: looks for Alborán and Perejil in Natural Earth 10 m land and minor islands, and measures how far the drawn Toulon–Cádiz curve departs from its straight legs, with the chart's own Mercator and centripetal Catmull–Rom (2,000 samples a span).
  - `amh1-islands.js`: the line's distance to those two islands, straight legs and curve.
- **Period texts:** the archive.org full text of Nicolas vol. VI (pp. 446–451) and of Corbett 1910 (pp. 240, 261 n.).
- **Leaf links:** taken from each item's page-number file. I checked them against leaves the repository's adjudications had verified on the page images: Nicolas VI p. 396 = n435 and p. 433 = n472; Nicolas VII p. 70 = n105; Corbett p. 68 = n93 and p. 261 = n294; Desbrière p. 9 = n28 and p. 109 = n134.
- **Downloads:** `scratchpad/dl/amh1-*` (texts, metadata, page-number files).

## Verdict

The check holds on 12 of its 13 issues and partly on one.
- **Issue 11 (partly).** The owner's decision 1 overrides the check's replacement text. The fleet table's intro should define its column and point to the chart sections. It should not give the Stage A lab's glyph counts.
- **Refined fix texts.** Several of the check's texts needed refining:
  - **Issue 6.** Corbett's "some thirty-six" comes after Nelson and the ships needing a refit had gone in, not "Nelson's", since nine of Nelson's eleven stayed.
  - **Issue 7.** `a-h1b.md`'s final statement on the American's report includes Clarke and M'Arthur's different version, and Nelson gave the "Ferrol Squadron" little credit.
  - **Issue 8.** Corbett gives his reason: the fleet was off Cádiz eighty hours after the turn.
  - **Issue 4.** The Ferrol–Cádiz line should point to "Into the roadstead", so it does not restate where the fleet first lay.
  - **Issue 5.** The Corvo item should keep `a-h1ac.md`'s date and doubt only the place.
- **Issue 2 is about data, not the section's text.** The check's list of data changes misses four things:
  - ruling 11's note on `combined-ferrol-cadiz`;
  - rulings 4 and 13's brief rows in `drafts-data.json` [3];
  - the same "August to October" berth (issue 4) in two data notes;
  - the start-point clause of ruling 6.

None of this changes a date on the date line, a glyph count already in the table, a route the chart draws now, or anything in scene 1.

## Ruling table

| # | Where | Point | Ruling |
| --- | --- | --- | --- |
| 1 | "Cape Finisterre", "Calder's fate" | "Parted on 14 October by the Victory's log" gives the nautical date; the section's dates are civil, and it says the evening of 13 October twice elsewhere | holds |
| 2 | "Routes on the chart", "How they are drawn" | `routes-draft.json` (and `drafts-data.json` [3]) lack the data halves of the rulings the section describes | holds (section unchanged; data list completed) |
| 3 | "Toulon to Cádiz (drawn now)" | Alborán and Perejil listed among islands Natural Earth lacks; "off Barcelona" | holds |
| 4 | "Toulon to Cádiz (drawn now)"; "Vigo, A Coruña, and Ferrol to Cádiz" | "Outer-bay berth of August to October" contradicts "Into the roadstead"; the Ferrol–Cádiz end point is the October anchorage | holds (second text refined) |
| 5 | "Dates and conventions", "James's one-day shift" | "Diamond Rock 29 May to 2 June" and "Corvo 30 June" read against other bullets | holds (Corvo qualifier refined) |
| 6 | "Fleet sizes"; "Nelson's pursuit", "North" | `a-h1b.md` S6-CORNWALLIS (the Channel fleet on 15 August) and Nelson's stage north not carried | holds (text refined from Corbett p. 240) |
| 7 | "Nelson's pursuit", "Trinidad" | `a-h1b.md` MISSED-4 (Maurice's "Ferrol Squadron") and S3-AMERICAN not carried | holds (text refined from Nicolas VI 448–451) |
| 8 | "The turn, 15 August"; Open doubts, "The turn south and Cádiz" | Corbett's rejection of the staff map lost | holds |
| 9 | Brief rows 1 and 2; Key sources | Stragglers option lost; ship names in italics | holds |
| 10 | Brief row 4 | "Across the Atlantic and back holds only loosely" lost | holds |
| 11 | "Fleet sizes", intro | "The lab shows six for each fleet" | partly (the owner's decision 1) |
| 12 | "At Fort-de-France", confidence | Exceptions to "High" unrated | holds |
| 13 | "Lagos and the bear-away" | The bear-away position does not say which reading it uses | holds |

## Rulings and the text to apply

### 1. Calder's flagship left on the evening of 13 October (holds)

**Why.** The section's own rule is that dates are civil (line 30). Elsewhere it says the evening of 13 October twice: "27 that evening, when Calder went home in the Prince of Wales" (line 127) and "before the Prince of Wales sailed on the evening of 13 October" (line 393).
- **Nelson.** He wrote to Marsden on the 13th that she left the fleet "this evening" (Nicolas VII 120).
- **The log.** The Victory's "October 14th" is a nautical day, which began at noon on the civil 13th (VII 121 n.).
- **The tally.** `a-h2b.md` (H2-19a) records the parting as "13 Oct, evening", from p. 120, and James (III 383) has Calder leave on the 14th.
- **The 14th.** James and Clowes give it (`h2-boulogne-cadiz.md`, British ships table). It is a log date of the kind "Civil and nautical days" already lists, and it is kept as a version.

The check's text is right. I split it into two sentences.

**Text to apply** (the whole bullet):

> - **Calder's fate.** At his own request he was tried in Portsmouth harbour on 23–26 December 1805 and cleared of cowardice and disaffection, but for an error in judgment in not renewing the action he was "severely reprimanded" (Naval Chronicle XV 174–175). Nelson let him go home in his own flagship, the Prince of Wales, which left the fleet on the evening of 13 October (Nelson to Marsden that day, Nicolas VII 120; Corbett 1910, p. 330), so he missed Trafalgar. The Victory's log enters the parting under the nautical "October 14th" (VII 121 n.), and James (III 383) and Clowes give the 14th. High.

### 2. The data do not hold what the section describes (holds; section unchanged)

**Why.** Read with node, `routes-draft.json` still has the uncorrected data:
- `villeneuve-return`, points 20–22, at {−8.98, 42.18}, {−8.88, 42.18}, {−8.80, 42.24}. That is the leg along 42°10.8′ N that ruling 1 found crossing the islet off San Martiño.
- `villeneuve-vigo-coruna`, points 2–4, unchanged.
- Both route notes still say the ría legs run "1-2 nm from the shore".
- `nelson-homeward` still reads "North of the Azores".
- `nelson-ushant-spithead` still has "the Tetuan call of 22-25 July".
- `combined-ferrol-cadiz` still says "0.2-0.4 nm from the buoys". Its note also still puts Reille's noon in table E, against ruling 11.
- `villeneuve-toulon-cadiz` still reads "middle of the Grande Rade", "about 20 nm off Benidorm" and "at least 3.5 nm".

`drafts-data.json` [3] also lags:
- `allies-noon` still has `headingTrue` 100 (ruling 17: 89);
- brief rows 2, 5 and 8 lack rulings 13 and 4.

**The section's text can stand.** Its pointer ("`research/scene-02/routes-draft.json`, with the corrections of `research/scene-02/a-v-draft-h1.md`, rulings 1, 2, 11 and 16") is accurate as a pointer, since the rulings are named. Rulings 1, 2, 11 and 16 are the right ones for "the others", the routes not yet drawn. But "How they are drawn" states the corrected Vigo legs as fact, so the data should carry the rulings' data halves before the section goes into `history-notes.md`. Stage B builds the routes from this file.

The check missed four things:
- ruling 11's data note;
- ruling 4's brief rows 5 and 8 and ruling 13's brief row 2 in `drafts-data.json` [3];
- the start clause of ruling 6;
- the "August to October" berth of issue 4, which sits in two data notes too.

**Text to apply.** None to the section. The data changes follow; they are not to be pasted into the section.

*`docs/research/scene-02/routes-draft.json`:*

- **`villeneuve-return`** (ruling 1):
  - waypoints 20–22 become:
    - `{"lon": -8.98, "lat": 42.16, "note": "est., SW of the Cíes, clear of the rocks off San Martiño"}`
    - `{"lon": -8.88, "lat": 42.17, "note": "est., the south mouth of the Ría de Vigo"}`
    - `{"lon": -8.8, "lat": 42.232, "note": "est., in the ría"}`
  - in the note, "inside the ría the line runs 1-2 nm from the shore" becomes "in the ría the line keeps about 0.5 nm or more from the shore".
- **`villeneuve-vigo-coruna`** (ruling 1):
  - waypoints 2–4 become:
    - `{"lon": -8.8, "lat": 42.232, "note": "est., in the ría"}`
    - `{"lon": -8.88, "lat": 42.17, "note": "est., the south mouth"}`
    - `{"lon": -8.98, "lat": 42.16, "note": "est., SW of the Cíes, clear of the rocks off San Martiño"}`
  - point 5 (42°27′ N 9°07.2′ W) stays as now;
  - in the note, "the ría legs run 1-2 nm from the shore" becomes "in the ría the line keeps about 0.5 nm or more from the shore".
- **`nelson-homeward`** note (ruling 2): "North of the Azores the 8 July log fix" becomes "Among the Azores, between Terceira and São Miguel, the 8 July log fix", and "keeps the line 3.3 nm off São Miguel's north coast" becomes "keeps the line about 3½ nm off São Miguel's north coast".
- **`combined-ferrol-cadiz`:**
  - **Note, first sentence** (ruling 11): it becomes "Table E: one British fix (the Iris, 14 August, Corbett 1910, p. 259 n.), the rest estimates; Reille's noon of the 15th (40 leagues WNW of Finisterre, about 43°39'N 11°48'W if its bearing is true) lies about 12 nm south of the line."
  - **Note, buoys** (ruling 16): "(0.2-0.4 nm from the buoys, as the fairway is)" becomes "(0.1–0.2 nm from the buoys and 0.4 nm from Las Puercas)".
  - **Note, end point** (issue 4): "to the berth in the outer bay of a-h2c.md, H2-36d" becomes "to the centre of the anchorage of 10–19 October (a-h2c.md, H2-36d), an estimate for 20 August".
  - **Waypoint 14 note** (issue 4): it becomes "anchored in Cádiz road (James III 375); drawn at the centre of the anchorage of 10–19 October (a-h2c.md, H2-36d), est.".
- **`nelson-ushant-spithead`** note (ruling 16): "Left out: the Tetuan call of 22-25 July (a 25-nm spur)." becomes "Left out: the detour to Tetuan (22–23 July) and back to Tarifa (25 July), a 25-nm spur."
- **`villeneuve-toulon-cadiz`:**
  - waypoint 1 note (ruling 6): "Toulon road, the Grande Rade (berths not recorded; est.). Desbrière 1907, p. 7";
  - waypoint 9 note (ruling 6): "Atlas's latitude; longitude est., about 15 nm ESE of Benidorm";
  - route note (ruling 6): "start in the middle of the Grande Rade" becomes "start in the eastern half of the Grande Rade, about 0.8 nm off its north shore";
  - route note (ruling 6): "(the line keeps at least 3.5 nm off those coasts without them)" becomes "(without them the line keeps 8.7 nm off Cabo de la Nao, 3.6 nm off the coast between Cartagena and Cabo de Gata and 5.3 nm off the Alborán Sea coasts)";
  - route note (issue 4): "not in the outer-bay berth of August-October" becomes "not in the outer-bay anchorage of 10–19 October".

*`docs/research/scene-02/drafts-data.json`, element [3]:*

- **`positions`, `allies-noon`** (ruling 17): `"headingTrue": 89`; `"spread": "three columns, Spaniards on the right, steering ESE by compass (about east true) in fog"`.
- **`positions`, `cadiz-9apr`** note (issue 4): "not the outer-bay berth of August–October" becomes "not the outer-bay anchorage of 10–19 October".
- **`briefRows[1].sources`** (ruling 13): after "A stop of about six hours on the night of 9–10 April", insert " (Corbett: 'less than four hours')".
- **`briefRows[4].sources`** (ruling 4): it becomes "Decrès's dispatch of 29 April, with the Emperor's orders of 14 April (both brought by the Didon), and Villeneuve's decision of 10 June sent him back to Ferrol first, to gather the ships there before Brest and the Channel (Desbrière 1907, pp. 30–34, 41–42)."
- **`briefRows[7].sources`** (ruling 4): append "His orders of 16 July allowed him Cádiz after a defeat, a separation or a change in the situation, and his letter of 22 August rests the turn on them (Desbrière 1907, pp. 81, 112 n.)."

### 3. Alborán and Perejil; "off Barcelona" (holds)

**Why.** `a-v-draft-h1.md` ("What changes on the chart", "Tested on Natural Earth") lists Alborán 5.4 and Perejil 3.1 as islands Natural Earth *has*. The merge appended them after a semicolon to the list of islands it lacks.
- **Natural Earth.** My run finds a small polygon for each in both the land and the minor-islands files:
  - Alborán, 35.9425–35.9455° N, 3.0364–3.0398° W;
  - Perejil, 35.9109–35.9156° N, 5.4160–5.4208° W.
- **The line's distances** to them, straight legs / curve: Alborán 7.9 / 5.3 nm, Perejil 3.4 / 3.2 nm. These agree with the ruling's curve figures within 0.1 nm, a difference of method, so the ruling's figures stand.
- **The curve's largest departure** from its straight legs is 4.39 nm, at 40°36′ N 1°50′ E. That is on the leg from row 6 (2 April noon, SE of Barcelona) to row 7 (3 April noon, east of the Columbretes), 50 nm from Barcelona on 198°. The check had 4.47 nm at the same point. "Off Barcelona" is loose.

**Text to apply** (two sentences of "Toulon to Cádiz (drawn now)"):

> Islands Natural Earth lacks (curve): Hormigas 8.4, Isla Grosa 13.4, Tabarca 18.3, Isla de Benidorm 13.2, Columbretes 19.6, Isla de Sancti Petri 4.3, Las Puercas 3.2. Islands it has (curve): Alborán 5.4, Perejil 3.1.

> The curve departs at most 4.4 nm from the straight legs, on the leg of 2–3 April between Barcelona and the Columbretes.

### 4. The anchorage "of August to October" (holds; second text refined)

**Why.** `a-h2c.md` H2-36c and H2-36e, and the section's own "Into the roadstead" (line 143), put the fleet in the outer-bay roadstead only from 9–10 October. Before that it lay further in, the Argonauta between the Puntal and Matagorda forts. "Positions on the chart" calls the drawn berth "The anchorage, 10–19 October".
- **The end point.** The Ferrol–Cádiz line ends at that anchorage's centre: 36.563 N 6.272 W against the section's 36°33.8′ N 6°16.4′ W. For 20 August that is an estimate.
- **The check's replacement for the last sentences.** It said "some ships went further in". That is softer than "Into the roadstead" ("lay at first in the inner harbour"), so the two would read differently. Pointing to that bullet keeps the fact (Argonauta between the forts) without a second, different statement of it.

**Text to apply:**

In "Toulon to Cádiz (drawn now)", replace "not the outer-bay berth of August to October" with:

> not the outer-bay anchorage of 10–19 October

In "Vigo, A Coruña, and Ferrol to Cádiz", replace the text from "The line enters Cádiz bay" to the end of the bullet with:

> The line enters Cádiz bay by the channel between Las Puercas and the El Diamante shoal, 0.1–0.2 nm from the buoys and 0.4 nm from Las Puercas, and ends at the centre of the anchorage of 10–19 October (`research/scene-02/a-h2c.md`, H2-36d; see "Positions on the chart"). That is an estimate for the evening of 20 August, when the fleet anchored in Cádiz road (James III 375); where the ships lay at first, the Argonauta between the Puntal and Matagorda forts, is under "Into the roadstead". Low.

### 5. James's "right" dates (holds; Corvo qualifier refined)

**Why.** The sentence is ruling 7's. Ruling 7 settled its framing ("French narrative", not "British reports") and the gale of 9 July. It did not weigh the two items the check raises, and the qualifiers below leave its sentence otherwise unchanged.
- **Diamond Rock.** James's 29 May is the expedition's sailing, at 5.30 p.m.; it bore down on the rock at 7 a.m. on the 31st (James III 349; `a-h1ac.md`, H1-09). So "29 May to 2 June" and "attacked from 31 May" (line 49) are both right. Side by side they look like rival dates, and the qualifier removes that.
- **Corvo.** `a-h1ac.md` (H1-15, high) gives James's statement: five frigates rejoined on 30 June, about 20 leagues NE of Corvo. The section rates "the events" high and "the 30 June and 2 July positions" medium (line 71). Its doubt (line 389) sets James's place against Reille's first sight of Corvo on 2 July.
  - A bare "Corvo 30 June" among "right" dates reads as the fleet at Corvo that day. That is the side the doubt leaves open.
  - Keeping the date and doubting only the place matches both H1-15 and the section's split confidence.
  - The check's "where they rejoined is disputed" implies a rival place that no source gives. Only James's place fails to fit Reille, so I say the place is doubtful.

**Text to apply** (the sentence from "Other dates"):

> Other dates in his French narrative are right: the San Rafael at Martinique on 16 May, Diamond Rock 29 May to 2 June (the expedition sailed on the 29th and opened the attack on the 31st, III 349), Basse-Terre 6 June, the convoy 8 June, the five frigates rejoining on 30 June (the place he gives, about 20 leagues NE of Corvo, is doubtful; see "Open doubts"); his 9 July for the gale is his conversion of the Moniteur letter's "21 messidor" (10 July) and matches Reille's 20 messidor (9 July) only by chance (James III 351, 353).

### 6. Nelson north to Ushant and the Channel fleet (holds; text refined)

**Why.** `a-h1b.md` S6-CORNWALLIS (both-partly, medium) gives a final statement for the history notes. The research README's rule is that the adjudication's final statement goes into `history-notes.md`.
- **What the final statement says.** It has three figures:
  - 24 of the line in sight at noon on 15 August (signal log, Nicolas VII 4);
  - about 40 with Calder's ships and Nelson's 11 (Desbrière p. 88);
  - some 36 later, besides the Dragon and Goliath (Corbett p. 240).
- **What was lost.** The draft and the merge keep only the 24. The data's fleet row "Nelson joins Cornwallis, then home" (`drafts-data.json` [3], fleetRows[19]) was dropped when the lead wrote the table. The section's routes still carry Nelson's line on to Ushant and Spithead (tables F–J).
- **Corbett p. 240, read in full.** Cornwallis sent Nelson and the Victory home, and Stirling's Glory went in with several others needing a refit. After that he had some thirty-six of the line with his flag or on their way to join it, besides the Dragon and Goliath, away to the south. The check's "after Nelson's went in" would put all eleven in. Nine of them stayed with Cornwallis, and the text below corrects that.
- **The rows.** They follow the check's placement, by start date.

**Text to apply:**

In "Fleet sizes at each stage", after the row "After Finisterre":

> | Nelson north to Ushant | 25 July – 15 August | 11 | 11 | High |

After the row "Leaving Ferrol":

> | Nelson joins Cornwallis off Ushant | 15 August | 11 join the Channel fleet (24 of the line in sight at noon): about 40 with Calder's ships and Nelson's (Desbrière); some 36 with the flag or on their way to it once the Victory and the ships needing a refit had gone in, besides the Dragon and Goliath (Corbett). Nine stay with Cornwallis; the Victory and Superb go on to Spithead | 11, then 2 | High for 11 and 2, medium for the Channel fleet |

In "Nelson's pursuit", the whole bullet "North":

> - **North.** He watered at Tetuan on 22–23 July. Off Tarifa at about 3.30–4 a.m. on 25 July (3.30 by Mahan; "four o'clock" in Nelson's letter to Collingwood) the sloop Termagant brought a Lisbon paper with the Curieux's news, and he went north at once against northerly winds; his diary has 39°1′ N 16° W on 3 August and 41°8′ N 18°14′ W on the 7th (Desbrière 1907, pp. 74–75). On 15 August he joined Cornwallis off Ushant and left him nine ships, then anchored with Victory and Superb at Spithead at 8.30 a.m. on 18 August and struck his flag on the 19th (Nicolas VII 4–8). The Victory counted 24 of the Channel fleet's ships of the line in sight at noon on the 15th (Nicolas VII 4). With Calder's ships, just rejoined, and Nelson's eleven, Cornwallis briefly had about 40 (Desbrière 1907, p. 88); once Nelson's flagship and the ships needing a refit had gone in, he had some 36 with his flag or on their way to it, besides the Dragon and Goliath, away to the south (Corbett 1910, p. 240). High; medium for the Channel fleet's strength.

### 7. Maurice's "Ferrol Squadron" and the American off Tobago (holds; text refined)

**Why.** `a-h1b.md` gives final statements for both points: MISSED-4 (checker-right, high) and S3-AMERICAN (checker-right, medium-high). Neither the draft nor the merge has them. Both explain why Nelson went south to Trinidad and why he took the enemy for stronger than it was. I read the pages:
- **Nicolas VI 451** (Nelson to Marsden, 11 June). Off Tobago at noon on the 6th he heard of an American ship that had arrived the day before. A ship of the French fleet had boarded her to windward of St Vincent three days earlier, and the fleet was standing south.
- **Nicolas VI 448 n.** (Clarke and M'Arthur). Here an American brig spoken by the Curieux reported that she had been boarded a few days before by the French fleet off Grenada, the fleet standing towards the Bocas of Trinidad. `a-h1b.md` includes this version in its final statement, and the section's rule is to give each version with who holds it.
- **Nicolas VI 449** (diary, 8 June). Maurice's letters said the French commodore had told him the "Ferrol Squadron", six French and eight Spanish, had reached Fort Royal on 4 June.
- **Nelson's doubt.** On the 8th Nelson wrote that he gave the commodore's story "but little credit" (VI 448, to Marsden). To Lord Seaforth he wrote that he doubted it (VI 449).
- **Magon.** Only Magon's two 74s arrived that day (`a-h1b.md`, MISSED-4; "At Fort-de-France").

**Text to apply** (the whole bullet):

> - **Trinidad.** On a report from St Lucia that 28 sail had passed Gros Islet on the night of 28 May, Nelson embarked about 2,000 troops and sailed south at 9.30 a.m. on 5 June. Off Tobago at noon on the 6th he heard of an American ship, arrived the day before, that had been boarded by a French ship to windward of St Vincent three days earlier, the enemy standing south (Nelson to Marsden, 11 June, Nicolas VI 451; Corbett 1910, p. 162). Clarke and M'Arthur tell it differently: an American brig spoken by the Curieux had been boarded a few days before by the French fleet off Grenada, standing for the Bocas of Trinidad (Nicolas VI 448 n.). At 6.10 p.m. a schooner made, by chance, the signal for the enemy at Trinidad. On the 7th he went through the Bocas into the Gulf of Paria ready for battle and found nothing. At daylight on the 8th he learned the enemy had been at Martinique on the 4th. Maurice, late of Diamond Rock, also passed on the French commodore's word that a "Ferrol Squadron" of six French and eight Spanish ships had reached Fort Royal on 4 June; Nelson gave it little credit, and only Magon's two 74s had come (Nicolas VI 446–451; diary, VI 449). High; medium for the American's report.

### 8. Corbett's rejection of the staff map (holds)

**Why.** The data's doubt said "Desbrière's staff map, rejected by Corbett" (`drafts-data.json` [3], openDoubts[12]). So do `h1-campaign.md` §5 ("Corbett rejects it") and `v-h1c.md` (H1-32, Corbett p. 261 n.). I read the footnote. Corbett says the fleet cannot have been as far north of Ferrol's latitude as the French staff map shows, since it was off Cádiz eighty hours after turning south. The merged text gives the map's position bare, as if it were a version equal to Reille's.

Corbett cites the map from Desbrière's earlier volumes ("v. 782"), not from the 1907 book. The 1907 book's "Situation au 15 août" (leaf n126) shows what he rejects: the fleet near 44°40′ N, more than a degree north of Ferrol's 43°29′. So his rejection applies to it.

**Text to apply:**

In "The turn, 15 August", replace "Desbrière's staff map has the fleet near 44°40′ N 12°25′ W;" with:

> Desbrière's staff map has the fleet near 44°40′ N 12°25′ W, which Corbett rejects as too far north for a fleet that was off Cádiz eighty hours after the turn (p. 261 n.);

In "Open doubts", "The turn south and Cádiz", replace "Desbrière's staff map puts the fleet near 44°40′ N 12°25′ W." with:

> Desbrière's staff map puts the fleet near 44°40′ N 12°25′ W (rejected by Corbett, p. 261 n.).

### 9. Brief rows 1 and 2: the stragglers; italics (holds)

**Why.** The stragglers option was lost when the lead wrote the table, before the merge. The data's row 2 had "14 glyphs on the crossing (4 more apart if stragglers are drawn)", which is `a-h1b.md`'s scene impact 1. The owner has not decided whether the stragglers are drawn (`drafts-data.json` [3], ownerQuestions[2]), so the option belongs in the row.

Ship names are roman in every bullet of the section and in scene 1's notes ("The setting", "The fleets"). The only italic ship names in the whole section are *Atlas* (rows 1 and Key sources), *San Rafael* (row 2) and *Didon* (row 4).

**Text to apply** (the two rows):

> | Villeneuve breaks out of Toulon on 29 or 30 March | He weighed at about 4 p.m. on 30 March (Reille, the Atlas's log, his letter of 9 germinal; Nelson: "in the night of Saturday, March 30th"). 29 March is James's slip in converting the Republican date, copied by Clowes | 30 March 1805 | High |
> | He collects Spanish ships at Cádiz and crosses to Martinique | A stop of about six hours on the night of 9–10 April (Corbett: "less than four hours"). Of 18 ships of the line nominally together, 14 crossed in company; three Spaniards met him at Martinique on 14 May and the San Rafael on the 16th | 14 glyphs on the crossing (4 more sailing apart if the stragglers are drawn), 18 at Martinique | High |

In "Key sources", the Desbrière entry: "the *Atlas*'s tables" becomes "the Atlas's tables". Row 4 is under 10.

### 10. Brief row 4: "across the Atlantic and back" (holds)

**Why.** The lead joined the data's rows 4 and 5 into one. Its "the captions can keep the plan's aim" covers "races back for the Channel" but leaves Nelson's half unjudged.
- **The data's judgement.** On Nelson's half the data said "'and back' holds only loosely" (`drafts-data.json` [3], briefRows[3]). He came home by Gibraltar, on another track, and never caught up.
- **Still open.** Beat 2's caption is not among the owner's decisions of 1 November (ownerQuestions[1]), so the row should keep the caveat.

**Text to apply** (the whole row):

> | Beat 2: "races back for the Channel"; Nelson "follows him across the Atlantic and back" | Decrès's dispatch of 29 April, with the Emperor's orders of 14 April (both brought by the Didon), and Villeneuve's decision of 10 June sent him back to Ferrol first, to gather the ships there before Brest and the Channel (Desbrière 1907, pp. 30–34, 41–42). Homeward the tracks parted: Villeneuve went north of the whole Azores group for Ferrol; Nelson went south of the western and central Azores and through the group, north of São Miguel, to Cape St Vincent and Gibraltar (19 July), then north to Ushant (15 August), and never caught up | Villeneuve's line heads for Ferrol; Nelson's runs south of it to Gibraltar; the captions can keep the plan's aim, and "across the Atlantic and back" holds only loosely, since Nelson came home by another track | High |

### 11. Fleet table intro (partly: the owner's decision 1)

**Why.** The check is right on two counts.
- **Process language.** "The lab shows…" is the kind of phrasing the section must not use.
- **Mismatch with the table.** The parenthetical sits badly against the chase rows: the chart now draws three glyphs at the head of the Toulon–Cádiz line (`fleets.ts`, `ROUTE_SQUADRON`) against the table's 11.

**The decision overrides the check's replacement.** That text ("The chart now draws … six for each fleet at Cádiz and at dawn") keeps describing the Stage A lab's six-a-side layout. The owner's decision 1 withdraws the spread-out dawn layout and asks the section to describe the layout and its sources, not the old lab's. Stage B, which starts as the section is merged, sets the glyphs again. So the intro should only define the column and point to where the chart's present state is described. "Routes on the chart" already says three glyphs sail at the head of the Toulon–Cádiz line.

**Text to apply** (the paragraph):

> Ships of the line only; frigates and smaller craft are in the sections above. "Glyphs" is how many ship glyphs the full scene shows at that moment; what the chart draws now is under "Routes on the chart" and "Positions on the chart".

### 12. "At Fort-de-France": the split confidence (holds)

**Why.** The style splits confidences. The Didon's date has four versions (`a-h1ac.md`, H1-10: Mahan 29 May, Reille 30 May, Corbett 31 May, James 1 June). Conflicting sources are "low" on the scale. Magon's junction is Desbrière and Corbett against James (`a-v-draft-h1.md`, doubt 12), which is medium.

**Text to apply** (the bullet's last sentence):

> High; low for the Didon's date, medium for where Magon joined.

### 13. The bear-away position (holds)

**Why.** "Bearings" (line 35) says positions worked from bearings say which reading they use. `a-h1b.md` (S3-11MAY, "Computing the bore-away position") gives three positions:
- 36°43′ N 8°45′ W, reading the bearing as true;
- 36°49′–50′ N 8°37′–38′ W by compass with 20–24° W;
- about 36°47′ N 8°41′ W, ±5 nm, taking the two together.

The bullet gives only the last. The wording follows the section's own form for Reille's noon of 15 August.

**Text to apply** (the clause in "Lagos and the bear-away"):

> …and at 6.50 p.m. bore up for the West Indies with Cape St Vincent NW by N 7 leagues: about 36°43′ N 8°45′ W if the bearing is true, 36°49′–50′ N 8°37′–38′ W by compass, so about 36°47′ N 8°41′ W, ±5 nm (Nicolas VI 433; `research/scene-02/a-h1b.md`, S3-11MAY).

## Also noticed (not in the check)

- **"To A Coruña": the two Spaniards.** The data's fleet row "At A Coruña and Ferrol" (`drafts-data.json` [3], fleetRows[10], Desbrière 1907, p. 86) named the two Spaniards who went on into Ferrol: the Argonauta and Terrible, the survivors of Gravina's six. The section says only "the two Spaniards". This is optional. If wanted, in "To A Coruña", "the two Spaniards went on into Ferrol" becomes "the two Spaniards, the Argonauta and Terrible, went on into Ferrol".
- **`routes.ts`'s doc comment.** It cites `draft-h1.md` "as checked in v-draft-h1.md and ruled in a-v-draft-h1.md". Once the section is merged it could cite `docs/history-notes.md`, "Scene 2", "Routes on the chart". This is code, not the section; the check said the same.

## The owner's decisions in this scope

- **Decision 1** (true dawn spacing; the spread-out licence withdrawn) overrides the check's replacement text for the fleet-table intro (issue 11). Nothing else in the chase describes the dawn layout.
- **Decision 2** (047° kept as a deliberate licence) and **decision 3** (the caption "a chain of frigates and ships of the line"): nothing in the chase. The check's list of the lines they touch elsewhere in the section is for the agent that applies them.

## Evidence and sources

- **Nicolas, N. H.** (ed.), *Dispatches and Letters of … Nelson*:
  - **Vol. VI (1845):**
    - p. 433, the bear-away (log): https://archive.org/details/dispatchesletter06nelsiala/page/n472/mode/1up
    - p. 448 and n. (to Marsden, 8 June; Clarke and M'Arthur on the American brig): https://archive.org/details/dispatchesletter06nelsiala/page/n487/mode/1up
    - p. 449 (diary, 8 June, Maurice's report; to Lord Seaforth): https://archive.org/details/dispatchesletter06nelsiala/page/n488/mode/1up
    - p. 451 (to Marsden, 11 June, the American off Tobago): https://archive.org/details/dispatchesletter06nelsiala/page/n490/mode/1up
  - **Vol. VII (1846):**
    - p. 4 (signal log, 15 August): https://archive.org/details/dispatchesletter07nelsuoft/page/n39/mode/1up
    - p. 120 (to Marsden, 13 October): https://archive.org/details/dispatchesletter07nelsuoft/page/n155/mode/1up
    - p. 121 n. (the log's "October 14th"): https://archive.org/details/dispatchesletter07nelsuoft/page/n156/mode/1up
- **Corbett, J. S.**, *The Campaign of Trafalgar* (1910):
  - p. 162: https://archive.org/details/campaignoftrafal00corb/page/n189/mode/1up
  - p. 240 (Cornwallis's strength after Nelson went home): https://archive.org/details/campaignoftrafal00corb/page/n271/mode/1up
  - p. 261 n. (Reille's noon read true; the staff map rejected): https://archive.org/details/campaignoftrafal00corb/page/n294/mode/1up
  - p. 330 (Calder parts on the evening of the 13th): https://archive.org/details/campaignoftrafal00corb/page/n365/mode/1up
- **Desbrière, É.**, *La campagne maritime de 1805: Trafalgar* (1907):
  - p. 88 (Cornwallis "forte de 40 vaisseaux"): https://archive.org/details/la-campagne-maritime-de-1805/page/n111/mode/1up
  - annexes p. 8 (Escaño: the Argonauta between Puntal and Matagorda): https://archive.org/details/la-campagne-maritime-de-1805/page/n277/mode/1up
  - staff map "Situation au 15 août": https://archive.org/details/la-campagne-maritime-de-1805/page/n126/mode/1up
- **James, W.**, *The Naval History of Great Britain*, vol. III (1886):
  - p. 349 (Diamond Rock expedition sailed 29 May): https://archive.org/details/navalhistoryofgr03jameuoft/page/n364/mode/1up
  - p. 353 (five frigates, 30 June): https://archive.org/details/navalhistoryofgr03jameuoft/page/n368/mode/1up
  - p. 375 (Cádiz road, 20 August): https://archive.org/details/navalhistoryofgr03jameuoft/page/n390/mode/1up
  - p. 383 (Calder leaves on the 14th): as read in `a-h2b.md`, H2-19a. Its leaf was not verified here.
- **Natural Earth** 1:10m land and minor islands (`data/raw/natural-earth/`): https://www.naturalearthdata.com/downloads/10m-physical-vectors/
- **Repository files:**
  - `docs/research/scene-02/a-v-draft-h1.md`: rulings 1, 2, 4, 6, 7, 11, 13, 16 and 17; "What changes on the chart"; doubt 12.
  - `docs/research/scene-02/a-h1b.md`: S6-CORNWALLIS, MISSED-4, S3-AMERICAN, S3-TOBAGO, S3-11MAY; scene impacts 1 and 7.
  - `docs/research/scene-02/a-h1ac.md`: H1-09, H1-10, H1-15, H1-02b.
  - `docs/research/scene-02/a-h2b.md`: H2-19a.
  - `docs/research/scene-02/a-h2c.md`: H2-36c, H2-36d, H2-36e.
  - `docs/research/scene-02/v-h1c.md`: S4-Nelson, H1-32.
  - `docs/research/scene-02/v-h2b.md`: H2-18g.
  - `docs/research/scene-02/h1-campaign.md`: §5.
  - `docs/research/scene-02/h2-boulogne-cadiz.md`: British ships table.
  - `docs/research/scene-02/drafts-data.json`, element [3]: briefRows, fleetRows, positions, openDoubts, ownerQuestions.
  - `docs/research/scene-02/routes-draft.json`.
  - `src/scenes/02-road/routes.ts`, `fleets.ts`.
  - `src/components/chart/lines/Route.ts`, `src/components/chart/geo/mercator.ts`.
- **Scripts:** `scratchpad/scripts/amh1-geo.js`, `amh1-islands.js`, `amh1-leaves.js`.
