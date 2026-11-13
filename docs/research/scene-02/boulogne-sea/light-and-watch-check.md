# Check of `light-and-watch.md` (Boulogne from the sea: light, weather and the British watch)

An independent, adversarial check of `docs/research/scene-02/boulogne-sea/light-and-watch.md` (as committed in 1b74a17). Every claim the painter or the history notes would rely on was traced to its source or recomputed by a different method. The confidence scale is the one at the top of `docs/history-notes.md`. Verdicts: **confirmed**, **corrected** (right in substance, a detail wrong), **unsupported** (no evidence found either way), **refuted**.

Status: in progress (session 24 helper, check of light and watch).

## What the painter must change or know

(to be filled)

## 1. Method of this check

- **Sources.** Every claim that the painter or the history notes would use was looked up at the cited page: Desbrière III and IV, James III, Napoleon's *Correspondance* IX and XI, the *Naval Chronicle* XIV and Norie (1805) in the archive.org texts, with the page images where the OCR was doubtful (Desbrière III 142, the footnote with the tide scale; Norie p. 248; the Royal Society journal pp. 16–17). The Keith Papers were read in the historyofwar.org transcriptions, Marshall on Wikisource, and the Météo-France sheet, the Ifremer climatology and Bianchi's abstract at their URLs. The note's archive.org leaf links were spot-checked: James n243 = p. 228, Corr. XI n113 = p. 104, NC XIV n87 = p. 68 and n510 = p. 481, Desbrière III n158–n159 = pp. 141–142. All were right.
- **Sun and moon** were recomputed from NASA/JPL Horizons (the DE441 ephemeris). I used observer tables at 2-minute steps for 50.727 N 1.588 E, airless and with Horizons' refraction, and geocentric ecliptic longitudes for the phases. This is a third ephemeris, independent of the note's NOAA/Meeus algorithm, Astronomy Engine and the USNO. The conventions are the note's: sunset and moonrise for the upper limb with 34′ of refraction, and local apparent time (LAT) taken from Horizons' local apparent solar time.
- **Tide** was recomputed by a different method: a full harmonic prediction from the published constants of the Boulogne tide gauge. These are 40 constituents, among them N2, K2 and the shallow-water M4, MS4, MN4 and M6, from TICON-3 (Hart-Davis, Dettmering and Seitz 2022, analysed from the GESLA-3 records of 1941–2020). The nodal factors and astronomical arguments were computed for 1805 (Schureman's formulas, Meeus's mean elements).
  - Before using the predictor I tested it against the official SHOM predictions for Boulogne for 13–19 November 2026, as maree.info publishes them. For 27 high and low waters it agreed within −21 to +2 minutes (mean −6 min) and −0.22 to +0.28 m (mean bias 0.00 m), with the mean level at 4.97 m above the zero. That is Desbrière's (8.90 + 1.04)/2.
  - As a check against the period, the same kind of prediction for the full- and new-moon days of July–August 1805 gives high water at Dieppe at 10:11–10:59, at Calais at 11:18–11:47 and at Dover at 10:52–11:32 LAT. That agrees with Norie's establishments of 10 h 30 m, 11 h 30 m and "about 11 h". Brest gives 03:03–03:46 against Norie's 3 h 45 m.
- **Skyline.** I computed bare-ground elevation angles from the IGN RGE ALTI terrain model (Géoplateforme altimetry service), with profiles every 60 m out to 8 km, an eye 3 m above the water and refraction k = 0.13. Modern harbour works within 1.2 km of the camera were ignored.
- **Two viewpoints** are used. One is the note's sample point, 50.727 N 1.555 E, about 2.3 km off. The other is the painter's present one, about 700 m west of the 1805 jetty heads, taken as **50.730 N 1.584 E**. That rests on the jetty heads at about 50.730 N 1.594 E inferred in `town-and-defences.md`, uncertain by 200–300 m.
- My scripts and downloads stay in a scratch folder outside the repository. The steps are given here so they can be repeated.

## 2. Sun and twilight

All recomputed from Horizons.

