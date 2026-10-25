import { Vector3 } from "three";

/**
 * Lighting states of the chart, and the blend between two of them.
 *
 * - dawn: scene 1's sky and sun. The sky stops are scene 1's dawn gradient
 *   (src/scenes/01-dawn/layers/Sky.tsx) read at the elevations its viewport
 *   rows correspond to through a 40° lens with the horizon at 61 % of the
 *   height: the chart's horizon matches the painted one. The sun sits where
 *   scene 1 leaves it, azimuth 102.5° (the computed sunrise azimuth, history
 *   notes) about 4° up.
 * - campaign: low warm light for the summer of the chase, from the
 *   west-north-west, the classic upper-left light of a north-up chart, so
 *   relief never reads inverted.
 * - night: moonless (the moon was a 2 % crescent that rose at 05:19 on
 *   21 October), no sun, the chart in pale ink on dark paper.
 *
 * Colours are sRGB hex values, as in scene 1's CSS.
 */

export type LightId = "dawn" | "campaign" | "night";

export interface LightState {
  id: LightId;
  /** The sun, degrees: azimuth from north clockwise, and elevation. */
  sun: { azimuth: number; elevation: number } | null;
  /** Sky colours at 0, 1.25, 3.33, 6.66, 11.2, 16.9, 24.6, 34.8 and 90° up. */
  sky: readonly string[];
  /** The visible sun disc (0..1) and the glow on the horizon under it. */
  sunDisc: number;
  glowColor: string;
  glow: number;
  /** The colour of the air, for haze seen from above. */
  haze: string;
  /** Haze density factor. */
  hazeDensity: number;
  sea: { deep: string; shallow: string; reflect: number };
  paper: { low: string; high: string };
  ink: { coast: string; pale: string; contour: string };
  light: { sun: string; shade: string; reliefGain: number; shadow: number };
}

export const LIGHT_STATES: Record<LightId, LightState> = {
  dawn: {
    id: "dawn",
    sun: { azimuth: 102.5, elevation: 4.1 },
    sky: [
      "#ecbd88",
      "#e2a878",
      "#d0a283",
      "#ab9a8f",
      "#7a8494",
      "#55687e",
      "#3b5068",
      "#2f4459",
      "#22344a",
    ],
    sunDisc: 1,
    glowColor: "#ffd696",
    glow: 1,
    haze: "#9e9a92",
    hazeDensity: 1,
    sea: { deep: "#2b3f47", shallow: "#3d5961", reflect: 1 },
    paper: { low: "#e3d6bb", high: "#c9ad7f" },
    ink: { coast: "#2a221c", pale: "#d8ceb9", contour: "#5b4a38" },
    light: { sun: "#ffe2b8", shade: "#8d96a6", reliefGain: 0.55, shadow: 0.55 },
  },
  campaign: {
    id: "campaign",
    sun: { azimuth: 292, elevation: 16 },
    sky: [
      "#e6cfa6",
      "#dfc59f",
      "#d3bc9c",
      "#b5ab9f",
      "#8e98a2",
      "#6e8092",
      "#56687d",
      "#47586c",
      "#38485b",
    ],
    sunDisc: 0,
    glowColor: "#f3d8a8",
    glow: 0.55,
    haze: "#a7a69d",
    hazeDensity: 0.85,
    sea: { deep: "#2f4851", shallow: "#43626a", reflect: 0.8 },
    paper: { low: "#e6dbc3", high: "#cdb185" },
    ink: { coast: "#2a221c", pale: "#ddd4c0", contour: "#5b4a38" },
    light: { sun: "#fff0d6", shade: "#9aa1ab", reliefGain: 0.6, shadow: 0.5 },
  },
  night: {
    id: "night",
    sun: null,
    sky: [
      "#2a3442",
      "#26303e",
      "#222b39",
      "#1e2734",
      "#1b2430",
      "#18202b",
      "#151c26",
      "#131922",
      "#10151d",
    ],
    sunDisc: 0,
    glowColor: "#2f3a48",
    glow: 0,
    haze: "#232c37",
    hazeDensity: 1.1,
    sea: { deep: "#141d24", shallow: "#1c2830", reflect: 0.6 },
    paper: { low: "#4b4f52", high: "#44464a" },
    ink: { coast: "#121416", pale: "#8f97a0", contour: "#2b2e31" },
    light: { sun: "#ffffff", shade: "#ffffff", reliefGain: 0, shadow: 0 },
  },
};

type Rgb = readonly [number, number, number];

/** Parsed once per colour, so blending every frame allocates nothing. */
const parsed = new Map<string, Rgb>();

function rgb(hex: string): Rgb {
  let value = parsed.get(hex);
  if (!value) {
    const n = Number.parseInt(hex.slice(1), 16);
    value = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    parsed.set(hex, value);
  }
  return value;
}

function sunVector(az: number, el: number, out: Vector3): Vector3 {
  const a = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  return out.set(
    Math.sin(a) * Math.cos(e),
    Math.cos(a) * Math.cos(e),
    Math.sin(e),
  );
}

