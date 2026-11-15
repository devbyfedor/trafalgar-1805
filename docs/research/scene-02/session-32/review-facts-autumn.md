# Review: facts and sources, Boulogne to the dawn (session 32)

An independent check of the draft `session-17/history-scene-02-wip.md` as it stands on branch `s23-history` after commit a970ab1. It covers "Boulogne and the invasion army", "The turn east and Ulm", "Nelson off Cádiz", "Orders, Rosily and the sortie", "Signals in 1805", "The signal chain, 19 to 21 October", "How the chart shows the signals" (the position tables), "Positions on the chart", the close-views table, and the army's line in "Routes on the chart" and licence 13. It also covers `session-32/army-march.md`. Reviewer only: the draft was not edited.

About 80 concrete claims were checked. Each was checked against the source text: Alombert and Colin I, II and III/1, Maude 1912, *Correspondance* XI, Berjaud's PDF, James III, NRS II, Nicolas VII, Corbett 1910, Desbrière 1907, Hubback 1906 and *Projets* IV. Positions and distances were recomputed by plane sailing. Claims I did not check are listed at the end as unchecked.

## Findings, most serious first

### 1. The head cannot both hold at the Rhine until 30 September and reach Bruchsal on the 27th (wrong: the line's data contradicts itself)

- **Where.** "Routes on the chart", "The army's march" says: "the head reaches the river at noon on the 26th and holds there to the 30th, while the corps crosses". Row 13 of the army table says "held to the 30th, when the 4th division crossed". Rows 14 and 15 of the same table date the head at Bruchsal on 27 September and at Heilbronn on the 29th. `army-march.md` has "held to the 30th if the line shows the whole corps crossing".
- **Evidence.** The 1st division crossed at 9 a.m. on the 27th. The advance guard was beyond Heidelsheim that day. The first two divisions were at Heilbronn on the 29th, and only the 4th division crossed on the 30th (A&C II 42–44).
- **Problem.** A line drawn by dates cannot keep its head at Rheinhausen until the 30th and also have it at Bruchsal on the 27th.
- **Fix.** Pick one reading:
  - (a) The head goes on. Rheinhausen on 26 September, Bruchsal on the 27th, Heilbronn on the 29th. "26–30 September" is a label for the corps' crossing span only, not a hold. This is the better-supported reading, and it is the head the rest of the line follows.
  - (b) The line holds at the Rhine until the 30th. Then it drops the dated Bruchsal and Eppingen points and reaches Heilbronn on 1 October, when the whole corps was there (A&C II 44).
- Say which reading the line uses in both the draft and `army-march.md`.

### 2. Ney's corps did march the left bank from Höchstädt by Dillingen toward Günzburg (wrong)

- **Where.** "The dashed line" says the left bank by Dillingen is "a joining stretch that no corps marched", and that Ney "had come down to the Danube by Heidenheim and Giengen, not by Donauwörth". "Routes on the chart" repeats this. Licence 13 says "where no corps marched". `army-march.md` says Ney "reached the Danube from Heidenheim and Giengen" and that "no one corps marched from Donauwörth to Günzburg".
- **Evidence.**
  - Maude 1912, p. 200: on 7 October Ney should have halted at Giengen, but the order apparently never reached him. He arrived at Höchstädt that evening, with Dupont's division at Diesenhofen.
  - A&C III/1 20–21: Berthier's order of the 8th was to reach Ney "at Höchstädt" by 9 a.m. at the latest. Höchstädt is 17 km from Donauwörth by the main road. That afternoon Ney's corps moved west and north-west. The 59th of Malher's division held Gundelfingen, with companies at Lauingen and Dillingen, and a regiment of dragoons was at Dillingen.
  - A&C III/1 34: on the 9th Labassée's column (the 59th) marched from Gundelfingen and crossed the Danube below Günzburg.
  - Maude 210: Malher went to Günzburg on the 9th.
  - Against Maude: A&C II 61 says Ney held at Giengen on the 6th and was ordered on the morning of the 7th to stay there. The two accounts differ on the 7th but agree that Ney's corps was at Höchstädt by the morning of the 8th.
