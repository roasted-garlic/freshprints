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
