import { getStroke } from "perfect-freehand";
import earcut from "earcut";
import type { Camera, Renderer } from "@/core/ports";
import type { Stroke } from "@/core/types";

const PEN_OPTIONS = {
  size: 1,
  thinning: 0.55,
  smoothing: 0.55,
  streamline: 0.32,
  easing: (t: number) => t,
  simulatePressure: false,
  start: { taper: 0, cap: true },
  end: { taper: 20, cap: true },
};

const vsSource = `
attribute vec2 a_position;
uniform vec2 u_resolution;
uniform vec2 u_translation;
uniform float u_zoom;

void main() {
  vec2 pos = (a_position * u_zoom) + u_translation;
  vec2 zeroToOne = pos / u_resolution;
  vec2 clipSpace = (zeroToOne * 2.0) - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0.0, 1.0);
}
`;

const fsSource = `
precision mediump float;
uniform vec4 u_color;

void main() {
  gl_FragColor = u_color;
}
`;

function parseColor(hex: string, opacity: number): [number, number, number, number] {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return [r, g, b, opacity];
}

export class WebGLRenderer implements Renderer {
  private canvas: HTMLCanvasElement | undefined;
  private gl: WebGLRenderingContext | undefined;
  private program: WebGLProgram | undefined;
  private positionBuffer: WebGLBuffer | undefined;

  private resolutionLocation: WebGLUniformLocation | null = null;
  private translationLocation: WebGLUniformLocation | null = null;
  private zoomLocation: WebGLUniformLocation | null = null;
  private colorLocation: WebGLUniformLocation | null = null;
  private positionLocation: number = -1;

  private dpr = 1;
  private camera: Camera = { x: 0, y: 0, zoom: 1 };
  private width = 0;
  private height = 0;

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", { 
      alpha: true, 
      antialias: true, 
      premultipliedAlpha: false,
      stencil: true 
    });
    if (!gl) throw new Error("WebGL context unavailable");
    this.gl = gl;
    this.initWebGL();
  }

  private initWebGL() {
    const gl = this.gl!;
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    this.program = program;

    this.positionLocation = gl.getAttribLocation(program, "a_position");
    this.resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    this.translationLocation = gl.getUniformLocation(program, "u_translation");
    this.zoomLocation = gl.getUniformLocation(program, "u_zoom");
    this.colorLocation = gl.getUniformLocation(program, "u_color");

    this.positionBuffer = gl.createBuffer()!;
  }

  setViewport(width: number, height: number, dpr: number): void {
    if (!this.canvas || !this.gl) return;
    this.dpr = dpr;
    this.width = Math.round(width * dpr);
    this.height = Math.round(height * dpr);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.gl.viewport(0, 0, this.width, this.height);
  }

  setCamera(cam: Camera): void {
    this.camera = cam;
  }

  clear(): void {
    const gl = this.gl;
    if (!gl) return;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  beginFrame(): void {
    const gl = this.gl;
    if (!gl || !this.program) return;
    gl.useProgram(this.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.uniform2f(this.resolutionLocation, this.width, this.height);
    
    const s = this.dpr * this.camera.zoom;
    const tx = -this.camera.x * s;
    const ty = -this.camera.y * s;
    gl.uniform2f(this.translationLocation, tx, ty);
    gl.uniform1f(this.zoomLocation, s);
  }

  endFrame(): void {
    // noop
  }

  drawStroke(stroke: Stroke): void {
    this.renderStroke(stroke, true);
  }

  drawLive(stroke: Stroke): void {
    this.renderStroke(stroke, false);
  }

  private renderStroke(stroke: Stroke, last: boolean) {
    const gl = this.gl;
    if (!gl || !this.program || stroke.points.length === 0) return;

    const inputs = stroke.points.map((p) => [p.x, p.y, p.p] as [number, number, number]);
    const path = getStroke(inputs, { ...PEN_OPTIONS, size: stroke.size, last });
    if (path.length < 3) return;

    const flat: number[] = [];
    for (let i = 0; i < path.length; i++) {
      flat.push(path[i][0], path[i][1]);
    }

    const indices = earcut(flat);

    const vertices = new Float32Array(indices.length * 2);
    for (let i = 0; i < indices.length; i++) {
      vertices[i * 2] = flat[indices[i] * 2];
      vertices[i * 2 + 1] = flat[indices[i] * 2 + 1];
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer!);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

    const [r, g, b, a] = parseColor(stroke.color, stroke.opacity);
    gl.uniform4f(this.colorLocation, r, g, b, a);

    gl.enable(gl.STENCIL_TEST);
    gl.clear(gl.STENCIL_BUFFER_BIT);
    gl.stencilFunc(gl.EQUAL, 0, 0xFF);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);

    gl.drawArrays(gl.TRIANGLES, 0, indices.length);
    gl.disable(gl.STENCIL_TEST);
  }
}
