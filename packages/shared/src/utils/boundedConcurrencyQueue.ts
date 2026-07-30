/**
 * General-purpose bounded-concurrency semaphore, adapted from
 * `apps/studio/electron/services/import/derivativeConcurrencyQueue.ts`'s acquire/release/wait-queue
 * pattern so Functions (which cannot import from `apps/studio/electron`, an Electron-main-process-only
 * tree outside `functions/tsconfig.json`'s `include`) can reuse the same proven mechanism rather than
 * forking it. Guarantees: a permit is always released in both success and failure paths (`finally`),
 * and a rejected task never blocks or drops queued waiters.
 */
export class BoundedConcurrencyQueue {
  private activeCount = 0;

  private readonly waitQueue: Array<() => void> = [];

  constructor(private readonly maxConcurrency: number) {
    if (!Number.isFinite(maxConcurrency) || maxConcurrency < 1) {
      throw new Error("maxConcurrency must be a finite number >= 1.");
    }
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();

    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.activeCount < this.maxConcurrency) {
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

export type SettledTaskResult<T> =
  | { status: "fulfilled"; index: number; value: T }
  | { status: "rejected"; index: number; reason: unknown };

/**
 * Runs `items` through `task` with concurrency bounded by `maxConcurrency`. One task rejecting never
 * cancels or blocks the others — every result is captured via `Promise.allSettled` semantics and
 * returned in `items` order (not completion order), so callers can deterministically associate each
 * result with its source item and aggregate counts only after every task has settled.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  maxConcurrency: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<Array<SettledTaskResult<R>>> {
  const queue = new BoundedConcurrencyQueue(maxConcurrency);

  const settled = await Promise.all(
    items.map((item, index) =>
      queue.run(async (): Promise<SettledTaskResult<R>> => {
        try {
          const value = await task(item, index);
          return { status: "fulfilled", index, value };
        } catch (reason) {
          return { status: "rejected", index, reason };
        }
      }),
    ),
  );

  return settled;
}
