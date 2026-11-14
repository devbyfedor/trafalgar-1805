# The evening the painting shows: 10 August 1805, computed

**The chosen evening: 10 August 1805.** It is the evening of the full moon itself (99.9 % lit), and from the painting's eye the moon's disc clears the hills over the town exactly at sunset (19:26 local apparent time), as the brief has it; low water (18:18) falls in the golden hour. On 11 August the moon comes up over the upper town by the belfry, but only 20 minutes after sunset, in dusk, and 98 % lit (section 3.4).

Research note for scene 2, beat 1 ("Boulogne from the sea"). It computes the evening for the painting's final eye and lists the liberties the painting takes with it. The confidence scale (High, Medium, Low) is the one at the top of `docs/history-notes.md`. It uses the verified figures of `light-and-watch-check.md`: the sun and moon from NASA/JPL Horizons, the TICON-3 tide prediction, Desbrière's tide scale and strand widths, and the IGN terrain model. Everything that depends on the place is recomputed here for the painting's eye.

Status: complete (13 November 2026, session 26). Not yet checked by an independent reader.

Conventions:
- **The eye** (the code's, final: `interludes.ts`, SEA_EYE): 50.7300 N 1.5780 E, 1.1 km due west of the 1805 jetty heads (taken as 50.730 N 1.594 E), 6 m above the water, looking along heading 98°, scene 1's lens of 40° vertical.
- **Times** are local apparent time (LAT), as French clocks showed in 1805, unless marked UT. On 10 August 1805 at Boulogne, LAT = UT + 1.3 min, and local mean time = UT + 6.3 min (equation of time −5.0 min).
- **Azimuths** are true, from north through east. "Left" and "right" are for the viewer looking along 98°. Straight behind is 278°.
- **Heights of the tide** are on Desbrière's zero, the ponts-et-chaussées tide scale (`light-and-watch-check.md`, section 6). Heights of the land are above IGN69 (the French levelling datum, about mean sea level).
- **Layer units** are the painting's (`scene.ts`): x = 1000 · tan(angle right of the axis), y = 1000 · tan(angle above the eye's horizontal), divided by the cosine of the angle off the axis, as `project()` does.

## 1. The evening and its times

10 August 1805 was a Saturday (22 thermidor an XIII; 1 thermidor = 20 July). The full moon fell at 11:57 UT that day. All times computed from Horizons for this eye. High.

- **Sunset** (upper limb on the horizon, 34′ of refraction): **19:26 LAT** (19:24 UT), at azimuth **296.2°**, 18° left of straight behind. From an eye 6 m above the water the sun touches the sea horizon about half a minute later.
- **The golden light window** (sun 12° to 5° up): **18:01–18:47 LAT**, 85 to 39 minutes before sunset.
- **The painting's light** (`scene.ts`: the sun about 7° up) is that of **18:33 LAT**, 52 minutes before sunset. The sun then stands at azimuth 286.2°, 8° left of straight behind.
- **Low water** at 18:18 LAT (1.4 m on the scale), inside the golden window (section 4).
- **Moonrise** (upper limb on the horizon, 34′ of refraction): 19:09 LAT, at azimuth 108.8°, 17 minutes before sunset. From this eye the moon is then still behind the hills.
- **The moon's upper limb shows over the hills** at 19:22 LAT, and **its disc is clear at 19:26 LAT**, the minute of sunset, over the southern shoulder of Mont Lambert, above the southern part of the lower town (section 3).
- **Civil dusk** ends at **20:03 LAT** (38 minutes after sunset); **nautical dusk** at 20:52 (86 minutes).
- **The tide** turns at 18:18 and rises 0.7 m by sunset; the flood reaches the jetty heads at about 20:20 (section 4).

## 2. The sun, every 15 minutes

10 August 1805, from the eye. Altitudes are apparent (with refraction) while the sun is up, and true (airless) once it is down. "Left of behind" is how far the sun stands to the left of straight behind the viewer (278°). High.

