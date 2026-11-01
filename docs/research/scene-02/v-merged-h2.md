# V-merged-h2: adversarial check of the merged "Scene 2" section, Boulogne to the dawn positions

Object: `docs/research/scene-02/history-scene-02-merged.md` (434 lines), my scope only: the brief-table rows on the huts, the flotilla, "gives up on England", Ulm and the fleet "in the harbour"; "Boulogne and the invasion army"; "The turn east and Ulm"; "Nelson off Cádiz"; "Orders, Rosily and the sortie"; "Fleet sizes at each stage" from "Collingwood off Cádiz" to "Dawn off Cape Trafalgar"; "Positions on the chart"; "Assumptions and licences" 1–7; the open doubts on the British off Cádiz, Boulogne, the turn east and Ulm, Cádiz, the anchorage, the sortie, the combined fleet's night, the British of 19–21 October, Dawn 21 October and the chart's dawn licences. Measured against `draft-h2.md`, `v-draft-h2.md` with `a-v-draft-h2.md` (A1–A28), `a-h2a.md`, `a-h2b.md`, `a-h2c.md`, element [1] of `drafts-data.json`, `src/scenes/02-road/fleets.ts`, `docs/decisions.md`, scene 1's "The setting" and "The fleets" with `research/dawn-setting.md`, and, as background, `h2-boulogne-cadiz.md`, `v-h2a.md`, `v-h2b.md`, `v-h2c.md`. No file in the repository was changed.

## Verdict