/** The blended lighting, as preallocated uniform values (sRGB 0..1). */
export class LightBlend {
  readonly skyStops = Array.from({ length: 9 }, () => new Vector3());
  readonly sunDir = new Vector3(0, 1, 0.07);
  sunDisc = 0;
  readonly glowColor = new Vector3();
  glow = 0;
  readonly haze = new Vector3();
  hazeDensity = 1;
  readonly seaDeep = new Vector3();
  readonly seaShallow = new Vector3();
  seaReflect = 0;
  readonly paperLow = new Vector3();
  readonly paperHigh = new Vector3();
  readonly ink = new Vector3();
  readonly inkPale = new Vector3();
  readonly contourInk = new Vector3();
  readonly sunColor = new Vector3();
  readonly shadeColor = new Vector3();
  reliefGain = 0;
  shadowStrength = 0;
  /** Each state's relief light, whether it has one, and its horizon channel. */
  readonly lightDirA = new Vector3(0, 0, 1);
  readonly lightDirB = new Vector3(0, 0, 1);
  lightOnA = 0;
  lightOnB = 0;
  lightMix = 0;
  readonly slotA = new Vector3();
  readonly slotB = new Vector3();
  /** Night share of the blend (0..1), for things only night shows. */
  night = 0;
  a: LightId = "dawn";
  b: LightId = "dawn";

  private readonly ta = new Vector3();
  private readonly tb = new Vector3();

  /** Horizon-map channel of each sunlit state (R and G). */
  static readonly SLOTS: Record<LightId, number> = {
    dawn: 0,
    campaign: 1,
    night: -1,
  };

  /** Azimuths baked into the horizon maps, radians (R: dawn, G: campaign). */
  static readonly AZIMUTHS = [
    ((LIGHT_STATES.dawn.sun?.azimuth ?? 0) * Math.PI) / 180,
    ((LIGHT_STATES.campaign.sun?.azimuth ?? 0) * Math.PI) / 180,
  ] as const;

  private static mix(out: Vector3, x: string, y: string, t: number): void {
    const [r0, g0, b0] = rgb(x);
    const [r1, g1, b1] = rgb(y);
    out.set(r0 + (r1 - r0) * t, g0 + (g1 - g0) * t, b0 + (b1 - b0) * t);
  }

  private static lerp(x: number, y: number, t: number): number {
    return x + (y - x) * t;
  }

  private static slot(id: LightId, out: Vector3): void {
    const s = LightBlend.SLOTS[id];
    out.set(s === 0 ? 1 : 0, s === 1 ? 1 : 0, 0);
  }

  set(aId: LightId, bId: LightId, t: number): void {
    const a = LIGHT_STATES[aId];
    const b = LIGHT_STATES[bId];
    const mix = LightBlend.mix;
    const lerp = LightBlend.lerp;
    this.a = aId;
    this.b = bId;
    for (let i = 0; i < 9; i++) mix(this.skyStops[i], a.sky[i], b.sky[i], t);
    mix(this.glowColor, a.glowColor, b.glowColor, t);
    mix(this.haze, a.haze, b.haze, t);
    mix(this.seaDeep, a.sea.deep, b.sea.deep, t);
    mix(this.seaShallow, a.sea.shallow, b.sea.shallow, t);
    mix(this.paperLow, a.paper.low, b.paper.low, t);
    mix(this.paperHigh, a.paper.high, b.paper.high, t);
    mix(this.ink, a.ink.coast, b.ink.coast, t);
    mix(this.inkPale, a.ink.pale, b.ink.pale, t);
    mix(this.contourInk, a.ink.contour, b.ink.contour, t);
    mix(this.sunColor, a.light.sun, b.light.sun, t);
    mix(this.shadeColor, a.light.shade, b.light.shade, t);
    this.sunDisc = lerp(a.sunDisc, b.sunDisc, t);
    this.glow = lerp(a.glow, b.glow, t);
    this.hazeDensity = lerp(a.hazeDensity, b.hazeDensity, t);
    this.seaReflect = lerp(a.sea.reflect, b.sea.reflect, t);
    this.reliefGain = lerp(a.light.reliefGain, b.light.reliefGain, t);
    this.shadowStrength = lerp(a.light.shadow, b.light.shadow, t);
    this.night = lerp(aId === "night" ? 1 : 0, bId === "night" ? 1 : 0, t);

    // The sky's sun: the sunlit state's, or a blend when both have one.
    const sa = a.sun;
    const sb = b.sun;
    if (sa) sunVector(sa.azimuth, sa.elevation, this.ta);
    if (sb) sunVector(sb.azimuth, sb.elevation, this.tb);
    if (sa && sb) this.sunDir.copy(this.ta).lerp(this.tb, t).normalize();
    else if (sa) this.sunDir.copy(this.ta);
    else if (sb) this.sunDir.copy(this.tb);

    this.lightDirA.copy(sa ? this.ta : this.lightDirA);
    this.lightDirB.copy(sb ? this.tb : this.lightDirB);
    this.lightOnA = sa ? 1 : 0;
    this.lightOnB = sb ? 1 : 0;
    this.lightMix = t;
    LightBlend.slot(aId, this.slotA);
    LightBlend.slot(bId, this.slotB);
  }
}