| Minutes from sunset | LAT | Azimuth | Altitude | Left of behind |
| --- | --- | --- | --- | --- |
| −90 | 17:56 | 279.2° | 12.8° | 1.2° |
| −75 | 18:11 | 282.0° | 10.5° | 4.0° |
| −60 | 18:26 | 284.8° | 8.2° | 6.8° |
| −52 (the painting's light) | 18:33 | 286.2° | 7.0° | 8.2° |
| −45 | 18:41 | 287.6° | 5.9° | 9.6° |
| −30 | 18:56 | 290.5° | 3.7° | 12.5° |
| −15 | 19:11 | 293.3° | 1.7° | 15.3° |
| 0 (sunset) | 19:26 | 296.2° | upper limb on the horizon (centre −0.8° true) | 18.2° |
| +15 | 19:41 | 299.2° | −2.9° (true) | 21.2° |
| +30 | 19:56 | 302.1° | −5.0° (true) | 24.1° |

- In the last half hour the sun sinks about 0.14° a minute, and its azimuth grows about 0.19° a minute: it slides further to the viewer's left, toward the north-west.
- The anti-solar point, where the shadows point and the Belt of Venus is centred, lies at 106.2° at 18:33 and 116.2° at sunset: 8° and 18° right of the axis.

## 3. The moon

Horizons (DE441) for this eye, and the bare-ground skyline from the IGN RGE ALTI terrain model (method in section 8). The moon's altitudes are apparent, with refraction; the skyline angles include the earth's curvature and terrestrial refraction. High for the moon's positions; Medium for the moments it shows over the hills (modern ground; about ±1 minute).

### 3.1 Rise and the skyline

- **Moonrise** (upper limb on the horizon, 34′ of refraction): 19:09 LAT at azimuth 108.8°, 17 minutes before sunset. From this eye the hills hide it for another quarter of an hour.
- **The upper limb shows** over the hills at **19:22 LAT**, at azimuth 111.3°, where the skyline stands 1.75° (the slope of Mont Lambert, ground 163 m at 5.1 km).
- **The whole disc is clear at 19:26 LAT**, the minute of sunset: azimuth **111.95°**, centre **1.96°** up (1.65° without refraction). The skyline under it stands **1.68°**: the southern shoulder of Mont Lambert, ground 154 m at 5.10 km (50.713 N 1.645 E). The centre is 0.28° above the skyline, so the lower limb just touches it.
- **Then, every 10 minutes:**

| LAT | Minutes after sunset | Azimuth | Altitude | Skyline there | Centre above the skyline | x |
| --- | --- | --- | --- | --- | --- | --- |
| 19:26 | 0 | 111.95° | 1.96° | 1.68° | 0.28° | 248 |
| 19:36 | 10 | 113.85° | 3.32° | 1.59° | 1.73° | 284 |
| 19:46 | 20 | 115.76° | 4.69° | 1.54° | 3.15° | 320 |
| 19:56 | 30 | 117.69° | 6.06° | 1.51° | 4.55° | 358 |
| 20:06 | 40 | 119.65° | 7.41° | 1.47° | 5.94° | 397 |

- **Its path** climbs to the right at about 36° to the horizon: 1.9° to the right and 1.4° up every 10 minutes (in layer units about 36 across and 25 up). By the end of civil dusk (20:03) it stands 7° up at azimuth 119°. High.

### 3.2 Against the town

| Place | Azimuth | Distance | Top above the horizontal | x |
| --- | --- | --- | --- | --- |
| Upper town, north corner of the walls | 96.2° | 2.5 km | 1.4° | −32 |
| Upper town, east corner (château) | 99.5° | 2.8 km | 1.4° | 25 |
| **Belfry** (top about 89 m) | **102.6°** | 2.54 km | **1.92°** | **81** |
| Upper town, west corner | 104.2° | 2.3 km | 1.3° | 109 |
| **Mont Lambert's summit** (187 m) | **105.0°** | 5.36 km | **1.94°** | **124** |
| Upper town, south corner | 106.6° | 2.7 km | 1.3° | 151 |
| Saint-Nicolas (ground 13 m) | 109.8° | 2.2 km | 0.2° (ground) | 210 |
| **The moon at sunset** | **111.95°** | | **1.96°** | **248** |

- **At sunset the moon stands 9.3° right of the belfry and 6.9° right of Mont Lambert's summit,** 5.3° right of the upper town's south corner and 2.1° right of Saint-Nicolas. Below it lies the southern part of the lower town, 2.0–2.4 km off, and behind that the slope rising to the southern shoulder of Mont Lambert. So it rises over the town's right-hand part, not over the walled upper town. Medium (the lower town's southern edge in 1805 is judged roughly from the 1804 plan, BnF GE D-6281, not measured on it).
- **The belfry's top just breaks the skyline.** It stands 1.92°, against Mont Lambert's northern slope at 1.77° behind it. The upper town's walls (1.3–1.4°) stand below the skyline everywhere.
- **At the painting's light (18:33)** the moon was 5.5° below the horizon, almost exactly under the belfry (azimuth 102.2°).

