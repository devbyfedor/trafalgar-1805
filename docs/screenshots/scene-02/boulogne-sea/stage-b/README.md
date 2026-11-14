# Boulogne from the sea: stage B, from the chart down to the evening and back

The whole interlude as stage B leaves it, at the owner's size (1280×720 CSS px at device scale 1.5), the quality level pinned to the top, each production build served locally and checked with `scripts/dev/served.mjs`, shot with `scripts/dev/sea-shots.mjs`. The points are the interlude's own parts (`window.__road.scrollForInterlude`): the dive is 1.2 screens of scroll, the hold 3, the rise 1.2. Through the hold the evening goes from the golden light of 18:33 through the sun's last light to the dusk of about 19:45 (`src/scenes/02-road/boulogne-sea/paint/dusk.ts`; `docs/decisions.md`, sessions 29 and 30).

Two builds: frames 01–06, 10 and 20–27 are of the build of `eccebcf` (session 30); frames 07–09 and 11–19 of the build of `9f3508e` (session 29), whose painting is the same (no file under `src/scenes/02-road/boulogne-sea/` has changed since).

The dive:
1. `01-dive-0.00-chart.png`: the chart at Boulogne where the story stops, the flotilla whole, the caption up.
2. `02-dive-0.30-swoop.png`: the camera swoops down and round onto the view's line.
3. `03-dive-0.50-engraving.png`: the chart has turned into an engraving of the same view.
4. `04-dive-0.56-colour-begins.png`: colour comes into the engraving, like a print coloured by hand.
5. `05-dive-0.65-colour-coming.png`: the land's warmth first, then the sky, the water and the craft.
6. `06-dive-0.80-colour-whole.png`: the painting whole while the camera comes down the last metres; the text still out.

The hold, the golden light to the dusk:

7. `07-hold-0.00-golden.png`: the arrival, the approved golden painting.
8. `08-hold-0.20-golden-ends.png`: the golden light at its end; the drift has begun.
9. `09-hold-0.32-last-light.png`: the sun's last light: the land's lit faces orange-red.
10. `10-hold-0.38-the-still-moment.png`: the moment of the still for reduced motion and no WebGL (24): the craft and the shore in the last warm light, the moon risen over Mont Lambert and clear of the chaloupe's rigging.
11. `11-hold-0.45-sunset.png`: the sunset takes the land from the water up; the clouds salmon and rose.
12. `12-hold-0.55-land-in-shade.png`: the land in shade, the clouds still lit; the Earth's shadow rising under the Belt of Venus.
13. `13-hold-0.65-dusk-coming.png`: the fires behind the camps' crests, the first lights, the moon brightening.
14. `14-hold-0.80-lights.png`: the lights up in the camps and the town; the moon's path on the water.
15. `15-hold-1.00-dusk.png`: the dusk at the hold's end: the moon whole, clear of the chaloupe's rigging.
16. `16-hold-1.00-right-camp-and-pavilion-2x.png`: the right camp and Napoleon's pavilion at dusk, twice the size.
17. `17-hold-1.00-town-2x.png`: the lower town's few lit windows, twice the size.
18. `18-hold-1.00-moon-and-its-path-2x.png`: the moon and its path, twice the size.

The rise, back to the chart:

19. `19-rise-0.36-dusk-to-engraving.png`: the dusk turns back into the engraving.
20. `20-rise-0.45-colour-leaving.png`: the last of the colour leaving the engraving.
21. `21-rise-0.50-engraving.png`: the engraving whole.
22. `22-rise-0.70-chart-returns.png`: the chart again, the camera climbing away.
23. `23-rise-1.00-chart.png`: the chart's own frame at Boulogne; the story goes on at the same p.

The stills (reduced motion and no WebGL; `src/scenes/02-road/layers/RoadStills.tsx`):

24. `24-still-boulogne-sea.webp`: the still itself as the site serves it (`public/stills/scene-02/boulogne-sea-1920.webp`; also at 2560×1440 and, for screens wider than 2:1, at 3440×1440): hold 0.38, the idle motion frozen at 15 s, rendered from the painting's lab page.
25. `25-no-webgl-dive-0.85.png`: without WebGL, late in the dive: the view from the sea comes in over Boulogne's chart still while the text is out.
26. `26-no-webgl-hold-0.50.png`: without WebGL, through the hold: the still under the scene's own text, the chapter marker without its scrim.
27. `27-reduced-motion-boulogne.png`: with reduced motion, Boulogne's figure: the chart's still, the view from the sea, the beat's caption.

The approved stage A frames are in `../stage-a/`. The critics' reviews of the first dusk are in `docs/reviews/boulogne-sea/s29-dusk-*.md`.
