# V-draft-h1: adversarial check of the chase draft for the "Scene 2" section

Draft checked: `D:/dev/trafalgar-1805/docs/research/scene-02/draft-h1.md` (99 lines), with its structured data, element [3] of `drafts-data.json` (8 brief rows, 20 fleet rows, 26 dates, 27 positions, 11 routes, 16 open doubts, 15 key sources, 3 owner questions).

Measured against `a-h1ac.md` and `a-h1b.md` (the final word), `v-h1a.md`, `v-h1b.md`, `v-h1c.md` and `h1-campaign.md`; `a-h2c.md` for the Cádiz berths; the brief's `<history>`, `<concept>` and `<beats>`; and the scene 1 sections of `docs/history-notes.md` ("The setting", "The fleets"). No file in the repository was changed.

## Verdict

The draft is sound in substance. These all agree with the adjudications and with the primary pages I reopened:
- every date on the date line (30 March, 9 April, 14 May, 4 June, 22 July, 20 August);
- every route label and glyph count;
- the Finisterre position, losses and caption figure;
- the conversions of Republican dates and Paris longitudes.

The gufm1 variations the draft uses match NOAA's 1805 model to a few tenths of a degree. Nelson's letter does say "true bearings" for the 8 p.m. Sicié fix.

**Stage A can be drawn as it stands.** All twenty points of the Toulon–Cádiz table are in open water. No straight segment and no stretch of the drawn curve touches Natural Earth's land. Apart from the berth in Toulon road, the line stays 2.1 nm or more from every cape and island: Cap Cépet 2.1, Punta Cires 2.4, the shore east of Cartagena 2.5, Cádiz's west shore 2.7–2.8, Las Puercas 3.2. Only wording and confidences need fixing (corrected table below).

The faults are elsewhere:
- **The Vigo legs (Stage B).** Natural Earth lacks the Cíes. The lines into and out of Vigo run across the rocks off the south end of the Illa de San Martiño.
- **Nelson's passage through the Azores.** Two statements contradict `a-h1b.md`.
- **Missing history.** The brief's "plan" is absent: the orders of 2 March, and the 16 July orders on which Villeneuve based his turn to Cádiz instead of the Channel.
- **One overstatement** about the British documents on the Strait.
- **Smaller matters.** Dropped variants, two misattributions and small wording slips.

Nothing contradicts scene 1's "The setting" or "The fleets". With the fixes below the draft can be merged.

## Method

- **Coastline.** Natural Earth 1:10m land and minor islands (`data/raw/natural-earth/`), read with my scripts in `scratchpad/scripts/`:
  - `landlib.js`: point in land, distance to coast, Mercator segments, and the centripetal Catmull–Rom curve copied from `src/components/chart/lines/Route.ts`;
  - `check_stageA.js`, `check_routes.js`, `capes_all.js`.
  - Results: `v-draft-h1-routes.txt` (copied into this folder).
  - Islands Natural Earth lacks were checked by hand. For the Cíes I used OpenStreetMap's coastline, fetched with Overpass into `scratchpad/dl/osm-cies/` and read with `osmcheck.js` and `vigo_fix.js` / `vigo_fix2.js`.
