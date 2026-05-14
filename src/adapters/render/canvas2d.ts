import { getStroke } from "perfect-freehand";
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

export class Canvas2DRenderer implements Renderer {
  private canvas: HTMLCanvasElement | undefined;
  private ctx: CanvasRenderingContext2D | undefined;
  private dpr = 1;
  private camera: Camera = { x: 0, y: 0, zoom: 1 };

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
  }

  setViewport(width: number, height: number, dpr: number): void {
    if (!this.canvas) return;
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  setCamera(cam: Camera): void {
    this.camera = cam;
  }

  clear(): void {
    if (!this.ctx || !this.canvas) return;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  beginFrame(): void {
    if (!this.ctx) return;
    const { x, y, zoom } = this.camera;
    const s = this.dpr * zoom;
    this.ctx.setTransform(s, 0, 0, s, -x * s, -y * s);
  }

  endFrame(): void {
    /* noop */
  }

  drawStroke(stroke: Stroke): void {
    this.renderStroke(stroke, false);
  }

  drawLive(stroke: Stroke): void {
    this.renderStroke(stroke, true);
  }

  private renderStroke(stroke: Stroke, live: boolean): void {
    const ctx = this.ctx;
    if (!ctx || stroke.points.length === 0) return;

    const inputs = stroke.points.map((p) => [p.x, p.y, p.p] as [number, number, number]);
    const path = getStroke(inputs, {
      ...PEN_OPTIONS,
      size: stroke.size,
      last: !live,
    });
    if (path.length === 0) return;

    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = stroke.opacity;
    ctx.beginPath();
    ctx.moveTo(path[0][0], path[0][1]);
    for (let i = 1; i < path.length - 1; i++) {
      const mx = (path[i][0] + path[i + 1][0]) / 2;
      const my = (path[i][1] + path[i + 1][1]) / 2;
      ctx.quadraticCurveTo(path[i][0], path[i][1], mx, my);
    }
    if (path.length > 1) {
      ctx.lineTo(path[path.length - 1][0], path[path.length - 1][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
