import { type RoadCaption, roadContent } from "../content";
import { type Falls, softPatch, softScrim } from "../ink";

/** The deeper scrims' strength at their heart (ink.ts). */
const DEEP_PEAK = 0.8;
const CHAPTER_PEAK = 0.65;
/**
 * The chapter marker's scrim hugs its line, in ems of the marker's type:
 * even over the line and PAD_X, PAD_Y beyond it (the glyphs' ascents and
 * descents stand a little outside a line box of leading 1), then falling
 * away over CHAPTER_FALLS (top, right, bottom, left). Toward the chart the
 * falls are long (11 em after the line, 6 em below it), so it fades out
 * slowly; toward the corner they are 3 em above and 5 em before it, or as
 * much of the marker's margins as is left where those are shorter (4.6vh
 * over it and 4.6vw before it, the wrapper's top and left: 2.05 and 3.69 em
 * at 1280×720, 2.12 and 3.81 at 1920×1080), so the scrim never reaches past
 * the window's edges and is nothing at them.
 */
const CHAPTER_PAD_X = 0.4;
const CHAPTER_PAD_Y = 0.25;
const CHAPTER_FALLS: Falls = [
  `min(3em, 4.6vh - ${CHAPTER_PAD_Y}em)`,
  "11em",
  "6em",
  `min(5em, 4.6vw - ${CHAPTER_PAD_X}em)`,
];
const CHAPTER_INSET = CHAPTER_FALLS.map(
  (fall, i) => `calc(-${i % 2 ? CHAPTER_PAD_X : CHAPTER_PAD_Y}em - ${fall})`,
).join(" ");

/**
 * Scene 2's text: real HTML above the chart, set as scene 1's, always in
 * the page's light ink.
 * - The chapter marker, top left, where scene 1's stands; a heading, so
 *   the chapter is in the page's outline under the h1.
 * - The card, lower left in scene 1's title-card place: the date line, at
 *   a fixed place (its text runs with the story and is hidden from
 *   assistive technology, which reads the captions' dates), and the
 *   captions under it, one at a time, in a box as tall as the longest.
 * - A scrim behind the card, as strong as contrast needs over the chart;
 *   a deeper one where the camera passes over bright land between
 *   framings that keep the sea under the card (ink.ts, DEEP_SCRIM); and
 *   a small one hugging the chapter marker's line, as strong as each
 *   daylight view's haze or land under it needs (CHAPTER_SCRIM), so the
 *   corner itself stays bright. All three are soft, with no edge; the
 *   deeper two come and go over a long stretch of scroll.
 *
 * Initial CSS state is the scene's first frame in motion mode (everything
 * transparent: scene 1's text is still showing). Opacity, never
 * visibility, so the captions stay in the accessibility tree.
 */
export function RoadText() {
  const captions = Object.entries(roadContent.captions) as [
    RoadCaption,
    string,
  ][];
  return (
    <div data-layer="text" className="pointer-events-none absolute inset-0">
      <div
        data-el="scrim"
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[46vh] w-[min(82vw,150vh)] fallback:hidden"
        style={{
          background:
            "radial-gradient(ellipse 72% 88% at 16% 100%, rgba(11,17,23,0.56) 0%, rgba(11,17,23,0.36) 44%, rgba(11,17,23,0) 80%)",
        }}
      />
      <div
        data-el="scrim-deep"
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[80vh] w-[min(100vw,180vh)] opacity-0 fallback:hidden"
        style={{ background: softScrim(DEEP_PEAK, "90% 95%", "14% 100%") }}
      />
      <div className="absolute top-[4.6vh] left-[4.6vw] text-[clamp(14px,2vh,21px)] leading-none">
        <div
          data-el="scrim-chapter"
          aria-hidden="true"
          className="absolute opacity-0 fallback:hidden"
          style={{
            inset: CHAPTER_INSET,
            ...softPatch(CHAPTER_PEAK, CHAPTER_FALLS),
          }}
        />
        <h2
          id="road-title"
          data-el="chapter"
          className="relative font-normal text-ink"
        >
          {roadContent.chapter}
        </h2>
      </div>
      <div
        data-el="card"
        className="absolute bottom-[6.2vh] left-[4.6vw] w-[min(80vh,58vw)]"
      >
        <p
          data-el="dateline"
          aria-hidden="true"
          className="mb-[1vh] text-[clamp(14px,2vh,21px)] leading-snug text-ink [font-variant-numeric:lining-nums_tabular-nums]"
        >
          {" "}
        </p>
        <div className="relative h-[5.8em] text-[clamp(16px,2.35vh,27px)] leading-[1.45]">
          {captions.map(([id, text]) => (
            <p
              key={id}
              data-caption={id}
              className="absolute top-0 left-0 max-w-[30em] text-ink"
            >
              {text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
