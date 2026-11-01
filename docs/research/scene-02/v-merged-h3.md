# V-merged-h3: check of the signals part of the merged "Scene 2" section

Checked: `docs/research/scene-02/history-scene-02-merged.md` (434 lines), the signals part only:
- the two brief rows on the "chain of frigates" caption and on the chain "lighting up" (lines 25–26);
- "Signals in 1805, by day and by night" (185–196);
- "The signal chain, 19 to 21 October" with its relay table (198–228);
- "How the chart shows the signals" with both position tables (230–281);
- "Assumptions and licences", items 8 and 9 (345–346);
- "Open doubts": the relay of 19 October, the night of 20–21 October, and "Signals: colours, books and ranges" (401–403);
- "Key sources": the signal books, Popham, Perrin, FOTW, Smyth, the fireworks sources and the logs (413–426).

Measured against: `draft-h3.md` (paragraph by paragraph), `v-draft-h3.md` (all 28 points, with the README's list of what the merge had to apply), `a-h3.md`, `drafts-data.json` [0], and as background `h3-signals.md`, `v-h3a.md`, `v-h3b.md`, `a-v-draft-h2.md` (A6, A10), `a-h2b.md` (H2-20b), `a-h2c.md` (H2-30c), scene 1's sections of `docs/history-notes.md`, and the chart code (`src/scenes/02-road/fleets.ts`, `routes.ts`, `gazetteer.ts`). No file in the repository was changed.

## Verdict

The signals part is sound. Every point of `v-draft-h3.md` that the merge had to apply is in, with its text: 6 (the URLs), 7 and 12 in "The ends", 9, 11, 15, 18, 19, 23 and 26, the rest of 20 and 21, and what 24, 25 and 27 ask of the text. Every paragraph and table row of `draft-h3.md` survives. "The chain as set" was cut down to a pointer, but each fact it held is in "Nelson off Cádiz" ("The station", "Blackwood's squadron", "The chain"). Three table rows were changed to follow `a-v-draft-h2.md` A10 and `a-h2b.md` H2-20b: the Sirius at 4 a.m., the Euryalus's noon point, and the Victory's 16-league point. Nothing in the part contradicts `a-h3.md` or scene 1.

The positions were recomputed. All 19 lie at sea, 3.6–34.7 nm off the chart's coast. The nightfall point is 9.4 nm off, as the section says. The sun at 7.00, 9.30 and 10.15 recomputes to within a few tenths of a degree. The leaf links were checked against archive.org's scan data: James p. 388 = n405, Desbrière annexes p. 139 = n408, Fraser p. 88 = n119, and the NRS log leaves are all right.

The faults are of completeness and precision. Nothing is high:
- **Two medium faults.** The night chain lost the schooner Pickle, which is logged and was in the drafter's data. Licence 8 sources the held hoists to "the 1799 rule books" (the section's own sources are Popham 1803 and the Signal-Book of 1796), says no log records them although the Agamemnon logged "Kept the signal up" on the 20th, and leaves out other by-the-book details the chart shows.
- **Versions dropped.** The Naiad's eleven of the line at noon on the 19th; Walker's 26; Corbett's "easternmost" slip; the 7.10 general signal that explains Corbett's "in ten minutes".
- **The brief rows.** The caption guidance "never 'within two hours'" (R10) was dropped, and "the chain itself was ships of the line" contradicts the frigate links.
- **Smaller points.** The counted gun puffs of the 19th are not marked as an analogy with the 20th. The RSC link is dead, and that piece says greens, not yellows. Robinson is missing from "Key sources". The Defence–Mars gap is 15.7 nm, not 15.5. There are a few style points.

## Where the part touches the owner's decisions of 1 November (for the agent applying them; not raised as issues)

- **Decision 3 (caption).**
  - Line 25, the "Beat 4 caption" row, Scene column: drop "or "a chain of warships" at the same length". Issue 8 below gives the whole row with the decision applied.
  - Line 133, "Nelson off Cádiz" > "The chain": "beat 4's "chain of frigates" is wrong" can name the new caption.
  - Line 253, "Wrong in kind": "a chain of frigates only" agrees with the decision and needs no change.
- **Decision 2 (heading 047° as a licence).** The signals part gives only the 4 a.m. wear course, "to the NE by Nelson's diary … but N by E by the Victory's log" (line 227; Open doubts line 400). That agrees with the decision's N by E at first light, so nothing changes here. The places to change are outside this part: lines 295, 297, 300, 338 (licence 1), 404 and 405.
- **Decision 1 (true spacing at dawn).**
  - In this part, the night table's midnight row (line 276) interpolates to the dawn centre. Licence 6 ends the night tracks on the dawn positions. The decision keeps that centre (36°09′ N 6°14′ W), so both stand.
  - The places to change are outside this part: line 154 (the lab shows six for each fleet), lines 297 and 300, licences 2 and 3 (lines 339–340), and line 405.

