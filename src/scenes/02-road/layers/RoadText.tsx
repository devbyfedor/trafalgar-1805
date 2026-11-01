import { type RoadCaption, roadContent } from "../content";

/**
 * Scene 2's text: real HTML above the chart, set as scene 1's.
 * - The chapter marker, top left, where scene 1's stands; a heading, so
 *   the chapter is in the page's outline under the h1.
 * - The card, lower left in scene 1's title-card place: the date line, at
 *   a fixed place (its text runs with the story and is hidden from
 *   assistive technology, which reads the captions' dates), and the
 *   captions under it, one at a time, in a box as tall as the longest.
 * - A scrim behind the card, as strong as contrast needs over the chart.
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
      <h2
        id="road-title"
        data-el="chapter"
        className="absolute top-[4.6vh] left-[4.6vw] text-[clamp(14px,2vh,21px)] leading-none font-normal text-ink"
      >
        {roadContent.chapter}
      </h2>
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
