/**
 * Races `work` against a timer; if `ms` elapses first, calls `onTimeout` (awaited before the
 * returned promise rejects) and rejects with `message`. Mirrors `withTimeout.ts`'s exact
 * clearTimeout-on-settle cleanup so a genuine late completion never re-fires the timer after the
 * racer has already settled, and vice versa. Used to bound the customer-upload trim/normalize
 * stage, which otherwise can leave a Firestore document stuck at `technicalStatus: "processing"`
 * forever when the platform silently terminates an `onCall` invocation at its own timeout ceiling
 * before any failure write executes (see ADR-FP-125 / `docs/project/DECISIONS.md`).
 */
export function withCustomerUploadFinalizeWatchdog<T>(
  work: Promise<T>,
  ms: number,
  onTimeout: () => void | Promise<void>,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      void Promise.resolve(onTimeout()).finally(() => {
        reject(new Error(message));
      });
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
