/**
 * A small bow wave: a curl of foam at the stem and a short wash running aft
 * along the waterline. Victory makes perhaps two or three knots in the light
 * air of the morning, so it stays modest. Static art; the scene animates the
 * wrapper (scale and opacity) in time with her pitch.
 *
 * Local coordinates in metres: x = 0 at the stem, y = 0 at the waterline,
 * y down (SVG). The drawing spans x from -LENGTH to +1.6.
 */
export const BOW_WAVE_LENGTH = 7.5;
export const BOW_WAVE_BOX = {
  x: -BOW_WAVE_LENGTH,
  y: -1.1,
  width: BOW_WAVE_LENGTH + 1.8,
  height: 1.9,
};

export function BowWaveArt() {
  const { x, y, width, height } = BOW_WAVE_BOX;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`${x} ${y} ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Wash along the hull. */}
      <path
        d="M-7.4 0.15C-5.6 -0.05 -3.6 -0.12 -1.6 -0.28C-0.8 -0.36 -0.1 -0.62 0.5 -0.78C0.9 -0.7 1.25 -0.42 1.5 -0.12C1.1 0.02 0.6 0.08 0 0.12C-2.2 0.32 -4.8 0.34 -7.4 0.3Z"
        fill="#dfe3df"
        opacity="0.55"
      />
      {/* The curl at the stem. */}
      <path
        d="M-1.2 -0.22C-0.6 -0.5 0 -0.95 0.55 -1.02C1 -0.92 1.4 -0.55 1.58 -0.1C1.2 -0.18 0.85 -0.38 0.45 -0.45C0 -0.38 -0.6 -0.18 -1.2 -0.22Z"
        fill="#f1f1ea"
        opacity="0.85"
      />
      {/* Streaks of foam left behind. */}
      <path
        d="M-6.6 0.05L-5.1 -0.02M-4.6 0.12L-3.1 0.02M-2.8 -0.08L-1.9 -0.15M-5.8 0.24L-4.9 0.2"
        stroke="#e8ebe6"
        strokeWidth="0.07"
        strokeLinecap="round"
        opacity="0.6"
        fill="none"
      />
    </svg>
  );
}
