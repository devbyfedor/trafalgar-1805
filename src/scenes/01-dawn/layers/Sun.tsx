import { HORIZON, SUN_DIAMETER_VH, SUN_X } from "../composition";

/**
 * Layer 2, the sun: a glow that grows behind the horizon on the right, and
 * the disc, which rises (a transform on its wrapper). Two discs are stacked
 * and crossfaded: low on the horizon the sun is orange and flattened by
 * refraction; clear of it, paler and round. The sea layers in front hide
 * whatever is still below the horizon.
 */
export function Sun() {
  const d = SUN_DIAMETER_VH;
  return (
    <div data-el="sun" className="absolute inset-0">
      <div
        data-el="sun-glow"
        className="absolute opacity-0"
        style={{
          left: `${SUN_X * 100}%`,
          top: `${HORIZON * 100}%`,
          width: "150vh",
          height: "70vh",
          marginLeft: "-75vh",
          marginTop: "-35vh",
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,214,150,0.62) 0%, rgba(248,196,128,0.32) 24%, rgba(232,176,122,0.12) 52%, rgba(232,176,122,0) 72%)",
        }}
      />
      <div
        data-el="sun-disc"
        className="absolute"
        style={{
          left: `${SUN_X * 100}%`,
          top: `${HORIZON * 100}%`,
          width: `${d}vh`,
          height: `${d}vh`,
          marginLeft: `${-d / 2}vh`,
          marginTop: `${-d / 2}vh`,
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            inset: `${-d * 0.9}vh`,
            background:
              "radial-gradient(circle, rgba(255,240,212,0.8) 0%, rgba(255,226,170,0.34) 30%, rgba(255,214,150,0.1) 52%, rgba(255,214,150,0) 72%)",
          }}
        />
        <div
          data-el="sun-high"
          className="absolute inset-0 rounded-full opacity-0"
          style={{
            background:
              "radial-gradient(circle, #fffcf3 0%, #fff6e0 70%, #ffefcc 100%)",
          }}
        />
        <div
          data-el="sun-low"
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, #ffeccb 0%, #ffdcaa 70%, #fbcb8e 100%)",
          }}
        />
      </div>
    </div>
  );
}