- **Sunset (upper limb) 19:37 / 19:17 / 18:54 LAT on 3 / 15 / 28 August, and 19:36 / 19:15 / 18:48 UT: confirmed.** Horizons gives 19:36:48, 19:17:02 and 18:53:47 LAT, or 19:36:13, 19:14:49 and 18:48:25 UT. With Horizons' own refraction model the times are 21–24 s later. High.
- **Sunset azimuths 299.5° / 293.7° / 286.5°: confirmed** (299.55°, 293.67°, 286.51°). High.
- **Equation of time −5.8 / −4.2 / −1.0 min, and LMT = UT + 6.4 min: confirmed** (−5.78, −4.13 and −0.98 min at sunset; 6.35 min). High.
- **Apparent noon at 11:59 / 11:58 / 11:55 UT, with the sun 56.9° / 53.4° / 49.1° high: confirmed.** High.
- **The table of positions 90, 60, 45, 30 and 15 minutes before sunset (note 1.2): confirmed.** Every azimuth and altitude agrees to 0.1°. High.
- **The ends of civil, nautical and astronomical twilight: confirmed** (20:16 / 19:54 / 19:28, 21:07 / 20:40 / 20:11 and 22:15 / 21:36 / 20:59 LAT). High.
- **The anti-solar point at sunset, 119.5° / 113.7° / 106.5°; shadows toward 107–120°; a 3 m hut casting 34 m of shadow with the sun 5° up and 86 m with it 2° up; the sun falling "about 0.15° a minute" in the last quarter-hour: confirmed** (0.140–0.153° a minute). High.
- **"An eye 3 m above the water ... the sun sets about half a minute later": corrected, trivially.** The delay is 20–22 s, about a third of a minute. For the cliff tops the 1½–2 minutes is confirmed (93–103 s for 65 m), but see section 4 on the cliff heights.
- **"The best-founded warm light is 45–90 minutes before sunset (sun 5–12° up)": corrected in detail.** In that window the sun stands 6–13° up; it reaches 5° only 37–40 minutes before sunset. "Best-founded warm light" is a judgement from general optics, not a sourced fact.
- **"Flat ground ... the sine of 2–10°, a tenth or less of full light": corrected.** sin 10° is 0.17, so the light is a tenth or less only with the sun below about 6°.
- **Added for the owner's dates** (Horizons; High):

| Evening (1805) | Sunset (LAT) | Sunset azimuth | Civil dusk ends | Nautical dusk ends |
| --- | --- | --- | --- | --- |
| 9 Aug | 19:27 | 296.7° | 20:05 | 20:54 |
| 10 Aug | 19:26 | 296.2° | 20:03 | 20:52 |
| 11 Aug | 19:24 | 295.7° | 20:01 | 20:49 |
| 12 Aug | 19:22 | 295.2° | 19:59 | 20:47 |
| 13 Aug | 19:20 | 294.7° | 19:58 | 20:45 |
| 14 Aug | 19:19 | 294.2° | 19:56 | 20:43 |

UT is 1–2 minutes earlier on these dates. On 10–11 August the sun sets about 26° to the left of straight behind a viewer looking east.

## 3. Moon

**Verdicts on the note's claims**

- **Phases (UT): first quarter 2 Aug 07:46, full moon 10 Aug 11:57, last quarter 17 Aug 22:27, new moon 24 Aug 14:40, first quarter 1 Sep 00:00: confirmed.** Horizons gives 07:46, 11:57, 22:28, 14:40, and 23:59–24:00 on 31 August. High.
- **Every row of the moon table (note 1.3): confirmed.** Horizons gives:
  - 3 Aug: 64.5 % lit, azimuth 192.5°, 14.0° up, sets 22:39.
  - 7 Aug: 93.5 %, azimuth 146°, 9.0° up.
  - 8 Aug: 97.4 %, rises 18:27 at 122.8°; at sunset 134.8°, 6.9° up.
  - 9 Aug: 99.6 %, rises 18:50 at 116.3°; at sunset 123.4°, 4.45° up.
  - 10 Aug: 99.9 %, rises 19:09 at 108.8°; at sunset 111.9°, 1.94° up.
  - 11 Aug: 98.2 %, rises 19:26 at 100.7°, 1.8 minutes after sunset.
  - 15 Aug: 72.7 %, rises 20:35 at 66.3°.
  - 20 Aug: 19 %, sets 16:33 and stays below the horizon all evening.
  - 28 Aug: 20.2 %, azimuth 233.6°, 7.0° up, sets 19:51.

  With Horizons' own refraction each rise comes about a minute earlier. High.
