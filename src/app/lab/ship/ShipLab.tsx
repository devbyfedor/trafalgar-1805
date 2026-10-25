"use client";

import { useEffect, useMemo, useState } from "react";
import { buildShip } from "@/components/ship/geometry/index";
import { ShipOfTheLine } from "@/components/ship/ShipOfTheLine";
import { VICTORY_1805 } from "@/components/ship/specs/victory-1805";
import type { Detail, Lighting } from "@/components/ship/types";
import { VICTORY_FLAGS_AT_DAWN } from "@/scenes/01-dawn/composition";

/**
 * Dev page: Victory large on a neutral backdrop, with detail, lighting and
 * close-up controls. The state also reads from the query string
 * (?detail=silhouette&lighting=dawn&focus=bow) so screenshots are scripted;
 * `panel=off` hides the controls for clean close-ups.
 */

type Focus =
  | "whole"
  | "bow"
  | "stern"
  | "main-top"
  | "fore-top"
  | "rigging"
  | "flags";

const FOCI: Focus[] = [
  "whole",
  "bow",
  "stern",
  "main-top",
  "fore-top",
  "rigging",
  "flags",
];

export function ShipLab() {
  const [detail, setDetail] = useState<Detail>("hero");
  const [lighting, setLighting] = useState<Lighting>("dawn");
  const [focus, setFocus] = useState<Focus>("whole");
  const [backdrop, setBackdrop] = useState<"neutral" | "dawn">("neutral");
  const [sea, setSea] = useState<"on" | "off">("on");
  // "dawn" flies what scene 1 shows; "all" adds the ensign, hoisted later.
  const [flags, setFlags] = useState<"dawn" | "all">("dawn");
  const [panel, setPanel] = useState(true);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const d = q.get("detail");
    if (d === "hero" || d === "silhouette") setDetail(d);
    const l = q.get("lighting");
    if (l === "neutral" || l === "dawn") setLighting(l);
    const f = q.get("focus") as Focus | null;
    if (f && FOCI.includes(f)) setFocus(f);
    const b = q.get("backdrop");
    if (b === "neutral" || b === "dawn") setBackdrop(b);
    const w = q.get("sea");
    if (w === "on" || w === "off") setSea(w);
    const fl = q.get("flags");
    if (fl === "dawn" || fl === "all") setFlags(fl);
    if (q.get("panel") === "off") setPanel(false);
  }, []);

  const geometry = useMemo(() => buildShip(VICTORY_1805), []);
  const vb = geometry.viewBox;

  // Focus points in ship space (metres) and the zoom for each.
  const target = useMemo(() => {
    const masts = geometry.rig.masts;
    const main = masts.get("main");
    const fore = masts.get("fore");
    const stem = geometry.hull.stemAtWaterline;
    switch (focus) {
      case "bow":
        return { x: stem[0] + 3, y: 7, zoom: 3.2 };
      case "stern":
        return { x: 3, y: 9, zoom: 3.2 };
      case "main-top":
        return {
          x: main?.spec.x ?? 27,
          y: (main?.spec.topY ?? 25) + 1,
          zoom: 3.6,
        };
      case "fore-top":
        return {
          x: fore?.spec.x ?? 46,
          y: (fore?.spec.crosstreesY ?? 40) - 1,
          zoom: 3.6,
        };
      case "rigging":
        return { x: (main?.spec.x ?? 27) - 2, y: 15, zoom: 3 };
      case "flags":
        return {
          x: (fore?.spec.x ?? 46) + 2,
          y: (fore?.spec.truckY ?? 57) - 2,
          zoom: 3.6,
        };
      default:
        return null;
    }
  }, [focus, geometry]);

  // The ship box is sized to fit the viewport; zoom scales it about the target.
  const shipStyle = target
    ? {
        transform: `scale(${target.zoom})`,
        transformOrigin: `${((target.x - vb.x) / vb.width) * 100}% ${((-target.y - vb.y) / vb.height) * 100}%`,
      }
    : undefined;

  return (
    <main
      data-lab
      className="relative h-screen w-full overflow-hidden"
      style={{
        background:
          backdrop === "dawn"
            ? "linear-gradient(#3b5068 0%, #6e7c8c 38%, #b9a08c 62%, #e8b07a 82%, #f2c994 100%)"
            : "linear-gradient(#9aa3a8, #7f888e)",
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center p-[3vh]">
        <div
          className="relative"
          style={{
            height: "94vh",
            aspectRatio: `${vb.width} / ${vb.height}`,
            maxWidth: "96vw",
            ...shipStyle,
          }}
        >
          <ShipOfTheLine
            spec={VICTORY_1805}
            detail={detail}
            lighting={lighting}
            fill="#2c333b"
            flying={flags === "dawn" ? VICTORY_FLAGS_AT_DAWN : undefined}
            style={{ width: "100%" }}
          />
          {sea === "on" ? (
            <div
              aria-hidden="true"
              className="absolute -inset-x-[30%] bottom-[-30%] bg-[#34505a]"
              style={{ top: `${(-vb.y / vb.height) * 100}%` }}
            />
          ) : null}
        </div>
      </div>

      <form
        hidden={!panel}
        data-lab-controls
        className="absolute top-3 left-3 flex flex-col gap-2 bg-[#14191d]/80 px-3 py-2 text-[13px] text-ink"
        onSubmit={(e) => e.preventDefault()}
      >
        <Radio
          legend="Detail"
          name="detail"
          value={detail}
          options={["hero", "silhouette"]}
          onChange={(v) => setDetail(v as Detail)}
        />
        <Radio
          legend="Lighting"
          name="lighting"
          value={lighting}
          options={["neutral", "dawn"]}
          onChange={(v) => setLighting(v as Lighting)}
        />
        <Radio
          legend="Backdrop"
          name="backdrop"
          value={backdrop}
          options={["neutral", "dawn"]}
          onChange={(v) => setBackdrop(v as "neutral" | "dawn")}
        />
        <Radio
          legend="Sea"
          name="sea"
          value={sea}
          options={["on", "off"]}
          onChange={(v) => setSea(v as "on" | "off")}
        />
        <Radio
          legend="Flags"
          name="flags"
          value={flags}
          options={["dawn", "all"]}
          onChange={(v) => setFlags(v as "dawn" | "all")}
        />
        <Radio
          legend="Focus"
          name="focus"
          value={focus}
          options={FOCI}
          onChange={(v) => setFocus(v as Focus)}
        />
      </form>
    </main>
  );
}

function Radio({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-x-3">
      <legend className="float-left mr-2 opacity-70">{legend}</legend>
      {options.map((option) => (
        <label key={option} className="flex items-center gap-1">
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          {option}
        </label>
      ))}
    </fieldset>
  );
}
