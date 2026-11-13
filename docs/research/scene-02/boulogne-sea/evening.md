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

10 August 1805 was a Saturday (23 thermidor an XIII). The full moon fell at 11:57 UT that day. All times computed from Horizons for this eye. High.

- **Sunset** (upper limb on the horizon, 34′ of refraction): **19:26 LAT** (19:24 UT), at azimuth **296.2°**, 18° left of straight behind. From an eye 6 m above the water the sun touches the sea horizon about half a minute later.
- **The golden light window** (sun 12° to 5° up): **18:01–18:47 LAT**, 85 to 39 minutes before sunset.
- **The painting's light** (`scene.ts`: the sun about 7° up) is that of **18:33 LAT**, 52 minutes before sunset. The sun then stands at azimuth 286.2°, 8° left of straight behind.
- **Low water** at 18:18 LAT (1.4 m on the scale), inside the golden window (section 4).
- **Moonrise** (upper limb on the sea horizon, standard refraction): 19:09 LAT, at azimuth 108.8°, 17 minutes before sunset. From this eye the moon is then still behind the hills.
- **The moon's upper limb shows over the hills** at 19:22 LAT, and **its disc is clear at 19:26 LAT**, the minute of sunset, over the southern shoulder of Mont Lambert, above the southern part of the lower town (section 3).
- **Civil dusk** ends at **20:03 LAT** (38 minutes after sunset); **nautical dusk** at 20:52 (86 minutes).
- **The tide** turns at 18:18 and rises 0.7 m by sunset; the flood reaches the jetty heads at about 20:20 (section 4).
