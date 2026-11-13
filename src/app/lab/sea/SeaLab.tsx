"use client";

import { useEffect, useRef, useState } from "react";
import { Vector3 } from "three";
import { gsap } from "@/lib/gsap";
import { BoulogneSea } from "@/scenes/02-road/boulogne-sea/BoulogneSea";
import type { SeaViewHandle } from "@/scenes/02-road/boulogne-sea/handle";
import { interludeView } from "@/scenes/02-road/interludeCamera";
import {
  BOULOGNE,
  BOULOGNE_AT,
  SEA_HOLD,
  type SeaPose,
} from "@/scenes/02-road/interludes";
import type { InterludePhase, InterludeState } from "@/scenes/alive/interlude";

/**
 * Development page for Boulogne's painting alone, without the chart:
 * `?phase=hold&t=0.5` places the camera where the interlude has it
 * (interludeCamera.ts), `&time=12` freezes the idle motion at that second
 * (for shots that compare), `&u=1` forces the dissolve's u (default: the
 * rig's). With `?debug` the pose shows in a corner.
 */
export function SeaLab() {
  const handle = useRef<SeaViewHandle | null>(null);
  const [info, setInfo] = useState("");
  const onReady = useRef((h: SeaViewHandle | null) => {
    handle.current = h;
  }).current;

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const phase = (q.get("phase") ?? "hold") as InterludePhase;
    const t = Number(q.get("t") ?? 0.5);
    const frozen = q.has("time") ? Number(q.get("time")) : null;
    const forceU = q.has("u") ? Number(q.get("u")) : null;
    const eye = new Vector3();
    const target = new Vector3();
    const pose: SeaPose = { ...SEA_HOLD };
    const at: InterludeState = {
      spec: BOULOGNE,
      phase,
      t,
      u: 0,
      screens: 1,
    };
    const u0 = interludeView(phase, t, eye, target, pose);
    const u = forceU ?? u0;
    setInfo(
      `${phase} ${t}: u ${u.toFixed(3)}; x ${pose.x.toFixed(1)} m, h ${pose.h.toFixed(1)} m, pitch ${pose.pitch.toFixed(2)}°, yaw ${pose.yaw.toFixed(2)}°`,
    );
    const tick = (time: number) => {
      handle.current?.frame(BOULOGNE_AT, at, u, pose, frozen ?? time);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-deep-sea">
      <BoulogneSea onReady={onReady} />
      <p
        data-el="sea-lab-info"
        className="absolute right-3 bottom-3 font-text text-[11px] text-ink/70"
      >
        {info}
      </p>
    </main>
  );
}