- **Variation.** NOAA NCEI declination service, historical model (GUFM1805, mid-1805): Toulon 19.8° W, south Sardinia 18.6° W, Cádiz 21.2° W, Cape St Vincent 21.6° W, west of São Miguel 21.2° W, the Finisterre action 24.0° W, Reille's noon of 15 August 24.0° W, Ushant 24.7° W; Martinique 2.8° E, Barbados 2.8° E, Antigua 2.3° E. https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
- **Primary pages reopened**, from fresh archive.org full texts (`scratchpad/dl/desb-txt`, `nic6-txt`, `james3-txt`; leaves checked against the scan's page-number file):
  - Nicolas VI 396–400: https://archive.org/details/dispatchesletter06nelsiala/page/n435/mode/1up and https://archive.org/details/dispatchesletter06nelsiala/page/n439/mode/1up
  - Desbrière 1907, pp. 4–9 (leaves n23–n28), 32–34 (n53–n55), 43 (n64), 57 (n78), 81 (n102), 101–102 (n124–n125), the staff map "Situation au 15 août" (n126, image) and 112 n. (n137).
  - James III 351, 353 (leaves n366, n368).

## Stage A: can the Toulon–Cádiz table be drawn as it stands?

**Yes.** Every point is at sea, and none crosses land or comes near a cape or island.

| Row | Distance from the coast | Nearest named feature |
| --- | --- | --- |
| 1 | 0.6 nm, a berth in Toulon's Grande Rade | |
| 2 | 2.3 nm | 3.0 nm from Cap Cépet |
| 3 | 29.7 nm | |
| 4 | 59.8 nm | |
| 5 | 60.3 nm | |
| 6 | 23.4 nm | 25 nm SE of Barcelona |
| 7 | 42.5 nm | |
| 8 | 21.9 nm | |
| 9 | 11.6 nm | |
| 10 | 18.2 nm | |
| 11 | 7.7 nm | |
| 12 | 4.7 nm | |
| 13 | 8.8 nm | 8.3 nm from Cabo de Gata |
| 14 | 12.9 nm | |
| 15 | 6.5 nm | 7.2 nm from both Europa Point and Punta Almina |
| 16 | 4.6 nm | 4.3 nm from Tarifa |
| 17 | 10.7 nm | |
| 18 | 4.3 nm | |
| 19 | 5.9–6.3 nm | |
| 20 | 2.9–3.0 nm | 3.1 nm west of Las Puercas, about 4.2 nm south of Rota |

Row 20 lies where `a-h2c.md` gives 12–16 m of water west of 6.31 W.

Straight segments:
- None crosses Natural Earth's land.
- The closest approaches are Cap Cépet 2.1 nm (segment 1–2), the shore east of Cartagena 3.4 nm (segment 11–12), Punta Cires 2.8 nm (segment 15–16) and the Cádiz west shore 2.7 nm (segment 19–20).

The drawn curve:
- It comes nearest at Cap Cépet 2.2, Punta Cires 2.4, the shore east of Cartagena 2.5 and San Sebastián 2.8.
- Tarifa 4.1, Cape Trafalgar 4.9, Europa Point 6.4, Cape Spartel 10.2, Las Puercas 3.2, Rota 4.2.

Islands Natural Earth lacks:
- Islas Hormigas 8.4 nm, Isla Grosa 13.4, Tabarca 18.4, the Columbretes 19.6.
- Isla Perejil (which Natural Earth has) 3.1. Alborán 5.4.

The draft's own figures in "How they are drawn" are right.

The corrected table changes no coordinate. It fixes:
- row 9's label;
- the time notes of rows 3 and 4;
- the confidence column, where rows 1, 2, 4, 8, 9, 10, 12 and 14 disagree with the draft's own text ("medium for each worked position"; "low for the 4–8 April longitudes").

Ready to paste:

| # | Point | Position | Time | Source | Confidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Toulon road, middle of the Grande Rade | 43°05.5′ N 5°59.4′ E | 30 Mar, weighed about 4 p.m. | Desbrière 1907, p. 7; berth est. | High (place), low (berth) |
| 2 | A league SE of Cap Sépet | 43°02.7′ N 6°00′ E | 30 Mar, about 7 p.m. | Atlas's log (Desbrière, p. 9), worked by compass with 19.8° W | Medium |
| 3 | Cape Sicié N by E 10 leagues | 42°33′ N 5°50′ E | 31 Mar, 8 a.m. (10 a.m. in Nelson's note to Ball) | Nicolas VI 398, 400; mean of the true and compass readings, 10 nm apart | Medium |
| 4 | Cape Sicié N by E (true) 20 leagues | 42°04′ N 5°36′ E | 31 Mar, 8 p.m. (sunset in the letters to Otway and Ball) | Nicolas VI 396, 398, 400 (the frigates' position, the fleet in sight) | High (the frigates'), medium (the fleet's) |
| 5 | Noon, open sea south of the Gulf of Lion | 41°39′ N 4°31′ E | 1 Apr | Atlas | High |
| 6 | Noon, about 25 nm SE of Barcelona | 41°04′ N 2°33′ E | 2 Apr | Atlas | High |
| 7 | Noon, east of the Columbretes | 40°00′ N 1°14′ E | 3 Apr | Atlas | High |
| 8 | Noon, between Ibiza and Cabo de la Nao | 38°59′ N 0°45′ E | 4 Apr | Atlas latitude; longitude est. | High (latitude), low (longitude) |
| 9 | Noon, about 15 nm ESE of Benidorm | 38°27′ N 0°10′ E | 5 Apr | Atlas latitude; longitude est. | High (latitude), low (longitude) |
| 10 | Noon, about 20 nm off the Mar Menor | 37°43′ N 0°20′ W | 6 Apr | Atlas latitude; longitude est. | High (latitude), low (longitude) |
| 11 | About 8 nm south of Cabo de Palos | 37°30′ N 0°38′ W | 6–7 Apr | est. | Low |
| 12 | Becalmed off Cartagena | 37°30′ N 1°00′ W | 7 Apr | Atlas latitude; Desbrière, p. 8; longitude est. | High (latitude), low (longitude) |
| 13 | About 8 nm south of Cabo de Gata | 36°35′ N 2°12′ W | night of 7–8 Apr | est. | Low |
| 14 | Noon, NE of Alborán Island | 36°05′ N 2°50′ W | 8 Apr | Atlas latitude; longitude est. | High (latitude), low (longitude) |
| 15 | Entering the Strait in two columns | 36°01′ N 5°15′ W | 9 Apr, about 9 a.m. | Desbrière, p. 9; position est. | Medium |
| 16 | Mid-Strait off Tarifa | 35°56′ N 5°35′ W | about 11 a.m. | est. (`a-h1ac.md`, H1-35e) | Low |
| 17 | West mouth, mid-channel | 36°00′ N 6°00′ W | early afternoon | est. | Low |
| 18 | Just past Cape Trafalgar, off Conil | 36°14′ N 6°11′ W | about 4 p.m. | `a-h1ac.md`, H1-35e | Low |
| 19 | In the offing of Cádiz | 36°25′ N 6°22′ W | evening | est., keeps the line about 3 nm off the shore | Low |
| 20 | Anchored outside the bay | 36°33′ N 6°22′ W | about 7.45 p.m. to 1.30–2 a.m. on 10 Apr | Desbrière, pp. 9, 26 n.; Corbett 1910, p. 68; position est. | High (times), low (position) |

Row 9 as printed, "about 20 nm off Benidorm", is wrong. The point is 14.3 nm from the Isla de Benidorm and 14.8 nm from the town, bearing 102–110° from them. It is 11.6 nm from the nearest coast, by Calpe.

## Issues, most severe first

| # | Where | Kind | Severity |
| --- | --- | --- | --- |
| 1 | Routes: "How they are drawn"; route data, Vigo legs | route-crosses-land | medium |
| 2 | Routes: "Nelson" ("north of the Azores") | contradicts-adjudication | medium |
| 3 | Nelson's pursuit: "Homeward" | contradicts-adjudication | medium |
| 4 | Missing: the plan, and the orders of 16 July | omission | medium |
| 5 | "The Strait, 9 April": "Every British document written at the time" | factual-error | medium |
| 6 | Stage A table: row 9 label, confidence column | other | low |
| 7 | "James's one-day shift": "dates from British reports … the gale 9 July" | factual-error | low |
| 8 | "The turn, 15 August": Desbrière's "16 août"; reading of Reille's bearing | missing-version | low |
| 9 | "20 August": the staff map's "19 Août" | missing-version | low |
| 10 | "Villeneuve's run home": citation | unsupported | low |
| 11 | Routes: "Vigo, A Coruña, and Ferrol to Cádiz": Reille's noon | other | low |
| 12 | "After": the British off Cádiz, Dragon and Goliath | omission | low |
| 13 | Dropped variants (ten bullets) | missing-version | low |
| 14 | "The action": James quotation | quotation | low |
| 15 | "the notes" (three places) | style | low |
| 16 | Small wording slips (nine) | factual-error | low |
| 17 | Data: allies-noon heading | other | low |

**1. The Vigo legs run across the rocks off the Illa de San Martiño (route-crosses-land, medium).**

The draft says the lines were set by hand against the Cíes, which Natural Earth lacks. They were not set clear of them.

On OpenStreetMap's coastline:
- In `villeneuve-return`, the straight segment 20→21 (42°10.8′ N 8°58.8′ W → 42°10.8′ N 8°52.8′ W) runs along 42°10.8′ N.
  - It crosses an islet at 42°10.8′ N 8°54.5′ W (way 638538031, place=islet).
  - It passes within 0.1 nm of two more rocks (ways 720479378 at 42°10.8′ N 8°54.6′ W, and 292616904 at 42°10.6′ N 8°54.4′ W).
  - These lie south of San Martiño (relation 9983656, 42°11.4′–12.4′ N).
- The drawn curve passes these rocks at 0.24 nm on the return leg. On `villeneuve-vigo-coruna` (points 3→4) it passes them at 0.02 nm.
- Point 21 (and point 3 of the outbound leg) is 0.8 nm off San Martiño.
- Point 22 (42°14.4′ N 8°48.0′ W) is 0.6 nm off the north shore of the ría.

Natural Earth also lacks Ons, Sálvora and the Sisargas, which the text's list leaves out. The A Coruña leg keeps clear of them: Sisargas 2.9 nm, Sálvora 4.4, Ons 6.0.

Fix, data:
- `villeneuve-return` points 20–22: {lon −8.98, lat 42.160, note "est., SW of the Cíes, south of the rocks off San Martiño"}, {lon −8.88, lat 42.170, note "est., the south mouth of the Ría de Vigo"}, {lon −8.80, lat 42.232, note "est., in the ría"}.
- `villeneuve-vigo-coruna` points 2–4: {lon −8.80, lat 42.232}, {lon −8.88, lat 42.170}, {lon −8.98, lat 42.160}, then on to 42°27′ N 9°07.2′ W as now.

Checked against OpenStreetMap, the straight segments then keep 0.6 nm and the curve 0.85 nm from every rock and shore in the mouth and the ría. The south mouth is about 2½ nm wide, so no line can keep 2 nm there.

Fix, text: "Natural Earth lacks the Cíes, Ons, Sálvora, the Sisargas, Toro, the Hormigas, the Columbretes and Diamond Rock, so the lines were set against them by hand, and at Vigo against OpenStreetMap's coastline: the Vigo legs use the south mouth of the ría, 0.6 nm or more from the rocks off the south end of the Illa de San Martiño. High for the check against Natural Earth, medium for the islands set by hand."

Evidence:
- Overpass, natural=coastline in 42.10–42.30 N, 8.80–9.05 W: https://www.openstreetmap.org/way/638538031 , https://www.openstreetmap.org/way/720479378 , https://www.openstreetmap.org/way/292616904 , https://www.openstreetmap.org/relation/9983656
- Scripts `osmcheck.js`, `vigo_fix2.js`.

**2. "North of the Azores" (contradicts-adjudication, medium).**

"Routes on the chart", Nelson, says "north of the Azores the 8 July log fix replaces the chart's mark". `a-h1b.md` (S3-HOMEROUTE) puts that fix between the central group and São Miguel, about 50 nm south of Terceira and 50 nm west of São Miguel. The draft's own "Homeward" bullet and its route note say "through the islands, north of São Miguel".

Fix: "…; among the Azores, between Terceira and São Miguel, the 8 July log fix replaces the chart's mark, and a control point at 37°58′ N 26°05′ W keeps the line about 3½ nm off São Miguel's north coast."

Evidence:
- `a-h1b.md`, S3-HOMEROUTE and evidence: "The fix lies between the island groups".
- Nicolas VI 468: https://archive.org/details/dispatchesletter06nelsiala/page/n507/mode/1up
- Curve check: 3.3–3.6 nm off São Miguel.

**3. "Not south of the islands as the notes had it" (contradicts-adjudication, medium).**

`a-h1b.md`'s final statement is: "south of the western and central Azores, then through the archipelago between Terceira and São Miguel… north of São Miguel on 8–9 July". The draft drops the first half and calls the notes wrong on it.

Fix: "**Homeward.** Thinking the allies bound for Cádiz or Toulon, he kept south of their track: south of the western and central Azores, then through the archipelago between Terceira and São Miguel, passing north of São Miguel on 8–9 July (log, Nicolas VI 468; Mahan). Villeneuve had gone north of the whole group, by Corvo. His frigates left on the way: the Decade and the sloop Martin on 19 June, the Amazon on 13 July, the Amphion on a day not recorded. He made Cape St Vincent on 17 July and anchored in Rosia Bay, Gibraltar, at 7.30 a.m. on 19 July (Mahan once has the 20th); ashore on the 20th, he noted it was his first time since June 1803 (Nicolas VI 471–475). High."

Evidence: `a-h1b.md`, S3-HOMEROUTE (ruling table); `h1-campaign.md` §3 (19 July, Mahan's 20th).

**4. The plan, and the orders that sent him to Cádiz (omission, medium).**

The brief's `<history>` heads this part "The plan and the chase" and says Villeneuve went south "instead of heading north for the Channel". The beat 2 caption opens "Napoleon's plan: …". The draft never says what the orders were.
- It has no word on the instructions of 2 March: Martinique, 40 days for Ganteaume, the united fleet back by Ushant to Boulogne.
- It has no word on Ganteaume's failure.
- On the July orders it has only "Napoleon's order of 16 July kept the French out of Ferrol". Villeneuve rested his choice of Cádiz on exactly those orders.

Fix, a new first bullet under "Toulon to the West Indies": "**The plan.** Napoleon's instructions of 2 March 1805 sent Villeneuve with his 11 of the line from Toulon to Cádiz, to collect the Aigle and the Spanish ships ready there, then to Martinique to wait 40 days for Ganteaume. Ganteaume was to come out of Brest with 21 of the line, take or drive off the squadron watching Ferrol, collect the French and Spanish ships there and cross to the West Indies; the united fleet, about 40 of the line with Missiessy's Rochefort squadron, was to return by Ushant and make straight for Boulogne. If Ganteaume did not come, Villeneuve was to land troops, cruise off the Canaries and go back to Cádiz (Desbrière 1907, pp. 4–5). Ganteaume never got out: he anchored off Bertheaume on 27 March, found the British in strength and went back into Brest, the day Villeneuve sailed by Desbrière's account (pp. 5–6). Decrès's instructions of 29 April, carried by the Didon, replaced the wait: take British islands, stay 35 days after Magon's arrival, then return to Ferrol (pp. 32–34). High."

Fix, a new bullet before "The turn, 15 August": "**His orders.** The Emperor's letter and Decrès's of 16 July, with Decrès's of 17 July (received at Ferrol only on 6 August), told Villeneuve, once he had Gourdon's ships, to free the Rochefort squadron and make France master of the Strait of Dover: by joining the Brest and Rochefort squadrons, or the Brest squadron alone, or by taking the Rochefort squadron round Ireland and Scotland. After a defeat, a separation or any change in the situation, he was allowed to go to Cádiz. The same orders kept the French ships out of Ferrol itself. His letter from Cádiz of 22 August rests the turn on that clause, and Decrès told Napoleon so (Desbrière 1907, pp. 81, 112 and n.). High."

Evidence:
- Desbrière p. 4: https://archive.org/details/la-campagne-maritime-de-1805/page/n23/mode/1up ; p. 5: …/page/n24/mode/1up ; p. 6: …/page/n25/mode/1up
- pp. 32–34: …/page/n53/mode/1up to …/page/n55/mode/1up
- p. 81: …/page/n102/mode/1up ; p. 112 n.: …/page/n137/mode/1up
- `h1-campaign.md` §2 ("wait 40 days for Ganteaume", pp. 28–29).

**5. "Every British document written at the time gives the 9th" (factual-error, medium).**

The same bullet goes on to cite Nelson's letter of 18 April. That is a British document written at the time, and it gives the 8th (Nicolas VI 408). `a-h1ac.md` (H1-05) says "written at or near the scene". The bullet also gives James's 8 April a different origin from the "James's one-day shift" bullet.

Fix: "…Every British document written at or near the scene gives the 9th: Orde's two letters of 10 April, Gardner's of 22 April, the Admiralty's order of 25 April and the Beagle's sighting off Cape Spartel; so do the American consuls at Cádiz and Lisbon. '8 April' goes back to a Ragusan's report that reached Nelson off Toro on 18 April, which he passed on to the Admiralty that day (Nicolas VI 408); Nicolas's chronology, Mahan (for Gibraltar) and Adkin carry it, and in James, copied by Clowes, it is also his one-day slip in converting the French dates. The scene uses 9 April. High."

Evidence: `a-h1ac.md` H1-05 and H1-02b; Nicolas VI 408: https://archive.org/details/dispatchesletter06nelsiala/page/n447/mode/1up

**6. Stage A table: label and confidences (other, low).**

The positions stand. The changes are:
- row 9 is mislabelled ("about 20 nm off Benidorm" for a point 14–15 nm ESE of it);
- rows 8, 9, 10, 12 and 14 are rated Medium, but the text calls their longitudes low;
- rows 2 and 4 are rated High, but the "Bearings" bullet rates each worked position medium, and row 4 is the frigates' position, not the fleet's;
- row 1 is rated Medium for a berth no source gives;
- the 10 a.m. and sunset times of Nelson's other letters are missing.

Fix: the corrected table in the Stage A section above.

Evidence:
- `check_stageA.js`: row 9 is 14.3 nm from the Isla de Benidorm and 11.6 nm from the nearest coast.
- Nicolas VI 398, 400: "At ten o'clock"; "At sunset, Cape Sicie bore N. b E., true, twenty leagues".
- Nicolas VI 396: "true bearings".

**7. James's "dates from British reports" and the gale of 9 July (factual-error, low).**

`a-h1ac.md` (H1-02b) calls these "other dates in his French narrative", not British reports. James's 9 July for the gale is his own conversion. He takes "le 21 messidor", the day the Moniteur letter says Villeneuve made Cape Finisterre, as "9th of July" (21 messidor is 10 July). He then puts the gale on that day. It matches Reille's 20 messidor (9 July) only by chance. `h1-campaign.md` says "which here coincides".

Fix: "…Other dates in his French narrative are right: the San Rafael at Martinique on 16 May, Diamond Rock 29 May to 2 June, Basse-Terre 6 June, the convoy 8 June, Corvo 30 June; his 9 July for the gale is his conversion of the Moniteur letter's '21 messidor' (10 July) and matches Reille's 20 messidor (9 July) only by chance (James III 351, 353). Two are two days early (Vigo reached 26 July for 28, out of Ferrol 11 August for 13), and his A Coruña on 1 August is tied to the British being blown off station that morning, so it is not simply his slip. No James date can be corrected mechanically (`research/scene-02/a-h1ac.md`, H1-02b). High."

Evidence:
- James III 351: https://archive.org/details/navalhistoryofgr03jameuoft/page/n366/mode/1up
- James III 353: https://archive.org/details/navalhistoryofgr03jameuoft/page/n368/mode/1up
- Desbrière p. 57 (Reille): https://archive.org/details/la-campagne-maritime-de-1805/page/n78/mode/1up

**8. The turn of 15 August (missing-version, low).**

Two points are missing from this bullet.
- Desbrière's narrative (p. 102) closes "cette journée décisive du 16 août" with the order to steer south at nightfall. It is a slip: the day it narrates is the 15th ("Il fit de même le 15", p. 101), and he prints the letter's "le 27 (15 août)" (p. 112 n.). The notes record it; the draft and the data's alternatives drop it.
- The draft works Reille's "40 leagues WNW" as a true bearing, against its own rule that worked positions say which reading they use. By compass, with 24° W, it is about 42°50′ N 12°00′ W, some 50 nm further south.

Fix: "**The turn, 15 August.** Still standing WNW against the north-east gale, Villeneuve turned for Cádiz 'à l'entrée de la nuit' on 15 August, the third day out (his letter of 22 August, Desbrière 1907, p. 112 n.); Desbrière's narrative once calls the 16th the decisive day (p. 102), a slip, since the day it describes is the 15th. Reille's noon put the fleet 40 leagues WNW of Finisterre (Corbett 1910, p. 263 n.): about 43°39′ N 11°48′ W if the bearing is true, about 42°50′ N 12°00′ W by compass; the Iris's fix of the 14th and Corbett's mean course due west from Ferrol favour the first. Villeneuve wrote 80 leagues, which Corbett shows to be impossible; Desbrière's staff map has the fleet near 44°40′ N 12°25′ W; James implies the evening of the 14th. The scene bends the line south at about 43°45′ N 12°20′ W. High for the date, low for the position."

Evidence:
- Desbrière pp. 101–102: https://archive.org/details/la-campagne-maritime-de-1805/page/n124/mode/1up , …/page/n125/mode/1up
- Desbrière p. 112 n.: …/page/n137/mode/1up
- NOAA GUFM1805 at 43.65 N 11.8 W: 24.0° W.

**9. The staff map's "19 Août" at Cádiz (missing-version, low).**

The draft cites Desbrière's staff map for "Cap St Vincent 18 Août". The same map sets "19 Août" in italic beside the six Spanish ships at Cádiz. The italic labels on that map are the track's dates. The label may mark the fleet's arrival, a variant of the date on the date line, or the ships' situation on that day. Either way the reading should be said.

Fix: append to "20 August": "Desbrière's staff map 'Situation au 15 août' sets '19 Août' beside the Spanish ships at Cádiz; read as the arrival, it is a day early against his own text (p. 107)."

Evidence: https://archive.org/details/la-campagne-maritime-de-1805/page/n126/mode/1up (image read); `v-h1c.md` H1-32 evidence.

**10. The NNE run home cited to the wrong page (unsupported, low).**

"(Reille, in Desbrière 1907, p. 57)" is given for "NNE to about 33–35° N (21–24 June), then ENE, north of the whole Azores group". Reille's passage on p. 57 starts on 2 July, at Corvo. The NNE course is on p. 43. The 33–35° N for 21–24 June is read off Corbett's chart (table D).

Fix: "From the turn the fleet stood NNE (Desbrière 1907, p. 43) to about 33–35° N on 21–24 June (Corbett's chart, after Desbrière's), then ENE, north of the whole Azores group, sighting Corvo on 2 July (Reille, in Desbrière 1907, p. 57)."

Evidence: Desbrière p. 43: https://archive.org/details/la-campagne-maritime-de-1805/page/n64/mode/1up ; p. 57: …/page/n78/mode/1up

**11. "Reille's noon of the 15th" is not on the drawn line (other, low).**

The text says table E uses one British fix and Reille's noon. The route data has no point there. Its own note says the line passes 12 nm north of Reille's noon.

Fix: "…then table E: one British fix (the Iris, 14 August), the rest estimated; Reille's noon of the 15th lies about 12 nm south of the line."

Evidence: `drafts-data.json` [3], routes[5] (`combined-ferrol-cadiz`), points 4–5 and note.

**12. The British off Cádiz: the Dragon and Goliath (omission, low).**

The two adjudications differ:
- `a-h1ac.md` S5-reinf rules "genuinely disputed": 26 or 32, with 26 holding "if Dragon and Goliath are not added".
- `a-h1b.md` S6-BRIT-CADIZ prefers 26.

The draft follows `a-h1b.md` and drops the caveat. If the Dragon and Goliath joined Calder on the way, as Desbrière has them, James's parts give 28.

Fix: "…giving about 26 of the line (James III 379), or 28 if the Dragon and Goliath, which Desbrière has joining Calder on the way, are counted; Desbrière's own total of 32 counts some ships twice (`research/scene-02/a-h1b.md`, S6-BRIT-CADIZ; `a-h1ac.md`, S5-reinf, leaves 26 against 32 open)."

Evidence: `a-h1ac.md` S5-reinf; `a-h1b.md` S6-BRIT-CADIZ; Corbett p. 267 ("eighteen of the line").

**13. Dropped variants (missing-version, low).**

Each line is ready to paste into its bullet:
- **Toulon, 30 March.** "…saw him at 8 a.m. on the 31st (10 a.m. in his note to Ball, Nicolas VI 400)…". The 8 p.m. fix is "sunset" in the letters to Otway and Ball.
- **Inside the Balearics.** "…past Cape de Gata in the night of 7–8 April; a neutral's report to the Leviathan has him off the cape on the 7th (James III 341)."
- **At Fort-de-France.** "On 4 June Rear-Admiral Magon joined at Fort-de-France … (Desbrière 1907, p. 36); James has the junction at sea, on the day the fleet sailed or the next."
- **North through the islands.** "…after a five-hour chase took 14 (James: all 15)."
- **Lagos and the bear-away.** "The sloop Martin, which Nelson had written on the 10th was going 'this day', parted ahead that afternoon by the log."
- **The Curieux.** "He reached Plymouth on 7 July and the Admiralty late on the 8th (Corbett) or by daylight on the 9th (Mahan, Desbrière), and Barham at once…"
- **North.** "Off Tarifa at about 3.30–4 a.m. on 25 July (3.30 by Mahan; 'four o'clock' in Nelson's letter to Collingwood)…"
- **23 and 24 July.** "…they lost sight of each other that evening (James III 363–365) or the next morning (Corbett 1910, p. 205); Mahan has the 26th."
- **To A Coruña.** "James and Mahan, and Corbett's narrative (p. 218), have him in on 1 August; Corbett dates the junction 2 August (p. 219)…"
- **Brief row "collects Spanish ships at Cádiz"** (data and lead). "A stop of about six hours on the night of 9–10 April (Corbett: 'less than four hours')…"

Evidence:
- Nicolas VI 398–400: https://archive.org/details/dispatchesletter06nelsiala/page/n437/mode/1up
- `v-h1a.md` H1-01, H1-11, H1-13; `a-h1b.md` S3-MARTIN, S3-TETUAN-JUL; `h1-campaign.md` §§1, 2, 4, 5.

**14. The James quotation in "The action" (quotation, low).**

"No ship could see much beyond her own length" (James III 361) is description. The exact wording is not evidence for anything.

Fix: "…in fog and smoke so thick that a ship could see little beyond her own length (James III 361)…"

Evidence: rule in the task and in `history-notes.md`: quote only where the wording is the evidence.

**15. "The notes" (style, low).**

Inside `history-notes.md`, "the notes" reads as the file itself. It appears three times:
- "The notes' '17 sailed together' is wrong";
- "not south of the islands as the notes had it" (removed by fix 3);
- "Changes from the notes".

Fix: "`research/scene-02/h1-campaign.md` (section 6) has '17 sailed together', which is wrong"; "Changes from `h1-campaign.md`:".

**16. Small slips (factual-error, low).**
- "Desbrière's '4.30' is an OCR error" → "Desbrière too prints 4.50; the notes' '4.30' was an OCR misreading" (`a-h1b.md` S3-BARBADOS).
- "His frigates left on the way: Decade and Martin" → "the Decade and the sloop Martin".
- "by his own later complaint, Rear-Admiral Donald Campbell…" → "by Campbell's own later complaint, Rear-Admiral Donald Campbell…". The complaint is Campbell's, not Nelson's (`a-h1b.md` S3-GIB-6MAY).
- "Off Grenada at noon on 9 June he heard" → "Off Grenada on 9 June he learned, from the Jason at 1 p.m.," (`h1-campaign.md` §3; Nicolas VI 452).
- "The Tetuan call of 22–25 July" → "of 22–23 July".
- "Reille's 'Pléiade' is a misreading" → "is an error" (`a-h1ac.md` H1-03).
- "Within about 300 miles of the coast west of Oporto" (Corbett). The drawn 12 July point, from Corbett's chart, is about 365 nm off the coast. Add "(about 365 nm on his chart)".
- "0.2–0.4 nm from the buoys" → "0.1–0.4 nm from the buoys". The line passes buoy No. 6 El Diamante (36.5562 N 6.2819 W, `a-h2c.md`) at 0.1 nm.
- "a row labelled N germinal gives the noon at the end of that day" → "a row labelled N germinal gives the noon position of N+1 germinal (the label is the day on which that noon-to-noon run began)".

**17. Allies' heading at noon on 22 July (other, low).**

Position `allies-noon` has headingTrue 100 for "steering ESE (by compass)". With the draft's 24° W, ESE by compass is 089° true; true ESE would be 112.5°.

Fix: headingTrue 89. Or, if ESE is taken as true, write "steering ESE" without "(by compass)".

Evidence: NOAA GUFM1805 at the action, 24.0° W; the draft's "Bearings" bullet.

## Checked and found sound

- **Dates on the date line and route labels.** All match `a-h1ac.md` "What changes on screen" and `a-h1b.md` "Scene impact": 30 March, 9 April, 9–10 April, 14 May, 4 June, 5 June, 8 June, 10 June (11 June recorded), 11 May, 13 June, 19 July, 22 July, 28 July, 2 August (1 August recorded), 13 August, 15 August, 20 August (21 and 17 recorded).
- **Glyph counts.** All match the rulings: 11, 6, 14, 17/18, 20, 10, 12, 11, 15, 20, 18, 15, 29, 3 (4), 29, about 26.
- **Republican dates and longitudes.** Every conversion recomputed (1 germinal XIII = 22 March; 27 thermidor = 15 August; 29 vendémiaire XIV = 21 October). Atlas longitudes: 2°11′ E Paris = 4°31′ E; 0°13′ E = 2°33′ E; 1°06′ W = 1°14′ E.
- **Worked positions.** Row 2: Sépet NW¼N, one league, with 19.8° W gives 43°02.6′ N 6°00′ E. Row 3: the true and compass readings differ by 10.3 nm, mean 42°33.5′ N 5°50.5′ E. Row 4: true N by E, 20 leagues, gives 42°04′ N 5°35.6′ E. The Phoebe point: Toro E¾N, 6 leagues, with 18.5° W gives 38°43.5′ N 8°04′ E.
- **Distances.** The Finisterre smoke is 113 nm on 292° from the cape. The 8 May drop is 55 nm south of the line. The 11 May jump is about 333 nm in a day.
- **Natural Earth claims.** Every route and position in the data is at sea on Natural Earth. The distances in "How they are drawn" reproduce: Cape Finisterre 6.7, Cape St Vincent 8.7, Diamond Rock 2.5–2.6, Tarifa 2.3–2.9, Europa Point and Punta Carnero under 2 nm only in the mouth of Gibraltar Bay. Within 2 nm of the coast only at anchorages and harbour approaches: Toulon road, Fort-de-France, Carlisle Bay, the Boca Grande, St George's, St John's, Tetuan, Gibraltar, Lagos, Vigo, A Coruña, Ares, the Cádiz channel, Dunnose and Spithead.
- **The Cádiz end of the Ferrol–Cádiz route** follows the fairway between Las Puercas and the El Diamante buoys to `a-h2c.md`'s outer-bay centre, 36°33.8′ N 6°16.3′ W. That is the same centre as `draft-h2.md`.
- **Scene 1 consistency.** "The setting" and "The fleets" are not contradicted: the variation off Cádiz, about 21° W, agrees (gufm1 21.2° W), and so do the ship's-time convention and the counts.
  - The Prince of Wales parted on 14 October, so Calder missed the battle; the British had 27.
  - The draft's 35 in Cádiz on 20 August (18 French, 17 Spanish) less the Terrible and San Fulgencio, which did not sail, gives scene 1's 33 (18 French, 15 Spanish).