## Issues, most severe first

### 1. The night chain lost the Pickle (lost-in-merge, medium)

**Where.** "The signal chain, 19 to 21 October" > "The night chain, 20–21 October" (line 223), and "How the chart shows the signals" > By night > "Geometry" (line 242).

**Problem.** The drafter's data put the schooner Pickle in the night chain, with the Sirius (`drafts-data.json` [0], `fleetRows[1].others`: "the schooner Pickle with the Sirius (NRS II 317)"). `v-h3b.md` H3-23 counts her log among the night chain's.

Her log (NRS II 317, page image read) says that on the 20th:
- at 5.40 p.m. she "repeated several signals from the Sirius to the fleet";
- from 8 to 12 she was with "the Sirius in company making signals to the Commander-in-Chief".

The section names only four frigates and three ships of the line, and the "Fleet sizes" table counts ships of the line only. So the Pickle appears nowhere for the night, though beat 5 draws the chain's members.

**Fix.** Replace the bullet with:

> - **The night chain, 20–21 October.** Nelson's memorandum set it: Blackwood with two frigates in sight of the enemy, two more between him and the Defence, the Colossus between the Defence and the Mars, and the Mars in touch with the Victory (Nicolas VII 136). The logs put the Euryalus and Sirius by the enemy, the Phoebe and Naiad between, and the schooner Pickle with the Sirius, repeating her signals to the fleet from 5.40 p.m. and in her company until midnight (NRS II 317). High.

In the night "Geometry":

> - **Geometry.** A short chain between the closing fleets, running SW from the enemy's western flank: the Euryalus about 3 nm NW to W of the enemy's body, the Sirius 4 nm WSW of it with the schooner Pickle in company, then the Phoebe, Naiad, Defence, Colossus and Mars, and the Victory 5–6 nm SW of the Euryalus (table below). Place them on the enemy's track, itself uncertain (`research/scene-02/a-h2c.md`, H2-32i). Low.

The NRS line in "Key sources" gets "Pickle, p. 317: https://archive.org/details/logsofgreatseaf02jack/page/n334/mode/1up" (see issue 2 for the whole line).

**Evidence.**
- `drafts-data.json` [0], `fleetRows[1].others`
- `v-h3b.md`, H3-23
- `h3-signals.md` §3.7, the 5.40–12 p.m. row
- NRS II 317, Pickle's log, 20 October p.m.: https://archive.org/details/logsofgreatseaf02jack/page/n334/mode/1up

### 2. Licence 8 gets its sources and its "no log" wrong (factual-error, medium)

**Where.** "Assumptions and licences", item 8, "Signals by the book" (line 345).

**Problem.** It has three faults:
1. It says the held hoists and the wear lights "follow the 1799 rule books". The section's own "Repeating" bullet (line 189) sources the day rule to Popham (1803, p. 6) and the *Signal-Book* of 1796 (`h3-signals.md` §1.3; `v-h3a.md` H3-03a–b). Only the night rule, the wear lights and No. 31 are in the 1799 *Night Signals* (R16).
2. "No log of those days records them" is too strong for the hoists. On 20 October the Agamemnon's log has "Kept the signal up" (NRS II 300, page image read; `h3-signals.md` §1.4; `v-h3a.md` H3-04e).
3. It leaves out other details the chart shows that rest on the books, or on the 20th rather than the 19th:
   - No. 31 made as three guns and two lights, or a square of four lanterns (line 245);
   - the one-light answer (line 243);
   - the counted pairs or threes of gun puffs at each link on the 19th (line 235). The section's own brief row (line 26) says counted guns are logged only on the 20th.

**Fix.** Replace item 8 with:

> 8. **Signals by the book.** Some of what the chart shows comes from the rule books, not from the logs of 19–21 October: each day hoist kept flying until the Victory's answer runs back (Popham 1803, p. 6; the *Signal-Book* of 1796; the 1799 *Night Signals* give the same rule by night); No. 31 made as three guns and two lights, or near an enemy a square of four lanterns; two lights at each ship's ensign staff and one at her bowsprit end while the fleet wears; and one light in answer to a signal (the 1799 *Night Signals*). No log of the 19th records hoists held down the chain, though on the 20th the Agamemnon logged that she kept the signal up (NRS II 300); no log of the night records the wear lights. The counted pairs or threes of gun puffs at each link on the 19th follow the counted guns logged on the 20th (NRS II 165, 167): on the 19th the logs record only the Phoebe's three-minute guns and a ship firing guns seen from the fleet.

Whole NRS line for "Key sources", with the two pages these fixes cite:

