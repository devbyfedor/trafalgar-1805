"use client";

import { useEffect, useState } from "react";
import { buildShip } from "@/components/ship/geometry/index";
import { ShipOfTheLine } from "@/components/ship/ShipOfTheLine";
import { VICTORY_1805 } from "@/components/ship/specs/victory-1805";
import { FALLBACK_QUERY } from "@/lib/media";
import { VICTORY_FLAGS_AT_DAWN } from "@/scenes/01-dawn/composition";
import { dawnContent } from "@/scenes/01-dawn/content";

/**
 * The single screen phones and tablets get instead of the scene: a static
 * composition of Victory in dawn light above the title and dateline. Shown
 * by CSS alone (the `fallback` variant), so the server HTML is the same for
 * everyone and nothing mismatches on hydration. It creates no ScrollTriggers,
 * no Lenis and no animation loops.
 *
 * The ship is mounted on the client only while the fallback query matches,
 * so desktop pages carry no second copy of the hero art.
 *
 * On a phone held sideways (landscape, at most 540px tall, browser bars
 * and all, down to 280px) the horizon rises to 40%, the ship is smaller and
 * stands to the right of the text column, and the type is held by the
 * height, so the card lies in the sea below her waterline (session 43;
 * upright, the screen is as approved: the variables' defaults are its
 * values).
 *
 * The page's only h1 lives in scene 1, which stays in the accessibility tree
 * (visually hidden) in fallback mode, so the title and dateline here are
 * visual duplicates and hidden from assistive technology. The notice is
 * real text.
 */

const vb = buildShip(VICTORY_1805).viewBox;
/** Height over width of the ship's box, and its waterline from the top. */
const ASPECT = vb.height / vb.width;
const WATERLINE = -vb.y / vb.height;
/*
 * The horizon (--horizon, of the screen's height), Victory's waterline and
 * her height above it (--ship-wl and --ship-h, in svh): 50%, 56svh and
 * 46svh, or 40%, 46svh and 40svh on a phone held sideways (the variant
 * [@media(orientation:landscape)_and_(max-height:540px)], written out in full in each class so Tailwind finds it).
 */

function useFallbackMatch(): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(FALLBACK_QUERY);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return matches;
}

export function Fallback() {
  const showArt = useFallbackMatch();
  return (
    <div
      data-fallback
      className="relative hidden min-h-svh flex-col justify-end overflow-hidden bg-deep-sea px-6 pt-16 pb-12 [--horizon:50%] [--ship-h:46svh] [--ship-wl:56svh] fallback:flex [@media(orientation:landscape)_and_(max-height:540px)]:pb-4 [@media(orientation:landscape)_and_(max-height:540px)]:[--horizon:40%] [@media(orientation:landscape)_and_(max-height:540px)]:[--ship-h:40svh] [@media(orientation:landscape)_and_(max-height:540px)]:[--ship-wl:46svh]"
    >
      <div aria-hidden="true" className="absolute inset-0">
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: "var(--horizon)",
            background:
              "linear-gradient(to bottom, #3b5068 0%, #6e7c8c 40%, #b9a08c 70%, #e2a878 90%, #ecbd88 100%)",
          }}
        />
        <div
          className="absolute"
          style={{
            right: "-30%",
            width: "90%",
            top: "calc(var(--horizon) - 22%)",
            height: "44%",
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,222,165,0.75) 0%, rgba(248,196,128,0.3) 30%, rgba(232,176,122,0) 70%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            top: "var(--horizon)",
            background:
              "linear-gradient(to bottom, #6f7473 0%, #45585f 12%, #344a53 35%, #24363d 100%)",
          }}
        />
        {showArt ? (
          // Cut at the waterline: nothing below it shows.
          <div
            className="absolute left-1/2 overflow-hidden [@media(orientation:landscape)_and_(max-height:540px)]:left-[70%]"
            style={
              {
                "--w": `min(96vw, calc(var(--ship-h) / ${ASPECT}))`,
                width: "var(--w)",
                height: `calc(var(--w) * ${ASPECT * WATERLINE})`,
                marginLeft: "calc(var(--w) / -2)",
                top: `calc(var(--ship-wl) - var(--w) * ${ASPECT * WATERLINE})`,
              } as React.CSSProperties
            }
          >
            <ShipOfTheLine
              spec={VICTORY_1805}
              detail="hero"
              lighting="dawn"
              warmth={1}
              flying={VICTORY_FLAGS_AT_DAWN}
              showBowWave={false}
              style={{ width: "100%" }}
            />
          </div>
        ) : null}
        <div
          className="absolute inset-x-0 bottom-0 h-[45%]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(27,37,41,0) 0%, rgba(27,37,41,0.55) 60%, rgba(27,37,41,0.8) 100%)",
          }}
        />
      </div>
      <div className="relative">
        <p
          aria-hidden="true"
          className="text-[15px] text-ink [@media(orientation:landscape)_and_(max-height:540px)]:text-[13px]"
        >
          {dawnContent.dateline}
        </p>
        <p
          aria-hidden="true"
          className="mt-2 font-display text-[clamp(48px,16vw,96px)] [@media(orientation:landscape)_and_(max-height:540px)]:text-[clamp(32px,14svh,96px)] leading-[0.95] tracking-[-0.01em] text-ink [font-optical-sizing:auto]"
        >
          {dawnContent.title}
        </p>
        <p className="mt-6 max-w-[28em] text-[16px] leading-[1.45] text-ink [@media(orientation:landscape)_and_(max-height:540px)]:mt-4 [@media(orientation:landscape)_and_(max-height:540px)]:text-[14px]">
          {dawnContent.fallbackNotice}
        </p>
      </div>
    </div>
  );
}
