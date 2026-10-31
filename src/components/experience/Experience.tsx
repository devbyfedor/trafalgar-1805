"use client";

import { useEffect } from "react";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { ScrollTrigger } from "@/lib/gsap";
import { scenes } from "@/scenes/registry";
import { Credits } from "./Credits";
import { DebugOverlay } from "./DebugOverlay";
import { Fallback } from "./Fallback";

/**
 * Renders the scenes in registry order and the fallback screen. Which of the
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
          <Credits />
        </div>
        <Fallback />
      </main>
      <DebugOverlay />
    </SmoothScroll>
  );
}
