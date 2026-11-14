/**
 * A long, narrow pennant streaming from a masthead, in the same frame as
 * flags.ts's flags: the hoist's top at (0, 0), x along the fly, y down, in
 * metres. Tapered to a point, sagging a little in a light breeze, waved.
 * Three colours along it, as the French ensign's: blue at the hoist, white,
 * then red to the point.
 */

export interface PennantShape {
  layers: { fill: string; d: string }[];
  outline: string;
  width: number;
  height: number;
}

export interface PennantWave {
  amplitude: number;
  waves: number;
  phase: number;
  droop: number;
}

const BLUE = "#1F2F5C";
const WHITE = "#ECE6D8";
const RED = "#B3261E";

const f = (n: number) => String(Math.round(n * 1000) / 1000);

export function buildPennant(
  length: number,
  hoist: number,
  wave: PennantWave,
  colours: { blue: string; white: string; red: string } = {
    blue: BLUE,
    white: WHITE,
    red: RED,
  },
): PennantShape {
  const k = Math.PI * 2 * wave.waves;
  const centre = (u: number): [number, number] => {
    const a = wave.amplitude * hoist * (0.3 + 2.2 * u);
    const x = u * length * (1 - 0.03 * wave.waves);
    const y =
      hoist / 2 +
      Math.sin(k * u + wave.phase) * a +
      wave.droop * length * u * u;
    return [x, y];
  };
  const half = (u: number) => (hoist / 2) * (1 - 0.9 * u);
  const edge = (u0: number, u1: number): string => {
    const n = Math.max(2, Math.ceil((u1 - u0) * 40));
    const top: string[] = [];
    const bottom: string[] = [];
    for (let i = 0; i <= n; i++) {
      const u = u0 + ((u1 - u0) * i) / n;
      const [x, y] = centre(u);
      const w = half(u);
      top.push(`${f(x)} ${f(y - w)}`);
      bottom.push(`${f(x)} ${f(y + w)}`);
    }
    return `M${top.join("L")}L${bottom.reverse().join("L")}Z`;
  };
  const layers = [
    // The decree of 1794: a fifth blue at the mast, a fifth white, three fifths red.
    { fill: colours.blue, d: edge(0, 0.2) },
    { fill: colours.white, d: edge(0.2, 0.4) },
    { fill: colours.red, d: edge(0.4, 1) },
  ];
  return {
    layers,
    outline: edge(0, 1),
    width: length,
    height: hoist * (1 + 2.6 * wave.amplitude * 2) + wave.droop * length,
  };
}
