# A-V-merged-h3: rulings on the check of the signals part of the merged "Scene 2" section

Rules on the 18 issues of `v-merged-h3.md`, the independent check of the signals part of `docs/research/scene-02/history-scene-02-merged.md` (brief rows 25–26; lines 185–281; licences 8–9; open doubts 401–403; key sources). The check also raised three points outside that part (issues 3, 17 and 18); they are ruled here too. No file in the repository was changed.

**Method.** Each issue was measured against `draft-h3.md`, `v-draft-h3.md` (with the README's list of what the merge had to apply), `a-h3.md`, `drafts-data.json` [0], and as background `h3-signals.md`, `v-h3a.md`, `v-h3b.md`, `a-h2c.md` (H2-30c) and `v-h2c.md`. Where an issue turned on a page, the page was opened afresh, each download in its own new folder:
- NRS *Logs* II, OCR of the whole volume, and page images of p. 300 (leaf n317, the Agamemnon) and p. 317 (n334, the Pickle);
- Nicolas VII, OCR of the whole volume, and the page image of p. 135 (n170, the frigates' and the Pickle's log extracts);
- Corbett 1910, OCR of pp. 333–334;
- Desbrière 1907, OCR of annexes p. 139 (Prigny);
- Robinson, *Sea Drift* (1858), OCR, and the page images of leaves n217 (p. 209) and n220 (p. 212);
- the RSC and *Physics World* articles, and the bibliographic records of Werrett 2015;
- the chart code in `src/scenes/02-road/` (including the uncommitted Stage B files).

Distances were recomputed by plane sailing (script `scratchpad/scripts/amh3-dist.js`).

**The owner's decisions of 1 November 2026.** Decision 3 settles the caption ("a chain of frigates and ships of the line") and drops the alternatives "a chain of warships" (the lead's row) and "a chain of ships" (the drafter's data, `briefRows[0]`). Issue 8 carries it. Decisions 1 and 2 touch none of these rulings. The night table's midnight row interpolates to the dawn centre, which decision 1 keeps. The 4 a.m. course given here (N by E by the log, NE by the diary) agrees with decision 2.

## Ruling table

| # | Issue | Where | Ruling | In one line |
| --- | --- | --- | --- | --- |
| 1 | The Pickle lost from the night chain | "The night chain" (223); night "Geometry" (242) | holds | Her log has her repeating the Sirius's signals from 5.40 p.m. and in her company until midnight (NRS II 317; Nicolas VII 135 n.); the drafter's data had her |
| 2 | Licence 8: wrong books, "no log", details missing | Licence 8 (345) | holds | The day rule rests on Popham 1803 and the 1796 book; the Agamemnon logged "Kept the signal up" on the 20th; No. 31's form, the one-light answer and the counted puffs are also by the book or by analogy |
| 3 | The Naiad's eleven of the line at noon on the 19th | "19 October" (145); "The sortie" (398) | holds | NRS II 302 (image read by the check, OCR read here); a British count no ruling lists |
| 4 | The colours-and-books doubt | Open doubts (403) | holds | Same book and "no log" faults as issue 2; rulings without a file; the numeral-1 dispute missing. The text adds that the 1799 day book was not read |
| 5 | Counted gun puffs on the 19th unmarked | "One link" (235) | holds | Counted guns with hoists are logged only on the 20th (the section's own brief row) |
| 6 | Walker's 26, the 7.10 No. 108, Corbett's "easternmost" | Open doubts, "The relay" (401) | holds | R7 and R9 statements and a confirmed version not carried over |
| 7 | "Never 'within two hours'" dropped | Brief row 26 | holds | R10's caption rule; the text also makes the telegraph clause exact (issue 10) |
| 8 | "The chain itself was ships of the line" | Brief row 25 | holds | The Phoebe and Naiad were frigate links; decision 3 applied |
| 9 | Dead RSC link; RSC credited with yellows; Werrett | 195, 252, 426 | partly | Link and attribution hold; the check's "chlorate compositions, about 1811" and "Werrett shows" are reworded to what the sources say |
| 10 | Blackwood's telegraph down the chain missing | "How long" (219) | holds | Nicolas VII 131 n.; v-h3b H3-20 |
| 11 | Defence–Mars gap 15.5 nm | Day "Geometry" (234) | holds | 15.74 nm by plane sailing from the table's own points |
| 12 | The part never says the chain is not drawn | Heading (230) | partly | True today, but a "not yet" line goes stale when the scene is built; a timeless framing line instead |
| 13 | Robinson missing from "Key sources" | Key sources | holds | With the leaf link: p. 209 = n217 |
| 14 | The enemy's night guns unsourced | "Dark and light" (228) | holds | The Sirius at 7.40 p.m. (Nicolas VII 134 n.), and Prigny's midnight signal by guns and lanterns (annexes p. 139) |
| 15 | "High." mid-bullet in "Popham's telegraph" | 188 | holds | R28 rates the colour dispute medium; the confidence goes at the end, split |
| 16 | Licence 9 "ends at the Mars" | Licence 9 (346) | holds | The Victory answers; the coloured flags come first; the 1805 Distant Signals are undescribed |
| 17 | "The station" cites a check report for a letter | 130 | holds | Nelson to Ball, 11 October, "from fifteen to eighteen leagues West of Cadiz" (Nicolas VII 111) |
| 18 | The Pickle's 3 p.m. count: 4 frigates, not 5 | "At sea" (148) | partly | Two transcriptions differ: "five Frigates" in Nicolas VII 135 n., "4 frigates" in NRS II 317. Both must be given |

No issue was ruled "does not hold".

## Final texts

### 1. The Pickle in the night chain (holds)

Replace the "The night chain, 20–21 October" bullet with:

> - **The night chain, 20–21 October.** Nelson's memorandum set it: Blackwood with two frigates in sight of the enemy, two more between him and the Defence, the Colossus between the Defence and the Mars, and the Mars in touch with the Victory (Nicolas VII 136). The logs put the Euryalus and Sirius by the enemy and the Phoebe and Naiad between. The schooner Pickle, sent to Cape Spartel on the 19th, was with the fleet again by the afternoon of the 20th; from 5.40 p.m. she repeated the Sirius's signals to the fleet, and she kept company with the Sirius until midnight (NRS II 146, 317; Nicolas VII 135 n.). High.

Replace the night "Geometry" bullet with:

> - **Geometry.** A short chain between the closing fleets, running SW from the enemy's western flank: the Euryalus about 3 nm NW to W of the enemy's body, the Sirius 4 nm WSW of it with the schooner Pickle in company, then the Phoebe, Naiad, Defence, Colossus and Mars, and the Victory 5–6 nm SW of the Euryalus (table below). Place them on the enemy's track, itself uncertain (`research/scene-02/a-h2c.md`, H2-32i). Low.

The NRS line in "Key sources" gains the Pickle's page (whole line under issue 2).

### 2. Licence 8 (holds)

Replace item 8 of "Assumptions and licences" with:

> 8. **Signals by the book.** Some of what the chart shows comes from the rule books, not from the logs of 19–21 October. By day each hoist stays flying until the Victory's answer runs back (Popham 1803, p. 6, and the *Signal-Book* of 1796; the day book of 1799 was not read). By night, from the 1799 *Night Signals*: No. 31 made as three guns and two lights, or near an enemy a square of four lanterns; two lights at each ship's ensign staff and one at her bowsprit end while the fleet wears; one light in answer to a signal. No log records hoists held down the chain on the 19th, though on the 20th the Agamemnon, ordered to repeat signals between the Euryalus and the Admiral, logged that she kept the signal up (NRS II 148, 300); no log of the night records the wear lights. The counted pairs or threes of gun puffs at each link on the 19th follow the counted guns the Euryalus logged with her signals on the 20th (NRS II 165, 167); along the chain on the 19th the records have only guns fired by the Phoebe and by a ship seen from the fleet (NRS II 146, 312, 322).

Replace the NRS line in "Key sources" with:

> - T. Sturges Jackson (ed.), *Logs of the Great Sea Fights 1794–1805*, vol. II (Navy Records Society, 1900): the frigates' logs and signal logs of 18–21 October: https://archive.org/details/logsofgreatseaf02jack (Euryalus, pp. 145–150: https://archive.org/details/logsofgreatseaf02jack/page/n162/mode/1up; signal log, p. 160: https://archive.org/details/logsofgreatseaf02jack/page/n177/mode/1up; Mars, p. 245: https://archive.org/details/logsofgreatseaf02jack/page/n262/mode/1up; Agamemnon, p. 300: https://archive.org/details/logsofgreatseaf02jack/page/n317/mode/1up; Naiad, pp. 302–303: https://archive.org/details/logsofgreatseaf02jack/page/n319/mode/1up; Phoebe, p. 306: https://archive.org/details/logsofgreatseaf02jack/page/n323/mode/1up; Sirius, pp. 312–313: https://archive.org/details/logsofgreatseaf02jack/page/n329/mode/1up; Pickle, p. 317: https://archive.org/details/logsofgreatseaf02jack/page/n334/mode/1up; Walker, pp. 322–323: https://archive.org/details/logsofgreatseaf02jack/page/n339/mode/1up)

### 3. The Naiad's count (holds)

In "Orders, Rosily and the sortie" > "19 October", replace the sentence that begins "British observers counted 9 sail" with:

> British observers counted 9 sail at 4 p.m. and 12 at 6 p.m., frigates included, and that is where James's and Nicolas's "twelve ships" comes from (NRS II 146; `research/scene-02/a-h2c.md`, H2-30c); the Naiad at noon logged eleven "line-of-battle ships" outside the San Sebastián light, from 11 or 12 miles off (NRS II 302; `research/scene-02/a-h3.md`, R7).

In "Open doubts" > "The sortie", end the list of counts with:

> … nine (Prigny, from memory), eleven of the line at noon (the Naiad, from 11 or 12 miles off) and twelve (James and Nicolas, from the Euryalus's count of all sail).

### 4. Open doubts, "Signals: colours, books and ranges" (holds)

> - **Signals: colours, books and ranges.** The 1804 values of the numeral flags (Perrin's Plate XIII) were not transcribed, and the day *Signal Book* of 1799 was not read; numeral 1 of 1799 is plain red in the copy FOTW describes, yellow-red-yellow in Perrin. Which half of Popham's telegraph flag was red: Popham names only "a diagonal red and white flag" (1803, p. 6); Perrin has white and red, Wilson red over white, Kent white over red, and Barraclough found both in contemporary books (all via FOTW). The hoists held along the chain until the Victory's answer ran back come from Popham (1803, p. 6) and the *Signal-Book* of 1796; the wear lights (two at the ensign staff, one at the bowsprit end), the form of No. 31 (three guns and two lights, or a square of four lanterns) and the one-light answer come from the 1799 *Night Signals* (`research/scene-02/a-h3.md`, R16, R25). No log of 19–21 October records them, except that on the 20th the Agamemnon kept the signal up (NRS II 300). All ranges are estimates: flag colours readable at about 4–11 nm, lanterns at 1–3 nm, blue lights at 5–14 nm (`research/scene-02/a-h3.md`, R21–R22). The blue light's burn is inferred from the false fire's, the only one defined (Smyth 1867). The colour of the British fires, which French observers remarked on (the Cornélie, the Argus; Lucas), is read as bluish blue lights against their own yellow lanterns and gold rockets.

### 5. "One link" (holds)

> - **One link.** Two or three flag dabs at the masthead, hand-tinted red, white, blue and yellow, and a counted pair or three of white gun puffs at the side; after a pause the next ship does the same. Hoists stay up until the Victory answers, so lit links accumulate westward, then come down as the answer runs back. Neither is logged on the 19th: the held hoists follow the rules, and the counted puffs follow the counted guns the Euryalus logged with her signals on the 20th (NRS II 165, 167), while along the chain the records of the 19th have only guns fired by the Phoebe and by a ship seen from the fleet (NRS II 146, 312, 322; see "Assumptions and licences"). Medium.

### 6. Open doubts, "The relay of 19 October" (holds)

Replace "The Euryalus's repeat to the Phoebe: 7.20 by the logs; Corbett's "in ten minutes" (7.10) has no support." with:

> The Euryalus's repeat to the Phoebe: 7.20 by the logs; Corbett's "in ten minutes" (7.10) has no support, and at 7.10 the Euryalus made only a general signal, No. 108, close nearer the Admiral (NRS II 160; R9).

Append to the bullet:

> The British strength: 27 of the line off Cádiz (Nicolas VII 130; Browne, NRS II 194; Cumby 1899, p. 718), 23–24 of them with Nelson; Walker's 26 under all sail after the chase signal (NRS II 323) is the low count (R7). Corbett (1910, p. 333) calls the Mars "Duff's easternmost ship"; the diary of 14 October and Beatty (1807, p. 7) put her at the fleet's end of the chain, and Corbett's own note puts the Defence and Agamemnon nearest Cádiz (p. 334 n. 2), so "easternmost" is a slip (`research/scene-02/v-h3b.md`, H3-17d).

### 7. Brief row on the chain "lighting up" (holds)

> | The chain "lights up ship by ship when the combined fleet sails" | The relay of 19 October ran in daylight, 7 to about 9.30, with flags and guns (the Phoebe's three-minute guns; a ship "firing guns" seen from the fleet); Popham's telegraph carried the Sirius's first report at 6.04 and later messages along the chain, from 10.20; counted guns with each hoist are logged only on the 20th. Only seven of the line got out that day. Lights, rockets and blue lights belong to the nights of 19–20 and 20–21 October, and the night chain was a different, short chain between the closing fleets | By day each link shows a hoist and white gun puffs, in pulses, never instant; "by half past nine" or "some two and a half hours later", never "in minutes" or "within two hours"; light effects only in the night beat | High for the sequence, medium for the duration |

### 8. Brief row on the caption (holds; decision 3 applied)

> | Beat 4 caption: "linked to the coast by a chain of frigates" | Frigates held the Cádiz end: the Euryalus and Sirius off the port, the Phoebe and Naiad sent out to repeat; the links beyond them were ships of the line (Defence, Colossus, Mars, with the Agamemnon stationed by the Defence) (NRS II 145–146; diary of 14 October, Hudson 1917, p. 21; Beatty 1807, p. 6) | Caption: "a chain of frigates and ships of the line"; frigate glyphs inshore, ships of the line beyond | High |

### 9. Firework colour (partly)

In "Night lights", replace "Rockets threw gold sparks, strong colours coming only after about 1811 (Physics World; RSC)." with:

> Rockets threw gold sparks; strong colours came only after about 1811, with chlorate compositions (Physics World; Lancaster 2012, RSC).

In "Later inventions", replace "Vivid red or green fireworks are wrong too: before about 1811 firework colours were weak reds and yellows at most (Physics World; RSC). Medium." with:

> Vivid red or green fireworks are wrong too: before about 1811 firework colour was weak at most, pale reds and yellows by *Physics World*, faint greens and reds by the RSC (Lancaster 2012). Werrett (2015) argues that early modern manuals already gave a variety of recipes for coloured fire and that the later stress on colour comes from writers of the Chemical Revolution; the French remarks on the colour of the British fires are read under "Night lights". Medium.

In "Key sources", replace "Royal Society of Chemistry, "Fire and light in the sky": https://edu.rsc.org/download?ac=13671; *Physics World*, "Whizz-bang science": https://physicsworld.com/a/whizz-bang-science/" with:

> R. Lancaster, "Fire and light in the sky", *Education in Chemistry* (Royal Society of Chemistry, 1 September 2012): https://edu.rsc.org/feature/fire-and-light-in-the-sky/2020143.article; P. Thebault, "Whizz-bang science", *Physics World* (December 2018): https://physicsworld.com/a/whizz-bang-science/; S. Werrett, "Fireworks and color in the sixteenth and seventeenth century", *Early Science and Medicine* 20 (2015), pp. 458–477: https://doi.org/10.1163/15733823-02046p07 (accepted manuscript: https://discovery.ucl.ac.uk/id/eprint/1472417/)

### 10. "How long" (holds)

> - **How long.** About 2½ hours on the logged clocks: 7.00 by the Euryalus, 9.30 by the Victory. Blackwood wrote "within two hours" in a letter of that day, written while he was "talking to Lord Nelson" by Popham's telegraph, his frigates repeating it along the chain (Nicolas VII 131 n.; the Euryalus's telegraph messages to and from the Naiad, 10.20 a.m. to 1.50 p.m., NRS II 161–164); Browne's 10 a.m. makes three; if the Euryalus's clock already ran 45 minutes ahead of the Victory's, as Corbett found on the 20th, it was about 3¼ (`research/scene-02/a-h3.md`, R10). Medium.

### 11. Day "Geometry" (holds)

> - **Geometry.** A loose line about due west (true) of Cádiz, 48–58 nm long and dipping south at the Defence: the frigates within 17 nm of San Sebastián, the Defence about 27 nm out, the Mars and Colossus 15 nm short of the fleet (the Defence–Mars gap about 15.7 nm, inside masthead range; `research/scene-02/a-h3.md`, R31), the Victory with 23–24 of the line near 36°34′–35′ N 7°24′ W (table below). Never south-west. Medium for the line, low for single ships.

### 12. Framing line under "How the chart shows the signals" (partly)

Insert directly under the heading:

> What beats 4 and 5 are to show, and why. The two tables at the end give the positions the sources support; the scene places its glyphs from them.

### 13. Robinson in "Key sources" (holds)

After the Cumby entry:

> - H. Robinson, *Sea Drift* (Portsea, 1858), p. 209, a midshipman of the Euryalus writing some fifty years later: https://archive.org/details/seadrift00robigoog/page/n217/mode/1up

### 14. "Dark and light" (holds)

> - **Dark and light.** Moonless, cloudy and very dark. The watching ships hid their lights (an officer of the Defence, Fraser 1906, p. 95), and the British side showed little but the Admiral's lights, answers and blue lights. The Combined Fleet showed stern and top lights along a line some six miles long, with rockets, flares and guns of its own (stern and top lights, rockets, and guns and lanterns for the admiral's signal at midnight: Prigny, Desbrière 1907, annexes p. 139; signals with guns and rockets at 7.40 p.m.: the Sirius, Nicolas VII 134 n.; flares: Lucas, Fraser 1906, p. 92; six miles: Fraser 1906, p. 95). High.

### 15. "Popham's telegraph" (holds)

> - **Popham's telegraph.** A diagonal red and white flag announced a message, one hoist per word or phrase from Popham's numbered vocabulary (1803). Issued to ships of the line from 1803; in September 1805 the Admiralty decided every ship, cruisers included, should carry it (Corbett 1910, pp. 298–301). Which half was red is disputed: Popham says only "a diagonal red and white flag" (1803, p. 6), Perrin white and red, Wilson red over white and Kent white over red, and Barraclough found both in contemporary books (all via FOTW); invisible at chart scale. High for the code, medium for the flag's colours.

### 16. Licence 9 (holds)

> 9. **The Mars's distant signal.** At the relay's last link the Mars shows first coloured flags the fleet cannot read, then three dark shapes at three mastheads (a flag, a ball and a pendant), on the word of one eyewitness writing years later (Cumby 1899, p. 719); no printed description of the Distant Signals of 1805 was found.

### 17. "The station" (holds)

> - **The station.** Nelson kept the body of the fleet "from sixteen to eighteen leagues West of Cadiz" (to Blackwood and Barham, 4–5 October; "15 lgs. to twenty" in his diary of 14 October, Hudson 1917, p. 21; 15–18 in his letter to Ball of 11 October), never north of the port's parallel, ready to crowd sail for Cape Spartel if the enemy came out (Nicolas VII 73–75, 111, 122). His reasons: not to be caught close in by a westerly gale and swept into the Strait, and to hide his strength and tempt the enemy out (to Barham, 5 October; Corbett 1910, pp. 326–327). High.

### 18. The Pickle's 3 p.m. count (partly)

In "Orders, Rosily and the sortie" > "At sea", replace "(Pickle's log at 3 p.m.; the Thémis)" with:

> (the Thémis; the Pickle's log at 3 p.m. as Nicolas prints it, VII 135 n., where the NRS transcription, II 317, has 4 frigates)

## Evidence

### 1. The Pickle

- **Her log, NRS II 317 (page image read here, leaf n334).** 20 October, p.m.: at 2 she answered a signal to reconnoitre in the NW quarter; at 4 the Commander-in-Chief bore SSW. At 5.40 she "repeated several signals from the Sirius to the fleet". At 6 the enemy bore N by E ½ E and the Commander-in-Chief SW. From 8 to 12 she tacked occasionally, "the Sirius in company". At 1.30 a.m. on the 21st the enemy bore ENE and the Commander-in-Chief SW by W. So she lay between the fleets, with the Sirius, through the first half of the night. https://archive.org/details/logsofgreatseaf02jack/page/n334/mode/1up
- **Nicolas VII 135 n. (page image read here, leaf n170).** It prints a shorter extract of the same log: after tacking from the enemy at 5 she repeated several signals from the Sirius to the fleet, keeping sight of the enemy. https://archive.org/details/dispatchesletter07nelsuoft/page/n170/mode/1up
- **The Euryalus's log, 19 October, NRS II 146 (OCR read).** At 9 a.m. Blackwood sent the Pickle off Cape Spartel to warn all ships, to cruise there three days and return. Hence the clause "sent to Cape Spartel on the 19th, … with the fleet again by the afternoon of the 20th", which squares the night chain with "Blackwood's squadron" (line 132). https://archive.org/details/logsofgreatseaf02jack/page/n163/mode/1up
- **The drafter's data.** `drafts-data.json` [0], `fleetRows[1].others`, has "the schooner Pickle with the Sirius (NRS II 317)". `v-h3b.md` H3-23 and H3-24 count her log among the night chain's. The merge dropped her.

### 2. Licence 8

- **The day rule's sources.** `h3-signals.md` §1.3 and `v-h3a.md` H3-03a–b (both confirmed) source it to Popham 1803, p. 6 (signals kept flying until repeated in succession to the Commander-in-Chief) and to the 1796 *Signal-Book* (arts. III, VI, IX). The 1799 day book was not read: its only copy found online, at the University of Rhode Island, sat behind a Cloudflare check (`h3-signals.md` §7 question 1 and §9). The section's own "Repeating" bullet (line 189) gives the same two sources. Only the night rule, No. 31 and its wear lights, and the one-light answer come from the 1799 *Night Signals* (R16; `h3-signals.md` §2.1–2.2). Popham p. 6: https://archive.org/details/bub_gb_qxZEAAAAYAAJ/page/n10/mode/1up
- **The Agamemnon, 20 October, NRS II 300 (page image read here, leaf n317).** At 8 the Euryalus made the enemy-in-sight signal to her. She fired several signal guns, and at noon "Kept the signal up", with her own fleet in sight. https://archive.org/details/logsofgreatseaf02jack/page/n317/mode/1up
- **The order she was under, NRS II 147–148 (OCR read).** At 9.10 by her clock the Euryalus told her by telegraph to make all sail and repeat signals between the Euryalus and the Admiral, and told Berry to fire every 10 minutes with the signal. So the held hoist is logged on the 20th, in a relay, but not on the 19th. https://archive.org/details/logsofgreatseaf02jack/page/n164/mode/1up
- **Counted guns.** R12: the Euryalus's signal table for the 20th has 7 guns at 8.30 a.m., 2 at 4.10 p.m., 3 at 5.10 and single guns (NRS II 165, 167). For the 19th, the records along the chain have only the Phoebe's guns: "firing three minute guns" (Euryalus, NRS II 146) and "firing guns" (Sirius, NRS II 312). Walker (NRS II 322) also saw a ship "firing guns and making signals". The Victory's two guns with the chase signal are recorded (Beatty 1807, p. 7; Corbett 1910, p. 333 n. 1), which is why the licence speaks of the links, not of the Victory.
- **The chart's own lines.** No. 31's form at line 245, the one-light answer at line 243 and the counted puffs at line 235 are all drawn from the books or by analogy, so the licence names them.

### 3. The Naiad's count

- **NRS II 302 (OCR read here; the check read the image).** 19 October, a.m.: from 7 she was repeating signals from the Euryalus to the Phoebe. At noon, in a calm, she logged "Eleven of the enemy's line-of-battle ships outside of San Sebastian lighthouse", the light 11 or 12 miles off. https://archive.org/details/logsofgreatseaf02jack/page/n319/mode/1up
- **The rulings.** `a-h3.md` R7 lists it in its evidence. `a-h2c.md` H2-30c, the final word on the count, lists the French counts and the Euryalus's 9 and 12, not the Naiad. Adding it as a version does not reopen the seven, which rest on Philibert's journal and the Montañés.
- **The Euryalus at noon.** She logged the enemy's ships in Cádiz Bay in a calm, and 9 out at 4 p.m. (NRS II 146), so the Naiad's noon count differs in time and in what it counts. The section gives it with its circumstances and does not interpret it.

### 4. Open doubts on colours, books and ranges

- The book and "no log" faults are those of issue 2.
- The two bullets before this one name their file (`research/scene-02/a-h3.md`); this one gave "(R16, R25)" and "(R21–R22)" bare.
- **Numeral 1 of 1799.** `v-h3a.md` H3-01c (confirmed) and `h3-signals.md` §6 record it: plain red in the URI copy as FOTW describes it, yellow-red-yellow in Perrin. The "Flags" bullet cites both Perrin and FOTW for the colours, so their disagreement belongs in the doubts. It does not touch the chart: the values were changed in 1803–04, and the 1805 flags are dabs at chart scale.
- The added clause "the day *Signal Book* of 1799 was not read" explains why the day rule is sourced to 1796 and 1803.

### 5. "One link"

- The section's brief row (line 26, from `v-draft-h3.md` point 27) says counted guns with each hoist are logged only on the 20th.
- "One link" draws counted puffs at every link of the 19th and flags only the held hoists as "the rules; not logged that day".
- The 1796 book made day signals "generally … without Guns" unless guns were part of the signal or it went unnoticed (`h3-signals.md` §1.4; `v-h3a.md` H3-04a).
- Nelson ordered guns by day or night to draw his attention (Nicolas VII 71). So guns on the 19th are supported; counted pairs or threes are the analogy.

### 6. The relay's versions

- **R7.** Its final statement ends "Walker's '26' under sail is the low count". The drafter's data kept it (`fleetRows[0]`); the merged section has the 27 but no 26 anywhere. Walker: https://archive.org/details/logsofgreatseaf02jack/page/n340/mode/1up
- **R9.** Its final statement: at 7.10 the Euryalus made only a general No. 108, close nearer the Admiral. The adjudicator viewed the signal table's image (NRS II 160). `v-h3b.md` H3-17c adds that Corbett's "in ten minutes" probably reads that entry. https://archive.org/details/logsofgreatseaf02jack/page/n177/mode/1up
- **Corbett, p. 333 (OCR read here).** "they got it through to the Mars, Duff's easternmost ship, and by half-past nine Nelson had it". Against him:
  - his own note on p. 334 (n. 2) puts the Defence and Agamemnon nearest Cádiz, with the Mars and Colossus as connecting ships;
  - the diary of 14 October has the Mars and Colossus five leagues east of the fleet (Hudson 1917, p. 21);
  - Beatty calls the Mars one of the ships nearest the fleet (1807, p. 7).

  `v-h3b.md` H3-17d confirms the slip. https://archive.org/details/campaignoftrafal00corb/page/n368/mode/1up

### 7. "Never 'within two hours'"

- `a-h3.md` R10, scene impact: captions say "by half past nine" or "some two and a half hours later", never "within two hours" or "in minutes".
- The drafter's `briefRows[2]` kept both prohibitions. The lead's row (`draft-lead.md`, line 28), and the merged row from it, kept one.
- The new row also makes the telegraph clause exact, on the evidence of issue 10. The Sirius telegraphed at 6.04, before the relay, and the messages along the chain ran from 10.20, after it. The relay of No. 370 itself, 7 to 9.30, went by flags (numeral flags, then the Mars's distant signal) and guns (R5, R8, R14).

### 8. The caption row

- The Phoebe was sent at 7.20 "to repeat signals between us and the English fleet", and the Naiad from 8.10 to repeat between the Euryalus and the Phoebe (NRS II 145–146; R5). The Phoebe lay about 17 nm out (recomputed: 16.9 nm from San Sebastián).
- So the chain's inner links were frigates, and "the chain itself was ships of the line" is wrong. The drafter's row had "The outer links were ships of the line" (`briefRows[0]`).
- **Decision 3** sets the caption and drops "a chain of warships" (the lead's alternative) and "a chain of ships" (the drafter's). The code's caption already reads "a chain of frigates and ships of the line" (`src/scenes/02-road/content.ts`, uncommitted).

### 9. Firework colour

- **The RSC link.** https://edu.rsc.org/download?ac=13671 returns 404 (checked here). The piece is R. Lancaster, "Fire and light in the sky", *Education in Chemistry*, 1 September 2012, now at https://edu.rsc.org/feature/fire-and-light-in-the-sky/2020143.article (200). In our words, Lancaster says:
  - displays before 1800 were mostly the gold of burning gunpowder;
  - faint greens and reds were possible with barium or strontium nitrate, and whites with antimony or arsenic;
  - modern colour came with potassium chlorate (Berthollet, 1786).

  It does not mention yellows. The section's "weak reds and yellows (Physics World; RSC)" therefore credits the RSC with the yellows.
- ***Physics World*, "Whizz-bang science".** By P. Thebault, December 2018 (200, read here). Before Ruggieri, it says, colours were limited to pale reds and yellows. It dates his treatise's second edition to 1811 and says he went on to use chlorates and nitrates for stronger colours, without a date for them. https://physicsworld.com/a/whizz-bang-science/
- **What is reworded, and why.**
  - The check's "until chlorate compositions, about 1811" ties chlorates to 1811, which neither source does. The final text keeps the section's "only after about 1811" and adds "with chlorate compositions" as a separate point.
  - "Werrett (2015) shows that earlier manuals already had colour recipes, used differently" is stronger than what could be verified. The final text says he argues it, as his own project summary puts it.
- **Werrett 2015.** S. Werrett, "Fireworks and color in the sixteenth and seventeenth century", *Early Science and Medicine* 20 (2015), pp. 458–477.
  - The DOI resolves to Brill (article from p. 458). UCL Discovery and the REF 2021 record give the same reference.
  - Brill, UCL, CORE and Project MUSE refused automated access, so the article itself was not read.
  - The author's project page at the Max Planck Institute for the History of Science, read here, summarises the argument in our words: early modern fireworks manuals gave a variety of colour recipes; colour mattered in making fireworks and carried other associations; coloured fire was not the main place of colour in displays; and the modern stress on coloured fire comes from writers of the Chemical Revolution.
  - It is a scholarly version of the colour history that the section's "weak at most" leans on, so it is given. It does not change what the chart may show, which stays at medium.
  - Links: https://doi.org/10.1163/15733823-02046p07 ; https://discovery.ucl.ac.uk/id/eprint/1472417/ ; https://www.mpiwg-berlin.mpg.de/research/projects/1591690

### 10. Blackwood's telegraph

- **Nicolas VII 131 n. (OCR read here).** In his letter of the 19th to his wife, Blackwood says that within two hours, with the fleet sixteen leagues off, he had let Nelson know of the enemy's coming out. He adds that he was then "talking to Lord Nelson by means of Sir H. Popham's signals, though so distant, but repeated along by the rest of the Frigates of this Squadron". https://archive.org/details/dispatchesletter07nelsuoft/page/n166/mode/1up
- **The Euryalus's signal log.** It has telegraph messages from the Naiad at 10.20 and to her at 11.05, noon and 1.50 p.m. (NRS II 161–164; `v-h3b.md` H3-20, confirmed and strengthened; `h3-signals.md` §3.2).
- The section had the telegraph only inshore, at 6.04 and in the Naiad's row.

### 11. The Defence–Mars gap

- Plane sailing from the table's own points (`amh3-dist.js`):
  - Defence 36°22′ N 6°51′ W to Mars 36°33′ N 7°05′ W: 15.74 nm;
  - Defence to Colossus 36°32′ N 7°04′ W: 14.47 nm.
- So 15.5 fits neither. `v-draft-h3.md` point 1 gave 15.7.
- The bullet's other figures check: Phoebe 16.9 nm from San Sebastián, Defence 27.5 nm, Mars–Victory 15.3 nm, San Sebastián–Victory 52.3 nm.

### 12. The chain on the chart

- `src/scenes/02-road/fleets.ts` (including its uncommitted Stage B changes) defines the two fleets ship by ship, the dawn berths (the frigates among them), the anchorage, the lab's marks and the route squadron. Nothing places the chain of 19 October or the night chain, and no file draws a signal. The check's observation is true today.
- A line saying the chain is "not drawn yet" would be wrong as soon as beats 4 and 5 are built, and the section is being merged at the start of that work.
- Decision 1 asks the section to describe the layout and its sources, not the lab's coordinates. The framing line therefore says what the subsection is (what the beats are to show) and what the tables are (the sources' positions). Both stay true after the build.

### 13. Robinson

- *Sea Drift* (1858; archive.org metadata: F. Pitman), p. 209 (page image read here, leaf n217). Blackwood threw out his frigates between the Euryalus and the fleet "twenty leagues to the Westward".
- The same page names the Hydra among them and has the lines of lights and the cab in Regent Street.
- Leaf n220 is p. 212 (image read), which confirms the offset. https://archive.org/details/seadrift00robigoog/page/n217/mode/1up

### 14. The enemy's night guns

- **Nicolas VII 134 n. (OCR read here).** The Sirius's log: at 7.40 p.m. the enemy's fleet, from ESE to NE, was making signals "with guns, rockets, &c.". https://archive.org/details/dispatchesletter07nelsuoft/page/n169/mode/1up
- **Prigny, Desbrière 1907, annexes p. 139 (OCR read here).**
  - At nightfall the French lit their stern and top lights and fired rockets now and then.
  - At midnight Villeneuve signalled the line of battle, a signal "fait à coups de canon et avec des fanaux", which was seen and repeated. So the Combined Fleet's own guns are in Prigny too.
  - https://archive.org/details/la-campagne-maritime-de-1805/page/n408/mode/1up

### 15. "Popham's telegraph"

- `a-h3.md` R28 rates the flag's colours medium (genuinely disputed).
- The text put "High." in the middle of the bullet, from `v-draft-h3.md` point 16's own fix, and left the disputed clause without a confidence. `docs/history-notes.md` ends every bullet with its confidence, split where it differs.

### 16. Licence 9

- The relay table's 9.30 row has the Victory answering the Mars and making the chase. R14's scene impact puts the unreadable coloured flags first, then the shapes.
- `drafts-data.json` [0] `openDoubts[4]` and the section's own open doubt record that no printed description of the 1805 Distant Signals was found.

### 17. "The station"

- **Nicolas VII 111 (OCR read here).** Nelson to Ball, 11 October 1805, from Clarke and M'Arthur: five frigates, a brig and a schooner watching Cádiz, an advanced squadron between him and them, and the body of the fleet "from fifteen to eighteen leagues West of Cadiz".
- The bullet cited `v-draft-h3.md` for it, a check report, while Nicolas VII 111 already stood in its closing citation. https://archive.org/details/dispatchesletter07nelsuoft/page/n146/mode/1up

### 18. The Pickle's count of frigates

- **NRS II 317 (page image read here, leaf n334).** At 3 p.m. on the 20th: "33 sail of the line, 4 frigates and 2 brigs", bearing N by E, standing to the SW.
- **Nicolas VII 135 n. (page image read here, leaf n170).** The same log's extract reads "thirty-three Sail of the Line, five Frigates, and two Brigs", bearing N. b. E.
- So the two transcriptions differ, as they do for the Euryalus's midnight bearing (R27). The section's "5 frigates" with "Pickle's log" came through `h2-boulogne-cadiz.md` and `v-h2c.md` (H2-31c, H2-35h), which cite Nicolas p. 135.
- The check is right that the NRS text has four, and wrong to drop the five. Both stay, each with its holder.
- The fleet's five frigates (Cornélie, Hermione, Hortense, Rhin, Thémis) rest on the Thémis, the Euryalus's count of the 21st and Lucas (R7), so the count itself stands.
- Links: https://archive.org/details/logsofgreatseaf02jack/page/n334/mode/1up ; https://archive.org/details/dispatchesletter07nelsuoft/page/n170/mode/1up

## Notes for whoever applies the rulings

- **One NRS line.** Issues 1, 2 and 18 all touch the NRS line in "Key sources". Use the whole line given under issue 2.
- **Order of edits.** Issues 7 and 8 replace whole brief rows. Issue 7's row includes issue 10's telegraph point.
- **Line 133 ("The chain").** It ends "beat 4's "chain of frigates" is wrong". This is not an issue raised by the check. Under decision 3 it can read "beat 4's caption says "a chain of frigates and ships of the line"". Line 253 ("a chain of frigates only") already agrees.
- **Licence numbers.** The numbers 8 and 9 follow the current list. If the dawn licences are rewritten under decision 1, keep these two items in the same relative place.
- **A version outside these rulings, not ruled.** Corbett (1910, p. 333) has Blackwood send one sloop to the Victory and the other to warn Louis. The Euryalus's log sends the Weazle to Gibraltar and Tetuan and the Pickle to Cape Spartel (NRS II 146). `h3-signals.md` §6 records the disagreement, and the merged section does not. It belongs to "Blackwood's squadron" (line 132), in the h2 part.
