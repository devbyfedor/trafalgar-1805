# V-draft-h3: adversarial check of the signals draft for the "Scene 2" section

Draft checked: `C:/Users/User/AppData/Local/Temp/claude/d--dev-trafalgar-1805/3e5770fc-9e19-4fc6-aa58-37980a54d14f/scratchpad/research/draft-h3.md` (92 lines, the version of 31 October 22:18), with the structured data the drafter returned. The older `docs/research/scene-02/draft-h3.md` in the repository is a different, earlier text and was not reviewed.

Measured against: `a-h3.md` (final word), `v-h3a.md`, `v-h3b.md`, `h3-signals.md`; for positions also `a-h2b.md` (H2-20b, H2-37e, H2-37f), `a-h2c.md` (H2-30c, H2-31g, H2-32i, H2-40c) and `h2-boulogne-cadiz.md` §9.4; for scope, the brief's `<history>`, `<concept>` and `<beats>`. No file in the repository was changed.

## Verdict

The draft is sound in substance. Every logged time, count and bearing I tested matches the adjudications and the primary pages I reopened, the plane-sailing positions and the sun figures recompute to within a fraction of a mile or a degree, and all fourteen structured positions lie in open water 32–546 m deep, about 4 nm or more from the nearest land (the San Sebastián islet) and clear of Las Puercas, El Diamante, Rota and Cape Trafalgar (no routes were supplied, so none could cross land). Nothing contradicts the adjudicated core: a day chain about due west of Cádiz, 48–58 nm long; 6.04, 7.00, 7.20, 8.10 and 9.30; the Mars's colour-blind distant signal; a short night chain led by paired blue lights; wears at 8 p.m. and 4 a.m. The faults are of finish: no source carries a URL; the Colossus is placed against `a-h2c.md` H2-40c without saying so; the clock-offset convention is contradicted by the draft's own 65-minute Phoebe–Mars pair; the beat-4 lighting bullet calls a sun 32° up in the south-east "low, warm" and ESE; the fleet's 15–20-league station is cited to letters that say 16–18; and several versions are dropped (a second signal down the chain at 2 or 3 p.m., the Sirius's "to the northward" for the Phoebe, N by E after the 4 a.m. wear, Robinson's 20 leagues, the Euryalus's 5.40, the longer wording of No. 370). With the fixes below it can be merged.

## Method

- Fresh archive.org OCR, each book in its own new folder under `scratchpad/dl/vdh3-*`, and the archive.org page maps to confirm leaf numbers: NRS *Logs* II, Corbett 1910, Nicolas VII, Beatty 1807, Hudson 1917. Pages read in full: NRS II 145–149 (Euryalus), 235 (Dreadnought), 245 (Mars), 257 (Conqueror), 302–303 (Naiad), 306–307 (Phoebe), 312–313 (Sirius); Hudson 21–24; Beatty 6–11; Nicolas VII 130–137; Corbett 298–301, 333–334, 338–340.
- Positions recomputed by plane sailing from San Sebastián light (36.528 N, 6.317 W) and Cádiz (36.535 N, 6.298 W) with variation 21° W; distances and bearings between glyphs; EMODnet depth at every point; the sun for 19 October 1805 at 36.5 N (declination −10.0°). Script: `scratchpad/scripts/vdh3-check.js`.

## Issues, most severe first

| # | Where | Kind | Severity |
| --- | --- | --- | --- |
| 1 | Positions, 19 October: Colossus row (and day "Geometry") | contradicts-adjudication | medium |
| 2 | Chain intro, "Times are ship's times …" | factual-error | medium |
| 3 | By day: "Light and air" | factual-error | medium |
| 4 | Relay of 19 October: the afternoon signal | omission | medium |
| 5 | "The chain as set": 15–20 leagues | factual-error | medium |
| 6 | Whole draft: no URLs | style | medium |
| 7–28 | see below | various | low |