- **Problem.** Only about 17 km of the stretch, Donauwörth to Höchstädt, was off Ney's road. From Höchstädt by Dillingen and Lauingen to Günzburg, the line follows ground that Ney's corps occupied and marched along on 8–9 October.
- **Fix.** Reword all three places. For example: "Ney's VI corps came down from Heidenheim and Giengen and reached the Danube at Höchstädt, 17 km above Donauwörth, on 7–8 October (Maude 200; A&C III/1 20). It spread west along the left bank by Dillingen, Lauingen and Gundelfingen on the 8th, and Malher took Günzburg on the 9th (A&C III/1 20–21, 34). Only the short stretch from Donauwörth to Höchstädt joins the two corps' roads." Record the conflict over the 7th (A&C II 61 against Maude 200). Add Höchstädt (about 48.611 N, 10.566 E, present-day centre) as the line's changeover point if the lead wants the composite exact.

### 3. "Its Heilbronn–Nördlingen chord missed Hall and Ellwangen by about 20 km" (wrong)

- **Where.** "Routes on the chart", "The army's march", on the lab's first sketch.
- **Evidence.** The lab's sketch (`src/app/lab/chart/demos/tracks.ts`, ARMY) runs from Heilbronn (9.22 E, 49.14 N) to Nördlingen (10.49 E, 48.85 N). By plane sailing, Hall lies about 9 km north of that chord and Ellwangen about 3 km north of it.
- **Confirmed.** The Boulogne–Metz figures are right: Douai 15.5 km, Avesnes 20.7 km (both north) and Verdun 23.3 km (south).
- **Fix.** Write "about 9 km at Hall and 3 km at Ellwangen", or drop the clause.

### 4. The third small sail called "most likely a merchant prize" (unsupported: a silent pick)

