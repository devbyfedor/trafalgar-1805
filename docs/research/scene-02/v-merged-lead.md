# V-merged-lead: check of the frame, the names and the rules (merged "Scene 2" section)

Written 1 November 2026 (session 10). The object is `docs/research/scene-02/history-scene-02-merged.md` (434 lines). My scope:
- the opening and the "Where the sources changed the brief" table;
- "Fleet sizes at each stage";
- "Assumptions and licences";
- "The names on the chart";
- "Open doubts";
- "Key sources";
- the whole section against scene 1's sections of `docs/history-notes.md`;
- the whole section against the repository's rules.

I edited no repository file. Line numbers are those of the merged file.

## Verdict

The frame is sound in substance: every row of the brief table and of the fleet table agrees with the body on its numbers and dates, every names ruling of `a-v-a-h4.md` is applied with its text, and every lettered form the section names is the form `gazetteer.ts` sets. Nothing in the section contradicts scene 1's notes except the two dawn licences, which the section declares.

The faults are of five kinds:
- **Tangier** is filed under "For later scenes", although the chart letters it now.
- **The licence list is incomplete.** It misses:
  - the group-gives-way-to-its-lead rule;
  - the three glyphs that stand for Villeneuve's eleven;
  - the composite march line;
  - the route simplifications;
  - several estimates.
- **"Open doubts"**:
  - invents unnamed "accounts" for a slip that was only ever in our own drafts;
  - says the date line shows Rosily's arrival, which falls after the battle;
  - misses about fifteen versions that the body states.
- **Quotations.** About fifteen quoted strings are the words of modern authors (Corbett 1910, Desbrière 1907). Four are translations or paraphrases presented as a source's words.
- **Smaller points:**
  - process language ("the lab", "the check of the ruling", a check file cited as a source);
  - one confidence contradiction;
  - three off-by-one archive.org leaves (Beatty 1825);
  - inline sources missing from "Key sources".

Every table has the right number of cells.

## Method

- **Read in full:** the merged section; `draft-lead.md`; `a-h4.md`; `v-a-h4.md`; `a-v-a-h4.md`; `a-v-draft-h1.md`; `a-v-draft-h2.md`; `v-draft-h3.md` (points 6, 24, 25 and 27 for my scope); `src/scenes/02-road/gazetteer.ts`, `fleets.ts` and `routes.ts`; `docs/history-notes.md`; `docs/decisions.md` (Scene 2, Stage A); `docs/research/README.md`; `docs/research/scene-02/README.md`.
- **The structured data**, read with node: from `drafts-data.json`, every element's `openDoubts`/`doubts`, `ownerQuestions`, `briefRows` and `fleetRows`; the `dates` of elements 0, 1 and 3; and element [2]'s settled table and conventions.
- **Scripts** in the session scratchpad (`scripts/mdcheck.js`, `scripts/pagenums.js`):
  - every table row's cell count;
  - every double-quoted and italic string, with its line;
  - archive.org printed-page-to-leaf maps.
- **Page images read** (archive.org, saved under `scratchpad/dl/vml-beatty1825/` and `scratchpad/dl/vml-leafcheck/`):
  - Beatty 1825, leaves n11 (p. 2), n12 (p. 3) and n108 (p. 97);
  - Maude 1912, n121 (p. 90);
  - NRS II, n162 (p. 145);
  - Nicolas VII, n171 (p. 136);
  - Hudson 1917, n26 (p. 21).
  The printed-page map of Fraser 1906 gives p. 29 = n54 and p. 88 = n119.
- **Computed by me:**
  - the chart's positions, from the code's decimal degrees converted to degrees and minutes;
  - the Victory's 9.30 position from 16 leagues ESE by compass with 21° W, which gives 36°33′ N 7°19′ W (36°33.8′ N with 20° W).

## Issues, most severe first

| # | Where | Kind | Severity |
| --- | --- | --- | --- |
| 1 | Names: "Other names" and the on-chart doubts | factual-error | medium |
| 2 | Assumptions and licences | omission | medium |
| 3 | Open doubts: "The orders the Didon brought" | unsupported | medium |
| 4 | Open doubts: "Cádiz: orders, Rosily and the fleet in port" | factual-error | medium |
| 5 | Open doubts: versions the body states but the doubts lack | missing-version | medium |
| 6 | Whole section: modern authors' words in quotation marks | quotation | medium |
| 7 | Whole section: translations and paraphrases in quotation marks; prints not named | quotation | low |
| 8 | Brief table: flotilla row, confidence | internal-contradiction | low |
| 9 | Fleet sizes: the intro's "the lab shows six for each fleet" | chart-mismatch | low |
| 10 | Fleet sizes: a missing stage, two qualifiers, Lauriston's count | lost-in-merge | low |
| 11 | Key sources: Beatty 1825 leaves | factual-error | low |
| 12 | Key sources: inline sources not listed; two orphans | omission | low |
| 13 | Whole section: process language; a check file cited as a source | style | low |
| 14 | Brief table: details dropped from the scene cells | lost-in-merge | low |
| 15 | Names: small consistency points | style | low |

### 1. Tangier is filed under "For later scenes" though the chart letters it now (medium, factual-error)

**Where.**
- "The names on the chart", "For later scenes, settled the same way", bullet "Other names" (line 379).
- The list "Where the period's own sources disagree" (lines 357–368), which has no Tangier entry.

**Problem.**
- `gazetteer.ts` letters "Tangier" (role place, 35.76 N 5.834 W).
- `a-h4.md` lists Tangier among the 34 names "On the chart now", and its doubt 14 is Tangier.
- `drafts-data.json` [2] has `onChartNow: true` for it.
- The section gives Tangier's alternatives only in the later-scenes list (an error copied from `draft-lead.md`), and leaves it out of the on-chart doubts.

**Fix.**
- **(a)** In "Other names", delete exactly: `Tangier (Faden, Heather 1800 and c. 1809, Cary 1801, Nelson, Malham; Tangiers on Cary 1804); `
- **(b)** After the bullet "**Straits of Gibraltar.**", add:

> - **Tangier.** The chart letters Tangier, as Faden 1807, Heather 1800 and his Strait plate of about 1809, and Cary 1801 engrave it; Nelson (9 times, Tangiers once), Malham (17 to 0) and Brookes (3 to 0) write it. Tangiers: Cary's *Europe* (1804). Tanger: Laurie & Whittle 1794.