> - T. Sturges Jackson (ed.), *Logs of the Great Sea Fights 1794–1805*, vol. II (Navy Records Society, 1900): the frigates' logs and signal logs of 18–21 October: https://archive.org/details/logsofgreatseaf02jack (Euryalus, pp. 145–150: https://archive.org/details/logsofgreatseaf02jack/page/n162/mode/1up; signal log, p. 160: https://archive.org/details/logsofgreatseaf02jack/page/n177/mode/1up; Mars, p. 245: https://archive.org/details/logsofgreatseaf02jack/page/n262/mode/1up; Agamemnon, p. 300: https://archive.org/details/logsofgreatseaf02jack/page/n317/mode/1up; Naiad, pp. 302–303: https://archive.org/details/logsofgreatseaf02jack/page/n319/mode/1up; Phoebe, p. 306: https://archive.org/details/logsofgreatseaf02jack/page/n323/mode/1up; Sirius, pp. 312–313: https://archive.org/details/logsofgreatseaf02jack/page/n329/mode/1up; Pickle, p. 317: https://archive.org/details/logsofgreatseaf02jack/page/n334/mode/1up; Walker, pp. 322–323: https://archive.org/details/logsofgreatseaf02jack/page/n339/mode/1up)

**Evidence.**
- Merged section, "Repeating" (line 189)
- `h3-signals.md` §1.3, §1.4, §2.1, §2.3
- `v-h3a.md`, H3-03a, H3-03b, H3-04e
- `a-h3.md`, R16
- NRS II 300, Agamemnon's log, 20 October a.m.: https://archive.org/details/logsofgreatseaf02jack/page/n317/mode/1up

### 3. The Naiad's eleven of the line at noon on the 19th is missing (missing-version, low)

**Where.** "Orders, Rosily and the sortie" > "19 October" (line 145) and "Open doubts" > "The sortie" (line 398). These lie outside this part, but they qualify two lines inside it: the relay table's 2 p.m. row ("though only seven of the line were out", line 217) and the brief row ("Only seven of the line got out that day", line 26).

**Problem.** At noon on 19 October the Naiad logged "Eleven of the enemy's line-of-battle ships outside of San Sebastian lighthouse", the light bearing 11 or 12 miles (NRS II 302, page image read). `a-h3.md` R7 lists this count, and `a-h2c.md` H2-30c does not. It is a British count of ships of the line out that day, so it belongs among the versions. The seven stands on the French journal and the Spanish diary.

**Fix.** In "19 October", replace the British-count sentence with:

> British observers counted 9 sail at 4 p.m. and 12 at 6 p.m., frigates included, and that is where James's and Nicolas's "twelve ships" comes from (NRS II 146; `research/scene-02/a-h2c.md`, H2-30c); the Naiad at noon logged eleven "line-of-battle ships" outside the San Sebastián light, from 11 or 12 miles off (NRS II 302; `research/scene-02/a-h3.md`, R7).

In "The sortie" (Open doubts), the list of counts becomes:

