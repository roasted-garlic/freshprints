export interface PortalProgressPollingScheduler {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export class PortalProgressPollingController {
  private timer: unknown;
  private stopped = true;

  constructor(
    private readonly load: () => Promise<unknown>,
    private readonly delay: () => number,
    private readonly scheduler: PortalProgressPollingScheduler,
  ) {}

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.schedule();
  }

  refreshNow(): Promise<unknown> {
    return this.load();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== undefined) {
      this.scheduler.clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private schedule(): void {
    this.timer = this.scheduler.setTimeout(() => {
      this.timer = undefined;
      void this.load().finally(() => {
        if (!this.stopped) this.schedule();
      });
    }, this.delay());
  }
}
