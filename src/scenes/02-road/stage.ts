import { Vector3 } from "three";
import {
  buildDigitAtlas,
  buildGlyphAtlas,
  CameraRig,
  Camps,
  Chart,
  type DigitAtlas,
  fontUrl,
  type GlyphAtlas,
  Glyphs,
  Lettering,
  layOutSoundings,
  loadRivers,
  loadSoundings,
  Rivers,
  SOUNDING_FONT_FILE,
  Soundings,
  Tracks,
} from "@/components/chart";
import { type BenchResult, benchFrames } from "@/components/chart/engine/bench";
import { ShipAnatomy } from "@/components/chart/fx/anatomy";
import { Smoke } from "@/components/chart/fx/Smoke";
import { mercatorScale, worldX, worldY } from "@/components/chart/geo/mercator";
import type { ClashResult } from "@/components/chart/glyphs/clash";
import { glyphPxAt } from "@/components/chart/glyphs/height";
import { GlyphLayout } from "@/components/chart/glyphs/layout";
import { GlyphProbe } from "@/components/chart/glyphs/probe";
import {
  type HeadLabelState,
  HeadLabels,
} from "@/components/chart/lettering/HeadLabels";
import type { LabelState } from "@/components/chart/lettering/Lettering";
import type { TrackLabelState } from "@/components/chart/lettering/TrackLabels";
import type { WaterLift } from "@/components/chart/terrain/liftProbe";
import type { InterludePhase } from "../alive/interlude";
import { CAPTIONS } from "./beats";
import { CAMPS, FLOTILLA, FLOTILLA_TYPES } from "./boulogne";
import { ROAD_FLIGHT } from "./camera";
import {
  FLOTILLA_GATE,
  fleetMarks,
  fleetNames,
  type InterludeView,
  RoadDirector,
  roadHeads,
  squadronMarks,
  squadronNames,
} from "./director";
import {
  anchorageSpreadShift,
  dawnFleet,
  dawnSpreadShift,
  GLYPH_TYPES,
} from "./fleets";
import { GAZETTEER } from "./gazetteer";
import { interludeView } from "./interludeCamera";
import { marksAt, SEA_EYE, type SeaPose } from "./interludes";
import { ARMY_MARCH } from "./march";
import { legTracks, NELSON, VILLENEUVE } from "./routes";
import { BattleSmoke, smokeCapacity } from "./smoke";
import { SOUNDING_ANGLES } from "./soundings";

/** The soundings' ink (Soundings' own default strength). */
const SOUNDING_INK = 0.75;

/** The interlude's chart view (RoadStage.interlude), reused frame to frame. */
const interludeAt: InterludeView & { u: number } = {
  eye: new Vector3(),
  target: new Vector3(),
  fov: SEA_EYE.fov,
  marks: 1,
  u: 0,
};