**1. Colossus (contradicts-adjudication, medium).** The table puts her at 36°28′ N 6°58′ W, midway between the Defence and the Mars. `a-h2c.md` H2-40c, the final word on the chain ships, puts the Mars and Colossus together at about 7.06–7.09 W, which is what the diary of 14 October says ("Mars & Colossus five leagues East from the Fleet", Hudson 1917, p. 21). R5 says only that she was probably a middle link. The draft departs from the ruling without saying so (the h2 draft carries the same row). Fix: `| Colossus | about 36°32′ N 7°04′ W, with the Mars | morning | 5 leagues E of the fleet with the Mars (diary, 14 October, Hudson 1917, p. 21; research/scene-02/a-h2c.md, H2-40c); that she repeated No. 370 is inferred (research/scene-02/a-h3.md, R5) | Low |`; structured point lon −7.067, lat 36.533 (about 470 m deep); in "Geometry" write "the Mars and Colossus 15 nm short of the fleet". The Defence–Mars gap becomes about 15.7 nm, inside masthead range (R31). If the scene needs her as a separate pulse between them, keep the midway point but write in the row that it departs from H2-40c.

**2. Clock spread (factual-error, medium).** "Differed between ships by up to about 45 minutes" turns one measured pair (Euryalus against Victory, 20 October) into a bound. The draft's own night data break it: the Phoebe logged speaking the Mars at 0.20 and the Mars logged the same hailing at 1.25, 65 minutes apart (NRS II 306, 245). Fix: "Times are ship's times as logged, and the clocks disagreed: the Euryalus ran about 45 minutes ahead of the Victory on the 20th (Corbett 1910, p. 339 n. 2), and the Phoebe and the Mars logged the same hailing at 0.20 and 1.25. Compare times across ships with that in mind."

**3. Light and air (factual-error, medium).** "A low, warm sun from the ESE behind Cádiz, about 32° up by 9.30" contradicts the draft's own computation: at 9.30 local apparent time the sun stood 31.7° up at 135° (south-east), neither low nor ESE; it was low and ESE only at first light (5.8° at 107° at 7.00). Recomputed exactly. Fix: "**Light and air.** At 7.00 a low, warm sun about 6° up in the ESE (107°), roughly behind Cádiz seen from the west; by 9.30 it stands about 32° up in the south-east (135°), and the light is no longer warm (about 37° at 147° if the Victory's clock ran 45 minutes slow). Light airs: flags barely stream and smoke hangs (inference). No muzzle flash by day. High for the light, medium for the rest."

