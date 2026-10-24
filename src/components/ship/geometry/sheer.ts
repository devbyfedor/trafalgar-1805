import type { SheerLine, SheerSpec } from "../types";

/**
 * Height of a line that follows the ship's sheer: lowest at `lowX`, rising
 * quadratically toward the bow and the stern. Every horizontal feature of the
 * side (wales, bands, port sills, rails) uses this, so they stay parallel.
 */
export function sheerY(line: SheerLine, sheer: SheerSpec, x: number): number {
  if (x <= sheer.lowX) {
    const t = (sheer.lowX - x) / (sheer.lowX - sheer.aftX);
    return line.y + line.riseAft * t * t;
  }
  const t = (x - sheer.lowX) / (sheer.fwdX - sheer.lowX);
  return line.y + line.riseFwd * t * t;
}

/** A line offset vertically from another, keeping its rises. */
export function offsetLine(line: SheerLine, dy: number): SheerLine {
  return { ...line, y: line.y + dy };
}

/** Samples a sheer line between two x positions. */
export function sampleSheer(
  line: SheerLine,
  sheer: SheerSpec,
  x0: number,
  x1: number,
  steps = 24,
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    pts.push([x, sheerY(line, sheer, x)]);
  }
  return pts;
}
