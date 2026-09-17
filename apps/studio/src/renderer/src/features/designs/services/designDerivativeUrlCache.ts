/**
 * In-memory catalog path → download URL cache for Phase 3C derivative display.
 * Deduplicates concurrent requests for the same path.
 */
export class DesignDerivativeUrlCache {
  private readonly resolvedUrls = new Map<string, string>();
  private readonly inflightRequests = new Map<string, Promise<string | null>>();

  getResolvedUrl(catalogPath: string): string | undefined {
    return this.resolvedUrls.get(catalogPath);
  }

  hasResolvedUrl(catalogPath: string): boolean {
    return this.resolvedUrls.has(catalogPath);
  }

  setResolvedUrl(catalogPath: string, url: string): void {
    this.resolvedUrls.set(catalogPath, url);
  }

  clear(catalogPath?: string): void {
    if (catalogPath) {
      this.resolvedUrls.delete(catalogPath);
      this.inflightRequests.delete(catalogPath);
      return;
    }

    this.resolvedUrls.clear();
    this.inflightRequests.clear();
  }

  /** Clears path and any `path@version` cache entries. */
  clearPrefix(catalogPathPrefix: string): void {
    const prefix = catalogPathPrefix.trim();
    if (!prefix) {
      return;
    }
    for (const key of [...this.resolvedUrls.keys()]) {
      if (key === prefix || key.startsWith(`${prefix}@`)) {
        this.resolvedUrls.delete(key);
      }
    }
    for (const key of [...this.inflightRequests.keys()]) {
      if (key === prefix || key.startsWith(`${prefix}@`)) {
        this.inflightRequests.delete(key);
      }
    }
  }

  async resolve(
    catalogPath: string,
    resolver: () => Promise<string | null>,
  ): Promise<string | null> {
    const cachedUrl = this.resolvedUrls.get(catalogPath);

    if (cachedUrl) {
      return cachedUrl;
    }

    const inflight = this.inflightRequests.get(catalogPath);

    if (inflight) {
      return inflight;
    }

    const request = resolver()
      .then((url) => {
        if (url) {
          this.resolvedUrls.set(catalogPath, url);
        }

        return url;
      })
      .finally(() => {
        this.inflightRequests.delete(catalogPath);
      });

    this.inflightRequests.set(catalogPath, request);
    return request;
  }
}