**Evidence.**
- `gazetteer.ts`, lines 113–122.
- `a-h4.md`: the ruling row "Tangier" (line 33); the settled row (line 86, alternatives "Tangiers (Cary 1804); Tanger (L&W 1794)"); doubt 14 (line 260).
- `drafts-data.json` [2] `finalNames`, "Tangier" (`onChartNow: true`).

### 2. "Assumptions and licences" misses licences the scene takes (medium, omission)

**Problem.** These are taken elsewhere in the section, or by the code and `decisions.md`, but are not listed:

- **(a) A group gives way to its lead.**
  - Seen from far off, a fleet's other ships fade and its lead stands for it.
  - Source: `docs/decisions.md`, "A group gives way to its lead"; `fleets.ts`, the `spacing` fields.
  - The section never mentions it, although it decides how many glyphs a view shows. It is the rule the owner's decision 1 relies on ("each fleet shows only its flagship").
  - A mismatch outside the section: `decisions.md` names "the lead of Collingwood's group" as a lead, but `fleets.ts` gives that ship (the 98 at 36.035 N) a spacing of 13.5 km, her distance from the Victory. Only the Victory and the Bucentaure stand alone.
- **(b) Three glyphs for eleven.** Three glyphs, an 80 and two 74s, sail at the head of the Toulon–Cádiz line for Villeneuve's eleven (line 305; `fleets.ts` `ROUTE_SQUADRON`). Licence 3 says only "six ships for each".
- **(c) The march line is a composite.**
  - "The dashed line" (line 117) calls it "a composite, labelled as the army", and `a-h2a.md` R6 rules the same.
  - No corps marched the whole of it.
- **(d) The routes are simplified** (lines 306–309):
  - points dropped as zigzags or doublings back;
  - short detours left out;
  - no day marks on the crossing;
  - Villeneuve's daily marks stopping on 24 June;
  - Nelson's Mediterranean line starting at Pula.
- **(e) Licence 7 lists only some estimates.** Missing:
  - the Toulon–Cádiz points marked "est." (rows 11, 13, 15–17 and 19);
  - the estimated tracks between named places on Villeneuve's way home and round Finisterre;
  - Nelson's beat west;
  - the control points that keep curves off the coast;
  - the single ships of the 19 October chain;
  - the Boulogne flotilla's line.
- **(f) Counted guns on the 19th.** "One link" (line 235) shows "a counted pair or three of white gun puffs" at every link on the 19th. The brief table (line 26) says counted guns with each hoist are logged only on the 20th. Licence 8 covers the held hoists and the wear lights, but not this. The night's paired blue lights are the reading of `a-h3.md` R18 (medium), which could be said in the same item.

**Fix.** Replace items 3, 7 and 8 as below, and add items 10 and 11.

Item 3 overlaps the owner's decision 1. The agent applying it should keep the group-lead sentence, and change "six ships for each" only if the dawn glyph count changes.

> 3. **Glyphs and counts.** Ships are glyphs drawn far larger than true scale, as a chart convention, and each is kept to the open water beyond it, so that none stands on the chart's shore (`docs/decisions.md`, "No glyph stands on the shore"). Seen from far off, a fleet gives way to its flagship: the other ships fade once they crowd together on screen, and the Victory or the Bucentaure stands for the fleet, as a chart of a larger area shows a fleet by one ship (`docs/decisions.md`, "A group gives way to its lead"). The chart now shows the anchorage of 10–19 October and the dawn of 21 October at once, with six ships for each, and three glyphs, an 80 and two 74s, for Villeneuve's eleven at the head of the Toulon–Cádiz line; the full scene gives each moment its beat and the counts of "Fleet sizes at each stage".

> 7. **Estimated points.** Positions no source fixes are estimates inside the sources' range: the Toulon berth; the Atlas's longitudes for 4–8 April and the Toulon–Cádiz line's other points marked "est." (south of Cabo de Palos and of Cabo de Gata, through the Strait and in the offing of Cádiz); the 4 p.m. point off Conil; the anchorage of 9 April; the tracks between the named places on Villeneuve's way home and round Finisterre into Vigo and A Coruña; Nelson's beat west in April; the control points that keep the curves off the coast (north of Capo San Vito, and at 37°58′ N 26°05′ W off São Miguel); the Finisterre smoke; the bend of 15 August; the moorings of 10–19 October; the single ships of the chain of 19 October; the flotilla's line in the road at Boulogne; and every position of the night of 20–21 October.

> 8. **Signals by the book.** The day relay holds each hoist until the Victory's answer runs back, and the night wears show two lights at the ensign staff and one at the bowsprit end: both follow the 1799 rule books, and no log of those days records them. Each link of 19 October also fires a counted pair or three of guns with its hoist, as the Euryalus's signals did on the 20th; for the 19th the logs record only the Phoebe's three-minute guns and a ship firing guns seen from the fleet. The night's leading motif, two blue lights together every hour, follows Nelson's code on the reading that the enemy stood south (see "Which half of the code").

> 10. **The army's march.** The dashed line from Boulogne to Ulm is a composite, labelled as the army: no single corps marched the whole of it. Boulogne to Donauwörth was the road of Soult's IV corps, from the Boulogne camps; Soult then turned south, and Ney's VI corps fought at Elchingen and took Ulm (see "The dashed line"; `research/scene-02/a-h2a.md`, R6).

> 11. **Routes simplified.** A route keeps the positions that give its shape and drops those that would make it zigzag or double back, or that do not fit: on the crossing 8 and 11 May; on Villeneuve's way home both 19 June positions of the Curieux, James's 30 June point, the doubtful noon of 23 July and the 27 July letter's 40 leagues WSW of Finisterre; on Nelson's line 24 June, 4 and 6 July and 2, 4, 5 and 6 August; and Nelson's line in the Mediterranean starts at Pula. Short moves are left out: Nelson's detour to Tetuan and back to Tarifa (22–25 July), Villeneuve's stand towards Cape Prior after leaving Ferrol, and the chase of Collingwood on 20 August. The crossing has no day marks, and Villeneuve's homeward daily marks stop on 24 June (see "Routes on the chart").

