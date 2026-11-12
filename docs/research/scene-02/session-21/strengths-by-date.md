# The strengths at the fleets' heads, by date (session 21)

Research note for the strengths lettered at the fleets' heads in scene 2 ("Villeneuve, 20 sail"), under the owner's rule of 12 November 2026. Written by a research helper on 12 November 2026; nothing here is applied to the code or to `docs/history-notes.md` (section 5 is a draft for the main session to merge). It starts from the repository's research (`session-17/history-scene-02-wip.md`, `a-h2b.md`, `a-h1ac.md`, `h1-campaign.md`, `h2-boulogne-cadiz.md`, `session-17/anchorage-19oct.md`) and settles what those leave open in the period books on archive.org: Nicolas VI and VII, James III, Corbett 1910, Desbrière 1907 with its annexes, Beatty 1825, Hubback 1906, Hudson 1917 ("Nelson's Last Diary", which prints the diary entries of 4 to 8 October that Nicolas and Beatty lack) and Codrington's *Memoir* (1873). Downloads stayed outside the repository. Pages and links are at the end.

**Conventions.** Dates are civil (midnight to midnight). A log's nautical day (noon to noon, dated by the civil day on which it ends) is turned into the civil one. Hours are ship's times as the source gives them. "Taken" is the day and hour this note suggests for the label, in the scene's `day(month, date, hour)` form (`src/scenes/02-road/dates.ts`). Where no hour is recorded, the file's convention is noon, unless the note gives a reason for another hour. Confidence: high, medium-high, medium, low.

## 0. The rule, and what it means on the scroll

The owner's answers of 12 November 2026:
- Count ships of the line only. Frigates and small craft are not counted. That is how a fleet's strength was counted then, and how the finale counts it: 27 against 33.
- One rule everywhere, by date. The figure is the ships of the line actually sailing together at the head of the track on that date. Stragglers are added on the day they caught up. Ships that left are taken off on the day they left.
- Villeneuve on the crossing: first the 14 that went out with him; the rest are added on the dates they met him.
- Nelson in October: by date, as in our data. 29 on arrival, 23 by 5 October, then by date to 27 at the battle.
- The figure in the label and the number of ships that come in at the head as the camera nears always match.
- The figure changes smoothly, never flickering.
- Where no exact date exists, take the most probable by the sources. Record the sources, disagreements and doubts in `history-notes.md`.

**The scroll.** In beat 4 the story's clock runs from noon on 28 September (p 0.65) to noon on 18 October (p 0.69) (`beats.ts`). That is about 0.002 of p per day. The pin is 30 viewport heights, so a day is about 40 CSS px of scroll on the owner's 1280×720 screen. Two changes a few hours apart would land 5 to 20 px apart and read as a blink. Where the sources give no hour that would separate two such changes, this note suggests one step.

## 1. Every change of a lettered strength, in date order

"Code" says whether the change is already in `squadrons.ts`/`fleets.ts` as session 20 left them ("as is"), corrects them, or is new under the rule.