> … nine (Prigny, from memory), eleven of the line at noon (the Naiad, from 11 or 12 miles off) and twelve (James and Nicolas, from the Euryalus's count of all sail).

**Evidence.**
- NRS II 302, Naiad's log, 19 October a.m.: https://archive.org/details/logsofgreatseaf02jack/page/n319/mode/1up
- `a-h3.md`, R7 (evidence list: "Naiad, noon")
- `a-h2c.md`, H2-30c

### 4. The colours-and-books doubt has the same wrong books, and its rulings have no file (factual-error, low)

**Where.** "Open doubts" > "Signals: colours, books and ranges" (line 403).

**Problem.**
- It says the held hoists "come from the 1799 rule books". They come from Popham (1803) and the *Signal-Book* of 1796 (see issue 2).
- "No log of those days records them" overlooks the Agamemnon's "Kept the signal up" (20 October).
- Its rulings, "(R16, R25)" and "(R21–R22)", name no file in this bullet, unlike the two bullets before it.
- The second recorded colour dispute of the period flags is missing: numeral 1 of the 1799 book is plain red in the copy FOTW describes, yellow-red-yellow in Perrin (`v-h3a.md` H3-01c; `h3-signals.md` §6).

**Fix.** Replace the bullet with:

> - **Signals: colours, books and ranges.** The 1804 values of the numeral flags (Perrin's Plate XIII) were not transcribed; numeral 1 of the 1799 book is plain red in the copy FOTW describes, yellow-red-yellow in Perrin. Which half of Popham's telegraph flag was red: Popham names only "a diagonal red and white flag" (1803, p. 6); Perrin has white and red, Wilson red over white, Kent white over red, and Barraclough found both in contemporary books (all via FOTW). The hoists held along the chain until the Victory's answer ran back come from Popham (1803, p. 6) and the *Signal-Book* of 1796; the wear lights (two at the ensign staff, one at the bowsprit end) and the form of No. 31 (three guns and two lights, or a square of four lanterns) come from the 1799 *Night Signals* (`research/scene-02/a-h3.md`, R16, R25). No log of 19–21 October records them, except that on the 20th the Agamemnon kept the signal up (NRS II 300). All ranges are estimates: flag colours readable at about 4–11 nm, lanterns at 1–3 nm, blue lights at 5–14 nm (`research/scene-02/a-h3.md`, R21–R22). The blue light's burn is inferred from the false fire's, the only one defined (Smyth 1867). The colour of the British fires, which French observers remarked on (the Cornélie, the Argus; Lucas), is read as bluish blue lights against their own yellow lanterns and gold rockets.

**Evidence.**
- `h3-signals.md` §1.3, §6 ("Numeral 1 of 1799")
- `v-h3a.md`, H3-01c, H3-03a, H3-03b
- `a-h3.md`, R16
- NRS II 300: https://archive.org/details/logsofgreatseaf02jack/page/n317/mode/1up

### 5. "One link" puts counted gun puffs on the 19th without saying they are an analogy (unsupported, low)

**Where.** "How the chart shows the signals" > By day > "One link" (line 235).

**Problem.** The bullet gives each link "a counted pair or three of white gun puffs". The section's own brief row (line 26, `v-draft-h3.md` point 27) says counted guns with each hoist are logged only on the 20th. On the 19th the logs have only the Phoebe's three-minute guns and Walker's ship "firing guns". The 1796 book made signals "generally … without Guns" unless guns formed part of them (`h3-signals.md` §1.4). The bullet marks only the held hoists as "the rules; not logged that day".

**Fix.** Replace the bullet with:

> - **One link.** Two or three flag dabs at the masthead, hand-tinted red, white, blue and yellow, and a counted pair or three of white gun puffs at the side; after a pause the next ship does the same. Hoists stay up until the Victory answers, so lit links accumulate westward, then come down as the answer runs back. Neither is logged on the 19th: the held hoists follow the rules, and the counted puffs the counted guns logged on the 20th (NRS II 165, 167), while the logs of the 19th record only the Phoebe's three-minute guns and a ship firing guns seen from the fleet (see "Assumptions and licences"). Medium.

**Evidence.**
- Merged section, brief row on "lights up" (line 26)
- `v-draft-h3.md`, point 27
- `a-h3.md`, R12
- `h3-signals.md` §1.4

### 6. Versions of the relay ruled or confirmed but not recorded (ruling-not-applied, low)

**Where.** "Open doubts" > "The relay of 19 October" (line 401). The first item could also go in the relay table's "within 15 minutes" row.

**Problem.** Three points are missing:
1. `a-h3.md` R7, a final statement, gives "27 of the line" and "Walker's '26' under sail is the low count". The section uses the 27 and drops Walker's 26.
2. R9's final statement explains that at 7.10 the Euryalus made only a general signal, No. 108 ("close nearer the Admiral"). The section keeps "Corbett's 'in ten minutes' (7.10) has no support" without the reason.
3. `v-h3b.md` H3-17d confirms that Corbett's "Duff's easternmost ship" for the Mars is a slip. The section does not record it.

**Fix.** In the bullet, replace "The Euryalus's repeat to the Phoebe: 7.20 by the logs; Corbett's "in ten minutes" (7.10) has no support." with:

> The Euryalus's repeat to the Phoebe: 7.20 by the logs; Corbett's "in ten minutes" (7.10) has no support, and at 7.10 the Euryalus made only a general signal, No. 108, close nearer the Admiral (NRS II 160; R9).

Append to the bullet:

> The British strength: 27 of the line off Cádiz (Nicolas VII 130; Browne, NRS II 194; Cumby 1899, p. 718), 23–24 of them with Nelson; Walker's 26 under all sail after the chase signal (NRS II 323) is the low count (R7). Corbett (p. 333) calls the Mars "Duff's easternmost ship", a slip: his own note (p. 334 n. 2), the diary of 14 October and Beatty (1807, p. 7) put her at the fleet's end of the chain (`research/scene-02/v-h3b.md`, H3-17d).

**Evidence.**
- `a-h3.md`, R7 and R9 (ruling table)
- `v-h3b.md`, H3-17c, H3-17d
- NRS II 160: https://archive.org/details/logsofgreatseaf02jack/page/n177/mode/1up
- NRS II 323: https://archive.org/details/logsofgreatseaf02jack/page/n340/mode/1up

### 7. The "lights up" row drops "never 'within two hours'" (ruling-not-applied, low)

**Where.** "Where the sources changed the brief", the row on the chain that "lights up ship by ship" (line 26), Scene column.

**Problem.** `a-h3.md` R10 rules that Blackwood's "within two hours" is the short end. Its scene impact says captions use "by half past nine" or "some two and a half hours later", "never 'within two hours' or 'in minutes'". The drafter's data row kept both prohibitions (`drafts-data.json` [0], `briefRows[2]`). The merged row keeps only "never 'in minutes'".

**Fix.** Replace the row with:

> | The chain "lights up ship by ship when the combined fleet sails" | The relay of 19 October ran in daylight, 7 to about 9.30, with flags, Popham's telegraph and guns (the Phoebe's three-minute guns; a ship "firing guns" seen from the fleet); counted guns with each hoist are logged only on the 20th. Only seven of the line got out that day. Lights, rockets and blue lights belong to the nights of 19–20 and 20–21 October, and the night chain was a different, short chain between the closing fleets | By day each link shows a hoist and white gun puffs, in pulses, never instant; "by half past nine" or "some two and a half hours later", never "in minutes" or "within two hours"; light effects only in the night beat | High for the sequence, medium for the duration |

**Evidence.**
- `a-h3.md`, R10 (ruling and scene impact)
- `drafts-data.json` [0], `briefRows[2]`

### 8. "The chain itself was ships of the line" contradicts the frigate links (internal-contradiction, low)

**Where.** "Where the sources changed the brief", row "Beat 4 caption" (line 25), Sources column.

**Problem.** The Phoebe and the Naiad were sent out as repeaters (relay table, 7.20 and 8.10). The Phoebe lay some 17 nm out (19 October table). So the chain itself was not only ships of the line: frigates held its Cádiz end, ships of the line the links beyond. The caption the owner chose says so, and the drafter's row did too ("The outer links were ships of the line", `drafts-data.json` [0], `briefRows[0]`).

**Fix.** Replace the row with this text. The Scene column carries the owner's decision 3 and drops the alternative.

> | Beat 4 caption: "linked to the coast by a chain of frigates" | Frigates held the Cádiz end: the Euryalus and Sirius off the port, the Phoebe and Naiad sent out to repeat; the links beyond them were ships of the line (Defence, Colossus, Mars, with the Agamemnon stationed by the Defence) | Caption: "a chain of frigates and ships of the line"; frigate glyphs inshore, ships of the line beyond | High |

**Evidence.**
- Merged section, relay table rows 7.20 and 8.10, and "Positions, 19 October" (Phoebe)
- `drafts-data.json` [0], `briefRows[0]`
- `a-h3.md`, R5

### 9. The RSC link is dead, and the RSC piece says greens, not yellows (unsupported, low)

**Where.**
- "Signals in 1805" > "Night lights" (line 195)
- "What would be wrong" > "Later inventions" (line 252)
- "Key sources", the signal books line (line 426)

**Problem.**
- `https://edu.rsc.org/download?ac=13671` returns 404.
- The piece it stood for is R. Lancaster, "Fire and light in the sky" (*Education in Chemistry*, 1 September 2012). It says displays before 1800 were mostly gold, with weak greens and reds at best.
- *Physics World* says "faded reds and yellows" (`v-h3a.md` H3-13d), and `h3-signals.md` §2.6 has "weak reds and greens". Line 252's "weak reds and yellows at most (Physics World; RSC)" credits the RSC with the yellows.
- A scholarly study, Werrett 2015, argues that sixteenth- and seventeenth-century manuals already gave colour recipes, used differently from later displays. It does not touch the plain signal rockets, but it is a version of the colour history.

**Fix.** In "Night lights", replace "Rockets threw gold sparks, strong colours coming only after about 1811 (Physics World; RSC)." with:

> Rockets threw gold sparks; firework colour stayed weak until chlorate compositions, about 1811 (Physics World; Lancaster 2012, RSC).

In "Later inventions", replace the last two sentences with:

> Vivid red or green fireworks are wrong too: before about 1811 firework colours were weak at most, faded reds and yellows by *Physics World*, weak reds and greens by the RSC (Lancaster 2012); Werrett (2015) shows that earlier manuals already had colour recipes, used differently from later displays. Medium.

In "Key sources", replace the RSC entry with:

> R. Lancaster, "Fire and light in the sky", *Education in Chemistry* (Royal Society of Chemistry, 1 September 2012): https://edu.rsc.org/feature/fire-and-light-in-the-sky/2020143.article; S. Werrett, "Fireworks and color in the sixteenth and seventeenth century", *Early Science and Medicine* 20 (2015), pp. 458–477: https://doi.org/10.1163/15733823-02046p07

**Evidence.**
- RSC feature: https://edu.rsc.org/feature/fire-and-light-in-the-sky/2020143.article (the old `download?ac=13671` link returns 404)
- `v-h3a.md`, H3-13d
- `h3-signals.md` §2.6
- Werrett 2015: https://doi.org/10.1163/15733823-02046p07

### 10. Blackwood's telegraph down the chain is missing (omission, low)

**Where.** "The signal chain, 19 to 21 October" > "How long" (line 219). It supports the brief row's "Popham's telegraph" (line 26).

**Problem.** The brief row says the relay of the 19th ran "with flags, Popham's telegraph and guns". The body shows the telegraph only at the inshore end: the Sirius at 6.04, and the Naiad's traffic from 10.20. The one statement that the telegraph went down the chain is confirmed and strengthened in `v-h3b.md` H3-20, but it is not in the section. Blackwood wrote on the 19th, in the letter that gives "within two hours", that he was talking to Nelson by Popham's signals, repeated along by his frigates (Nicolas VII 131 n.). The Euryalus's signal log has telegraph messages to and from the Naiad from 10.20 a.m. to 1.50 p.m. (NRS II 161–164).

**Fix.** Replace the bullet with:

> - **How long.** About 2½ hours on the logged clocks: 7.00 by the Euryalus, 9.30 by the Victory. Blackwood wrote "within two hours", in a letter written while he was talking to Nelson by Popham's telegraph, repeated along by his frigates (Nicolas VII 131 n.; the Euryalus's telegraph messages to and from the Naiad, 10.20 a.m. to 1.50 p.m., NRS II 161–164); Browne's 10 a.m. makes three; if the Euryalus's clock already ran 45 minutes ahead of the Victory's, as Corbett found on the 20th, it was about 3¼ (`research/scene-02/a-h3.md`, R10). Medium.

