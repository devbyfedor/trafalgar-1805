"use client";

import { useEffect } from "react";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { ScrollTrigger } from "@/lib/gsap";
import { scenes } from "@/scenes/registry";
import { ToBeContinued } from "@/scenes/ToBeContinued";
import { Credits } from "./Credits";
import { DebugOverlay } from "./DebugOverlay";
import { Fallback } from "./Fallback";

/**
 * Renders the scenes in registry order, the closing card with the credits
 * (one last screen together), and the fallback screen. Which of the
 * two the visitor sees is decided by CSS (the `fallback` variant); each scene
 * mirrors the same query with gsap.matchMedia so the fallback creates no
 * ScrollTriggers, Lenis or loops.
 */
export function Experience() {
  useEffect(() => {
    // Text metrics change when web fonts arrive, including a face that
    // finishes loading after `ready`; pins and positions must follow.
    let cancelled = false;
    const refresh = () => {
      if (!cancelled) ScrollTrigger.refresh();
    };
    document.fonts?.ready.then(refresh);
    document.fonts?.addEventListener("loadingdone", refresh);
    return () => {
      cancelled = true;
      document.fonts?.removeEventListener("loadingdone", refresh);
    };
  }, []);

  return (
    <SmoothScroll>
      <main>
        <div data-story className="fallback:sr-only">
          {scenes.map(({ id, Component }) => (
            <Component key={id} />
          ))}
          {/* Over scene 2's last 10vh with motion: its frame's edge melts into the sea (ToBeContinued). */}
          <div className="relative z-2 -mt-[10vh] flex min-h-[110svh] flex-col motion-reduce:mt-0 motion-reduce:min-h-svh">
            <ToBeContinued />
            <Credits />
          </div>
        </div>
        <Fallback />
      </main>
      <DebugOverlay progress={["dawn", "road"]} />
    </SmoothScroll>
  );
}
