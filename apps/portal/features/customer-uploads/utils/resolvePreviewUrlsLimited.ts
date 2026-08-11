/**
 * Resolve preview download URLs with a concurrency cap and skip already-cached localIds.
 * Prevents browser ERR_INSUFFICIENT_RESOURCES when many ready previews appear at once.
 */
export async function resolvePreviewUrlsLimited(params: {
  items: Array<{ localId: string; previewStoragePath: string }>;
  alreadyHave: Readonly<Record<string, string | null>>;
  concurrency: number;
  getDownloadUrl: (storagePath: string) => Promise<string>;
}): Promise<Record<string, string | null>> {
  const pending = params.items.filter((item) => {
    const existing = params.alreadyHave[item.localId];
    return existing == null || existing === '';
  });

  if (pending.length === 0) {
    return {};
  }

  const next: Record<string, string | null> = {};
  const queue = [...pending];
  const limit = Math.max(1, Math.min(params.concurrency, queue.length));

  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) {
          return;
        }
        try {
          next[item.localId] = await params.getDownloadUrl(item.previewStoragePath);
        } catch {
          next[item.localId] = null;
        }
      }
    }),
  );

  return next;
}

export function buildReadyPreviewFetchKey(
  rows: Array<{ localId: string; phase: string; previewStoragePath?: string | null }>,
): string {
  return rows
    .filter((row) => row.phase === 'ready' && Boolean(row.previewStoragePath))
    .map((row) => `${row.localId}:${row.previewStoragePath}`)
    .sort()
    .join('|');
}