**Evidence.**
- `v-h3b.md`, H3-20
- `h3-signals.md` §3.2 ("The telegraph was used down the chain the same morning")
- Nicolas VII 131 n.: https://archive.org/details/dispatchesletter07nelsuoft/page/n166/mode/1up

### 11. The Defence–Mars gap is 15.7 nm, not 15.5 (factual-error, low)

**Where.** "How the chart shows the signals" > By day > "Geometry" (line 234).

**Problem.** From the table's own points the gap is 15.7 nm by plane sailing: the Defence at 36°22′ N 6°51′ W, the Mars at 36°33′ N 7°05′ W (11.0 nm of latitude, 11.3 nm of departure). That is the figure `v-draft-h3.md` point 1 gives. The 15.5 nm matches neither the Mars nor the Colossus (14.5 nm).

**Fix.** Replace the bullet with:

> - **Geometry.** A loose line about due west (true) of Cádiz, 48–58 nm long and dipping south at the Defence: the frigates within 17 nm of San Sebastián, the Defence about 27 nm out, the Mars and Colossus 15 nm short of the fleet (the Defence–Mars gap about 15.7 nm, inside masthead range; `research/scene-02/a-h3.md`, R31), the Victory with 23–24 of the line near 36°34′–35′ N 7°24′ W (table below). Never south-west. Medium for the line, low for single ships.

