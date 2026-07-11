const pendingByRequest = new Map<string, Map<string, Promise<unknown>>>();

function getRequestBucket(printRequestId: string): Map<string, Promise<unknown>> {
  let bucket = pendingByRequest.get(printRequestId);

  if (!bucket) {
    bucket = new Map();
    pendingByRequest.set(printRequestId, bucket);
  }

  return bucket;
}

/** Track a background seed persist so selection Save can wait for it and avoid duplicate adds. */
export function registerSeedPersist(
  printRequestId: string,
  designId: string,
  work: Promise<unknown>,
): Promise<unknown> {
  const bucket = getRequestBucket(printRequestId);
  const tracked = work.finally(() => {
    if (bucket.get(designId) === tracked) {
      bucket.delete(designId);
    }

    if (bucket.size === 0) {
      pendingByRequest.delete(printRequestId);
    }
  });

  bucket.set(designId, tracked);
  return tracked;
}

export async function awaitPendingSeedPersists(printRequestId: string): Promise<void> {
  const bucket = pendingByRequest.get(printRequestId);

  if (!bucket || bucket.size === 0) {
    return;
  }

  await Promise.all([...bucket.values()]);
}

export async function awaitPendingSeedPersist(
  printRequestId: string,
  designId: string,
): Promise<void> {
  const pending = pendingByRequest.get(printRequestId)?.get(designId);

  if (!pending) {
    return;
  }

  await pending;
}
