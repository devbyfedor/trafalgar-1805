import { createRng } from "@/lib/random";

/**
 * The pre-dawn sky looking north, 21 October 1805, 06:00 local apparent
 * time, 36.2° N 6.1° W. Positions were computed from J2000 coordinates
 * precessed to 1805 (IAU 1976), converted to altitude and azimuth, and laid
 * out with a sinusoidal projection about azimuth 30° so the constellation
 * shapes stay true. Units: 1000 = viewport height; the horizon is at 610.
 * The scene compresses the view (the sun and the enemy are drawn on the
 * right although a true north-facing view would not include the eastern
 * horizon); the stars keep their real arrangement relative to each other.
 *
 * Polaris stands about 36° up; the Plough is in the north-east with its
 * handle pointing down; Cassiopeia stands on end low in the north-west;
 * Capella is high in the north-west; Arcturus is just rising in the
 * east-north-east, where the dawn glow will swallow it first.
 */

export interface Star {
  x: number;
  y: number;
  /** Visual magnitude; brighter stars are larger. */
  mag: number;
}

export const NAMED_STARS: readonly (Star & { name: string })[] = [
  { name: "Polaris", x: 1090, y: 252, mag: 1.98 },
  { name: "Kochab", x: 1235, y: 305, mag: 2.08 },
  { name: "Pherkad", x: 1243, y: 335, mag: 3.0 },
  { name: "Dubhe", x: 1364, y: 102, mag: 1.79 },
  { name: "Merak", x: 1413, y: 85, mag: 2.37 },
  { name: "Phecda", x: 1460, y: 156, mag: 2.44 },
  { name: "Megrez", x: 1430, y: 186, mag: 3.31 },
  { name: "Alioth", x: 1441, y: 240, mag: 1.77 },
  { name: "Mizar", x: 1446, y: 283, mag: 2.27 },
  { name: "Alkaid", x: 1492, y: 337, mag: 1.86 },
  { name: "Capella", x: 886, y: 22, mag: 0.08 },
  { name: "Mirfak", x: 720, y: 207, mag: 1.79 },
  { name: "Schedar", x: 739, y: 408, mag: 2.24 },
  { name: "Caph", x: 779, y: 425, mag: 2.28 },
  { name: "Gamma Cassiopeiae", x: 780, y: 368, mag: 2.47 },
  { name: "Ruchbah", x: 773, y: 338, mag: 2.68 },
  { name: "Segin", x: 817, y: 295, mag: 3.37 },
  { name: "Arcturus", x: 1748, y: 541, mag: -0.05 },
];

export const STAR_FIELD = { width: 2400, height: 1000 } as const;

/** Faint background stars: sparse, seeded, kept above the haze band. */
function faintStars(count: number, seed: number): Star[] {
  const rng = createRng(seed);
  const stars: Star[] = [];
  while (stars.length < count) {
    const x = rng() * STAR_FIELD.width;
    // Thinner toward the horizon, where the haze and the glow will be.
    const y = rng() ** 1.6 * 470;
    const tooClose = NAMED_STARS.some((s) => Math.hypot(s.x - x, s.y - y) < 40);
    if (!tooClose) stars.push({ x, y, mag: 3.6 + rng() * 1.4 });
  }
  return stars;
}

const circle = (x: number, y: number, r: number): string => {
  const f = (n: number) => String(Math.round(n * 10) / 10);
  return `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`;
};

/** Stars grouped by brightness class, one path per class. */
export function starPaths(): { d: string; opacity: number }[] {
  const all = [...NAMED_STARS, ...faintStars(26, 1805)];
  const classes = [
    { max: 1, r: 2.6, opacity: 0.95, d: "" },
    { max: 2.1, r: 1.9, opacity: 0.85, d: "" },
    { max: 2.8, r: 1.5, opacity: 0.7, d: "" },
    { max: 9, r: 1.15, opacity: 0.5, d: "" },
  ];
  for (const s of all) {
    const c =
      classes.find((k) => s.mag <= k.max) ?? classes[classes.length - 1];
    c.d += circle(s.x, s.y, c.r);
  }
  return classes.map(({ d, opacity }) => ({ d, opacity }));
}
