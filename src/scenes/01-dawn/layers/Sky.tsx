import { HORIZON, SUN_X } from "../composition";
import { STAR_FIELD, starPaths } from "./stars";

/**
 * Layer 1, the sky: a pre-dawn and a dawn gradient crossfaded by opacity,
 * the stars, the thin crescent moon and the cloud bank in the east.
 *
 * The dawn gradient is taller than the viewport and rises as it fades in, so
 * the warmth climbs from the horizon instead of washing in everywhere at once.
 * Clouds: the squalls of the night had passed, leaving broken cloud low in
 * the north-east and south-east at daybreak (Gravina's staff log). They are
 * drawn twice, unlit and lit, and crossfaded.
 */

const h = HORIZON * 100;

const NIGHT = `linear-gradient(to bottom, #1a2533 0%, #1e2a3a 18%, #2c3949 ${h - 22}%, #3f4a5b ${h - 6}%, #4a5566 ${h}%, #4a5566 100%)`;

// The dawn layer is 130% tall and starts 30% above the viewport, so stop
// positions are mapped: viewport fraction v sits at (v + 0.3) / 1.3.
const at = (v: number) => `${(((v + 0.3) / 1.3) * 100).toFixed(2)}%`;
const DAWN = `linear-gradient(to bottom, #2f4459 0%, #3b5068 ${at(0)}, #55687e ${at(0.2)}, #7a8494 ${at(0.34)}, #ab9a8f ${at(0.45)}, #d3a882 ${at(0.53)}, #e8b07a ${at(0.58)}, #f2c994 ${at(HORIZON)}, #f2c994 100%)`;

export function Sky() {
  const stars = starPaths();
  return (
    <div data-el="sky" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: NIGHT }} />
      <div
        data-el="sky-dawn"
        className="absolute inset-x-0 -top-[30%] h-[130%] opacity-0"
        style={{ background: DAWN }}
      />
      <svg
        data-el="stars"
        aria-hidden="true"
        focusable="false"
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${STAR_FIELD.width} ${STAR_FIELD.height}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {stars.map((s) => (
          <path key={s.opacity} d={s.d} fill="#e9eef5" opacity={s.opacity} />
        ))}
      </svg>
      <Moon />
      <Clouds />
    </div>
  );
}

/**
 * The waning crescent: about 2% lit, 31 hours before new moon, rising in the
 * east before the sun. Its lit limb faces the sun below the horizon (down and
 * to the left); the horns point away from it.
 */
function Moon() {
  return (
    <div
      data-el="moon"
      className="absolute"
      style={{
        // About 9.5° right of the sunrise point (azimuth 112° against
        // 102.5°); it rises a little as the scene runs.
        left: `calc(${SUN_X * 100}% + 9.5vh)`,
        top: `${h - 4}%`,
        width: "3.4vh",
        height: "3.4vh",
        marginLeft: "-1.7vh",
        marginTop: "-1.7vh",
      }}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="-1 -1 2 2"
        className="h-full w-full overflow-visible"
      >
        <defs>
          <radialGradient id="moon-glow">
            <stop offset="0" stopColor="#dfe6ef" stopOpacity="0.16" />
            <stop offset="1" stopColor="#dfe6ef" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle r="2.6" fill="url(#moon-glow)" />
        {/* Outer limb minus an offset disc leaves a hairline crescent; the
            group rotates it so the lit side faces down-left, toward the sun. */}
        <g transform="rotate(-125)">
          <path
            d="M0 -1A1 1 0 0 1 0 1A0.93 1 0 0 0 0 -1Z"
            fill="#eef1f4"
            opacity="0.9"
          />
        </g>
      </svg>
    </div>
  );
}

/** Low cloud strands in the east, unlit and lit. */
function Clouds() {
  // Cloud strands in a 2400 × 1000 field (1000 = viewport height), drawn
  // as long, flat, slightly broken bands.
  const strands = [
    // Above the sun's path, catching light underneath.
    "M-93 478C-33 470 57 466 147 468C217 470 297 466 357 472C407 477 427 486 377 490C287 496 167 494 67 495C-3 496 -73 494 -103 489C-123 485 -118 481 -93 478Z",
    "M-213 503C-163 498 -93 497 -33 499C7 500 37 504 17 508C-33 512 -113 512 -173 511C-213 510 -233 507 -213 503Z",
    // Low and long to the left of the sunrise, its right end lit.
    "M-483 566C-423 560 -333 557 -253 558C-173 559 -93 562 -43 567C-13 571 -33 576 -83 577C-173 579 -283 579 -373 578C-433 577 -493 575 -508 571C-515 568 -503 567 -483 566Z",
    "M227 548C277 544 347 543 407 545C457 547 507 550 497 555C467 559 387 559 327 558C277 557 227 555 217 552C213 550 217 549 227 548Z",
  ];
  const lit = [
    "M-73 489C27 492 167 491 297 487C347 485 377 487 377 490C287 496 167 494 67 495C-3 496 -73 494 -103 489C-93 489 -83 489 -73 489Z",
    "M-173 509C-113 510 -33 508 19 506C19 507 18 508 17 508C-33 512 -113 512 -173 511C-193 511 -203 510 -208 509Z",
    "M-253 575C-173 575 -93 573 -33 571C-31 573 -43 576 -83 577C-173 579 -283 579 -373 578C-333 577 -293 576 -253 575Z",
    "M307 556C377 556 457 554 499 552C500 553 499 554 497 555C467 559 387 559 327 558C312 558 297 557 287 556Z",
  ];
  // Coordinates are relative to the sun's x (1000 units = viewport height),
  // so the clouds keep their place beside the sun at every aspect ratio.
  const viewBox = "-1000 0 2000 1000";
  const box = {
    left: `calc(${SUN_X * 100}% - 100vh)`,
    width: "200vh",
  } as const;
  return (
    <div data-el="clouds" className="absolute inset-0">
      <svg
        aria-hidden="true"
        focusable="false"
        className="absolute inset-y-0 h-full"
        style={box}
        viewBox={viewBox}
      >
        {strands.map((d) => (
          <path key={d.slice(0, 12)} d={d} fill="#2a3544" />
        ))}
      </svg>
      <svg
        data-el="clouds-dawn"
        aria-hidden="true"
        focusable="false"
        className="absolute inset-y-0 h-full opacity-0"
        style={box}
        viewBox={viewBox}
      >
        {strands.map((d) => (
          <path key={d.slice(0, 12)} d={d} fill="#9b8b8a" />
        ))}
        {lit.map((d) => (
          <path key={d.slice(0, 12)} d={d} fill="#f7cf93" />
        ))}
      </svg>
    </div>
  );
}