- **"10 Aug: almost straight ahead, just above the skyline (the heights stand about 1–1.5° high from the roads)": confirmed for the note's viewpoint, corrected for a camera 700 m off the jetty heads.** From the note's point the skyline at azimuths 100–124° stands 1.07–1.49°, so the moon, 1.94° up at sunset, has fully cleared it. From 700 m off the skyline stands about 2.0°, and at sunset the moon is half hidden behind it (see below).
- **"11 Aug: straight ahead; clears the heights a few minutes after sunset": corrected.** From the note's point the disc clears a 1.3–1.5° skyline about 16–17 minutes after sunset (19:40–19:41 LAT). From 700 m off it clears about 21–22 minutes after (19:45–19:46). Medium (terrain model of modern ground).
- **"In the pink anti-twilight band": corrected in part** (inference from general optics). That holds at sunset. But the moon of 11 August clears the hills some 20 minutes after sunset. By then the blue-grey band of the Earth's shadow has risen a few degrees, so the moon comes up inside the shadow band, with the pink Belt of Venus above it. Medium.

**Added: the moon's size** (computed; High)

The full moon of 10 August 1805 was close to apogee. The apogee fell on 6 August at 405,400 km, the moon was 398,900 km away at the full and the perigee came on 22 August at 363,700 km. So its disc was 30.0′ across (0.50°), about 10 % smaller than a perigee full moon. However large it seems in the haze, draw it 0.5° across.

**Added: the moonrise seen from 700 m west of the jetty heads** (Horizons and the IGN terrain model; Medium, because the ground is modern and the viewpoint uncertain by about 300 m)

From that point the belfry bears 105° at 2.1 km and Mont Lambert's top 106° at 4.9 km, so the belfry stands against the hill. The bare-ground skyline stands 1.8–2.0° at azimuths 100–104°, 2.0–2.13° at 104–112° (Mont Lambert), 1.8° at 114°, 1.6° at 120° and 1.5° at 124–126°. The belfry's top (about 89 m) stands 2.3°.
- **9 August.** The moon clears the hills right of the town (azimuth about 119.5°) at about 19:07 LAT, 20 minutes before sunset. At sunset it stands 4.4° up at 123°, 18° right of the belfry, still in the daylight sky.
- **10 August.** The upper limb shows over the southern shoulder of Mont Lambert at about 19:23–19:24, and the whole disc is clear at about 19:29–19:30, at azimuth 112.5°, 7° right of the belfry. The moon rises over the hill exactly at sunset (19:26).
- **11 August.** The upper limb shows at about 19:39–19:40, and the disc is clear at about 19:45–19:46, at azimuth 104°, just left of the belfry. At 19:49 it stands directly over the belfry (centre 3.0° up, azimuth 105.0°), 25 minutes after sunset, in civil twilight, which ends at 20:01.
- **12 August.** It rises at 19:42 at 92° and clears the skyline (about 1.9° at azimuth 95–97°) at about 20:00 LAT, 38 minutes after sunset, left of the town, as civil twilight ends (19:59).

## 4. Coast geometry and heights

(to be filled)

## 5. Weather, wind, smoke and sea

(to be filled)

## 6. Tide

**The heights (Desbrière III 142): confirmed on the page image.** The footnote prints the ponts-et-chaussées tide scale of Desbrière's day: quay crowns 10.56; equinoctial spring high water 9.30 (the "9" is broken but legible, so the note's doubt is resolved); mean spring HW 8.90; mean neap HW 7.06; lowest neap HW 6.28; mean neap LW 2.64; mean spring LW 1.04; equinoctial LW 0.36. That gives a spring range of 7.86 m and a neap range of 4.42 m. Desbrière's text puts the zero 0.30 m below the equinoctial low water while his table gives that low water as +0.36, a small slip of his own. The modern gauge's constants agree: twice (M2 + S2) is 7.80 m. High. Desbrière also warns (III 140) that no chart of the time with soundings and tides survives, so his scale is a reconstruction of his own day.