- **Where.** "Not on screen in the two fleet views", "The last frame".
- **Evidence.** "Open doubts" in the same draft gives two readings and rates the identity low:
  - a ship of the line misjudged at a distance (the Hermione's total), or
  - the merchant brig the Agamemnon detained.
- The check in `session-17/small-craft.md` withdrew the earlier dismissal and left the question to the owner ("What the check changed").
- **Fix.** "A third small sail that some observers counted with the British at dawn is contested. Its identity is unknown: a misjudged ship of the line, or the merchant brig the Agamemnon had detained (see 'Open doubts'). It was no warship of the fleet, and it is not drawn."

### 5. The Observateur drawn by the Bucentaure, against licence 10's rule (unsupported: inconsistent)

- **Where.** "What the chart draws, October" puts "the Furet and the Observateur by the Bucentaure". Licence 10 says "each brig by her admiral's flagship". "Frigates and brigs at anchor" puts the Observateur with Dumanoir's squadron, abreast the Rayo.
- **Evidence.** The line of battle of 6 October (Desbrière, annexes 124) puts the Observateur in Dumanoir's squadron, abreast the Rayo. The Cornélie is by the Formidable there. Dumanoir's flagship was the Formidable, not the Bucentaure.
- **Fix.** Either draw her by the Formidable, or reword licence 10. For example: "the Furet and the Observateur by Villeneuve's flagship, the Argus by Gravina's; the Observateur's station in the line of 6 October was with Dumanoir's squadron, abreast the Rayo".

### 6. "North-east by Saint-Omer … to Cambrai" (wrong as a direction)

- **Where.** "To the Rhine" and `army-march.md`, verdict item 1.
- **Evidence.** From Boulogne the road runs about due east to Saint-Omer (50.73 N to 50.75 N), then south-east by Aire, Béthune, Lens and Douai to Cambrai. Boulogne to Cambrai bears about 118° true. The road bows north of the straight line to Metz, which is presumably what was meant.
- **Fix.** "East to Saint-Omer, then south-east by Aire, Béthune, Lens and Douai to Cambrai, well north of the straight line to Metz."

### 7. "At noon on 26 September the advance guard went over" (unsupported precision)

- **Where.** "To the Rhine", the army table row 13 and `army-march.md`.
- **Evidence.**
  - Soult's letter written at Speyer that morning says he *will* send the 10th light infantry and the 26th chasseurs over at noon (A&C II 507–508).
  - A&C II 42 says only that the advance guard crossed "dès le 26", by ferries and boats.
  - The chief of staff's positions for 4 vendémiaire put it in front of Rheinhausen that day (II 508 n.).
- **Problem.** The day is documented. The hour is Soult's plan.
- **Fix.** "Over by ferry on the 26th, at noon as Soult planned that morning". Keep the line's hour at noon as a convention.

### 8. Leaving Metz on 18 September rated "High" (confidence overstated)

- **Where.** "Routes on the chart" ("Shifted, they fall exactly on the two dates period documents fix … leaving Metz on the 18th"), row 10 ("High (leaving)") and `army-march.md` row 18.
- **Evidence.** A&C I 415 is the *order* of movement for the 1st division, not a report that it left. The match is still good:
  - the 4th division kept its own order to the day (Berjaud against A&C I 416);
  - A&C I 436–437 has the artillery convoy that marched with the 2nd division due at Metz on 18 September, two days behind the derived arrival of the 1st division.
- **Fix.** "As ordered (A&C I 415); medium-high", with A&C I 436–437 cited as corroboration.

### 9. "The ports": James gives where each corps was to embark, not where it lay (unsupported reading)

- **Where.** "Ney's corps lay at Étaples and Montreuil … Davout's corps at Ambleteuse and the reserve at Calais (James III 325–326)".
- **Evidence.**
  - James III 325–326 says which flotilla division, in which port, was to carry which troops.
  - His Calais division was a reserve *of the flotilla*. It was to carry the Italian division and dragoons, not the army's reserve.
  - Napoleon's order of 26 August (No. 9137) does confirm camps at Ambleteuse, Boulogne and Étaples for the right, centre and left corps.
  - The preceding bullet's "Davout's corps (the camp of Bruges)" is the administrative name (*Projets* IV). The two bullets read as if they disagree.
- **Fix.** Cite No. 9137 for the camps of August 1805. Give James's assignments as embarkation ports. Write "the reserve division of the flotilla at Calais, to carry the Italian division and dragoons". Add one clause: Davout's corps, the camp of Bruges, was camped at Ambleteuse in August 1805.

### 10. Small citation gaps (style)

- "Oudinot's grenadiers marched on 26 August" cites none of the pages that say so. The source is the order of 25 August, which has them leave Wimereux on 8 fructidor (26 August), and the report that they left that morning (A&C I 277, 283–284). No. 9155 also has the grenadiers gone by the 28th.
- In the relay table, the Weazle's parting could cite the Euryalus's signal log, where the parting signal to the Weazle was made at 8.40 (NRS II 160–161, as transcribed in `a-h3.md`, R5). Next to it, the Sirius's log has both small craft part company "at 9".

## Checked and confirmed (selection)

**The army's march, Boulogne to the Rhine**

- **Stages across France.**
  - Saint-Hilaire's division passed Mézières on 22 fructidor (9 September) and left on the 24th (A&C II 75, the register). Suchet was at Cambrai on the 21st, with a review on the 22nd. Legrand was at Landrecies on the 21st (II 74–75).
  - Suchet wrote from Avesnes on 24 fructidor (II 72), and Legrand from Mézières on the 26th (II 73).
  - Klein was at Hirson on the 16th, Stenay on the 21st and Mars-la-Tour on the 24th (II 70–71). He left Saint-Omer on 8 fructidor by Aire, Béthune, Lens and Douai to Cambrai (I 284).
  - The 4th corps complained of its welcome at Hirson (II 4 n. 3). The bad roads, the bread and the Verdun meat contract are on II 5.
- **Metz to the Rhine.**
  - The 1st division's itinerary from Metz, leaving on the 1st complementary day (18 September), through Courcelles … Lembach and Wissembourg to Germersheim, is on I 415. Germersheim on 24 September is on I 421. The 4th division left Metz on 1 vendémiaire and reached Wissembourg on 28 September (I 416, 421).
  - The change of 30 August is on I 220–221: Soult's divisions in a square at Germersheim, Lauterbourg, Bergzabern and Wissembourg, and the Bitche–Wissembourg road to be repaired.
- **The orders to march.**
  - Berthier on 27 August: the first divisions "partent demain matin, 10", the seconds on the 12th and the thirds on the 13th. The centre-road convoy was to join at Saint-Omer (I 373).
  - No. 9137: 24 days to the Rhine; the left, middle and right roads; nineteen battalions left behind; the flotilla brought to Boulogne; its seamen armed.
  - No. 9155: the grenadiers and the first divisions had gone by the 28th.
- **The derived dates.**
  - Berjaud: Suchet's division left the Boulogne camp at 5 a.m. on 2 September. The 40th's nights run Surques … Charleville (the 14th) … Metz (the 21st), exactly as tabled.
  - Shifted five days, they fit both fixed dates. Legrand fits with two days.
  - A&C I 436–437 (the artillery convoys due at Metz) is consistent with arrival there on the 16th.

**The Rhine to Ulm**

- **The Rhine crossings.**
  - Soult's letter of 26 September: Rheinhausen, where the river is narrower and his boats would suffice; the 10th light infantry and the 26th chasseurs; Bruchsal and Eppingen, to keep clear of Davout (II 507–508).
  - The bridge was laid in the night of 26–27 September. The 1st division crossed at 9 a.m., the 2nd at noon, the 3rd the next day and the 4th on the 30th (II 42).
  - Lannes and Murat crossed at Kehl on the 25th (II 39–40). Davout crossed at Mannheim between the night of 25–26 and the 29th. Ney crossed on the 27th "entre Pforz et Durlach", A&C's own words (II 41–42).
- **The Rhine to the Danube.**
  - On the 27th the advance guard was beyond Heidelsheim, and the order of the 27th named Wiesloch and Sinsheim. On the 28th the corps lay between Eppingen and Bruchsal. Two divisions reached Heilbronn on the 29th and the whole corps on 1 October (II 43–44).
  - Öhringen on 2 October (II 638). Hall on the 3rd, with Rosenberg ordered for the 4th (II 685).
  - Ellwangen was entered at 6 a.m. on 5 October, an hour after 300 uhlans left (II 813).
  - Soult's report of 7 October: Möttingen, Harburg, Ebermergen, and Donauwörth taken in the night, with the bridge cut. The 1st division went from Abtsgmünd to Bopfingen (II 867–868).
  - Maude 199: Donauwörth about 8 p.m. on the 6th.
- **Günzburg to the Michelsberg.**
  - Günzburg on the evening of 9 October (Maude 176–177; A&C III/1 34–35).
  - Elchingen at 8 a.m. on 14 October, with Loison leading, ten hours of fighting (Maude 231–233).
  - The Michelsberg about 3 p.m. on the 15th, by Ney and part of Suchet's division (Maude 241).
- **Ulm.**
  - The capitulation was signed at noon on the 17th, with relief allowed until the 25th inclusive. The eyewitness has Berthier arrive at 2 (A&C III/1 225).
  - On the 18th the Stuttgart gate was taken over at 10 a.m. by Labassée's brigade; the eyewitness has the porte Neuve at 9 (III/1 226).
  - The convention was signed at Ober-Elchingen on the 19th (III/1 227).
  - On the 20th the garrison marched out at 2 p.m. by the Frauentor, Napoleon on a rise at the foot of the Michelsberg (III/1 228). The 7th Bulletin had announced 3 p.m., 27,000 men and 18 generals. The 8th Bulletin has Napoleon there from 2 to 7 p.m., with 30,000 men and 16 generals.
  - Prisoners 25,365; 40 colours, 63 guns, 2 howitzers (III/1 229). The muskets read 13,600 in the OCR of a second scan of the volume (archive.org, alombert-la-campagne-de-1805-en-allemagne-v-3-pt-1). The Gallica-derived text reads 43,600. This supports the draft's page-image reading.
- **Bulletins and letters.**
  - 1st Bulletin (No. 9348): Soult crossed "à Spire" on the 4th (26 September) and Lannes and Murat at Kehl on the 3rd. Soult's road is given as Öhringen, Hall, Gaildorf, Abtsgmünd and Aalen.
  - No. 9117: "Mon parti est pris"; 200,000 men in Germany by 1 vendémiaire.
  - No. 9120: misprinted "23 mai"; the Cádiz condition; "à une autre année".
  - James III 332: Berthier to Marmont on the 22nd, with the Channel condition; Napoleon leaving on 4 September; 30,000–40,000 men kept on the heights.
  - No. 9177: Napoleon "part dans une heure" on 2 September.
  - No. 9209: dated 13 September by the editors; fifteen days' command of the sea; 150,000 men and 10,000 horses.
- **Maude's background figures.** Russia approached Austria in October 1803. The courier left Vienna on 7 July. The treaty was signed on 9 August. "400 miles from the coast to the Rhine".
- **Projets IV.** 147,662 men (142,601 combatants), 15,764 horses, 2,054 craft with room for 127,500 men and 9,975 horses. The four camps sum to 147,662. One OCR line misreads 147,622.
- **James III 325–326 and App. 27.** 1,104 craft at Boulogne and 2,293 in all (1,339 armed, 954 unarmed). Napoleon at Boulogne on 3 August, with the army embarked twice. 163,645 men, 16,783 of them seamen, and 9,059 horses in App. 27. The narrative's OCR reads 163,045.
- **The line's geometry.**
  - The thin set has 22 of the 40 points.
  - Offsets of the points left out: Germersheim 0.8 km, Öhringen 8.4 km, Stenay 4.6 km, Dillingen 0.8 km. Every other left-out point is under 5 km.
  - The stages sum to 590 km (367 miles) from Boulogne to Rheinhausen.
  - All 22 conversions from decimal degrees to degrees and minutes in the draft's table are correct.

**The chain and the signals**

- **The logs of 19 October.**
  - Euryalus: the Phoebe dispatched at 7.20; at 8 a.m. 19 under way, the Defence in sight from the masthead to the west, the Phoebe WNW "firing three minute guns"; the Naiad at 8.10; the telegraph to the Weazle; the Pickle's orders at 9; at noon the Weazle and Pickle SSE, latitude 36°28′ N (NRS II 145–146).
  - Sirius: at 4, Cádiz NE by E, 4 miles; at 7 the Phoebe "made all sail to the northward, firing guns"; at 9 the Weazle and Pickle parted company (NRS II 312).
  - Naiad: at noon eleven of the line outside, the light 11–12 miles off (NRS II 302).
  - Walker: "about nine"; 26 ships under all sail within a quarter of an hour (NRS II 322–323).
- **Corbett.**
  - p. 333 n. 1: the single flag with two guns and the SE compass flag; the Téméraire's courses E by S, then SE by E, on winds S by E, then WSW.
  - p. 334 n.: the advance squadron; Codrington's four ships.
  - p. 340: the 8 p.m. wear by No. 31, with blue lights; the Africa holding on north; the 4 a.m. wear N by E.
- **Nelson's own papers.**
  - Diary of 19 October: six ships ahead with lights (Mars, Orion, Belleisle, Leviathan, Bellerophon, Polyphemus), as the draft has.
  - Memorandum of 20 October: the night chain and the night code, word for word as the draft gives them (Nicolas VII 136).
  - Orders of 4 October: Duff "from three to four leagues between the Fleet and Cadiz"; to Blackwood, four leagues east and "as near as possible in the latitude".
  - Diary of 14 October and the order to Hope of 15 October: Defence and Agamemnon 7–10 leagues west of Cádiz, Mars and Colossus five leagues east of the fleet.
  - Guns every three minutes, and rockets from the masthead at night (Nicolas VII 110–111).
- **The night of 20–21 October.**
  - Mars: hailed by the Phoebe at 1.25; blue lights NE at 2 and ENE at 3.20; the Victory WSW, 3–4 miles, at 4.
  - Phoebe: spoke the Mars at 12.20; at 8 p.m. the Cádiz light E by N, five leagues.
  - Naiad and Colossus: hailing at 1.30 by the Naiad, 2 by the Colossus.
  - Pickle, 20–21 October: from 5.40 p.m. repeating the Sirius's signals to the fleet; hove to at 1.30 a.m.; wore toward the enemy at 5. Entreprenante: 35 sail (NRS II 245, 265, 303, 306, 317–320).
- **Recomputed sun and positions.**
  - Sun: about 6° at 107° at 7.00, 32° at 135° at 9.30, 37° at 147° at 10.15; sunrise 6.26 local apparent time.
  - Positions: Sirius at 4 a.m.; Euryalus at 5.30 and at noon; Naiad and Phoebe at noon; Phoebe at 8 p.m.; Euryalus and Sirius at midnight; the combined fleet at nightfall (both readings).
  - Distances: Defence–Mars gap 15.7 nm; the Defence 27 nm out; the frigates within 17 nm.
  - The `CHAIN` coordinates in `movements.ts` match the table.

**The sortie and the fleets**

- **Louis's detachment.**
  - The Victory's log: "October 3rd. P.M. at 6, Queen, Canopus, Spencer, Zealous, Tigre, and Endymion, parted". Nelson's "six Sail of the Line" (Nicolas VII 63 and n.).
  - Austen: five merchant vessels; back with the fleet on the morning of the 5th; Gibraltar on the 9th; on the 18th, five of the line and three frigates (Hubback 148–149, 152).
- **Nelson's arrival.** Victory's log of 28 September: 23 sail of the line and six inshore. At 8 p.m. the light bore E by N, 5–6 leagues. That works to 36°23′ N 6°36′ W, as the draft says.
- **The sortie.**
  - Philibert: the seven and the two frigates. His 4 p.m. bearings work to 36°33.1′ N 6°22.1′ W.
  - The Rhin's noon bearings work to 36°33.7′ N 6°18.1′ W. The Argus at 11 a.m. on the 20th, by compass and true, both match.
  - The Argus's report: topsails up at 6; the Observateur's order at 8.30; 17 under sail at 9; on the 20th she waited for the Rayo (annexes 268).
  - Croizé's letter: the brig kept back and her seamen taken; Desbrière heads it "corvette" (annexes 158).
  - The council of war of 8 October had fourteen signatures, including Hore.
- **Ships not on screen.** Every point agrees with `anchorage-19oct.md` (3.1–3.7) and `small-craft.md` (the third sail apart, finding 4): the Terrible, the San Fulgencio, the two worthless ships, the Flora and the corvettes, the schooner Téméraire, the gunboats.
- **Distances and hull counts.** The Fougueux lies 3.0 nm SSE of the main group. The Africa is 13 nm north of the Victory. The Observateur is 25 nm north of the combined fleet. The hull counts in the close-views table add up: 40, 41, 72 and 73.

## Unchecked

- The georeferencing of Faden's 1797 plan, EMODnet depths and every distance to Natural Earth's coastline.
- Corr. IX (No. 7832), *Projets* III 184, Desbrière 1907 pp. 110, 120, 125, 141–149 and annexes 68–73, 84–86, 98–102 and 117–118, apart from the annex pages named above.
- Rosily's journey, the Fraser and Beatty page references, Hudson's diary transcription, the night-signal rules of the 1799 book, Perrin, FOTW and Cumby. These were taken from `a-h3.md` and not re-opened.
- The moonrise at 5.20 a.m. on 21 October. A rough lunation count puts the Moon about 27½ days old: a thin waning crescent rising before the Sun, which is consistent, but the hour was not computed.
- Thiébault II 128. The Weazle's class and commander. The camp positions at Boulogne in `boulogne.ts`.

## For the lead (files the reviewer may not touch)

- The army line's data must settle finding 1 (whether the head holds at the Rhine or goes on) before the dated labels are drawn.
- Finding 2 suggests a changeover point at Höchstädt, 17 km above Donauwörth, if the composite is to follow Ney's own road from there.
- Nothing here needs a change in `docs/decisions.md` or `docs/progress.md`. Finding 5 may need one line in decisions.md if the Observateur's anchorage place is kept by the Bucentaure as a deliberate licence.
