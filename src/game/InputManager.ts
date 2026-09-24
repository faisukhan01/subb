/**
 * Unified input: keyboard (arrows/WASD/Space) + touch swipe & tap.
 * Dispatches semantic actions to the Game; pause key goes through the
 * callback so React owns the phase state machine.
 */

export type GameAction = "left" | "right" | "jump" | "roll";

export class InputManager {
  private disposers: Array<() => void> = [];
  private touchStart: { x: number; y: number; time: number } | null = null;
  private swipeFired = false;
  private enabled = false;

  constructor(
    private target: HTMLElement,
    private onAction: (a: GameAction) => void,
    private onPause: () => void,
  ) {
    this.attach();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private attach(): void {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!this.enabled) {
        if (e.code === "Escape" || e.code === "KeyP") this.onPause();
        return;
      }
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          this.onAction("left");
          break;
        case "ArrowRight":
        case "KeyD":
          this.onAction("right");
          break;
        case "ArrowUp":
        case "KeyW":
        case "Space":
          e.preventDefault(); // stop page scroll on space
          this.onAction("jump");
          break;
        case "ArrowDown":
        case "KeyS":
          e.preventDefault();
          this.onAction("roll");
          break;
        case "Escape":
        case "KeyP":
          this.onPause();
          break;
        default:
          return;
      }
      // Avoid arrow-key page scrolling
      if (e.code.startsWith("Arrow")) e.preventDefault();
    };

    const onTouchStart = (e: TouchEvent): void => {
      if (e.touches.length === 0) return;
      const t = e.touches[0];
      this.touchStart = { x: t.clientX, y: t.clientY, time: performance.now() };
      this.swipeFired = false;
    };

    const onTouchMove = (e: TouchEvent): void => {
      if (!this.enabled || !this.touchStart || this.swipeFired) return;
      const t = e.touches[0];
      const dx = t.clientX - this.touchStart.x;
      const dy = t.clientY - this.touchStart.y;
      const THRESH = 26;
      if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) return;
      this.swipeFired = true;
      if (Math.abs(dx) > Math.abs(dy)) this.onAction(dx > 0 ? "right" : "left");
      else this.onAction(dy > 0 ? "roll" : "jump");
    };

    const onTouchEnd = (e: TouchEvent): void => {
      // Quick tap (no swipe) = jump, the classic mobile runner verb.
      if (
        this.enabled &&
        !this.swipeFired &&
        this.touchStart &&
        performance.now() - this.touchStart.time < 260
      ) {
        const ended = e.changedTouches[0];
        if (!ended) return;
        const el = document.elementFromPoint(ended.clientX, ended.clientY);
        // Ignore taps that land on HUD buttons
        if (el && el.closest("button, a, [role='button'], input")) return;
        this.onAction("jump");
      }
      this.touchStart = null;
    };

    const blockScroll = (e: TouchEvent): void => {
      if (e.cancelable) e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    this.target.addEventListener("touchstart", onTouchStart, { passive: true });
    this.target.addEventListener("touchmove", onTouchMove, { passive: true });
    this.target.addEventListener("touchend", onTouchEnd, { passive: true });
    this.target.addEventListener("touchstart", blockScroll, { passive: false });

    this.disposers.push(() => {
      window.removeEventListener("keydown", onKeyDown);
      this.target.removeEventListener("touchstart", onTouchStart);
      this.target.removeEventListener("touchmove", onTouchMove);
      this.target.removeEventListener("touchend", onTouchEnd);
      this.target.removeEventListener("touchstart", blockScroll);
    });
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.disposers = [];
  }
}
