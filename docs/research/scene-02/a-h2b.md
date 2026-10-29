# Adjudication of `v-h2b.md` (fact-check of `h2-boulogne-cadiz.md`, sections 4, 5 and 9.3)

Scope: every verdict in `v-h2b.md` that is not a plain "confirmed", the one "unverifiable" verdict that bears on a glyph position (H2-37e), and the points in its "Missing from the notes" and "What changes for the scene" sections that would change what the scene shows. Points that change the screen come first.

Method: I opened each passage in the period book itself, using the archive.org full texts and page images. The books are Nicolas VII, Beatty (3rd ed., 1825), *Logs of the Great Sea Fights* II (NRS, 1900), James III (1886), Corbett (1910), Desbrière (1907, main text and annexes), Clowes V, Hubback (1906) for Francis Austen's letters, Codrington's *Memoir* I, and Mahan's *Life of Nelson* II. I checked two single-word readings on the page images:
- Beatty p. 97, "E.S.E. by compass";
- NRS II p. 146, "Defence … west".

Positions were recomputed by plane sailing with variation 21° W (magnetic = true + 21°). The reference points are Cádiz (36.535 N, 6.298 W) and San Sebastián light (36.528 N, 6.316 W). The script is `scratchpad/scripts/bearings-h2b.js`.

Archive.org links below use the leaf index (`/page/nNNN`). The printed page is given beside each link.

## Ruling table