**4. The second signal of the 19th (omission, medium).** The chain carried a second message that afternoon, "the enemy's fleet is at sea", and the sources disagree on the hour: about 2 p.m., the Colossus and Mars (Beatty 1807, p. 7); 3 p.m., the Colossus (diary, Hudson 1917, p. 23; Nicolas VII 131, whose note records Beatty's "about two"); "by three o'clock" (Corbett 1910, pp. 333–334, who adds that only Magon's division was then outside). Neither this draft nor the h2 draft has it. Fix, a table row: `| about 2 p.m. (Beatty) or 3 p.m. (diary) | Colossus (and Mars) to Victory | a second signal down the chain: the enemy's fleet is at sea, though only seven of the line were out | Beatty 1807, p. 7; Hudson 1917, p. 23; Nicolas VII 131; Corbett 1910, pp. 333–334; research/scene-02/a-h2c.md, H2-30c | High (event), medium (hour) |`

**5. The fleet's station (factual-error, medium).** "Nelson kept the fleet 15–20 leagues west of Cádiz … (Nicolas VII 70–73)": those pages give 3–4 leagues for the links (to Duff) and 16–18 leagues for the fleet (to Blackwood, p. 73); 15–20 is the diary of 14 October (Hudson 1917, p. 21), and the letter to Ball has 15–18. Fix: "Nelson kept the fleet out of sight to the west: 16–18 leagues from Cádiz by his orders of 4 October (Nicolas VII 73), '15 lgs. to twenty' by his diary of 14 October (Hudson 1917, p. 21). Ships of the line linked it to Blackwood's frigates, one of them pushed east 'as near as possible in the latitude' of the port (Nicolas VII 73)."

**6. URLs (style, medium).** The draft cites some twenty sources and gives no URL; the project's `history-notes.md` lists URLs under "Key sources", and only NRS II, Nicolas VII, Beatty and Perrin are there now. Fix, append to the Scene 2 key sources:
- *Logs of the Great Sea Fights* II (NRS, 1900): Euryalus log pp. 145–150, https://archive.org/details/logsofgreatseaf02jack/page/n162/mode/1up ; signal log p. 160, https://archive.org/details/logsofgreatseaf02jack/page/n177/mode/1up ; Mars p. 245, https://archive.org/details/logsofgreatseaf02jack/page/n262/mode/1up ; Naiad pp. 302–303, https://archive.org/details/logsofgreatseaf02jack/page/n319/mode/1up ; Phoebe p. 306, https://archive.org/details/logsofgreatseaf02jack/page/n323/mode/1up ; Sirius pp. 312–313, https://archive.org/details/logsofgreatseaf02jack/page/n329/mode/1up ; Walker pp. 322–323, https://archive.org/details/logsofgreatseaf02jack/page/n339/mode/1up
- G. Hudson (ed.), *Nelson's Last Diary* (1917), pp. 21–24: https://archive.org/details/nelsonslastdiary00nelsuoft/page/n26/mode/1up
- W. Beatty, *Authentic Narrative* (1807), pp. 6–11: https://archive.org/details/b22036611_0001/page/n15/mode/1up ; appendix p. 97: https://archive.org/details/b22036611_0001/page/n108/mode/1up
- Nicolas VII, pp. 70–73, 109–111, 130–137: https://archive.org/details/dispatchesletter07nelsuoft/page/n165/mode/1up
- W. P. Cumby, letter in *The Nineteenth Century* 46 (Nov. 1899), pp. 718–719: https://archive.org/details/sim_twentieth-century_1899-11_46_273/page/n32/mode/1up
- J. S. Corbett, *The Campaign of Trafalgar* (1910), pp. 298–301, 333–334, 339–340: https://archive.org/details/campaignoftrafal00corb/page/n368/mode/1up
- Admiralty, *Night Signals and Instructions* (1799): https://archive.org/details/bim_eighteenth-century_night-signals-and-instru_1799 ; *Signal-Book for the Ships of War* (1796): https://archive.org/details/bim_eighteenth-century_signal-book-for-the-ship_1796
- H. Popham, *Telegraphic Signals; or Marine Vocabulary* (1803), p. 6: https://archive.org/details/bub_gb_qxZEAAAAYAAJ/page/n10/mode/1up
- W. James, *Naval History* III (1886), pp. 388–390: https://archive.org/details/navalhistoryofgr03jameuoft/page/n406/mode/1up
- E. Fraser, *The Enemy at Trafalgar* (1906), pp. 88–96: https://archive.org/details/enemyattrafalgar00frasuoft/page/n119/mode/1up
- É. Desbrière, *La campagne maritime de 1805* (1907), annexes pp. 139, 154, 159, 178: https://archive.org/details/la-campagne-maritime-de-1805/page/n408/mode/1up
- W. H. Smyth, *The Sailor's Word-Book* (1867): https://archive.org/details/smythsailorswordbook ; FOTW, 1799 numeral flags: https://www.fotw.info/flags/xf~1799.html ; telegraph flag: https://www.fotw.info/flags/gb^traf.html ; firework colour: https://physicsworld.com/a/whizz-bang-science/ ; sidelights (1858): https://gazette.howison.co.nz/nzg/1858/issue/24/page/118 ; flashing lamps (1867): https://en.wikisource.org/wiki/Dictionary_of_National_Biography,_1901_supplement/Colomb,_Philip_Howard ; depths: https://rest.emodnet-bathymetry.eu/

**7. The Phoebe's course (missing-version, low).** The Sirius logged at 7 by her clock that "the Phoebe made all sail to the northward, firing guns" (NRS II 312); the draft keeps only "sails west" (R5's wording, from the Euryalus's 8 a.m. bearing, which is a bearing, not a course). Fix, a table row `| 7 (Sirius's clock) | Phoebe | makes all sail "to the northward, firing guns" | NRS II 312 (the Sirius's log) | Medium |`, and in "The ends": "From 7.20 the Phoebe makes sail (to the northward by the Sirius's log) and by 8 lies due west (true) of the Euryalus, a puff every three minutes of story time".

**8. "The last rests on one eyewitness" (factual-error, low).** The 9.30 arrival at the Victory is in Nelson's diary and Beatty, as the draft's own table says (High); only its form rests on Cumby. Fix: "The inshore links are timed in the Euryalus's log and signal log; the middle links are not logged; the last link, the Mars to the Victory at 9.30, is in Nelson's diary (Hudson 1917, p. 22) and Beatty (1807, p. 7), and only how it was made, the distant signal, rests on one eyewitness (Cumby 1899, p. 719)."

