/**
 * Races `promise` against a timer, rejecting with `message` if `ms` elapses first. Used to bound
 * Firebase Storage `getBytes()` calls, which can otherwise hang indefinitely under certain
 * network/CORS conditions (see the Assisted Creation reference/proof preview hang fix,
 * `docs/project/DECISIONS.md`). The bound is purely time-based — it has no dependency on payload
 * size, so it protects a large-file fallback exactly the same way it protects a small one.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, ms);
    promise.then(
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
