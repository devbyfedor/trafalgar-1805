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

- In the last half hour the sun sinks about 0.14° a minute and moves 0.19° a minute to the right as seen from the shore (to the north-west).
- The anti-solar point, where the shadows point and the Belt of Venus is centred, lies at 106.2° at 18:33 and 116.2° at sunset: 8° and 18° right of the axis.