**9. Course after the 4 a.m. wear (missing-version, low).** Nelson wrote "to the NE"; Corbett (1910, p. 340) gives the Victory's log as N by E, with the wind WNW. Fix: "at 4 a.m. it wore again, to the NE by Nelson's diary (Hudson 1917, p. 24) but N by E by the Victory's log (Corbett 1910, p. 340), the wind WNW (Mars at 4, Dreadnought and Conqueror 4.20, Phoebe 4.30 by their clocks)."

**10. Distance holders (missing-version, low).** R2's statement names who holds 16 leagues and records Robinson's 20; the draft drops Robinson and leaves the 16 to the diary alone. Fix, after the first sentence of "Direction and length": "The noon letter ('E.S.E., 16 Leagues', Nicolas VII 132), Blackwood (16 leagues) and Browne ('east, 16 leagues', NRS II 194) agree; Corbett and Mahan round the distance to fifty miles, and Robinson's 'twenty leagues' (1858) is a late memory."

**11. Times on the 20th (missing-version, low).** Fix: "At 5 p.m. by the Victory (5.40 by the Euryalus, NRS II 149; 'a little before sunset' in Beatty 1807, p. 9) Nelson signalled that he relied on Blackwood to keep sight of the enemy, and the Naiad reported 31 sail NNE (at 5 in the original diary, Hudson 1917, p. 24, and in Beatty's appendix; 'shortly afterwards' in James; 6 p.m. in Nicolas VII 137, from a facsimile)."

**12. Course of the chase (factual-error, low).** E by S and SE by E by compass are about 80° and 103° true, i.e. E by N to E by S, not "east to ESE". Fix (row): "under all sail on the general chase: E by S, then SE by E by compass, about 80° then 103° true; the wind S by E, then WSW (the Téméraire's log, Corbett 1910, p. 333 n. 1)"; in "The ends": "the fleet makes sail, first about E by N, then about E by S true".

**13. Lantern figures (contradicts-adjudication, low).** R15 includes No. 8 among the figures. Fix: "Lantern figures replaced the guns near an enemy only for the signals drawn on p. 25: the fleet's manoeuvres, plus No. 8 (a ship has passed an enemy without taking possession); the look-outs' reports (Nos. 17, 21–29, 33, 35–37) kept their guns (research/scene-02/a-h3.md, R15)."

**14. Burn time (unsupported, low).** Smyth gives the half-minute-to-several-minutes burn and the light blue flame for the false fire; for the blue light he gives only "Bengal light" (R20). Fix: "False fires, a blue flame in a wooden tube, burned for half a minute to several minutes (Smyth 1867, the only definition found); blue lights, or Bengal lights, are taken to burn alike, with a bluish-white glare (inference from period compositions)."

**15. "Without blue lights" at 4 a.m. (unsupported, low).** No log says either way, and Corbett calls the blue lights Nelson's custom. Fix: "At 4 a.m. the same (the Africa saw gun flashes WSW at 4, NRS II 297); no log says whether the Victory burned blue lights then."

**16. Popham's telegraph (missing-version, low).** R28 is genuinely disputed and the draft names no holders; it also implies the code arrived only in September 1805. Fix: "**Popham's telegraph.** A diagonal red and white flag announced a message, one hoist per word or phrase from Popham's numbered vocabulary (1803). Issued to ships of the line from 1803; in September 1805 the Admiralty decided every ship, cruisers included, should carry it (Corbett 1910, pp. 298–301). High. Which half was red is disputed: Popham says only 'a diagonal red and white flag' (1803, p. 6), Perrin white and red, Wilson red over white and Kent white over red, and Barraclough found both in contemporary books (all via FOTW); invisible at chart scale."

**17. Wording of No. 370 (missing-version, low).** R24 gives two wordings. Fix (row 7.00): "No. 370, 'enemy's ships are coming out of port' (the NRS editor, from the 1799 book), 'or getting under weigh' in Cumby (1899, p. 719) and 'or getting under sail' in Corbett (1910, p. 333)".

