"use client";

import { useEffect, useRef, useState } from "react";
import { registerProgressSink } from "@/lib/debug";
import { gsap } from "@/lib/gsap";
import { isDebug } from "@/lib/media";

/**
 * `?debug` overlay: frames per second, measured on the shared GSAP ticker
 * and printed twice a second, and scene 1's scroll progress. ScrollTrigger
 * markers are switched on by the scenes themselves when `?debug` is present.
 * Renders nothing on the server, so the static HTML is the same for everyone.
 */
export function DebugOverlay() {
  const [enabled, setEnabled] = useState(false);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setEnabled(isDebug());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const fpsEl = fpsRef.current;
    const progressEl = progressRef.current;
    if (!fpsEl || !progressEl) return;
    const unregister = registerProgressSink("dawn", progressEl);
    let frames = 0;
    let last = performance.now();
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 500) {
        fpsEl.textContent = String(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      unregister();
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div
      data-debug-overlay
      className="fixed top-3 right-3 z-50 rounded-sm bg-black/70 px-3 py-2 text-[13px] leading-5 text-ink tabular-nums"
    >
      <div>
        fps <span ref={fpsRef}>–</span>
      </div>
      <div>
        dawn p <span ref={progressRef}>0.000</span>
      </div>
    </div>
  );
}