/** smoothstep: 0 before a, 1 after b. */
function rise(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Scene 2's chart and everything on it. The scene imports this module
 * dynamically, so three.js, the engine and the scene's chart code form a
 * chunk of their own that never enters the initial bundle (brief,
 * "Loading").
 */

export interface RoadStage {
  chart: Chart;
  director: RoadDirector;
  /**
   * Draws the scene at p and reads back every glyph as drawn (GlyphProbe),
   * both fleets ship by ship, then the squadrons: for tests and tuning.
   */
  sample(
    p: number,
    mode?: number,
  ): { fleets: Float32Array; squadrons: Float32Array };
  /**
   * Sets the chart for progress p and draws a frame (gsap.ticker time).
   * With `view`, an interlude's dive or rise: the story at p, the camera
   * and the marks as the view has them (RoadDirector.applyState).
   */
  draw(p: number, time: number, view?: InterludeView): void;
  /**
   * An interlude's camera at a point of it (interludeCamera.ts): the
   * chart's view, its rig's u and how much of the chart's marks shows,
   * with the painting's pose written into `pose`. One object, reused.
   */
  interlude(
    phase: InterludePhase,
    t: number,
    pose: SeaPose,
  ): InterludeView & { u: number };
  /**
   * Development: draws `frames` frames at p, each timed on the GPU and the
   * CPU (engine/bench.ts; scripts/dev/road-bench.mjs). The host holds its
   * own drawing meanwhile. With `alternate`, the chart's objects of that
   * name (Chart.showNamed) are drawn on even frames and hidden on odd ones.
   * With `view`, an interlude's chart at that point (`interlude`).
   */
  bench(
    frames: number,
    p: number,
    alternate?: string,
    view?: InterludeView,
  ): Promise<BenchResult>;
  /** Development: draws the scene at p and probes its water (Chart.probeWaterLift). */
  waterLift(p: number): WaterLift;
  /**
   * Development and checks: draws the scene at p and returns the smoke's
   * puffs as drawn (Smoke.bounds: CSS px boxes and opacity), the coast's
   * distance under each (km, the least of its middle and corners; positive
   * at sea), and the outlines of what the smoke must keep clear of: the
   * names and the caption's card, the fleets' labels, the tracks' dates.
   */
  smoke(p: number): SmokeCheck;
  /**
   * Development and tests: draws the scene at p and finds every glyph whose
   * ink touches land or another glyph's (Chart.probeClash): the fleets are
   * layer 0, the squadrons layer 1, Boulogne's flotilla layer 2. `ink`: the
   * least drawn alpha counted.
   */
  clash(p: number, ink?: number): ClashResult;
  /** Development: each layer's glyphs by name, in mark order. */
  glyphNames(): string[][];
  /**
   * Development: draws the scene at p and returns, per layer and glyph, its
   * foot on screen as drawn, its height and opacity (device px; the foot
   * from the bottom left), and where its intended place (a squadron's
   * head, a ship's own place) projects: [x, y, h, alpha, ix, iy] each.
   */
  motion(p: number): number[][];
  /**
   * Development: how abruptly each glyph's intended place moves on screen at
   * p, split into its own motion on the chart and the camera's: the second
   * differences over p - step, p, p + step (device px) of her place on the
   * chart seen from p's camera, of p's place seen from each step's camera,
   * and of both together, with her drawn height and opacity at p:
   * [own, camera, both, h, alpha] each (scripts/dev/glyph-paths.mjs).
   */
  pathParts(p: number, step: number): number[][];
  /**
   * Development: each fleet ship's true place at p against the chart's
   * coast (the layout's own CPU field): [coast km (negative on land), how
   * far under way 0..1, opacity] each (scripts/dev/glyph-ashore.mjs).
   */
  ashore(p: number): number[];
  /**
   * Development: how far each ship stands, at dawn and at anchor, from her
   * place at the sources' spacing (the owner's licence of 10 November
   * 2026; fleets.ts), km.
   */
  spreadShift(): {
    dawn: { name: string; km: number }[];
    anchorage: { name: string; km: number }[];
  };
  /** Development: both fleets at first light, at the sources' places and as drawn (fleets.ts, dawnFleet). */
  dawnFleet(): ReturnType<typeof dawnFleet>;
  /** Development: each fleet ship's intended place at p (world km) and her opacity: [x, y, opacity] each. */
  fleetAt(p: number): number[];
  /**
   * Development: the camera at p, for laying out the dawn fleets off the
   * page (scripts/dev/fleet-ease.mjs): its view and projection matrices
   * (column-major), the canvas in device px, the device pixel ratio, the
   * eye (world km), the glyph cell's height for its altitude (CSS px), the
   * distance at which glyphs take their nominal size (km) and the haze's
   * visibility (km).
   */
  cameraAt(p: number): {
    view: number[];
    projection: number[];
    width: number;
    height: number;
    dpr: number;
    eye: [number, number, number];
    sizePx: number;
    sizeRef: number;
    hazeVisibility: number;
  };
  /** Development: draws the scene at p and returns every name's state (Lettering.snapshot). */
  labels(p: number): LabelState[];
  /**
   * Development: the detail tile the field's detail layer holds at p and
   * its weight, by the flight's plan made at load (terrain/slot.ts).
   */
  detailAt(p: number): { tile: string | null; weight: number };
  /** Development: draws the scene at p and returns each squadron's layout (GlyphLayout.debug). */
  layoutDebug(p: number): Record<string, unknown>[];
  /**
   * Development and the contrast check: the fleets' labels as they stood in
   * the frame last drawn (HeadLabels.snapshot), and hiding them for a shot
   * of the chart under them.
   */
  routeLabels(
    explain?: boolean,
  ): HeadLabelState[] | ReturnType<HeadLabels["explain"]>;
  hideRouteLabels(hidden: boolean): void;
  /**
   * Development and the checks: the fleets' labels' clock held to a step a
   * frame (1/60: a reader's frames; Infinity: every move made at once),
   * or null for the frame's own time (HeadLabels.setClock).
   */
  labelClock(step: number | null): void;
  /** Development: the tracks' dates and legends as they stood in the frame last drawn (Tracks.snapshot). */
  trackLabels(
    explain?: boolean,
  ): TrackLabelState[] | ReturnType<Tracks["explain"]>;
  /** Development: a glyph's baked sizes by step (GlyphLayout.bakedSizes). */
  bakedSizes(layer: number, i: number, k0: number, k1: number): number[][];
  /** Development: the bake's sizes pass replayed at step k (GlyphLayout.traceBakeStep). */
  bakeTrace(k: number): Record<string, unknown>[];
  /**
   * Development and checks: the scene drawn at p, each fleet gate's
   * opening and how much its ships show (GlyphLayout.gateOpen, gateShown):
   * [British open, combined open, British shown, combined shown, the
   * flotilla's open, the flotilla's shown].
   */
  gates(p: number): number[];
  /** Development: every change of a label's strength (RoadDirector.labelChanges). */
  labelChanges(): ReturnType<RoadDirector["labelChanges"]>;
  /**
   * Development: how far the chart's coast lies from a point at sea along
   * a heading (degrees from north), in ground km, up to `maxKm`; NaN if it
   * finds none (the coast as the layout reads it, with the detail tile the
   * last frame held). For matching a painting's shore to the chart's.
   */
  coastAlong(lon: number, lat: number, heading: number, maxKm?: number): number;
  /**
   * Development: where a site on the sea level stands in the frame at p
   * (normalised device coordinates), how far from the eye (km), how steeply
   * the view meets the chart there (the sine of its elevation) and the
   * frame's CSS px per radian, for sizing names (scripts/dev/name-sizes.mjs).
   */
  siteView(
    p: number,
    lon: number,
    lat: number,
  ): { x: number; y: number; dist: number; sinElev: number; pxPerRad: number };
  resize(width: number, height: number): void;
  /**
   * Bakes the glyph layout's tables for the current viewport, in idle
   * slices (GlyphLayout.bakeBegin); call after each resize. Resolves true
   * when done, false when a newer bake or the scene's end cancels it.
   */
  bake(): Promise<boolean>;
  dispose(): void;
}

/** The glyph layout's tables: a step of p, and the most time a slice of baking takes, ms. */
const BAKE_STEP = 0.001;
const BAKE_SLICE_MS = 4;

/** Waits for the browser to be idle (or a frame, where idle callbacks don't exist). */
function idleSlice(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === "function")
      requestIdleCallback(() => resolve(), { timeout: 200 });
    else setTimeout(resolve, 16);
  });
}

