"use client";

import { useEffect } from "react";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { ScrollTrigger } from "@/lib/gsap";
import { scenes } from "@/scenes/registry";
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
    // Text metrics change when web fonts arrive; pins and splits must follow.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SmoothScroll>
      <main>
        <div data-story className="fallback:sr-only">
          {scenes.map(({ id, Component }) => (
            <Component key={id} />
          ))}
        </div>
        <Fallback />
      </main>
      <DebugOverlay />
    </SmoothScroll>
  );
}