**18. The enemy's wears in the night (missing-version, low).** Beatty (1807, p. 10) says the enemy wore twice in the night; the draft's "Which half of the code" omits it. Fix, add: "Beatty (1807, p. 10) has the enemy wearing twice in the night, which the French reports cited here do not mention."

**19. Evidence for night repeating (omission, low).** The two period statements that the frigates reported the enemy's tack and that the reports ran link by link are missing, though the chart section relies on them ("down to the Victory"). Fix, add to "What the logs record": "Nelson wrote that the frigates and look-out ships told him by signals which tack they were upon (Hudson 1917, p. 24), and Beatty that counted guns with false fires and blue lights reported each change and were repeated from the Euryalus to the Victory (1807, pp. 9–10)."

**20. Citations (unsupported, low).** "Strong colours coming only after 1811" has no source (Physics World; RSC); the flag colours come from FOTW's 1799 copy, not Perrin alone; "a line some six miles long" is Fraser 1906, p. 95, not Prigny, and "flares" is Lucas (Fraser 1906, p. 92). Fix: add "(Physics World; RSC)", "(Perrin 1922; FOTW, from a 1799 copy)", and "(stern and top lights and rockets: Prigny, Desbrière 1907, annexes p. 139; flares: Lucas, Fraser 1906, p. 92; six miles: Fraser 1906, p. 95)".

**21. Coloured fires (missing-version, low).** French officers remarked on the colour, even the variety of colours, of the British fires (Cornélie, Argus) and Lucas on "coloured fires"; the draft lists red or green fireworks as a later invention at High without recording them. Fix, add to "Night lights": "French observers remarked on the colour of the British fires (Cornélie, Argus; Lucas in Fraser 1906, p. 91); the likeliest reading is bluish blue lights against their own yellow lanterns and gold rockets (research/scene-02/h3-signals.md, 3.8)", and in "Later inventions" split: "red or green lights or lanterns (High); vivid red or green fireworks (Medium: before about 1811 colours were at best faded reds and yellows)".

**22. Variation (style, low).** "Compass bearings are about 20–21° west of true" is ambiguous. Fix: "Bearings in the logs are by compass; the variation was about 20–21° W, so true = compass − 20–21°."

**23. Confidence mismatches (other, low).** Table against structured data: Defence "Medium-low" against "low"; Mars "Medium-low" against "medium". Fix: medium-low for both in both places (H2-37f for the Defence; the Mars rests on a station, not a logged position).

**24. Night strength (other, low).** fleetRows: "24 with Nelson" while the Africa parted at 8 p.m. Fix: "27: the Defence, Colossus and Mars as links (memorandum of 20 October, Nicolas VII 136) and 24 with Nelson until 8 p.m.; the Africa missed the 8 p.m. wear and held on north out of touch (Corbett 1910, p. 340), leaving 23 in company for the rest of the night."

**25. Date line for the night (other, low).** dates[5] keeps "20 October 1805" until dawn, but the hailings (0.20–2 a.m.), the Mars's blue lights (2 and 3.20) and the wear (4 a.m.) fall on 21 October. Fix: "date line '20 October 1805' until midnight and '21 October 1805' after it, or '20–21 October 1805' for the whole night beat".

**26. Enemy track against heading (other, low).** The interpolated midnight point (36.30 N 6.35 W) and the dawn point (36.15 N 6.23 W) give a track of about 147° true, against the adjudicated night course of about 193° (H2-31g). Fix, add to the row's note: "The interpolated point and the dawn position imply a track of about 147° true against the signalled 193°: draw the track loosely and orient the glyphs to the course, not to the segment."

**27. "Counted guns" on the 19th (unsupported, low).** briefRows row 2 says the relay went "with counted guns"; counted guns with hoists are logged only on the 20th (NRS II 165, 167). Fix: "with guns (the Phoebe's three-minute guns; Walker's ship 'firing guns'); counted guns with each hoist are logged only on the 20th".

**28. Strength in this part (omission, low).** R7 is an `a-h3.md` ruling, but its counts appear only in the structured fleetRows; the prose gives "23–24 of the line" without the 27. The h2 draft states both fleets' strength, so a pointer is enough. Fix, add to "The chain as set": "Of the 27 of the line off Cádiz (research/scene-02/a-h3.md, R7; see 'Nelson off Cádiz'), 3–4 were links on the 19th and 23–24 lay with Nelson."

