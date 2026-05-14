import type { InputAdapter, InputHandlers, InputSample } from "@/core/ports";

export class PointerInputAdapter implements InputAdapter {
  private target: HTMLElement | undefined;
  private handlers: InputHandlers | undefined;
  private activePointerId: number | undefined;
  private startTime = 0;
  private penWasUsedRecently = false;
  private penLockoutUntil = 0;

  start(target: HTMLElement, handlers: InputHandlers): void {
    this.target = target;
    this.handlers = handlers;
    target.style.touchAction = "none";
    target.addEventListener("pointerdown", this.onDown, { passive: false });
    target.addEventListener("pointermove", this.onMove, { passive: false });
    target.addEventListener("pointerup", this.onUp, { passive: false });
    target.addEventListener("pointercancel", this.onCancel, { passive: false });
    target.addEventListener("pointerleave", this.onCancel, { passive: false });
    target.addEventListener("contextmenu", this.onContext);
  }

  stop(): void {
    const t = this.target;
    if (!t) return;
    t.removeEventListener("pointerdown", this.onDown);
    t.removeEventListener("pointermove", this.onMove);
    t.removeEventListener("pointerup", this.onUp);
    t.removeEventListener("pointercancel", this.onCancel);
    t.removeEventListener("pointerleave", this.onCancel);
    t.removeEventListener("contextmenu", this.onContext);
    this.target = undefined;
    this.handlers = undefined;
  }

  private onContext = (e: Event) => e.preventDefault();

  private shouldIgnore(e: PointerEvent): boolean {
    if (e.pointerType === "touch" && (this.penWasUsedRecently || performance.now() < this.penLockoutUntil)) {
      return true;
    }
    return false;
  }

  private toSample(e: PointerEvent): InputSample {
    const rect = this.target!.getBoundingClientRect();
    const pressure = e.pressure > 0 ? e.pressure : e.pointerType === "pen" ? 0.5 : 0.5;
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure,
      t: performance.now() - this.startTime,
      pointerType: e.pointerType as InputSample["pointerType"],
    };
  }

  private onDown = (e: PointerEvent) => {
    if (this.shouldIgnore(e)) return;
    if (this.activePointerId !== undefined) return;
    e.preventDefault();
    if (e.pointerType === "pen") {
      this.penWasUsedRecently = true;
      this.penLockoutUntil = performance.now() + 1500;
    }
    this.activePointerId = e.pointerId;
    this.startTime = performance.now();
    this.target?.setPointerCapture(e.pointerId);
    this.handlers?.onDown(this.toSample(e));
  };

  private onMove = (e: PointerEvent) => {
    if (this.activePointerId !== e.pointerId) return;
    if (this.shouldIgnore(e)) return;
    e.preventDefault();
    const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    const list = events.length > 0 ? events : [e];
    const samples = list.map((ev) => this.toSample(ev));
    this.handlers?.onMove(samples);
    if (e.pointerType === "pen") {
      this.penLockoutUntil = performance.now() + 1500;
    }
  };

  private onUp = (e: PointerEvent) => {
    if (this.activePointerId !== e.pointerId) return;
    e.preventDefault();
    this.target?.releasePointerCapture(e.pointerId);
    this.activePointerId = undefined;
    this.handlers?.onUp();
  };

  private onCancel = (e: PointerEvent) => {
    if (this.activePointerId !== e.pointerId) return;
    this.activePointerId = undefined;
    this.handlers?.onCancel();
  };
}
