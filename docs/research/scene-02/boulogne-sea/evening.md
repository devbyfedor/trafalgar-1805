# The evening the painting shows: 10 August 1805, computed

**The chosen evening: 10 August 1805.** It is the evening of the full moon itself (99.9 % lit), and from the painting's eye the moon's disc clears the hills over the town exactly at sunset (19:26 local apparent time), as the brief has it; low water (18:18) falls in the golden hour. On 11 August the moon comes up over the upper town by the belfry, but only 20 minutes after sunset, in dusk, and 98 % lit (section 3.4).

Research note for scene 2, beat 1 ("Boulogne from the sea"). It computes the evening for the painting's final eye and lists the liberties the painting takes with it. The confidence scale (High, Medium, Low) is the one at the top of `docs/history-notes.md`. It uses the verified figures of `light-and-watch-check.md`: the sun and moon from NASA/JPL Horizons, the TICON-3 tide prediction, Desbrière's tide scale and strand widths, and the IGN terrain model. Everything that depends on the place is recomputed here for the painting's eye.

Status: complete (13 November 2026, session 26). Not yet checked by an independent reader.

Conventions:
- **The eye** (the code's, final: `interludes.ts`, SEA_EYE): 50.7300 N 1.5780 E, 1.1 km due west of the 1805 jetty heads (taken as 50.730 N 1.594 E), 6 m above the water, looking along heading 98°, scene 1's lens of 40° vertical.
- **Times** are local apparent time (LAT), as French clocks showed in 1805, unless marked UT. On 10 August 1805 at Boulogne, LAT = UT + 1.3 min, and local mean time = UT + 6.3 min (equation of time −5.0 min).
- **Azimuths** are true, from north through east. "Left" and "right" are for the viewer looking along 98°. Straight behind is 278°.
- **Heights of the tide** are on Desbrière's zero, the ponts-et-chaussées tide scale (`light-and-watch-check.md`, section 6). Heights of the land are above IGN69 (the French levelling datum, about mean sea level).
- **Layer units** are the painting's (`scene.ts`): x = 1000 · tan(angle right of the axis), y = 1000 · tan(angle above the eye's horizontal).

## 1. The evening and its times

10 August 1805 was a Saturday (22 thermidor an XIII; 1 thermidor = 20 July). The full moon fell at 11:57 UT that day. All times computed from Horizons for this eye. High.

- **Sunset** (upper limb on the horizon, 34′ of refraction): **19:26 LAT** (19:24 UT), at azimuth **296.2°**, 18° left of straight behind. From an eye 6 m above the water the sun touches the sea horizon about half a minute later.
- **The golden light window** (sun 12° to 5° up): **18:01–18:47 LAT**, 85 to 39 minutes before sunset.
- **The painting's light** (`scene.ts`: the sun about 7° up) is that of **18:33 LAT**, 52 minutes before sunset. The sun then stands at azimuth 286.2°, 8° left of straight behind.
- **Low water** at 18:18 LAT (1.4 m on the scale), inside the golden window (section 4).
- **Moonrise** (upper limb on the sea horizon, standard refraction): 19:09 LAT, at azimuth 108.8°, 17 minutes before sunset. From this eye the moon is then still behind the hills.
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

- **Moonrise** over the sea horizon: 19:09 LAT at azimuth 108.8°, 17 minutes before sunset. From this eye the hills hide it for another quarter of an hour.
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

- **At sunset the moon stands 9.3° right of the belfry and 6.9° right of Mont Lambert's summit,** 5.3° right of the upper town's south corner and 2.1° right of Saint-Nicolas. Below it lies the southern part of the lower town, 2.0–2.4 km off, and behind that the slope rising to the southern shoulder of Mont Lambert. So it rises over the town's right-hand part, not over the walled upper town. Medium (the lower town's southern edge in 1805 is read from the 1804 plan, BnF GE D-6281, not measured).
- **The belfry's top just breaks the skyline.** It stands 1.92°, against Mont Lambert's northern slope at 1.77° behind it. The upper town's walls (1.3–1.4°) stand below the skyline everywhere.
- **At the painting's light (18:33)** the moon was 5.5° below the horizon, almost exactly under the belfry (azimuth 102.2°).

### 3.3 Its disc, phase and colour

- **Phase:** 99.9 % lit at sunset; the full moon came at 11:57 UT that day. High.
- **Size:** 397,800 km away, **30.0′ across (0.50°)**. The apogee was on 6 August, so this full moon was about 10 % smaller than one at perigee. In layer units the true disc is 8.7 across, about 9 CSS px on a screen 720 px high. High.
- **Shape:** at 2° up refraction squashes the disc to about 0.92 of its width; at 7° up to about 0.98. High (computed with Bennett's refraction formula).
- **Colour and brightness** (general optics; Medium as inference): at 2° up its light crosses about 19 times as much air as overhead, at 7° about 8 times. At sunset it is therefore a dim, warm disc, apricot to pink, hardly brighter than the sky around it, and in thick haze it can be lost altogether. It whitens and brightens as it climbs, and reads plainly from about 5° up (19:45 onward). It stands in the pink anti-twilight band at sunset, 4° left of the anti-solar point; in the next ten minutes the blue-grey band of the earth's shadow rises beneath it.

### 3.4 The other evenings, from the same eye

- **11 August** (98.2 % lit, 30.2′): sunset 19:24. The upper limb shows at 19:39, 0.6° right of the belfry. **The disc is clear at 19:44, 20 minutes after sunset**, at azimuth 104.0°, centre 2.22° up, 0.29° above the skyline (1.93°, the top of Mont Lambert). That is x = 105, straight above the west corner of the walls, 1.4° right of the belfry and 1.0° left of Mont Lambert's summit. The sun is then 3.0° below the horizon, in civil dusk (it ends at 20:01). Every 10 minutes after: 19:54, azimuth 105.9°, 3.66° up (x 139); 20:04, 107.8°, 5.11° (x 173); 20:14, 109.7°, 6.57° (x 207); 20:24, 111.6°, 8.01° (x 243). Low water 18:50 (1.3 m); 1.7 m at 19:44. This is the moon by the belfry, if the owner prefers it; the liberty of moment is then 72 minutes instead of 52.
- **9 August** (99.6 %): the disc clears the hills at 19:06, 21 minutes before sunset, at azimuth 119.3° (x 390), over the Liane valley, right of the town.
- **12 August** (94.5 %): the disc clears at 19:57, 35 minutes after sunset, at azimuth 95.0° (x −52), left of the upper town.