### 3.3 Its disc, phase and colour

- **Phase:** 99.9 % lit at sunset; the full moon came at 11:57 UT that day. High.
- **Size:** 397,800 km away, **30.0′ across (0.50°)**. The apogee was on 6 August, so this full moon was about 10 % smaller than one at perigee. In layer units the true disc is 8.7 across, about 9 CSS px on a screen 720 px high. High.
- **Shape:** at 2° up refraction squashes the disc to about 0.92 of its width; at 7° up to about 0.98. High (computed with Bennett's refraction formula).
- **Colour and brightness** (general optics; Medium as inference): at 2° up its light crosses about 19 times as much air as overhead, at 7° about 8 times. At sunset it is therefore a dim, warm disc, apricot to pink, hardly brighter than the sky around it, and in thick haze it can be lost altogether. It whitens and brightens as it climbs, and reads plainly from about 5° up (19:45 onward). It stands in the pink anti-twilight band at sunset, 4° left of the anti-solar point; in the next ten minutes the blue-grey band of the earth's shadow rises beneath it.

### 3.4 The other evenings, from the same eye

- **11 August** (98.2 % lit, 30.2′): sunset 19:24. The upper limb shows at 19:39, 0.6° right of the belfry. **The disc is clear at 19:44, 20 minutes after sunset**, at azimuth 104.0°, centre 2.22° up, 0.29° above the skyline (1.93°, the top of Mont Lambert). That is x = 105, straight above the west corner of the walls, 1.4° right of the belfry and 1.0° left of Mont Lambert's summit. The sun is then 3.0° below the horizon, in civil dusk (it ends at 20:01). Every 10 minutes after: 19:54, azimuth 105.9°, 3.66° up (x 139); 20:04, 107.8°, 5.11° (x 173); 20:14, 109.7°, 6.57° (x 207); 20:24, 111.6°, 8.01° (x 243). Low water 18:50 (1.3 m); 1.7 m at 19:44. This is the moon by the belfry, if the owner prefers it; the liberty of moment is then 72 minutes instead of 53.
- **9 August** (99.6 %): the disc clears the hills at 19:06, 21 minutes before sunset, at azimuth 119.3° (x 390), over the Liane valley, right of the town.
- **12 August** (94.5 %): the disc clears at 19:57, 35 minutes after sunset, at azimuth 95.0° (x −52), left of the upper town.

## 4. The tide that evening

The TICON-3 harmonic prediction for the Boulogne gauge, the predictor of `light-and-watch-check.md` (section 6) run unchanged, with times turned into LAT. Heights on Desbrière's zero. It is good to about ±20–30 minutes and ±0.3 m for the astronomical tide; wind and pressure add a few decimetres. The barometer stood high (section 5), which lowers the sea by a few centimetres only. Medium.

### 4.1 Low water and the heights

- **High water 11:15 LAT (8.2 m), low water 18:18 LAT (1.4 m), high water 23:32 (8.3 m).** A range of 6.8–6.9 m: small springs, because this full moon came near apogee (mean springs 7.9 m).
- **Low water fell 68 minutes before sunset**, inside the golden window. At the painting's light (18:33) the water stood at 1.45 m, 3 cm above low water.

| Minutes from sunset | LAT | Height | Rise in the half hour around it | Water's edge seaward of the west jetty head |
| --- | --- | --- | --- | --- |
| −90 | 17:56 | 1.49 m | −0.16 m (still falling) | about 490 m |
| −60 | 18:26 | 1.43 m | +0.06 m (low water 18:18) | about 500 m |
| −30 | 18:56 | 1.63 m | +0.35 m | about 460 m |
| 0 (sunset) | 19:26 | 2.13 m | +0.66 m | about 350 m |
| +30 | 19:56 | 2.94 m | +0.94 m | about 170 m |
| +60 | 20:26 | 3.98 m | +1.11 m | at the jetty heads (from about 20:18) |

### 4.2 The strand

**In front of the jetty heads.** Cadier's plan of 1768 marks 3.40 m of fall from the west jetty to the low-water line, 386 toises (752 m) out. Desbrière reads that line as the lowest low water, +0.30 m, and puts the bar at the jetty head at +3.70 m (Desbrière III 142). His footnote to the fascine dike (III 148) likewise puts its "laisse de basse mer de vive eau", 700 m out, at +0.36 m. So the 700–750 m line is the line of the lowest tides of the year. With Cadier's even slope of about 1:220, the water's edge at height h lies 752 × (3.70 − h) / 3.40 m seaward of the west jetty head (last column above). Medium-Low (one plan of 1768, applied to 1805).
- At the painting's light (18:33, 1.45 m) the edge lay about **500 m** off the jetty heads: some 250 m inside the 750 m line that `geo.ts` draws as SHORE_LOW.
- At sunset (2.13 m) about 350 m off; by 20:18 the flood reached the jetty heads.
- The eye, 1.1 km off, then floated about 600 m seaward of the water's edge. If Cadier's slope goes on, the bottom under it lay at about −1.3 m, in some 2.7 m of water at low water: enough for a chaloupe canonnière (2 m draught). Low.

**In front of the cliffs.** Desbrière gives the strand as 700–800 m wide at the head of the bay and still 450 m at the Crèche (III 141), at the same lowest tides. With an even slope from the high-water mark (+8.90 m, the foot of the cliffs) down to that line, its width at height h is the full width × (8.90 − h) / 8.54. Low (the real beach is flatter below and steeper above, so near low water the edge moves faster than this).

| | 18:33 (1.45 m) | Sunset (2.13 m) | 19:56 (2.94 m) | 20:26 (3.98 m) |
| --- | --- | --- | --- | --- |
| Under the cliffs north of the harbour (700–800 m at the lowest tides) | 610–700 m | 555–635 m | 490–560 m | 405–460 m |
| At the Crèche (450 m) | 395 m | 355 m | 315 m | 260 m |

### 4.3 The harbour and the bank at the mouth

- **The harbour lay dry all evening.** The bed of the Liane in the harbour stood at +4 to +5.7 m (Desbrière III 145–146). The water was below +5 m from 14:32 to 20:53 LAT and below +4 m from 15:17 to 20:26. Through the golden hour and the sunset the craft in the harbour sat on the mud; only the narrow stream of the Liane ran through it, under 40 m wide (III 147). High for the mechanism, Medium for the hours.
- **The bar and the bank.** The bar at the west jetty head (+3.70 m) lay dry from 15:32 to 20:18. The bank 150 m in front of the west pierhead (+5.5 m, III 148), which barred the west half of the mouth, lay dry from 14:10 to 21:06; the outflow ran along the east (Pidou) jetty. Medium.
- **When the craft could move that night.** The water stood 2 m over the bank (+7.5 m, enough for the canonnières) from 22:13 to 00:57, and 1.3 m over it (+6.8 m, for the bateaux and péniches) from 21:45 to 01:32: about 3 and 4 hours round the high water of 23:32, as Desbrière reckons for springs (III 145). Medium.
- **Not checked:** which way the stream ran off the harbour at low water, and so which way the craft in the roads lay (`light-and-watch-check.md`, section 10.9).

## 5. The weather

- **At Boulogne the weather of 10 August 1805 is not recorded** in anything read. Napoleon's letters from the camp mention the weather only on 20 August, and Desbrière's account of the flotilla has nothing for this evening (`light-and-watch-check.md`, section 5). British logs off Boulogne (The National Archives, ADM 51/52) would have it but were not read.
- **London, the same day** (Royal Society meteorological journal, Somerset House; read on the page image, *Phil. Trans.* 96, 1806, p. 16). At 7 a.m.: wind south-west, strength 1, cloudy, 63 °F (17 °C), barometer 30.08 in. At 2 p.m.: wind west, strength 1, fair, 73 °F (23 °C), barometer 30.10 in. The day's range was 61–74 °F (16–23 °C). No rain fell from the morning of 9 August until 14–15 August; the barometer stood at 30.05–30.12 in on 10–11 August, the highest of the month. The 11th was "fine" at 2 p.m., 75 °F. Period. High for London.
- **What it suggests for Boulogne, 150 km away:** a warm, settled summer day with light airs, westerly in the afternoon, and fair skies with some cloud. In the Strait such weather commonly brings haze, which softens the town and the hills and dims a low moon. A westerly air carries the camps' smoke straight away from the viewer and a little to the left; as the afternoon sea breeze dies near sunset the smoke rises and spreads flat over the plateaus (`light-and-watch.md` 3.2). The sea is quiet: a low swell from the west or south-west and small waves. Medium as inference for Boulogne; Low for any detail of the evening.

## 6. Liberties for decisions.md

Ready to copy. The numbers are for 10 August 1805 and the painting's eye.

- **(a) The moment.** The painting's golden light is that of **52 minutes before sunset** (18:33 LAT, the sun 7.0° up at azimuth 286.2°). The moon is placed as it stood **at sunset** (19:26 LAT), its disc just clear of the southern shoulder of Mont Lambert at azimuth 112.0°, 1.96° up. The two moments are 53 minutes apart; at 18:33 the real moon was still 5.5° below the horizon. (With 11 August the gap would be 72 minutes: the moon as it stood 20 minutes after sunset.)
- **(b) The tide.** Low water is no liberty in the golden light: it fell at 18:18 LAT (1.42 m), and at 18:33 the water stood at 1.45 m. Read as the moment of sunset, the moon's moment, low water is a liberty of **68 minutes and 0.71 m**: at sunset the water stood at 2.13 m and was rising 0.66 m in the half hour. The edge in front of the jetty heads then lay about 350 m off them instead of about 500 m (Medium-Low).
- **(c) The strand's depth.** On the view's axis at 18:33 the strand ran from the water's edge, about 636 m ahead of the eye, to the high-water shore 1,350 m ahead. Taken flat at the water's level it spans from 0.54° to 0.25° below the eye's horizontal: **0.29°**, 5.0 layer units (y −9.4 to −4.4). Drawn at about twice that, it is **0.57°**, about 10 units. The real beach rose some 7.5 m from the water's edge to the high-water mark, so a 6 m eye saw it from 0.54° below to 0.06° above the horizontal, 0.60° in all. A flat strand at twice its flat depth therefore shows about what the eye really saw; record it as "the strand drawn flat, at about twice its flat angular depth".
- **(d) The moon's disc.** Its true diameter is **0.50°** (30.0′; 8.7 layer units). Drawing it up to **twice that, 1.0°** (about 17 units), is acceptable: it is the factor the painting already uses for buildings (BUILD = 2), so the moon keeps its true size against the drawn belfry, and a low moon looks larger to the eye than its angle (the moon illusion). Beyond about 2.5 times it reads as a long-lens moon and breaks scene 1's lens. Keep its flattening (0.92 of its width at 2° up) and its lower limb on the painted skyline.
- **(e) The water's edge.** `geo.ts` draws SHORE_LOW about 750 m off the jetty heads, about 380 m ahead of the eye on the axis. That is the line of the lowest tides of the year, +0.3 m (Desbrière III 142 and 148). On 10 August low water stood 1.1 m higher and the edge lay about 250 m further in: about 500 m off the jetty heads, about 636 m ahead (y −9.4 instead of −15.8). Either move the edge in, or record "the strand of the lowest spring tides of the year". Medium-Low (Cadier's slope of 1768).
- **(f) The moon's light.** At sunset, 2° up, through summer haze, the real moon was dim, warm and hardly brighter than the sky around it; haze can hide it. A clearly readable disc is a liberty. Keep it warm (apricot to pink), soft at the lower edge and only a little brighter than the sky.
- **Not a new liberty:** with the land drawn 2.5 times its height (the far hills 1.6 times), the moon set at its true angular gap above the painted skyline stands higher in the frame than the real one (y about 35). That follows from the licence on heights already recorded.