This part of the section is sound and nearly complete. Nothing from `draft-h2.md` was lost in the merge: a word-level diff of its 58 bullets against the merged ones shows every change is a ruling applied, and its table of 19 October is carried, row by row, by the signals tables (Colossus, Sirius and Agamemnon as `a-v-draft-h2.md` ruled). All 28 session 9 rulings on the h2 draft are applied with their texts (A6 and A15 were merged without loss; A2's "the lab draws" is rightly written "the chart draws"), and the thirteen doubts A lists are all in "Open doubts". Every position is at sea on Natural Earth where its source puts it, every camp is on land, and every statement about what the chart draws matches `fleets.ts` to the tenth of a minute. The faults:
- **"The station"** turns Nelson's conditional rule (in fresh easterly breezes, work up toward Cádiz "never getting to the Northward of it", Nicolas VII 73, which I read) into a flat "never north of the port's parallel". The section's own positions put the Victory 2–4 nm north of that parallel on 19 October.
- **The Cádiz doubt** says the date line shows Rosily's 23–25 October. The scene ends at dawn on 21 October, and the data has that date as not shown.
- **"The main fleet"** gives the chase as about 114° true. The relay table gives the courses steered as about 80°, then 103° true.
- **Dropped versions and session 7 final statements.** James dates the "pusillanimité" letter 17 September (III 378, which I read). The Donegal left on the 17th or the 18th. Louis's convoy parting has two versions. The distance between the fleets at dawn has several figures. Bernadotte, Napoleon's army figures by reader, the columns' reconciliation and the 8th Bulletin's 16 generals are also missing.
- **Smaller faults.** Confidences in the brief table disagree with the body. Two Fleet-sizes rows lose a split or the Leviathan. "The lab" phrasing remains, and some citations are loose.

None is high. With the fixes below, this part can go into `history-notes.md`.

## Method

- Read the scope in full, the rest by headings; the draft, the check and the rulings in full; `a-h2a.md`, `a-h2b.md`, `a-h2c.md` in full; element [1] of `drafts-data.json` (brief rows, fleet rows, dates, 35 positions, doubts, owner questions); `fleets.ts`; `decisions.md` ("No glyph stands on the shore", "A group gives way to its lead", "The dawn fleets are spread out"); `history-notes.md` scene 1; `dawn-setting.md` sections 1, 4, 5, 7; the brief.
- Word-level diff of every bold-lead bullet of `draft-h2.md` against the merged file (script `vmh2-diff.js`).
- Every position in scope, and all 18 `LAB_MARKS`, tested against Natural Earth 10 m land plus minor islands: land or sea, distance and bearing to the chart's coast (script `vmh2-ne.js`).
- Primary pages, where a point was decisive and the files disagreed or were silent: Nicolas VII (archive.org `dispatchesletter07nelsuoft`, full text): p. 73 (to Blackwood, 4 October), p. 111 (to Ball, 11 October), p. 122 (diary, 14 October); James III (`navalhistoryofgr03jameuoft`, full text): pp. 332 and 378.

## Issues, most severe first

| # | Where | Kind | Severity |
| --- | --- | --- | --- |
| 1 | Nelson off Cádiz: "The station" (and its doubt) | factual-error | medium |
| 2 | Open doubts: "Cádiz: orders, Rosily and the fleet in port" (the date line) | factual-error | medium |
| 3 | Positions on the chart: "The main fleet" (114° true) | internal-contradiction | medium |
| 4 | Orders, Rosily and the sortie: "Rosily" (James's 17 September) | missing-version | low |
| 5 | Nelson off Cádiz: "Louis on 18–21 October" | contradicts-adjudication | low |
| 6 | Open doubts: "The British off Cádiz, August to October" (Donegal, Royal Sovereign) | missing-version | low |
| 7 | Open doubts: "Dawn, 21 October" (distance between the fleets; the line's orientation) | missing-version | low |
| 8 | Fleet sizes: "Nelson joins", "Louis leaves for Gibraltar", the Donegal step | omission | low |
| 9 | Brief table: flotilla, Ulm and "in the harbour" rows (confidence) | internal-contradiction | low |
| 10 | Brief table: "gives up on England" row (the condition; James's 22nd) | quotation | low |
| 11 | Turn east: "The decision", "Why east"; Boulogne: "The army" (session 7 figures) | missing-version | low |
| 12 | Orders, Rosily and the sortie: "At sea" (the columns reconciled) | missing-version | low |
| 13 | The turn east and Ulm: "How many" (16 generals) | missing-version | low |
| 14 | Process language: "the lab", "The first suggested centre" | style | low |
| 15 | Citations in the doubts and the Fleet-sizes night row | style | low |
| 16 | Facts held only in the draft's data (Lauriston, 27 or 29 September) | lost-in-merge | low |
| 17 | Assumptions 7 and Positions "Boulogne" (estimated points) | omission | low |
| 18 | Positions: "The harbour mouth" (El Diamante) | internal-contradiction | low |
| 19 | Positions: "Where this differs from scene 1" (scene 1's "about NE then ENE true") | scene-1-conflict | low |
| 20 | Boulogne: "What the crossing needed" (13 September) | unsupported | low |

### 1. "The station" (factual-error, medium)

The bullet says Nelson kept the fleet 16–18 leagues west of Cádiz, "never north of the port's parallel". The letter it rests on makes the rule conditional. To Blackwood, 4 October (Nicolas VII 73): "In fresh breezes Easterly, I shall work up for Cadiz, never getting to the Northward of it." Only Desbrière's paraphrase (pp. 148–149, "sans jamais être au Nord du parallèle passant par le port", quoted in `v-h2b.md`, H2-20) makes it absolute. As written, the bullet contradicts the section's own "The main fleet": the Victory lay at 36°34′–35′ N at 9.30 on 19 October and at 36°36′ N at noon, 2–4 nm north of Cádiz's 36°32′ N. The 15–18 leagues is also cited to a check report (`v-draft-h3.md`, 5) instead of the letter itself: to Ball, 11 October, Nicolas VII 111, "the body of the Fleet from fifteen to eighteen leagues West of Cadiz" (read on the page).

Fix, the whole bullet:

> - **The station.** Nelson kept the body of the fleet "from sixteen to eighteen leagues West of Cadiz" (to Blackwood and Barham, 4–5 October), fifteen to eighteen by his letter to Ball of 11 October and "15 lgs. to twenty" by his diary of 14 October (Hudson 1917, p. 21), on about the port's parallel. In fresh easterly breezes he would work up toward Cádiz, "never getting to the Northward of it", and if the enemy came out he would crowd sail south toward Cape Spartel (to Blackwood, 4 October; Nicolas VII 73–75, 111, 122). Desbrière (pp. 148–149) makes the first a rule never to stand north of the port's parallel. His reasons: not to be caught close in by a westerly gale and swept into the Strait, and to hide his strength and tempt the enemy out (to Barham, 5 October; Corbett 1910, pp. 326–327). High.

And in "Open doubts", "The British off Cádiz, August to October": replace "or 15–18 (a letter to Ball)" with "or 15–18 (to Ball, 11 October, Nicolas VII 111)".

Evidence: Nicolas VII p. 73, https://archive.org/details/dispatchesletter07nelsuoft/page/n108/mode/1up ; p. 111, leaf n146 by the same offset; `v-h2b.md`, H2-20 (Desbrière pp. 148–149); `h2-boulogne-cadiz.md`, H2-20 ("Rules"); merged "The main fleet" and the table of 19 October (Victory 36°34′–35′ N; noon log 36°36′ N).

### 2. The Rosily date on the date line (factual-error, medium)

"Open doubts", "Cádiz: orders, Rosily and the fleet in port", ends its Rosily sentence with "the date line shows 23–25 October 1805". The brief has Villeneuve sail before Rosily arrives, and the scene ends at dawn on 21 October (brief, `<history>` and beats 4–6). The draft's data has the date as "where: not shown" (`drafts-data.json` [1], dates[15]). `a-v-draft-h2.md` A24 changed only its display form to "23–25 October 1805". Nothing puts it on screen.

Fix: replace "and Cádiz on 23 October (expected, Beurnonville) or by the 25th (his first letter from Cádiz); the date line shows 23–25 October 1805." with:

> and Cádiz on 23 October (expected, Beurnonville) or by the 25th (his first letter from Cádiz), written "23–25 October 1805" wherever it is needed. The date line does not show it: Villeneuve sailed before Rosily arrived, and the scene ends at dawn on 21 October.

### 3. The chase course in "The main fleet" (internal-contradiction, medium)

"The fleet lay to, then chased in the SE quarter by compass, about 114° true (the courses steered are in the relay table)." The relay table says the fleet steered "E by S, then SE by E by compass, about 80° then 103° true" (Walker, NRS II 323; the Téméraire's log in Corbett 1910, p. 333 n. 1). "The ends" says the fleet makes sail "first about E by N, then about E by S true". 114° true is the signal's SE compass point, not a course steered. Read as written, the bullet gives the drawn course 11–34° from the table's.

Fix, the last sentence of the bullet:

> The fleet lay to, then made the general chase in the SE quarter (the signal's SE compass flag; SE by compass is about 114° true), steering E by S, then SE by E by compass, about 80° then 103° true (Walker, NRS II 323; the Téméraire's log in Corbett 1910, p. 333 n. 1; see the relay table). Medium.

### 4. James's 17 September (missing-version, low)

James (III 378, read on the page) dates Napoleon's letter that sent Villeneuve to Naples and named Rosily, with its "excessive pusillanimity", "September 17". The Correspondance has the instructions on 14 September (No. 9210) and the letter to Decrès on 15 September (No. 9220). `v-h2c.md` (missed point 14) records that Clowes follows James. The draft's data kept this as an alternative ("James and Clowes date them 17 September"), but neither text has it.

Fix, the whole bullet "Rosily":

> - **Rosily.** On 15 September Napoleon told Decrès that Villeneuve's "excessive pusillanimité" would keep him in port and that Rosily should replace him (No. 9220; James III 378 dates this letter, with the new orders, 17 September, and Clowes follows him); Rosily's instructions are of 17 September (No. 9230; Desbrière's narrative says the 18th). Decrès's letter of 20 September superseding Villeneuve had not reached him by 18 October: neither Decrès nor Beurnonville had told him (Desbrière p. 142). High.

And in the Cádiz doubt, after "Rosily's instructions: 17 September (No. 9230) or the 18th (Desbrière's narrative).", add: "The orders and the "pusillanimité" letter: 14 and 15 September (Nos. 9210, 9220) or 17 September (James III 378; Clowes)."

Evidence: James III p. 378, https://archive.org/details/navalhistoryofgr03jameuoft/page/n393/mode/1up (leaf by the offset of p. 379 = n394); `v-h2c.md`, "Points the notes missed" 14; `drafts-data.json` [1], dates[5].

### 5. Louis on 18–21 October (contradicts-adjudication, low)

`a-h2b.md` H2-17f's final statement gives two versions the merge drops. The telegraph report that reached Villeneuve spoke of four of the line with the convoy and two in Gibraltar (Corbett). Louis parted from the convoy on 21 October on news of the sortie (Austen) or, as was usual, off Cape Ténès (Corbett, from the Queen's log). The notes (H2-17) also date his stay: watered at Tetuan by 15 October, put back there by westerlies, and given the convoy order there on the 17th (Corbett 1910, pp. 331, 335). Those dates are what the Gibraltar and Tetuan glyph positions need.

Fix, the whole bullet:

> - **Louis on 18–21 October.** He watered at Tetuan, done by 15 October; westerly winds put him back there, and on the evening of the 17th the order to escort the Malta convoy reached him (Corbett 1910, pp. 331, 335; Austen, Hubback 1906, pp. 152–153). On the 18th he crossed to Gibraltar and left eastward with the convoy, five of the line and three frigates (Austen); a telegraph report reaching Villeneuve spoke of four of the line with the convoy and two in Gibraltar (Corbett 1910, p. 332). At dawn on the 20th he was some 200 miles east of the Strait (Corbett 1910, p. 335). On the 21st he parted from the convoy, on news that the enemy was out (Austen) or, as was usual, off Cape Ténès (Corbett, from the Queen's log) (`research/scene-02/a-h2b.md`, H2-17f). Medium. He is outside the Gulf frame.

### 6. Donegal and Royal Sovereign dates (missing-version, low)

`a-h2b.md` H2-18h: the Donegal went to Gibraltar on 17 October (the diary, Beatty 1825, p. 97; James), and Beatty's narrative (p. 6) has the 18th, probably the log's nautical date. H2-18: the Royal Sovereign joined on 8 October (Nelson; Corbett), while James and Clowes put her among the ships that joined "between the 9th and 13th". The section gives only the 17th and the 8th.

Fix, append to "Open doubts", "The British off Cádiz, August to October":

> The Donegal left for Gibraltar on 17 October (Nelson's diary, Beatty 1825, p. 97; James III 383) or the 18th (Beatty's narrative, 1825, p. 6, probably the log's nautical date). The Royal Sovereign joined on 8 October (Nelson, Nicolas VII 88 n., 107; Corbett p. 328); James and Clowes put her among the ships that joined between the 9th and 13th (`research/scene-02/a-h2b.md`, H2-18, H2-18h).

### 7. Dawn: the distance between the fleets and the line's orientation (missing-version, low)

The section gives the combined fleet's centre 9–12 nm east of the Victory, its line north–south true, and records the coast distances as a doubt. It does not record the other figures for the gap between the fleets, nor Lucas's orientation (`dawn-setting.md`, section 7, doubts 1 and 7). With the dawn fleets now drawn at their true spacing (the owner's decision 1), these versions belong in the doubt.

Fix, append to "Open doubts", "Dawn, 21 October":

> The distance between the fleets at daylight: 9–12 nm from the Victory (her logs, James, Browne; about 12, Beatty), 9 (the Belleisle), 6–7 (Collingwood), about 2½ leagues (Villeneuve), about three leagues (the Algésiras), "dos leguas" (the Montañés) and 4–5 miles from Gravina's squadron, to windward and nearer; the scene uses 9–12 nm, as scene 1 does. The line ran NNE–SSW by compass by the British (the Victory's log; Corbett), south-east to north-west by Lucas of the Redoutable (`research/dawn-setting.md`, section 7, doubts 1 and 7).

### 8. Fleet sizes: three rows (omission, low)

- "Nelson joins" drops the split the body and `a-h2b.md` H2-16 give: high for 29 under his command, medium for all 29 in company. All 29 were in company only if the Leviathan had not yet gone to Gibraltar.
- "Louis leaves for Gibraltar" reads 29 − 5 = 23. The missing ship is the Leviathan, away at Gibraltar until the 8th (H2-16, consistency check; data fleet row "Louis's detachment").
- The table goes from 28 on 13 October to 27 on 19 October with no step. The draft's data has the row "from Donegal's departure through the battle | 17–21 October | 27".

Fix, the two rows and one new row after "The October peak":

> | Nelson joins | 28 September | 29 under his command, 23 in the main body and 6 inshore under Louis; 27 by James and Beatty | 29 | High for 29 under his command, medium for all 29 in company |
> | Louis leaves for Gibraltar | 2 October | 5 go; with the Leviathan away at Gibraltar until the 8th, 23 with Nelson by 5 October | 23 | Medium-high |
> | The Donegal to Gibraltar | 17 October | 27 to the battle: 3 of 100 guns, 4 of 98, 1 of 80, 16 of 74, 3 of 64 | 27 | High |

### 9. Brief table confidences (internal-contradiction, low)

- **Flotilla row.** It says "High for the designs and the count". "The flotilla" bullet rates the count Medium, and the notes rate H2-05 "Medium: each figure is right for its own date and definition".
- **"In the harbour" row.** It says "Medium for the description". "Into the roadstead", which gives the same facts (the roadstead from 9–10 October, a few ships deeper in until the 19th), is High. The Medium belongs to the layout (`a-h2c.md`, H2-36d).
- **Ulm row.** It is High throughout, but "about 25,000" is Medium in "How many" (R18).

Fix, the three rows:

> | A flotilla of invasion barges in the harbour | Rigged gun craft: ship-rigged prames, brig-rigged chaloupes, lug-rigged gunboats and péniches, with fishing and merchant craft as transports; 1,104 at Boulogne on 20 July 1805. On the chart's coastline the Liane basin is land | Instanced rigged craft in the road off the harbour mouth; the caption may say "invasion craft" | High for the designs, medium for the count (right for 20 July 1805), low for the layout in August 1805 |
> | On 20 October an Austrian army under Mack surrenders at Ulm | The capitulation was signed on 17 October; on 20 October the garrison, about 25,000, marched out and laid down its arms before Napoleon | 20 October on the date line; "lays down its arms" is exact, "surrenders" defensible; never 19 October | High for the dates, medium for the number |
> | Beat 4: the combined fleet "in the harbour" | From 9–10 October it lay in the roadstead at the harbour mouth, out of range of the city's guns, a few ships still in the narrows until the 19th | 33 glyphs at anchor north-east of the entrance shoals, a few of them in the narrows (see "Positions on the chart") | High for the roadstead and the narrows, medium for the layout, low for the coordinates |

### 10. "Gives up on England": the condition (quotation, low)

The row reads "He put it off 'à une autre année' (23 August)" as if it were an unconditional statement. No. 9120 is conditional: if the fleet were held at Cádiz. `v-h2a.md` S0-3 flags this ("It is conditional"), and the body's "The decision" states it rightly. James (III 332, read on the page) quotes Berthier's letter to Marmont "on the 22nd". That is probably his usual one-day slip in converting 5 fructidor, but it is a version.

Fix, the row:

> | Napoleon abandons the invasion; beat 3: "gives up on England" | On 23 August he had Marmont told that if the fleet were held at Cádiz he would put the crossing off "à une autre année" (Corr. XI No. 9120; James III 332, quoting Berthier's letter to Marmont, has the 22nd), and he left troops and the flotilla at Boulogne as a standing threat. He decided on 23–26 August, before he knew Villeneuve was in Cádiz | The caption may stand ("puts off" is nearer his words); Cádiz may come before the turn east, never as its cause | High |

### 11. Session 7 statements on Napoleon's figures and Bernadotte (missing-version, low)

`a-h2a.md` R20's final statement (Napoleon's army figures varied by reader) and R16's Bernadotte order are not in the section. `v-h2a.md` confirmed two capacity figures, also not in the section: H2-03a (120,000 men and 10,000 horses, 2 July 1804) and H2-03c (the July 1805 table, 163,645 men).

Fixes:
- **"The decision, 22–26 August".** After "(Corr. XI Nos. 9117, 9120; No. 9120 is misprinted "23 mai").", insert: "The same day he ordered a force of about 10,000 under Bernadotte to gather at Göttingen (No. 9119)."
- **"Why east".** After "(No. 9130).", insert: "His figures for the army he would bring varied with the reader: 200,000 in Germany (to Talleyrand, 23 and 25 August), 300,000 (for Marmont, 23 August) and "plus de 100,000" in Bavaria (to the King of Prussia, 23 August); none is a return (`research/scene-02/a-h2a.md`, R20)."
- **"The army".** Before "High.", insert: "Other figures are right for their own dates: the craft could carry 120,000 men and 10,000 horses by Napoleon's count of 2 July 1804 (Corr. IX No. 7832), and the table of July 1805 was to carry 163,645 men, 16,783 of them seamen, and 9,059 horses (James III, App. 27, from Dumas; `research/scene-02/h2-boulogne-cadiz.md`, H2-03)."

### 12. "At sea": the columns reconciled (missing-version, low)

`a-h2c.md` H2-31e's final statement adds: "The two can be reconciled: the main body formed three columns and Gravina's squadron of observation kept 'à gauche de l'armée'." The merge keeps the two versions but not the reconciliation, which tells the scene how to draw the fleet on the 20th.

Fix: replace "They formed in three columns (Prigny, Fougueux, Desbrière) or five (James; the Spanish official report, per Nicolas)." with:

> They formed in three columns (Prigny, Fougueux, Desbrière) or five (James; the Spanish official report, per Nicolas); the two can be reconciled, the main body in three columns with Gravina's squadron of observation "à gauche de l'armée" (Prigny; `research/scene-02/a-h2c.md`, H2-31e).

### 13. "How many": 16 generals (missing-version, low)

R18's final statement: "30,000 with 16 generals in the 8th". `v-h2a.md` (missed point 6) adds that the Austrian eyewitness also gives 16. The bullet keeps the 7th Bulletin's 18 but drops the 16.

Fix: replace "and 30,000 in the 8th." with "and 30,000 with 16 generals in the 8th (the Austrian eyewitness also has 16)."

### 14. Process language (style, low)

The section's rules forbid "the lab" and phrases about how the notes were made. Fixes, outside the passages the owner's decision 1 rewrites:
- **"Fleet sizes at each stage", the intro sentence.** Write: '"Glyphs" is how many ship glyphs the full scene places at that moment; seen from far off, each group gives way to its lead (`docs/decisions.md`, "A group gives way to its lead"), and the chart now shows six for each fleet (see "Positions on the chart").'
- **"What the chart draws now", the first sentence.** It is also ambiguous: the dawn shows twelve. Write: 'The chart now shows two moments at once, with six ships for each fleet (twelve at dawn, six at anchor); the full scene gives each its beat and the counts of "Fleet sizes at each stage".'
- **Assumptions 3.** Write: '3. **Glyphs and counts.** Ships are glyphs drawn far larger than true scale, as a chart convention, and each is kept to the open water beyond it. The chart now shows the anchorage of 10–19 October and the dawn of 21 October at once, with six ships for each fleet; the full scene gives each moment its beat and its count.'
- **"Not here".** Replace "The first suggested centre, 36°33′ N 6°18′ W," with "The centre the research notes first gave (`research/scene-02/h2-boulogne-cadiz.md`, section 9.2), 36°33′ N 6°18′ W,".

The "lab" sentences in "Where this differs from scene 1" and Assumptions 2 belong to the owner's decision 1 (below).

### 15. Citations (style, low)

`a-v-draft-h2.md` A8 asks that each Beatty page name its edition; other citations are uneven. Fixes:
- **"The combined fleet's night".** "it wore twice (Beatty, p. 10; Nicolas VII 136, after Beatty)" becomes "it wore twice (Beatty, p. 10 in both editions; Nicolas VII 136, after Beatty)".
- **"The British, 19–21 October".** "or 2 a.m. (Beatty's narrative, p. 11, against his own appendix)" becomes "or 2 a.m. (Beatty 1807, p. 11, against his own appendix)".
- **Fleet sizes, "The night of 20–21 October".** "(Corbett 1910, p. 340)" becomes "(Corbett 1910, p. 340 n.)", as in "The British track" and "The fleet's wears".
- **"The anchorage, 10–19 October" doubt.** "the point `a-h2c.md` (H2-36d) gives them" becomes "the point `research/scene-02/a-h2c.md` (H2-36d) gives them".

### 16. Facts held only in the draft's data (lost-in-merge, low)

Element [1] of `drafts-data.json` holds two facts that the text never had.
- **Lauriston's count.** On 3 September Lauriston counted 5 of the line and 2 frigates at 3 leagues and 17 more at 6 leagues from the San Sebastián tower (Desbrière p. 145; `v-h2b.md` H2-20f, confirmed). This is the contrast with Nelson's station out of sight.
- **The joining date.** "Some secondary works give 27 or 29 September" for Nelson's joining (`h2-boulogne-cadiz.md`, section 0).

Fixes:
- **"Out of sight".** Insert at the start: "Before Nelson came, Collingwood's fleet had kept in sight, 15–20 miles off (Mahan; James III 379, about 15 miles): on 3 September Lauriston counted from the San Sebastián tower 5 of the line and 2 frigates at 3 leagues and 17 more at 6 leagues (Desbrière 1907, p. 145)."
- **"Joining".** After '"Sunday", a slip.', insert: "Some secondary texts give 27 or 29 September for the joining (`research/scene-02/h2-boulogne-cadiz.md`, section 0)."

### 17. Estimated points (omission, low)

Assumptions 7 lists the soft positions, but it leaves out several in scope:
- **Louis's berths.** The berths at Gibraltar and Tetuan are off the towns by estimate (H2-39).
- **The British on 20 October.** The daybreak position is "between Trafalgar and Cape Spartel", put at 36°00′ N 5°58′ W.
- **19 October.** The Phoebe's and the Colossus's places are inferred.
- **Boulogne.** The flotilla line, and the left camp at Outreau (an uncited Wikipedia page).

The "Boulogne" position bullet also rates all its places Medium, Outreau included.

Fixes:
- **Assumptions 7.** Write: "7. **Estimated points.** Positions no source fixes are estimates inside the sources' range: the Toulon berth, the Atlas's longitudes for 4–8 April, the 4 p.m. point off Conil, the anchorage of 9 April, the Finisterre smoke, the bend of 15 August, the moorings of 10–19 October, the berths of Louis's ships at Gibraltar and Tetuan, the places of the Phoebe and the Colossus on 19 October, the British fleet's daybreak position of 20 October ("between Trafalgar and Cape Spartel"), Boulogne's flotilla line and left camp, and every position of the night of 20–21 October."
- **Positions, "Boulogne", the last sentence.** Write: "Medium for the places, low for the left camp at Outreau (an uncited Wikipedia page) and for the flotilla's layout."

### 18. "The harbour mouth" and El Diamante (internal-contradiction, low)

"The harbour mouth" puts the passes "0.5 nm south of El Diamante". "Outer and inner ships" says the same point "lies on the line of the modern El Diamante buoys". Both can be true only if "El Diamante" means the shoal's shallow core in one place and its buoyed edge in the other. `v-draft-h2.md` puts the core at 36.565–36.577 N, 0.4 nm north of the point. `a-v-draft-h2.md` A1 puts the point 110–150 m north of the buoy line.

Fix, the whole bullet:

> - **The harbour mouth.** The passes between Las Puercas and El Diamante: 36°33.5′ N 6°17.4′ W, in 9–10 m today, 0.9 nm north-east of Las Puercas, on the line of the modern El Diamante buoys and about 0.4–0.5 nm south of the shoal's shallow core (`research/scene-02/a-h2c.md`, H2-38b; `research/scene-02/a-v-draft-h2.md`, A1). Medium.

### 19. Scene 1's "about NE then ENE true" (scene-1-conflict, low)

Scene 1's brief table works the Victory's ENE and E by N by compass as "about NE then ENE true". With 21° W they are 047° and 058° true (`dawn-setting.md`, F-27). 058° is about NE by E, not ENE (067.5°). The old 068° in the lab came from the same rounding. The scene 2 section rightly says 058°, but its claim that "Nothing here contradicts" scene 1 should name the rounding.

Fix, append to "Where this differs from scene 1", before the closing confidence:

> Scene 1's brief table gives the courses after bearing up, ENE and E by N by compass, as "about NE then ENE true"; worked with 21° W they are about 047° and 058° true (`research/dawn-setting.md`, F-27).

### 20. "What the crossing needed": 13 September (unsupported, low)

No. 9209's date is "date présumée" (R10; `v-h2a.md` missed point 8). "Put off, not abandoned" says so; "What the crossing needed" does not.

Fix: replace "and, looking back, fifteen days (13 September)" with "and, looking back, fifteen days (13 September, a date the editors supply)".

## Where the section touches the owner's decisions of 1 November 2026

These are not issues; the places another agent must change.

**Decision 1 (true spacing; the spread-out licence withdrawn; describe the layout and its sources, not the old coordinates):**
- **"Fleet sizes at each stage".** The intro's "(the lab shows six for each fleet ...)" and the row "Dawn off Cape Trafalgar" (27 and 33 glyphs; at the Gulf view each fleet may show only its flagship).
- **Positions, "Dawn, 21 October: the British" and "the combined fleet".** They describe the layout and its sources, and agree with the decision: centre 36°09′ N 6°14′ W, 9–12 nm east of the Victory, a line about 5 nm long, 26 in two groups with the Africa apart, single ships 3–4 nm from the Victory.
- **Positions, "Where this differs from scene 1".** The appended paragraph from "The lab opens the spacing within each fleet ..." to "... how far apart the two groups were."
- **Positions, "What the chart draws now".** The dawn sentence ("At dawn on 21 October: the Victory at 36°08′ N 6°28′ W with three 98s ... on 183–192° true") and the closing "the dawn spacing and the British heading are licences".
- **Assumptions 2, "The dawn spacing"** (withdrawn), and Assumptions 3 (six ships for each).
- **Open doubts, "The chart's dawn licences (the owner's call)".** Its combined-line and British-spread parts; and "Dawn, 21 October", whose coast distances agree with the decision.
- **Outside the section.** `docs/decisions.md`, "The dawn fleets are spread out: a licence (session 9)", which Assumptions 1 cites.

**Decision 2 (047° kept as a deliberate licence, the owner's decision):**
- Positions, "Dawn, 21 October: the British": the logged headings, which are the facts behind the licence.
- Positions, "Where this differs from scene 1": "(the chart draws them on 047° true, the course after bearing up, some 20–30 minutes after scene 1's sunrise)".
- Positions, "What the chart draws now": "all on 047° true" and "the British heading are licences".
- Assumptions 1, "The British heading at the handoff": say it is the owner's decision; its pointer to `decisions.md`, "The dawn fleets are spread out", will change.
- Open doubts, "Dawn, 21 October": the heading sentence. Open doubts, "The chart's dawn licences": "The British heading: 047° on the chart, against N by E ...".

**Decision 3 (caption "a chain of frigates and ships of the line"):**
- Brief table, row "Beat 4 caption: 'linked to the coast by a chain of frigates'": drop ', or "a chain of warships" at the same length'.
- "The chain" ("beat 4's 'chain of frigates' is wrong") and "What would be wrong" ("a chain of frigates only") agree with it and need no change.

## What holds

- **Merge losses: none.** Every fact, date, number, position, doubt and source of `draft-h2.md` is in the section. Its table of 19 October is carried by the signals tables, with the Colossus with the Mars (A4), the Sirius at 4 a.m. (A10) and the Agamemnon's place not logged (A25c). Changed wording traces to a ruling in every case.
- **Session 9 rulings: all applied.** A1 (outer and inner ships, verbatim), A2, A3 (verbatim), A4, A5 (verbatim), A6 and A15 (merged; James's 5 p.m. tack is said once), A7 (verbatim), A8 (Key sources and Beatty pages), A9 and A12 (verbatim), A13, A14, A16, A17, A18, A19, A20, A21, A22, A23, A24 (text), A25 (b, c), A26, A27 and A28. The thirteen doubts of `a-v-draft-h2.md` are all in "Open doubts".
- **Session 7 rulings.** Followed throughout, except the points in issues 5, 6, 11, 12 and 13.
- **The chart.** "What the chart draws now" matches `fleets.ts` exactly:
  - British: 36°00.5′–36°11.4′ N, 6°25.1′–6°31.3′ W, three 98s and two 74s, all 047°;
  - combined: 36°00′–36°16.2′ N, 6°12′–6°15′ W, headings 183–192°, the Bucentaure (an 80) at 36°09.6′ N 6°14.4′ W;
  - the outer-bay five from 36°34.0′ N 6°17.0′ W to 36°33.6′ N 6°15.6′ W, the 80 at 36°33.7′ N 6°17.2′ W, and the narrows 74 at 36°31.0′ N 6°15.2′ W, all on 294°.
  
  The northern combined glyph is 4.84 nm off the chart's coast, as stated.
- **Scene 1.** Consistent with "The setting" and "The fleets": 27 British, 26 in two groups with the Africa apart; the enemy 9–12 nm east, about 5 nm long, heading south; bearing up about 06:40–07:00.
- **Style.** Bold lead-ins and a confidence on every fact bullet; the doubts and the licences carry none, as in scene 1. Quotations are short period phrases. The tables render (5 and 6 pipes per row throughout).

## Positions checked (Natural Earth 10 m land plus minor islands)

| Point | Lat, lon | Chart | Off the chart's coast |
| --- | --- | --- | --- |
| Anchorage centre; line ends | 36°33.8′ N 6°16.4′ W; 36°34.0′ N 6°17.1′ W, 36°33.6′ N 6°15.7′ W | sea | 1.74; 1.77, 1.54 nm |
| Glyph box corners | 36°33.4′–34.1′ N, 6°15.5′–17.2′ W | sea | 1.10–1.85 nm ("1.0 nm" holds) |
| Outermost ships; harbour mouth | 36°33.7′ N 6°17.2′ W; 36°33.5′ N 6°17.4′ W | sea | 1.46; 1.23 nm |
| Narrows glyph; ruling's midpoint | 36°31.0′ N 6°15.2′ W; 36°30.7′ N 6°15.4′ W | sea; land | 0.27 nm (Puntal side); 0.04 nm inland |
| Matagorda side | fort 36.5144 N 6.2498 W; 1 nm east of it | sea; sea | no chart land until about 1.2 nm east of the fort |
| "Not here" | 36°33′ N 6°18′ W | sea | 0.68 nm |
| Algésiras 4 p.m.; Magon 6 p.m.; Montañés 9 a.m. | 36°33.0′ N 6°22.0′ W; 36°29.4′ N 6°23.1′ W; 36°34′ N 6°25′ W | sea | 2.9; 4.5; 3.9 nm |
| Main station; Victory 9.30; noon log | 36°32′ N 7°22′–25′ W; 36°34′–35′ N 7°24′ W; 36°36′ N 7°30′ W | sea | 34–35; 32–33; 28 nm |
| British 20 Oct daybreak; noon (compass, true) | 36°00′ N 5°58′ W; 36°07′ N 6°33′ W, 36°13′ N 6°43′ W | sea | 9.5; 22.0, 26.6 nm |
| Combined fleet at nightfall (true, compass) | 36°25′ N 6°27′ W; 36°23.5′ N 6°23.5′ W | sea | 9.7; 7.9 nm |
| British dawn; Africa 6 a.m. | 36°08′ N 6°28′ W; 36°21′ N 6°30′ W | sea | 18.1; 13.7 nm |
| Combined centre; its north and south ends (±2.5 nm) | 36°09′ N 6°14′ W; 36°11.5′ and 36°06.5′ N | sea | 9.2; 7.65 and 10.6 nm |
| Gibraltar Bay; Tetuan Bay | 36°08′ N 5°22′ W; 35°38′ N 5°15′ W | sea | 0.5; 0.9 nm |
| Boulogne flotilla line (ends, middle) | 50°43.5′ N 1°33.3′ E to 50°44.7′ N 1°33.9′ E | sea | 0.61–0.64 nm |
| Chart coast at the harbour's latitude | 50.727 N | coast between 1.570 and 1.575 E | "about 1°34.5′ E" holds |
| Tour d'Ordre; Outreau; Wimereux; Ambleteuse; Étaples; Pont-de-Briques | as in the text and data | land | 0.1–2.4 nm inland |
| All 18 `LAB_MARKS` in `fleets.ts` | | sea | British 15–22 nm; combined 4.8–13.9 nm; anchored 1.46–1.77 nm, narrows 0.25 nm |

## Outside the section

- **Narrows room.** `docs/decisions.md`, "No glyph stands on the shore", still gives the anchorage rooms as "3.6–5.4 km (3.2 in the narrows)". Since the narrows ship moved (`a-v-draft-h2.md`, A1), `fleets.ts` gives it 4.1.
- **The dawn licence.** `docs/decisions.md`, "The dawn fleets are spread out: a licence", needs the owner's decision 1.

## Files

- **Downloads**, each in its own folder under `C:/Users/User/AppData/Local/Temp/claude/d--dev-trafalgar-1805/e9a0e7b8-e3f9-4707-b98f-23473d29859b/scratchpad/dl/`:
  - `vmh2-nicolas7/nicolas7.txt` (Nicolas VII, archive.org full text);
  - `vmh2-james3/james3.txt` (James III, archive.org full text).
- **Scripts** in `C:/Users/User/AppData/Local/Temp/claude/d--dev-trafalgar-1805/e9a0e7b8-e3f9-4707-b98f-23473d29859b/scratchpad/scripts/`:
  - `vmh2-diff.js` (word diff of bullets by lead-in);
  - `vmh2-ne.js` (Natural Earth land or sea, distance and bearing to the coast);
  - `vmh2-pts1.json`, `vmh2-pts2.json`, `vmh2-pts3.json` (the points tested).
