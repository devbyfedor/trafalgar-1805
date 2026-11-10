/**
 * The chart's WebGL 2 context, made by the page before the chart loads.
 * Making a context holds the main thread 15 to 190 ms on the owner's GPU
 * (ANGLE on Direct3D 11), and nothing can slice it; made while the page
 * loads, the wait lands before anyone scrolls (ChartOptions.context;
 * docs/research/perf-start-of-scroll.md). No imports, so a page may use it
 * without loading the chart's chunk.
 */

/**
 * The context's attributes, as three's WebGLRenderer asks for them with the
 * chart's options (antialias, no stencil, the discrete GPU). Three always
 * asks for alpha and keeps the canvas opaque by its clear (Chart.create).
 */
export const CHART_CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
  alpha: true,
  depth: true,
  stencil: false,
  antialias: true,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: "high-performance",
  failIfMajorPerformanceCaveat: false,
};

/**
 * The extensions three r186 turns on as its renderer starts
 * (WebGLExtensions.init) and those the chart uses later (anisotropic
 * filtering, compiling in parallel). Turning one on waits on the GPU
 * process: the six of three's start alone were 13 ms of the task that
 * started the chart.
 */
const EXTENSIONS = [
  "EXT_color_buffer_float",
  "WEBGL_clip_cull_distance",
  "OES_texture_float_linear",
  "EXT_color_buffer_half_float",
  "WEBGL_multisampled_render_to_texture",
  "WEBGL_render_shared_exponent",
  "EXT_texture_filter_anisotropic",
  "KHR_parallel_shader_compile",
] as const;

/**
 * Makes the chart's context on a canvas already sized as the chart will
 * draw (chartPixelRatio, engine/quality.ts), or null where WebGL 2 isn't to
 * be had. Its extensions are turned on and the precisions three reads are
 * asked for now, with the waits of making it: the browser keeps the
 * answers, so the renderer finds them ready.
 */
export function chartContext(
  canvas: HTMLCanvasElement,
): WebGL2RenderingContext | null {
  const gl = canvas.getContext("webgl2", CHART_CONTEXT_ATTRIBUTES);
  if (!gl) return null;
  for (const name of EXTENSIONS) gl.getExtension(name);
  for (const shader of [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER])
    for (const precision of [gl.HIGH_FLOAT, gl.MEDIUM_FLOAT])
      gl.getShaderPrecisionFormat(shader, precision);
  return gl;
}