## 7. For the painter

Layer units as in `scene.ts`: x = 1000 · tan(azimuth − 98°); y = 1000 · tan(angle above the eye's horizontal) / cos(azimuth − 98°), so that it matches `project()`. True geometry unless marked "painted".

**The moon at the chosen moment** (10 August 1805, sunset, 19:26 LAT):
- **Azimuth 111.95°: x = 248.**
- **True altitude 1.96°** (apparent, with refraction): y = 35.
- **The true skyline there stands 1.68°** (y = 30). It is the southern shoulder of Mont Lambert, ground 154 m at 5.10 km (50.713 N 1.645 E). In front of it, 2.0–2.4 km off, lies the southern part of the lower town, between Saint-Nicolas (x 210) and the Liane; the upper town's south corner is at x 151.
- **Its centre stands 0.28° above the true skyline**, so the lower limb just touches the hill (0.03° above it). Set the lower limb on the painted skyline at x = 248, and the centre one drawn radius above it: 0.25° (4.4 units) for the true disc, 0.5° (8.7 units) for a disc drawn twice its size.
- **The painted skyline at x = 248** is the plates' own; measure it there. For reference: the terrain model drawn 2.5 times its height would put it at 4.27° (y 77), and at the far hills' licence of 1.6 at 2.70° (y 49). `land.ts` (hills) draws about y 42 there.
- **The belfry: azimuth 102.63°, x = 81.** Its top (about 89 m) stands 1.92° (y 34), just above the true skyline behind it (1.77°). The moon is 9.3° (167 units) to its right.
- **Mont Lambert's summit: azimuth 105.04°, x = 124**, 1.94° (y 34). Note that `land.ts` centres its Mont Lambert swell at x ≈ −20, 8° left of the true summit. In true geometry the moon rises on the hill's southern shoulder, 6.9° right of its top.
- **The moon's path afterwards** (for the dusk of stage B), every 10 minutes from the chosen moment: x 248, 284, 320, 358, 397 and y 35, 60, 86, 113, 140 (19:26 to 20:06). Its centre then stands 0.28°, 1.73°, 3.15°, 4.55° and 5.94° above the true skyline. It climbs to the right at about 36° to the horizon.

**The sun:**
- **At the painting's light** (18:33 LAT): azimuth 286.2°, **7.0° up**, **8.2° left of straight behind** (188.2° from the view's axis, turning left).
- **At sunset, the moon's moment** (19:26): azimuth 296.2°, on the horizon, 18.2° left of straight behind.
- **The anti-solar point** (the centre of the shadows' direction and of the Belt of Venus): at 18:33 azimuth 106.2° (x 144), 6.9° below the horizon; at sunset azimuth 116.2° (x 331), 0.8° above it.

**The water's edge on the axis** (section 4.2): about 636 m ahead at 18:33 (y −9.4) and about 790 m ahead at sunset (y −7.6). The high-water shore is 1,350 m ahead (y −4.4). `geo.ts`'s SHORE_LOW, 380 m ahead (y −15.8), is the line of the lowest tides of the year (liberty (e)).

**If the owner prefers 11 August** (the moon by the belfry; section 3.4): at 19:44 LAT the moon stands at azimuth 104.01° (x = 105), 2.22° up (y 39), over the top of Mont Lambert (skyline 1.93°), its centre 0.29° above it; 1.4° right of the belfry, straight above the west corner of the walls. The sun is then 3.0° below the horizon at azimuth 299.6°, 21.6° left of straight behind.

## 8. Method and sources

**Method.** The scripts and downloads stay outside the repository (in the session's scratch folder, `.claude/s26/history/evening/`); the steps are given here so they can be repeated.
- **Sun and moon:** NASA/JPL Horizons (DE441) observer tables for the site 1.5780 E, 50.7300 N, 6 m, 9–12 August 1805, 16:30–21:30 UT at 1-minute steps, airless and with Horizons' refraction; quantities: azimuth and elevation, illuminated fraction, angular diameter, distance, local apparent solar time (which gives LAT). Sunset and moonrise are for the upper limb with 34′ of refraction, the convention of `light-and-watch-check.md`; the results agree with the check's figures, computed for a point 0.7 km away, within a minute and 0.1°.
- **Skyline:** the IGN RGE ALTI bare-ground terrain model through the Géoplateforme altimetry service, along rays from the eye every 1° from 55° to 140° and every 0.25° from 99° to 114°, sampled every 20 m from 100 m to 9 km. The elevation angle of each point allows for the earth's curvature with terrestrial refraction k = 0.13. The eye stands 6 m above the water: the water at sunset stood at 2.1 m on Desbrière's scale; the modern hydrographic zero at Boulogne lies 4.382 m below IGN69 (SHOM), and Desbrière's zero is taken as the same (the check's predictor, set on his mean level, matched SHOM's predictions with no bias). So the eye stood at about +3.75 m IGN69 at sunset (+3.3 m for 11 August). A metre's error in it moves the skyline by about 0.01°. The ground is modern and bare: no buildings, and the modern harbour works near the eye rise nowhere near the skyline. The moon "shows" when its upper limb rises above the skyline at its azimuth, and "clears" when its lower limb is above the skyline across the disc's width.
- **Places:** `geo.ts` (PLACES and RAMPARTS; modern positions for what still stands), with the belfry's top at about 89 m (ground 52 m, tower about 37 m) and the walls about 14 m above the ground.
- **Tide:** the TICON-3 constants of the Boulogne gauge (40 constituents) and the predictor of `light-and-watch-check.md`, run unchanged, with the mean level at 4.97 m on Desbrière's scale; times turned into LAT with Horizons' local apparent time.
- **Strand:** Cadier's fall of 3.40 m over 386 toises from the west jetty to low water and Desbrière's reading of it (III 142), Desbrière's level of +0.36 m for the line the fascine dike reached (III 148), his strand widths (III 141), and an even slope between those lines; the high-water mark at +8.90 m.
- **Refraction and air mass** at low altitude: G. G. Bennett's formula for refraction and F. Kasten and A. T. Young's formula for air mass (both standard).

**Sources.**
- NASA/JPL Horizons (DE441), queried through its API on 13 November 2026. https://ssd.jpl.nasa.gov/horizons/
- IGN, Géoplateforme altimetry service, RGE ALTI terrain model. https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json
- SHOM, tide gauge of Boulogne-sur-Mer (no. 111), metadata: hydrographic zero at −4.382 m IGN69. https://services.data.shom.fr/maregraphie/service/completetidegauge/111
- M. G. Hart-Davis, D. Dettmering and F. Seitz, *TICON-3: Tidal Constants based on GESLA-3 sea-level records*, PANGAEA (2022), CC BY 4.0. https://doi.org/10.1594/PANGAEA.951610
- E. Desbrière, *Projets et tentatives de débarquement aux îles Britanniques*, vol. III (1902), pp. 141–148 (the strand, Cadier's plan, the tide scale, the bank, the harbour's bed). Later scholarly. https://archive.org/details/projetsettentat00histgoog/page/n158/mode/1up
- Royal Society, "Meteorological Journal" for August 1805, *Philosophical Transactions* 96 (1806), separately paginated p. 16 (page image). Period. https://archive.org/details/philtrans09860936/page/n15/mode/1up
- *Plan du port et de la ville de Boulogne en l'an XII (1804)*, BnF GE D-6281 (the extent of the lower town). Period. https://gallica.bnf.fr/ark:/12148/btv1b8445205g
- G. G. Bennett, "The Calculation of Astronomical Refraction in Marine Navigation", *Journal of Navigation* 35 (1982), pp. 255–259; F. Kasten and A. T. Young, "Revised optical air mass tables and approximation formula", *Applied Optics* 28 (1989), pp. 4735–4738.
- The sibling notes and their checks: `light-and-watch.md` and `light-and-watch-check.md` (sun, moon, tide, weather), `town-and-defences.md` (the jetty heads, the town). The painting's code: `src/scenes/02-road/interludes.ts` (SEA_EYE), `src/scenes/02-road/boulogne-sea/geo.ts`, `scene.ts` and `land.ts`.
