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
              "radial-gradient(circle, rgba(255,232,190,0.55) 0%, rgba(255,214,150,0.18) 38%, rgba(255,214,150,0) 70%)",
          }}
        />
        <div
          data-el="sun-high"
          className="absolute inset-0 rounded-full opacity-0"
          style={{
            background:
              "radial-gradient(circle, #fff6df 0%, #ffe9bd 62%, #ffe2a8 100%)",
          }}
        />
        <div
          data-el="sun-low"
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, #ffe2ae 0%, #fbc98c 64%, #f3b06e 100%)",
            transform: "scaleY(0.86)",
          }}
        />
      </div>
    </div>
  );
}
