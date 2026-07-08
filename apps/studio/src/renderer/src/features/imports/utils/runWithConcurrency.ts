export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(concurrency, 1), items.length);

  async function runWorker(): Promise<void> {
    let currentIndex = nextIndex;
    nextIndex += 1;

    while (currentIndex < items.length) {
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
      currentIndex = nextIndex;
      nextIndex += 1;
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return results;
}