| # | Label | Taken (date, hour) | Before → after | Ships | Sources | Other versions | Conf. | Code |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Villeneuve | 30 Mar, about 4 p.m. (weighed off Toulon) | — → 11 | Bucentaure, Formidable, Neptune, Indomptable (80s); Pluton, Mont-Blanc, Berwick, Atlas, Swiftsure, Scipion, Intrépide (74s) | Desbrière pp. 6–7, 9 | James III 339: 29 March, his slip in converting the Republican date | High | as is, `day(3,30)` |
| 2 | Nelson | 3 Apr, 5.30 a.m. (sailed from Pula Roads) | — → 11 | Victory, Royal Sovereign, Canopus, Superb, Spencer, Swiftsure, Belleisle, Conqueror, Tigre, Leviathan, Donegal (the count is his own; the names are inferred) | Nicolas VI 392, 398 n. | — | High (count) | as is |
| 3 | Orde | 8 Apr (window opens) | — → 5 | Glory 98; Defence 74; Polyphemus, Agamemnon, Ruby (64s) | Corbett pp. 62–63 | — | High | as is |
| 4 | Orde | 9 Apr, about midday (the crews at dinner) | 5 → 6 | + Renown (Strachan) | Corbett pp. 62–63 | — | High | as is, `day(4,9,12)` |
| 5 | Villeneuve | 10 Apr, about 2 a.m. (all under sail; the Atlas's log has 1.30) | 11 → 14 | + Aigle, Argonauta, América | Desbrière pp. 9–11, 26 n. (the Atlas's log) | At dawn on the 10th only the Argonauta was with the 12 French. The América was seen on the 11th and rejoined on the 12th (Reille, Desbrière p. 11); Villeneuve's report has her back "next morning" (p. 10). Strictly that gives 13 from the 10th and 14 from the 12th. James III 342 has 17 getting under way together, with the San Rafael following later | High (14 is the owner's choice) | as is, `day(4,10,2)` |
| 6 | Nelson | 11 May, between 4 p.m. (Knight came into the squadron) and 6.50 p.m. (bore up); taken 5 p.m. | 11 → 10 | − Royal Sovereign (left with Knight) | Victory's log, Nicolas VI 433 | Knight's Queen and the Dragon were in company for those hours. They were not under Nelson's flag and are not counted | High | as is, `day(5,11,17)` |
| 7 | Villeneuve | 14 May, during the day; hour not recorded | 14 → 17 | + Firme, Terrible, España (with the frigate Magdalena) | Desbrière p. 26: the fleet entered the St Lucia Channel at daybreak; off the bay of Fort-de-France it found the three beating in; the whole fleet anchored during the day | James III 343 has all of them crossing together (his date, the 13th) | High (day); low (hour) | as is, `day(5,14,16)`; any hour from late morning fits |
| 8 | Villeneuve | 16 May, afternoon | 17 → 18 | + San Rafael | James III 343–344: she rounded Pointe Saline early in the day, showed Spanish colours at 8 a.m., was fired on from Diamond Rock at 9, and anchored with the fleet "the same afternoon". Desbrière p. 26 gives the 16th | — | High (day); medium (afternoon) | correction: `day(5,16)` (noon) → about `day(5,16,15)` |
| 9 | Villeneuve | 4 Jun; hour not recorded | 18 → 20 | + Algésiras, Achille (Magon) | Desbrière p. 36: the same day the detachments came back from Diamond Rock | James III 351: Magon joined at sea, on the day the fleet sailed or the next | High | as is, `day(6,4)` |
| 10 | Nelson | 4 Jun, between noon (arrived off Carlisle Bay) and 4.50 p.m. (anchored) | 10 → 12 | + Northumberland (Cochrane, at anchor there), Spartiate | Nicolas VI 445: Nelson found the Northumberland, with the Spartiate "just joining"; the log has the Spartiate joining at the anchoring | — | High | as is, `day(6,4,17)` |
| 11 | Nelson | 13 Jun, 11.50 a.m. (weighed from St John's Road) | 12 → 11 | − Northumberland (stayed at Antigua) | Nicolas VI 452–453 | — | High | as is |
| 12 | Calder | 20 Jul (window opens; 15 since Stirling joined on 15 July) | — → 15 | Prince of Wales, Glory, Barfleur, Windsor Castle (98s); Malta (80); Thunderer, Hero, Repulse, Defiance, Warrior, Ajax, Triumph, Dragon (74s); Agamemnon, Raisonnable (64s) | James III 356–357; Calder's dispatch | — | High | as is |
| 13 | Villeneuve | 22 Jul, soon after 8 p.m.; taken 8.30 | 20 → 18 | − Firme, San Rafael (struck) | James III 361: the Firme struck soon after 8 p.m., the San Rafael a few minutes later | Lauriston, writing from Cádiz on 2 September with news from the two Spanish captains: the San Rafael struck only at 9 p.m., to three British ships, the Malta among them (Desbrière annexes p. 111). Desbrière's narrative: both fought on through part of the night and struck at daybreak on the 23rd (pp. 63–64) | High (day); medium (hour) | as is, `day(7,22,20.5)` |
| 14 | Calder | 26 Jul, 8 p.m. | 15 → 14 | − Windsor Castle (went home with the prizes) | James III 371: once the prizes had reached the prescribed latitude, Calder "with his 14 sail of the line" wore and stood back | James already has 14 from the 23rd, counting the disabled Windsor Castle out while she was in tow. Under the rule she was still in company | Medium-high | none on screen: the window closes at noon on the 26th |
| 15 | Villeneuve | 31 Jul; hour not recorded | 18 → 15 | − Atlas, España, América (left at Vigo) | Desbrière pp. 85–86 | James: 30 July | High | as is, `day(7,31)` |
| 16 | Villeneuve | 2 Aug, on entering the bay; hour not recorded | 15 → 13 | − Argonauta, Terrible. Gravina was already in the channel to Ferrol when the Emperor's order forbidding Ferrol came on board the Bucentaure. The 13 French hauled their wind and anchored at A Coruña; the two Spaniards had to go on into Ferrol | Desbrière p. 86 | James, Mahan and Corbett's narrative have him in on 1 August | High (the split); medium (the day) | **new under the rule**: `squadrons.ts` keeps 15 until 13 August |
| 17 | Villeneuve | 10 Aug, early afternoon (the ships from Ferrol came out at 12.30, by Escaño); taken about 2 p.m. | 13 → 26 | + Gourdon's five French (Fougueux, Redoutable, Argonaute, Duguay-Trouin, Héros) and eight of the eleven Spaniards. The French had worked out of A Coruña on the 8th to 10th. The wind died about noon before the last three Spaniards cleared the narrows, and all anchored in the bay of Ares | Desbrière p. 97; Escaño's journal, Desbrière annexes p. 7 | Escaño has nine Spaniards coming out, which would make 27; Desbrière's eight plus "the last three" make his eleven | Medium | **new under the rule** |
| 18 | Villeneuve | 13 Aug, forenoon (the last three joined before noon; Escaño has the fleet sailing from the ría of Ares at 9 a.m.; all under sail by 2 p.m.) | 26 → 29 | + the last three Spaniards | Desbrière pp. 97–98; Escaño, annexes p. 7 | James III: out on the 11th, two days early | High | as is for 29, `day(8,13)` (now from 26, not from 15) |
| 19 | Nelson | 15 Aug, evening ("the close of the day") | 11 → 2 | Victory and Superb sent on to Spithead; nine left with Cornwallis | Nelson to Marsden, 18 Aug, Nicolas VII 8 | — | High | as is, `day(8,15,18)`; 7 p.m. would fit as well |
| 20 | Nelson | 19 Aug; hour not recorded | 2 → none (flag struck) | the Victory at Spithead and the Motherbank | Nicolas VII, Preface (he struck his flag the day after reaching Spithead); the log of the 18th, VII 8 | — | High | as is, `day(8,19,12)` |
| 21 | Collingwood | 19 Aug (window opens) | — → 3 | Dreadnought 98, Colossus, Achille | James III 375 | — | High | as is |
| 22 | Collingwood | 20–21 Aug, at midnight | 3 → 4 | + Mars (from Tangier Bay) | James III 375: joined by the Mars at midnight, Collingwood tacked inshore "with his four sail of the line"; Desbrière p. 143 | Desbrière p. 107: back the same evening with four | High | as is, `day(8,21,0)` |
| 23 | Collingwood | 22 Aug; hour not recorded | 4 → 8 | + Queen, Tonnant, Minotaur, Bellerophon (Bickerton) | James III 379; Desbrière p. 143 | Codrington, who came with Calder, has Collingwood with "six or seven" and Bickerton joining afterwards with three more (*Memoir* I 46); some of Bickerton's ships were perhaps away watering when Calder arrived | High (day) | at the window's end (it closes at noon on the 22nd): either add a stage from `day(8,22)` or close the window before it |
| 24 | Villeneuve | 20 Aug, evening (anchored in Cádiz road) | 29 → 29 | The six Spaniards already at Cádiz are not counted. They were in port, not in company, and their fitting-out ran on into October | James III 375; Desbrière pp. 107, 134 | James counts 35 in port | High | no change |
| 25 | Nelson | 14 Sep, 11.30 a.m. (flag rehoisted in the Victory at St Helens; Nelson on board at 2 p.m.) | none → "Victory" | the Victory | Victory's log, Nicolas VII 36 (Nelson's letter says "about noon") | — | High | **correction**: `squadrons.ts` stays unflagged until she weighed, 8 a.m. on the 15th. Under the rule the flag counts from 11.30 a.m. on the 14th, `day(9,14,11.5)`. The difference is about 0.001 of p, some 20 px of scroll |
| 26 | Nelson | 18 Sep, morning (his letter) or noon (his diary) | "Victory" → 3 | + Ajax, Thunderer | Nicolas VII 45; Hudson p. 16 | James, Beatty: off Plymouth | High | as is, `day(9,18)` |
| 27 | Nelson → the British fleet | 28 Sep, 6 p.m. | 3 → 29 | Nelson's three join Collingwood's 26: 23 in the main body, counting the Victory's three, and 6 inshore under Louis (section 2) | Victory's log and signal log, Nicolas VII 53 n.; Nelson to Acton and to Elliot, 30 Sep, VII 54, 59; Collingwood's 26 named in Desbrière p. 143 | James III 379: 27 (22 about 15 miles off Cádiz, 5 inshore). Beatty 1825 p. 3: 27 with "five or six" inshore | High for 29 | **change**: `lineStrength` gives 27 |
| 28 | Villeneuve (in Cádiz) | 28 Sep (the label first shows here) | 32 | 18 French and 14 Spanish ready. The Santa Ana, just out of dock, was still to come (row 30) | Gravina to Decrès, 28 Sep (Desbrière annexes p. 91): the 14 Spanish ships "entirely ready"; Desbrière p. 134: 14 in the roads once the Rayo and San Leandro went out on the 28th | British counts from outside: 35 or 36 (Nelson, 28 Sep), 34 = 18 French and 16 Spanish (Euryalus, 1 Oct, James III 380). Ships in harbour that were not with the fleet blur those counts | Medium | **new under the rule**: `lineStrength` gives 33 |
| 29 | British | 2 Oct, 6 p.m. | 29 → 23 | − Queen, Canopus, Spencer, Tigre, Zealous (Louis, to Gibraltar and Tetuan for water and stores) and the Leviathan (at Gibraltar until 8 Oct; the day she went is not recorded) | Victory's log "October 3rd. P.M. at 6" (the nautical day, so 6 p.m. on civil 2 Oct), Nicolas VII 63 n.; Nelson's diary, 2 Oct (Hudson pp. 19–20); Austen's letter (Hubback p. 148). For the six and the 23: Nelson to Marsden, 2 Oct ("Louis with six Sail of the Line", VII 63); to Barham, 5 Oct ("six Sail of the Line" sent, "twenty-three Sail with me", VII 75) | Desbrière p. 148: 3 October, the log's date read literally. The Leviathan's day: any time from the evening of 28 Sep to 5 Oct (section 2) | High for Louis's five; low for the Leviathan's day; medium-high for 23 by 5 Oct | **change** |
| 30 | Villeneuve (in Cádiz) | early October; taken about 3 Oct | 32 → 33 | + Santa Ana (112) | Gravina, 28 Sep: ready "in four or five days" (annexes p. 91). Desbrière p. 134: ready only in the first days of October; his p. 136 paraphrases the same letter as nine days. At the council of war of 8 October she was with the fleet, "à peine sortis de l'arsenal" (annexes p. 97) | — | Medium (early October); low (the day) | **new under the rule** |
| 31 | British | 4–5 Oct | 23 stays | Four of Louis's five (Queen, Canopus, Spencer, Tigre) came back with Blackwood's news and were sent off again | On the 4th "several Ships of War in sight to the Southward" proved to be Louis's squadron (diary, Hudson, the inserted transcript facing p. 20; Codrington took them for the ships expected from England, *Memoir* I 53). They were in company on the morning of the 5th and sent off the same day (Austen, Hubback p. 149). That day Nelson counted 23 and called them "a good look-out Squadron" while the easterly lasted (VII 75, 77). Against the easterly they reached Gibraltar only on the 9th (Hubback p. 149) | Beatty p. 4: rejoined on the 4th. James III 380: turned back on the 3rd. Nelson had their news by the 4th (to Blackwood, VII 73) | Medium-high | not counted: a few hours on one morning, and Nelson did not count them |
| 32 | British | 7 Oct, morning; taken 9 a.m. | 23 → 24 | + Defiance (from Portsmouth) | Nelson to Marsden, 7 Oct, VII 84 ("this morning") | James III 380: the 7th | High | `day(10,7,9)` |
| 33 | British | 8 Oct: the Leviathan (hour not recorded) and the Royal Sovereign (about 4 p.m.); taken as one step at 4 p.m. | 24 → 26 | + Leviathan (back from Gibraltar; Bayntun "seems come out loaded"), Royal Sovereign (from England) | Nelson to Collingwood and to Blackwood, 8 Oct, VII 88 (the Defiance "has joined", the Royal Sovereign "has signalized"); VII 88 n., 107; diary, 8 Oct (Hudson, the transcript): the Royal Sovereign in sight to leeward at 4 p.m., and joined; Corbett p. 328; James III 380 (the Leviathan on the 8th) | James III 383 and Clowes: the Royal Sovereign joined between the 9th and the 13th | High (day); medium (hour) | `day(10,8,16)` |
| 34 | British | 10 Oct, afternoon (she made her number at noon); taken 3 p.m. | 26 → 27 | + Belleisle (from Plymouth) | Nelson to Marsden, 10 Oct, VII 101 ("this afternoon"); diary (Hudson p. 21) | James III 383: between the 9th and the 13th | High | `day(10,10,15)` |
| 35 | British | 13 Oct, forenoon; taken 10 a.m. | 27 → 28 | + Agamemnon (with the frigate L'Aimable) | Nelson to Marsden, 13 Oct, VII 119 ("this forenoon"); diary (Hudson p. 21); Corbett p. 330 | — | High | `day(10,13,10)` |
| 36 | British | 13 Oct, evening (Prince of Wales out); 14 Oct, by the forenoon (Africa in) | 28 → 27 → 28 | − Prince of Wales (Calder going home); + Africa (from England) | Prince of Wales: Nelson to Marsden, 13 Oct, she "leaves the Fleet this evening" (VII 119–120); diary, 13 Oct; Beatty 1825 pp. 5–6; Corbett p. 330; Desbrière p. 148 n. Africa: the Victory's log under "October 14th" (noon of the 13th to noon of the 14th) lists the Prince of Wales parting first, then the Africa joining (VII 121 n.); Nicolas VII 94 n.: she joined on the 14th; Nelson to Collingwood, 14 Oct, written before Collingwood was to come on board "this forenoon", already has her news (VII 121); his diary of the 13th names the Agamemnon, L'Aimable and the Prince of Wales but not her | James III 383 and Clowes: the Prince of Wales sailed on the 14th, the log's nautical date. James also has the Africa joining "between the 9th and 13th", and his peak of 29 needs her in before the Prince of Wales sailed; no source shows that | High (the Prince of Wales in the evening); medium (the Africa on the morning of the 14th) | strictly 27 for about 13 hours (some 25 px of scroll), which would read as a blink. Suggested: one exchange at `day(10,13,18)`, the label staying at 28 |
| 37 | British | 17 Oct; hour not recorded; taken 3 p.m. | 28 → 27 | − Donegal (to Gibraltar for a ground tier of casks, sent ahead of her turn) | Nelson's diary, 17 Oct (Beatty 1825 p. 97; Hudson p. 22; VII 126); James III 383; Nelson to Collingwood, 18 Oct: she had to go into the Mole for two days, so "I have advanced her" (VII 127). The coast signals of the 18th reported a ship going through the Strait for Gibraltar (Villeneuve, 18 Oct, annexes p. 101; Corbett p. 332 n.) | Beatty's narrative p. 6: the 18th. That is probably the log's nautical day, which would put her going in the afternoon of the civil 17th | High (17th); low (hour) | `day(10,17,15)` |
| 38 | Villeneuve | 19 Oct, between about 10 a.m. and 1 p.m. | 33 stays | 7 of the line out of the bay (Algésiras, Achille, Argonaute, Neptune, Héros, Duguay-Trouin, Bahama) with the Rhin and the Hermione; 26 at anchor that night | Desbrière p. 161; annexes pp. 229–230, 373 (in the repository: `session-17/history-scene-02-wip.md`, "19 October") | British counts: 9 sail at 4 p.m. and 12 at 6, frigates included | High | for the record; the label stays 33 (one fleet under one flag, its first division just outside) |
| 39 | Villeneuve | 20 Oct, 6 a.m. to about 10 a.m. | 33 stays | the rest out of the bay by about 8–8.30, the Rayo last at about 10; the fleet formed by about 11 | Desbrière annexes pp. 158, 213, 216, 373; NRS II 147–148 | Euryalus: 34 at 8.50 | High | for the record |
| 40 | British | 20 Oct, 8 p.m., to dawn on the 21st | 27 stays | The Africa missed the 8 p.m. wear, held on north and was out of touch. At dawn she was about 13 nm north of the Victory, came down and fought | Corbett p. 340 n. | — | High | the label stays 27; strictly she was not "sailing together" for the night (26) |
| 41 | both | 21 Oct, dawn | British 27, combined 33 | as drawn | Nicolas VII 130; James III 384–386 | — | High | as is |

None of the other ships of the line asked about came or went off Cádiz between 28 September and 21 October:
- **Superb.** She sailed for home with Nelson in August. She stands second in the van in the order of battle and sailing of about 10 October (Nicolas VII 94), among the ships expected, and joined only after the battle.
- **Dragon and Goliath.** They were put under Calder's orders in August but never reached Collingwood (Desbrière p. 143). The Dragon went home escorting the captured Didon, and was off Vigo again on 10 October (p. 108 n.). The Goliath took the Faune and the Torche and went back to Ushant.
- **London, Barfleur and Kent.** The London (Duckworth) and the Barfleur (Barlow) were coming out and arrived after the battle (VII 88 and n.). Corbett's list marks the Kent "not arrived".
- **The "next ships" for Gibraltar.** Nelson named Britannia, Temeraire, Achille, Bellerophon, Polyphemus and Donegal as the next watering turn on 5 October (VII 77), and on the 13th wrote that the Swiftsure must soon go in (VII 116). Only the Donegal went, on the 17th.

## 2. The British fleet off Cádiz, 28 September to 21 October

### 2.1 The count, by date

The 29 of 28 September are Collingwood's 26, named ship by ship by Desbrière (p. 143), and Nelson's three.
- Collingwood's 26: Dreadnought, Colossus, Achille and Mars; Bickerton's Queen, Tonnant, Minotaur and Bellerophon; and Calder's 18: Prince of Wales, Britannia, Canopus, Spencer, Spartiate, Donegal, Tigre, Swiftsure, Conqueror, Leviathan, Temeraire, Prince, Neptune, Revenge, Zealous, Defence, Orion and Polyphemus.
- Nelson's three: Victory, Ajax and Thunderer.

The count checks against the end state:
- The 27 of Trafalgar minus the five that joined in October (Defiance, Royal Sovereign, Belleisle, Agamemnon, Africa) leave 22.
- Add the seven that were there on 28 September but not at the battle (Queen, Canopus, Spencer, Tigre, Zealous, Donegal, Prince of Wales): 22 + 7 = 29.
- 34 different ships of the line served under Nelson off Cádiz. That is Nicolas's 33 "under his command" (VII 130) with the Prince of Wales added.

From there:
- **29 → 23 on the evening of 2 October.** Louis's five parted at 6 p.m. The Leviathan was away at Gibraltar by the 5th, when Nelson wrote that he had sent "six Sail of the Line" to Tetuan and Gibraltar and had "twenty-three Sail with me" (VII 75).
- **24 on the morning of the 7th.** The Defiance joined.
- **26 on the 8th.** The Leviathan came back loaded from Gibraltar, and the Royal Sovereign joined about 4 p.m.
- **27 on the afternoon of the 10th.** The Belleisle joined.
- **28 on the forenoon of the 13th.** The Agamemnon joined.
- **27 that evening.** The Prince of Wales sailed for England.
- **28 again by the forenoon of the 14th.** The Africa joined.
- **27 from the 17th to the battle.** The Donegal went to Gibraltar.

The peak was 28, never 29 (as `a-h2b.md`, H2-19a, already ruled).

**The Leviathan's going.** No source dates it. The Victory's log lists only Queen, Canopus, Spencer, Zealous, Tigre and Endymion parting at 6 p.m. on 2 October (VII 63 n.). Austen's letter makes Louis's own group five of the line, so she did not sail with them (Hubback p. 148). Nelson's diary of 29 September to 3 October does not mention her (Hudson pp. 19–20).

Two things point to the first days of October:
- Nelson's letters of 2 and 5 October treat the six as one watering detachment (VII 63, 75).
- In August she was one of Louis's inshore squadron (Austen's log, 30 August: Canopus, Spencer, Tigre, Leviathan, Donegal; Hubback p. 142). On 1 October Louis came out to the fleet with only "a part of his squadron", the Canopus, Spencer and Tigre (Beatty 1825 p. 4). So she may have gone to Gibraltar straight from the inshore station on 30 September or 1 October.

