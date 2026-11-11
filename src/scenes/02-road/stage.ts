import { Vector3 } from "three";
import {
  buildDigitAtlas,
  buildGlyphAtlas,
  CameraRig,
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
  Route,
  SOUNDING_FONT_FILE,
  Soundings,
} from "@/components/chart";
import { type BenchResult, benchFrames } from "@/components/chart/engine/bench";
import { worldX, worldY } from "@/components/chart/geo/mercator";
import type { ClashResult } from "@/components/chart/glyphs/clash";
import { glyphPxAt } from "@/components/chart/glyphs/height";
import { type Formation, GlyphLayout } from "@/components/chart/glyphs/layout";
import { GlyphProbe } from "@/components/chart/glyphs/probe";
import type { LabelState } from "@/components/chart/lettering/Lettering";
import type { WaterLift } from "@/components/chart/terrain/liftProbe";
import { CAPTIONS } from "./beats";
import { ROAD_FLIGHT } from "./camera";
import {
  fleetMarks,
  fleetNames,
  RoadDirector,
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
import { NELSON, VILLENEUVE } from "./routes";
import { SOUNDING_ANGLES } from "./soundings";

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
  /** Sets the chart for progress p and draws a frame (gsap.ticker time). */
  draw(p: number, time: number): void;
  /**
   * Development: draws `frames` frames at p, each timed on the GPU and the
   * CPU (engine/bench.ts; scripts/dev/road-bench.mjs). The host holds its
   * own drawing meanwhile. With `alternate`, the chart's objects of that
   * name (Chart.showNamed) are drawn on even frames and hidden on odd ones.
   */
  bench(frames: number, p: number, alternate?: string): Promise<BenchResult>;
  /** Development: draws the scene at p and probes its water (Chart.probeWaterLift). */
  waterLift(p: number): WaterLift;
  /**
   * Development and tests: draws the scene at p and finds every glyph whose
   * ink touches land or another glyph's (Chart.probeClash): the fleets are
   * layer 0, the squadrons layer 1. `ink`: the least drawn alpha counted.
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
  /** Development: draws the scene at p and returns each squadron's layout (GlyphLayout.debug). */
  layoutDebug(p: number): Record<string, unknown>[];
  /** Development: a glyph's baked sizes by step (GlyphLayout.bakedSizes). */
  bakedSizes(layer: number, i: number, k0: number, k1: number): number[][];
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

/**
 * Each squadron's count, lettered under its sign's lead as it turns into
 * its sign ("11 sail"): upright, in the text face, in the chart's pale
 * ink, as a period chart lettered a fleet's strength by its symbol. HTML
 * over the canvas, moved each frame after the chart has drawn.
 */
class SignLabels {
  private readonly els: HTMLSpanElement[] = [];
  private readonly shown: string[] = [];

  constructor(
    host: HTMLElement | null,
    private readonly formations: readonly Formation[],
    private readonly layout: GlyphLayout,
    private readonly chart: Chart,
  ) {
    if (!host) return;
    for (let i = 0; i < formations.length; i++) {
      const el = document.createElement("span");
      el.setAttribute("aria-hidden", "true");
      el.style.cssText =
        "position:absolute;left:0;top:0;opacity:0;pointer-events:none;white-space:nowrap;" +
        "font-family:var(--font-text);font-size:clamp(11px,1.75vh,20px);line-height:1;" +
        "letter-spacing:0.02em;will-change:transform,opacity";
      host.append(el);
      this.els.push(el);
      this.shown.push("");
    }
  }

  update(): void {
    if (this.els.length === 0) return;
    const canvas = this.chart.renderer.domElement;
    const dpr = this.chart.renderer.getPixelRatio();
    const ink = this.chart.light.inkPale;
    const colour = `rgb(${Math.round(ink.x * 255)},${Math.round(ink.y * 255)},${Math.round(ink.z * 255)})`;
    for (let i = 0; i < this.formations.length; i++) {
      const el = this.els[i];
      const s = this.layout.signOf(this.formations[i]);
      if (s.sign < 0.01 || s.h <= 0.01) {
        if (this.shown[i] !== "hidden") {
          el.style.opacity = "0";
          this.shown[i] = "hidden";
        }
        continue;
      }
      const text = `${Math.round(s.count)} sail`;
      if (el.textContent !== text) el.textContent = text;
      const x = s.x / dpr;
      const y = (canvas.height - s.y) / dpr;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, 0.3em)`;
      el.style.opacity = s.sign.toFixed(3);
      if (el.style.color !== colour) el.style.color = colour;
      this.shown[i] = "shown";
    }
  }

  dispose(): void {
    for (const el of this.els) el.remove();
  }
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

export interface RoadStageOptions {
  canvas: HTMLCanvasElement;
  /** The canvas's context, made while the page loaded (engine/context.ts). */
  context?: WebGL2RenderingContext;
  signal: AbortSignal;
  /** The WebGL context is lost for good. */
  onFatal: (reason: string) => void;
  /** Pins a quality level (tests); otherwise the ladder adapts. */
  quality?: number;
  /** Where the squadrons' counts are lettered (over the canvas). */
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
  try {
    const riverData = await loadRivers(chart.manifest, options.signal);
    const rivers = new Rivers(chart.field, riverData);
    chart.add(rivers, rivers.mesh);
    const legs = [...VILLENEUVE, ...NELSON];
    const routes = legs.map(
      (leg) =>
        new Route(
          chart.field,
          leg.waypoints.map((w) => [w.lon, w.lat] as const),
          { width: leg.side === "british" ? 2 : 1.8 },
        ),
    );
    for (const r of routes) {
      r.setProgress(0);
      chart.add(r, r.mesh);
    }
    // One atlas for both layers, drawn level by level between frames.
    atlas = await buildGlyphAtlas(GLYPH_TYPES, options.signal);
    options.signal.throwIfAborted();
    chart.addGpuBytes(atlas.gpuBytes);
    const fleets = new Glyphs(atlas, fleetMarks());
    const squadrons = new Glyphs(atlas, squadronMarks());
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
      const soundings = new Soundings(soundingData.index, figures, digits);
      chart.add(soundings, soundings.mesh);
    }
    const rig = new CameraRig(ROAD_FLIGHT);
    const director = new RoadDirector({
      chart,
      rig,
      fleets,
      squadrons,
      routes,
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
    chart.add(fleets, fleets.wakes, fleets.ships);
    chart.add(squadrons, squadrons.wakes, squadrons.ships);
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
    const signs = new SignLabels(
      options.labels ?? null,
      director.formations(),
      layout,
      chart,
    );
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
      draw(p, time) {
        sampled = Number.NaN;
        director.apply(p);
        keepCard(p);
        chart.frame(time);
        signs.update();
      },
      async bench(frames, p, alternate) {
        sampled = Number.NaN;
        const gl = chart.renderer.getContext() as WebGL2RenderingContext;
        try {
          return await benchFrames(
            gl,
            (time) => {
              director.apply(p);
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
          [{ glyphs: fleets }, { glyphs: squadrons }],
          ink,
        );
      },
      bakedSizes(layer, i, k0, k1) {
        return layout.bakedSizes(layer, i, k0, k1);
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
        return [fleets, squadrons].map((layer) => {
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
      labels(p) {
        sampled = Number.NaN;
        director.apply(p);
        keepCard(p);
        chart.frame(performance.now() / 1000);
        return lettering.snapshot();
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
        return [fleetNames(), squadronNames()];
      },
      resize(width, height) {
        chart.resize(width, height);
        measureCard();
      },
      bake,
      dispose() {
        signs.dispose();
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