| Id | Point | Ruling | Final statement for `history-notes.md` | Confidence |
| --- | --- | --- | --- | --- |
| H2-16 (+16h, M-9) | British ships of the line when Nelson joined, 28 Sep | checker-right | When Nelson joined on the evening of 28 Sep there were **29** ships of the line, counting Victory, Ajax and Thunderer: 23 with the main body and 6 inshore under Rear-Admiral Louis. Sources: Victory's log and signal log; Nelson's "twenty-three … and six" of 30 Sep; Collingwood's 26, named ship by ship by Desbrière, plus Nelson's 3. James and Beatty give **27** (James: 22 offshore and 5 inshore). James and Corbett make the inshore squadron 5; Beatty says "five or six". | High for 29 under command; medium for all 29 in company |
| H2-19a (+ scene item 3) | Peak strength in October; running counts | checker-right | After Louis left on 2 Oct the fleet off Cádiz never had more than **28** ships of the line at once. The counts: 23 by 5 Oct; 24 on 7 Oct; 26 on 8 Oct; 27 on 10 Oct; 28 on the forenoon of 13 Oct; 27 that evening when Prince of Wales sailed; 28 when Africa joined (13/14 Oct); **27 from 17 Oct** (Donegal to Gibraltar) through the battle. James and Clowes give "29 at its greatest height". That needs Africa to have joined before Calder sailed, which neither the log nor Nelson's letter of the 13th supports. James's "33 including the five" also fails to add up (Clowes makes it 34). Nelson commanded 34 different ships of the line off Cádiz; Nicolas's 33 leaves out Prince of Wales. | Medium-high (high for the 27 at the battle) |
| H2-20b / M-3 | Victory's position when the signal arrived, 9.30 a.m., 19 Oct | checker-right | At 9.30 Cádiz bore **E.S.E. by compass, 16 leagues** from Victory. Sources: Nelson's memorandum book as printed by Beatty (page image checked); the noon letter heading "Cadiz, E.S.E., 16 Leagues", from the autograph; and the noon log position, 36°36′ N 7°30′ W, which puts Cádiz about E.S.E. magnetic, due east true (Corbett). The "E.N.E." in Clarke and M'Arthur, reprinted by Nicolas, is a transcription error. The "W.S.W. of Cadiz" in James and in Nicolas's narrative follows from it. The main fleet lay **due west (true) of Cádiz, 48–58 nm out, about 36.55–36.60 N, 7.3–7.5 W**. | High |
| H2-37f | Latitude of Defence and Agamemnon, the inner ships of the line, 19 Oct | checker-right (with caution) | Nelson placed Defence and Agamemnon 7–10 leagues west of Cádiz. The only bearing of Defence on 19 Oct is from Euryalus at 8 a.m.: "in sight from the mast head west", by compass. That puts her about 10 nm south of Cádiz's parallel, near **36.32–36.42 N, 6.8–6.9 W**. On the parallel she would have borne WNW to NW by W. Agamemnon's position that morning is not logged; she was boarding a brig. | Medium-low |
| H2-37e | Phoebe's position in the morning relay, 19 Oct | notes-right (afternoon added from the checker) | No Phoebe log for 19 Oct is printed, but her consorts' bearings place her near the parallel in the morning:<br>• WNW by compass (due west true) of Euryalus at 8 a.m.;<br>• with Naiad, NW by W of Sirius at noon, when Naiad was 11–12 miles from San Sebastián.<br>That puts Naiad near 36.51 N, 6.57 W and Phoebe beyond her, about **36.50–36.55 N, 6.6–6.75 W**. By 4.50 p.m. the frigate links had moved south as the fleet ran south-east: Naiad's "Cadiz NE by E ½ E, 5 or 6 leagues" gives about 36.33 N, 6.52 W. | Low-medium |
| M-1 / H2-22h | Night signal code and night chain, 20–21 Oct | checker-right | Nelson's memorandum of 20 Oct (original kept by Captain Hope) set the night chain. Blackwood kept two frigates in sight of the enemy, with two more frigates between him and Defence; Colossus lay between Defence and Mars, and Mars communicated with Victory. Its "Signals by night": if the enemy stood south or toward the Straits, **two blue lights burnt together every hour**, "in order to make the greater blaze"; if it stood west, **three guns fired quickly every hour**. | High |
| M-2 | What the logs show was actually burnt, 19–21 Oct | checker-right | **Night of 19–20 Oct:**<br>• Euryalus saw rockets from the ships to the westward at about 8 p.m.;<br>• Naiad burnt a blue light at 11.40;<br>• Euryalus saw a blue light to the westward at 11.45, and another before 1.30 a.m.;<br>• Sirius saw "a rocket and blue light".<br>**Night of 20–21 Oct:**<br>• Sirius burnt blue lights and rockets and fired guns all night, including three guns at 9.35 p.m.;<br>• Phoebe burnt blue lights and rockets "occasionally, which was answered by our fleet";<br>• Naiad repeated blue lights and sky rockets;<br>• Euryalus made lights, burnt false fires and fired guns;<br>• Mars saw blue lights at 2 and 3.20 a.m.<br>The combined fleet also signalled with guns and rockets. | High |
| H2-17d (+17b) | Louis: departure, turn-back, return | checker-right; return date genuinely disputed | Louis sailed on the **evening of 2 Oct** with five ships of the line, the Endymion and five merchantmen. Sources: Austen; Nelson to Ford; the log's nautical "October 3rd P.M. at 6"; Desbrière's "3 octobre" takes the log date literally. On the **morning of 3 Oct** news from Euryalus by telegraph made him turn back with four ships, while Zealous and Endymion went on to Gibraltar (Austen; James). Nelson had Louis's report by 4 Oct (letter to Blackwood). The four ships were back with the fleet **on the 4th (Beatty) or the morning of the 5th (Austen)** and left again on the 5th. | Medium-high |
| H2-17c | Tigre's rating | checker-right | Tigre was a **74** (James, Clowes, Corbett). Louis's squadron was Queen 98, Canopus 80, Spencer 74, Tigre 74 and Zealous 74, with the frigate Endymion and five merchantmen. | High |
| H2-17f / scene item 9 | Louis on 18–21 Oct | notes-right, with a nuance | On 18 Oct Louis left Gibraltar eastward with the Malta convoy. Francis Austen gives "five sail of the line and three frigates". A telegraph report reaching Villeneuve spoke of four ships of the line with the convoy and two in Gibraltar (Corbett). At dawn on 20 Oct Louis was about 200 miles east of the Strait (Corbett). On 21 Oct he parted from the convoy: on news of the sortie (Austen), or according to the usual practice, off Cape Ténès (Corbett, from the Queen's log). | Medium |
| H2-18h | Donegal sent to Gibraltar | checker-right | **17 Oct**, by Nelson's own diary (Beatty p. 97, page image) and James. Beatty's narrative has the 18th, probably the date in the nautical-day log. | High |
| H2-14c | Ajax and Thunderer join Nelson | checker-right | They weighed from Cawsand Bay on 17 Sep as Victory passed Plymouth, and joined her **on the morning of 18 Sep off the Lizard** (Nelson to Marsden, 18 Sep). James and Beatty say the 18th off Plymouth; Desbrière says the 18th off the Lizard. | High |
| H2-16f | Desbrière's "23 + 6 detached toward Gibraltar" | both-partly | Desbrière merges two sources:<br>• the Victory's log: the 23 and 6, and the 8 o'clock bearing of the light, which he misreads as 8 in the morning;<br>• Nelson's letter to Acton of 30 Sep: six ships occasionally at Gibraltar, keeping an eye on Cartagena.<br>It is a conflation, not an independent count. The notes call it a misreading of the log, and the checker says it follows the Acton letter: each has half of it. | Medium-high |
| M-6 | Nautical against civil day in the October logs | checker-right | Logs were kept by the nautical day (noon to noon, dated by the civil day on which it ended). The Admiralty circular of 11 Oct 1805 ordering the civil day reached the fleet too late for Trafalgar. Source: the 1913 Admiralty Trafalgar Committee, as quoted by the Naval Marine Archive. Nelson's diary and letters use civil dates; NRS *Logs* II prints the logs arranged by civil day; Nicolas's extracts of Victory's log mix both. | Medium-high |
| H2-21f | "Pedro shoals" | checker-right (the wording) | Nelson's letter of 5 Oct reads "the Pedro shoals", not "San Pedro". They are probably the Sancti Petri shoals south-east of Cádiz, near the mouth of his "Canal of St. Pedro"; this identification is an inference. | High (wording); low (identification) |
| H2-24b | Beurnonville, 20 Oct | both-partly | Beurnonville wrote from Madrid that Nelson's force off Cádiz was not in sight. He said Nelson kept only frigates on observation **because of the heavy weather**, and that five of his ships lay at Gibraltar (Desbrière, annexes pp. 70–71). Nelson's own letters show the distance was deliberate. | High |
| H2-21d / M-10 | The two small craft on 19 Oct | checker-right | Blackwood sent **Weazle** with the news to Gibraltar and Tetuan and **Pickle** to Cape Spartel (Euryalus's log). No sloop went to the Victory, as Corbett p. 333 says. | High |
| M-11 | Pickle and Entreprenante join | checker-right | Pickle joined from Plymouth on **1 Oct** (Nelson, 2 Oct). Entreprenante joined from Portsmouth on **4 Oct** (Nelson, 4 Oct). | High |
| SC-11 | Caption of beat 4 | notes-right (the checker agrees) | Write "a chain of ships", not "a chain of frigates". The links nearest Cádiz were frigates (Euryalus, Sirius, Naiad, Phoebe); the outer links were ships of the line (Defence, Agamemnon, Colossus, Mars). | High |
| H2-15b | Nicolas's headings and footnote | checker-right | Nicolas heads both 28 and 29 Sep "Sunday"; 28 Sep 1805 was a Saturday. His footnote's "forty-sixth year" should read forty-seventh. | High |
| H2-15d | Desbrière's "8 heures du matin" | checker-right | The log's bearing of San Sebastián light was taken at 8 p.m. on 28 Sep; Desbrière's "matin" is a slip. | High |
| H2-18 (Royal Sovereign) | James's and Clowes's "between the 9th and 13th" | checker-right | Royal Sovereign joined on **8 Oct** (Nelson, Nicolas VII pp. 88 n. and 107; Corbett p. 328). | High |
| H2-18g | Prince of Wales's rating | notes-right | Rated **98** by James and Clowes; Desbrière and Mahan call her a 90-gun ship. | Medium |

## Evidence

### H2-16: strength at Nelson's arrival (glyph count)

- **Victory's log and signal log** (Nicolas VII p. 53 n.). She joined Collingwood's fleet "consisting of twenty-three Sail of the Line, and six Sail of the Line in shore". At 8 the light bore E by N, 5 or 6 leagues. https://archive.org/details/dispatchesletter07nelsuoft/page/n88/mode/1up
- **Nelson's own figures for 30 Sep.**
  - To Acton: "I have twenty-three Sail of the Line; and six occasionally at Gibraltar" (p. 54). https://archive.org/details/dispatchesletter07nelsuoft/page/n89/mode/1up
  - To Elliot, the same day: twenty-three with him and six occasionally at Gibraltar and Tetuan for supplies (p. 59). https://archive.org/details/dispatchesletter07nelsuoft/page/n94/mode/1up
- **Collingwood's 26, named ship by ship** (Desbrière p. 143 for the names, p. 145 for the total).
  - Dreadnought, Colossus and Achille, joined by Mars.
  - Bickerton's four: Queen, Tonnant, Minotaur and Bellerophon.
  - Calder's eighteen: Prince of Wales, Britannia, Canopus, Spencer, Spartiate, Donegal, Tigre, Swiftsure, Conqueror, Leviathan, Temeraire, Prince, Neptune, Revenge, Zealous, Defence, Orion and Polyphemus.
  - Every one of the 26 is later under Nelson's command. So 26 + 3 = 29 were under his command, and the log's 23 + 6 can only be that total including Nelson's three.
  - https://archive.org/details/la-campagne-maritime-de-1805/page/n167/mode/1up and /page/n169/mode/1up
- **The figure of 27.**
  - Beatty p. 3: the fleet now "consisting of twenty-seven ships of the line, including the Victory, Ajax, and Thunderer", with Louis and "five or six ships" close inshore. https://archive.org/details/authenticnarrati00beat/page/n12/mode/1up
  - James III p. 379: 27, "22 of which cruised about 15 miles off Cadiz", and five under Louis inshore. James also says some of Calder's ships were "occasionally detached to Gibraltar for water". https://archive.org/details/navalhistoryofgr03jameuoft/page/n396/mode/1up
- **Mahan**: "then numbering twenty-nine of the line", with six close in. https://www.gutenberg.org/ebooks/16915
- **The inshore squadron.**
  - Corbett p. 326: Queen 98, Canopus 80 and three 74s. https://archive.org/details/campaignoftrafal00corb/page/n361/mode/1up
  - Hubback p. 143 (Austen's log): on 30 Aug the inshore ships were Canopus, Spencer, Tigre, Leviathan and Donegal. https://archive.org/details/janeaustenssailo00hubbuoft/page/n186/mode/1up
- **Consistency check.** Take 29, remove Louis's 5 and Leviathan (back "from Gibraltar" on 8 Oct, James p. 380). That leaves 23, Nelson's own count on 5 Oct: "I have twenty-three Sail with me" (p. 75). https://archive.org/details/dispatchesletter07nelsuoft/page/n110/mode/1up
  - The date Leviathan left for Gibraltar is not recorded. If she had already gone by 28 Sep, 28 ships were present that evening.
- **The French count.** The Cádiz signal stations saw a three-decker and two 74s join that evening; Villeneuve wrote "That makes thirty-one" (Corbett p. 322). That is the enemy's overestimate, not evidence for either 27 or 29. https://archive.org/details/campaignoftrafal00corb/page/n357/mode/1up
- **Scene impact.** Show **29** British ship glyphs at Nelson's arrival: about 23 well offshore and 6 close in off Cádiz. The caption may note "27 in James and Beatty".

### H2-19a: peak strength and running counts

Arrivals and departures from 5 Oct:

| Date | Event | Source | Ships of the line present |
| --- | --- | --- | --- |
| 5 Oct | Nelson's own count | Nelson to Barham, p. 75 | 23 |
| 7 Oct | Defiance joins "this morning from Portsmouth" | p. 84 | 24 |
| 8 Oct | Leviathan returns, "Bayntun seems come out loaded" | p. 88 | 25 |
| 8 Oct | Royal Sovereign joins | p. 88 n., p. 107; Corbett p. 328 | 26 |
| 10 Oct | Belleisle joins "this afternoon from Plymouth" | p. 101 | 27 |
| 13 Oct, forenoon | Agamemnon (with L'Aimable) joins | p. 119 | 28 |
| 13 Oct, evening | Prince of Wales "leaves the Fleet this evening" | p. 120 | 27 |
| 13/14 Oct | Africa joins | log, p. 121 n. | 28 |
| 17 Oct | Donegal to Gibraltar | diary, Beatty p. 97 | 27 |

- **The log entry for Africa.** It reads "October 14th.—Prince of Wales parted. H.M. Ship Africa joined from England." In nautical reckoning that day ran from noon on the 13th, and the entry lists the parting first. Nelson's letter of the 13th, written after Agamemnon came in, does not mention Africa. https://archive.org/details/dispatchesletter07nelsuoft/page/n155/mode/1up and /page/n156/mode/1up
- **James III p. 383.** Between the 9th and 13th Royal Sovereign, Belleisle, Africa and Agamemnon joined. The force was "now at its greatest height, 29 sail of the line", and 33 including the five with Louis. He then has Calder leave on the 14th and Donegal on the 17th. https://archive.org/details/navalhistoryofgr03jameuoft/page/n400/mode/1up
- **Clowes V** has the same 29, "in addition to the five" with Louis, which makes 34. He then gives 27 on the eve of the battle (p. 128 per the checker; checked in the full text). https://archive.org/details/royalnavyhistory0005clow
- **Nicolas VII p. 130.** Thirty-three under Nelson's command, "but six having been sent to Gibraltar" (Louis's five and Donegal), so 27 off Cádiz on the 19th and 21st. https://archive.org/details/dispatchesletter07nelsuoft/page/n165/mode/1up
- **Scene impact.**
  - Arrival: 29.
  - 2 Oct evening: Louis's 5 glyphs leave.
  - Early October: 23 to 24.
  - 8–13 Oct: reinforcements to 27–28.
  - From 17 Oct to the sortie: **27**. Never show 29 in mid-October.

### H2-20b and M-3: E.S.E., not E.N.E.

- **Beatty p. 97, diary, Saturday 19 Oct.** "Cadiz bearing E.S.E. by compass, distance sixteen leagues." I checked the page image. On p. 95 Beatty says the extracts are "accurately copied from His Lordship's Memorandum Book, written entirely with his own hand". https://archive.org/details/authenticnarrati00beat/page/n108/mode/1up and /page/n106/mode/1up
- **Nicolas VII p. 133**, the same diary taken from Clarke and M'Arthur: "Cadiz bearing E.N.E. by compass". https://archive.org/details/dispatchesletter07nelsuoft/page/n168/mode/1up
- **The autograph letter to Lady Hamilton** is headed "Noon, Cadiz, E.S.E., 16 Leagues" (p. 132). https://archive.org/details/dispatchesletter07nelsuoft/page/n167/mode/1up
- **Corbett p. 333 n.** He had only the E.N.E. text. He shows that the log's noon position, 36°36′ N 7°30′ W, puts Cádiz about 19 leagues E.S.E. magnetic, about E true, "his regular position", and concludes that "E.N.E." was a slip. https://archive.org/details/campaignoftrafal00corb/page/n368/mode/1up
- **My computation.** From the noon log position Cádiz bears 94° true, 115° magnetic, 58 nm. The diary's 16 leagues on E.S.E. by compass puts Victory at 36.556 N, 7.293 W.
- **The W.S.W. statements.**
  - Nicolas p. 131 (narrative): "about fifty miles W. S. W. of Cadiz". https://archive.org/details/dispatchesletter07nelsuoft/page/n166/mode/1up
  - James III: the fleet lay to "about 16 leagues west-south-west from Cadiz". This is on **p. 389** of the 1886 vol. III; the checker's "p. 386" is a slip. https://archive.org/details/navalhistoryofgr03jameuoft/page/n406/mode/1up
  - Both are the reciprocal of E.N.E.; both writers used the Clarke and M'Arthur text.
- **Scene impact.** Place the main-fleet glyphs west (true) of Cádiz at 9.30 on 19 Oct, around 36.55–36.60 N, 7.3–7.5 W. Do not place them south-west.

### H2-37f: where Defence lay

- **Euryalus log, 19 Oct, 8 a.m.** (NRS II p. 146): "The Defence in sight from the mast head west. Phœbe WNW, firing three minute guns." I checked the page image. https://archive.org/details/logsofgreatseaf02jack/page/n163/mode/1up
- **Euryalus's own position.**
  - 5.30 a.m.: Sebastian NE about 4 miles.
  - Noon: Sebastian E ½ N, 7 or 8 miles, with observed latitude 36°28′ N.
  - So at 8 a.m. she was about 36.467 N, 6.39 W (pp. 145–146). https://archive.org/details/logsofgreatseaf02jack/page/n162/mode/1up
- **Bearing of Defence from Euryalus for each candidate position** (true / magnetic, distance):

  | Where Defence lay | Bearing from Euryalus |
  | --- | --- |
  | On the parallel, 36.53 N, 6.75 W | 282° / 303°, 18 nm |
  | On the parallel, 36.53 N, 6.85 W | 280° / 301°, 22 nm |
  | On the parallel, 36.53 N, 6.94 W | 278° / 299°, 27 nm |
  | 36.45 N, 6.85 W | 267° / 288°, 22 nm |
  | 36.40 N, 6.85 W | 260° / 281° (W by N), 23 nm |
  | 36.35 N, 6.85 W | 252° / 273° (W), 23 nm |
  | 36.32 N, 6.85 W | 248° / 269° (W), 24 nm |

  The same master logged Phoebe as WNW and other bearings to a quarter point. A ship on the parallel would have been 2½–3 points off "west". The logged bearing fits about 36.32–36.42 N.
- **Nelson's placing.** Diary, 14 Oct, and the order to Hope, 15 Oct: Defence and Agamemnon "from seven to ten leagues West of Cadiz" (Nicolas VII p. 122; Beatty p. 96). The latitude is not stated. https://archive.org/details/dispatchesletter07nelsuoft/page/n157/mode/1up
  - The 4 Oct order put one of Duff's ships "as near as possible in the latitude" (p. 73). https://archive.org/details/dispatchesletter07nelsuoft/page/n108/mode/1up
- **Agamemnon.** Her log for 19 Oct (NRS II p. 299) records only a brig boarded in the morning; she gives no position. https://archive.org/details/logsofgreatseaf02jack/page/n316/mode/1up
- **Codrington, 19 Oct, 8 p.m.**: Defence and Agamemnon were the look-outs nearest Cádiz, with Colossus and Mars next. (*Memoir* I p. 57.) https://archive.org/details/cu31924087998500/page/n73/mode/1up
- **Scene impact.** Put the Defence glyph about 36.37 N, 6.85 W. Draw the chain as a loose line that sags south at its inner end, not a ruled line along the parallel.

### H2-37e: Phoebe (and Naiad)

- **8 a.m.** Euryalus logged Phoebe WNW by compass, which is due west true (271.5°) at Euryalus's latitude (NRS II p. 146, above).
- **Sirius at noon** (NRS II p. 312): "Cadiz E by N, 6 miles. Phœbe and Naiad NW by W." That fixes Sirius at 36.482 N, 6.403 W; NW by W by compass is 283° true. https://archive.org/details/logsofgreatseaf02jack/page/n329/mode/1up
- **Naiad.**
  - Noon (NRS II p. 302): San Sebastián lighthouse 11 or 12 miles off, which places her near 36.51 N, 6.57 W.
  - 4.50 p.m.: "Cadiz NE by E ½ E, 5 or 6 leagues", which gives 36.327 N, 6.522 W on the magnetic reading.
  - https://archive.org/details/logsofgreatseaf02jack/page/n319/mode/1up
- **Euryalus at noon**: "Phœbe and Naiad between us and the fleet". At 4 p.m.: "Another line-of-battle ship WNW."
- **Reading.** In the morning relay the frigate links lay close to the parallel, with Phoebe about 36.50–36.55 N, 6.6–6.75 W. This agrees with the notes' estimate of 36.50 N, 6.60 W. After Nelson's general chase south-east at 9.30, the links shifted south through the afternoon.

### M-1, H2-22h and H2-33: the night code and the night chain

- **Memorandum, Victory off Cadiz, 20 Oct 1805** (Nicolas VII p. 136; Hope's endorsement says it was signed the day before Nelson fell).
  - The chain:
    - Blackwood keeps two frigates in sight of the enemy in the night.
    - Two other frigates lie between him and Defence.
    - Colossus takes station between Defence and Mars.
    - Mars communicates with Victory.
  - The night signals:
    - Standing south or toward the Straits: "burn two blue lights together, every hour, in order to make the greater blaze".
    - Standing west: "three guns, quick, every hour".
  - https://archive.org/details/dispatchesletter07nelsuoft/page/n171/mode/1up
- **In the notes.** H2-33 of the repository copy quotes only the code's opening words, because quotations there were cut, and sections 4–5 omit it. The checker is right that it is the core of the night look.
- **Night communication at work.**
  - Phoebe spoke Mars at 12.20 a.m. on 21 Oct (Phoebe, NRS II p. 306). Mars's own log has Phoebe alongside at 1.25 (p. 245).
  - Naiad spoke Colossus at 1.30 (p. 302). Colossus's log gives 2 (p. 265).

### M-2: what was burnt

- **NRS II, Euryalus, 19 Oct p.m.** (pp. 146–147).
  - About 8.10 she "Observed several rockets made by the ships to the westward of us".
  - At 11.45 she "saw the ships to the westward of us burn a blue light".
  - On 20 Oct a.m.: "Saw another blue light to windward".
  - https://archive.org/details/logsofgreatseaf02jack/page/n164/mode/1up
- **Naiad, 19 Oct p.m.**: "At 11.40, burned a blue light." On 20 Oct p.m.: "Repeated several blue lights and sky rockets from the Phœbe and Sirius" (pp. 302–303).
- **Sirius.**
  - 19 Oct, 6 p.m.: "Saw a rocket and blue light."
  - 20 Oct p.m.: "Burnt blue lights and rockets and fired guns all night" (pp. 312–313). https://archive.org/details/logsofgreatseaf02jack/page/n330/mode/1up
  - Nicolas's longer extract adds three guns fired at 9.35 p.m., and the enemy "making signals with guns, rockets, &c." (p. 134 n.). https://archive.org/details/dispatchesletter07nelsuoft/page/n169/mode/1up
- **Phoebe, 20 Oct p.m.**: "Burnt blue lights and rockets occasionally, which was answered by our fleet" (p. 306). https://archive.org/details/logsofgreatseaf02jack/page/n323/mode/1up
- **Euryalus, 20 Oct.**
  - At 6 p.m. she "Made several lights and burnt false fires to show the enemy's position".
  - Later she "Fired guns and burned false fires as necessary".
  - At midnight she logs "the light of the English fleet" to the south and west (pp. 148–149). https://archive.org/details/logsofgreatseaf02jack/page/n165/mode/1up
- **Mars, 21 Oct a.m.**: "At 2, saw a blue light NE. At 3.20, saw another ENE." (p. 245). https://archive.org/details/logsofgreatseaf02jack/page/n262/mode/1up
- **Beatty pp. 9–10** and **Nicolas p. 136** (narrative): a set number of guns with false fires and blue lights announced each change of course, wear or sail, repeated "from the Euryalus to the Victory". https://archive.org/details/authenticnarrati00beat/page/n19/mode/1up
- **Scene impact (night look).**
  - The light comes from intermittent pyrotechnic flares: blue lights, often in pairs, hourly by the code but in practice more often.
  - Add occasional rockets and false fires, and the flash of guns (three quick shots).
  - The flagship and fleet carried lanterns.
  - No steady beams.
  - The colour of a blue light is for the h3 adjudication.

### H2-17b and H2-17d: Louis's departure and turn-back

- **Departure.**
  - Nelson to Marsden, 2 Oct: Louis is to go "with six Sail of the Line immediately to Gibraltar and Tetuan" (p. 63). The same letter says Zealous's mainmast was sprung and Endymion "must also go into Gibraltar". https://archive.org/details/dispatchesletter07nelsuoft/page/n98/mode/1up
  - The log, p. 63 n.: "October 3rd. P.M. at 6, Queen, Canopus, Spencer, Zealous, Tigre, and Endymion, parted". In nautical reckoning that is 6 p.m. on civil 2 Oct.
  - Austen's recollection, in the same note: he dined on board the Victory and took leave "in the evening".
  - Desbrière p. 148: "le 3 octobre". https://archive.org/details/la-campagne-maritime-de-1805/page/n172/mode/1up
- **Francis Austen to Mary Gibson, 15 Oct** (Hubback pp. 148–149).
  - "We sailed that evening with four other ships of the line, a frigate, and five merchant vessels under convoy."
  - The next morning Euryalus told them by signal that the troops had embarked.
  - Louis returned "with four of the ships", leaving Zealous and Endymion, "both of them crippled ships", to go on with the convoy.
  - "We rejoined the Commander-in-Chief on the morning of the 5th, and were again dispatched in the course of the day."
  - https://archive.org/details/janeaustenssailo00hubbuoft/page/n191/mode/1up and /page/n192/mode/1up
- **The turn-back and return in the narratives.**
  - James III p. 380: the news "induced him, on the 3rd, to return". https://archive.org/details/navalhistoryofgr03jameuoft/page/n397/mode/1up
  - Beatty p. 4: Louis came in from before Cádiz on 1 Oct with Canopus, Spencer and Tigre; he left next day with them, Queen and Zealous; "On the 4th he rejoined". https://archive.org/details/authenticnarrati00beat/page/n13/mode/1up
  - Nelson to Blackwood, 4 Oct: "I have received from Rear-Admiral Louis, your information" (p. 73).
- **Ruling.** The notes ran the turn-back and the return together. The turn-back was on 3 Oct. The return was on the 4th (Beatty; Nelson's letter shows the report had arrived by then) or on the morning of the 5th (Austen). Both are eyewitness-based, so the return date is open.

### H2-17c: Tigre

- James's lists rate Tigre 74. When Louis rejoined after the battle (30 Oct), James writes "74-gun ships Spencer … and Tigre" (James III p. 458). https://archive.org/details/navalhistoryofgr03jameuoft/page/n475/mode/1up
  - The same passage names only Canopus, Queen, Spencer and Tigre. Zealous was not with them that day.
- Clowes V: "Tigre, 74". Corbett's list: "Tigre 74". Corbett p. 326 gives the inshore squadron as "the Queen 98, the Canopus 80, and three seventy-fours".
- Corbett notes that she was a heavy French prize, equal in force to Superb. That is perhaps why she is sometimes thought of as larger, but she was rated a 74.

### H2-17f and scene item 9: Louis on 18–21 Oct

- **Austen** (Hubback pp. 152–153). The order reached him at Tetuan by frigate on the evening of the 17th. On the 18th they "came over to the Rock this morning" and were heading east with the convoy: "Our force consists of five sail of the line and three frigates." On 21 Oct they "bid adieu to the convoy" on news that the enemy was out. https://archive.org/details/janeaustenssailo00hubbuoft/page/n195/mode/1up
- **Corbett p. 332 and its note.** On 18 Oct Villeneuve heard by telegraph that the convoy had sailed east "in charge of four of the line" with two others in Gibraltar. Corbett suggests Donegal and perhaps Zealous. https://archive.org/details/campaignoftrafal00corb/page/n367/mode/1up
- **Corbett p. 335.** At dawn on the 20th Louis was "two hundred miles away and still going to the eastward". On the 21st he dismissed the convoy off Cape Ténès (from the Queen's log). https://archive.org/details/campaignoftrafal00corb/page/n370/mode/1up
- **Beurnonville, 20 Oct**: "5 de ces vaisseaux sont mouillés à Gibraltar" (Desbrière annexes p. 71). That is a rumour, already out of date.
- **Scene impact.** Louis's group is out of the Gulf of Cádiz frame on 19–21 Oct. If shown, use 5 glyphs (Austen), about 200 nm east of the Strait on 20 Oct.

### H2-18h: Donegal

- Beatty p. 97, diary (page image): "Thursday, Oct. 17th. … Sent the Donegal to Gibraltar, to get a ground-tier of casks." https://archive.org/details/authenticnarrati00beat/page/n108/mode/1up
- James III p. 383: "on the 17th was obliged to send the Donegal to Gibraltar".
- Beatty p. 6, narrative: "On the 18th the Donegal … left the Fleet". https://archive.org/details/authenticnarrati00beat/page/n15/mode/1up

### H2-14c: Ajax and Thunderer

- Nelson to Marsden, "Victory, off the Lizard, 18th September". The ships "yesterday, on passing Plymouth … got under weigh from Cawsand Bay, and this morning joined me off the Lizard" (Nicolas VII p. 45). https://archive.org/details/dispatchesletter07nelsuoft/page/n80/mode/1up
- James III p. 379: on the 18th, "off Plymouth". Beatty p. 1: the 18th, off Plymouth. Desbrière p. 146: "dès le 18 … devant le cap Lizard". https://archive.org/details/la-campagne-maritime-de-1805/page/n170/mode/1up

### H2-16f: Desbrière

- Desbrière p. 147: Collingwood "avait avec lui 23 vaisseaux, six autres étaient détachés vers Gibraltar, pour se reposer et en même temps observer Carthagène". The next sentence gives "A 8 heures du matin" and the light bearing east by north at 5 or 6 leagues. https://archive.org/details/la-campagne-maritime-de-1805/page/n171/mode/1up
- The figures and the bearing come from the log (Nicolas VII p. 53 n.). The rest of the description comes from the Acton letter (p. 54).
- The log's "At 8" follows "P.M. At 6", so it was 8 in the evening; "matin" is Desbrière's slip (this also settles H2-15d).

### M-6: nautical day

- **Naval Marine Archive, "Nautical time and date."** It quotes the Admiralty circular of 11 Oct 1805, which ordered the calendar day beginning at midnight. It says the order reached the Mediterranean fleet too late, "so that the Trafalgar logs are in the old form". It quotes the 1913 Admiralty Trafalgar Committee: a log's 20 October covers the afternoon of the 19th and the morning of the 20th, and Nelson's private diary was kept in civil time. https://navalmarinearchive.com/research/docs/nautical_time_and_date.html
- **NRS *Logs* II prints the logs re-arranged by civil day.** In the Euryalus log, "Friday, October 18th, p.m." is followed by "Saturday, October 19th, a.m." and then "p.m.". The twelve enemy ships outside at 6 p.m. under the 19th match the civil 19th.
- **Nicolas mixes the two reckonings.**
  - "October 3rd P.M. at 6" is nautical: civil 2 Oct.
  - The 28 Sep joining entry is civil.

### H2-21f: "Pedro shoals"

- Nelson to Blackwood, 5 Oct: anchor a frigate "between Cadiz and the Pedro shoals", not before two hours after dark, and weigh two hours before day (Nicolas VII p. 76). https://archive.org/details/dispatchesletter07nelsuoft/page/n111/mode/1up
- Desbrière p. 148 has "les bancs de Saint-Pierre". The 8 Oct postscript has "The Canal of St. Pedro is a good speculation for Boats in the night" (p. 88). https://archive.org/details/dispatchesletter07nelsuoft/page/n123/mode/1up

### H2-24b: Beurnonville

- Desbrière, annexes p. 70 (the letter begins: Madrid, 28 vendémiaire an XIV, i.e. 20 Oct) and p. 71.
  - Nelson's force "n'est point en vue; cet amiral ne tient que des frégates en observation en raison des gros temps".
  - Five of his ships are said to lie at Gibraltar.
  - https://archive.org/details/la-campagne-maritime-de-1805/page/n338/mode/1up and /page/n339/mode/1up

### H2-21d, M-10 and M-11: small craft

- **Euryalus log, 19 Oct** (NRS II p. 146): a telegraph message to the Weazle, "intelligence to Gibraltar and Tetuan". At 9 the Pickle was ordered off Cape Spartel to tell all ships the enemy was out. https://archive.org/details/logsofgreatseaf02jack/page/n163/mode/1up
- **Corbett p. 333** has one sloop sent "to the Victory".
- **Blackwood to his wife**: a vessel went to Gibraltar to bring Louis out (Nicolas VII pp. 130–131 n.).
- **Nelson to Marsden, 2 Oct**: "The Pickle Schooner joined the Fleet from Plymouth yesterday" (p. 64). https://archive.org/details/dispatchesletter07nelsuoft/page/n99/mode/1up
- **4 Oct**: "the Entreprenante Cutter, which joined the Fleet this day from Portsmouth" (Nelson to Marsden, 4 Oct, p. 74). https://archive.org/details/dispatchesletter07nelsuoft/page/n109/mode/1up

### SC-11: caption

The brief's own `<history>` already says "a chain of ships"; the beat 4 caption says "a chain of frigates".
- The 14 Oct diary: "by this chain I hope to have a constant communication with the frigates off Cadiz", referring to Defence and Agamemnon, Mars and Colossus (Beatty pp. 96–97).
- The 20 Oct memorandum (p. 136) names Defence, Colossus and Mars as links.

Suggested caption wording: "linked to the coast by a chain of frigates and ships of the line", or "by a chain of ships".

### H2-15b: Nicolas's slips

- Nicolas VII p. 53: "Sunday, September 28th, 1805." and "Sunday, September 29th." Beatty p. 95 prints "Saturday, Sept. 28th".
- The footnote on p. 53 reads "completed his forty-sixth year". Nelson was born on 29 Sep 1758, so he completed his forty-seventh; Nicolas's own running head is "ÆT. 47".

### H2-18: Royal Sovereign and Prince of Wales

- **Royal Sovereign.**
  - P. 88 n.: she "joined the Fleet from England on that day" (8 Oct).
  - P. 107: "joined the Fleet on the 8th inst."
  - Corbett p. 328 gives 8 Oct. https://archive.org/details/campaignoftrafal00corb/page/n363/mode/1up
- **Prince of Wales's rating.**
  - James and Clowes: "Prince of Wales 98".
  - Desbrière p. 148 n.: "avait 90 canons". Mahan: "Calder's ninety-gun ship".

## Not re-ruled (no change on screen)

- **H2-37i–j.** The remark that the 10 Oct heading "N. 71 E." may be a worked true bearing. It is plausible, but it affects only a letter-heading position.
- **H2-23a.** Sirius's printed log has no exact time for the topsail-yard signal. It lies between the 4 a.m. and the next timed entries, and the printed "At 9, tacked" before "At 7" is evidently a misprint. Corbett's 6 a.m. is consistent with daylight. The relay timing belongs to the h3 adjudication.