The timing fits either reading. The winds of 1–2 October, southerly to westerly (Nelson's diary of the 2nd; Villeneuve, 2 October, annexes p. 95), would have taken her to the Rock quickly. The Levanter of 4–9 October (diary, Hudson pp. 20–21) would have brought her out again by the 8th, while Louis, sent off on the 5th into the same easterly, only reached Gibraltar on the 9th.

Taking her off with Louis's five at 6 p.m. on 2 October gives one step, 29 → 23, on the day Nelson ordered the six away. That is the most probable reading of his own count. Confidence: low for her day; medium-high that she was gone by the 5th.

**Was she there on the 28th?** All 29 were in company only if the Leviathan had not yet gone. The log's "twenty-three Sail of the Line, and six Sail of the Line in shore" (VII 53 n.) counts her: its 29 are exactly Collingwood's 26 and Nelson's three, and she is one of the 26. The French saw the same inshore squadron: a light squadron of six at 2 leagues on 16 September (Lauriston, annexes p. 114), and an observation squadron of five still in sight after Nelson's arrival (Villeneuve, 2 October, annexes p. 95).

### 2.2 Presence, ship by ship

Rates are as James and Corbett give them. The glyph type is the `RIGS` entry in `fleets.ts` that matches the rate. "From" and "until" are the label's days. Every ship of Collingwood's 26 was there before the British label first shows (the evening of 28 September).

| Ship | Rate (guns) | Glyph | Present from | Present until | Where she stood |
| --- | --- | --- | --- | --- | --- |
| Victory (Nelson) | 100 | victory | 28 Sep, 6 p.m. | the battle | main body |
| Ajax | 74 | british74 | 28 Sep, 6 p.m. | the battle | main body. Sent "up to windward" to look out on 5 Oct in the Colossus's place (VII 78); with Duff's advanced ships early in October (Duff, 10 Oct: "Browne, of the Ajax, one of my Squadron", VII 71 n.) |
| Thunderer | 74 | british74 | 28 Sep, 6 p.m. | the battle | main body |
| Dreadnought | 98 | british98 | before 28 Sep | the battle | main body (Collingwood's flag until he moved into the Royal Sovereign) |
| Royal Sovereign | 100 | firstRate | 8 Oct, about 4 p.m. | the battle | main body, Collingwood's flag |
| Britannia (Northesk) | 100 | firstRate | before 28 Sep | the battle | main body |
| Prince | 98 | british98 | before 28 Sep | the battle | main body |
| Temeraire | 98 | british98 | before 28 Sep | the battle | main body |
| Neptune | 98 | british98 | before 28 Sep | the battle | main body |
| Tonnant | 80 | british80 | before 28 Sep | the battle | main body |
| Mars | 74 | british74 | before 28 Sep | the battle | chain from 4 Oct, 3–4 leagues east of the fleet; from 14 Oct 5 leagues east of it; in the cordon on 19 Oct |
| Colossus | 74 | british74 | before 28 Sep | the battle | chain from 4 Oct (as the Mars); in the cordon on 19 Oct |
| Defence | 74 | british74 | before 28 Sep | the battle | chain from 4 Oct; from 14 Oct 7–10 leagues west of Cádiz with the Agamemnon; in the cordon on 19 Oct |
| Achille | 74 | british74 | before 28 Sep | the battle | main body |
| Bellerophon | 74 | british74 | before 28 Sep | the battle | main body |
| Minotaur | 74 | british74 | before 28 Sep | the battle | main body |
| Orion | 74 | british74 | before 28 Sep | the battle | main body |
| Revenge | 74 | british74 | before 28 Sep | the battle | main body |
| Spartiate | 74 | british74 | before 28 Sep | the battle | main body |
| Swiftsure | 74 | british74 | before 28 Sep | the battle | main body |
| Conqueror | 74 | british74 | before 28 Sep | the battle | main body |
| Polyphemus | 64 | british64 | before 28 Sep | the battle | main body |
| Leviathan | 74 | british74 | before 28 Sep | 2 Oct, 6 p.m. (taken; not recorded) | very likely in Louis's inshore squadron to 1 Oct (section 2.1); away at Gibraltar |
| Leviathan (back) | 74 | british74 | 8 Oct (hour not recorded; taken 4 p.m.) | the battle | main body |
| Defiance | 74 | british74 | 7 Oct, morning | the battle | main body |
| Belleisle | 74 | british74 | 10 Oct, afternoon | the battle | main body; in the advanced squadron by Corbett's reading of the memorandum (p. 357) |
| Agamemnon | 64 | british64 | 13 Oct, forenoon | the battle | from 14 Oct with the Defence 7–10 leagues west of Cádiz; in the cordon on 19 Oct |
| Africa | 64 | british64 | 14 Oct, by the forenoon (suggested: 13 Oct, 6 p.m., merged with the Prince of Wales) | the battle | main body; out of touch to the north from 8 p.m. on 20 Oct |
| Prince of Wales (Calder) | 98 (90 to Nelson himself, VII 57, and to Desbrière and Mahan) | british98 | before 28 Sep | 13 Oct, evening (taken 6 p.m.) | main body. No source places her. She is tenth of the van in the order of battle and sailing of about 10 Oct (VII 94). She sailed for Spithead "direct" (VII 120) |
| Donegal | 74 (after her rearming with carronades sometimes classed as an 80, Corbett p. 163 n.) | british74 | before 28 Sep | 17 Oct (hour not recorded; taken 3 p.m.) | main body. No source places her. She is fourteenth of the van in the order of sailing, which the fleet formed on 16 Oct (diary). She went to Gibraltar, into the Mole |
| Queen | 98 | british98 | before 28 Sep | 2 Oct, 6 p.m. | inshore with Louis by Corbett (p. 326: the Queen, the Canopus and three 74s); by Beatty not one of the ships Louis brought out on 1 Oct. Then to Gibraltar and Tetuan |
| Canopus (Louis) | 80 | british80 | before 28 Sep | 2 Oct, 6 p.m. | inshore close off the port until 1 Oct; then to Gibraltar and Tetuan |
| Spencer | 74 | british74 | before 28 Sep | 2 Oct, 6 p.m. | inshore until 1 Oct; then to Gibraltar and Tetuan |
| Tigre | 74 | british74 | before 28 Sep | 2 Oct, 6 p.m. | inshore until 1 Oct; then to Gibraltar and Tetuan |
| Zealous | 74 | british74 | before 28 Sep | 2 Oct, 6 p.m. | with the fleet on 2 Oct (inshore or main body is not settled). On the morning of the 3rd she went on to Gibraltar with the Endymion and the convoy for a new mainmast. Very likely the ship "démâté de son grand mât" in Gibraltar on 18 Oct (Villeneuve, annexes pp. 101–102; Corbett p. 332 n.) |

The six inshore under Louis on 28 September are not named in any one source:
- **Certain:** the Canopus, Spencer and Tigre, the "part of his squadron" Louis brought out on 1 October (Beatty).
- **Likely:** the other three were among the Queen and the Zealous (Corbett's inshore squadron) and the Leviathan and the Donegal (Austen's log of 30 August).

## 3. Where they stood (question B), and the combined fleet in Cádiz (question C)

### 3.1 The British stations by date

- **28 September.** The main body cruised in sight of Cádiz, about 15 miles off (James III 379; Beatty p. 3). At 8 p.m. the Victory had San Sebastián's light E by N, 5 or 6 leagues (VII 53 n.). The six under Louis lay "in shore", close off the port. The French saw the main body daily at 3–4 leagues, with a light squadron of six at 2 leagues (Lauriston, 16 September, annexes p. 114).
- **29 September to early October.** Nelson took command on the 29th and sent the Euryalus and the Hydra to watch the port (diary). He drew the fleet off to the west: Beatty says to the neighbourhood of Cape St Mary's, 50–60 miles west of Cádiz (pp. 3–4). Villeneuve wrote on 2 October that since the junction of the 28th the main body had kept out of sight of his lookouts (annexes p. 95). Louis's squadron came out to the fleet on 1 October (diary).
- **From 4 October.** The fleet kept 16–18 leagues west of Cádiz, on about its parallel. The letter of 4 October is headed "Cadiz, East 17 leagues" (VII 73, 75). The Mars, Defence and Colossus were posted 3–4 leagues east of the fleet, one of them pushed toward Cádiz (VII 70–73). The Ajax at first stood "to windward" in the Colossus's place (VII 78).
- **From 14 October.** The Defence and the Agamemnon lay 7–10 leagues west of Cádiz, and the Mars and the Colossus 5 leagues east of the fleet. The fleet's station was "from 15 lgs. to twenty" west of Cádiz (diary, Hudson p. 21; VII 122).
- **19 October.** The Colossus, Mars, Defence and Agamemnon formed the cordon (Beatty p. 6).
- **The Prince of Wales and the Donegal.** No source places either ship before she left. Both were with the main body. Their places in the order of sailing are in the table above.

The coordinates for these stations are in `h2-boulogne-cadiz.md`, section 9.3. The main body's usual station is about 36.53 N 7.37 W (7.25–7.56 W).

### 3.2 The combined fleet in Cádiz, 28 September to 20 October

**Ready on 28 September: 32 of the line.** That is 18 French and 14 Spanish. Gravina told Villeneuve that day that the 14 Spanish ships were entirely ready, and that the Santa Ana, a three-decker just out of dock, would be ready in four or five days (Gravina to Decrès, 28 September, annexes p. 91). Desbrière says 14 Spaniards were in the roads once the Rayo and the San Leandro went out on the 28th, and that the Santa Ana was ready only in the first days of October (p. 134). His narrative on p. 136 turns Gravina's "four or five days" into nine.

Villeneuve's letter of 24 September already had all 15 in the roads except the Santa Ana, which was out of La Carraca, with the Rayo in the roads but not ready (annexes p. 88).

**33 from early October.** On 8 October the council of war described the Santa Ana, Rayo and San Justo as "à peine sortis de l'arsenal" but able to sail with the fleet at a pinch (annexes p. 97). So she was with the fleet by then.

**No other ship of the line came or went until the sortie.**
- The Terrible was disarmed and the San Fulgencio docked in September; neither sailed (Gravina, 16 September, annexes p. 84).
- Two worthless Spanish ships of the line found in the roads in August were replaced (Desbrière p. 134).
- The British counts from outside (34–36) take in ships in harbour that were not with the fleet.

**For the label, by the rule:** 32 from 28 September, 33 from the Santa Ana's joining. Her day is not recorded; taken as 3 October, the end of Gravina's four or five days. If the main session prefers not to apply the rule to a fleet lying in port, 33 throughout is defensible: she was out of dock and in the bay by the 28th, and the far views show no ships.

**For the record, 19–20 October** (`session-17/history-scene-02-wip.md`, "19 October" and "20 October"):
- **19 October.** The signal to weigh went up at first light. Seven of the line went out through the passes between about 10 a.m. and 1 p.m., with the Rhin and the Hermione; the Thémis followed at about 6.30 p.m. The other 26 were still at anchor that night, and the Bahama and the Achille anchored off Rota after midnight.
- **20 October.** The signal came at first light (6 a.m.). The rest were out of the bay by about 8–8.30, the Rayo last at about 10, and the fleet was formed by about 11: 33 of the line, 5 frigates and 2 brigs. The brig Observateur stayed at anchor by order.

## 4. The squadrons of the chase against the rule (question D)

Checked against `squadrons.ts` stage by stage. Rows 1–26 of section 1 give the sources.

- **Villeneuve.**
  - Toulon, 11: as is.
  - Cádiz, 14 from 2 a.m. on 10 April: as is, by the owner's choice. The doubt: the América was two days astern, 10–12 April.
  - Martinique, 17 on 14 May: as is. The hour is not recorded; the fleet anchored "during the day".
  - The San Rafael on 16 May: the afternoon, not noon.
  - Magon, 20 on 4 June: as is.
  - Off Finisterre, 18 from about 8.30 p.m. on 22 July: as is.
  - Out of Vigo, 15 on 31 July: as is.
  - **New under the rule:** 13 from 2 August, when the Argonauta and the Terrible went into Ferrol and the French anchored at A Coruña; then 26 from the junction in the bay of Ares on the afternoon of 10 August.
  - 29 on the forenoon of 13 August: as is.
  - Cádiz, 20 August: 29, no change.
- **Nelson.**
  - 11 from 3 April: as is.
  - 10 from about 5 p.m. on 11 May: as is.
  - 12 from about 5 p.m. on 4 June: as is.
  - 11 from 11.50 a.m. on 13 June: as is.
  - 2 from the evening of 15 August: as is.
  - None from 19 August: as is.
  - **Correction:** "Victory" from 11.30 a.m. on 14 September, when the flag was rehoisted, not from 8 a.m. on the 15th.
  - 3 from 18 September: as is.
  - 29 from 6 p.m. on 28 September, the fleet's label.
- **Orde.** 5, then 6 at about midday on 9 April: as is.
- **Calder.** 15 throughout the window, the prizes not counted: as is. He became 14 at 8 p.m. on 26 July, after the window.
- **Collingwood.** 3, then 4 at midnight on 20–21 August: as is. Bickerton's four made 8 on 22 August, hour not recorded, at the window's end.

## 5. Draft for history-notes.md

*To replace the section "Scene 2: the strengths lettered at the tracks' heads (session 20)" or to follow it. House style; confidence on the file's scale.*

**What the label counts (the owner's answers of 12 November 2026).** The label counts ships of the line only, as the dispatches counted a fleet's strength and as the finale's 27 against 33 does; frigates, small craft and prizes are left out. One rule holds everywhere: the figure is the ships of the line actually sailing together at the head of the track on that date. A straggler is added on the day she caught up and a ship that left is taken off on the day she left. Villeneuve's crossing begins with the 14 who went out with him from Cádiz. The figure and the ships that come in at the head as the camera nears always agree, and the figure changes smoothly. Where no source gives the day, the most probable is taken and recorded here. Where two changes fall within a few hours with no recorded hour between them, they are lettered as one step, since a day of beat 4 is only about 40 px of scroll. High.

**The British fleet off Cádiz, by date.**
- **29 from 6 p.m. on 28 September.** Nelson's three joined Collingwood's 26: 23 in the main body and 6 inshore under Rear-Admiral Louis (the Victory's log and signal log, Nicolas VII 53 n.; Nelson to Acton and to Elliot, 30 September, VII 54, 59; the 26 named in Desbrière 1907, p. 143).
- **23 from 6 p.m. on 2 October.** Louis sailed for Gibraltar and Tetuan with the Queen, Canopus, Spencer, Tigre and Zealous. The log enters this under the nautical "October 3rd. P.M. at 6" (VII 63 n.; Nelson's diary, Hudson 1917, pp. 19–20; Austen, Hubback 1906, p. 148). The Leviathan was also away at Gibraltar: Nelson wrote on the 5th that he had sent "six Sail of the Line" and had "twenty-three Sail with me" (VII 75).
- **24 from the morning of 7 October.** The Defiance joined (VII 84).
- **26 on 8 October.** The Leviathan came back from Gibraltar, and the Royal Sovereign joined at about 4 p.m. (VII 88 and n., 107; Nelson's diary, Hudson 1917, the transcript facing p. 20).
- **27 from the afternoon of 10 October.** The Belleisle joined (VII 101).
- **28 from the forenoon of 13 October.** The Agamemnon joined (VII 119).
- **28 through the night of 13–14 October.** The Prince of Wales left on the evening of the 13th (VII 119–120; Beatty 1825, pp. 5–6; Corbett 1910, p. 330), and the Africa joined by the forenoon of the 14th (the Victory's log under the nautical "October 14th", VII 121 n.; VII 94 n., 121). Strictly the fleet was 27 for those hours; the label takes the two as one exchange.
- **27 from 17 October to the battle.** The Donegal was sent to Gibraltar for a ground tier of casks (the diary, Beatty 1825, p. 97; James III 383).

The peak was 28. Sources that differ:
- James (III 379) and Beatty (1825, p. 3) give 27 on Nelson's arrival.
- James and Clowes give a peak of 29. That needs the Africa in before the Prince of Wales sailed, which no source shows.
- James and Clowes put the Royal Sovereign "between the 9th and 13th" and the Prince of Wales on the 14th, the log's nautical date.
- Beatty's narrative has the Donegal leaving on the 18th, probably the log's date.
- Desbrière (p. 148) has Louis sailing on 3 October, the log's date read literally.

High for 29, 23 by the 5th and 27; medium-high for the steps between.

**Louis's brief return, 4–5 October.** On the morning of the 3rd the Euryalus told Louis by signal that the enemy had embarked their troops. He sent the Zealous and the Endymion on with the convoy and turned back with the other four (Austen, Hubback 1906, pp. 148–149; James III 380). On the 4th they were in sight to the southward (the diary, Hudson 1917; Codrington, *Memoir* I 53). They were with the Commander-in-Chief on the morning of the 5th and sent off again that day (Austen; Beatty, p. 4, has them rejoin on the 4th). Nelson counted 23 that day and called them "a good look-out Squadron" while the easterly lasted (VII 75, 77). The Levanter held them, and they reached Gibraltar only on the 9th (Austen). The label does not count those hours. Medium-high.

**The Leviathan.** She was at Gibraltar from early October and came back on the 8th "loaded" (Nelson to Collingwood, 8 October, VII 88; James III 380). No source records the day she went. The 29 of 28 September include her, and Nelson's 23 of 5 October leave her out. The Victory's log names only Louis's five and the Endymion parting on 2 October, and Austen makes Louis's group five of the line. Nelson's letters of 2 and 5 October count the ships sent to Gibraltar and Tetuan as six (VII 63, 75). She had been in Louis's inshore squadron in August (Austen's log, Hubback 1906, p. 142), and on 1 October Louis came out to the fleet with only part of his squadron (Beatty, p. 4). So she may have gone straight from the inshore station on 30 September or 1 October. The label takes her off with Louis's five at 6 p.m. on 2 October. Low for the day.

**The combined fleet in Cádiz.**
- **32 ready on 28 September:** 18 French and 14 Spanish. Gravina told Villeneuve that day that his 14 were entirely ready and the Santa Ana would follow in four or five days (Gravina to Decrès, 28 September, Desbrière 1907, annexes p. 91).
- **33 from early October.** Desbrière has the Santa Ana ready only in the first days of October (p. 134; his p. 136 paraphrases the same letter as nine days), and on 8 October the council of war counted her with the fleet, "à peine sortis de l'arsenal" (annexes p. 97). The label takes 3 October. Medium; low for the day.
- **Nothing else came or went until the sortie.** The Terrible and the San Fulgencio lay disarmed or in dock. British counts from outside of 34–36 take in ships in harbour that were not with the fleet. High.
- **The sortie.** Seven of the line got out on the 19th and the rest on the morning of the 20th (see "19 October" and "20 October"). The label stays at 33, one fleet under one flag. High.

**The crossing's 14.** Villeneuve went out from Cádiz at about 2 a.m. on 10 April with 14 by the owner's choice: the 11 from Toulon, the Aigle, the Argonauta and the América (Desbrière 1907, pp. 9–11). The record has two days that differ. At dawn on the 10th only the Argonauta was with the 12 French. The América rejoined on the 12th (Reille, p. 11), or "next morning" by Villeneuve's report (p. 10). Strictly that gives 13 for two days. The Firme, Terrible and España were found off Fort-de-France on 14 May (17), and the San Rafael anchored with the fleet on the afternoon of the 16th after Diamond Rock had fired on her in the morning (18; James III 343–344). High.

**A Coruña and Ferrol.**
- **15 out of Vigo on 31 July.**
- **13 from 2 August.** On entering the bay the two Spaniards, with Gravina already in the channel, had to go into Ferrol under the Emperor's order, and the 13 French anchored at A Coruña (Desbrière 1907, p. 86).
- **26 from the afternoon of 10 August.** The French worked out of A Coruña on the 8th to 10th. On the 10th, at about 12.30, Gourdon's five and eight Spaniards came out of the ría of Ferrol. The wind died before the last three cleared the narrows, and all anchored in the bay of Ares (p. 97; Escaño's journal, annexes p. 7, has nine Spaniards).
- **29 from the forenoon of 13 August.** The last three joined, and all were under sail by 2 p.m. (pp. 97–98).

High for the split, medium for 26.

**Smaller dates, by the rule.**
- **The Royal Sovereign.** She left Nelson between 4 p.m. and 6.50 p.m. on 11 May, while Knight's Queen and Dragon were in company; those two were not under Nelson's flag and are not counted (Nicolas VI 433).
- **Collingwood.** The Mars rejoined at midnight on 20–21 August (James III 375), and Bickerton's four made 8 on 22 August, hour not recorded.
- **Calder.** He became 14 at 8 p.m. on 26 July, when the Windsor Castle went home with the prizes (James III 371). That is after his window closes.
- **Nelson's flag.** It was rehoisted in the Victory at St Helens at 11.30 a.m. on 14 September (VII 36), so "Victory" is lettered from then. High.

**What changed from session 20's figures.**
- The British October label goes by date (29, 23, 24, 26, 27, 28, 27) instead of a constant 27.
- The combined fleet's label in Cádiz is 32 until the Santa Ana joined, then 33.
- Villeneuve is 13 at A Coruña from 2 August and 26 from 10 August, where 15 was lettered until the 13th.
- The San Rafael joins at Martinique in the afternoon of 16 May.
- "Victory" is lettered from 11.30 a.m. on 14 September.
- Collingwood's 8 on 22 August falls at his window's end.

**Doubts.**
- The day the Leviathan went to Gibraltar. Low.
- Whether the Africa joined in the night of 13–14 October or in the morning. Medium.
- The hour the Donegal left on the 17th. Low.
- The day the Santa Ana joined the fleet in the roads. Low.
- Whether Louis's four were in company on the 4th (Beatty) or the 5th (Austen); either way, for hours only.
- The six inshore on 28 September, of whom only the Canopus, Spencer and Tigre are certain.
- James's 27 on arrival, which leaves out two ships no source names as absent.
- The hour of the Firme's and the San Rafael's surrender: about 8–8.25 p.m. by the British, 9 p.m. for the San Rafael by her captain, daybreak on the 23rd by Desbrière.
- Whether the strict reading should letter the British 26 for the night of 20–21 October, while the Africa was out of touch to the north. The label keeps 27.

## 6. What the data would need (for the main session; nothing changed here)

- **`fleets.ts`, British.**
  - Add the seven absent at the battle, each with an `until` day, where the label and the ships at the head must agree: Queen 98, Canopus 80, Spencer, Tigre, Zealous, Donegal (74s) and Prince of Wales 98.
  - Add a `from` day (the label's day of joining) for Defiance, Royal Sovereign, Belleisle, Agamemnon and Africa.
  - Give the Leviathan an absence from `day(10,2,18)` to `day(10,8,16)`.
  - Suggested days: Louis's five and the Leviathan out at `day(10,2,18)`; Defiance `day(10,7,9)`; Leviathan and Royal Sovereign `day(10,8,16)`; Belleisle `day(10,10,15)`; Agamemnon `day(10,13,10)`; Prince of Wales out and Africa in `day(10,13,18)`; Donegal out `day(10,17,15)`.
  - `lineStrength` would then give 29, 23, 24, 26, 27, 28, 27.
- **`fleets.ts`, combined.** The Santa Ana in from `day(10,3,12)`, if the rule is applied to the fleet in port.
- **`squadrons.ts`, Villeneuve.**
  - Stage 13 from `day(8,2)`: the eleven Toulon ships less the Atlas, plus the Aigle, Algésiras and Achille; the Argonauta and Terrible leave places empty.
  - Stage 26 from `day(8,10,14)`.
  - The San Rafael's stage from `day(5,16,15)`.
- **`squadrons.ts`, Nelson.** The unflagged stage ends at `day(9,14,11.5)`.
- **`squadrons.ts`, Collingwood.** Bickerton's four at `day(8,22)`, or the window closed before it.
- **Scroll check.** The British steps of 7 and 8 October are about 55 px of scroll apart at 1280×720; every other October step is 85 px or more from the next.

## Sources

Period sources, public domain (archive.org; the printed page is given in the text):
- N. H. Nicolas, *The Dispatches and Letters of Vice Admiral Lord Viscount Nelson*, vol. VI (1845), pp. 392, 398 n., 433, 445, 452–453: https://archive.org/details/dispatchesletter06nelsiala
- N. H. Nicolas, vol. VII (1846), pp. 8, 36, 45, 53–59, 62–66, 70–79, 84, 87–88, 94, 101, 107, 116–122, 126–131: https://archive.org/details/dispatchesletter07nelsuoft
- G. Hudson (ed.), *Nelson's Last Diary, September 13–October 21, 1805* (1917), pp. 15–24, with the transcript of 4–8 October from the British Museum copy inserted after p. 20: https://archive.org/details/nelsonslastdiary00nelsuoft
- W. Beatty, *Authentic Narrative of the Death of Lord Nelson*, 3rd ed. (1825), pp. 1–6, 95–98: https://archive.org/details/authenticnarrati00beat
- J. H. and E. C. Hubback, *Jane Austen's Sailor Brothers* (1906), pp. 142–153 (Francis Austen's log and his letter of 15–18 October 1805): https://archive.org/details/janeaustenssailo00hubbuoft
- W. James, *The Naval History of Great Britain*, vol. III (1886 ed.), pp. 339–344, 356–375, 379–386: https://archive.org/details/navalhistoryofgr03jameuoft
- J. S. Corbett, *The Campaign of Trafalgar* (1910), pp. 62–63, 163 n., 326–332, 340 n., 357: https://archive.org/details/campaignoftrafal00corb
- E. Desbrière, *La campagne maritime de 1805: Trafalgar* (1907), pp. 9–11, 26, 36, 63–64, 85–86, 97–98, 107, 134, 136, 143, 147–148; annexes pp. 7 (Escaño's journal), 84 (Gravina, 16 September), 88 (Villeneuve, 24 September), 91 (Gravina, 28 September), 95 (Villeneuve, 2 October), 96–97 (Villeneuve and the council of war, 8 October), 101–102 (Villeneuve, 18 October), 111 (Lauriston, 2 September), 114 (Lauriston, 16 September): https://archive.org/details/la-campagne-maritime-de-1805
- Lady Bourchier (ed.), *Memoir of the Life of Admiral Sir Edward Codrington*, vol. I (1873), pp. 46, 53: https://archive.org/details/memoirlifeadmir00codrgoog
- T. Sturges Jackson (ed.), *Logs of the Great Sea Fights*, vol. II (Navy Records Society, 1900), pp. 147–148: https://archive.org/details/logsofgreatseaf02jack
- G. L. Newnham Collingwood, *A Selection from the Public and Private Correspondence of Vice-Admiral Lord Collingwood* (1829), pp. 93–97 (read for August–October 1805; nothing on the Leviathan): https://archive.org/details/selectionfrompub00colluoft

Searched without result for the Leviathan's day: the *Naval Chronicle* vol. XIV (https://archive.org/details/navalchronicleco14londiala); a web search (her original log is at Bedfordshire Archives, X170/1/2, per https://bedsarchives.bedford.gov.uk/Newsletters/BedfordshireAndTrafalgar.aspx; not online). The Leviathan's and the Victory's logs for 28 September to 8 October (ADM 51 and 52, and X170) would settle her day.