/** What `RoadStage.smoke` returns. */
export interface SmokeCheck {
  /** The canvas, CSS px. */
  width: number;
  height: number;
  /** x0, y0, x1, y1, opacity: five numbers a puff. */
  puffs: number[];
  /** The coast's distance under each puff, km. */
  coast: number[];
  /** Each outline: what it is, its four corners (CSS px) and how much it shows. */
  text: { kind: string; quad: number[]; weight: number }[];
}

export interface RoadStageOptions {
  canvas: HTMLCanvasElement;
  /** The canvas's context, made while the page loaded (engine/context.ts). */
  context?: WebGL2RenderingContext;
  signal: AbortSignal;
  /** The WebGL context is lost for good. */
  onFatal: (reason: string) => void;
  /** Pins a quality level (tests); otherwise the ladder adapts. */
  quality?: number;
  /**
   * The chart's host over the canvas: the caption's card is measured
   * against it, so no lettering lies under the caption.
   */
  labels?: HTMLElement;
}

export async function createRoadStage(
  options: RoadStageOptions,
): Promise<RoadStage> {
  const chart = await Chart.create({
    canvas: options.canvas,
    context: options.context,
    signal: options.signal,
    quality: options.quality,
    onFatal: options.onFatal,
  });
  let atlas: GlyphAtlas | null = null;
  let digits: DigitAtlas | null = null;
  // The soundings, held back with the chart's other marks while an
  // interlude's painting stands for the place (draw's `view.marks`).
  let soundings: Soundings | null = null;
  let soundingMarks = 1;
  try {
    const riverData = await loadRivers(chart.manifest, options.signal);
    const rivers = new Rivers(chart.field, riverData);
    chart.add(rivers, rivers.mesh);
    const legs = [...VILLENEUVE, ...NELSON];
    // The fleets' tracks, drawn by date as the period's track charts drew
    // them; added after the lettering, whose names their dates keep clear of.
    const tracks = new Tracks(chart.field, [
      ...legTracks(VILLENEUVE),
      ...legTracks(NELSON),
      // The army's march to Ulm, drawn by date like them (march.ts).
      ARMY_MARCH,
    ]);
    // The fleets' labels at their heads: commander and strength.
    const heads = new HeadLabels(chart.field, roadHeads());
    // One atlas for both layers, drawn level by level between frames.
    atlas = await buildGlyphAtlas(
      [...GLYPH_TYPES, ...FLOTILLA_TYPES],
      options.signal,
    );
    options.signal.throwIfAborted();
    chart.addGpuBytes(atlas.gpuBytes);
    const fleets = new Glyphs(atlas, fleetMarks());
    const squadrons = new Glyphs(atlas, squadronMarks());
    // Boulogne in beat 1: the invasion flotilla in the roads, the army's
    // camps on the heights (boulogne.ts).
    const flotilla = new Glyphs(atlas, [...FLOTILLA]);
    const camps = new Camps(chart.field, CAMPS);
    const lettering = new Lettering(chart.field, GAZETTEER);
    // The caption's card, lower left: no name lies under its text while a
    // caption shows (Lettering.setKeepOut). Its box on the canvas, measured
    // at each resize; how much a caption shows, from its run over p.
    const card = { x0: 0, y0: 0, x1: 0, y1: 0 };
    const measureCard = () => {
      const host = options.labels;
      const el =
        host?.parentElement?.querySelector<HTMLElement>("[data-el=card]");
      if (!host || !el) return;
      const h = host.getBoundingClientRect();
      const c = el.getBoundingClientRect();
      card.x0 = c.left - h.left;
      card.y0 = c.top - h.top;
      card.x1 = c.right - h.left;
      card.y1 = c.bottom - h.top;
    };
    measureCard();
    const keepCard = (p: number) => {
      let shows = 0;
      for (const [a, b, c, d] of Object.values(CAPTIONS))
        shows = Math.max(shows, rise(a, b, p) * (1 - rise(c, d, p)));
      lettering.setKeepOut(card.x0, card.y0, card.x1, card.y1, shows);
    };
    chart.add(lettering, lettering.batch, lettering.marks.mesh);
    await lettering.ready;
    options.signal.throwIfAborted();
    // The heads' labels keep clear of the names and the caption's card,
    // the tracks' dates of both; added after the glyph layout below (the
    // labels keep clear of the squadrons' ships where they show), each
    // updating after what it keeps clear of.
    heads.setKeepClear([lettering.screen]);
    tracks.setKeepClear([lettering.screen, heads.screen]);
    await Promise.all([tracks.ready, heads.ready]);
    options.signal.throwIfAborted();
    // The depths written over the shoal water of the detail tiles.
    const soundingData = await loadSoundings(chart.manifest, options.signal);
    if (soundingData) {
      digits = await buildDigitAtlas(
        fontUrl(SOUNDING_FONT_FILE),
        options.signal,
      );
      options.signal.throwIfAborted();
      chart.addGpuBytes(digits.gpuBytes);
      const figures = await layOutSoundings(
        soundingData.sets,
        digits,
        SOUNDING_ANGLES,
        options.signal,
      );
      soundings = new Soundings(
        chart.field,
        soundingData.index,
        figures,
        digits,
        { opacity: SOUNDING_INK },
      );
      chart.add(soundings, soundings.mesh);
    }
    const rig = new CameraRig(ROAD_FLIGHT);
    // Which detail tile the field's detail layer holds along the flight
    // (terrain/slot.ts): the Gulf of Cádiz, the Channel for Boulogne. Made
    // now, in idle slices, so the first frame and the glyph layout's baked
    // tables both find it.
    await chart.planDetail(rig, options.signal);
    options.signal.throwIfAborted();
    const director = new RoadDirector({
      chart,
      rig,
      fleets,
      squadrons,
      flotilla,
      camps,
      tracks,
      heads,
      legs,
    });
    // Every squadron's and ship's heading, eased ahead of time.
    await director.prepare(options.signal);
    options.signal.throwIfAborted();
    // The chart's land on the CPU, so the glyph layout keeps every ship off
    // it; laid out before the glyph layers draw, each frame.
    const coast = await chart.field.readBack(options.signal);
    options.signal.throwIfAborted();
    const layout = new GlyphLayout(coast, director.layoutGroups());
    director.setLayout(layout);
    chart.add(layout);
    // The smoke of the action off Finisterre: set after the layout has drawn
    // the two lines each frame, drawn under their ships (smoke.ts).
    const upper = director.formationOf("villeneuve");
    const lower = director.formationOf("calder");
    if (!upper || !lower) throw new Error("road: no squadrons for the smoke");
    const smoke = new Smoke(
      new ShipAnatomy(atlas, GLYPH_TYPES),
      smokeCapacity(upper, lower),
    );
    const battle = new BattleSmoke(smoke, upper, lower);
    director.setSmoke(battle);
    chart.add(battle);
    // It gives way to the names, the caption's card and the labels: added
    // below, after the labels, so it reads their outlines of this frame.
    smoke.setKeepClear([lettering.screen, heads.screen]);
    heads.setCoast(coast);
    // Every label keeps clear of every ship drawn, whosever she is.
    heads.setGlyphs([fleets.drawn, squadrons.drawn]);
    heads.setBlocks((id, out) => {
      const formation = director.formationOf(id);
      return formation ? layout.blockOf(formation, out) : 0;
    });
    heads.setAnchors((id, out) => {
      const formation = director.formationOf(id);
      return formation ? layout.lineAnchorOf(formation, out) : 0;
    });
    // The October fleets' labels give way to their ships of the line as
    // they come in (the director's gates: 0 the British, 1 the combined).
    heads.setHandover((id) =>
      id === "fleet-british"
        ? layout.gateShown(0)
        : id === "fleet-combined"
          ? layout.gateShown(1)
          : 0,
    );
    chart.add(heads, ...heads.objects);
    // The smoke, after the battle's puffs (BattleSmoke, after the layout)
    // and the lettering it gives way to; drawn by its render order.
    chart.add(smoke, smoke.mesh);
    chart.add(tracks, ...tracks.objects);
    chart.add(fleets, fleets.wakes, fleets.ships);
    chart.add(squadrons, squadrons.wakes, squadrons.ships);
    chart.add(flotilla, flotilla.wakes, flotilla.ships);
    chart.add(camps, camps.mesh);
    // The glyph layout's tables, baked ahead over the scroll for the
    // viewport in idle slices of a few milliseconds; a new viewport bakes
    // anew, the layout deciding from each frame alone meanwhile.
    let baking: { cancelled: boolean } | null = null;
    const bake = async (): Promise<boolean> => {
      if (baking) baking.cancelled = true;
      const job = { cancelled: false };
      baking = job;
      const ps = layout.bakeBegin(0, 1, BAKE_STEP);
      for (let pass = 0; pass < layout.bakePasses; pass++) {
        let k = 0;
        while (k < ps.length) {
          await idleSlice();
          if (job.cancelled || options.signal.aborted) return false;
          const start = performance.now();
          while (k < ps.length && performance.now() - start < BAKE_SLICE_MS) {
            director.applyState(ps[k]);
            layout.bakeStep(chart.peekFrame(), k, pass);
            k++;
          }
        }
        // The pass's tables eased, in slices too.
        const finish = layout.bakeEnd(pass);
        let done = false;
        while (!done) {
          await idleSlice();
          if (job.cancelled || options.signal.aborted) return false;
          const start = performance.now();
          while (!done && performance.now() - start < BAKE_SLICE_MS)
            done = finish.next().done === true;
        }
      }
      sampled = Number.NaN;
      return true;
    };
    let probes: [GlyphProbe, GlyphProbe] | null = null;
    let sampled = Number.NaN;
    const stage: RoadStage = {
      chart,
      director,
      sample(p, mode = 0) {
        probes ??= [new GlyphProbe(fleets), new GlyphProbe(squadrons)];
        // Another mode at the same p reads the frame already drawn.
        if (p !== sampled) {
          director.apply(p);
          chart.frame(performance.now() / 1000);
          sampled = p;
        }
        const read = (probe: GlyphProbe) =>
          probe.read(chart.renderer, chart.camera, mode).values.slice();
        return { fleets: read(probes[0]), squadrons: read(probes[1]) };
      },
      draw(p, time, view) {
        sampled = Number.NaN;
        director.apply(p, view);
        const marks = view ? view.marks : 1;
        if (soundings && marks !== soundingMarks) {
          soundings.opacity = SOUNDING_INK * marks;
          soundingMarks = marks;
        }
        keepCard(p);
        chart.frame(time);
      },
      interlude(phase, t, pose) {
        const u = interludeView(
          phase,
          t,
          interludeAt.eye,
          interludeAt.target,
          pose,
        );
        interludeAt.u = u;
        interludeAt.marks = marksAt(u);
        return interludeAt;
      },
      async bench(frames, p, alternate, view) {
        sampled = Number.NaN;
        const gl = chart.renderer.getContext() as WebGL2RenderingContext;
        try {
          return await benchFrames(
            gl,
            (time) => {
              director.apply(p, view);
              chart.frame(time);
            },
            frames,
            alternate
              ? (i) => chart.showNamed(alternate, i % 2 === 0)
              : undefined,
          );
        } finally {
          if (alternate) chart.showNamed(alternate, true);
        }
      },
      siteView(p, lon, lat) {
        sampled = Number.NaN;
        director.apply(p);
        const camera = chart.camera;
        camera.updateMatrixWorld();
        const site = new Vector3(worldX(lon), worldY(lat), 0);
        const dist = site.distanceTo(camera.position);
        const sinElev = camera.position.z / Math.max(dist, 1e-6);
        site.project(camera);
        const height = chart.renderer.domElement.clientHeight || 720;
        const pxPerRad = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
        return { x: site.x, y: site.y, dist, sinElev, pxPerRad };
      },
      coastAlong(lon, lat, heading, maxKm = 20) {
        const k = mercatorScale(lat);
        const h = (heading * Math.PI) / 180;
        const x0 = worldX(lon);
        const y0 = worldY(lat);
        const at = (km: number) =>
          coast.distance(x0 + km * k * Math.sin(h), y0 + km * k * Math.cos(h));
        if (at(0) <= 0) return 0;
        const step = 0.005;
        let a = 0;
        for (let km = step; km <= maxKm; km += step) {
          if (at(km) > 0) {
            a = km;
            continue;
          }
          let b = km;
          for (let i = 0; i < 30; i++) {
            const mid = (a + b) / 2;
            if (at(mid) > 0) a = mid;
            else b = mid;
          }
          return (a + b) / 2;
        }
        return Number.NaN;
      },
      smoke(p) {
        sampled = Number.NaN;
        director.apply(p);
        keepCard(p);
        chart.frame(performance.now() / 1000);
        const dpr = chart.renderer.getPixelRatio();
        const w = chart.renderer.domElement.width;
        const h = chart.renderer.domElement.height;
        const puffs = smoke.bounds(dpr, w, h);
        const camera = chart.camera;
        const v = new Vector3();
        const seaAt = (cssX: number, cssY: number): number => {
          v.set((2 * cssX * dpr) / w - 1, 1 - (2 * cssY * dpr) / h, 0.5);
          v.unproject(camera).sub(camera.position);
          if (v.z >= 0) return Number.NaN;
          const t = -camera.position.z / v.z;
          return coast.distance(
            camera.position.x + v.x * t,
            camera.position.y + v.y * t,
          );
        };
        const coastUnder: number[] = [];
        for (let i = 0; i < puffs.length; i += 5) {
          const [x0, y0, x1, y1] = puffs.slice(i, i + 4);
          coastUnder.push(
            Math.min(
              seaAt((x0 + x1) / 2, (y0 + y1) / 2),
              seaAt(x0, y0),
              seaAt(x1, y0),
              seaAt(x1, y1),
              seaAt(x0, y1),
            ),
          );
        }
        const text: SmokeCheck["text"] = [];
        for (const [kind, screen] of [
          ["name", lettering.screen],
          ["label", heads.screen],
        ] as const)
          for (let i = 0; i < screen.count; i++)
            text.push({
              kind,
              quad: Array.from(screen.quads[i]),
              weight: screen.weights[i],
            });
        for (const m of tracks.screenMarks())
          text.push({ kind: "date", quad: m.quad, weight: m.shown });
        return {
          width: w / dpr,
          height: h / dpr,
          puffs,
          coast: coastUnder,
          text,
        };
      },
      waterLift(p) {
        sampled = Number.NaN;
        director.apply(p);
        chart.frame(performance.now() / 1000);
        return chart.probeWaterLift();
      },
      clash(p, ink) {
        sampled = Number.NaN;
        director.apply(p);
        chart.frame(performance.now() / 1000);
        return chart.probeClash(
          [{ glyphs: fleets }, { glyphs: squadrons }, { glyphs: flotilla }],
          ink,
        );
      },
      bakedSizes(layer, i, k0, k1) {
        return layout.bakedSizes(layer, i, k0, k1);
      },
      labelChanges() {
        return director.labelChanges();
      },
      gates(p) {
        sampled = Number.NaN;
        director.apply(p);
        chart.frame(performance.now() / 1000);
        return [
          layout.gateOpen(0),
          layout.gateOpen(1),
          layout.gateShown(0),
          layout.gateShown(1),
          layout.gateOpen(FLOTILLA_GATE),
          layout.gateShown(FLOTILLA_GATE),
        ];
      },
      bakeTrace(k) {
        sampled = Number.NaN;
        return layout.traceBakeStep(k, (p) => {
          director.applyState(p);
          return chart.peekFrame();
        });
      },
      layoutDebug(p) {
        sampled = Number.NaN;
        layout.debug = [];
        director.apply(p);
        chart.frame(performance.now() / 1000);
        const out = layout.debug;
        layout.debug = null;
        return out;
      },
      motion(p) {
        sampled = Number.NaN;
        director.apply(p);
        chart.frame(performance.now() / 1000);
        const camera = chart.camera;
        const w = chart.renderer.domElement.width;
        const h = chart.renderer.domElement.height;
        const v = new Vector3();
        const screen = (x: number, y: number): [number, number] => {
          v.set(x, y, 0).project(camera);
          return [(v.x * 0.5 + 0.5) * w, (v.y * 0.5 + 0.5) * h];
        };
        return [fleets, squadrons, flotilla].map((layer) => {
          const out: number[] = [];
          const d = layer.drawn;
          const it = layer.intent;
          for (let i = 0; i < layer.markCount; i++) {
            const [x, y] = screen(d.x[i], d.y[i]);
            const [ix, iy] = screen(it.x[i], it.y[i]);
            out.push(x, y, d.height[i], d.alpha[i], ix, iy);
          }
          return out;
        });
      },
      pathParts(p, step) {
        sampled = Number.NaN;
        const layers = [fleets, squadrons];
        const qs = [p - step, p, p + step];
        const cams = qs.map((q) => {
          director.applyState(q);
          chart.camera.updateMatrixWorld();
          return chart.camera.clone();
        });
        const places = qs.map((q) => {
          director.applyState(q);
          return layers.map((l) => [
            Float64Array.from(l.intent.x),
            Float64Array.from(l.intent.y),
          ]);
        });
        director.apply(p);
        chart.frame(performance.now() / 1000);
        const v = new Vector3();
        const w = chart.renderer.domElement.width;
        const h = chart.renderer.domElement.height;
        // Off the frame (50 px of margin) or behind the eye, a projection
        // means nothing: such a glyph is reported with a height of 0.
        let off = false;
        const screen = (cam: typeof chart.camera, x: number, y: number) => {
          v.set(x, y, 0).project(cam);
          const sx = (v.x * 0.5 + 0.5) * w;
          const sy = (v.y * 0.5 + 0.5) * h;
          if (
            !(v.z < 1) ||
            !(sx > -50 && sx < w + 50 && sy > -50 && sy < h + 50)
          )
            off = true;
          return [sx, sy] as const;
        };
        const second = (
          a: readonly [number, number],
          b: readonly [number, number],
          c: readonly [number, number],
        ) => Math.hypot(a[0] - 2 * b[0] + c[0], a[1] - 2 * b[1] + c[1]);
        return layers.map((l, li) => {
          const out: number[] = [];
          for (let i = 0; i < l.markCount; i++) {
            const at = (k: number) =>
              [places[k][li][0][i], places[k][li][1][i]] as const;
            off = false;
            const own = second(
              screen(cams[1], ...at(0)),
              screen(cams[1], ...at(1)),
              screen(cams[1], ...at(2)),
            );
            const cam = second(
              screen(cams[0], ...at(1)),
              screen(cams[1], ...at(1)),
              screen(cams[2], ...at(1)),
            );
            const both = second(
              screen(cams[0], ...at(0)),
              screen(cams[1], ...at(1)),
              screen(cams[2], ...at(2)),
            );
            out.push(
              own,
              cam,
              both,
              off ? 0 : l.drawn.height[i],
              l.drawn.alpha[i],
            );
          }
          return out;
        });
      },
      ashore(p) {
        sampled = Number.NaN;
        director.applyState(p);
        const it = fleets.intent;
        const out: number[] = [];
        for (let i = 0; i < fleets.markCount; i++)
          out.push(
            coast ? coast.distance(it.x[i], it.y[i]) : Number.NaN,
            it.wake[i],
            it.opacity[i],
          );
        return out;
      },
      dawnFleet,
      routeLabels(explain) {
        return explain ? heads.explain() : heads.snapshot();
      },
      hideRouteLabels(hidden) {
        heads.setHidden(hidden);
      },
      labelClock(step) {
        heads.setClock(step);
      },
      trackLabels(explain) {
        return explain ? tracks.explain() : tracks.snapshot();
      },
      labels(p) {
        sampled = Number.NaN;
        director.apply(p);
        keepCard(p);
        chart.frame(performance.now() / 1000);
        return lettering.snapshot();
      },
      detailAt(p) {
        const plan = chart.detailPlan(rig);
        if (!plan) return { tile: null, weight: 0 };
        const { index, weight } = plan.at(p, { index: -1, weight: 0 });
        return {
          tile: index >= 0 ? chart.field.detailIds[index] : null,
          weight: index >= 0 ? weight : 0,
        };
      },
      fleetAt(p) {
        sampled = Number.NaN;
        director.applyState(p);
        const it = fleets.intent;
        const out: number[] = [];
        for (let i = 0; i < fleets.markCount; i++)
          out.push(it.x[i], it.y[i], it.opacity[i]);
        return out;
      },
      cameraAt(p) {
        sampled = Number.NaN;
        director.applyState(p);
        const camera = chart.camera;
        camera.updateMatrixWorld();
        const canvas = chart.renderer.domElement;
        const frame = chart.peekFrame();
        const eye = frame.eye;
        return {
          view: Array.from(camera.matrixWorldInverse.elements),
          projection: Array.from(camera.projectionMatrix.elements),
          width: canvas.width,
          height: canvas.height,
          dpr: chart.renderer.getPixelRatio(),
          eye: [eye.x, eye.y, eye.z],
          sizePx: glyphPxAt(eye.z),
          hazeVisibility: frame.hazeVisibility,
          sizeRef: Math.hypot(
            frame.target.x - eye.x,
            frame.target.y - eye.y,
            eye.z,
          ),
        };
      },
      spreadShift() {
        return { dawn: dawnSpreadShift(), anchorage: anchorageSpreadShift() };
      },
      glyphNames() {
        return [
          fleetNames(),
          squadronNames(),
          FLOTILLA.map((m, i) => `flotilla ${i} ${m.type}`),
        ];
      },
      resize(width, height) {
        chart.resize(width, height);
        measureCard();
      },
      bake,
      dispose() {
        director.dispose();
        for (const probe of probes ?? []) probe.dispose();
        chart.dispose();
        atlas?.texture.dispose();
        digits?.texture.dispose();
      },
    };
    return stage;
  } catch (error) {
    chart.dispose();
    atlas?.texture.dispose();
    digits?.texture.dispose();
    throw error;
  }
}
