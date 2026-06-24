import { DERIVATIVE_PROCESSING_CONCURRENCY } from "../../../shared/constants/import/derivativeGeneration.constants";

/**
 * Serializes sharp decode/encode work in the main process.
 * Upload concurrency in the renderer may be higher; sharp stays at 1.
 */
class DerivativeConcurrencyQueue {
  private activeCount = 0;

  private readonly waitQueue: Array<() => void> = [];

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();

    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.activeCount < DERIVATIVE_PROCESSING_CONCURRENCY) {
      this.activeCount += 1;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.waitQueue.push(() => {
        this.activeCount += 1;
        resolve();
      });
    });
  }

  private release(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
    const next = this.waitQueue.shift();

    if (next) {
      next();
    }
  }
}

export const derivativeConcurrencyQueue = new DerivativeConcurrencyQueue();
