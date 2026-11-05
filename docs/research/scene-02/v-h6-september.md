# V-H6. Check of Nelson's September passage: `h6-september.md` and `nelson-september.json`

An independent, adversarial check of `research/scene-02/h6-september.md` (Nelson's passage from Portsmouth to the fleet off Cádiz, 13–28 September 1805) and its leg `research/scene-02/nelson-september.json`. A first check was cut off by a power loss and left nothing; this one starts fresh. Every source was opened again (the full texts and the page images on archive.org), every worked position recomputed, the variation re-queried, and the leg re-checked against Natural Earth by new scripts.

The corrected leg is `nelson-september.json` beside this report, in the format of `routes-draft.json`.

## 1. Verdict in brief

The research is careful and mostly right. Its dates and hours hold against the diary, the log extracts and the letters; its worked positions reproduce to 0.1–0.5′; its variations match gufm1; its coast check reproduces to a few tenths of a mile. What does not hold:

1. **The Scilly point.** The research reads "27 leagues S.W. from Scilly" as a true bearing on the ground that an out-of-sight reckoning is stated true. Nelson's own diary gives an out-of-sight reckoning of 19 October "by compass", and the project's rule is compass unless the source says true. The leg now draws the compass reading; the true reading is given as the alternative.
2. **The two Scilly readings lie 35 nm apart, not 37**, the true one WNW of the compass one.
3. **Beatty's "about fifteen miles" is on p. 2 (leaf n11), not p. 3.** The bullet "Joining" cites it.
4. **Desbrière pp. 146–147 are leaves n171–n172, not n170–n171** (n170 is p. 145).
5. **A disagreement left out:** Desbrière gives the log's San Sebastián bearing at 8 a.m., for the main body, where the log as Nicolas prints it has 8 p.m. after the 6 p.m. joining.
6. **Sources left out:** a letter of the 17th dated off the Eddystone (Nicolas VII 43); the diary's sighting of the Décade at noon, which explains Beatty's "noon"; Nelson to Ball on the 30th, "got fairly into the Fleet yesterday" (VII 54).
7. **The course out of St Helens road:** the log's SSE, read by compass, is SE true; the research's estimated point lay SSE true. The point is moved, and the line now clears the Foreland by more.
8. Smaller slips in the bullets and the leg's notes (a log citation that is a letter, "six" estimated points that are five, "WSW" for SW by W, an undefined "table K", the closest-approach figures).

## 2. How the check was done

- **Texts.** Hudson 1917 (`nelsonslastdiary00nelsuoft`), Nicolas VII (`dispatchesletter07nelsuoft`), Beatty 1825 (`authenticnarrati00beat`), James III (`navalhistoryofgr03jameuoft`), Desbrière 1907 (`la-campagne-maritime-de-1805`), Corbett 1910 (`campaignoftrafal00corb`), Fraser 1906 (`enemyattrafalgar00frasuoft`) and *The Letters of Lord Nelson to Lady Hamilton* vol. II (1814; Gutenberg text 15437), each downloaded as full text into its own folder under the scratchpad's `dl/`. The page images of every page a bullet cites were read on archive.org (leaf links below). The Royal Museums Greenwich page was read through the web.
- **Leaves.** Every leaf link the research gives was opened. Archive.org's page-number maps were used only as a guide: for James they are two leaves out, so each link was settled on the page image.
- **Variation.** NOAA's calculator (model GUFM1805, through its public API) at each ship position on its date.
- **Positions.** Recomputed on the sphere (mean radius 6,371.0 km, 1 nm = 1,852 m) from the same lights the research uses.
- **Coast.** Natural Earth 10m land and minor islands, read-only. Every waypoint; every straight leg (straight on the chart's Mercator) sampled every 0.05 nm; the chart's own curve (the centripetal Catmull–Rom of `src/components/chart/lines/Route.ts`, with its phantom end points, in the chart's Mercator world space) sampled every 0.25 km, and the app's 4-km pieces as drawn. Rocks Natural Earth lacks were checked by hand.
- **Scripts** (in the scratchpad's `scripts/`): `geo.mjs` (geodesy, the chart's projection and curve, the coast index), `positions.mjs` (the bearings and runs), `coastcheck.mjs` (the coast check), `segdist.mjs` (distances to real lights and rocks), `nefeatures.mjs` (what Natural Earth carries), `write-leg.mjs` (writes the corrected leg). The research's own scripts (`h6-positions.mjs`, `h6-coastcheck.mjs`) were not in this session's scratchpad.

## 3. Findings

Each finding: what the research says; what the source says, with its leaf; the correction.

### F1. The Scilly reckoning is read true on a ground the sources contradict (position; changed)

- **Research.** Section 3, "Reckonings and sightings": Scilly at 81 nm and Finisterre at 51 nm were out of sight, so the bearings are "reckonings from the day's work, which a log states in true bearings"; the Décade point is drawn true, 48°55.8′ N 7°47.9′ W, with the compass reading, 48°37.3′ N 7°02.4′ W, as the alternative. Doubt 2 notes that the project's precedent for an unstated bearing (Cape Sicié) used the mean.
- **Sources.**
  - The bearing is a letter's, not a log's: "I fell in with Décade, on the 20th, 27 leagues S.W. from Scilly" (Nelson to Collingwood, 25 September, Nicolas VII 49, https://archive.org/details/dispatchesletter07nelsuoft/page/n84/mode/1up). It says neither compass nor true.
  - Nelson's own out-of-sight reckoning in the same diary is by compass: on 19 October, "Cadiz bearing ESE by compass distance 16 leagues", 48 nm off (Hudson 1917, pp. 22–23, https://archive.org/details/nelsonslastdiary00nelsuoft/page/n27/mode/1up and https://archive.org/details/nelsonslastdiary00nelsuoft/page/n28/mode/1up; Corbett quotes the same entry from Nicolas, with "E.N.E.", and reads it as magnetic, p. 333 n.).
  - The project's own drawing of Nelson's diary reckoning of 20 October noon, "Cadiz NE 9 Leagues" (Hudson p. 23), is the compass reading, 36°07′ N 6°33′ W (`src/scenes/02-road/movements.ts`).
  - The "positions true, courses magnetic" idea is Corbett's suggestion for one French log (Reille's noon of 15 August, Corbett 1910, p. 261 n., https://archive.org/details/campaignoftrafal00corb/page/n294/mode/1up), not a rule.
  - The project's rule ("Dates and conventions", "Bearings."): logs and letters give bearings by compass unless they say true.
- **Correction.** The point is drawn by compass from St Agnes, with gufm1's 25.2° W at the ship: **48°37.3′ N 7°02.2′ W**. The true reading, 48°55.8′ N 7°47.8′ W, is the alternative; the mean, the Cape Sicié rule, would be 48°46.6′ N 7°25.0′ W. Rates both ways are plausible (Lizard to the point 2.1 or 2.4 kn over 50 hours of SW gales; the point to Finisterre 5.8 or 5.9 kn), so nothing in the track decides it; the Victory's own log would. "Abreast of Cape Finisterre" is not a bearing at all; the reading "cape due east, on the beam of a ship running south" stands, but the leg's note now says why, rather than calling it a true reckoning.

### F2. The two Scilly readings lie 35 nm apart (number; changed)

- **Research.** "37 nm" (section 4, doubt 2, bullets D and F, the leg's note "37 nm to the south-east").
- **Computation.** The research's own two points, 48°55.8′ N 7°47.9′ W and 48°37.3′ N 7°02.4′ W, are 35.2 nm apart; recomputed, 35.3 nm. From the true point the compass point bears 121° (ESE).
- **Correction.** 35 nm; the true reading lies WNW of the drawn one.

### F3. Beatty's fifteen miles are on p. 2 (citation; changed)

- **Research.** "Beatty puts the city about fifteen miles off (p. 3)" (section 4, "In sight or out of sight"; bullet B, "Joining"); Evidence list: "p. 3: …/page/n12".
- **Source.** Beatty 1825, p. 2, leaf n11, has the Victory joining on the evening of the 28th and the city seen about fifteen miles off, with the combined fleet at anchor and Louis close in shore (https://archive.org/details/authenticnarrati00beat/page/n11/mode/1up). Leaf n12 is p. 3, the 29th and the fleet's station.
- **Correction.** p. 2, leaf n11. The same p. 2 has the Euryalus sent ahead "the preceding day" before Cape St Vincent was seen on the 27th.
- **Aside, outside this check.** The merged section's Key sources link Beatty 1825 "p. 2" to n12, "p. 10" to n20 and "p. 97" to n109; the page images show those leaves are pp. 3, 11 and 98. The right leaves are n11, n19 and n108 (p. 1 is n10; p. 95 is n106).

### F4. Desbrière's leaves (citation; changed)

- **Research.** pp. 146–147 at …/page/n170 and …/page/n171 (Evidence; bullet G).
- **Source.** Leaf n170 is p. 145; p. 146 is n171 (https://archive.org/details/la-campagne-maritime-de-1805/page/n171/mode/1up), p. 147 is n172 (https://archive.org/details/la-campagne-maritime-de-1805/page/n172/mode/1up).
- **Correction.** n171–n172.

### F5. Desbrière puts the San Sebastián bearing at 8 a.m. (time; added)

- **Research.** The 8 p.m. bearing of the light, from the log, with no other version.
- **Sources.** The log as Nicolas prints it: "At 8, St. Sebastian's Light-House bore E. b. N." (Nicolas VII 53, https://archive.org/details/dispatchesletter07nelsuoft/page/n88/mode/1up): 8 follows the P.M. entry at 6. Desbrière, p. 147 (n172): joined at 6 p.m. on the 28th; then, at 8 in the morning, "le gros" (the main body) 5 or 6 leagues from the light, which bore east by north. His footnote adds that Nelson could communicate only next morning.
- **Correction.** Recorded in section 4's list, the bullet "Joining", the open doubt and the leg's last note. The leg keeps 8 p.m.: the log's order makes it the evening, and the light was lit by then (sunset about 5.50 p.m.).

### F6. A dateline off the Eddystone (place; added)

- **Research.** The letters place Nelson off Portland (16th), off Plymouth (17th), off the Lizard (18th)…; the Eddystone point is "est." with the diary only.
- **Source.** To Rear-Admiral Duckworth, "Off the Eddystone, September 17th, 1805" (Nicolas VII 43, https://archive.org/details/dispatchesletter07nelsuoft/page/n78/mode/1up; from Clarke and M'Arthur). Duckworth's reply of the 25th, in the footnote there, says he saw Nelson off the Eddystone from the shore (he writes "the 27th", a slip for the 17th).
- **Correction.** Added to the bullet "Down Channel" and to the leg's Eddystone point, which stays an estimate (about 5 nm south of the rock).

### F7. The Décade seen at noon (time; added)

- **Research.** "1.30–2.20 p.m. (log), 2 p.m. (diary), noon (Beatty)".
- **Sources.** The diary: at noon a frigate to windward made the private signal; at 2 he spoke the Décade, and her captain came on board (Hudson p. 17, https://archive.org/details/nelsonslastdiary00nelsuoft/page/n20/mode/1up). Beatty: the same day at noon he spoke her (p. 1, n10). The log: hove to at 1.30, filled at 2.20 (Nicolas VII 46, n81).
- **Correction.** The bullet now says the diary has her seen to windward at noon and spoken at 2: Beatty's noon is the sighting.

### F8. Nelson's own "yesterday" for the arrival (date; added)

- **Research.** "The day of arrival": the evening of the 28th, against Fraser's 29th.
- **Source.** Nelson to Ball, 30 September: "I got fairly into the Fleet yesterday" (Nicolas VII 54, https://archive.org/details/dispatchesletter07nelsuoft/page/n89/mode/1up; from Clarke and M'Arthur), that is the 29th, when he first communicated and took command. His letter to Lady Hamilton of 1 October has "late on the evening of the 28th", and no communication until next morning (VII 60).
- **Correction.** Added to the bullet "Joining" beside Fraser.

### F9. The course out of St Helens road (position; changed)

- **Research.** Point 3, "east of the Foreland after making sail to the SSE", 50°37.5′ N 1°00.0′ W. From the berth it lies 5.2 nm at 158° true, that is SSE true. The leg out of the road passes 0.70 nm from Natural Earth's shore and 1.2 nm from the Foreland.
- **Source.** The log: "8, A.M., weighed and made sail to the S.S.E." (Nicolas VII 36, n71). By the project's rule a course is by compass; gufm1 at St Helens is 24.0° W, so SSE by compass is 133° true, SE.
- **Correction.** Point 3 moves to 5 nm SE (true) of the berth: **50°38.9′ N 0°57.3′ W**. The leg out of the road now comes no closer to Natural Earth's shore than the berth itself (0.79 nm), passes the Foreland at 1.6 nm, and the next leg keeps 2.3 nm (straight) and 3.7 nm (curve) off the Isle of Wight. A 4-nm point was tried and rejected: its next leg passed 1.9 nm off Shanklin.

### F10. The second Rock of Lisbon bearing used the wrong variation (position; changed, 0.3 nm)

- **Research.** Both Rock of Lisbon bearings with 22.3° W.
- **Model.** gufm1 gives 22.26° W at the 25th's point but 21.92° W at the 26th's (38°06′ N 9°30′ W).
- **Correction.** The 26th: **38°06.3′ N 9°30.4′ W** (was 9°30.1′ W).

### F11. Smaller errors in the waypoint labels (wording; changed)

- Point 9, "5 nm S of Rame Head": it lies 5.3 nm at 149°, SSE.
- Point 10, "south-east of the Eddystone": it lies 4.9 nm at 168°, south.
- Point 22, "16.5 nm WSW of the light": from the light it lies at 237°, SW by W (WSW is 247½°). The same in section 3 ("The 28th") and section 4 ("west-south-west of Cádiz").
- Point 21, "about 15 nm west of the joining": it is 17 nm WNW of the 8 p.m. position.
- Section 3, "consistent with a fleet cruising some 15 miles west of Cádiz (James III 379; Beatty p. 3)": James says the 22 cruised about 15 miles off Cádiz, not west of it (p. 379, n394); Beatty's fifteen miles are the city seen from the fleet (p. 2).

### F12. The bullet "Across the Bay" (citation and attribution; changed)

- **Research.** "On the 20th, '27 leagues S.W. from Scilly' by his letter of the 25th, he passed Rear-Admiral Stirling's five of the line at 11 a.m. and hove to … for the frigate Décade … (Victory's log, Nicolas VII 46, 49 …)".
- **Sources.** p. 49 is Nelson's letter to Collingwood, not the log (n84). The letter puts the place on the Décade meeting only; Desbrière puts both meetings there (p. 146, n171).
- **Correction.** The log is cited to p. 46, the letter to p. 49, and the place is given as Nelson's for the Décade and Desbrière's for both.

### F13. The bullet "Portsmouth and St Helens" leaves out a version (time; changed)

- **Research.** Corbett's "early in the morning" for going on board is in section 4 but not in the bullet.
- **Source.** Corbett 1910, p. 292 (n325): early in the morning he went off to the Victory and rehoisted his flag; Rose and Canning dined on board, and then he made the signal to weigh.
- **Correction.** The bullet gives Corbett's hour beside the diary's 2 p.m. and Nicolas's reading.

### F14. The bullet on the routes (count, label and figures; changed)

- "Six estimated points carry the line round the Isle of Wight, Start Point, the Eddystone and Cape St Vincent": those are five (points 3, 4, 8, 10, 19); the sixth estimate is the Spithead start, which carries Nelson's arrival at Portsmouth, not the ship's position.
- "(table K)": no table K exists in the section; tables A–J are those of `h1-campaign.md`, section 7. The label is replaced by a pointer to `h6-september.md`, section 3.
- The closest approaches are recomputed against Natural Earth, which is what the section's checks measure: the Isle of Wight off Shanklin 2.3 nm (2.4 before; the moved point 3); Start Point 3.4 (the research's 3.1 is the distance from the lighthouse); "St Alban's Head 4.7 / 3.9" is Anvil Point on Natural Earth, 4.8 / 4.2; Portland Bill 7.1 on Natural Earth, whose tip lies 0.9 nm north of the light (6.0 from the light); Cabo de Santa María about 11 / 9 (10.3 before). The curve's departure across Biscay is 5 and 11 nm with the compass Scilly point (the research's 8 and 18 belonged to the true one). The straight legs total about 1,160 nm (1,180 before).
- "How they are drawn" in the merged section says the lines pass Cape St Vincent at 8.7 nm; the September line passes Natural Earth's cape at 6.1 nm and the point of Sagres at 3.7, so that sentence must change too.
- Natural Earth carries Scilly and the Berlengas (both within 0.03 nm of its coast), so they need no hand check; it lacks the Eddystone, Wolf Rock, the Seven Stones and the Farilhões. The corrected line passes them at 2.8, 22–24, 34–36 and 21–22 nm.

### F15. "Nicolas and Beatty print only the entries of 14, 25, 28 and 29 September" (wording; changed)

- **Source.** Nicolas also prints the Friday-night entry of the 13th, from a facsimile in Toker's possession (VII 33–35; Hudson's notes 2 and 5, p. 30, https://archive.org/details/nelsonslastdiary00nelsuoft/page/n35/mode/1up). Beatty's appendix starts at the 14th (p. 95, n106).
- **Correction.** Section 1 should read: Nicolas prints 13, 14, 25, 28 and 29 September; Beatty 14, 25, 28 and 29. Not in the bullets.

### F16. A near-verbatim modern phrase (style; changed)

- **Research.** Section 4: the Royal Museums Greenwich page "says he left Portsmouth on HMS Victory on 14 September", which repeats the page's own wording.
- **Correction.** Paraphrased: the page gives 14 September for his departure from Portsmouth. The bullet already paraphrases it.

### F17. The Euryalus in the fleet-size row (name; changed)

- **Research.** Row "Nelson's passage": "1, the Victory, with the Euryalus; 3 from 18 September".
- **Sources.** The Euryalus was sent ahead at 4 p.m. on the 26th (diary). Captain Duff, writing to his wife on 1 October, names her among the ships that joined with Nelson on the Saturday night (Nicolas VII 70 n., https://archive.org/details/dispatchesletter07nelsuoft/page/n105/mode/1up). When she reached Collingwood is not in the sources read.
- **Correction.** The row says she was with him until he sent her ahead on the 26th; Duff's wording goes to the doubts.

### F18. The variation model against the Victory's own observations (doubt; added)

- **Research.** gufm1 throughout, without a check against observation.
- **Source.** Corbett 1910, p. 261 n. (n294), from the Victory's log for mid-August 1805: Hardy observed the variation daily, 22°35′ W at long. 18°, 23°15′ at long. 12° and 22°49′ at long. 11°. gufm1 at her positions of 7–8 August (41–42° N, 18° W) gives 23.4–23.8°, and at 13–14 August (49° N, 11–12° W) 26.4–26.6°: the model runs about 1° higher at the first and 3½° higher at the others. An observed figure includes the ship's own deviation, which is what a bearing taken in her needs.
- **Effect.** Applied to this leg's compass readings, 3° would move the Scilly point about 4 nm and the Lizard point about 0.5 nm; the others less. The leg keeps gufm1, as the whole section does; the difference goes to the doubts and, optionally, to "Bearings."

### F19. The noon latitude of 23 September: one more argument (doubt; added)

- **Research.** 42°25′ N (drawn) or 42°02½′ N, both possible.
- **Page image.** Hudson p. 18 (n21) prints "42°: 2′5 [sic.]", with a prime after the 2.
- **Run.** From the 6 a.m. point abreast of Finisterre (42°52.6′ N), 42°25′ means 28 nm in six hours, 4.6 kn, in a fresh gale from E by S on the beam; 42°02½′ means 50 nm, 8.4 kn. On to the 24th's noon (40°05′ N) the runs are 141 nm (5.9 kn) and 118 nm (4.9 kn). Noon latitudes in the diary are in whole minutes ("40 : 05", "36 : 32"), which favours 25′; the morning's gale favours 02½′.
- **Correction.** The leg keeps 42°25′ N, low; both arguments go to the doubt.

### F20. Desbrière's wind on 26–27 September (weather; noted)

- Desbrière has the south wind light and contrary on the 26th and 27th (p. 147, n172). The diary has light NW airs on the 26th and fresh NW breezes on the 27th (Hudson pp. 18–19), and Nelson's 5 p.m. letter of the 25th a NW breeze springing up (Nicolas VII 50). Not a date, number, place or name; noted here only.

## 4. What holds

Checked and found right, with the leaf read:

- **Recall and departure.** Blackwood at Merton early on 2 September (Corbett p. 278, n311; Nicolas VII, Analysis, p. xxxi, n34). Merton left at half past ten on Friday the 13th (Hudson p. 15, n18). Portsmouth at six (diary; to Marsden, VII 36, n71); the George Inn and the 2 p.m. embarkation in Nicolas's note (VII 35, n70). Flag at 11.30 a.m. by the log, "about noon" by the letter (VII 36). Only the Victory and Euryalus ready (VII 36; Desbrière p. 146).
- **The diary's text** for 13–28 September as the research quotes it (Hudson pp. 15–19, n18–n22): the 2 p.m. on board, the daylight weighing and anchoring again at 6, sunset off Christchurch, Berry Head four miles, Plymouth at 9, "Lizard North" and noon joining, Stirling at 11, the 23rd's 6 a.m. Finisterre and noon latitude, 40°05′ on the 24th, the Rock of Lisbon SSE 10 and NNE 13–14 leagues, St Vincent SE by S by compass 6 leagues, the Nautilus, Lagos Bay at noon, lying to at 1 a.m., nine sail at noon in 36°32′ and eighteen at 1, the evening joining. Hudson's notes 8 and 9 (p. 31, n36) confirm that Nicolas took the 25th and 28th from Beatty and dropped the nine sail.
- **The letters and log extracts** (Nicolas VII 36–53): every dateline and hour the research gives; the letter to Collingwood dated the 25th (page image, n84); the orders of the 27th and the rendezvous between Cape St Mary's and Cádiz (VII 51–53).
- **Narratives.** Beatty p. 1 (St Helens, the 15th; off Plymouth on the 18th; the Décade at noon); James III 379 (n394: the 15th, off Plymouth on the 18th, the Euryalus on the 26th); Desbrière pp. 146–147 (the 15th, the Lizard on the 18th, the WSW gale, the 20th's place for both meetings, Finisterre on the 23rd, Lisbon on the 25th, off St Vincent on the 26th and 27th, 6 p.m. on the 28th); Corbett pp. 292, 317, 322 (n325, n352, n357); Fraser p. 22 (n47: the 29th); the Royal Museums Greenwich page (the 14th).
- **Weekdays.** 13 September 1805 was a Friday, 15 September a Sunday, 28 September a Saturday (counted back from Monday 21 October). Nicolas's "Sunday" for the 28th is a slip, as the research says; Beatty heads it Saturday (p. 95).
- **Sunset at Christchurch** on the 15th, about 6.20 p.m. local apparent time.
- **Light positions** used (St Agnes, the Lizard, Berry Head, Finisterre, Cabo da Roca, St Vincent, San Sebastián).
- **Variation.** gufm1 (NOAA, model GUFM1805): 24.0° W at St Helens, 24.4–24.9° in the Channel, 25.1° at the Lizard point, 25.2–25.5° at the Scilly points, 23.6° at Finisterre, 22.3° and 21.9° off the Rock of Lisbon, 21.7° off St Vincent, 21.2° off Cádiz.
- **Worked positions.** Every bearing position reproduces to 0.1–0.5′: the Lizard north 9 nm; Finisterre abeam both ways; the Rock of Lisbon on the 25th both ways; the 26th both ways (with 22.3°); St Vincent; San Sebastián at 5, 5½ and 6 leagues and as true.
- **Rates** along the leg are all plausible: 2–2½ kn beating out of the Channel, about 6 kn across the Bay, 3–5 kn in the light airs off Portugal, 2 kn in the near calm of the 28th afternoon.

## 5. The corrected leg

Kind: logged (a place the sources name, or a noon latitude), bearing (worked from a bearing and distance), estimate. Changes from the research are marked ⟵.

| # | Point | Position | Date, time | Kind | Note |
| --- | --- | --- | --- | --- | --- |
| 1 | Spithead, the Ushant line's end | 50°45.9′ N 1°06.0′ W | 14 Sep, 6 a.m. (Nelson at Portsmouth) | estimate | ship already at St Helens |
| 2 | St Helens road | 50°42.3′ N 1°03.0′ W | 15 Sep, 8 a.m. | logged | berth est. |
| 3 | 5 nm SE (true) of the berth ⟵ | 50°38.9′ N 0°57.3′ W ⟵ | 15 Sep, forenoon | estimate | the log's SSE by compass |
| 4 | South of St Catherine's Point | 50°30.0′ N 1°18.0′ W | 15 Sep | estimate | |
| 5 | Off Christchurch | 50°33.6′ N 1°45.6′ W | 15 Sep, sunset | logged | offing est. |
| 6 | Off Portland, 6 nm S of the Bill | 50°24.6′ N 2°27.0′ W | 16 Sep | logged | hour not stated |
| 7 | Berry Head 4 miles (ESE assumed) | 50°22.4′ N 3°23.2′ W | 16 Sep, evening | logged | |
| 8 | 5 nm S of Start Point | 50°07.8′ N 3°38.4′ W | night 16–17 Sep | estimate | |
| 9 | Abreast of Plymouth, 5 nm SSE of Rame Head ⟵ | 50°14.1′ N 4°09.0′ W | 17 Sep, 9 a.m. | logged | |
| 10 | 5 nm S of the Eddystone ⟵ | 50°06.0′ N 4°14.4′ W | 17 Sep | estimate | letter "Off the Eddystone" ⟵ |
| 11 | Lizard North (compass), 9 nm | 49°49.4′ N 5°06.2′ W | 18 Sep, noon | bearing | |
| 12 | Scilly NE 27 leagues, by compass ⟵ | 48°37.3′ N 7°02.2′ W ⟵ | 20 Sep, about 2 p.m. | bearing | true: 48°55.8′ N 7°47.8′ W, 35 nm WNW |
| 13 | Abreast of Finisterre 17 leagues | 42°52.6′ N 10°25.9′ W | 23 Sep, 6 a.m. | bearing | cape due east, on the beam |
| 14 | Noon latitude | 42°25′ N 10°24′ W | 23 Sep, noon | logged | or 42°02½′ N |
| 15 | Noon latitude | 40°05′ N 10°06′ W | 24 Sep, noon | logged | longitude est. |
| 16 | Rock of Lisbon SSE 10 leagues | 39°08.0′ N 9°57.2′ W | 25 Sep, morning | bearing | 22.3° W |
| 17 | Rock of Lisbon NNE 13–14 leagues | 38°06.3′ N 9°30.4′ W ⟵ | 26 Sep | bearing | 21.9° W ⟵ |
| 18 | Cape St Vincent SE by S by compass, 6 leagues | 37°11.5′ N 9°18.4′ W | 27 Sep, daylight | bearing | 21.7° W |
| 19 | Rounding Cape St Vincent | 36°56.4′ N 9°04.8′ W | 27 Sep, forenoon | estimate | |
| 20 | Abreast of Lagos Bay | 36°57.6′ N 8°37.2′ W | 27 Sep, noon | logged | 8 nm SSE of Ponta da Piedade |
| 21 | Noon latitude, nine sail east | 36°32′ N 6°54′ W | 28 Sep, noon | logged | 17 nm WNW of point 22 ⟵ |
| 22 | San Sebastián light E by N, 5–6 leagues | 36°22.8′ N 6°36.2′ W | 28 Sep, 8 p.m. | bearing | SW by W of the light ⟵; Desbrière 8 a.m. ⟵ |

## 6. Coast check of the corrected leg

Against Natural Earth 10m land and minor islands:

- No waypoint is on land; no straight leg, stretch of the drawn curve or 4-km piece touches land.
- Within 2 nm only the two anchorages: Spithead 1.16 nm; St Helens road 0.79 nm (the berth, and the leg out of it at no less); the curve between them 0.76 nm.
- Closest approaches, straight / curve: the Isle of Wight off Shanklin 2.34 / 3.73 nm; Anvil Point 4.84 / 4.16; Portland Bill 7.1 (Natural Earth's tip; 5.95 / 6.12 from the light); Berry Head 4.24 / 4.29; Start Point 3.36 (straight; 3.09 from the light); the coast by Dartmouth 2.90 (curve); Bolt Head 2.95 / 3.68; the Lizard 8.8; Cabo da Roca 12.2 / 12.5; Cape St Vincent 6.05 / 6.30; Sagres 3.72 / 4.57; Ponta da Piedade 8.0; Cabo de Santa María about 11 / 9; San Sebastián 17.0 from Natural Earth's shore (16.5 from the light) at the end.
- By hand, rocks Natural Earth lacks: the Eddystone 2.81 / 2.77; Wolf Rock 24.1 / 21.8; the Seven Stones 36.2 / 33.5; the Farilhões 21.3 / 22.2. Banks (not land): the Shambles 4.5 / 4.8; the Skerries off Start 3.3 / 3.1.
- Departure of the curve from the straight legs: 5.1 nm (Lizard to Scilly point) and 11.0 nm (Scilly point to Finisterre), in open sea; 2.2 nm at most elsewhere.
- Straight legs total about 1,160 nm.

## 7. Corrected text for the section

Ready to paste into `history-scene-02-merged.md`. It replaces the research's section 7 (A–G). The pointers assume `h6-september.md`, the corrected `nelson-september.json` and this report sit in `docs/research/scene-02/`.

**A. "### Nelson off Cádiz": replace the bullet "The passage." with these five bullets.**

- **Recalled.** Early on 2 September Blackwood, posting from Lymington to the Admiralty with the news that the combined fleet was in Cádiz, called at Merton, and Nelson was ordered to resume the Mediterranean command (Corbett 1910, p. 278; Nicolas VII, Analysis, p. xxxi). Of the ships he chose at Portsmouth only the Victory and the frigate Euryalus were ready; the Royal Sovereign, Defiance and Agamemnon were left to follow, and the Ajax and Thunderer were ordered out of Plymouth to join him (Nicolas VII 36–37; Desbrière 1907, p. 146). High.
- **Portsmouth and St Helens, 13–15 September.** Nelson left Merton at 10.30 p.m. on Friday 13 September and reached Portsmouth at six the next morning (his diary, Hudson 1917, p. 15; to Marsden, Nicolas VII 36). The Victory lay at St Helens, where his flag was rehoisted at 11.30 a.m. by her log, "about noon" by his letter (Nicolas VII 36). He embarked from the beach by the bathing machines with Rose and Canning and was on board at 2 p.m., by his diary as Hudson reads the manuscript and as Beatty prints it (Hudson pp. 15–16; Beatty 1825, p. 95). Nicolas prints the "two" as the hour he left the beach (VII 35), and Corbett has him go off to the ship early in the morning (p. 292). She weighed at daylight on Sunday 15 September in light northerly airs, anchored again at 6 and weighed at 8, making sail to the SSE with the Euryalus (diary, Hudson p. 16; log, Nicolas VII 36). Beatty, James, Desbrière and Nicolas's chronology give the 15th (Beatty 1825, p. 1; James III 379; Desbrière 1907, p. 146; Nicolas VII, Analysis, p. xxxi). Corbett has the signal to weigh made on the 14th, after Rose and Canning had dined on board (p. 292), and the Royal Museums Greenwich gives the 14th for his leaving Portsmouth: that is the day he embarked. High. Date line: 15 September 1805.
- **Down Channel, 15–18 September.** Against light airs, fog and then a foul westerly he was off Christchurch at sunset on the 15th, off Portland on the 16th and four miles off Berry Head that evening. At 9 a.m. on the 17th, abreast of Plymouth, he sent the Euryalus in to call the Ajax and Thunderer out of Cawsand Bay; a letter of the same day is dated off the Eddystone (diary, Hudson 1917, p. 16; Nicolas VII 38–43). On the 18th he lay to with the Lizard north, and the two 74s joined: in the morning by his letter to Marsden, at noon by his diary (Nicolas VII 45; Hudson p. 16). Desbrière also has the Lizard (p. 146); James (III 379) and Beatty (1825, p. 1) say off Plymouth. High.
- **Across the Bay, 19–23 September.** A south-westerly gale on the 19th held him in the mouth of the Channel (diary, Hudson pp. 16–17; west-south-westerly in Desbrière 1907, p. 146). On the 20th he passed Rear-Admiral Stirling's five of the line at 11 a.m. and hove to from 1.30 to 2.20 p.m. for the frigate Décade, which was carrying Bickerton home sick (Victory's log, Nicolas VII 46). The diary has the frigate seen to windward at noon and spoken at 2; Beatty puts the meeting at noon (p. 1). Nelson placed it "27 leagues S.W. from Scilly" (to Collingwood, 25 September, Nicolas VII 49); Desbrière puts both meetings there (p. 146). Northerly and then easterly gales carried him south, and at 6 a.m. on the 23rd he was "abreast of Cape Finisterre 17 Lgs" (diary, Hudson p. 17). High for the dates, medium for the places.
- **Down the coast of Portugal, 23–27 September.** The diary's noon latitudes are 42°25′ N on the 23rd (printed "42°: 2′5 [sic.]", which could also be 42°02½′) and 40°05′ N on the 24th (Hudson 1917, p. 18). He made the Rock of Lisbon SSE ten leagues on the 25th, having arrived off it that morning, and lay becalmed there all day; he asked the consul and the Amphion at Lisbon to keep his approach secret (diary; Nicolas VII 48–50). On the 26th, with the Rock NNE 13–14 leagues, he sent the Euryalus ahead at 4 p.m. with a letter dated the 25th: Collingwood was to put himself under Nelson's command and, if in sight of Cádiz, to fire no salute and hoist no colours when Nelson joined (diary, Hudson p. 18; Nicolas VII 49). James and Beatty also give the 26th (James III 379; Beatty 1825, p. 2); Corbett has the Euryalus sent from off Cape St Vincent (p. 317). At daylight on the 27th Cape St Vincent bore SE by S by compass, six leagues. There he stopped the sloop Nautilus, homeward bound with Collingwood's dispatches, and left her off the cape to send his reinforcements to the rendezvous between Cape St Mary's and Cádiz; at noon he was abreast of Lagos Bay (diary, Hudson pp. 18–19; Nicolas VII 51–53). Nelson heads letters "off Cape St. Vincent" on the 26th and 27th, and Desbrière keeps him there both days (p. 147), but the cape came in sight only on the 27th. High for the dates, medium for the positions.

**B. "### Nelson off Cádiz": replace the bullet "Joining." with this one.**

- **Joining.** After lying to from 1 a.m., he bore up at daylight on Saturday 28 September with a fresh NNW breeze. At noon, in 36°32′ N, he saw nine ships of war to the east, and eighteen by 1 p.m. (the diary from the manuscript, Hudson 1917, p. 19; Beatty and Nicolas print only "At noon saw eighteen sail"). In near calm, under studding sails, the Victory joined Collingwood at 6 p.m. (Victory's log, Nicolas VII 53 n.; Desbrière 1907, p. 147). At 8, the log's next entry, San Sebastián's light bore E by N, five or six leagues: about 36°23′ N 6°36′ W by compass, 16½ nm south-west by west of the light. Desbrière gives that bearing at 8 a.m., for the main body (p. 147). The joining was in sight of Cádiz: Nelson saw the combined fleet in the harbour, Beatty puts the city about fifteen miles off (p. 2), and the Cádiz signal stations reported a three-decker and two 74s joining Collingwood from the westward that evening (Corbett 1910, p. 322). He could not communicate until morning and took command on the 29th, his forty-seventh birthday (his letters, Nicolas VII 60, 62–63; Duff, VII 70 n.; Codrington 1873, I 51); his "got fairly into the Fleet yesterday", written to Ball on the 30th, means that day (Nicolas VII 54). The main body went out of sight, 16–18 leagues west, only after he took command (see "The station"). Nicolas heads both 28 and 29 September "Sunday", a slip; the manuscript and Beatty have "Saturday" for the 28th. Fraser has him arrive on the 29th (1906, p. 22). High; medium for the position. Date line: 28 September 1805.

**C. "### Fleet sizes at each stage": a row after "The British off Cádiz".**

| Nelson's passage | 15–28 September | 1, the Victory, with the frigate Euryalus until he sent her ahead on the 26th; 3 from 18 September with the Ajax and Thunderer | 1, then 3 | High |

**D. "### Routes on the chart".**

1. In "How they are drawn": end the list of anchorages with "Dunnose, Spithead and St Helens road)"; change "Cape St Vincent at 8.7" to "Cape St Vincent at 6.1 (8.7 on the other lines)"; after "…only in the mouth of Gibraltar Bay" add "; the September line passes the Eddystone at 2.8 nm and the coast by Dartmouth at 2.9 (drawn curve)"; and in the list of what Natural Earth lacks, before "the Las Puercas reef", add "the Eddystone, Wolf Rock, the Seven Stones, the Farilhões,".
2. After the bullet "Nelson.", add:

- **Nelson, Portsmouth to Cádiz.** Nelson's diary from the manuscript (Hudson 1917, pp. 15–19), with the Victory's log extracts and his letters (Nicolas VII 35–53); the table is in `research/scene-02/h6-september.md`, section 3, as corrected in `research/scene-02/v-h6-september.md`. Twenty-two points run from Spithead, where the Ushant line ends, to the Victory's position at 8 p.m. on 28 September. Sixteen rest on the sources' own places: St Helens road; off Christchurch, Portland, Berry Head (four miles), Plymouth and Lagos Bay; the noon latitudes of 23, 24 and 28 September; and seven bearings: the Lizard north, Scilly NE 27 leagues, Cape Finisterre abreast at 17 leagues, the Rock of Lisbon SSE 10 and NNE 13–14 leagues, Cape St Vincent SE by S 6 leagues, and San Sebastián light E by N 5–6 leagues. Every bearing is read by compass with gufm1's 21–25° W, the out-of-sight Scilly reckoning included, since Nelson gave his own out-of-sight reckoning of 19 October by compass (Hudson pp. 22–23); read as true, the Scilly point would lie 35 nm WNW. "Abreast" of Finisterre is read as the cape due east, on the beam of a ship running south. The noon latitude of the 23rd may be 42°02½′ rather than 42°25′. Longitudes are estimated except where a bearing gives them, and so are the offings where a place is named without a distance. Five estimated points take the line out of St Helens road on the log's SSE by compass and round the Isle of Wight, Start Point, the Eddystone and Cape St Vincent; the Spithead point carries the hour of Nelson's arrival at Portsmouth, as the ship already lay at St Helens. Between the Décade and Finisterre (20–23 September) no position exists, and the line runs straight. Checked like the others: no point, segment or drawn curve touches land, and all keep 2 nm or more off the coast except at Spithead and St Helens road. Closest are the Isle of Wight off Shanklin at 2.3 nm, the Eddystone 2.8, the coast by Dartmouth 2.9 (curve), Bolt Head 3.0, Start Point 3.4, Sagres 3.7, Cape St Vincent 6.1 and Cabo da Roca 12.2. The line ends where the Victory lay at 8 p.m., south-west by west of Cádiz and in sight of it, not at the fleet's later station. High for the dates, medium for the line, low for the offings.

**E. "### Dates and conventions", "Bearings." (optional).** After "21° W off Cádiz, Cape St Vincent and São Miguel" add ", 22° W off the Rock of Lisbon"; after "25° W off Ushant" add " and 24–25° W in the Channel". Before "High for the model" add: "The Victory's own observations of mid-August 1805, 22°35′–23°15′ W between longitudes 11° and 18° W (Corbett 1910, p. 261 n.), lie 1–3½° below the model there."

**F. "### Open doubts": add.**

- **Nelson's September line.** "27 leagues S.W. from Scilly" is drawn by compass; read as true it lies 35 nm WNW, and the mean of the two, as drawn for Cape Sicié, lies between them. The noon latitude of 23 September is drawn as 42°25′ N; the manuscript's "2′5" could be 42°02½′, which the six-hour run from Finisterre in a fresh beam gale would favour. Desbrière gives the San Sebastián bearing of the 28th at 8 a.m. (p. 147), the log at 8 p.m. Duff names the Euryalus among the ships that joined with Nelson (Nicolas VII 70 n.), although she had been sent ahead on the 26th. The Victory's own logs, read only in Nicolas's extracts, would settle these and give a latitude and longitude for every noon. When the Victory moved from the Motherbank to St Helens before 14 September is not recorded in the sources read; the line starts at Spithead so as to join the Ushant line. Low.

**G. "### Key sources": additions and corrections.**

- In the Nicolas entry, vol. VII: Analysis, p. xxxi: https://archive.org/details/dispatchesletter07nelsuoft/page/n34/mode/1up; pp. 35–36: https://archive.org/details/dispatchesletter07nelsuoft/page/n70/mode/1up; p. 38: https://archive.org/details/dispatchesletter07nelsuoft/page/n73/mode/1up; p. 40: https://archive.org/details/dispatchesletter07nelsuoft/page/n75/mode/1up; p. 43: https://archive.org/details/dispatchesletter07nelsuoft/page/n78/mode/1up; p. 46: https://archive.org/details/dispatchesletter07nelsuoft/page/n81/mode/1up; p. 49: https://archive.org/details/dispatchesletter07nelsuoft/page/n84/mode/1up; pp. 50–51: https://archive.org/details/dispatchesletter07nelsuoft/page/n85/mode/1up; p. 53: https://archive.org/details/dispatchesletter07nelsuoft/page/n88/mode/1up; p. 54: https://archive.org/details/dispatchesletter07nelsuoft/page/n89/mode/1up
- In the Hudson entry: pp. 15–19, 13–28 September: https://archive.org/details/nelsonslastdiary00nelsuoft/page/n18/mode/1up (p. 18, the "[sic.]" latitude: https://archive.org/details/nelsonslastdiary00nelsuoft/page/n21/mode/1up); pp. 22–23, the reckoning of 19 October by compass: https://archive.org/details/nelsonslastdiary00nelsuoft/page/n27/mode/1up
- In the Corbett entry: p. 261 n.: https://archive.org/details/campaignoftrafal00corb/page/n294/mode/1up; p. 278: https://archive.org/details/campaignoftrafal00corb/page/n311/mode/1up; p. 292: https://archive.org/details/campaignoftrafal00corb/page/n325/mode/1up; p. 317: https://archive.org/details/campaignoftrafal00corb/page/n352/mode/1up; p. 322: https://archive.org/details/campaignoftrafal00corb/page/n357/mode/1up
- In the Desbrière entry: pp. 146–147: https://archive.org/details/la-campagne-maritime-de-1805/page/n171/mode/1up
- In the Beatty entry, 3rd ed. (1825): p. 1: https://archive.org/details/authenticnarrati00beat/page/n10/mode/1up; and correct the leaves already given: p. 2 is https://archive.org/details/authenticnarrati00beat/page/n11/mode/1up (n12 is p. 3), p. 10 is https://archive.org/details/authenticnarrati00beat/page/n19/mode/1up (n20 is p. 11) and p. 97 is https://archive.org/details/authenticnarrati00beat/page/n108/mode/1up (n109 is p. 98)
- In the Fraser entry: p. 22: https://archive.org/details/enemyattrafalgar00frasuoft/page/n47/mode/1up
- Royal Museums Greenwich, "Battle of Trafalgar: background": https://www.rmg.co.uk/stories/topics/battle-trafalgar-background

## 8. Doubts left open

1. **Scilly: compass or true.** The leg draws compass by the project's rule and Nelson's own practice; a reader who takes the letter's "S.W." for a noon reckoning in true bearings (as the 18 July Spartel bearing, given in degrees, was read) would move the point 35 nm WNW. The Cape Sicié rule, the mean, lies between. Only the Victory's log can settle it.
2. **The 23 September noon latitude**: 42°25′ N (drawn; the notation) or 42°02½′ N (the morning's run).
3. **Variation**: gufm1 runs 1–3½° above the Victory's own observations of August 1805 (Corbett p. 261 n.); the leg keeps the model.
4. **The Spithead start** carries Nelson's arrival, not the ship's. If the chart paces the glyph by these dates, the Victory will seem to cross from Spithead to St Helens during 14 September, when she lay at St Helens; when she moved there from the Motherbank is not in the sources read.
5. **Desbrière's 8 a.m.** for the San Sebastián bearing: if he is right, the bearing belongs to the morning of the 29th and the main body; the place hardly changes.
6. **The Euryalus**: Duff names her among the ships that joined with Nelson; she had gone ahead on the 26th.
7. **The Rock of Lisbon** bearings are worked from Cabo da Roca; if Nelson took them on the Sintra hills, about 5 nm east, both points move a few miles east.
8. **Not read**: the Victory's captain's log (The National Archives, ADM 51/4514), which has a noon latitude and longitude for every day, and the master's private log kept by Thomas Atkinson from 19 September (Pembroke College, Oxford); modern biographies (Sugden, Knight, Adkins). A modern 1805 Club page that pointed to the letter to Ball also has errors (the Eddystone letter given as to Lady Hamilton, the Thunderer sent ahead with the Euryalus on the 25th) and is not used.

## 9. Files

- The corrected leg: `nelson-september.json` (this folder).
- This report: `v-h6-september.md`.
- Scripts: the scratchpad's `scripts/` (`geo.mjs`, `positions.mjs`, `coastcheck.mjs`, `segdist.mjs`, `nefeatures.mjs`, `write-leg.mjs`).