**Evidence.**
- `docs/decisions.md`: "A group gives way to its lead"; "No glyph stands on the shore"; "Ship glyphs".
- `fleets.ts`: `LAB_MARKS` spacing fields; `ROUTE_SQUADRON`.
- The merged section: lines 117, 235, 26, 304–309 and 343–346.
- `a-h2a.md` R6; `a-h3.md` R18; `v-draft-h3.md` point 27.

### 3. "The orders the Didon brought" invents unnamed holders for our own slip (medium, unsupported)

**Where.** Open doubts, bullet "The orders the Didon brought" (line 386).

**Problem.**
- The bullet says that "accounts that speak of 'Napoleon's orders of 29 April' run the two together".
- The only holders of that phrase were the project's own drafts. `a-v-draft-h1.md` doubt 3 reads: "The draft, the lead and the data call them…".
- The merge replaced them with unnamed "accounts". The section now attributes a version to outside sources that nobody has named. It is not a version held by a source; it was our slip, and it is fixed.
- The bullet also blurs which document carried which order.

**Fix.** Replace the bullet with:

> - **The orders the Didon brought.** Decrès's dispatch of 29 April, with a copy of the Emperor's orders of 14 April (Desbrière pp. 31–34; Villeneuve's letter of 1 June). The 35-day wait came from the Emperor's orders; the dispatch pressed the attack on the islands, and its postscript of 1 May the return to Ferrol in any case (see "The plan"). She reached Martinique on 29 May (Mahan), 30 May (Reille), 31 May (Corbett) or 1 June (James).

**Evidence.**
- `a-v-draft-h1.md`, ruling 4 ("The same slip … is in the draft's 'At Fort-de-France' bullet and in two brief rows") and doubt 3.
- The merged section, line 39 ("The plan").

### 4. The date line does not show Rosily's arrival (medium, factual-error)

**Where.** Open doubts, bullet "Cádiz: orders, Rosily and the fleet in port" (line 396): "the date line shows 23–25 October 1805".

**Problem.**
- Rosily reached Cádiz after the battle. The scene's date line runs to 21 October.
- The data's date entry has `where: "not shown"`. `a-v-draft-h2.md` A24 changed only its display form to "23–25 October 1805".
- As written, the section tells the builder to put a post-battle date on the date line.

**Fix.** Replace "; the date line shows 23–25 October 1805." with:

> ; his arrival falls after the battle, so the date line does not show it, and a caption that names it says 23–25 October 1805.

**Evidence.**
- `drafts-data.json` [1] `dates[15]` (`where: "not shown"`).
- `a-v-draft-h2.md` A24.
- The brief's beats 4–5 (the scene ends at dawn on 21 October).

### 5. Versions the body states that "Open doubts" lacks (medium, missing-version)

**Problem.** The body (or the data) gives each of these as "by X, or by Y", but the doubts list does not. Each should be added to the bullet named.

**Fix.**
- **"Toulon to Cádiz, 30 March to 10 April".**
  - Insert at its start: `The sailing: 30 March (Reille, the Atlas's log, Villeneuve's letter of 9 germinal; Nelson) or 29 March (James III 339, his conversion slip; Clowes).`
  - In the Strait sentence, change "Adkin" to "Adkin, as Wikipedia cites him". Adkin was never read; `v-h1a.md` H1-05 has "Adkin (per Wikipedia)".
- **"The crossing and the West Indies"**, append: `Martinique reached on 14 May (Villeneuve's report, Desbrière 1907, pp. 25–26) or 13 May (James, his conversion slip; Clowes gives both).`
- **"Nelson's pursuit"**, append: `The anchoring in the Gulf of Palmas: 26 March (the log, civil; Nicolas VI 374) or 27 March (James; Nicolas's chronology: the log date). Corbett has him at Ustica on 7 April, against his letters, which put him off Palermo on 9–10 April. In Gibraltar Bay on 6 May (the log) or 7 May (James: the log date). Off Cape St Vincent from the evening of 10 May (Corbett, not in the log) or only after weighing from Lagos at 9.10 a.m. on 11 May (the log); Knight's arrival on 11 May (the log) or 12 May (James, Clowes: the log date). His squadron: ten names (Nicolas VI 432 n.; Corbett p. 108) or nine (James, Clowes). St John's Road, Antigua, on 12 June (the log) or 13 June (James, Clowes and the Decade's journal: log dates); Tetuan left on 23 July (the log) or "the 24th at noon" (James: the log date).`
- **"Boulogne"**, append: `The craft's rigs: bateaux canonniers and péniches lug-rigged (Desbrière, *Projets* III 90 and the plate facing it), or some gun-vessels schooner-rigged and the péniches mostly schuyts (James III 216–217).`
- **"Cádiz: orders, Rosily and the fleet in port"**, append: `The orders sending Villeneuve into the Mediterranean are dated 14 September (Corr. XI No. 9210) and the letter on his pusillanimity 15 September (No. 9220); James and Clowes date the orders 17 September, and James the letter too (III 378; research/scene-02/v-h2c.md, H2-26a). The council of war of 8 October: fourteen signed (Desbrière 1907, annexes 97–100), and Desbrière's narrative leaves out the Spanish brigadier Hore; the argument that the allied crews were unpractised was Escaño's (Desbrière 1907, annexes 97–100) or Prigny's (Corbett p. 324).`
- **"The relay of 19 October"**, append: `The Sirius's telegraph of the topsail yards: 6.04 by the Euryalus's signal log (NRS II 160), 6 by Corbett (p. 333), entered under the "At 4" watch heading in the Sirius's log (NRS II 312).`
- **"The turn south and Cádiz"**: after "Desbrière's staff map puts the fleet near 44°40′ N 12°25′ W", add `, a position Corbett rejects`.
- **"Not consulted first-hand"**, append before the full stop: `; Adkin's *Trafalgar Companion* (2005), known only as Wikipedia cites it; the *Précis des événements militaires*, known only as James quotes it (III 375)`.

**Evidence.**
- The merged section:
  - line 13 and line 40 (29 March);
  - line 48 (13 May);
  - line 55 (27 March);
  - line 57 (Ustica);
  - line 58 (7 May);
  - line 59 (10 May; Knight 12 May in line 30);
  - line 60 (nine names);
  - line 30 (Antigua 13 June, Tetuan "24th at noon");
  - line 103 (schooners, schuyts);
  - line 142 (Hore, Prigny);
  - line 207 (Corbett's six o'clock).
- `drafts-data.json`: [1] `dates[5]` (James and Clowes, 17 September); [3] `openDoubts[12]` (staff map rejected by Corbett).
- `v-h2c.md`: H2-26a, and line 260.
- `v-h1a.md`, H1-05.
- `v-h1b.md`: S3-LAGOS-DEP; S3-ANTIGUA (the Decade's journal).

### 6. Modern authors' own words in quotation marks (medium, quotation)

**Problem.**
- The task's rule: anything from a source after about 1900 is paraphrased, unless it is the period document's own words that the modern book prints.
- A note for the ruling: `docs/research/README.md` lists Corbett 1910, Fraser 1906 and Desbrière 1907 among the public-domain sources from which a short phrase may be kept "where the exact wording is the evidence". In every case below the wording is a number, a time or a summary, not evidence, so paraphrase satisfies both rules.
- Strings that are not modern and are allowed: the No. 370 wordings (the signal book's words, via the NRS editor, Cumby and Corbett), Desbrière's map label "19 Août" (a label that is the evidence), and the map title "Situation au 15 août".

**Fix.** Make these replacements, quotation marks included:
- **Line 14** (brief table): "(Corbett: "less than four hours")" → `(Corbett: under four hours)`.
- **Line 45**: "Corbett 1910, p. 68, has "less than four hours"" → `Corbett 1910, p. 68, has under four hours`.
- **Line 385**: "or "less than four hours" (Corbett p. 68)" → `or under four hours (Corbett p. 68)`.
- **Line 33**: "His "7 h. 45 du matin" for the anchoring off Cádiz is a slip for the evening." → `His 7.45 in the morning for the anchoring off Cádiz is a slip for the evening.`
- **Line 93**: "the Dragon and Goliath among them, "ralliés en route", as Cornwallis's orders intended" → `the Dragon and Goliath among them, picked up on the way, as Cornwallis's orders intended`.
- **Line 393**: "with the Dragon and Goliath "ralliés en route"" → `with the Dragon and Goliath picked up on the way`.
- **Line 147**: "Corbett's "nearly noon" (p. 337)" → `Corbett's time just before noon (p. 337)`.
- **Line 207** (relay table, source cell): "Corbett 1910, p. 333 ("six o'clock")" → `Corbett 1910, p. 333 (six o'clock)`.
- **Line 210** (relay table): "Corbett's "in ten minutes" (7.10) has no support in the logs" → `Corbett's ten minutes (7.10) has no support in the logs`.
- **Line 401**: "Corbett's "in ten minutes" (7.10) has no support" → `Corbett's ten minutes (7.10) has no support`.
- **Line 387**: "10 June (Corbett; Desbrière's "dès le 10 juin") or 11 June (Villeneuve's letter dated at sea; Desbrière's "mettait à la voile le 11 juin")" → `10 June (Corbett; Desbrière, for the troops embarked from the 10th) or 11 June (Villeneuve's letter dated at sea; Desbrière once has him sailing that day)`.
- **Line 389**: "the fleet was "within about 300 miles" of the coast west of Oporto (Corbett)" → `the fleet was within about 300 miles of the coast west of Oporto by Corbett's text`.
- **Line 390**: "or "about east" for Ferrol (Corbett p. 196), 089° true by the 1805 variation" → `or about east for Ferrol (Corbett p. 196); the two agree, since ESE by compass was 089° true by the 1805 variation`.
- **Line 392**: ""16 août" (Desbrière's narrative, p. 102), "13 août" (his print of the letter, p. 103)" → `16 August (Desbrière's narrative, p. 102), 13 August (his print of the letter, p. 103)`. Make the same change in line 89: "reads "13 août"" → `reads 13 August`.
- **Line 396**: ""crowded up in the harbour" about 29 September (Corbett p. 318)" → `still crowded up in the harbour about 29 September (Corbett p. 318)`. The words stay; the quotation marks go.
- **Line 401**:
  - ""fifty miles" (Corbett and Mahan, rounding)" → `about fifty miles (Corbett and Mahan, rounding)`;
  - ""by three" (Corbett)" → `by 3 (Corbett)`.

**Evidence.**
- `docs/research/README.md`, "What belongs here".
- The wording of each phrase, from the research:
  - Corbett p. 68, from `a-h1ac.md` line 140;
  - Corbett p. 337, from `a-h2c.md` H2-31b;
  - Corbett p. 333, from `a-h3.md` line 168;
  - Corbett p. 195, from `v-draft-h1.md` line 327;
  - Corbett p. 196, from `a-v-draft-h1.md` 17;
  - Corbett p. 318, from `a-v-draft-h2.md` A14;
  - Desbrière pp. 41–43, from `v-h1a.md` H1-14.

### 7. Translations and paraphrases in quotation marks; prints not named (low, quotation)

**Problem.** Quotation marks claim a source's exact words. These are not, or they quote a print without saying which:
- **Line 394**: "both "new ports" Napoleon had built". Napoleon wrote in French (`a-v-draft-h2.md` A18 quotes the French).
- **Line 397**: "the Thémis mentions "the innermost ships"". The report is in French.
- **Line 392**: "if "Cádiz NE nine leagues" is by compass". Our rendering of James's bearing, with a modern accent.
- **Line 402**: "meant "standing west"". Nelson's memorandum reads "standing to the Westward" (Nicolas VII 136, page image read).
- **Line 143**: "Enemy at the harbour's mouth". The manuscript reads "Enemy at the Harbours Mouth" (Hudson 1917, p. 21, page image read). The normalised wording is a later print.
- **Line 294**: "the diary's "Cadiz bearing E.S.E. by compass, distance sixteen leagues"". This is Beatty's print (p. 97, page image read); the manuscript reads "ESE by compass distance 16 leagues" (Hudson p. 23).
- **Line 92**: Collingwood's "only three poor things with a frigate and a bomb". Period, short and allowed, but colour rather than evidence. Keep it only if a caption will quote it.

**Fix.**
- Line 394: `Wimereux and Ambleteuse: both new ports Napoleon had built ("deux nouveaux ports", Corr. IX No. 7832, 2 July 1804), or …`
- Line 397: `the Thémis reports the innermost ships still at anchor on the 19th`
- Line 392: `about 36°07′ N 6°32′ W if the bearing of Cádiz, NE nine leagues, is by compass`
- Line 402: `and whether the Sirius's three guns at 9.35 p.m. meant that the enemy was standing to the westward`
- Line 143: `Nelson's diary, 14 October: "Enemy at the Harbours Mouth" (Hudson 1917, p. 21)`. Make the same change in line 397: `Nelson's "Harbours Mouth"`.
- Line 294: `between the diary's 16 leagues ESE by compass (36°33′ N 7°18′ W; Hudson 1917, p. 23, and Beatty, p. 97) and the noon log, …`

### 8. Brief table, flotilla row: the confidence contradicts the body (low, internal-contradiction)

**Where.** "Where the sources changed the brief", row "A flotilla of invasion barges in the harbour", confidence cell (line 21).

**Problem.**
- The row gives "High for the designs and the count".
- The body's "The flotilla" (line 102) rates the count Medium, and "The craft" (line 103) "medium as built".

**Fix.** Replace the confidence cell with:

> High for the designs, medium for the count and as built, low for the layout in August 1805

### 9. Fleet sizes intro: "the lab shows six for each fleet" (low, chart-mismatch)

**Problem.**
- The chart draws:
  - six combined ships at anchor and six at dawn;
  - six British at dawn;
  - three at the head of Villeneuve's line (`fleets.ts`).
- From far off, a fleet shows only its lead.
- "The lab" is process language.

**Fix.** Replace the paragraph (line 154) with:

> Ships of the line only; frigates and smaller craft are in the sections above. "Glyphs" is how many ship glyphs the full scene gives each fleet at that moment; seen from far off, a fleet gives way to its flagship (see "Assumptions and licences", 3). The chart now draws six for each fleet at the anchorage and at dawn, and three at the head of Villeneuve's Toulon–Cádiz line (see "Positions on the chart" and "Routes on the chart").

This line also touches the owner's decision 1 (see below).

### 10. Fleet sizes: a missing stage, two qualifiers, Lauriston's count (low, lost-in-merge)

**Problem.**
- `drafts-data.json` [3] `fleetRows[19]` has Nelson joining Cornwallis, then going home (15–18 August: 11, then 2). The route data runs north to Ushant, and the body (line 65) has the event, but the table has no row.
- The table drops the body's qualifiers on two rows:
  - "Nelson joins": medium for all 29 in company;
  - "After Magon joined": James's junction at sea.
- `drafts-data.json` [1] `fleetRows[1]` has Lauriston's count of 3 September (confirmed in `v-h2b.md` H2-20f). It reached no part of the section.

**Fix.**
- **After the row "Nelson homeward"**, add the row below. Draw it only if Nelson's line runs on north; how far it runs is still open (`docs/progress.md`).

  | Nelson north to Ushant | 25 July – 18 August | 11; nine left with Cornwallis off Ushant on 15 August, the Victory and Superb on to Spithead (18 August) | 11, then 2 | High |

- **Row "After Magon joined"**:
  - date cell: `4 June (James: at sea, on the day of sailing or the next)`;
  - confidence cell: `High for 20; medium for where Magon joined`.
- **Row "Nelson joins"**, confidence cell: `High for 29 under his command; medium for all 29 in company`.
- **Row "The British off Cádiz"**, append to the third cell: `; on 3 September Lauriston reported 5 of the line and 2 frigates in sight from the San Sebastián tower at 3 leagues, and 17 more at 6 leagues (Desbrière pp. 125, 145)`.

### 11. Key sources: Beatty 1825 leaves are one off (low, factual-error)

**Problem.**
- I read the page images. In `authenticnarrati00beat`, leaf n11 is p. 2, n12 is p. 3 and n108 is p. 97.
- The archive's page-number map puts p. 10 at n19.
- The section links n12, n20 and n109 (from `a-v-draft-h2.md` A8 and A4).
- Beatty 1807 (n15, n108) is right.

**Fix.** In the Beatty 1825 clause, replace the three links with:

> p. 2: https://archive.org/details/authenticnarrati00beat/page/n11/mode/1up; p. 10: https://archive.org/details/authenticnarrati00beat/page/n19/mode/1up; p. 97: https://archive.org/details/authenticnarrati00beat/page/n108/mode/1up

**Leaves confirmed right:**
- Maude p. 90, n121;
- NRS II p. 145, n162;
- Nicolas VII p. 136, n171;
- Hudson p. 21, n26;
- Fraser p. 29, n54, and p. 88, n119.

### 12. Key sources: sources cited inline but not listed; two orphans (low, omission)

**Problem.** These are cited inline but absent from the list:
- Tuckey 1815 (lines 363 and 379);
- Knight c. 1795 (lines 378 and 379);
- Moore 1800 (lines 376 and 377);
- La Rochette 1780 (line 375);
- Walker's and Cruttwell's gazetteers, and the *Britannica* of 1810 (line 363);
- Robinson 1858 (lines 220 and 401);
- Adkin (lines 43 and 385);
- the *Précis* (line 91);
- the uncited Wikipedia page (lines 99, 101 and 394);
- ETOPO 2022 (line 285).

Two entries in the list are cited nowhere inline:
- the Decade's journal (line 423);
- the 1778 *Britannica* (line 426).

**Fix.**
- **To "Charts for the names"**, append: `; J. Knight, *The Coasts of Portugal and Spain from Lisbon to Cape St Martin* (about 1795), BnF: https://gallica.bnf.fr/ark:/12148/btv1b53269571z; La Rochette's chart, published by Faden (1780): https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~346004~90113492`
- **To "Books for the names"**, append: `; J. K. Tuckey, *Maritime Geography and Statistics*, vol. II (1815): https://archive.org/details/maritimegeograp09tuckgoog/page/n88; J. H. Moore, *The Practical Navigator* (1800): https://archive.org/details/bim_eighteenth-century_the-practical-navigator_moore-john-hamilton_1800; J. Walker, *The Universal Gazetteer* (1795): https://archive.org/details/bim_eighteenth-century_the-universal-gazetteer_walker-john_1795, and (1801): https://archive.org/details/universalgazette00walk_0; C. Cruttwell, *The New Universal Gazetteer* (1800): https://archive.org/details/bim_eighteenth-century_the-new-universal-gazett_cruttwell-clement_1800; *Encyclopaedia Britannica* (Edinburgh, 1810): https://archive.org/details/encyclopaediabri10edin`
- **New entries:**
  - `H. Robinson, *Sea Drift* (Portsea, 1858), pp. 208–209: https://archive.org/details/seadrift00robigoog`
  - `Modern pointers, not used as evidence: M. Adkin, *The Trafalgar Companion* (2005), as cited in Wikipedia, "Trafalgar campaign": https://en.wikipedia.org/wiki/Trafalgar_campaign; Wikipedia, "Camp of Boulogne" (the uncited figures and camp sites): https://en.wikipedia.org/wiki/Camp_of_Boulogne`
  - `*Précis des événements militaires*, vol. XII, p. 71, as quoted and rejected by James III 375.`
- **"Data and tools"**, append: `; NOAA, ETOPO 2022 global relief (the chart's heights and its 15″ Gulf tile): https://www.ncei.noaa.gov/products/etopo-global-relief-model`
- **The two orphans.**
  - Either cite the Decade's journal where the body explains the 13 June dates (see issue 5), or delete `; the journal of a lieutenant of the Decade, pp. 184–185: https://archive.org/details/navalchronicleco14londiala/page/n207/mode/1up` from line 423.
  - In "Night lights" (line 195), change "(inference from period compositions)" to `(inference from period compositions: *Encyclopaedia Britannica*, 1778, "Pyrotechny")`.

**Evidence.** The links are from `h4-names.md` (lines 19, 23 and 39), `v-h4.md` (lines 28 and 148–150), `h3-signals.md` (line 587), `h1-campaign.md` (lines 24 and 244), `a-h2a.md` (line 323) and `v-h3a.md` (line 66).

### 13. Process language, and a check file cited as a source (low, style)

**Fix.**
- **Line 1:** delete the HTML comment.
- **Line 130:** "15–18 in a letter to Ball, `research/scene-02/v-draft-h3.md`, 5" → `15–18 in a letter to Ball of 11 October, Nicolas VII 111`.
- **Line 393:** "or 15–18 (a letter to Ball)" → `or 15–18 (to Ball, 11 October, Nicolas VII 111)`. The source is from `h3-signals.md` line 282 and `v-h3b.md` line 64.
- **Line 350:** replace the second and third sentences with:

  > The chart sets the English forms (the site is in English), settled in `research/scene-02/a-h4.md` with the corrections of `a-v-a-h4.md`. They rest on the charts read for the names, chiefly Faden's chart of Nelson's track (12 August 1807), which the scene imitates, with Heather's *Coast of Portugal* (1800), Laurie & Whittle's *Atlantic Ocean* (1794) and their *Spain and Portugal* (plate of 12 May 1794, issued in their atlas of 1804), Cary's maps of 1801–1805 and Arrowsmith's of 1802–1803; and on usage in Nelson's letters, the logs, the *Naval Chronicle*, Norie, Malham and Brookes.

  This also stops "Faden … first" reading as the old rule.
- **Line 355:** replace the bullet with:

  > - **Four choices a visitor would notice.** The chart letters English Channel (Faden 1807; Heather's chart titles; Norie, Malham), not The Channel; C. St. Vincent, with the stop the period printed; Azores or Western Islands (Laurie & Whittle 1794; Heather's catalogue of 1806), so that a visitor finds the Azores, not Western Islands alone; and Martinique, not Martinico. West Indies, a region rather than a water, is set in roman like a land and fades out close up. High; medium for Martinique.

- **Lines 287–288** (the research ruling called "that ruling"):
  - "The 1.5–2 nm of that ruling" → `The 1.5–2 nm of `a-h2c.md``;
  - "the fairway the same ruling keeps the anchored fleet out of" → `the fairway `a-h2c.md` keeps the anchored fleet out of`;
  - "The ruling's midpoint between the forts" → `The midpoint between the forts in `a-h2c.md``.
- **"The lab".** Its uses in lines 297, 300, 339 and 340 go with the owner's decision 1. Elsewhere use "the chart now draws" (issue 9).

### 14. Brief table: details dropped from the scene cells (low, lost-in-merge)

**Problem.** `drafts-data.json` `briefRows` carry scene directions the table's cells dropped:
- the night chain's form (element 0, rows 1 and 3);
- the caption "never … 'within two hours'" (element 0, row 2);
- the four stragglers on the crossing (element 3, row 1);
- "'and back' holds only loosely" (element 3, row 3).

**Fix.**
- **Row "The chain 'lights up …'", scene cell:**

  > By day each link shows a hoist and white gun puffs, held until the Victory answers, in pulses, never instant: 7 a.m. at Cádiz, 9.30 at the Victory, the Mars ending with the distant signal; captions say "by half past nine", never "in minutes" or "within two hours"; light effects only in the night beat, on a short chain under 10 nm long between the closing fleets, led by paired blue lights every hour

- **Row "He collects Spanish ships …", scene cell:** `14 glyphs on the crossing (four more apart if the stragglers are drawn), 18 at Martinique`.
- **Row "Beat 2 …", scene cell:** `Villeneuve's line heads for Ferrol; Nelson's runs south of it to Gibraltar, so "and back" holds only loosely; the captions can keep the plan's aim`.

### 15. Names: small consistency points (low, style)

- **One catalogue, three dates.** Heather's catalogue is "c. 1806" (line 355), "about 1806" (lines 360 and 361) and "5 November 1806" (lines 365, 372 and 376). Use `Heather's catalogue of 5 November 1806` throughout, or "of 1806" after the first mention. The Channel bullet (line 360) has "Heather's chart titles of about 1806", which can stay as `Heather's catalogue of 1806`.
- **The points clause.** The capes bullet (line 354) leaves out the convention's clause on points (`a-v-a-h4.md` 7, convention 5). Append after the first sentence: `Points are set as the charts name them: Start Pt. (Cary 1804's Start P.; Faden's bare Start would read as an instruction), the bare Lizard where the charts agree, and Europa Point and Rock of Lisbon spelled out as the period spelled them.`
- **Two doubts without a confidence.**
  - Gulf of Cadiz (line 363): `a-h4.md` rates its extent medium. End it: `The chart sets it on the open bight, as both period maps that name the water do. Medium for the extent.`
  - West Indies (line 365): `a-h4.md` rates it "high (form); medium (as a label in the body)". End it: `High for the form; medium as a label in the map body.`

## Where the section touches the owner's decisions of 1 November 2026

These are not raised as issues; the agent applying the decisions should find every place.

**Decision 1: the dawn fleets at their true spacing; the licence withdrawn.**
- **Line 154**, "Fleet sizes at each stage", intro: "(the lab shows six for each fleet …)". See issue 9.
- **Line 297**, "Positions on the chart", "Where this differs from scene 1": from "The lab opens the spacing …" to "… how far apart the two groups were."
- **Line 300**, "What the chart draws now":
  - the dawn coordinates (the Victory's group 36°00.5′–36°11.4′ N; the combined fleet 36°00′–36°16′ N);
  - the closing "the dawn spacing and the British heading are licences".
- **Line 338**, licence 1: its pointer to `docs/decisions.md`, "The dawn fleets are spread out" (that entry will change).
- **Line 339**, licence 2, "The dawn spacing": the whole item.
- **Line 340**, licence 3, "Glyphs and counts": "with six ships for each". Keep the group-lead sentence of issue 2.
- **Line 405**, open doubt "The chart's dawn licences (the owner's call)": the combined line and the British spread.
- **Code and decisions** (not the section): `fleets.ts` comments ("Spacing within each group is opened up …") and `decisions.md` "The dawn fleets are spread out". `decisions.md` "A group gives way to its lead" names a Collingwood lead that `fleets.ts` does not have (issue 2).

**Decision 2: the British heading 047° kept as a deliberate licence.**
- Line 295, "Dawn, 21 October: the British": the heading sequence (keep).
- Line 297: "the chart draws them on 047° true …".
- Line 300: "all on 047° true"; "the British heading are licences".
- Line 338, licence 1: say that the owner chose it (1 November 2026).
- Line 404, open doubt "Dawn, 21 October": the heading sequence.
- Line 405: "The British heading: 047° on the chart …", and the bullet's title "(the owner's call)".

**Decision 3: the caption says "a chain of frigates and ships of the line".**
- Line 25, brief table, row "Beat 4 caption": drop ", or "a chain of warships" at the same length".
- Line 133, "The chain": "beat 4's "chain of frigates" is wrong" (consistent with the decision).
- Line 253, "Wrong in kind": "a chain of frigates only" (consistent).

## Every quoted string, judged

There are 253 double-quoted strings, extracted by script. Italics are titles, plus three French terms (*baraques*, *détroit*, *amorces*) used as terms, which is allowed.

- **Cross-references to sections of this file, scene 1's or `decisions.md`** (allowed):
  - "Dates and conventions", "Positions on the chart" (×4), "At Fort-de-France", "Routes on the chart", "The plan";
  - "The signal chain, 19 to 21 October" (×2), "Which half of the code", "Glyphs";
  - "Nelson off Cádiz", "The station", "Blackwood's squadron", "The chain", "At sea";
  - "How the chart shows the signals", "The setting" (×2), "The fleets";
  - "Fleet sizes at each stage", "Assumptions and licences" (×2), "What changes on the chart";
  - "The dawn fleets are spread out", "Where this differs from scene 1", "Outer and inner ships", "The names on the chart".
- **The brief's own words** (allowed):
  - "races back for the Channel", "follows him across the Atlantic and back";
  - "gives up on England" (×2), "in the harbour";
  - "linked to the coast by a chain of frigates", "lights up ship by ship when the combined fleet sails";
  - "command of the Channel", "against Austria (the Third Coalition)", "chain of frigates".
- **The project's own labels, captions and forms** (allowed):
  - date labels: "10 June", "2 August", "15 August", "20 August";
  - caption words: "invasion craft", "puts off" (×2), "lays down its arms" (×2), "surrenders" (×2), "a chain of frigates and ships of the line", "a chain of warships", "by half past nine", "in minutes", "about 500", "at noon";
  - date-line forms: "20 October 1805", "21 October 1805", "20–21 October 1805";
  - "est.", "true", "West";
  - name forms: "St.", "Pt.", "or", "C.", "Cape", "The", "Atlantic Ocean", "English Channel", "The Channel", "C. St Vincent", "Western Islands", "Martinico", "Straits", "Streights", "Strait", "Carthagena", "Start", "Gulph of Cadiz", "Cadiz";
  - the research notes' own figures: "17 sailed together", "4.30".
- **Period words** (allowed: short, public domain, the wording is the evidence):
  - **Nelson:** "in the night of Saturday, March 30th" (×2), "31st", "this day", "goes off this day", "four o'clock" (×2), "from sixteen to eighteen leagues West of Cadiz", "15 lgs. to twenty" (×2; checked on the manuscript page), "five Frigates, a Brig, and a Schooner", "from three to four leagues" (×2), "as near as possible in the latitude", "in the latitude", "by day or night", "between Trafalgar and Cape Spartel", "to the N.E." (×2), "near forty Sail" (×2; checked), "burn two blue lights together, every hour" and "three guns, quick, every hour" (checked on Nicolas VII 136), "E.S.E., 16 Leagues", "ESE by compass", "fourteen Sail", "six Sail of the Line", "off the Lizard", "Cape St. Mary".
  - **The logs:** "the 10th", "March 27th [i.e. 26th]" (×2, with Nicolas's bracket), "Sunday 16th June, P.M. 7", "about 22", "16th", "October 3rd, P.M." and "October 3rd", "At 4", "to the northward, firing guns", "to the northward", "firing three minute guns", "firing guns", "Cadiz NE by E, 4 miles", "west" (×2).
  - **James:** "the 9th or 10th" (×3), "24th at noon", "on the 9th", "evening of the 26th", "chiefly as schuyts", "in the basin and road", "twelve ships", "shortly afterwards" (×2), "W.S.W." (×3).
  - **Nicolas's slips:** "Sunday", "E.N.E." (×3).
  - **Napoleon:** "à une autre année" (×2), "Mon parti est pris", "23 mai" (a misprint), "Mon mouvement est commencé", "demain" (×2), "excessive pusillanimité", "cet hiver".
  - **Villeneuve:** "par le bruit public", "à l'entrée de la nuit", "25 thermidor (13 août)", "S.-O. 1/4 S.".
  - **Collingwood:** "yesterday" (×2), "36 sail of men-of-war" (×2), "E by S about seven leagues", and "only three poor things with a frigate and a bomb" (issue 7).
  - **Others:**
    - Campbell, "passed the Gut"; the court martial, "severely reprimanded"; the *Moniteur*, "21 messidor"; the Atlas's table, "18 germinal"; Reille, "Pléiade";
    - the French reports: "six à sept" (×2), "7 ou 8" (×2), "sans ordre", "entre les Porques et le Diamant, par les 7 brasses d'eau", "entre les Porques et le Diamant", "8 à 9 lieues";
    - Escaño, "fuera del tiro de la plaza"; the Austrian eyewitness, "vingt-trois mille";
    - Beatty, "a little before sunset" (×2) and "five or six"; Blackwood, "within two hours" (×2); Browne, "east, 16 leagues"; Walker, "about nine"; Robinson, "twenty leagues" (×2);
    - Popham, "a diagonal red and white flag" (×2); Cumby, written before 1837, "a flag, a ball, and a pendant";
    - the signal book's No. 370, as the NRS editor, Cumby and Corbett give it: "enemy's ships are coming out of port", "or getting under weigh", "or getting under sail" (×2 each);
    - Faden 1807: "copied from his Lordship's original MS." and "Track of H.M.S. Victory to the West Indies 1805";
    - Heather's catalogue: "Part of the Atlantic Ocean", "The Atlantic and Southern Oceans", "the West Indies", "the whole of the West-Indies", "in Barbary", "The Harbours of Gibraltar, Malaga, Carthagena…";
    - the *Naval Chronicle*: "on the Western Ocean"; prose usage: "Cape St. Vincent", "The Lizard", "The Start", "off Cadiz";
    - Desbrière's map label "19 Août" (×2) and the map title "Situation au 15 août" (×3);
    - titles in Key sources: "Nelson's chase of Villeneuve", "Pyrotechny", "Fire and light in the sky", "Whizz-bang science", "Colomb, Philip Howard".
- **Modern authors' own words, to paraphrase** (issue 6):
  - Corbett: "less than four hours" (×3), "six o'clock", "in ten minutes" (×2), "nearly noon", "within about 300 miles", "about east", "crowded up in the harbour", "fifty miles" (with Mahan), "by three";
  - Desbrière: "7 h. 45 du matin", "ralliés en route" (×2), "dès le 10 juin", "mettait à la voile le 11 juin", "16 août", "13 août" (the last two are his narrative and his print, used as evidence of slips; they can stay as dates without quotation marks).
- **Translations or paraphrases presented as quotations** (issue 7): "new ports", "the innermost ships", "Cádiz NE nine leagues", "standing west".
- **Our own slip quoted as a version** (issue 3): "Napoleon's orders of 29 April".
- **Prints not named** (issue 7): "Enemy at the harbour's mouth" and "harbour's mouth"; "Cadiz bearing E.S.E. by compass, distance sixteen leagues".

## Checked and sound

- **The brief table** (13 rows):
  - every date, count and position agrees with the body;
  - every confidence matches the body except the flotilla row (issue 8);
  - the rulings of `a-v-draft-h1.md` (4 and 13) are applied in rows 14, 16, 18 and 19;
  - `v-draft-h3.md` point 27 is applied in row 26;
  - every "Brief" cell quotes or summarises `docs/scene-02-brief.md` correctly.
- **The fleet table** (27 rows):
  - every count, the French and Spanish splits and every glyph number agree with the body;
  - `v-draft-h3.md` point 24 is applied ("The night of 20–21 October");
  - `a-v-draft-h1.md` doubt 8 is applied ("The British off Cádiz").
- **The names** follow `a-v-a-h4.md` rulings 1–10, with their texts:
  - the Gulf of Cadiz on two maps;
  - the new rule, with the West Indies clause;
  - the West Indies and Barbary doubts;
  - West Indies lettered as a land;
  - Huelba;
  - Carthagena's own doubt;
  - capes and the article;
  - Lizard and Start;
  - the period print for "St.";
  - the completed attributions;
  - the El Puerto entry.

  All 34 gazetteer forms the section names match `gazetteer.ts`: ATLANTIC OCEAN, MEDITERRANEAN SEA, English Channel, Gulf of Cadiz, Straits of Gibraltar, C. St. Vincent, Cadiz, Azores or Western Islands, Canary Islands, West Indies (role land), Martinique, Barbadoes and Barbary (role land).
- **Every licence listed** matches `decisions.md` and the code:
  - 047° in `fleets.ts`;
  - the room rule;
  - the narrows ship at 36.5165 N 6.2535 W;
  - the anchored heading of 294°.

  The positions in "What the chart draws now" match `fleets.ts` to the tenth of a minute. The Toulon–Cádiz table matches `routes.ts` point by point.
- **The open doubts** carry:
  - every doubt in the data's `openDoubts` (elements 0, 1 and 3) and in element [2]'s `doubts`, as corrected by `a-v-a-h4.md`;
  - all 18 doubts of `a-v-draft-h1.md`;
  - all 13 of `a-v-draft-h2.md`.

  The exceptions are under issues 3–5.
- **Scene 1.** Nothing contradicts "The setting", "The fleets" or scene 1's licences, beyond the two declared dawn licences:
  - the British about 20 nm west of Cape Trafalgar;
  - the combined fleet 9–12 nm east, about 5 nm long, heading south on the starboard tack;
  - 27 against 33, 18 French and 15 Spanish, with 5 frigates and 2 brigs;
  - bearing up at about 06:40–07:00, 20–30 minutes after the 06:27 sunrise;
  - the variation of 21° W;
  - the moon rising about 05:20.
- **Markdown.** Six tables, every row with its header's cell count. No unbalanced bold or code spans. Key-source bullets have no bold lead-in, as in scene 1's list.
- **NRS II is printed by civil day**, as line 7 says (`v-h3a.md`, from Jackson's introduction).
