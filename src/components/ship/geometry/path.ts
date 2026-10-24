import type { Vec } from "./vec";

/**
 * A tiny SVG path builder working in ship space (metres, y up). It flips y on
 * output so the SVG user unit is one metre, and rounds to centimetres to keep
 * the markup small and identical between server and client renders.
 */

const fmt = (n: number): string => {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? "0" : String(r);
};

const pt = (p: Vec): string => `${fmt(p[0])} ${fmt(-p[1])}`;

export class PathBuilder {
  private readonly parts: string[] = [];

  moveTo(p: Vec): this {
    this.parts.push(`M${pt(p)}`);
    return this;
  }

  lineTo(p: Vec): this {
    this.parts.push(`L${pt(p)}`);
    return this;
  }

  quadTo(c: Vec, p: Vec): this {
    this.parts.push(`Q${pt(c)} ${pt(p)}`);
    return this;
  }

  cubicTo(c1: Vec, c2: Vec, p: Vec): this {
    this.parts.push(`C${pt(c1)} ${pt(c2)} ${pt(p)}`);
    return this;
  }

  close(): this {
    this.parts.push("Z");
    return this;
  }

  /** Open polyline through the points. */
  polyline(points: readonly Vec[]): this {
    points.forEach((p, i) => {
      if (i === 0) this.moveTo(p);
      else this.lineTo(p);
    });
    return this;
  }

  /** Closed polygon through the points. */
  polygon(points: readonly Vec[]): this {
    return this.polyline(points).close();
  }

  /** A straight segment as its own subpath (for line bundles such as ratlines). */
  segment(a: Vec, b: Vec): this {
    return this.moveTo(a).lineTo(b);
  }

  /** Axis-aligned rectangle; `x0,y0` is the lower-left corner in ship space. */
  rect(x0: number, y0: number, w: number, h: number): this {
    return this.polygon([
      [x0, y0],
      [x0 + w, y0],
      [x0 + w, y0 + h],
      [x0, y0 + h],
    ]);
  }

  /** Append another builder's commands (for merging many shapes into one element). */
  append(other: PathBuilder): this {
    this.parts.push(...other.parts);
    return this;
  }

  /** Append already-serialised path data. */
  appendData(d: string): this {
    if (d) this.parts.push(d);
    return this;
  }

  get isEmpty(): boolean {
    return this.parts.length === 0;
  }

  toString(): string {
    return this.parts.join("");
  }
}

export const path = (): PathBuilder => new PathBuilder();

/** Format a ship-space point for SVG attributes (x, y-down). */
export const svgPoint = (p: Vec): { x: number; y: number } => ({
  x: Math.round(p[0] * 100) / 100,
  y: Math.round(-p[1] * 100) / 100,
});
