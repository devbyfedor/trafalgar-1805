import { dawnContent } from "../content";

/**
 * Layer 9, the text: real HTML above everything.
 * - Chapter marker, top left.
 * - The title card, lower left in the band of sea below Victory's waterline
 *   (the only area she never crosses): dateline, the h1, the lede; the
 *   closing caption takes the same place after the title leaves.
 * - The scroll cue, bottom centre.
 * - A scrim behind the card, as strong as contrast needs and no more.
 *
 * Initial CSS state is the p = 0 frame in motion mode (title, lede and
 * caption transparent). Reduced motion and the fallback show it differently;
 * see the scene component. Opacity, never visibility, so the text stays in
 * the accessibility tree.
 */
export function TextOverlay() {
  return (
    <div data-layer="text" className="pointer-events-none absolute inset-0">
      <div
        data-el="scrim"
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[42vh] w-[min(78vw,140vh)] fallback:hidden"
        style={{
          background:
            "radial-gradient(ellipse 70% 85% at 18% 100%, rgba(11,17,23,0.5) 0%, rgba(11,17,23,0.32) 42%, rgba(11,17,23,0) 78%)",
        }}
      />
      <p
        data-el="chapter"
        className="absolute top-[4.6vh] left-[4.6vw] text-[clamp(13px,1.85vh,20px)] leading-none text-ink"
      >
        {dawnContent.chapter}
      </p>

      <div
        data-el="card"
        className="absolute bottom-[6.2vh] left-[4.6vw] w-[min(80vh,58vw)]"
      >
        <p
          data-el="dateline"
          className="mb-[1.6vh] text-[clamp(13px,1.85vh,20px)] leading-snug text-ink"
        >
          {dawnContent.dateline}
        </p>
        <div className="relative">
          <div data-el="title-block">
            <h1
              id="dawn-title"
              data-el="title"
              className="title font-display whitespace-nowrap text-[clamp(56px,10.5vh,168px)] leading-[0.95] font-normal tracking-[-0.01em] text-ink"
            >
              {dawnContent.title}
            </h1>
            <p
              data-el="lede"
              className="mt-[2.2vh] max-w-[34em] text-[clamp(16px,2.35vh,27px)] leading-[1.45] text-ink"
            >
              {dawnContent.lede}
            </p>
          </div>
          <p
            data-el="closing"
            className="absolute top-0 left-0 max-w-[30em] text-[clamp(16px,2.35vh,27px)] leading-[1.45] text-ink"
          >
            {dawnContent.closing}
          </p>
        </div>
      </div>

      <div
        data-el="cue"
        aria-hidden="true"
        className="absolute bottom-[3.2vh] left-0 flex w-full flex-col items-center gap-[1vh]"
      >
        <span className="text-[clamp(12px,1.6vh,16px)] leading-none text-ink">
          {dawnContent.scrollCue}
        </span>
        <span className="relative block h-[4.2vh] w-px overflow-hidden bg-ink/25">
          <span
            data-el="cue-line"
            className="absolute inset-x-0 top-0 block h-1/3 bg-ink"
          />
        </span>
      </div>
    </div>
  );
}