**Norie's establishment of 10 h 30 m for Boulogne: confirmed as printed** (Table XLI, p. 248, on the page image; Ambleteuse 11 h 0 m on the same page). **As a value it is probably 30–45 minutes early.** The modern constants put high water on the full- and new-moon days of July–August 1805 at 10:46–11:32 LAT at Boulogne. Yet Norie's figures for the neighbouring ports, Dieppe, Calais and Dover, agree with the same constants to about 15 minutes (section 1), and Boulogne's high water comes within a few minutes of Dover's. Medium.

**The note's M2 + S2 model and its table of evening tides: refuted for the times of low water, corrected for the dates.** Its stated accuracy of ±45 minutes does not hold. There are three causes:
1. **Above all, the asymmetry.** The tide at Boulogne rises in about 5–5½ hours and falls in about 7. SHOM's prediction for 13 November 2026 has a fall of 7 h 07 min and a rise of 5 h 05 min; the harmonic prediction for August 1805 gives a mean rise of 5.4 h and a mean fall of 7.0 h. So low water comes about 50 minutes later than halfway between the high waters. The note's model has no shallow-water terms ("shallow-water distortion ... is ignored").
2. Norie's establishment is about half an hour early.
3. The age of the tide from the constants is about 2.1 days, not 1.5.

Near springs the note's low waters come out about two hours early: on 10 August 16:10 against 18:18, on 24 August 16:05 against 18:01. Its high waters are 0.2–1.2 hours early.

**Corrected evening tides, August 1805** (TICON-3 harmonic prediction; times LAT; heights on Desbrière's zero; about ±20–30 min and ±0.3 m for the astronomical tide, plus a few decimetres and minutes from wind and pressure; Medium):

| Evening (1805) | High and low water (LAT, height) | At sunset | The note said |
| --- | --- | --- | --- |
| 3 Aug | HW 17:08 (7.0 m), LW 23:36 (2.9) | 5.8 m, falling | half tide, 4.5–5 m |
| 5 Aug | HW 19:48 (6.7) | 6.7 m, high water 14 min after sunset | HW 18:35–20:25 on 5–7 Aug |
| 6 Aug | HW 20:50 (7.0) | 6.5 m, rising | (as above) |
| 9 Aug | LW 17:42 (1.7), HW 23:01 (8.0) | 3.4 m, rising | – |
| **10 Aug** (full moon) | **LW 18:18 (1.4)**, HW 23:32 (8.3) | **2.1 m, rising** | LW 16:10, about 5 m at sunset |
| **11 Aug** | **LW 18:51 (1.3)** | **1.4 m, just turned** | LW 16:45–17:20, 3–4 m |
| **12 Aug** | **LW 19:20 (1.2)** | **1.2 m: low water at sunset** | (as above) |
| 13 Aug | LW 19:48 (1.2) | 1.3 m, falling | LW 17:50–19:10 on 13–15 Aug |
| 14 Aug | LW 20:18 (1.3) | 1.7 m, falling | (as above) |
| 15 Aug | LW 20:51 (1.5) | 2.4 m, falling | (as above) |
| 18–19 Aug | HW 16:12 (7.7), 17:22 (7.3) | 5.4 and 6.4 m, falling | HW 15:50–17:15, half tide |
| 20 Aug | HW 18:53 (7.1) | 7.1 m, high water 15 min before sunset | HW 18:40–19:50 on 20–21 Aug |
| 21 Aug | HW 20:25 (7.4) | 6.9 m, rising | (as above) |
| 24 Aug (new moon) | LW 18:01 (0.6) | 1.4 m, rising | LW 16:05, half tide |
| 25 Aug | LW 18:45 (0.4) | 0.4 m: lowest evening water of the month | – |
| 26 Aug | LW 19:25 (0.4) | 0.5 m, falling | LW 17:20–18:35 on 26–28 Aug |
| 28 Aug | LW 20:33 (1.1) | 2.2 m, falling | (as above) |

Heights in metres around sunset on the owner's evenings (Medium):

| Evening | 60 min before | 30 min before | Sunset | 30 min after | 60 min after |
| --- | --- | --- | --- | --- | --- |
| 9 Aug | 2.0 | 2.5 | 3.4 | 4.4 | 5.4 |
| 10 Aug | 1.4 | 1.6 | 2.1 | 2.9 | 4.0 |
| 11 Aug | 1.4 | 1.3 | 1.4 | 1.9 | 2.7 |
| 12 Aug | 1.6 | 1.3 | 1.2 | 1.4 | 1.8 |

**The dates of a given state.**
- **"On spring-tide evenings (about 13–16 and 26–29 August) low water fell close to sunset": corrected.** Low water came within about an hour of sunset on **10–14 August** and **24–27 August**.
- **"About 5–7 and 20–22 August high water came near sunset": corrected** to about 4–6 and 19–21 August.
- So **the owner's choice is sound**: the full moon of 10–11 August came together with low water at sunset.

**"Springs rose about 7.9 m, neaps about 4.4 m": confirmed as mean values. The tides of August 1805 differed from them.** The full moon fell near apogee, so the springs after it were small: ranges of 7.0–7.6 m on 11–14 August, with low waters of 1.2–1.4 m, 0.2–0.4 m above mean spring low water. The new moon fell near perigee, so the springs after it were large: 8.8–8.9 m on 25–26 August, with low water 0.4 m. The neap ranges were 3.6–3.7 m on 4–5 August and 4.3–4.5 m on 20 August. On the full-moon evenings the strand was therefore a little narrower than at mean springs, and in the last week of August wider. Medium.

**"The Liane harbour dried": confirmed** (later scholarly, from period plans and reports). Desbrière says that even the flotilla's shallow craft were almost constantly dry in the harbour ("presque constamment à sec", III 141) and that grounding was the rule (III 148). He puts the bed of the Liane at +4 to +5.7 m on the scale (III 145–146; the engineer Sganzin's figures) and a sandbank 150 m in front of the west pierhead at +5.5 m (III 148). At low water the river ran in a channel no more than 40 m wide, under 20 m in many places; the rest of the harbour was banks of sand and mud with islets (III 147). On the owner's evenings the water stood below +5 m from about 14:30–15:40 until 20:50–22:00 LAT (10 August: 14:32–20:53; 11 August: 15:05–21:27; 12 August: 15:36–21:59). So the harbour lay dry, its craft aground, through the whole evening. High for the mechanism, Medium for the hours.

