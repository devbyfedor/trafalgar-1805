"use client";

import { useEffect, useState } from "react";
import { Craft } from "@/components/ship/craft/Craft";
import { craftBox } from "@/components/ship/craft/geometry/index";
import { CRAFT_SPECS } from "@/components/ship/craft/specs";
import type { CraftLighting, CraftType } from "@/components/ship/craft/types";

/**
 * Dev page: the flotilla's four craft at hero size, on a plain evening
 * backdrop (warm grey to slate, as the eastern sky over the roads), with a
 * scale control (the hull's length in CSS px), the lighting, a sea that
 * covers the hull below the waterline, and the reflection set in it.
 * The state also reads from the query string so screenshots are scripted:
 * ?craft=prame&hull=450&lighting=evening&sea=on&reflection=on&panel=off.
 */

type Which = CraftType | "all";
const WHICH: Which[] = ["all", "prame", "chaloupe", "bateau", "peniche"];
const ORDER: CraftType[] = ["prame", "chaloupe", "bateau", "peniche"];

const SKY =
  "linear-gradient(#56657a 0%, #6f7b8b 34%, #9a9696 62%, #b7a596 80%, #c2ab98 100%)";
const SEA = "linear-gradient(#5b6870 0%, #44535b 30%, #33434b 100%)";

export function CraftLab() {
  const [which, setWhich] = useState<Which>("all");
  const [hull, setHull] = useState(300);
  const [lighting, setLighting] = useState<CraftLighting>("evening");
  const [sea, setSea] = useState(true);
  const [reflection, setReflection] = useState(true);
  const [panel, setPanel] = useState(true);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = q.get("craft") as Which | null;
    if (c && WHICH.includes(c)) setWhich(c);
    const h = Number(q.get("hull"));
    if (h >= 100 && h <= 2400) setHull(h);
    const l = q.get("lighting");
    if (l === "evening" || l === "neutral") setLighting(l);
    if (q.get("sea") === "off") setSea(false);
    if (q.get("reflection") === "off") setReflection(false);
    if (q.get("panel") === "off") setPanel(false);
  }, []);

  const shown = which === "all" ? ORDER : [which];

  return (
    <main
      data-lab
      className="relative min-h-screen w-full"
      style={{ background: "#33434b" }}
    >
      <div className="flex flex-col items-center gap-0">
        {shown.map((type) => {
          const spec = CRAFT_SPECS[type];
          const px = hull / spec.hull.length;
          const box = craftBox(spec);
          const vb = box.viewBox;
          const w = vb.width * px;
          const hgt = vb.height * px;
          const waterline = box.pivot.y * hgt;
          return (
            <section
              key={type}
              data-craft-cell={type}
              className="relative w-full overflow-hidden"
              style={{
                height: which === "all" ? `${Math.ceil(hgt + 70)}px` : "100vh",
                background: SKY,
              }}
            >
              {/* The craft's waterline at 70% of a single view, or near the cell's foot. */}
              <div
                className="absolute"
                style={{
                  left: `calc(50% - ${(box.pivot.x * w).toFixed(1)}px)`,
                  top:
                    which === "all"
                      ? `${(20).toFixed(1)}px`
                      : `calc(70vh - ${waterline.toFixed(1)}px)`,
                  width: `${w}px`,
                  height: `${hgt}px`,
                }}
              >
                {sea ? (
                  <div
                    aria-hidden="true"
                    className="absolute"
                    style={{
                      left: "-200vw",
                      right: "-200vw",
                      top: `${waterline}px`,
                      height: "200vh",
                      background: SEA,
                    }}
                  />
                ) : null}
                <Craft
                  spec={spec}
                  lighting={lighting}
                  pxPerMetre={px}
                  style={{ position: "absolute", left: 0, top: 0 }}
                />
                {sea ? (
                  // The water hides the hull below the waterline.
                  <div
                    aria-hidden="true"
                    className="absolute"
                    style={{
                      left: "-200vw",
                      right: "-200vw",
                      top: `${waterline + 0.5}px`,
                      height: `${hgt}px`,
                      background: SEA,
                    }}
                  />
                ) : null}
                {sea && reflection ? (
                  <div
                    aria-hidden="true"
                    className="absolute"
                    style={{
                      left: 0,
                      top: `${waterline - spec.hull.depthShown * px}px`,
                      opacity: 0.3,
                    }}
                  >
                    <Craft
                      spec={spec}
                      variant="reflection"
                      lighting={lighting}
                      pxPerMetre={px}
                      flip
                    />
                  </div>
                ) : null}
              </div>
              <p
                className="absolute bottom-2 left-3 text-[12px]"
                style={{ color: "#e9e1d0", opacity: 0.75 }}
              >
                {spec.name} · hull {hull} px · {px.toFixed(2)} px/m
              </p>
            </section>
          );
        })}
      </div>

      <form
        hidden={!panel}
        data-lab-controls
        className="fixed top-3 left-3 flex flex-col gap-2 bg-[#14191d]/80 px-3 py-2 text-[13px] text-ink"
        onSubmit={(e) => e.preventDefault()}
      >
        <Radio
          legend="Craft"
          name="craft"
          value={which}
          options={WHICH}
          onChange={(v) => setWhich(v as Which)}
        />
        <label className="flex items-center gap-2">
          <span className="opacity-70">Hull</span>
          <input
            type="range"
            min={150}
            max={1200}
            step={10}
            value={hull}
            onChange={(e) => setHull(Number(e.target.value))}
          />
          <span>{hull} px</span>
        </label>
        <Radio
          legend="Lighting"
          name="lighting"
          value={lighting}
          options={["evening", "neutral"]}
          onChange={(v) => setLighting(v as CraftLighting)}
        />
        <Radio
          legend="Sea"
          name="sea"
          value={sea ? "on" : "off"}
          options={["on", "off"]}
          onChange={(v) => setSea(v === "on")}
        />
        <Radio
          legend="Reflection"
          name="reflection"
          value={reflection ? "on" : "off"}
          options={["on", "off"]}
          onChange={(v) => setReflection(v === "on")}
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