**Evidence.**
- `v-draft-h3.md`, point 1 ("about 15.7 nm")
- Merged section, "Positions, 19 October", Defence and Mars rows (recomputed)

### 12. The part never says the chain is not drawn yet (chart-mismatch, low)

**Where.** "How the chart shows the signals" (line 230), the heading and the start of the subsection.

**Problem.** The subsection and licences 8 and 9 are in the present tense ("Hoists stay up…", "The relay ends at the Mars…"), but the chart draws none of it. `src/scenes/02-road/` places only the dawn and anchorage glyphs (`fleets.ts`), Villeneuve's Toulon–Cádiz track (`routes.ts`) and the names (`gazetteer.ts`). There is no chain ship and no signal code. `a-v-draft-h2.md`, "Chart changes" 2, notes that the chain ships are not drawn. "Routes on the chart" says which line is drawn now. The signals part should say the same.

**Fix.** Insert directly under the heading "### How the chart shows the signals":

> The chart does not draw the chain or its signals yet: what follows is what beats 4 and 5 are to show.

**Evidence.**
- `src/scenes/02-road/fleets.ts` (LAB_MARKS: no chain ships)
- `src/scenes/02-road/routes.ts`
- `a-v-draft-h2.md`, "Chart changes" 2
- Merged section, "Routes on the chart" ("Only the Toulon–Cádiz line is drawn now")

### 13. Robinson is cited but missing from "Key sources" (omission, low)

**Where.** "Key sources" (lines 409–433). He is cited in "Direction and length" (line 220) and in "Open doubts" (line 401).

**Problem.** Robinson's "twenty leagues" (1858) is given as a version in two places, but his book has no entry in "Key sources".

**Fix.** Add after the Cumby entry:

