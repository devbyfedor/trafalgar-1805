"use client";

import { useEffect, useRef } from "react";
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
 * The images are decorative; the captions carry the story.
 */

export const STILLS: readonly { beat: BeatId; caption?: RoadCaption }[] = [
  { beat: "transition" },
  { beat: "boulogne", caption: "boulogne" },
  { beat: "chase", caption: "chase" },
  { beat: "finisterre", caption: "finisterre" },
  { beat: "cadiz", caption: "cadiz" },
  { beat: "night", caption: "night" },
];

export const stillUrl = (beat: BeatId) => `/stills/scene-02/${beat}.webp`;

export function RoadStills({
  variant,
  showImages,
  progress,
}: {
  variant: "stacked" | "crossfade";
  /** Load the images (stacked: only in the mode that shows them). */
  showImages: boolean;
  /** The scene's progress, for the crossfade. */
  progress?: () => number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "crossfade" || !progress) return;
    const el = ref.current;
    if (!el) return;
    const images = Array.from(el.querySelectorAll<HTMLElement>("[data-still]"));
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
        img.style.opacity = String(Math.min(fadeIn, fadeOut));
      });
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [variant, progress]);

  if (variant === "crossfade") {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className="absolute inset-0 bg-deep-sea"
      >
        {STILLS.map(({ beat }) => (
          // biome-ignore lint/performance/noImgElement: a static export, no image optimiser
          <img
            key={beat}
            data-still={beat}
            src={stillUrl(beat)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-0"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      data-stills="stacked"
      className="hidden bg-deep-sea motion-reduce:block"
    >
      {STILLS.map(({ beat, caption }) => (
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
