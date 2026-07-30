export class PortalProgressRequestGate {
  private generation = 0;
  private active: { token: object; promise: Promise<void> } | null = null;

  invalidate(): void {
    this.generation += 1;
    this.active = null;
  }

  run<T>(
    load: () => Promise<T>,
    onSuccess: (value: T) => void,
    onError: (error: unknown) => void,
    onStart?: () => void,
    onSettled?: () => void,
  ): Promise<void> {
    if (this.active) return this.active.promise;
    const generation = this.generation;
    const token = {};
    onStart?.();
    const promise = (async () => {
      try {
        const value = await load();
        if (generation === this.generation) onSuccess(value);
      } catch (error) {
        if (generation === this.generation) onError(error);
      } finally {
        if (generation === this.generation && this.active?.token === token) {
          this.active = null;
          onSettled?.();
        }
      }
    })();
    this.active = { token, promise };
    return promise;
  }
}