> - H. Robinson, *Sea Drift* (Portsea, 1858), pp. 208–209, a midshipman of the Euryalus writing some fifty years later: https://archive.org/details/seadrift00robigoog

**Evidence.**
- `h3-signals.md`, sources (Robinson, *Sea Drift*, pp. 208–209)
- https://archive.org/details/seadrift00robigoog

### 14. The enemy's night guns have no source (unsupported, low)

**Where.** "The signal chain" > "Dark and light" (line 228).

**Problem.** The parenthesis sources the stern and top lights, the rockets, the flares and the six miles, but not the Combined Fleet's own guns. The Sirius at 7.40 p.m. saw the enemy fleet making signals "with guns, rockets, &c." (Nicolas VII 134 n.; `h3-signals.md` §3.7).

**Fix.** Replace the bullet with:

> - **Dark and light.** Moonless, cloudy and very dark. The watching ships hid their lights (an officer of the Defence, Fraser 1906, p. 95), and the British side showed little but the Admiral's lights, answers and blue lights. The Combined Fleet showed stern and top lights along a line some six miles long, with rockets, flares and guns of its own (stern and top lights and rockets: Prigny, Desbrière 1907, annexes p. 139; flares: Lucas, Fraser 1906, p. 92; guns: the Sirius at 7.40 p.m., Nicolas VII 134 n.; six miles: Fraser 1906, p. 95). High.

**Evidence.**
- `h3-signals.md` §3.7 (7.40 p.m. row)
- `v-h3b.md`, H3-26
- Nicolas VII 134 n.: https://archive.org/details/dispatchesletter07nelsuoft/page/n169/mode/1up

### 15. "Popham's telegraph" does not end with a confidence (style, low)

**Where.** "Signals in 1805" > "Popham's telegraph" (line 188).

**Problem.** "High." stands in the middle of the bullet. The disputed colour clause after it ends without a confidence, while `a-h3.md` R28 rates it medium.

**Fix.** Replace the bullet with:

> - **Popham's telegraph.** A diagonal red and white flag announced a message, one hoist per word or phrase from Popham's numbered vocabulary (1803). Issued to ships of the line from 1803; in September 1805 the Admiralty decided every ship, cruisers included, should carry it (Corbett 1910, pp. 298–301). Which half was red is disputed: Popham says only "a diagonal red and white flag" (1803, p. 6), Perrin white and red, Wilson red over white and Kent white over red, and Barraclough found both in contemporary books (all via FOTW); invisible at chart scale. High for the code, medium for the flag's colours.

**Evidence.**
- `a-h3.md`, R28 (medium)
- Style of `docs/history-notes.md` (a confidence at the end of every bullet)

### 16. Licence 9 says the relay "ends at the Mars" (style, low)

**Where.** "Assumptions and licences", item 9, "The Mars's distant signal" (line 346).

**Problem.** "The relay ends at the Mars" misplaces the end: the Victory answers and makes the chase (relay table, 9.30). The item also leaves out the step the chart shows first, coloured flags the fleet cannot read, and the doubt that goes with it.

**Fix.** Replace the item with:

> 9. **The Mars's distant signal.** At the relay's last link the Mars shows first coloured flags the fleet cannot read, then three dark shapes at three mastheads (a flag, a ball and a pendant), on the word of one eyewitness writing years later (Cumby 1899, p. 719); no printed description of the Distant Signals of 1805 was found.

**Evidence.**
- `a-h3.md`, R14 and its scene impact
- Merged section, relay table, 9.30 row

### 17. "The station" cites a check report for Nelson's letter to Ball (style, low)

**Where.** "Nelson off Cádiz" > "The station" (line 130). It lies outside this part, but "The chain as set" (line 202) now points to it for the fleet's station.

**Problem.** "15–18 in a letter to Ball, `research/scene-02/v-draft-h3.md`, 5" cites a check report for a letter Nicolas prints: Nelson to Ball, 11 October (Nicolas VII 111). Page 111 is already in the bullet's closing citation.

**Fix.** Replace the bullet with:

> - **The station.** Nelson kept the body of the fleet "from sixteen to eighteen leagues West of Cadiz" (to Blackwood and Barham, 4–5 October; "15 lgs. to twenty" in his diary of 14 October, Hudson 1917, p. 21; 15–18 in his letter to Ball of 11 October), never north of the port's parallel, ready to crowd sail for Cape Spartel if the enemy came out (Nicolas VII 73–75, 111, 122). His reasons: not to be caught close in by a westerly gale and swept into the Strait, and to hide his strength and tempt the enemy out (to Barham, 5 October; Corbett 1910, pp. 326–327). High.

**Evidence.**
- `h3-signals.md` §3.1 ("11 October, to Ball … the fleet 15–18 leagues west of Cádiz (Nicolas VII 111)")
- `v-h3b.md`, H3-15 evidence (Nicolas VII 110–111)

