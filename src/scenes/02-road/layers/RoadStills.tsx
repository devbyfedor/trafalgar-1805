"use client";

import { Fragment, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { BEATS, type BeatId } from "../beats";
import { type RoadCaption, roadContent } from "../content";

/**
 * Scene 2 as a sequence of stills, one per beat, rendered from the scene
 * itself (`npm run stills`) into public/stills/scene-02/. Used where the
 * chart can't run (docs/scene-02-brief.md, "Fallbacks and accessibility"):
 * - "stacked", for reduced motion: each still with its caption, one after
 *   another in the page, no pin; the captions are always in the HTML (so
 *   they reach assistive technology in every mode), the images only load
 *   when this mode is in use;
 * - "crossfade", when WebGL is unavailable or its context is lost for good:
 *   inside the pinned stage, the still of the beat in progress, crossfading
 *   as the scroll goes on, under the scene's own captions and date line.
 * Boulogne's beat has a second still, its view from the sea (the painting
 * of "Boulogne from the sea", docs/scene-02-boulogne-brief.md, at a moment
 * of the hold): stacked, it follows the chart's still under the beat's
 * caption; in the pinned stage it comes in over the chart's still through
 * the interlude's dive, holds, and goes on the rise (interludes.ts,
 * seaStillAt), as the painting itself does.
 * The images are decorative; the captions carry the story.
 */

export const STILLS: readonly {
  beat: BeatId;
  caption?: RoadCaption;
  /** The beat's interlude has a still of its view from the sea (SEA_STILL). */
  sea?: boolean;
}[] = [
  { beat: "transition" },
  { beat: "boulogne", caption: "boulogne", sea: true },
  { beat: "chase", caption: "chase" },
  { beat: "finisterre", caption: "finisterre" },
  { beat: "cadiz", caption: "cadiz" },
  { beat: "night", caption: "night" },
];

export const stillUrl = (beat: BeatId) => `/stills/scene-02/${beat}.webp`;

/**
 * Boulogne's view from the sea, rendered from the painting's lab page
 * (tests/e2e/stills.spec.ts): 16:9 at 2560×1440 and 1920×1080 device px,
 * and as a wide screen shows it, 3440×1440, for the pinned stage on
 * screens wider than 2:1 (the painting's own frame is wider there, so a
 * 16:9 still would lose its sky and its water to the crop).
 */
export const SEA_STILL = {
  src: "/stills/scene-02/boulogne-sea.webp",
  srcSet:
    "/stills/scene-02/boulogne-sea-1920.webp 1920w, /stills/scene-02/boulogne-sea.webp 2560w",
  wide: "/stills/scene-02/boulogne-sea-wide.webp",
  wideMedia: "(min-aspect-ratio: 2/1)",
} as const;

export function RoadStills({
  variant,
  showImages,
  progress,
  sea,
}: {
  variant: "stacked" | "crossfade";
  /** Load the images (stacked: only in the mode that shows them). */
  showImages: boolean;
  /** The scene's progress, for the crossfade. */
  progress?: () => number;
  /** How much the view from the sea covers its beat's still (0..1), for the crossfade. */
  sea?: () => number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "crossfade" || !progress) return;
    const el = ref.current;
    if (!el) return;
    const images = Array.from(el.querySelectorAll<HTMLElement>("[data-still]"));
    const seaView = el.querySelector<HTMLElement>("[data-still-sea]");
    const tick = () => {
      const p = progress();
      images.forEach((img, i) => {
        const [from, to] = BEATS[STILLS[i].beat];
        const fadeIn =
          i === 0 ? 1 : Math.min(1, Math.max(0, (p - from + 0.012) / 0.024));
        const fadeOut =
          i === STILLS.length - 1
            ? 1
            : Math.min(1, Math.max(0, (to + 0.012 - p) / 0.024));
        const shown = Math.min(fadeIn, fadeOut);
        img.style.opacity = String(shown);
        if (STILLS[i].sea && seaView)
          seaView.style.opacity = String(shown * (sea?.() ?? 0));
      });
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [variant, progress, sea]);

  if (variant === "crossfade") {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className="absolute inset-0 bg-deep-sea"
      >
        {STILLS.map(({ beat, sea: hasSea }) => (
          <Fragment key={beat}>
            {/* biome-ignore lint/performance/noImgElement: a static export, no image optimiser */}
            <img
              data-still={beat}
              src={stillUrl(beat)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-0"
            />
            {hasSea ? (
              <picture
                data-still-sea={beat}
                className="absolute inset-0 block opacity-0"
              >
                <source media={SEA_STILL.wideMedia} srcSet={SEA_STILL.wide} />
                <img
                  src={SEA_STILL.src}
                  srcSet={SEA_STILL.srcSet}
                  sizes="100vw"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </picture>
            ) : null}
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <div
      data-stills="stacked"
      className="hidden bg-deep-sea motion-reduce:block"
    >
      {STILLS.map(({ beat, caption, sea: hasSea }) => (
        <figure key={beat} className="relative m-0">
          {showImages ? (
            // biome-ignore lint/performance/noImgElement: a static export, no image optimiser
            <img
              src={stillUrl(beat)}
              alt=""
              loading="lazy"
              className="block aspect-video w-full object-cover"
            />
          ) : null}
          {showImages && hasSea ? (
            // biome-ignore lint/performance/noImgElement: a static export, no image optimiser
            <img
              data-still-sea={beat}
              src={SEA_STILL.src}
              srcSet={SEA_STILL.srcSet}
              sizes="100vw"
              alt=""
              loading="lazy"
              className="block aspect-video w-full object-cover"
            />
          ) : null}
          {caption ? (
            <figcaption className="px-[4.6vw] pt-[3vh] pb-[7vh] text-[clamp(16px,2.35vh,27px)] leading-[1.45] text-ink">
              <span className="block max-w-[34em]">
                {roadContent.captions[caption]}
              </span>
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