**"The flotilla could only get in and out round high water": confirmed.**
- The port officer Sauvage reported that craft could leave safely only from half an hour before high water until an hour after it, or two hours after for oared craft. They could enter only from about an hour before high water at ordinary tides, and at neaps no vessel drawing six feet could enter at all (III 144).
- Desbrière's own estimate gives the canonnières about 3 hours over the bank at springs and none at neaps, and the bateaux and péniches about 4 hours at springs and 2 at neaps (III 145).
- One small correction: the note calls Sauvage "the engineer". Desbrière calls him *officier du port*, a port officer.

**The strand widths: confirmed.**
- Desbrière III 141: the strand (*estran*) was 700–800 m wide at the head of the bay and still 450 m at the Crèche, which kept the line of moored craft far from the shore batteries.
- III 142: Cadier's plan of 1768 puts the low-water line 386 toises (752 m) from the west jetty.
- III 148: in 1803 a fascine dike was run out 700 m from the Pidou jetty "to the spring low-water line".
- Owen to Keith, 7 October 1803: a long flat runs off dry at low water for a full half mile from the pier, and there are seven fathoms about a mile from the pier head, with the pier heads bearing from SE to ESE (Keith Papers III, pp. 41–42, as transcribed on historyofwar.org).

High for the 1768–1803 geometry, Medium for 1805. **The consequence for the viewpoint is in "What the painter must change or know"** at the top.

**"Forts on the sands" (James III 229): confirmed.** James's wording is "seven or eight forts erected on the sands at low water", with mortar beds over which the tide flowed. That puts them on ground the sea left dry, not necessarily on the low-water mark itself.

## 7. The Royal Navy's watch

(to be filled)

## 8. England from Boulogne

(to be filled)

## 9. Other claims (time-keeping, calendar, side remarks)

(to be filled)

## 10. Additional facts found

(to be filled)

## Sources used in this check

(to be filled)