### 18. The Pickle counted 4 frigates at 3 p.m. on the 20th, not 5 (factual-error, low)

**Where.** "Orders, Rosily and the sortie" > "At sea" (line 148). This is outside the signals part; it was found while reading the Pickle's page for issue 1.

**Problem.** The bullet sources "33 of the line, 5 frigates and 2 brigs" partly to the Pickle's log at 3 p.m. Her log reads "33 sail of the line, 4 frigates and 2 brigs" (NRS II 317, page image read).

**Fix.** Replace "(Pickle's log at 3 p.m.; the Thémis)" with:

> (the Thémis; the Pickle's log at 3 p.m. has 4 frigates, NRS II 317)

**Evidence.**
- NRS II 317, Pickle's log, 20 October p.m.: https://archive.org/details/logsofgreatseaf02jack/page/n334/mode/1up

## What was checked and stands

- **The `v-draft-h3.md` points.** Each one listed for the merge is applied with its text:
  - 6: the URLs, under "Key sources".
  - 7 and 12: in "The ends".
  - 9: the 4 a.m. course, NE by the diary and N by E by the log, with the logs' times.
  - 11: 5 p.m. by the Victory, 5.40 by the Euryalus, "a little before sunset", and 5 against 6 p.m.
  - 15: "no log says whether the Victory burned blue lights then".
  - 18: Beatty's "wore twice", which is on p. 10 of the 1807 edition (page image read).
  - 19: Nelson's diary and Beatty on the night repeating.
  - 20: the citations for Physics World, Perrin and FOTW, and Prigny, Lucas and Fraser.
  - 21: the French remarks on colour, and the fireworks sentence split out at medium.
  - 23: medium-low for the Defence and the Mars.
  - 24: the night row in "Fleet sizes".
  - 25: the "Date line" bullet.
  - 26: the 147° track against the 193° course.
  - 27: "counted guns … logged only on the 20th".
- **No losses.** Every paragraph and table row of `draft-h3.md` is in the section. The draft's "The chain as set" facts sit in "Nelson off Cádiz".
- **Changed rows.** The Sirius at 4 a.m., the Euryalus's noon point and the Victory's 16-league point (36°33′ N 7°18′ W) follow `a-v-draft-h2.md` A10 and `a-h2b.md` H2-20b. `a-h3.md` R3 has 36°34′ with 20° W; the difference is the variation used.
- **Leaf links**, checked against archive.org's scan data:
  - James III p. 388 = n405 (p. 389 = n406, as `a-h3.md` says);
  - Desbrière annexes p. 139 = n408 (Prigny's night page); main text p. 164 = n189;
  - Fraser p. 88 = n119 (page image read);
  - NRS II p. 160 = n177, p. 302 = n319, p. 312 = n329.
- **Links that resolve:** FOTW (both pages), Gutenberg 46370 (Perrin), Smyth, Physics World, the 1858 NZ Gazette, the 1778 *Britannica*, Colomb in the DNB, the 1799 *Night Signals*, the 1796 *Signal-Book*, and Popham p. 6.
- **Positions** against Natural Earth 10 m, distance to the chart's coast:
  - Sirius 4 a.m.: 4.3 nm; the Tavira reading 3.6 nm.
  - Euryalus 5.30: 4.2 nm; at 8: 5.3 nm; at noon: 7.9 nm.
  - Naiad 11.3 nm; Phoebe at noon 15.0 nm.
  - Defence 27.3 nm; Colossus 32.5 nm; Mars 32.9 nm.
  - Victory 32.5 nm; main body 34.7 nm.
  - Combined Fleet at nightfall: 9.4 nm at the ruling's point (36.422 N 6.448 W); the compass reading 8.0 nm.
  - Phoebe at 8 p.m.: 15.5 nm.
  - At midnight: the enemy centre 8.8 nm, the Euryalus 9.7 nm, the Sirius 12.6 nm, the British light 14.4 nm.
- **Bearings recomputed.** At midnight the Euryalus is 3.1 nm NW of the enemy's centre (SE by S by compass ✓); the Sirius is 4.1 nm WSW of it (the enemy east by compass ✓); the British light is 5.5 nm SSW of the Euryalus.
- **The sun**, recomputed: 5.8° at 107° (7.00), 31.7° at 135° (9.30), 37.4° at 147° (10.15).
- **Quotations and style.** The quotations are short period phrases, and none comes from a modern source. Every bullet has a bold lead-in. The Markdown tables have consistent columns, and the bold markers balance.
- **The Naiad's log, 19 October** (NRS II 302, page image). Her repeating "from the Euryalus to the Phoebe" is undated after "At 7", so the relay table's 8.10 stands.