## Positions checked

Recomputed by plane sailing (variation 21° W) and sampled in EMODnet. None is on land or a shoal; the nearest land to any point is the San Sebastián islet, 4 nm from the Sirius and the Euryalus at dawn (the logs' own distances), and Las Puercas is 5.4 nm from both. No routes were supplied.

| Point | Draft | Recomputed from the source | Depth today | Verdict |
| --- | --- | --- | --- | --- |
| Sirius, first light | 36.475 N 6.367 W | Cádiz NE by E 4 mi: 36.474 N 6.365 W | 34 m | as the source |
| Euryalus, 5.30, 8 and noon | 36.467 N 6.350 W; 6.391 W at 8; 36.472 N 6.455 W at noon | 36.467 N 6.351 W; noon 36.472 N 6.456 W | 32, 41 and 50 m | as the source |
| Naiad, noon | 36.508 N 6.567 W | 12.1 nm from the light; 281° true from the Sirius (NW by W ≈ 283°) | 73 m | as the source |
| Phoebe, noon | 36.517 N 6.667 W | 279–280° true from the Sirius, within 4° of NW by W | 103 m | as the source (low) |
| Defence, 8 a.m. | 36.367 N 6.85 W | 255° true, 276° compass, 23 nm from the Euryalus; in H2-37f's band | 457 m | as the adjudication |
| Colossus | 36.467 N 6.967 W | not where H2-40c puts her | 517 m | issue 1 |
| Mars | 36.55 N 7.083 W | 15.4 nm east of the Victory; H2-40c 7.06–7.09 W | 546 m | as the adjudication |
| Victory, 9.30 | 36.583 N 7.40 W | 53 nm, 273° from Cádiz; Nelson's 16 leagues gives 36.556 N 7.293 W | 477 m | inside H2-20b (the noon fix is 2½ hours into the chase) |
| Phoebe, 8 p.m. | 36.40 N 6.583 W | light E by N 5 leagues: 36.395 N 6.580 W | 101 m | as the source |
| Enemy centre, midnight | 36.30 N 6.35 W | h2 §9.4 interpolation | 45 m | issue 26 |
| Euryalus, midnight | 36.333 N 6.40 W | enemy 129° true (SE by S compass), 3.1 nm | 51 m | as NRS II 149 |
| Sirius, midnight | 36.283 N 6.433 W | enemy 76° true (≈ E compass), 4.1 nm | 57 m | as NRS II 313 |
| British light, midnight | 36.25 N 6.45 W | 206° true, 5.5 nm from the Euryalus; 18.6 nm SSW of Cádiz | 73 m | as NRS II 149; near Desbrière's 20 miles SW (magnetic reading) |

## Also confirmed

- Times and sources: 6.04 telegraph in seven hoists, 7.00 No. 370, 7.20 to the Phoebe with No. 163 "West", 8.00 "firing three minute guns", 8.10 the Naiad (her own log's undated morning entry does not contradict R5), 9.30 by the Victory with Browne's 10 and Walker's "about nine", the 2½ h relay with its 2–3¼ h range, 5 p.m. against Nicolas's 6, 8 p.m. against James's 8.40, 4 a.m. against Beatty's 2 a.m., SE by S against SE by E: all as the adjudications and the pages.
- Weather at the fleet: "Wind Easterly", then "Wind at South" at the chase (Hudson 1917, p. 22) and very light airs mostly SSW (Beatty 1807, p. 7). Supported.
- Sun: declination −10.0°; sunrise about 6.26; 5.8° at 107° at 7.00; 31.7° at 135° at 9.30 local apparent time. Moonrise at about 5.20 a.m. matches `history-notes.md` (05:19).
- The memorandum of 20 October, the night code and the night chain read exactly as in Nicolas VII 136; the Sirius's "East six miles" at 11.30 is in Nicolas VII 134 n.; the Téméraire's courses E by S, then SE by E, are in Corbett 1910, p. 333 n. 1.
- Style: our own words; quotations are short period phrases (Nelson, Cumby, the logs, Corbett 1910); none from a modern source; every bullet has a bold lead-in and a confidence.
