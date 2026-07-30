export class MaterializedCardBucketCache<T> {
  private readonly inFlight = new Map<string, Promise<T>>();
  private readonly values = new Map<string, T>();

  delete(path: string): void {
    this.inFlight.delete(path);
    this.values.delete(path);
  }

  async load(
    paths: readonly string[],
    loader: (path: string) => Promise<T>,
  ): Promise<T[]> {
    const uniquePaths = [...new Set(paths)];
    return Promise.all(
      uniquePaths.map(async (path) => {
        const existing = this.values.get(path);
        if (existing !== undefined) return existing;
        const pending = this.inFlight.get(path);
        if (pending) return pending;
        const load = loader(path).then((value) => {
          this.values.set(path, value);
          return value;
        });
        this.inFlight.set(path, load);
        try {
          return await load;
        } finally {
          if (this.inFlight.get(path) === load) this.inFlight.delete(path);
        }
      }),
    );
  }
}
